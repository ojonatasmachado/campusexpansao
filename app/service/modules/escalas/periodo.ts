/* Escala de um período inteiro (jornada "montar a escala de 1 a 12 meses").
   Tudo aqui é puro (sem banco, sem React) e testado em
   scripts/check-escala-periodo.ts. A escolha de cada vaga usa a mesma regra
   da escala de um culto (candidatosDisponiveis): pausa e férias ficam de fora,
   ninguém serve duas vezes no mesmo culto, teto de vezes por mês, folga entre
   escalas e, por fim, o rodízio (menos vezes no mês, depois quem serviu há
   mais tempo). No período, quem marcou que não pode no horário ou na data
   nunca entra sozinho: a vaga fica aberta e vira aviso. */
import { parseISODate, toISODate } from "../../lib/date";
import { candidatosDisponiveis, indisponivel, type Candidato, type PessoaEscala } from "./candidatos";
import type { EscalaSettings } from "./regras";

export const MESES_MAX = 12;

/* ── agenda ─────────────────────────────────────────────────────────────── */

export type EventoAgenda = {
  id: string;
  organizationId: string;
  name: string;
  kind: string;
  eventDate: string;
  time: string;
  slot: string;
  location: string;
  roomId?: string | null;
  ministries: string[];
};

/** Culto que se repete toda semana: mesmo nome, dia da semana e horário. */
export type Serie = {
  chave: string;
  nome: string;
  kind: string;
  diaSemana: number;
  hora: string;
  slot: string;
  local: string;
  roomId: string | null;
  times: string[];
  quantas: number;
};

const sem = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
const diaDaSemana = (iso: string) => parseISODate(iso)?.getDay() ?? -1;
export const chaveSerie = (e: Pick<EventoAgenda, "name" | "eventDate" | "time">) => `${sem(e.name)}|${diaDaSemana(e.eventDate)}|${(e.time ?? "").trim()}`;

/** Séries da agenda. Repete quando aparece em duas datas ou mais, ou quando é
 *  um culto. Evento avulso (vigília, batismo) com data só uma vez não vira série.
 *  O modelo de cada série é o evento mais recente dela. */
export function seriesDaAgenda(events: EventoAgenda[]): Serie[] {
  const grupos = new Map<string, EventoAgenda[]>();
  for (const e of events) {
    if (!parseISODate(e.eventDate)) continue;
    const k = chaveSerie(e);
    grupos.set(k, [...(grupos.get(k) ?? []), e]);
  }
  const out: Serie[] = [];
  for (const [chave, lista] of grupos) {
    const datas = new Set(lista.map((e) => e.eventDate));
    const ehCulto = lista.some((e) => sem(e.kind ?? "") === "culto");
    if (datas.size < 2 && !ehCulto) continue;
    const modelo = [...lista].sort((a, b) => b.eventDate.localeCompare(a.eventDate))[0];
    out.push({
      chave, nome: modelo.name, kind: modelo.kind || "Culto", diaSemana: diaDaSemana(modelo.eventDate), hora: modelo.time ?? "",
      slot: modelo.slot ?? "", local: modelo.location ?? "", roomId: modelo.roomId ?? null, times: modelo.ministries ?? [], quantas: datas.size,
    });
  }
  /* domingo primeiro, depois pelo horário */
  return out.sort((a, b) => a.diaSemana - b.diaSemana || a.hora.localeCompare(b.hora) || a.nome.localeCompare(b.nome));
}

/** Último dia de um período de N meses começando em `inicio` ("2026-11-01" + 1 → "2026-11-30"). */
export function fimDoPeriodo(inicio: string, meses: number): string {
  const d = parseISODate(inicio);
  if (!d) return inicio;
  const n = Math.max(1, Math.min(MESES_MAX, Math.round(meses)));
  const alvo = new Date(d.getFullYear(), d.getMonth() + n, d.getDate());
  /* 31/01 + 1 mês não pode virar 03/03: fica no último dia do mês certo */
  if (alvo.getDate() !== d.getDate()) alvo.setDate(0);
  alvo.setDate(alvo.getDate() - 1);
  return toISODate(alvo);
}

/** O período cabe no limite: fim depois do início e no máximo 12 meses. */
export function periodoValido(inicio: string, fim: string): boolean {
  if (!parseISODate(inicio) || !parseISODate(fim) || fim < inicio) return false;
  return fim <= fimDoPeriodo(inicio, MESES_MAX);
}

