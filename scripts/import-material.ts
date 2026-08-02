// Uso:
//   npx tsx scripts/import-material.ts content-intake/<pasta>/pt.json
//   npx tsx scripts/import-material.ts content-intake/<pasta>/pt.json content-intake/<pasta>/en.json content-intake/<pasta>/es.json
//
// Le o material em portugues (campos DbMaterial), salva em `materiais` como
// Rascunho atribuido a jonatas_machado.
// Se en.json/es.json forem passados, grava as traducoes DIRETO em
// `material_translations` (sem chamar a API do Gemini). Se nao forem
// passados, cai no fallback automatico via Gemini (mesma funcao que o
// admin usa), pra nao quebrar quem nao tiver as 3 versoes prontas.
import fs from "node:fs";
import { supabaseAdmin } from "../app/lib/supabase";
import { ensureMaterialTranslations } from "../app/lib/material-translation-service";

const ADMIN_ID = "e8d8509e-b608-4437-a51a-f6525681b28f"; // jonatas_machado
const ADMIN_USERNAME = "jonatas_machado";

type TranslationPayload = {
  titulo: string;
  promessa: string;
  pra_quem: string;
  conteudo: string[];
  contents?: unknown[];
  mensagens_lista?: unknown[];
  faq: { q: string; a: string }[];
  keywords?: string[];
};

function readJson(path: string) {
  return JSON.parse(fs.readFileSync(path, "utf-8"));
}

async function upsertDirectTranslation(materialId: string, locale: "en" | "es", payload: TranslationPayload) {
  const db = supabaseAdmin();
  const { error } = await db.from("material_translations").upsert(
    {
      material_id: materialId,
      locale,
      source_locale: "pt",
      titulo: payload.titulo,
      promessa: payload.promessa,
      pra_quem: payload.pra_quem,
      conteudo: payload.conteudo,
      contents: payload.contents ?? [],
      mensagens_lista: payload.mensagens_lista ?? [],
      faq: payload.faq,
      keywords: payload.keywords ?? [],
      updated_at: new Date().toISOString(),
    },
    { onConflict: "material_id,locale" }
  );
  if (error) throw error;
}

async function main() {
  const [ptPath, enPath, esPath] = process.argv.slice(2);
  if (!ptPath) throw new Error("Uso: npx tsx scripts/import-material.ts <pt.json> [en.json] [es.json]");

  const material = readJson(ptPath);
  const record = {
    ...material,
    status: material.status ?? "Rascunho",
    created_by: ADMIN_ID,
    created_by_username: ADMIN_USERNAME,
    updated_at: new Date().toISOString(),
  };

  const db = supabaseAdmin();
  const { error } = await db.from("materiais").upsert(record, { onConflict: "id" });
  if (error) throw error;

  if (enPath && esPath) {
    await upsertDirectTranslation(record.id, "en", readJson(enPath));
    await upsertDirectTranslation(record.id, "es", readJson(esPath));
    console.log(`Material "${record.id}" salvo como ${record.status}. Traducoes en/es gravadas direto (sem Gemini).`);
  } else {
    await ensureMaterialTranslations(record);
    console.log(`Material "${record.id}" salvo como ${record.status}. Traducoes en/es geradas via Gemini (fallback).`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
