/* Estado da publicação do Mural (0075): rascunho, agendado ou no ar, e urgência.
   Antes da migração as colunas não existem: tudo conta como publicado e normal. */

import type { AnnouncementView } from "../../ServiceExactApp";

export type MuralAviso = AnnouncementView;

/** No ar: o que o membro vê. Rascunho e agendado ficam só no painel. */
export function noAr<T extends { status?: string | null }>(a: T): boolean {
  return (a.status ?? "publicado") === "publicado";
}

/** Urgentes primeiro, depois a mais recente. Não altera a lista original. */
export function urgentesPrimeiro<T extends { urgent?: boolean | null; created_at?: string | null }>(lista: T[]): T[] {
  return [...lista].sort((a, b) => Number(!!b.urgent) - Number(!!a.urgent) || (b.created_at ?? "").localeCompare(a.created_at ?? ""));
}
