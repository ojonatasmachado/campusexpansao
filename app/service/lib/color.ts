/* Utilidades de cor pra Personalização de marca (Config → Personalização).
   Sem dependências : conversão hex↔rgb, luminância relativa e contraste WCAG,
   pra decidir automaticamente se o texto "em cima" da cor de destaque da
   igreja deve ser claro ou escuro, e pra avisar quando o contraste está
   baixo demais pra ser confortável de ler. */

export function isValidHex(value: string): boolean {
  return /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(value.trim());
}

export function normalizeHex(value: string): string {
  const v = value.trim();
  if (/^#([0-9a-fA-F]{3})$/.test(v)) {
    return "#" + v.slice(1).split("").map((c) => c + c).join("");
  }
  return v;
}

export function hexToRgb(hex: string): [number, number, number] | null {
  const v = normalizeHex(hex);
  if (!isValidHex(v)) return null;
  const n = parseInt(v.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: [number, number, number]): string {
  const c = (x: number) => Math.round(Math.min(255, Math.max(0, x))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

function channelLuminance(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map(channelLuminance);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razão de contraste WCAG entre duas cores (1 a 21). */
export function contrastRatio(hexA: string, hexB: string): number {
  const la = relativeLuminance(hexA);
  const lb = relativeLuminance(hexB);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Mistura hex em direção a outra cor (0 = hex original, 1 = target). */
export function mix(hex: string, target: string, amount: number): string {
  const a = hexToRgb(hex);
  const b = hexToRgb(target);
  if (!a || !b) return hex;
  const t = Math.min(1, Math.max(0, amount));
  return rgbToHex([
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ]);
}

/** h em graus (0-360), s e l de 0 a 1. */
export function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.min(1, Math.max(0, s));
  const light = Math.min(1, Math.max(0, l));
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - c / 2;
  let [r, g, b] = [0, 0, 0];
  if (hue < 60) [r, g, b] = [c, x, 0];
  else if (hue < 120) [r, g, b] = [x, c, 0];
  else if (hue < 180) [r, g, b] = [0, c, x];
  else if (hue < 240) [r, g, b] = [0, x, c];
  else if (hue < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return rgbToHex([(r + m) * 255, (g + m) * 255, (b + m) * 255]);
}

export function withAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

/** Dado um fundo, devolve entre duas opções de texto a que lê melhor. */
export function bestOnColor(bgHex: string, darkHex: string, lightHex: string): string {
  const withDark = contrastRatio(bgHex, darkHex);
  const withLight = contrastRatio(bgHex, lightHex);
  return withDark >= withLight ? darkHex : lightHex;
}

export type AccentVars = {
  olive: string;
  oliveSoft: string;
  oliveDeep: string;
  oliveDim: string;
  oliveLine: string;
  accentInk: string;
  /** contraste do texto escolhido (accentInk) sobre a cor de destaque. */
  contrast: number;
};

/* Âncoras universais de "texto escuro" e "texto claro" pra decidir o que
   fica em cima da cor de destaque : independem do tema, porque --ink/--white
   trocam de sentido entre escuro e claro (ver service.css). */
const DARK_TEXT = "#0E110D";
const LIGHT_TEXT = "#FAFAF7";

/**
 * Deriva o conjunto completo de variáveis --olive-* a partir de uma única
 * cor de destaque, incluindo o texto "em cima" dela (accentInk) escolhido
 * automaticamente pelo maior contraste entre tinta escura e branco (garante
 * legibilidade em botões sólidos e badges independente do tom escolhido).
 */
export function deriveAccentVars(hex: string, theme: "dark" | "light"): AccentVars {
  const olive = normalizeHex(hex);
  const oliveSoft = mix(olive, "#FFFFFF", 0.22);
  const oliveDeep = mix(olive, "#000000", 0.34);
  const dimAlpha = theme === "dark" ? 0.1 : 0.16;
  const lineAlpha = theme === "dark" ? 0.28 : 0.42;
  const accentInk = bestOnColor(olive, DARK_TEXT, LIGHT_TEXT);
  return {
    olive,
    oliveSoft,
    oliveDeep,
    oliveDim: withAlpha(olive, dimAlpha),
    oliveLine: withAlpha(olive, lineAlpha),
    accentInk,
    contrast: contrastRatio(olive, accentInk),
  };
}

/** Classificação simples do contraste pra mostrar ao usuário. */
export function contrastLabel(ratio: number): { label: string; ok: boolean } {
  if (ratio >= 4.5) return { label: "Ótimo contraste", ok: true };
  if (ratio >= 3) return { label: "Contraste razoável", ok: true };
  return { label: "Contraste baixo : difícil de ler", ok: false };
}

export type WheelCell = { x: number; y: number; hex: string };

/**
 * Roda de cores em favo de mel (grade hexagonal) : matiz pela posição
 * angular, saturação pela distância do centro, luminosidade decrescendo
 * pra fora (centro claro → bordas mais ricas/escuras). `x`/`y` são
 * coordenadas unitárias (raio do hexágono = 1) já centradas em (0,0),
 * o componente que renderiza escala pra pixels.
 */
export function buildColorWheel(radius = 6): WheelCell[] {
  const SQRT3 = Math.sqrt(3);
  const raw: { x: number; y: number }[] = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      const s = -q - r;
      if (Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) > radius) continue;
      raw.push({ x: SQRT3 * q + (SQRT3 / 2) * r, y: 1.5 * r });
    }
  }
  const maxDist = Math.max(...raw.map(({ x, y }) => Math.hypot(x, y)));
  return raw.map(({ x, y }) => {
    const dist = Math.hypot(x, y) / maxDist;
    const hue = (Math.atan2(y, x) * 180) / Math.PI;
    const sat = Math.min(1, dist / 0.55);
    const light = 0.93 - dist * 0.5;
    return { x, y, hex: hslToHex(hue, sat, light) };
  });
}
