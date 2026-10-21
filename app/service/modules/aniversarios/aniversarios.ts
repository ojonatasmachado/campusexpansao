/* Aniversariantes (jornada "Ver aniversariantes"). Só regra, sem tela: quem faz
   aniversário hoje, na semana ou no mês, e quem a pessoa logada pode ver.

   Regras de data:
   - "Hoje" é sempre o dia em São Paulo (todayISO), igual no servidor e no navegador.
   - Quem nasceu em 29 de fevereiro comemora em 28 de fevereiro nos anos que não
     são bissextos. Assim a pessoa continua em fevereiro no filtro do mês e o
     cartão aparece um dia antes, nunca depois do aniversário.
   - A idade só sai daqui quando quem pede é a gestão (`comIdade`); o líder vê o
     dia e o mês, nunca o ano. */
import { parseISODate, toISODate } from "../../lib/date";
import { telefoneParaWhatsapp } from "../../lib/telefone";

export type Aniversariante = {
  /** id da ficha: membro (congregação) ou voluntário sem ficha de membro */
  id: string;
  tipo: "member" | "person";
  nome: string;
  telefone: string;
  /** "AAAA-MM-DD", como está no cadastro */
  nascimento: string;
  /** times em que serve */
  times: string[];
  grupo: string | null;
};

export type Proximo = Aniversariante & {
  /** dia do aniversário neste ciclo, "AAAA-MM-DD" */
  dia: string;
  /** 0 = hoje, 1 = amanhã */
  emDias: number;
  /** idade que completa; só existe para a gestão */
  idade?: number;
};

