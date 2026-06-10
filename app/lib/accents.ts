export type AccentKey = "olive" | "clay" | "ochre" | "pine" | "slate" | "wheat";
export interface Accent { base: string; deep: string; name: string }

export const ACCENTS: Record<AccentKey, Accent> = {
  olive: { base: "#7A9E3F", deep: "#4F6B26", name: "Oliva" },
  clay:  { base: "#B07355", deep: "#7C4B33", name: "Argila" },
  ochre: { base: "#C0934E", deep: "#8A6630", name: "Ocre"  },
  pine:  { base: "#4F7264", deep: "#335147", name: "Pinho" },
  slate: { base: "#5C7488", deep: "#3C4E5C", name: "Ardósia" },
  wheat: { base: "#C9A86B", deep: "#9A7C42", name: "Trigo" },
};
