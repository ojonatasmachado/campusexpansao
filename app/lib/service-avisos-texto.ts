import type { supabaseAdmin } from "./supabase";
import type { DbServiceNotificationLocale, DbServicePushBodyTemplate } from "./types";
import { localeOrDefault, type Locale } from "../service/lib/internacional/contrato";
import { loadMessages } from "../service/lib/internacional/catalogos";
import { createText, type Text } from "../service/lib/internacional/mensagens";

type Db = ReturnType<ReturnType<typeof supabaseAdmin>["schema"]>;

/** Uma leitura por organização e operação. Nunca usa o idioma de quem publica. */
export async function tradutoresDosAvisos(db: Db, organizationId: string, peopleIds: string[]): Promise<Map<string, Text>> {
  if (!peopleIds.length) return new Map();
  const { data, error } = await db.rpc("notification_locales", { p_org: organizationId, p_people: peopleIds });
  if (error) throw error;
  const rows = (data ?? []) as DbServiceNotificationLocale[];
  const byLocale = new Map<Locale, Text>();
  await Promise.all([...new Set(rows.map((row) => localeOrDefault(row.locale_code)))].map(async (locale) => {
    byLocale.set(locale, createText(locale, await loadMessages(locale)));
  }));
  return new Map(rows.map((row) => [row.person_id, byLocale.get(localeOrDefault(row.locale_code))!]));
}

/** Só mensagens do sistema explicitamente identificadas. Conteúdo da igreja é preservado. */
export function corpoAutomatico(tipo: DbServicePushBodyTemplate, t: Text): string {
  return tipo === "mural-lembrete"
    ? t("Você ainda não viu esta publicação do Mural.")
    : t("Nova publicação no Mural.");
}

export function resumoDoMural(titulos: readonly string[], t: Text): { title: string; body: string } {
  const values = { count: titulos.length, titles: titulos.slice(0, 3).join(", ") };
  return {
    title: t("Mural da igreja"),
    body: titulos.length > 3
      ? t("{count, plural, one {# publicação nova: {titles} e outras.} other {# publicações novas: {titles} e outras.}}", values)
      : t("{count, plural, one {# publicação nova: {titles}.} other {# publicações novas: {titles}.}}", values),
  };
}
