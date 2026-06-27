import { NextRequest, NextResponse } from "next/server";
import { compraDoUsuarioPorMaterialId } from "../../../lib/compras";
import { supabaseAdmin } from "../../../lib/supabase";
import { createClient } from "../../../lib/supabase-server";

export const dynamic = "force-dynamic";

const MODULES = new Set(["design", "slides"]);

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function draftTtlDays() {
  const value = Number(process.env.STUDIO_USER_DRAFT_TTL_DAYS);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 30;
}

function expiresAt() {
  const expires = new Date();
  expires.setDate(expires.getDate() + draftTtlDays());
  return expires.toISOString();
}

async function requireBuyer(material: string) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { response: errorResponse("Login necessário.", 401), user: null };
  }

  const compra = await compraDoUsuarioPorMaterialId(user, material);
  if (!compra) {
    return { response: errorResponse("Material não liberado para este usuário.", 403), user: null };
  }

  return { response: null, user };
}

function sanitizePayload(payload: unknown) {
  return payload && typeof payload === "object" ? payload : {};
}

export async function GET(request: NextRequest) {
  const studioModule = request.nextUrl.searchParams.get("module")?.trim() ?? "";
  const material = request.nextUrl.searchParams.get("material")?.trim() ?? "";

  if (!MODULES.has(studioModule) || !material) {
    return errorResponse("Informe módulo e material válidos.", 400);
  }

  const { response, user } = await requireBuyer(material);
  if (response || !user) return response;

  const { data, error } = await supabaseAdmin()
    .from("studio_user_drafts")
    .select("id,module,material_id,payload,expires_at,created_at,updated_at")
    .eq("user_id", user.id)
    .eq("material_id", material)
    .eq("module", studioModule)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    return errorResponse(error.message, 500);
  }

  return NextResponse.json(
    { draft: data ?? null },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as {
    module?: string;
    material?: string;
    payload?: unknown;
  } | null;

  const studioModule = body?.module?.trim() ?? "";
  const material = body?.material?.trim() ?? "";

  if (!MODULES.has(studioModule) || !material) {
    return errorResponse("Informe módulo e material válidos.", 400);
  }

  const { response, user } = await requireBuyer(material);
  if (response || !user) return response;

  const { error } = await supabaseAdmin()
    .from("studio_user_drafts")
    .upsert(
      {
        user_id: user.id,
        material_id: material,
        module: studioModule,
        payload: sanitizePayload(body?.payload),
        expires_at: expiresAt(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,material_id,module" },
    );

  if (error) {
    return errorResponse(error.message, 500);
  }

  return NextResponse.json({ ok: true });
}
