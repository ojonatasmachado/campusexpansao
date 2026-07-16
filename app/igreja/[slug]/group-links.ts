import type { ChurchLinkView } from "../../lib/church-page";

export function groupLinks(links: ChurchLinkView[]): { label: string; items: ChurchLinkView[] }[] {
  const groups: { label: string; items: ChurchLinkView[] }[] = [];
  const byLabel = new Map<string, ChurchLinkView[]>();
  for (const link of links) {
    const key = link.groupLabel?.trim() || "";
    if (!byLabel.has(key)) {
      byLabel.set(key, []);
      groups.push({ label: key, items: byLabel.get(key)! });
    }
    byLabel.get(key)!.push(link);
  }
  return groups;
}

export function formatPostDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}
