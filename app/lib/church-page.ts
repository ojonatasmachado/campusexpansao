import { supabaseAdmin } from "./supabase";

/* Leitura pública (sem login) da página link-in-bio de uma igreja, usada por
   app/[slug]. Roda só no servidor : supabaseAdmin() é service_role e
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

/* Conteúdo de verdade da Página pública (link-in-bio) : o que só ela usa.
   Cor de fundo/texto/caixas e logo NÃO ficam aqui, são identidade da igreja
   (ver IdentidadeCfg abaixo) : configuradas uma vez em Personalização, e
   tanto a Página pública quanto o login temático só consomem. accentColor
   é a única exceção intencional : a Página pública pode ter uma cor de
   destaque diferente do resto do Service, se a igreja quiser. */
export type PaginaCfg = {
  enabled?: boolean;
  template?: PaginaTemplate;
  bio?: string;
  accentColor?: string;
  coverUrl?: string;
  social?: PaginaSocial;
  editorIds?: string[];
};

/* Identidade visual única da igreja : logo, fundo, cor do texto e das
   caixas. Configurada uma vez em Configurações → Personalização
   (settings.identidadeCfg), consumida pela Página pública e pelo login
   temático (app/[slug]/entrar). */
export type IdentidadeCfg = {
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
  /* cor das caixas de link/notícia e dos balões de rede social. Entra via
     color-mix() no CSS (public/igreja-page.css), então funciona tanto pra
     branco (padrão, visual "vidro fosco" de sempre) quanto pra qualquer
     cor que a igreja escolher. */
  boxColor?: string;
  /* logo em imagem (padrão, usa church.logoUrl) ou em texto : pra igreja
     que não tem uma logo pronta, escreve o nome com uma fonte bonita em vez
     de subir uma imagem. */
  logoMode?: "imagem" | "texto";
  logoText?: string;
  logoFont?: LogoFontKey;
  logoAlign?: "left" | "center" | "right";
};

/* fontes curadas pro logo em texto : arquivo único, editor e página pública
   importam daqui. Carregadas via Google Fonts no layout isolado da rota
   (app/[slug]/layout.tsx), não na Brand Library do site. */
export const LOGO_FONTS = {
  inter: { label: "Padrão", family: "'Inter', sans-serif", weight: 800 },
  playfair: { label: "Elegante", family: "'Playfair Display', serif", weight: 700 },
  poppins: { label: "Moderna", family: "'Poppins', sans-serif", weight: 700 },
  bebas: { label: "Impacto", family: "'Bebas Neue', sans-serif", weight: 400 },
  pacifico: { label: "Manuscrita", family: "'Pacifico', cursive", weight: 400 },
  oswald: { label: "Condensada", family: "'Oswald', sans-serif", weight: 600 },
} as const;

export type LogoFontKey = keyof typeof LOGO_FONTS;

export const PAGINA_CFG_DEFAULT: Required<Pick<PaginaCfg, "enabled" | "template" | "accentColor">> = {
  enabled: false,
  template: "simples",
  accentColor: "#7A9E3F",
};

export const IDENTIDADE_CFG_DEFAULT: Required<Pick<IdentidadeCfg, "bgColor" | "textColor" | "boxColor" | "bgMode" | "bgFrom" | "bgTo" | "bgAngle" | "bgOverlay" | "logoMode" | "logoFont" | "logoAlign">> = {
  bgColor: "#0E110D",
  textColor: "#EDE6D3",
  boxColor: "#FFFFFF",
  bgMode: "solida",
  bgFrom: "#0E110D",
  bgTo: "#25291F",
  bgAngle: 160,
  bgOverlay: 0.5,
  logoMode: "imagem",
  logoFont: "inter",
  logoAlign: "center",
};

/* CSS final da variável --cx-bg : cor sólida, linear-gradient ou foto (com
   camada escura por cima, pra sempre continuar dando pra ler o texto e os
   botões independente de quão clara for a foto). */
export function resolveBackground(identidade: Pick<IdentidadeCfg, "bgMode" | "bgColor" | "bgFrom" | "bgTo" | "bgAngle" | "bgImageUrl" | "bgOverlay">): string {
  if (identidade.bgMode === "imagem" && identidade.bgImageUrl) {
    const overlay = identidade.bgOverlay ?? IDENTIDADE_CFG_DEFAULT.bgOverlay;
    return `linear-gradient(rgba(14,17,13,${overlay}), rgba(14,17,13,${overlay})), url(${identidade.bgImageUrl})`;
  }
  if (identidade.bgMode === "degrade") {
    const from = identidade.bgFrom ?? IDENTIDADE_CFG_DEFAULT.bgFrom;
    const to = identidade.bgTo ?? IDENTIDADE_CFG_DEFAULT.bgTo;
    const angle = identidade.bgAngle ?? IDENTIDADE_CFG_DEFAULT.bgAngle;
    return `linear-gradient(${angle}deg, ${from}, ${to})`;
  }
  return identidade.bgColor ?? IDENTIDADE_CFG_DEFAULT.bgColor;
}

/* Mescla identidadeCfg (fundo/texto/caixas/logo) + paginaCfg (conteúdo +
   accentColor) no mesmo formato `pagina` que os templates, LogoMark e
   resolveBackground já esperam : fonte única, usada tanto por
   getChurchPageBySlug quanto pelo preview do editor (PublicPageEditor).
   serviceAccent é o brandCfg.accentDark da igreja (cor de destaque do
   Service inteiro) : fallback de accentColor quando a página não tem uma
   cor de destaque própria. */
export function mergeChurchIdentity(
  identidadeCfg: IdentidadeCfg | undefined,
  paginaCfg: PaginaCfg | undefined,
  serviceAccent?: string,
) {
  const identidade = identidadeCfg ?? {};
  const pagina = paginaCfg ?? {};
  return {
    ...PAGINA_CFG_DEFAULT,
    ...IDENTIDADE_CFG_DEFAULT,
    ...pagina,
    ...identidade,
    accentColor: pagina.accentColor || serviceAccent || PAGINA_CFG_DEFAULT.accentColor,
    bio: pagina.bio ?? "",
    coverUrl: pagina.coverUrl ?? null,
    logoText: identidade.logoText ?? "",
    social: pagina.social ?? {},
  };
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
  pagina: typeof PAGINA_CFG_DEFAULT & typeof IDENTIDADE_CFG_DEFAULT & { bio: string; coverUrl: string | null; logoText: string; social: PaginaSocial };
  /* brandCfg.accentDark : cor de destaque do Service inteiro (painel interno
     + login temático). Separado de pagina.accentColor porque a Página
     pública pode ter uma cor de destaque própria (override), mas o login
     sempre usa a cor do Service, nunca o override da página. */
  serviceAccent: string;
  published: boolean;
  links: ChurchLinkView[];
  posts: ChurchPagePostView[];
};

type ChurchRow = {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  settings: { paginaCfg?: PaginaCfg; identidadeCfg?: IdentidadeCfg; brandCfg?: { accentDark?: string } } | null;
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

  const pagina = mergeChurchIdentity(church.settings?.identidadeCfg, church.settings?.paginaCfg, church.settings?.brandCfg?.accentDark);
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
    serviceAccent: church.settings?.brandCfg?.accentDark || PAGINA_CFG_DEFAULT.accentColor,
    published,
    links,
    posts,
  };
}
