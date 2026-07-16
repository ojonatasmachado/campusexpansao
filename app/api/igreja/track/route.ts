import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";

/* Tracking público (sem login) de visualização/clique da página link-in-bio.
   Grava via service_role porque service.church_page_views não tem policy de
   insert pra authenticated/anon de propósito (ver 0037_service_church_page.sql) :
   a única porta de escrita é esta rota. Fire-and-forget, chamada com
   fetch(..., { keepalive: true }) pelo client da página pública. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: { churchId?: string; kind?: string; linkId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { churchId, kind, linkId } = body;
  if (!churchId || (kind !== "view" && kind !== "click")) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const admin = supabaseAdmin().schema("service");

  const { data: church } = await admin.from("churches").select("id").eq("id", churchId).maybeSingle();
  if (!church) return NextResponse.json({ ok: false }, { status: 404 });

  await admin.from("church_page_views").insert({
    church_id: churchId,
    link_id: kind === "click" ? (linkId ?? null) : null,
    kind,
  });

  if (kind === "click" && linkId) {
    const { data: currentRow } = await admin.from("church_links").select("click_count").eq("id", linkId).maybeSingle();
    const current = currentRow as { click_count: number } | null;
    if (current) {
      await admin.from("church_links").update({ click_count: current.click_count + 1 }).eq("id", linkId);
    }
  }

  return NextResponse.json({ ok: true });
}
