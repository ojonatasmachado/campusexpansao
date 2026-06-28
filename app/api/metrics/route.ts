import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../lib/supabase-server";
import { supabaseAdmin } from "../../lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EVENT_NAMES = new Set([
  "page_view",
  "material_view",
  "curso_view",
  "buy_click",
  "waitlist_click",
  "lead_capture",
]);

type MetricBody = {
  eventName?: string;
  path?: string;
  visitorId?: string;
  sessionId?: string;
  materialId?: string;
  cursoSlug?: string;
  mentoriaId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  metadata?: Record<string, unknown>;
};

function cleanText(value: unknown, max = 280) {
  if (typeof value !== "string") return null;
  const text = value.trim().slice(0, max);
  return text || null;
}

function trafficSource(referrer: string | null, utmSource: string | null, origin: string) {
  const source = (utmSource ?? "").toLowerCase();
  if (source.includes("instagram") || source === "ig") return "instagram";
  if (source.includes("google")) return "google";
  if (source.includes("youtube") || source.includes("youtu")) return "youtube";
  if (source) return source.slice(0, 80);

  if (!referrer) return "direto";
  try {
    const ref = new URL(referrer);
    if (ref.origin === origin) return "direto";
    const host = ref.hostname.toLowerCase();
    if (host.includes("instagram")) return "instagram";
    if (host.includes("google")) return "google";
    if (host.includes("youtube") || host.includes("youtu.be")) return "youtube";
    return host.replace(/^www\./, "").slice(0, 80);
  } catch {
    return "direto";
  }
}

function deviceFromUserAgent(userAgent: string | null) {
  const ua = (userAgent ?? "").toLowerCase();
  if (/ipad|tablet/.test(ua)) return "tablet";
  if (/mobile|iphone|android/.test(ua)) return "mobile";
  return "desktop";
}

export async function POST(request: NextRequest) {
  let body: MetricBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const eventName = cleanText(body.eventName, 80);
  if (!eventName || !EVENT_NAMES.has(eventName)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const url = new URL(request.url);
  const referrer = cleanText(request.headers.get("referer"), 500);
  const utmSource = cleanText(body.utmSource, 120);
  const userAgent = request.headers.get("user-agent");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabaseAdmin().from("metric_events").insert({
    event_name: eventName,
    path: cleanText(body.path, 500) ?? "",
    referrer,
    visitor_id: cleanText(body.visitorId, 160),
    session_id: cleanText(body.sessionId, 160),
    user_id: user?.id ?? null,
    material_id: cleanText(body.materialId, 180),
    curso_slug: cleanText(body.cursoSlug, 180),
    mentoria_id: cleanText(body.mentoriaId, 180),
    traffic_source: trafficSource(referrer, utmSource, url.origin),
    utm_source: utmSource,
    utm_medium: cleanText(body.utmMedium, 120),
    utm_campaign: cleanText(body.utmCampaign, 160),
    metadata: {
      ...(body.metadata && typeof body.metadata === "object" ? body.metadata : {}),
      device: deviceFromUserAgent(userAgent),
    },
  });

  if (error) return NextResponse.json({ ok: false }, { status: 500 });
  return NextResponse.json({ ok: true });
}
