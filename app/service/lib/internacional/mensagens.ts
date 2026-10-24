import { createTranslator, type RichTranslationValues, type TranslationValues } from "use-intl/core";
import { messageKey } from "./chave";
import type { Locale } from "./contrato";
import { vocabularioPadrao, type Vocabulario } from "../vocabulario";
import { prepareVocabulary } from "./vocabulario";

export type Messages = Record<string, string>;
export type Values = TranslationValues;

/** Configuração explícita, nunca um locale mutável compartilhado entre pedidos. */
export function createText(locale: Locale, messages: Messages) {
  const intl = createTranslator({ locale, messages, timeZone: "UTC", onError(error) { throw error; } });
  const text = (source: string, values?: TranslationValues, vocabulary = vocabularioPadrao(locale)): string => {
    const { terms } = prepareVocabulary(source, vocabulary);
    return intl(messageKey(source), { ...values, ...terms });
  };
  text.rich = (source: string, values?: RichTranslationValues, vocabulary = vocabularioPadrao(locale)) => {
    const { terms } = prepareVocabulary(source, vocabulary);
    return intl.rich(messageKey(source), { ...values, ...terms });
  };
  return text;
}

/** Fora de um provider (componentes isolados), mantém o contrato pt-BR. */
export function sourceText(source: string, values?: TranslationValues, vocabulary: Vocabulario = vocabularioPadrao()): string {
  const prepared = prepareVocabulary(source, vocabulary);
  return createTranslator({ locale: "pt-BR", messages: { message: prepared.message }, timeZone: "UTC", onError(error) { throw error; } })("message", { ...values, ...prepared.terms });
}

sourceText.rich = (source: string, values?: RichTranslationValues, vocabulary: Vocabulario = vocabularioPadrao()) => {
  const prepared = prepareVocabulary(source, vocabulary);
  return createTranslator({ locale: "pt-BR", messages: { message: prepared.message }, timeZone: "UTC", onError(error) { throw error; } }).rich("message", { ...values, ...prepared.terms });
};

export type Text = ReturnType<typeof createText>;

export function bindVocabulary(base: Text, vocabulary?: Vocabulario): Text {
  return Object.assign(
    (source: string, values?: TranslationValues, override = vocabulary) => base(source, values, override),
    { rich: (source: string, values?: RichTranslationValues, override = vocabulary) => base.rich(source, values, override) },
  );
}
