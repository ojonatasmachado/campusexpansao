import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createServiceSupabaseClient } from "../supabase";
import { LOCALE_COOKIE, isLocale, localeOrDefault } from "./contrato";
import { loadMessages } from "./catalogos";
import { createText } from "./mensagens";

/** Cache do pedido React, nunca preferência global de outro usuário. */
export const getServiceInternational = cache(async () => {
  const jar = await cookies();
  const fallback = localeOrDefault(jar.get(LOCALE_COOKIE)?.value);
  const client = await createServiceSupabaseClient();
  const { data: { user } } = await client.auth.getUser();
  const preference = user ? await client.schema("service").rpc("my_locale") : null;
  const locale = isLocale(preference?.data) ? preference.data : fallback;
  let messages = await loadMessages(locale);
  // Apenas ambiente de captura. Não é um locale gravável nem parâmetro público.
  if (process.env.SERVICE_PSEUDO_LOCALE === "1") messages = (await import("./pseudo")).pseudoMessages(messages);
  return { locale, messages };
});

export async function getTexto() {
  const { locale, messages } = await getServiceInternational();
  return createText(locale, messages);
}
