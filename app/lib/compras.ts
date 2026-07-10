import type { User } from "@supabase/supabase-js";
import { HEX_TO_ACCENT } from "./accents";
import type { AccentKey } from "./accents";
import { ESTANTE_MAP } from "./materiais-data";
import type { Material } from "./materiais-data";
import { dbMaterialToMaterial, materialComVisualDoCatalogo } from "./material-mappers";
import { supabaseAdmin } from "./supabase";
import type { DbEstante, DbMaterial, DbMaterialContent } from "./types";
import type { CompraComMaterial, CompraStatus } from "./perfil-data";
import { mensagensDaCompra, recursosDaCompra } from "./perfil-data";
import { requestLocale } from "./i18n";
import { materialTranslationFor } from "./material-translations";

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
  contents_snapshot: DbMaterialContent[] | null;
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
  "contents_snapshot",
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

function mergeSnapshotWithTranslation(
  snapshot: DbMaterialContent[],
  translatedContents: DbMaterialContent[] | undefined,
): DbMaterialContent[] {
  // Só aplica se a tradução tiver a mesma quantidade de itens do snapshot
  // congelado na compra: uma tradução gerada depois de o material mudar de
  // estrutura (item adicionado/removido) não bate item a item por posição,
  // e é mais seguro manter o snapshot original do que arriscar misturar.
  if (!translatedContents || translatedContents.length !== snapshot.length) return snapshot;
  return snapshot.map((item, index) => {
    const translated = translatedContents[index];
    if (!translated || translated.kind !== item.kind) return item;
    return {
      ...item,
      name: translated.name || item.name,
      note: translated.note || item.note,
      roteiro: translated.roteiro || item.roteiro,
    };
  });
}

async function compraComMaterialDb(
  row: CompraRow,
  materialDb: DbMaterial,
  materialPool: Material[],
  estantes: DbEstante[],
): Promise<CompraComMaterial> {
  const material = dbMaterialToMaterial(materialDb);
  const estanteDb = estantes.find((estante) => estante.key === material.estante);
  const accent: AccentKey = estanteDb
    ? HEX_TO_ACCENT[estanteDb.accent] ?? "olive"
    : ESTANTE_MAP[material.estante]?.accent ?? "olive";

  // O conteúdo do comprador fica congelado no que existia no momento da
  // compra (contents_snapshot). Edições do mentor depois disso só valem
  // pras próximas compras: comprar de novo grava um snapshot mais recente.
  const snapshot = row.contents_snapshot ?? materialDb.contents ?? [];
  const locale = await requestLocale();
  const contentsParaComprador = locale === "pt"
    ? snapshot
    : mergeSnapshotWithTranslation(snapshot, (await materialTranslationFor(materialDb.id, locale))?.contents);

  return {
    id: row.hotmart_transaction || row.id.slice(0, 8).toUpperCase(),
    materialId: row.material_id,
    data: formatPurchaseDate(row.purchased_at || row.created_at),
    status: normalizeStatus(row.status),
    material,
    accent,
    materialVisual: materialComVisualDoCatalogo(material, materialPool),
    mensagens: mensagensDaCompra(material, contentsParaComprador),
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

  const pares = rows
    .map((row) => ({ row, material: materialMap.get(row.material_id) }))
    .filter((item): item is { row: CompraRow; material: DbMaterial } => Boolean(item.material));

  return Promise.all(
    pares.map(({ row, material }) => compraComMaterialDb(row, material, materialPool, estantes)),
  );
}

export async function compraDoUsuarioPorMaterialId(user: User, materialId: string) {
  const compras = await comprasDoUsuario(user);
  return compras.find((compra) => compra.material.id === materialId) ?? null;
}

// Único lugar que hoje cria linhas em `compras` (o webhook real da Hotmart
// em app/api/hotmart/webhook/ ainda não tem handler implementado). Quando
// ele existir, precisa gravar `contents_snapshot` da mesma forma daqui.
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
    .select("id,contents")
    .eq("id", materialId)
    .eq("status", "Publicado")
    .maybeSingle();

  if (materialError) return { ok: false, error: materialError.message };
  if (!material) return { ok: false, error: "Material não encontrado ou indisponível." };

  const now = new Date().toISOString();
  const transaction = `cex-test:${user.id}:${materialId}`;

  // Congela o conteúdo atual do material na compra (contents_snapshot).
  // Editar o material depois disso não muda o que esse comprador vê;
  // pra pegar uma atualização, precisa "comprar" de novo (o que atualiza
  // o snapshot desta mesma linha, já que a transação de teste é fixa).
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
        contents_snapshot: (material as { contents?: DbMaterialContent[] }).contents ?? [],
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
