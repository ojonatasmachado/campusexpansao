import { supabaseAdmin } from "./supabase";
import type { DbMaterialContent, DbMaterialTranslation } from "./types";
import { SUPPORTED_LOCALES, type SupportedLocale } from "./i18n";
import type { MaterialTranslationPayload } from "./material-translations";

type MaterialRecord = Record<string, unknown>;

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
};

type TranslationResponse = {
  sourceLocale: SupportedLocale;
  translations: Record<SupportedLocale, MaterialTranslationPayload>;
};

const LOCALE_NAMES: Record<SupportedLocale, string> = {
  pt: "Português do Brasil",
  en: "English",
  es: "Español latinoamericano",
};

function text(value: unknown) {
  return typeof value === "string" ? normalizeVisibleText(value) : "";
}

function textArray(value: unknown) {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}

function normalizeVisibleText(value: string) {
  return value.replace(/[—–]/g, ":").replace(/\s+\n/g, "\n").trim();
}

function normalizeContent(value: unknown): DbMaterialContent[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item) => ({
      kind: item.kind === "pdf" || item.kind === "ppt" || item.kind === "design" ? item.kind : "word",
      name: text(item.name),
      note: text(item.note),
      pages: typeof item.pages === "number" ? item.pages : null,
      messages: typeof item.messages === "number" ? item.messages : null,
      slides: typeof item.slides === "number" ? item.slides : null,
      designs: typeof item.designs === "number" ? item.designs : null,
      designFormat: item.designFormat === "stories" || item.designFormat === "telao" || item.designFormat === "carousel" ? item.designFormat : null,
      delivery: item.delivery === "word" || item.delivery === "pdf" ? item.delivery : null,
      file: typeof item.file === "string" ? item.file : null,
    }));
}

function normalizeMessages(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item) => ({ nome: text(item.nome), desc: text(item.desc) }))
    .filter((item) => item.nome || item.desc);
}

function normalizeFaq(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item) => ({ q: text(item.q), a: text(item.a) }))
    .filter((item) => item.q || item.a);
}

function payloadFromMaterial(material: MaterialRecord): MaterialTranslationPayload {
  return {
    titulo: text(material.titulo),
    promessa: text(material.promessa),
    pra_quem: text(material.pra_quem),
    conteudo: textArray(material.conteudo),
    contents: normalizeContent(material.contents),
    mensagens_lista: normalizeMessages(material.mensagens_lista),
    faq: normalizeFaq(material.faq),
    keywords: textArray(material.keywords).map((keyword) => keyword.toLowerCase()),
  };
}

function normalizePayload(payload: Partial<MaterialTranslationPayload>, fallback: MaterialTranslationPayload): MaterialTranslationPayload {
  return {
    titulo: text(payload.titulo) || fallback.titulo,
    promessa: text(payload.promessa) || fallback.promessa,
    pra_quem: text(payload.pra_quem) || fallback.pra_quem,
    conteudo: textArray(payload.conteudo).length ? textArray(payload.conteudo) : fallback.conteudo,
    contents: normalizeContent(payload.contents).length ? normalizeContent(payload.contents) : fallback.contents,
    mensagens_lista: normalizeMessages(payload.mensagens_lista).length ? normalizeMessages(payload.mensagens_lista) : fallback.mensagens_lista,
    faq: normalizeFaq(payload.faq).length ? normalizeFaq(payload.faq) : fallback.faq,
    keywords: textArray(payload.keywords).length ? textArray(payload.keywords).map((keyword) => keyword.toLowerCase()) : fallback.keywords,
  };
}

function extractJson(textValue: string) {
  const withoutFence = textValue
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("Resposta de tradução sem JSON.");
  return withoutFence.slice(start, end + 1);
}

function parseLocale(value: unknown): SupportedLocale {
  return SUPPORTED_LOCALES.includes(value as SupportedLocale) ? value as SupportedLocale : "pt";
}

function promptForMaterial(payload: MaterialTranslationPayload) {
  return [
    "Você é tradutor profissional da CE.X Campus Expansão.",
    "Detecte se o texto original está em pt, en ou es.",
    "Traduza o conteúdo para pt, en e es. Se um idioma já for o original, apenas preserve e revise levemente.",
    "Preserve números, códigos, nomes de arquivos, campos técnicos, kind, delivery, pages, messages, slides, designs e designFormat.",
    "Não use travessão longo nem médio. Use vírgula, ponto ou dois pontos.",
    "Responda somente JSON válido, sem markdown.",
    "Formato exato:",
    '{"sourceLocale":"pt","translations":{"pt":{"titulo":"","promessa":"","pra_quem":"","conteudo":[],"contents":[],"mensagens_lista":[],"faq":[],"keywords":[]},"en":{"titulo":"","promessa":"","pra_quem":"","conteudo":[],"contents":[],"mensagens_lista":[],"faq":[],"keywords":[]},"es":{"titulo":"","promessa":"","pra_quem":"","conteudo":[],"contents":[],"mensagens_lista":[],"faq":[],"keywords":[]}}}',
    `Idiomas: ${Object.entries(LOCALE_NAMES).map(([key, label]) => `${key}=${label}`).join(", ")}`,
    `Conteúdo original: ${JSON.stringify(payload)}`,
  ].join("\n");
}

async function callGeminiTranslation(payload: MaterialTranslationPayload): Promise<TranslationResponse | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_TRANSLATION_MODEL || "gemini-2.5-flash";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: promptForMaterial(payload) }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Gemini translation failed: ${response.status} ${errorText.slice(0, 240)}`);
  }

  const data = await response.json() as GeminiResponse;
  const answer = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  const parsed = JSON.parse(extractJson(answer)) as Partial<TranslationResponse>;
  const sourceLocale = parseLocale(parsed.sourceLocale);
  const translations = SUPPORTED_LOCALES.reduce<Record<SupportedLocale, MaterialTranslationPayload>>((acc, locale) => {
    const translated = parsed.translations?.[locale] as Partial<MaterialTranslationPayload> | undefined;
    acc[locale] = normalizePayload(translated ?? {}, payload);
    return acc;
  }, {} as Record<SupportedLocale, MaterialTranslationPayload>);

  return { sourceLocale, translations };
}

export async function ensureMaterialTranslations(material: MaterialRecord) {
  const materialId = text(material.id);
  if (!materialId) return;

  const basePayload = payloadFromMaterial(material);
  try {
    const translated = await callGeminiTranslation(basePayload);
    if (!translated) return;

    const rows = SUPPORTED_LOCALES.map((locale) => {
      const payload = translated.translations[locale];
      return {
        material_id: materialId,
        locale,
        source_locale: translated.sourceLocale,
        titulo: payload.titulo,
        promessa: payload.promessa,
        pra_quem: payload.pra_quem,
        conteudo: payload.conteudo,
        contents: payload.contents,
        mensagens_lista: payload.mensagens_lista,
        faq: payload.faq,
        keywords: payload.keywords,
        updated_at: new Date().toISOString(),
      } satisfies Omit<DbMaterialTranslation, "id" | "created_at">;
    });

    const { error } = await supabaseAdmin()
      .from("material_translations")
      .upsert(rows, { onConflict: "material_id,locale" });
    if (error) throw error;
  } catch (error) {
    console.error("Erro ao traduzir material", error);
  }
}
