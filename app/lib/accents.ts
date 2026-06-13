export type AccentKey = "olive" | "clay" | "wheat" | "sand" | "amber" | "terra" | "rust" | "cocoa";
export interface Accent { base: string; deep: string; name: string }

export const ACCENTS: Record<AccentKey, Accent> = {
  olive: { base: "#7A9E3F", deep: "#4F6B26", name: "Oliva"     },
  clay:  { base: "#C5805A", deep: "#8A5038", name: "Argila"    },
  wheat: { base: "#CBA95C", deep: "#9A7C42", name: "Trigo"     },
  sand:  { base: "#E2D6B4", deep: "#B8A882", name: "Areia"     },
  amber: { base: "#D6A23E", deep: "#A0742A", name: "Âmbar"     },
  terra: { base: "#B5694A", deep: "#7C4030", name: "Terracota" },
  rust:  { base: "#9C5A33", deep: "#6A3A1E", name: "Ferrugem"  },
  cocoa: { base: "#6F523A", deep: "#4A3322", name: "Cacau"     },
};

// Converte um hex canônico da paleta para AccentKey.
// Fonte única: componentes de landing e o admin importam daqui.
export const HEX_TO_ACCENT: Record<string, AccentKey> = {
  "#E2D6B4": "sand",
  "#CBA95C": "wheat",
  "#D6A23E": "amber",
  "#C5805A": "clay",
  "#B5694A": "terra",
  "#9C5A33": "rust",
  "#6F523A": "cocoa",
  "#7A9E3F": "olive",
};

export function accentKeyFromHex(hex: string, fallback: AccentKey = "olive"): AccentKey {
  return HEX_TO_ACCENT[hex] ?? fallback;
}