/** Datas do período que caem no dia da semana (0 = domingo). */
export function datasNoPeriodo(inicio: string, fim: string, diaSemana: number): string[] {
  const d = parseISODate(inicio);
  if (!d || !parseISODate(fim) || diaSemana < 0) return [];
  d.setDate(d.getDate() + ((diaSemana - d.getDay() + 7) % 7));
  const out: string[] = [];
  for (let iso = toISODate(d); iso <= fim; d.setDate(d.getDate() + 7), iso = toISODate(d)) out.push(iso);
  return out;
}

/** Um culto do período. eventId nulo = ainda não existe na agenda e é criado ao confirmar. */
export type CultoPlano = { chave: string; eventId: string | null; serie: string | null; data: string; nome: string; hora: string; slot: string; times: string[] };

/** Cultos do período: cada data das séries escolhidas (o evento que já existe
 *  naquela data é usado; o que falta é criado) mais os avulsos escolhidos. */
export function cultosDoPeriodo(events: EventoAgenda[], series: Serie[], inicio: string, fim: string, avulsos: string[] = []): CultoPlano[] {
  const out: CultoPlano[] = [];
  const existentes = new Map<string, EventoAgenda>();
  for (const e of events) existentes.set(`${chaveSerie(e)}@${e.eventDate}`, e);
  for (const s of series) {
    for (const data of datasNoPeriodo(inicio, fim, s.diaSemana)) {
      const ev = existentes.get(`${s.chave}@${data}`);
      out.push(ev
        ? { chave: ev.id, eventId: ev.id, serie: s.chave, data, nome: ev.name, hora: ev.time ?? "", slot: ev.slot ?? "", times: ev.ministries ?? [] }
        : { chave: `novo:${s.chave}@${data}`, eventId: null, serie: s.chave, data, nome: s.nome, hora: s.hora, slot: s.slot, times: s.times });
    }
  }
  const ja = new Set(out.map((c) => c.eventId).filter(Boolean));
  for (const id of avulsos) {
    const ev = events.find((e) => e.id === id);
    if (!ev || ja.has(ev.id) || ev.eventDate < inicio || ev.eventDate > fim) continue;
    out.push({ chave: ev.id, eventId: ev.id, serie: null, data: ev.eventDate, nome: ev.name, hora: ev.time ?? "", slot: ev.slot ?? "", times: ev.ministries ?? [] });
  }
  return out.sort((a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora) || a.nome.localeCompare(b.nome));
}

/* ── geração ────────────────────────────────────────────────────────────── */

export type FuncaoPlano = { id: string; nome: string; vagas: number };
export type TimePlano = { id: string; nome: string; pessoas: string[]; funcoes: FuncaoPlano[] };
type VagaRoster = { event_id: string; position_id: string; person_id: string; status: string };

export type EntradaPeriodo = {
  cultos: CultoPlano[];
  /** só os times escolhidos, com as vagas por função já ajustadas */
  times: TimePlano[];
  pessoas: PessoaEscala[];
  roster: VagaRoster[];
  events: Array<{ id: string; eventDate: string }>;
  cfg: EscalaSettings;
};

/** culto (chave) → função (id) → pessoas propostas, na ordem das vagas */
export type Proposta = Record<string, Record<string, string[]>>;

/** Times que servem neste culto: os do evento (vazio = todos) entre os escolhidos. */
export const timesDoCulto = (c: CultoPlano, times: TimePlano[]) => (c.times.length ? times.filter((t) => c.times.includes(t.id)) : times);

/** Quem já está na escala salva deste culto e função (sem quem recusou). */
function existentes(e: EntradaPeriodo, c: CultoPlano, funcaoId: string): VagaRoster[] {
  if (!c.eventId) return [];
  return e.roster.filter((r) => r.event_id === c.eventId && r.position_id === funcaoId);
}

/** Estado da escala (salva + proposta): datas, vezes por mês e quem já está em cada culto. */
class Estado {
  datas: Record<string, string[]> = {};
  porMes: Record<string, Record<string, Set<string>>> = {};
  noCulto: Record<string, Set<string>> = {};
  /** cultos distintos de cada pessoa desde o primeiro mês do período (ordem do rodízio) */
  vezes: Record<string, number> = {};
  private mes0: string;

