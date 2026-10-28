import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createServiceSupabaseClient } from "../supabase";
import { LOCALE_COOKIE, isLocale, localeOrDefault, type Locale } from "./contrato";
import { loadMessages } from "./catalogos";
import { createText } from "./mensagens";

const localeEnabled = cache(async () => {
  const client = await createServiceSupabaseClient();
  const { data, error } = await client.schema("service").rpc("international_enabled", { p_feature: "locale" });
  return !error && data === true;
});

async function messagesForLocale(locale: Locale) {
  const messages = await loadMessages(locale);
  return process.env.SERVICE_PSEUDO_LOCALE === "1" ? (await import("./pseudo")).pseudoMessages(messages) : messages;
}

/** Cache do pedido React, nunca preferência global de outro usuário. */
export const getServiceInternational = cache(async () => {
  const enabled = await localeEnabled();
  if (!enabled) return { locale: "pt-BR" as const, messages: await messagesForLocale("pt-BR"), enabled: false };
  const jar = await cookies();
  const fallback = localeOrDefault(jar.get(LOCALE_COOKIE)?.value);
  const client = await createServiceSupabaseClient();
  const { data: { user } } = await client.auth.getUser();
  const preference = user ? await client.schema("service").rpc("my_locale") : null;
  const locale = isLocale(preference?.data) ? preference.data : fallback;
  const messages = await messagesForLocale(locale);
  return { locale, messages, enabled };
});

export async function getTexto(request?: Request) {
  // O cabeçalho escolhe apenas o idioma da resposta, sem afetar conta ou autorização.
  // Convite e consulta de endereço também precisam responder antes do login.
  const requested = request?.headers.get("x-service-locale");
  if (isLocale(requested) && await localeEnabled()) return createText(requested, await messagesForLocale(requested));
  const { locale, messages } = await getServiceInternational();
  return createText(locale, messages);
}
