const TRACKING_PREFIX = "cex";

export function hotmartCheckoutUrl(rawUrl: string, materialId: string) {
  if (!rawUrl) return "/materiais";

  try {
    const url = new URL(rawUrl);
    const tracking = `${TRACKING_PREFIX}:${materialId}`;

    url.searchParams.set("src", tracking);
    url.searchParams.set("sck", tracking);
    url.searchParams.set("utm_source", "cex_site");
    url.searchParams.set("utm_medium", "site");
    url.searchParams.set("utm_campaign", materialId);

    return url.toString();
  } catch {
    return rawUrl;
  }
}

export function materialIdFromTracking(value?: string | null) {
  if (!value) return null;

  const normalized = value.trim();
  const match = normalized.match(/(?:cex|material)[:_-]([a-z0-9-]+)/i);
  return match?.[1] ?? null;
}