  constructor(e: EntradaPeriodo, proposta: Proposta = {}) {
    this.mes0 = (e.cultos[0]?.data ?? "").slice(0, 7);
    const dia = new Map(e.events.map((ev) => [ev.id, ev.eventDate]));
    const chaveDoEvento = new Map(e.cultos.filter((c) => c.eventId).map((c) => [c.eventId as string, c.chave]));
    for (const r of e.roster) {
      if (r.status === "no") continue;
      const d = dia.get(r.event_id);
      if (!d) continue;
      this.marcar(r.person_id, chaveDoEvento.get(r.event_id) ?? r.event_id, d);
    }
    for (const c of e.cultos) {
      for (const ids of Object.values(proposta[c.chave] ?? {})) for (const p of ids) this.marcar(p, c.chave, c.data);
    }
  }

  marcar(pessoa: string, culto: string, data: string) {
    const mes = data.slice(0, 7);
    const doMes = ((this.porMes[mes] ??= {})[pessoa] ??= new Set());
    if (!doMes.has(culto) && mes >= this.mes0) this.vezes[pessoa] = (this.vezes[pessoa] ?? 0) + 1;
    doMes.add(culto);
    (this.noCulto[culto] ??= new Set()).add(pessoa);
    const lista = (this.datas[pessoa] ??= []);
    if (!lista.includes(data)) lista.push(data);
  }

  carga(mes: string): Record<string, number> {
    return Object.fromEntries(Object.entries(this.porMes[mes] ?? {}).map(([p, s]) => [p, s.size]));
  }

  /** última data (até `data`, inclusive) em que cada pessoa do grupo serve */
  ultimaAte(data: string, pessoas: string[]): Record<string, string> {
    const out: Record<string, string> = {};
    for (const p of pessoas) {
      let melhor = "";
      for (const d of this.datas[p] ?? []) if (d <= data && d > melhor) melhor = d;
      if (melhor) out[p] = melhor;
    }
    return out;
  }
}

function candidatosDaVaga(e: EntradaPeriodo, est: Estado, c: CultoPlano, time: TimePlano, funcaoId: string, jaNoSlot: Set<string>): Candidato[] {
  const ids = new Set(time.pessoas);
  const pool = e.pessoas.filter((p) => ids.has(p.id));
  return candidatosDisponiveis(pool, { slot: c.slot, eventDate: c.data }, jaNoSlot, est.noCulto[c.chave] ?? new Set(), e.cfg, est.carga(c.data.slice(0, 7)), est.ultimaAte(c.data, time.pessoas), est.datas, est.vezes);
}

/** Proposta para o período inteiro, culto a culto em ordem de data: cada vaga
 *  aberta recebe o primeiro do rodízio que está livre e disponível. A escala
 *  já salva é mantida; só as vagas que faltam são preenchidas. */
export function gerarPeriodo(e: EntradaPeriodo): Proposta {
  const est = new Estado(e);
  const proposta: Proposta = {};
  for (const c of e.cultos) {
    for (const time of timesDoCulto(c, e.times)) {
      for (const f of time.funcoes) {
        const salvos = existentes(e, c, f.id);
        let faltam = Math.max(0, f.vagas - salvos.filter((r) => r.status !== "no").length);
        if (!faltam) continue;
        /* quem recusou esta vaga não é chamado de novo */
        const jaNoSlot = new Set(salvos.map((r) => r.person_id));
        const escolhidos: string[] = [];
        for (const cand of candidatosDaVaga(e, est, c, time, f.id, jaNoSlot)) {
          if (!faltam) break;
          if (cand.fit !== "good") continue;
          escolhidos.push(cand.person.id);
          est.marcar(cand.person.id, c.chave, c.data);
          faltam--;
        }
        if (escolhidos.length) (proposta[c.chave] ??= {})[f.id] = escolhidos;
      }
    }
  }
  return proposta;
}

/** Opções para trocar uma pessoa da proposta (ou preencher uma vaga aberta),
 *  com a mesma regra da geração e o motivo de quem não pode. */
export function opcoesDaVaga(e: EntradaPeriodo, proposta: Proposta, cultoChave: string, timeId: string, funcaoId: string, atual?: string): Candidato[] {
  const c = e.cultos.find((x) => x.chave === cultoChave);
  const time = e.times.find((t) => t.id === timeId);
  if (!c || !time) return [];
  const semAtual: Proposta = { ...proposta, [cultoChave]: { ...(proposta[cultoChave] ?? {}), [funcaoId]: (proposta[cultoChave]?.[funcaoId] ?? []).filter((p) => p !== atual) } };
  const est = new Estado(e, semAtual);
  const jaNoSlot = new Set([...existentes(e, c, funcaoId).map((r) => r.person_id), ...semAtual[cultoChave][funcaoId]]);
  return candidatosDaVaga(e, est, c, time, funcaoId, jaNoSlot);
}

