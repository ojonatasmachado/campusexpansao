/* Cobertura por time (v7 4.16): quantas vagas cada time já preencheu num
   culto. Mesma conta da tela de Escalas: vaga preenchida = alguém escalado
   que não recusou, até o número pedido pela função. Time sem função
   cadastrada fica de fora (não tem vaga para preencher). */

type Funcao = { id: string; ministry_id?: string; need_count: number };
type Time = { id: string; name: string; positions: Funcao[] };
type Vaga = { event_id: string; position_id: string; status: string };
type Evento = { id: string; ministries: string[] };

export type CoberturaTime = { timeId: string; time: string; preenchidas: number; total: number };

export function coberturaPorTime(evento: Evento, roster: Vaga[], times: Time[], escopo?: string[] | null): CoberturaTime[] {
  const doEvento = roster.filter((r) => r.event_id === evento.id && r.status !== "no");
  return times
    .filter((t) => (!evento.ministries.length || evento.ministries.includes(t.id)) && (!escopo || escopo.includes(t.id)) && t.positions.length > 0)
    .map((t) => {
      let preenchidas = 0;
      let total = 0;
      for (const f of t.positions) {
        const pede = Math.max(1, f.need_count);
        total += pede;
        preenchidas += Math.min(pede, doEvento.filter((r) => r.position_id === f.id).length);
      }
      return { timeId: t.id, time: t.name, preenchidas, total };
    })
    /* incompleto primeiro (o que falta mais, antes), depois pelo nome */
    .sort((a, b) => {
      const fa = a.total - a.preenchidas, fb = b.total - b.preenchidas;
      if ((fa > 0) !== (fb > 0)) return fa > 0 ? -1 : 1;
      return fb - fa || a.time.localeCompare(b.time);
    });
}

export const vagasFaltando = (c: CoberturaTime[]) => c.reduce((s, t) => s + (t.total - t.preenchidas), 0);
