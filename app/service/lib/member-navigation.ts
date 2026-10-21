import type { MemberTab } from "../membro/tipos";

export type MemberLocation = { tab: MemberTab; sub: string | null; segment: "minha" | "igreja"; announcement: string | null; card: string | null };
const TABS: MemberTab[] = ["inicio", "agenda", "mensagens", "caminhada", "perfil"];
const KEYS = ["maba", "mtela", "msegmento", "maviso", "mtarefa"];
const id = (value: string | null) => value && /^[a-zA-Z0-9_-]{1,100}$/.test(value) ? value : null;

export function clearMemberLocation(url: URL): URL {
  const next = new URL(url);
  [...KEYS, "aviso"].forEach((key) => next.searchParams.delete(key));
  return next;
}

/** Só restaura destinos oferecidos à pessoa pelo registro atual. A URL não
 * concede acesso, e nunca transporta texto de mensagem, documento ou formulário. */
export function readMemberLocation(url: URL, allowed: (tab: MemberTab, sub: string) => boolean): MemberLocation {
  const category = url.searchParams.get("aviso");
  const fallback = category === "escala" ? "agenda" : category === "mural" || category === "mensagens" ? "mensagens" : category === "caminhada" ? "caminhada" : "inicio";
  const raw = url.searchParams.get("maba") ?? fallback;
  const tab = TABS.includes(raw as MemberTab) ? raw as MemberTab : "inicio";
  const requested = id(url.searchParams.get("mtela")) ?? (category === "mural" && !url.searchParams.has("mtela") ? "mural" : null);
  const sub = requested && allowed(tab, requested) ? requested : null;
  return { tab, sub, segment: url.searchParams.get("msegmento") === "igreja" ? "igreja" : "minha", announcement: sub === "mural" ? id(url.searchParams.get("maviso")) : null, card: sub === "tarefas" ? id(url.searchParams.get("mtarefa")) : null };
}

export function memberNotificationUrl(category: string, announcementId?: string): string {
  const params = new URLSearchParams({ aviso: category });
  const tab = category === "escala" ? "agenda" : category === "mural" || category === "mensagens" ? "mensagens" : category === "caminhada" ? "caminhada" : null;
  if (!tab) return "/service";
  params.set("maba", tab);
  if (category === "mural") {
    params.set("mtela", "mural");
    if (id(announcementId ?? null)) params.set("maviso", announcementId!);
  }
  return `/service?${params}`;
}

export function writeMemberLocation(url: URL, location: MemberLocation): URL {
  const next = new URL(url);
  KEYS.forEach((key) => next.searchParams.delete(key));
  next.searchParams.set("maba", location.tab);
  if (location.sub) next.searchParams.set("mtela", location.sub);
  if (location.tab === "agenda") next.searchParams.set("msegmento", location.segment);
  if (location.sub === "mural" && id(location.announcement)) next.searchParams.set("maviso", location.announcement!);
  if (location.sub === "tarefas" && id(location.card)) next.searchParams.set("mtarefa", location.card!);
  return next;
}
