/* Lista de cuidado (v7 4.17). Entra quem já teve presença registrada e está
   há N semanas (padrão 3) sem nenhuma. Ausência justificada tira da lista
   até a data marcada. Quem cuida: líder do grupo da pessoa, senão líder do
   time, senão a pastoral (gestão e pastores veem todos). */
import { parseISODate, todayISO } from "../../lib/date";

export type MarcaCuidado = { person_id: string; kind: "contato" | "justificada"; via: string | null; until: string | null; created_at: string };
export type Ausente = {
  personId: string; memberId: string | null; nome: string; ultima: string; semanas: number;
  quemCuida: "grupo" | "time" | "pastoral"; responsavelId: string | null;
  contato?: { via: string; dia: string };
};

type Pessoa = { id: string; name: string; status?: string };
type Membro = { id: string; volunteerId: string | null; groupId: string | null };
type Grupo = { id: string; leader_person_id: string | null };
type Time = { people: { personId: string; isLeader: boolean }[] };

const semanasEntre = (dia: string, hoje: string) => {
  const a = parseISODate(dia), b = parseISODate(hoje);
  return a && b ? Math.floor((b.getTime() - a.getTime()) / (7 * 86400000)) : 0;
};

export function listaDeCuidado(d: {
  pessoas: Pessoa[]; membros: Membro[]; grupos: Grupo[]; times: Time[];
  /** presença: pessoa e dia ("AAAA-MM-DD") */
  presencas: { personId: string; dia: string }[];
  marcas: MarcaCuidado[]; semanas: number; hoje?: string;
}): Ausente[] {
  const hoje = d.hoje ?? todayISO();
  const ultima = new Map<string, string>();
  for (const p of d.presencas) if (p.dia && p.dia <= hoje && (!ultima.has(p.personId) || p.dia > ultima.get(p.personId)!)) ultima.set(p.personId, p.dia);
  const out: Ausente[] = [];
  for (const pessoa of d.pessoas) {
    const u = ultima.get(pessoa.id);
    if (!u || pessoa.status === "pausa" || pessoa.status === "ferias") continue;
    const semanas = semanasEntre(u, hoje);
    if (semanas < d.semanas) continue;
    const minhas = d.marcas.filter((m) => m.person_id === pessoa.id).sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (minhas.some((m) => m.kind === "justificada" && (m.until ?? "") >= hoje)) continue;
    const membro = d.membros.find((m) => m.volunteerId === pessoa.id) ?? null;
    const lgrupo = membro?.groupId ? d.grupos.find((g) => g.id === membro.groupId)?.leader_person_id ?? null : null;
    const ltime = d.times.find((t) => t.people.some((p) => p.personId === pessoa.id))?.people.find((p) => p.isLeader && p.personId !== pessoa.id)?.personId ?? null;
    const contato = minhas.find((m) => m.kind === "contato" && m.created_at.slice(0, 10) >= u);
    out.push({
      personId: pessoa.id, memberId: membro?.id ?? null, nome: pessoa.name, ultima: u, semanas,
      quemCuida: lgrupo && lgrupo !== pessoa.id ? "grupo" : ltime ? "time" : "pastoral",
      responsavelId: lgrupo && lgrupo !== pessoa.id ? lgrupo : ltime,
      contato: contato ? { via: contato.via ?? "", dia: contato.created_at.slice(0, 10) } : undefined,
    });
  }
  /* sem contato primeiro; depois quem está há mais tempo */
  return out.sort((a, b) => Number(!!a.contato) - Number(!!b.contato) || b.semanas - a.semanas || a.nome.localeCompare(b.nome));
}

/** Gestão e pastores veem todos; líder vê os que estão com ele. */
export function daMinhaLista(lista: Ausente[], eu: string | null, gestao: boolean): Ausente[] {
  return gestao ? lista : lista.filter((a) => !!eu && a.responsavelId === eu);
}

export const VIAS: { v: "ligacao" | "mensagem" | "visita"; l: string }[] = [
  { v: "ligacao", l: "Ligação" },
  { v: "mensagem", l: "Mensagem" },
  { v: "visita", l: "Visita" },
];
