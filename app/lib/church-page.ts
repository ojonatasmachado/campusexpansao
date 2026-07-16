import { supabaseAdmin } from "./supabase";

/* Leitura pública (sem login) da página link-in-bio de uma igreja, usada por
   app/igreja/[slug]. Roda só no servidor : supabaseAdmin() é service_role e
   bypassa a RLS de service.churches (que exige authenticated + org member),
   então a seleção de colunas aqui É a fronteira de privacidade — nunca usar
   select("*") nem devolver CNPJ/telefone/endereço/dados de trial. */

export type PaginaTemplate = "simples" | "vitrine" | "editorial";

export type PaginaSocial = {
  instagram?: string;
  whatsapp?: string;
  youtube?: string;
  facebook?: string;
  tiktok?: string;
  site?: string;
};

export type PaginaCfg = {
  enabled?: boolean;
  template?: PaginaTemplate;
  bio?: string;
  bgColor?: string;
  /* fundo em degradê ou imagem (opcional) : quando bgMode é "degrade",
     --cx-bg vira um linear-gradient(bgAngle, bgFrom, bgTo). Quando é
     "imagem", vira a foto enviada (bgImageUrl) com uma camada escura por
     cima (bgOverlay, 0 a 1) pra manter os botões legíveis em cima de
     qualquer foto. bgColor continua sendo o valor de fallback. */
  bgMode?: "solida" | "degrade" | "imagem";
  bgFrom?: string;
  bgTo?: string;
  bgAngle?: number;
  bgImageUrl?: string;
  bgOverlay?: number;
  textColor?: string;
  accentColor?: string;
  /* cor das caixas de link/notícia e dos balões de rede social. Entra via
     color-mix() no CSS (public/igreja-page.css), então funciona tanto pra
     branco (padrão, visual "vidro fosco" de sempre) quanto pra qualquer
     cor que a igreja escolher. */
  boxColor?: string;
  coverUrl?: string;
  social?: PaginaSocial;
  editorIds?: string[];
};

export const PAGINA_CFG_DEFAULT: Required<Pick<PaginaCfg, "enabled" | "template" | "bgColor" | "textColor" | "accentColor" | "boxColor" | "bgMode" | "bgFrom" | "bgTo" | "bgAngle" | "bgOverlay">> = {
  enabled: false,
  template: "simples",
  bgColor: "#0E110D",
  textColor: "#EDE6D3",
  accentColor: "#7A9E3F",
  boxColor: "#FFFFFF",
  bgMode: "solida",
  bgFrom: "#0E110D",
  bgTo: "#25291F",
  bgAngle: 160,
  bgOverlay: 0.5,
};

/* CSS final da variável --cx-bg : cor sólida, linear-gradient ou foto (com
   camada escura por cima, pra sempre continuar dando pra ler o texto e os
   botões independente de quão clara for a foto). */
export function resolveBackground(pagina: Pick<PaginaCfg, "bgMode" | "bgColor" | "bgFrom" | "bgTo" | "bgAngle" | "bgImageUrl" | "bgOverlay">): string {
  if (pagina.bgMode === "imagem" && pagina.bgImageUrl) {
    const overlay = pagina.bgOverlay ?? PAGINA_CFG_DEFAULT.bgOverlay;
    return `linear-gradient(rgba(14,17,13,${overlay}), rgba(14,17,13,${overlay})), url(${pagina.bgImageUrl})`;
  }
  if (pagina.bgMode === "degrade") {
    const from = pagina.bgFrom ?? PAGINA_CFG_DEFAULT.bgFrom;
    const to = pagina.bgTo ?? PAGINA_CFG_DEFAULT.bgTo;
    const angle = pagina.bgAngle ?? PAGINA_CFG_DEFAULT.bgAngle;
    return `linear-gradient(${angle}deg, ${from}, ${to})`;
  }
  return pagina.bgColor ?? PAGINA_CFG_DEFAULT.bgColor;
}

export type ChurchLinkView = {
  id: string;
  label: string;
  url: string;
  icon: string;
  imageUrl: string | null;
  groupLabel: string | null;
};

export type ChurchPagePostView = {
  id: string;
  title: string;
  body: string | null;
  coverUrl: string | null;
  pinned: boolean;
  publishedAt: string;
};

export type ChurchPageData = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  pagina: typeof PAGINA_CFG_DEFAULT & { bio: string; coverUrl: string | null; social: PaginaSocial };
  published: boolean;
  links: ChurchLinkView[];
  posts: ChurchPagePostView[];
};

type ChurchRow = {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  settings: { paginaCfg?: PaginaCfg } | null;
};

type LinkRow = {
  id: string;
  label: string;
  url: string;
  icon: string;
  image_url: string | null;
  group_label: string | null;
};

type PostRow = {
  id: string;
  title: string;
  body: string | null;
  cover_url: string | null;
  pinned: boolean;
  published_at: string;
};

/* Preto ou creme por cima da cor de destaque, pelo jeito mais simples de
   estimar luminância (sem trazer dependência nova só pra isso). */
export function accentInk(hex: string): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return "#0E110D";
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#0E110D" : "#FAFAF7";
}

export async function getChurchPageBySlug(slug: string): Promise<ChurchPageData | null> {
  const cleanSlug = slug.trim().toLowerCase();
  if (!cleanSlug) return null;

  const admin = supabaseAdmin().schema("service");

  const { data: churchRow } = await admin
    .from("churches")
    .select("id, name, slug, logo_url, settings")
    .eq("slug", cleanSlug)
    .maybeSingle();

  const church = churchRow as ChurchRow | null;
  if (!church) return null;

  const cfg = church.settings?.paginaCfg ?? {};
  const pagina = {
    ...PAGINA_CFG_DEFAULT,
    ...cfg,
    bio: cfg.bio ?? "",
    coverUrl: cfg.coverUrl ?? null,
    social: cfg.social ?? {},
  };
  const published = pagina.enabled === true;

  let links: ChurchLinkView[] = [];
  let posts: ChurchPagePostView[] = [];

  if (published) {
    const nowIso = new Date().toISOString();

    const { data: linkData } = await admin
      .from("church_links")
      .select("id, label, url, icon, image_url, group_label")
      .eq("church_id", church.id)
      .eq("active", true)
      .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
      .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
      .order("position", { ascending: true });

    const linkRows = (linkData ?? []) as LinkRow[];
    links = linkRows.map((row) => ({
      id: row.id,
      label: row.label,
      url: row.url,
      icon: row.icon,
      imageUrl: row.image_url,
      groupLabel: row.group_label,
    }));

    const { data: postData } = await admin
      .from("church_page_posts")
      .select("id, title, body, cover_url, pinned, published_at")
      .eq("church_id", church.id)
      .order("pinned", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(20);

    const postRows = (postData ?? []) as PostRow[];
    posts = postRows.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      coverUrl: row.cover_url,
      pinned: row.pinned,
      publishedAt: row.published_at,
    }));
  }

  return {
    id: church.id,
    slug: church.slug ?? cleanSlug,
    name: church.name,
    logoUrl: church.logo_url,
    pagina,
    published,
    links,
    posts,
  };
}
