import { supabaseAdmin } from "../../lib/supabase";
import type { BrandCfg } from "./theme";

/* Marca da igreja nas telas de entrada (login da gestão com cookie, login
   da igreja). Nome, logo e brandCfg vêm da MATRIZ, igual ao /service
   (page.tsx: "a marca é da organização: mora na igreja matriz").
   Recebe o slug da URL (/[slug]/entrar) ou do cookie cex_church_slug. */
export type AuthChurch = {
  slug: string;
  name: string;
  logoUrl: string | null;
  brand: BrandCfg | undefined;
};

const SLUG_RE = /^[a-z0-9-]{3,40}$/;
const COLS = "name, slug, logo_url, settings, organization_id, is_headquarters";

export async function getAuthChurchBySlug(slug: string | null | undefined): Promise<AuthChurch | null> {
  const clean = (slug ?? "").trim().toLowerCase();
  if (!SLUG_RE.test(clean)) return null;

  const db = supabaseAdmin().schema("service");
  const { data: church } = await db.from("churches").select(COLS).eq("slug", clean).maybeSingle();
  if (!church) return null;

  let sede = church;
  if (!church.is_headquarters) {
    const { data } = await db
      .from("churches")
      .select(COLS)
      .eq("organization_id", church.organization_id)
      .eq("is_headquarters", true)
      .maybeSingle();
    if (data) sede = data;
  }

  const brandOf = (row: { settings: unknown }) => (row.settings as { brandCfg?: BrandCfg } | null)?.brandCfg;
  return {
    slug: clean,
    name: (sede.name ?? church.name) as string,
    logoUrl: ((sede.logo_url ?? church.logo_url) as string | null) ?? null,
    brand: brandOf(sede) ?? brandOf(church),
  };
}

/* Mesma marca (nome, logo e cores da matriz) a partir da organização: telas
   de chegada do check-in (voluntário, aula, Kids), que conhecem o evento e
   não o slug. */
export async function getChurchBrandByOrg(organizationId: string | null | undefined): Promise<Omit<AuthChurch, "slug"> | null> {
  if (!organizationId) return null;
  const { data: rows } = await supabaseAdmin()
    .schema("service")
    .from("churches")
    .select(COLS)
    .eq("organization_id", organizationId);
  const sede = rows?.find((c) => c.is_headquarters) ?? rows?.[0];
  if (!sede) return null;
  return {
    name: sede.name as string,
    logoUrl: (sede.logo_url as string | null) ?? null,
    brand: (sede.settings as { brandCfg?: BrandCfg } | null)?.brandCfg,
  };
}
