import type { DbMaterial, DbMaterialTranslation } from "./types";
import { supabase } from "./supabase";
import type { SupportedLocale } from "./i18n";

type TranslationMap = Map<string, DbMaterialTranslation>;

export type MaterialTranslationPayload = Pick<
  DbMaterialTranslation,
  "titulo" | "promessa" | "pra_quem" | "conteudo" | "contents" | "mensagens_lista" | "faq" | "keywords"
>;

export function applyMaterialTranslation(
  material: DbMaterial,
  translation?: DbMaterialTranslation | null,
): DbMaterial {
  if (!translation) return material;
  return {
    ...material,
    titulo: translation.titulo || material.titulo,
    promessa: translation.promessa || material.promessa,
    pra_quem: translation.pra_quem || material.pra_quem,
    conteudo: translation.conteudo?.length ? translation.conteudo : material.conteudo,
    contents: translation.contents?.length ? translation.contents : material.contents,
    mensagens_lista: translation.mensagens_lista?.length ? translation.mensagens_lista : material.mensagens_lista,
    faq: translation.faq?.length ? translation.faq : material.faq,
    keywords: translation.keywords?.length ? translation.keywords : material.keywords,
  };
}

export async function materialTranslationFor(materialId: string, locale: SupportedLocale) {
  const { data } = await supabase
    .from("material_translations")
    .select("*")
    .eq("material_id", materialId)
    .eq("locale", locale)
    .maybeSingle();

  return (data as DbMaterialTranslation | null) ?? null;
}

export async function materialTranslationsFor(materialIds: string[], locale: SupportedLocale): Promise<TranslationMap> {
  if (materialIds.length === 0) return new Map();
  const { data } = await supabase
    .from("material_translations")
    .select("*")
    .in("material_id", materialIds)
    .eq("locale", locale);

  return new Map(((data ?? []) as DbMaterialTranslation[]).map((translation) => [translation.material_id, translation]));
}

export async function applyMaterialTranslations(materials: DbMaterial[], locale: SupportedLocale) {
  const translations = await materialTranslationsFor(materials.map((material) => material.id), locale);
  return materials.map((material) => applyMaterialTranslation(material, translations.get(material.id)));
}
