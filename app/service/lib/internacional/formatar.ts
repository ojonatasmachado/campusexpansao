import { requireCurrency, requireLocale, type Currency, type Locale } from "./contrato";
import { isCivilDate } from "../date";

const MAX_CENTS = 100_000_000_000;
function validCents(value: number): number {
  if (!Number.isSafeInteger(value) || Math.abs(value) > MAX_CENTS) throw new Error("invalid_cents");
  return value;
}

/** A divisão existe apenas na apresentação. Valores persistidos continuam inteiros. */
export function formatMoney(cents: number, currency: Currency, locale: Locale): string {
  return new Intl.NumberFormat(requireLocale(locale), { style: "currency", currency: requireCurrency(currency), minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(validCents(cents) / 100);
}

export function formatAmount(cents: number, locale: Locale): string {
  return new Intl.NumberFormat(requireLocale(locale), { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(validCents(cents) / 100);
}

export function formatNumber(value: number, locale: Locale): string {
  if (!Number.isFinite(value)) throw new Error("invalid_number");
  return new Intl.NumberFormat(requireLocale(locale)).format(value);
}

/** Data civil não é instante. Nunca muda de dia por causa de um fuso. */
export function formatCivilDate(iso: string, locale: Locale, options: Intl.DateTimeFormatOptions = {}): string {
  if (!isCivilDate(iso)) throw new Error("invalid_civil_date");
  const date = new Date(`${iso}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== iso) throw new Error("invalid_civil_date");
  return new Intl.DateTimeFormat(requireLocale(locale), { year: "numeric", month: "2-digit", day: "2-digit", ...options, timeZone: "UTC" }).format(date);
}

/** CSV financeiro leva o código da moeda na coluna, nunca só um símbolo ambíguo. */
export function amountForCsv(cents: number): string {
  const value = validCents(cents);
  return `${value < 0 ? "-" : ""}${Math.floor(Math.abs(value) / 100)}.${(Math.abs(value) % 100).toString().padStart(2, "0")}`;
}
