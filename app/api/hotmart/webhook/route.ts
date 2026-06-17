import { NextResponse } from "next/server";
import { materialIdFromTracking } from "../../../lib/hotmart";
import { supabaseAdmin } from "../../../lib/supabase";

export const runtime = "nodejs";

type JsonObject = Record<string, unknown>;

const BUYER_EMAIL_PATHS = [
  ["data", "buyer", "email"],
  ["buyer", "email"],
  ["purchase", "buyer", "email"],
  ["data", "purchase", "buyer", "email"],
  ["email"],
];

const TRANSACTION_PATHS = [
  ["data", "purchase", "transaction"],
  ["data", "purchase", "transaction_id"],
  ["data", "purchase", "code"],
  ["purchase", "transaction"],
  ["purchase", "transaction_id"],
  ["transaction"],
  ["transaction_id"],
];

const STATUS_PATHS = [
  ["data", "purchase", "status"],
  ["purchase", "status"],
  ["status"],
  ["event"],
  ["event_type"],
  ["webhook_event_type"],
];

const PRODUCT_ID_PATHS = [
  ["data", "product", "id"],
  ["data", "product", "ucode"],
  ["product", "id"],
  ["product", "ucode"],
  ["product_id"],
];

const TRACKING_PATHS = [
  ["material_id"],
  ["materialId"],
  ["data", "material_id"],
  ["data", "purchase", "tracking", "src"],
  ["data", "purchase", "tracking", "sck"],
  ["data", "purchase", "tracking", "source"],
  ["data", "purchase", "tracking", "utm_campaign"],
  ["data", "purchase", "src"],
  ["data", "purchase", "sck"],
  ["purchase", "tracking", "src"],
  ["purchase", "tracking", "sck"],
  ["src"],
  ["sck"],
  ["utm_campaign"],
];

const PURCHASED_AT_PATHS = [
  ["data", "purchase", "approved_date"],
  ["data", "purchase", "order_date"],
  ["data", "purchase", "date"],
  ["purchase", "approved_date"],
  ["purchase", "order_date"],
  ["purchase", "date"],
  ["purchased_at"],
];

function readPath(payload: JsonObject, path: string[]) {
  return path.reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as JsonObject)[key];
  }, payload);
}

function firstString(payload: JsonObject, paths: string[][]) {
  for (const path of paths) {
    const value = readPath(payload, path);
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return null;
}

function normalizeEventStatus(payload: JsonObject) {
  return (firstString(payload, STATUS_PATHS) ?? "").toUpperCase();
}

function isApproved(status: string) {
  return [
    "APPROVED",
    "COMPLETE",
    "COMPLETED",
    "PURCHASE_APPROVED",
    "PURCHASE_COMPLETE",
    "ORDER_APPROVED",
  ].some((approved) => status.includes(approved));
}

function cancellationStatus(status: string) {
  if (status.includes("REFUND") || status.includes("CHARGEBACK")) return "Reembolsado";
  if (status.includes("CANCEL")) return "Cancelado";
  return null;
}

function purchasedAt(payload: JsonObject) {
  const value = firstString(payload, PURCHASED_AT_PATHS);
  if (!value) return new Date().toISOString();

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function trackedMaterialId(payload: JsonObject) {
  for (const path of TRACKING_PATHS) {
    const value = firstString(payload, [path]);
    const materialId = materialIdFromTracking(value) ?? value;
    if (materialId) return materialId;
  }
  return null;
}

async function materialExists(materialId: string) {
  const { data, error } = await supabaseAdmin()
    .from("materiais")
    .select("id")
    .eq("id", materialId)
    .maybeSingle();

  if (error) return false;
  return Boolean(data);
}

async function resolveMaterialId(payload: JsonObject) {
  const tracked = trackedMaterialId(payload);
  if (tracked && await materialExists(tracked)) return tracked;

  const hotmartProductId = firstString(payload, PRODUCT_ID_PATHS);
  if (!hotmartProductId) return null;

  const { data, error } = await supabaseAdmin()
    .from("materiais")
    .select("id")
    .eq("hotmart_product_id", hotmartProductId)
    .maybeSingle();

  if (error) return null;
  return data?.id ?? null;
}

function tokenFromRequest(request: Request) {
  const url = new URL(request.url);
  return (
    request.headers.get("x-hotmart-hottok") ||
    request.headers.get("x-hotmart-token") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    url.searchParams.get("token")
  );
}

export async function POST(request: Request) {
  const expectedToken = process.env.HOTMART_WEBHOOK_TOKEN;
  if (process.env.NODE_ENV === "production" && !expectedToken) {
    return NextResponse.json({ ok: false, error: "HOTMART_WEBHOOK_TOKEN não configurado" }, { status: 500 });
  }

  if (expectedToken && tokenFromRequest(request) !== expectedToken) {
    return NextResponse.json({ ok: false, error: "Token inválido" }, { status: 401 });
  }

  let payload: JsonObject;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Payload inválido" }, { status: 400 });
  }

  const status = normalizeEventStatus(payload);
  const transaction = firstString(payload, TRANSACTION_PATHS);
  const canceled = cancellationStatus(status);

  if (canceled && transaction) {
    const { error } = await supabaseAdmin()
      .from("compras")
      .update({ status: canceled, raw_payload: payload, updated_at: new Date().toISOString() })
      .eq("hotmart_transaction", transaction);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, status: canceled });
  }

  if (!isApproved(status)) {
    return NextResponse.json({ ok: true, ignored: true, status });
  }

  const buyerEmail = firstString(payload, BUYER_EMAIL_PATHS)?.toLowerCase();
  const materialId = await resolveMaterialId(payload);
  const hotmartProductId = firstString(payload, PRODUCT_ID_PATHS);

  if (!buyerEmail || !materialId) {
    return NextResponse.json(
      { ok: false, error: "Não foi possível identificar comprador ou material" },
      { status: 202 },
    );
  }

  const row = {
    buyer_email: buyerEmail,
    material_id: materialId,
    status: "Liberado",
    source: "hotmart",
    hotmart_transaction: transaction,
    hotmart_product_id: hotmartProductId,
    raw_payload: payload,
    purchased_at: purchasedAt(payload),
    updated_at: new Date().toISOString(),
  };

  const query = transaction
    ? supabaseAdmin().from("compras").upsert(row, { onConflict: "hotmart_transaction" })
    : supabaseAdmin().from("compras").insert(row);

  const { error } = await query;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, materialId, buyerEmail });
}
