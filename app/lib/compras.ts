import type { User } from "@supabase/supabase-js";
import { HEX_TO_ACCENT } from "./accents";
import type { AccentKey } from "./accents";
import { ESTANTE_MAP } from "./materiais-data";
import type { Material } from "./materiais-data";
import { dbMaterialToMaterial, materialComVisualDoCatalogo } from "./material-mappers";
import { supabaseAdmin } from "./supabase";
import type { DbEstante, DbMaterial } from "./types";
import type { CompraComMaterial, CompraStatus } from "./perfil-data";
import { mensagensDaCompra, recursosDaCompra } from "./perfil-data";

type CompraRow = {
  id: string;
  user_id: string | null;
  buyer_email: string;
  material_id: string;
  status: string;
  source: string | null;
  hotmart_transaction: string | null;
  purchased_at: string | null;
  created_at: string | null;
};

type CompraLiberada = {
  ok: boolean;
  error?: string;
};

const COMPRA_COLUMNS = [
  "id",
  "user_id",
  "buyer_email",
  "material_id",
  "status",
  "source",
  "hotmart_transaction",
  "purchased_at",
  "created_at",
].join(",");

const VISIBLE_STATUSES = ["Liberado", "Pendente"];

function isMissingTable(error: { code?: string; message?: string } | null) {
  return error?.code === "42P01" || error?.message?.toLowerCase().includes("does not exist");
}

function normalizeStatus(status: string): CompraStatus {
  return status === "Pendente" ? "Pendente" : "Liberado";
}

function formatPurchaseDate(value?: string | null) {
  if (!value) return "compra liberada";

  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "compra liberada";
  }
}

function mergeRows(...groups: (CompraRow[] | null | undefined)[]) {
  const map = new Map<string, CompraRow>();

  groups.flat().forEach((row) => {
    if (!row) return;
    map.set(row.hotmart_transaction || row.id, row);
  });

  return [...map.values()].sort((a, b) => {
    const dateA = new Date(a.purchased_at || a.created_at || 0).getTime();
    const dateB = new Date(b.purchased_at || b.created_at || 0).getTime();
    return dateB - dateA;
  });
}

async function purchaseRowsForUser(user: User) {
  let db;
  try {
    db = supabaseAdmin();
  } catch {
    return [];
  }

  const email = user.email?.trim().toLowerCase();

  const [{ data: byUser, error: userError }, emailResult] = await Promise.all([
    db
      .from("compras")
      .select(COMPRA_COLUMNS)
      .eq("user_id", user.id)
      .in("status", VISIBLE_STATUSES),
    email
      ? db
          .from("compras")
          .select(COMPRA_COLUMNS)
          .ilike("buyer_email", email)
          .in("status", VISIBLE_STATUSES)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (isMissingTable(userError) || isMissingTable(emailResult.error)) return [];
  if (userError || emailResult.error) {
    console.error("Erro ao buscar compras do usuário", userError || emailResult.error);
    return [];
  }

  return mergeRows(
    (byUser ?? []) as unknown as CompraRow[],
    (emailResult.data ?? []) as unknown as CompraRow[],
  );
}

function compraComMaterialDb(
  row: CompraRow,
  materialDb: DbMaterial,
  materialPool: Material[],
  estantes: DbEstante[],
): CompraComMaterial {
  const material = dbMaterialToMaterial(materialDb);
  const estanteDb = estantes.find((estante) => estante.key === material.estante);
  const accent: AccentKey = estanteDb
    ? HEX_TO_ACCENT[estanteDb.accent] ?? "olive"
    : ESTANTE_MAP[material.estante]?.accent ?? "olive";

  return {
    id: row.hotmart_transaction || row.id.slice(0, 8).toUpperCase(),
    materialId: row.material_id,
    data: formatPurchaseDate(row.purchased_at || row.created_at),
    status: normalizeStatus(row.status),
    material,
    accent,
    materialVisual: materialComVisualDoCatalogo(material, materialPool),
    mensagens: mensagensDaCompra(material),
    recursos: recursosDaCompra(material),
  };
}

export async function comprasDoUsuario(user: User) {
  const rows = await purchaseRowsForUser(user);
  if (rows.length === 0) return [];

  const db = supabaseAdmin();
  const materialIds = [...new Set(rows.map((row) => row.material_id))];

  const [{ data: materialRows, error: materialError }, { data: estanteRows, error: estanteError }] = await Promise.all([
    db
      .from("materiais")
      .select("*")
      .in("id", materialIds)
      .eq("status", "Publicado"),
    db
      .from("estantes")
      .select("*")
      .order("ord"),
  ]);

  if (materialError || estanteError) {
    console.error("Erro ao montar compras do usuário", materialError || estanteError);
    return [];
  }

  const materiais = (materialRows ?? []) as DbMaterial[];
  const estantes = (estanteRows ?? []) as DbEstante[];
  const materialPool = materiais.map(dbMaterialToMaterial);
  const materialMap = new Map(materiais.map((material) => [material.id, material]));

  return rows
    .map((row) => {
      const material = materialMap.get(row.material_id);
      return material ? compraComMaterialDb(row, material, materialPool, estantes) : null;
    })
    .filter(Boolean) as CompraComMaterial[];
}

export async function compraDoUsuarioPorMaterialId(user: User, materialId: string) {
  const compras = await comprasDoUsuario(user);
  return compras.find((compra) => compra.material.id === materialId) ?? null;
}

export async function liberarCompraTeste(user: User, materialId: string): Promise<CompraLiberada> {
  const email = user.email?.trim().toLowerCase();
  if (!email) return { ok: false, error: "Usuário sem e-mail confirmado." };

  let db;
  try {
    db = supabaseAdmin();
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Cliente administrativo indisponível.",
    };
  }

  const { data: material, error: materialError } = await db
    .from("materiais")
    .select("id")
    .eq("id", materialId)
    .eq("status", "Publicado")
    .maybeSingle();

  if (materialError) return { ok: false, error: materialError.message };
  if (!material) return { ok: false, error: "Material não encontrado ou indisponível." };

  const now = new Date().toISOString();
  const transaction = `cex-test:${user.id}:${materialId}`;

  const { error } = await db
    .from("compras")
    .upsert(
      {
        user_id: user.id,
        buyer_email: email,
        material_id: materialId,
        status: "Liberado",
        source: "checkout_teste",
        hotmart_transaction: transaction,
        raw_payload: {
          mode: "checkout_teste",
          material_id: materialId,
          user_id: user.id,
          buyer_email: email,
        },
        purchased_at: now,
        updated_at: now,
      },
      { onConflict: "hotmart_transaction" },
    );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
