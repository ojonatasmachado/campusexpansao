"use client";

type MetricEventName =
  | "page_view"
  | "material_view"
  | "curso_view"
  | "buy_click"
  | "waitlist_click"
  | "lead_capture";

type MetricPayload = {
  eventName: MetricEventName;
  path?: string;
  materialId?: string;
  cursoSlug?: string;
  metadata?: Record<string, unknown>;
};

const VISITOR_KEY = "cex_metrics_visitor";
const SESSION_KEY = "cex_metrics_session";

function randomId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function storageId(storage: Storage, key: string, prefix: string) {
  const current = storage.getItem(key);
  if (current) return current;
  const next = randomId(prefix);
  storage.setItem(key, next);
  return next;
}

function currentIds() {
  try {
    return {
      visitorId: storageId(window.localStorage, VISITOR_KEY, "vis"),
      sessionId: storageId(window.sessionStorage, SESSION_KEY, "ses"),
    };
  } catch {
    return { visitorId: randomId("vis"), sessionId: randomId("ses") };
  }
}

function utmParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    utmSource: params.get("utm_source") ?? undefined,
    utmMedium: params.get("utm_medium") ?? undefined,
    utmCampaign: params.get("utm_campaign") ?? undefined,
  };
}

export function trackMetricEvent(payload: MetricPayload) {
  if (typeof window === "undefined") return;
  const ids = currentIds();
  const body = JSON.stringify({
    ...payload,
    ...ids,
    ...utmParams(),
    path: payload.path ?? `${window.location.pathname}${window.location.search}`,
  });

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon("/api/metrics", blob)) return;
  }

  void fetch("/api/metrics", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}
