import { contrastRatio, deriveAccentVars, isValidHex, mix, normalizeHex } from "./color";

/* Tema da igreja no Service. A igreja escolhe no admin (Configurações →
   Personalização) uma família de neutros pro modo escuro, outra pro claro,
   a cor de destaque e o modo padrão; o membro só alterna claro/escuro.

   Neutros NÃO são livres: cada família é um conjunto testado (ver
   validateFamily e scripts/check-theme-contrast.ts), porque um fundo livre
   quebra a leitura com facilidade. Os nomes das variáveis seguem o
   service.css (--ink = fundo da página, --graphite = cards, --white = texto
   principal, que troca de sentido no modo claro). */

export type ThemeMode = "dark" | "light";

export type NeutralTokens = {
  ink: string; graphite: string; graphite2: string; card: string;
  border: string; border2: string; border3: string;
  white: string; light: string; cream: string; creamSoft: string;
  muted: string; subtle: string; faint: string;
};

export type NeutralFamily = { id: string; label: string; hint: string; mode: ThemeMode; tokens: NeutralTokens };

export const NEUTRAL_FAMILIES: NeutralFamily[] = [
  /* ── escuros ── */
  {
    id: "tinta", label: "Tinta", hint: "Preto esverdeado, o padrão CE.X", mode: "dark",
    tokens: { ink: "#0E110D", graphite: "#181B16", graphite2: "#14170F", card: "#1F221C", border: "#25291F", border2: "#2E3327", border3: "#363C2D", white: "#FAFAF7", light: "#E6E5DD", cream: "#EDE6D3", creamSoft: "#F6F1E0", muted: "#8B8C82", subtle: "#555650", faint: "#3A3D34" },
  },
  {
    id: "carvao", label: "Carvão", hint: "Preto e cinza escuro puros", mode: "dark",
    tokens: { ink: "#101010", graphite: "#1A1A1A", graphite2: "#151515", card: "#222222", border: "#272727", border2: "#313131", border3: "#3B3B3B", white: "#FAFAFA", light: "#E6E6E6", cream: "#F0F0F0", creamSoft: "#F7F7F7", muted: "#8D8D8D", subtle: "#5A5A5A", faint: "#3D3D3D" },
  },
  {
    id: "noite", label: "Noite", hint: "Grafite frio, azulado", mode: "dark",
    tokens: { ink: "#0F1115", graphite: "#181B21", graphite2: "#13161B", card: "#1F232B", border: "#252A33", border2: "#2F3541", border3: "#39404E", white: "#F8FAFC", light: "#E2E6EE", cream: "#EEF1F6", creamSoft: "#F5F7FA", muted: "#8B92A1", subtle: "#555C6A", faint: "#3B414D" },
  },
  {
    id: "cafe", label: "Café", hint: "Marrom escuro, quente", mode: "dark",
    tokens: { ink: "#120F0D", graphite: "#1C1815", graphite2: "#171310", card: "#241F1B", border: "#2B2520", border2: "#352E28", border3: "#403831", white: "#FAF8F5", light: "#E8E3DC", cream: "#F0E9DF", creamSoft: "#F7F2EA", muted: "#948B81", subtle: "#5D5650", faint: "#423B35" },
  },
  /* ── claros ── */
  {
    id: "papel", label: "Papel", hint: "Creme quente, o padrão CE.X", mode: "light",
    tokens: { ink: "#E7DFC8", graphite: "#FBF8EF", graphite2: "#F2EBD8", card: "#E3D9BD", border: "#DDD3B6", border2: "#D0C4A1", border3: "#BEB088", white: "#1A1E13", light: "#34392A", cream: "#23271A", creamSoft: "#2A2E20", muted: "#666A57", subtle: "#8A8C79", faint: "#B3AB92" },
  },
  {
    id: "branco", label: "Branco", hint: "Branco e cinza claro puros", mode: "light",
    tokens: { ink: "#F0F0F0", graphite: "#FFFFFF", graphite2: "#F7F7F7", card: "#E4E4E4", border: "#E2E2E2", border2: "#D2D2D2", border3: "#BBBBBB", white: "#141414", light: "#333333", cream: "#1F1F1F", creamSoft: "#292929", muted: "#636363", subtle: "#8C8C8C", faint: "#BBBBBB" },
  },
  {
    id: "gelo", label: "Gelo", hint: "Branco frio, azulado", mode: "light",
    tokens: { ink: "#ECEFF4", graphite: "#FFFFFF", graphite2: "#F5F7FA", card: "#DFE4EC", border: "#DDE2EA", border2: "#CBD2DD", border3: "#B3BCC9", white: "#111827", light: "#2F3645", cream: "#1C2230", creamSoft: "#262D3B", muted: "#5D6677", subtle: "#8891A1", faint: "#B7BFCB" },
  },
  {
    id: "areia", label: "Areia", hint: "Off-white quente, neutro", mode: "light",
    tokens: { ink: "#EFEBE5", graphite: "#FFFEFC", graphite2: "#F7F4EF", card: "#E6E0D7", border: "#E3DDD3", border2: "#D3CBBE", border3: "#BDB3A4", white: "#1C1916", light: "#3A342E", cream: "#26221E", creamSoft: "#2E2924", muted: "#69625A", subtle: "#928A80", faint: "#C0B7AB" },
  },
];

export const DEFAULT_FAMILY: Record<ThemeMode, string> = { dark: "tinta", light: "papel" };

/* cores de identidade comuns em igrejas, pra começar rápido (a igreja pode
   usar qualquer cor: estas só aceleram a escolha) */
