import { createTranslator, type RichTranslationValues, type TranslationValues } from "use-intl/core";
import { messageKey } from "./chave";
import type { Locale } from "./contrato";

export type Messages = Record<string, string>;
export type Values = TranslationValues;

/** Configuração explícita, nunca um locale mutável compartilhado entre pedidos. */
export function createText(locale: Locale, messages: Messages) {
  const intl = createTranslator({ locale, messages, timeZone: "UTC", onError(error) { throw error; } });
  const text = (source: string, values?: TranslationValues): string => intl(messageKey(source), values);
  text.rich = (source: string, values?: RichTranslationValues) => intl.rich(messageKey(source), values);
  return text;
}

/** Fora de um provider (componentes isolados), mantém o contrato pt-BR. */
export function sourceText(source: string, values?: TranslationValues): string {
  return createTranslator({ locale: "pt-BR", messages: { message: source }, timeZone: "UTC", onError(error) { throw error; } })("message", values);
}

sourceText.rich = (source: string, values?: RichTranslationValues) => createTranslator({ locale: "pt-BR", messages: { message: source }, timeZone: "UTC", onError(error) { throw error; } }).rich("message", values);

export type Text = ReturnType<typeof createText>;