/* ── avisos ─────────────────────────────────────────────────────────────── */

export type Aviso =
  | { tipo: "sem_gente"; culto: string; timeId: string; funcaoId: string; faltam: number }
  | { tipo: "acima_carga"; pessoa: string; mes: string; vezes: number }
  | { tipo: "indisponivel"; culto: string; funcaoId: string; pessoa: string }
  | { tipo: "repetido"; culto: string; pessoa: string }
  | { tipo: "sem_pessoas"; timeId: string };

export type Resumo = {
  cultos: number;
  novos: number;
  vagas: number;
  /** já estavam na escala salva */
  salvas: number;
  /** pessoas propostas agora */
  propostas: number;
  faltam: number;
  /** vezes que cada pessoa serve no período (salvo + proposto) */
  vezes: Record<string, number>;
  avisos: Aviso[];
};

/** Confere a proposta (gerada ou ajustada à mão) e diz o que precisa de atenção. */
export function avaliarPeriodo(e: EntradaPeriodo, proposta: Proposta): Resumo {
  const est = new Estado(e, proposta);
  const avisos: Aviso[] = [];
  const pessoa = new Map(e.pessoas.map((p) => [p.id, p]));
  let vagas = 0, salvas = 0, propostas = 0, faltam = 0;
  const vezes: Record<string, number> = {};
  for (const t of e.times) if (!t.pessoas.length && t.funcoes.length) avisos.push({ tipo: "sem_pessoas", timeId: t.id });
  for (const c of e.cultos) {
    const contagem: Record<string, number> = {};
    for (const time of timesDoCulto(c, e.times)) {
      for (const f of time.funcoes) {
        const ok = existentes(e, c, f.id).filter((r) => r.status !== "no").map((r) => r.person_id);
        const novos = proposta[c.chave]?.[f.id] ?? [];
        vagas += f.vagas;
        salvas += Math.min(f.vagas, ok.length);
        propostas += novos.length;
        const falta = Math.max(0, f.vagas - ok.length - novos.length);
        faltam += falta;
        if (falta) avisos.push({ tipo: "sem_gente", culto: c.chave, timeId: time.id, funcaoId: f.id, faltam: falta });
        for (const p of novos) {
          const pp = pessoa.get(p);
          if (pp && indisponivel(pp, c.slot, c.data)) avisos.push({ tipo: "indisponivel", culto: c.chave, funcaoId: f.id, pessoa: p });
        }
        for (const p of [...ok, ...novos]) contagem[p] = (contagem[p] ?? 0) + 1;
      }
    }
    for (const [p, n] of Object.entries(contagem)) {
      vezes[p] = (vezes[p] ?? 0) + 1;
      if (n > 1) avisos.push({ tipo: "repetido", culto: c.chave, pessoa: p });
    }
  }
  if (e.cfg.maxPorMes) {
    const meses = [...new Set(e.cultos.map((c) => c.data.slice(0, 7)))];
    for (const mes of meses) {
      for (const [p, n] of Object.entries(est.carga(mes))) {
        if (n > e.cfg.maxPorMes && pessoa.has(p)) avisos.push({ tipo: "acima_carga", pessoa: p, mes, vezes: n });
      }
    }
  }
  return { cultos: e.cultos.length, novos: e.cultos.filter((c) => !c.eventId).length, vagas, salvas, propostas, faltam, vezes, avisos };
}

/** Linhas para gravar como rascunho: uma por pessoa proposta. */
export function linhasDaProposta(e: EntradaPeriodo, proposta: Proposta, idDoCulto: (c: CultoPlano) => string | null): Array<{ event_id: string; position_id: string; person_id: string }> {
  const out: Array<{ event_id: string; position_id: string; person_id: string }> = [];
  for (const c of e.cultos) {
    const id = idDoCulto(c);
    if (!id) continue;
    for (const [funcaoId, ids] of Object.entries(proposta[c.chave] ?? {})) for (const p of ids) out.push({ event_id: id, position_id: funcaoId, person_id: p });
  }
  return out;
}
