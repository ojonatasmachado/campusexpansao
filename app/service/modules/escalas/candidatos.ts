/* Quem pode entrar numa vaga da escala, e por quê não. Função pura usada pela
   escala de um culto (Escalas.tsx) e pela escala de um período inteiro
   (periodo.ts). Saiu de Escalas.tsx sem mudar o comportamento de um culto. */
import { compararRodizio } from "./rodizio";
import type { EscalaSettings } from "./regras";

/* candidato apto a uma posição, com motivo de bloqueio : equivalente a
   candidatos() em evolucoes/service_app/escalas.jsx:12-30. Diferença de fidelidade
   consciente: no protótipo "férias" é uma flag solta além do status; no banco real
   ferias É um valor do enum people.status, então "considerarFerias" aqui vira o
   toggle que decide se quem está com status='ferias' entra ou não no pool. */
/* motivo do bloqueio em código; o texto legível sai na janela (v7 4.14) */
export type Motivo = "evento" | "ferias" | "teto" | "folga";
export type PessoaEscala = { id: string; name: string; status: "ativo" | "pausa" | "ferias"; availability: Record<string, boolean> };
export type Candidato<P extends PessoaEscala = PessoaEscala> = { person: P; fit: "good" | "busy" | "block"; motivo: Motivo | null; vezes: number; ultima?: string };

/** Indisponível neste culto: marcou que não pode no horário (slot) ou bloqueou
 *  a data (chave "d:AAAA-MM-DD" em people.availability). Sem resposta conta como disponível. */
export function indisponivel(p: PessoaEscala, slot: string | null | undefined, data?: string | null): boolean {
  if (slot && p.availability?.[slot] === false) return true;
  if (data && p.availability?.[`d:${data}`] === false) return true;
  return false;
}

const DIA = 86400000;
/* um Collator só: localeCompare cria um por chamada e pesa no período de 12 meses */
const porNome = new Intl.Collator("pt-BR");
const diasEntre = (a: string, b: string) => Math.round(Math.abs(new Date(`${a}T12:00:00`).getTime() - new Date(`${b}T12:00:00`).getTime()) / DIA);

/** Folga: com N semanas de folga, quem serviu (ou vai servir) a menos de
 *  (N + 1) semanas desta data descansa. Mesmo dia não conta (manhã e noite). */
export function emFolga(datas: string[] | undefined, data: string | null | undefined, folgaSemanas: number): boolean {
  if (!folgaSemanas || !data || !datas?.length) return false;
  const janela = (folgaSemanas + 1) * 7;
  return datas.some((d) => d !== data && diasEntre(d, data) < janela);
}

/* v7 4.14: dentro de cada grupo, a ordem é a do rodízio (menos vezes no mês,
   depois quem serviu há mais tempo), não mais o engajamento.
   datasDaPessoa (opcional): datas em que cada pessoa já serve, para a folga.
   vezesRodizio (opcional): contagem usada na ordem do rodízio no lugar da do
   mês; no período é a do período inteiro, senão a virada do mês favorece
   sempre as mesmas pessoas. O teto continua sendo o do mês. */
export function candidatosDisponiveis<P extends PessoaEscala>(
  pool: P[],
  event: { slot?: string | null; eventDate?: string | null },
  jaNoSlot: Set<string>,
  usadosNoEvento: Set<string>,
  cfg: EscalaSettings,
  cargaPorPessoa: Record<string, number>,
  ultimaVez: Record<string, string> = {},
  datasDaPessoa?: Record<string, string[]>,
  vezesRodizio?: Record<string, number>,
): Candidato<P>[] {
  return pool
    .filter((p) => p.status !== "pausa" && !jaNoSlot.has(p.id))
    .map((p) => {
      let motivo: Motivo | null = null;
      if (usadosNoEvento.has(p.id)) motivo = "evento";
      else if (p.status === "ferias" && cfg.considerarFerias) motivo = "ferias";
      else if (cfg.maxPorMes && (cargaPorPessoa[p.id] ?? 0) >= cfg.maxPorMes) motivo = "teto";
      else if (datasDaPessoa && emFolga(datasDaPessoa[p.id], event.eventDate, cfg.folgaSemanas)) motivo = "folga";
      /* disponibilidade ausente (nunca configurada) conta como disponível : só
         vira "busy" quando a pessoa marcou explicitamente que não pode nesse
         horário, senão todo voluntário novo aparecia "ocupado" sem nunca ter
         recusado nada. */
      const fit: Candidato["fit"] = motivo ? "block" : (indisponivel(p, event.slot, event.eventDate) ? "busy" : "good");
      return { person: p, fit, motivo, vezes: (vezesRodizio ?? cargaPorPessoa)[p.id] ?? 0, ultima: ultimaVez[p.id] };
    })
    .sort((a, b) => {
      const rank = (x: Candidato<P>) => (x.fit === "good" ? 0 : x.fit === "busy" ? 1 : 2);
      return rank(a) === rank(b) ? compararRodizio(a, b) || porNome.compare(a.person.name, b.person.name) : rank(a) - rank(b);
    });
}

type VagaRoster = { event_id: string; person_id: string; status: string };
type EvData = { id: string; eventDate: string };

/* nº de eventos distintos, no mesmo mês do evento-alvo, em que a pessoa já está
   escalada (status != recusou) : usado pelo teto "máximo de vezes por mês". */
export function cargaDoMes(roster: VagaRoster[], events: EvData[], targetEvent: { eventDate: string }): Record<string, number> {
  const eventById = new Map(events.map((e) => [e.id, e]));
  const targetMonth = (targetEvent.eventDate ?? "").slice(0, 7);
  const seen = new Set<string>();
  const counts: Record<string, number> = {};
  roster.forEach((assignment) => {
    if (assignment.status === "no") return;
    const ev = eventById.get(assignment.event_id);
    if (!ev || (ev.eventDate ?? "").slice(0, 7) !== targetMonth) return;
    const key = `${assignment.person_id}:${assignment.event_id}`;
    if (seen.has(key)) return;
    seen.add(key);
    counts[assignment.person_id] = (counts[assignment.person_id] ?? 0) + 1;
  });
  return counts;
}
