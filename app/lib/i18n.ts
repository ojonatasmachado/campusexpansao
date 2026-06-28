import { headers } from "next/headers";

export const SUPPORTED_LOCALES = ["pt", "en", "es"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "pt";

const LOCALE_ALIASES: Record<string, SupportedLocale> = {
  pt: "pt",
  "pt-br": "pt",
  "pt-pt": "pt",
  en: "en",
  "en-us": "en",
  "en-gb": "en",
  es: "es",
  "es-es": "es",
  "es-mx": "es",
  "es-ar": "es",
  "es-cl": "es",
  "es-co": "es",
};

function normalizeLocale(value: string | null | undefined): SupportedLocale | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return LOCALE_ALIASES[normalized] ?? LOCALE_ALIASES[normalized.split("-")[0]] ?? null;
}

export function localeFromAcceptLanguage(header: string | null | undefined): SupportedLocale {
  if (!header) return DEFAULT_LOCALE;
  const locales = header
    .split(",")
    .map((part) => {
      const [tag, qPart] = part.trim().split(";q=");
      const quality = qPart ? Number(qPart) : 1;
      return { locale: normalizeLocale(tag), quality: Number.isFinite(quality) ? quality : 1 };
    })
    .filter((item): item is { locale: SupportedLocale; quality: number } => Boolean(item.locale))
    .sort((a, b) => b.quality - a.quality);

  return locales[0]?.locale ?? DEFAULT_LOCALE;
}

export async function requestLocale(): Promise<SupportedLocale> {
  const headerStore = await headers();
  return localeFromAcceptLanguage(headerStore.get("accept-language"));
}