const bissexto = (ano: number) => (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;

function partes(nascimento?: string | null): { ano: number; mes: number; dia: number } | null {
  const d = parseISODate(nascimento);
  if (!d) return null;
  /* data impossível ("2001-02-30") não vira outro dia: fica sem data */
  if (d.getMonth() + 1 !== Number(nascimento!.slice(5, 7)) || d.getDate() !== Number(nascimento!.slice(8, 10))) return null;
  return { ano: d.getFullYear(), mes: d.getMonth() + 1, dia: d.getDate() };
}

/** Dia do aniversário no ano pedido ("AAAA-MM-DD"); 29/02 vira 28/02 em ano comum. */
export function aniversarioNoAno(nascimento: string, ano: number): string | null {
  const p = partes(nascimento);
  if (!p) return null;
  const dia = p.mes === 2 && p.dia === 29 && !bissexto(ano) ? 28 : p.dia;
  return toISODate(new Date(ano, p.mes - 1, dia));
}

function diasEntre(de: string, ate: string): number {
  const a = parseISODate(de);
  const b = parseISODate(ate);
  if (!a || !b) return Number.NaN;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

/** Próximo aniversário a partir de hoje (inclusive). */
export function proximoAniversario(p: Aniversariante, hoje: string, comIdade: boolean): Proximo | null {
  const anoHoje = Number(hoje.slice(0, 4));
  const nasc = partes(p.nascimento);
  if (!nasc || nasc.ano > anoHoje) return null;
  let dia = aniversarioNoAno(p.nascimento, anoHoje);
  if (!dia) return null;
  if (dia < hoje) dia = aniversarioNoAno(p.nascimento, anoHoje + 1)!;
  const idade = Number(dia.slice(0, 4)) - nasc.ano;
  return { ...p, dia, emDias: diasEntre(hoje, dia), ...(comIdade && idade > 0 && idade < 130 ? { idade } : {}) };
}

/** Hoje e os próximos `dias` dias, do mais perto ao mais longe. */
export function daSemana(lista: Aniversariante[], hoje: string, comIdade: boolean, dias = 7): Proximo[] {
  return lista
    .map((p) => proximoAniversario(p, hoje, comIdade))
    .filter((p): p is Proximo => !!p && p.emDias <= dias)
    .sort((a, b) => a.emDias - b.emDias || a.nome.localeCompare(b.nome, "pt-BR"));
}

/** Quem faz aniversário no mês (1 a 12) do ano pedido, pelo dia. */
export function doMes(lista: Aniversariante[], mes: number, ano: number, hoje: string, comIdade: boolean): Proximo[] {
  return lista
    .flatMap((p) => {
      const dia = aniversarioNoAno(p.nascimento, ano);
      const nasc = partes(p.nascimento);
      if (!dia || !nasc || Number(dia.slice(5, 7)) !== mes || nasc.ano > ano) return [];
      const idade = ano - nasc.ano;
      return [{ ...p, dia, emDias: diasEntre(hoje, dia), ...(comIdade && idade > 0 && idade < 130 ? { idade } : {}) }];
    })
    .sort((a, b) => a.dia.localeCompare(b.dia) || a.nome.localeCompare(b.nome, "pt-BR"));
}

type MembroBase = { id: string; name: string; phone: string; birth: string | null; groupId: string | null; volunteerId: string | null };
type PessoaBase = { id: string; name: string; phone: string; meta?: { birthday?: string } };
type TimeBase = { id: string; people: Array<{ personId: string; isLeader: boolean }> };

/** Uma linha por pessoa com data: a ficha de membro manda; o voluntário sem
    ficha entra pela data guardada no cadastro dele. */
export function comData(membros: MembroBase[], pessoas: PessoaBase[], times: TimeBase[]): Aniversariante[] {
  const timesDe = (personId: string | null) => (personId ? times.filter((t) => t.people.some((p) => p.personId === personId)).map((t) => t.id) : []);
  const ligados = new Set(membros.map((m) => m.volunteerId).filter(Boolean));
  const doVoluntario = new Map(pessoas.map((p) => [p.id, p]));
  return [
    ...membros.flatMap((m) => {
      const nascimento = m.birth ?? (m.volunteerId ? doVoluntario.get(m.volunteerId)?.meta?.birthday : null) ?? null;
      return nascimento && partes(nascimento)
        ? [{ id: m.id, tipo: "member" as const, nome: m.name, telefone: m.phone, nascimento, times: timesDe(m.volunteerId), grupo: m.groupId }]
        : [];
    }),
    ...pessoas.flatMap((p) => {
      const nascimento = p.meta?.birthday;
      return !ligados.has(p.id) && nascimento && partes(nascimento)
        ? [{ id: p.id, tipo: "person" as const, nome: p.name, telefone: p.phone, nascimento, times: timesDe(p.id), grupo: null }]
        : [];
    }),
  ];
}

/** Escopo do líder: times que lidera e grupos que lidera. null = vê a igreja toda. */
export type Escopo = { times: string[]; grupos: string[] } | null;

export function escopoDe(personId: string | null | undefined, veTudo: boolean, times: TimeBase[], grupos: Array<{ id: string; leader_person_id: string | null }>): Escopo {
  if (veTudo) return null;
  if (!personId) return { times: [], grupos: [] };
  return {
    times: times.filter((t) => t.people.some((p) => p.personId === personId && p.isLeader)).map((t) => t.id),
    grupos: grupos.filter((g) => g.leader_person_id === personId).map((g) => g.id),
  };
}

export function noEscopo<T extends Aniversariante>(lista: T[], escopo: Escopo): T[] {
  if (!escopo) return lista;
  return lista.filter((p) => p.times.some((t) => escopo.times.includes(t)) || (!!p.grupo && escopo.grupos.includes(p.grupo)));
}

/** Primeiro nome, para a mensagem. */
export const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] ?? nome;

export const MENSAGEM_PADRAO = "Feliz aniversário, {nome}! Que Deus abençoe o seu novo ano de vida. Estamos felizes por ter você com a gente.";

export const mensagemPara = (modelo: string, nome: string) => modelo.replace(/\{nome\}/g, primeiroNome(nome));

/** Link estrutural: não confirma se a pessoa possui conta no WhatsApp. */
export function linkWhatsapp(telefone: string, texto: string): string | null {
  const d = telefoneParaWhatsapp(telefone);
  return d ? `https://wa.me/${d}?text=${encodeURIComponent(texto)}` : null;
}

const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/** "Hoje", "Amanhã", "Sábado, 24/10". */
export function quandoE(p: Pick<Proximo, "dia" | "emDias">): string {
  if (p.emDias === 0) return "Hoje";
  if (p.emDias === 1) return "Amanhã";
  const d = parseISODate(p.dia);
  if (!d) return "";
  const dm = `${p.dia.slice(8, 10)}/${p.dia.slice(5, 7)}`;
  const nome = DIAS[d.getDay()];
  return `${nome[0].toUpperCase()}${nome.slice(1)}, ${dm}`;
}

export const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
