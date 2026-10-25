import type { DbServiceCurrency, DbServiceLocale } from "../../../lib/types";

export type Locale = DbServiceLocale;
export type Currency = DbServiceCurrency;
export const LOCALES: readonly Locale[] = ["pt-BR", "en-US", "es-ES"];
export const CURRENCIES: readonly Currency[] = ["BRL", "EUR", "USD"];
export const DEFAULT_LOCALE: Locale = "pt-BR";
export const DEFAULT_CURRENCY: Currency = "BRL";
export const LOCALE_COOKIE = "cex_service_locale";
export const NATIVE_LOCALE_NAMES: Record<Locale, string> = {
  "pt-BR": "Português (Brasil)",
  "en-US": "English (United States)",
  "es-ES": "Español (España)",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && LOCALES.some((locale) => locale === value);
}

export function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && CURRENCIES.some((currency) => currency === value);
}

/** Só para leitura de dados legados/preferência ausente. Escrita rejeita inválidos. */
export function localeOrDefault(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function currencyOrDefault(value: unknown): Currency {
  return isCurrency(value) ? value : DEFAULT_CURRENCY;
}

export function requireLocale(value: unknown): Locale {
  if (!isLocale(value)) throw new Error("invalid_locale");
  return value;
}

export function requireCurrency(value: unknown): Currency {
  if (!isCurrency(value)) throw new Error("invalid_currency");
  return value;
}