export const ACCENT_PRESETS = [
  { hex: "#7A9E3F", label: "Oliva CE.X" },
  { hex: "#2F6FDB", label: "Azul" },
  { hex: "#1F3A68", label: "Azul marinho" },
  { hex: "#0E8C7A", label: "Verde-água" },
  { hex: "#2E8B57", label: "Verde" },
  { hex: "#C8A13A", label: "Dourado" },
  { hex: "#E07A1F", label: "Laranja" },
  { hex: "#C8312F", label: "Vermelho" },
  { hex: "#8C1C3A", label: "Vinho" },
  { hex: "#6B3FA0", label: "Roxo" },
  { hex: "#D14D8A", label: "Rosa" },
  { hex: "#6F523A", label: "Marrom" },
];

/* Réguas mínimas, medidas na paleta CE.X original (tinta/papel) pra que
   qualquer família nova fique no mesmo nível de leitura. */
export const CONTRAST_RULES: { a: keyof NeutralTokens; b: keyof NeutralTokens; min: number; what: string }[] = [
  { a: "white", b: "graphite", min: 12, what: "texto principal no card" },
  { a: "white", b: "ink", min: 10, what: "texto principal no fundo" },
  { a: "light", b: "graphite", min: 9, what: "texto de apoio no card" },
  { a: "muted", b: "graphite", min: 4.5, what: "texto secundário no card" },
  { a: "muted", b: "ink", min: 4, what: "texto secundário no fundo" },
  { a: "subtle", b: "graphite", min: 2.2, what: "legenda/placeholder no card" },
  { a: "border2", b: "graphite", min: 1.25, what: "borda visível no card" },
  { a: "graphite", b: "ink", min: 1.05, what: "card separado do fundo" },
];

export function validateFamily(family: NeutralFamily): { rule: string; ratio: number; min: number }[] {
  return CONTRAST_RULES
    .map((r) => ({ rule: r.what, ratio: contrastRatio(family.tokens[r.a], family.tokens[r.b]), min: r.min }))
    .filter((r) => r.ratio < r.min);
}

export function familyById(id: string | undefined, mode: ThemeMode): NeutralFamily {
  return NEUTRAL_FAMILIES.find((f) => f.id === id && f.mode === mode)
    ?? NEUTRAL_FAMILIES.find((f) => f.id === DEFAULT_FAMILY[mode])!;
}

/* Ajusta a cor da igreja pra ler bem no fundo do modo: escurece (modo claro)
   ou clareia (modo escuro) até ter contraste mínimo de 3:1 contra os cards,
   o mínimo pra ícones, bordas de foco e texto grande em destaque. A igreja
   escolhe UMA cor e o sistema cuida das duas versões. */
export function adaptAccent(hex: string, surface: string, mode: ThemeMode, min = 3): string {
  let c = normalizeHex(hex);
  const target = mode === "light" ? "#000000" : "#FFFFFF";
  for (let i = 0; i < 20 && contrastRatio(c, surface) < min; i++) c = mix(c, target, 0.08);
  return c;
}

export type BrandCfg = {
  accent?: string;
  /* legado: antes eram duas cores escolhidas à mão, uma por modo */
  accentDark?: string;
  accentLight?: string;
  neutralDark?: string;
  neutralLight?: string;
  defaultMode?: ThemeMode;
  editorIds?: string[];
};

export const DEFAULT_ACCENT = "#7A9E3F";

/* Todas as variáveis CSS do tema, prontas pra aplicar no :root. */
export function themeVars(brand: BrandCfg | undefined, mode: ThemeMode): Record<string, string> {
  const fam = familyById(mode === "dark" ? brand?.neutralDark : brand?.neutralLight, mode).tokens;
  const legacy = mode === "dark" ? brand?.accentDark : brand?.accentLight;
  const raw = [brand?.accent, legacy, DEFAULT_ACCENT].find((h) => h && isValidHex(h))!;
  const accent = adaptAccent(raw, fam.graphite, mode);
  const a = deriveAccentVars(accent, mode);
  return {
    "--ink": fam.ink, "--graphite": fam.graphite, "--graphite-2": fam.graphite2, "--card": fam.card,
    "--border": fam.border, "--border-2": fam.border2, "--border-3": fam.border3,
    "--white": fam.white, "--light": fam.light, "--cream": fam.cream, "--cream-soft": fam.creamSoft,
    "--muted": fam.muted, "--subtle": fam.subtle, "--faint": fam.faint,
    "--olive": a.olive, "--olive-soft": a.oliveSoft, "--olive-deep": a.oliveDeep,
    "--olive-dim": a.oliveDim, "--olive-line": a.oliveLine, "--accent-ink": a.accentInk,
  };
}

export const THEME_VAR_NAMES = Object.keys(themeVars(undefined, "dark"));

/* CSS do tema da igreja pra renderizar no servidor (<style> na página).
   :root já sai no modo certo desta pessoa (cookie cex_theme ou modo padrão
   da igreja), então a primeira pintura vem certa, sem script. Os dois
   blocos com data-theme cobrem a troca claro/escuro feita no app depois. */
export function themeCss(brand: BrandCfg | undefined, mode: ThemeMode = brand?.defaultMode ?? "dark"): string {
  const block = (vars: Record<string, string>) => Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(";");
  return `:root{${block(themeVars(brand, mode))}}`
    + `body[data-theme="dark"]{${block(themeVars(brand, "dark"))}}`
    + `body[data-theme="light"]{${block(themeVars(brand, "light"))}}`;
}

export const THEME_COOKIE = "cex_theme";

/* modo desta pessoa: escolha dela (cookie) ou o padrão da igreja */
export function resolveMode(cookieValue: string | undefined, brand: BrandCfg | undefined): ThemeMode {
  if (cookieValue === "light" || cookieValue === "dark") return cookieValue;
  return brand?.defaultMode ?? "dark";
}
