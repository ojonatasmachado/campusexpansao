/* Saúde da igreja (v7 4.11): números da base (hoje) e do período, comparados
   ao período anterior de mesmo tamanho. Cada número guarda a lista de pessoas
   que o formam, para abrir. Contas no cliente, com os dados que o painel já
   carregou. Sem percentual sobre pessoas (lei 10): só contagens. */
import { somaDias, todayISO } from "../../lib/date";

export type Periodo = { ini: string; fim: string };
export type Preset = "30" | "90" | "365" | "datas";

export function periodoDe(preset: Preset, datas?: Periodo, hoje = todayISO()): Periodo {
  if (preset === "datas" && datas?.ini && datas?.fim) return datas.ini <= datas.fim ? datas : { ini: datas.fim, fim: datas.ini };
  const dias = preset === "90" ? 90 : preset === "365" ? 365 : 30;
  return { ini: somaDias(hoje, -(dias - 1)), fim: hoje };
}

/** O período imediatamente antes, com o mesmo número de dias. */
export function anteriorDe(p: Periodo): Periodo {
  const ini = new Date(`${p.ini}T12:00:00Z`).getTime();
  const fim = new Date(`${p.fim}T12:00:00Z`).getTime();
  const dias = Math.round((fim - ini) / 86400000) + 1;
  return { ini: somaDias(p.ini, -dias), fim: somaDias(p.ini, -1) };
}

const dentro = (dia: string | null | undefined, p: Periodo) => !!dia && dia.slice(0, 10) >= p.ini && dia.slice(0, 10) <= p.fim;
const diaDoSortKey = (k: number | null | undefined) => {
  const s = String(k ?? "");
  return /^\d{8}$/.test(s) ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : "";
};

export type ItemPessoa = { tipo: "member" | "person" | "visitor" | "decision"; id: string; nome: string };
export type Numero = { id: string; rotulo: string; valor: number; anterior?: number; itens: ItemPessoa[] };

type Membro = { id: string; name: string; groupId: string | null; journey: number[] };
type Pessoa = { id: string; name: string; status: string };
type Time = { people: { personId: string }[] };
type Visitante = { id: string; name: string; visited_on: string | null; created_at: string };
type Decisao = { id: string; name: string; happened_on: string | null; created_at: string };
type Fato = { member_id: string; event_type: string; sort_key: number | null; created_at: string };
type Matricula = { member_id: string; status: string };

export type DadosSaude = {
  membros: Membro[]; pessoas: Pessoa[]; times: Time[]; visitantes: Visitante[]; decisoes: Decisao[];
  fatos: Fato[]; matriculas: Matricula[];
};

export function numerosDaBase(d: DadosSaude): Numero[] {
  const servindo = new Set(d.times.flatMap((t) => t.people.map((p) => p.personId)));
  const pessoasServindo = d.pessoas.filter((p) => servindo.has(p.id) && p.status === "ativo");
  const emGrupos = d.membros.filter((m) => !!m.groupId);
  return [
    { id: "membros", rotulo: "Membros registrados", valor: d.membros.length, itens: d.membros.map((m) => ({ tipo: "member", id: m.id, nome: m.name })) },
    { id: "servindo", rotulo: "Servindo em times", valor: pessoasServindo.length, itens: pessoasServindo.map((p) => ({ tipo: "person", id: p.id, nome: p.name })) },
    { id: "grupos", rotulo: "Em {grupos}", valor: emGrupos.length, itens: emGrupos.map((m) => ({ tipo: "member", id: m.id, nome: m.name })) },
  ];
}

export function numerosDoPeriodo(d: DadosSaude, p: Periodo): Numero[] {
  const ant = anteriorDe(p);
  const nomeMembro = new Map(d.membros.map((m) => [m.id, m.name]));
  const fatosDe = (tipos: string[], per: Periodo) => {
    const ids = new Set<string>();
    for (const f of d.fatos) if (tipos.includes(f.event_type) && dentro(diaDoSortKey(f.sort_key) || f.created_at, per)) ids.add(f.member_id);
    return [...ids].map((id) => ({ tipo: "member" as const, id, nome: nomeMembro.get(id) ?? "Membro" }));
  };
  const visit = (per: Periodo) => d.visitantes.filter((v) => dentro(v.visited_on ?? v.created_at, per));
  const decis = (per: Periodo) => d.decisoes.filter((x) => dentro(x.happened_on ?? x.created_at, per));
  const cursando = d.matriculas.filter((m) => m.status !== "concluido");
  const emCursos = [...new Set(cursando.map((m) => m.member_id))].map((id) => ({ tipo: "member" as const, id, nome: nomeMembro.get(id) ?? "Membro" }));
  const n = (id: string, rotulo: string, agora: ItemPessoa[], antes?: ItemPessoa[] | number): Numero =>
    ({ id, rotulo, valor: agora.length, anterior: Array.isArray(antes) ? antes.length : antes, itens: agora });
  return [
    n("visitantes", "Visitantes", visit(p).map((v) => ({ tipo: "visitor", id: v.id, nome: v.name })), visit(ant).length),
    n("integrados", "Integrados", fatosDe(["integracao", "grupo"], p), fatosDe(["integracao", "grupo"], ant)),
    n("decisoes", "Decisões", decis(p).map((x) => ({ tipo: "decision", id: x.id, nome: x.name })), decis(ant).length),
    n("batismos", "Batismos", fatosDe(["batismo"], p), fatosDe(["batismo"], ant)),
    /* em curso hoje: a matrícula não guarda data, então não há comparação */
    n("cursos", "Em cursos", emCursos),
    n("concluiram", "Concluíram curso", fatosDe(["curso"], p), fatosDe(["curso"], ant)),
  ];
}

/** Quantos membros já fizeram cada etapa da {Caminhada}, na ordem configurada. */
export function etapasDaCaminhada(membros: Membro[], etapas: { label: string }[]): Numero[] {
  return etapas.map((e, i) => {
    const fez = membros.filter((m) => !!m.journey?.[i]);
    return { id: `etapa-${i}`, rotulo: e.label, valor: fez.length, itens: fez.map((m) => ({ tipo: "member", id: m.id, nome: m.name })) };
  });
}

/** "+3 em relação aos 30 dias anteriores" / "igual aos 30 dias anteriores" */
export function comparacao(atual: number, anterior: number | undefined, dias: number): string | null {
  if (anterior === undefined) return null;
  const d = atual - anterior;
  const base = dias === 1 ? "ao dia anterior" : `aos ${dias} dias anteriores`;
  return d === 0 ? `igual ${base}` : `${d > 0 ? "+" : ""}${d} em relação ${base}`;
}
