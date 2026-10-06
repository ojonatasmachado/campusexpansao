/* Agenda do membro (v7 4.5): hora de chegada de quem serve e conflito de horário. */

const minutos = (h?: string | null): number | null => {
  const m = (h ?? "").match(/^(\d{1,2})[:h](\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
const hhmm = (min: number) => `${String(Math.floor(((min % 1440) + 1440) % 1440 / 60)).padStart(2, "0")}:${String(((min % 60) + 60) % 60).padStart(2, "0")}`;

/** Hora de chegada a partir do "Horário de chegada" do time (texto livre):
 *  "18:30" → "18:30"; "1h antes", "30 min antes", "1h30 antes" → conta a partir
 *  do início. Sem como calcular, null (a tela não inventa). */
export function horaDeChegada(inicio?: string | null, chegada?: string | null): string | null {
  const txt = (chegada ?? "").trim().toLowerCase();
  if (!txt) return null;
  const fixa = txt.match(/^(\d{1,2})[:h](\d{2})$/);
  if (fixa) return hhmm(Number(fixa[1]) * 60 + Number(fixa[2]));
  const ini = minutos(inicio);
  if (ini === null || !/antes/.test(txt)) return null;
  const h = txt.match(/(\d+)\s*h(?:oras?)?\s*(\d{1,2})?/);
  const m = txt.match(/(\d+)\s*min/);
  let antes = 0;
  if (h) antes += Number(h[1]) * 60 + (h[2] ? Number(h[2]) : 0);
  else if (m) antes += Number(m[1]);
  if (!antes) return null;
  return hhmm(ini - antes);
}

/** Itens com o mesmo dia e horários que se cruzam (duração padrão de 2h). */
export function conflitos<T extends { id: string; data: string; hora?: string | null; duracaoMin?: number }>(itens: T[]): Set<string> {
  const out = new Set<string>();
  const com = itens.filter((i) => minutos(i.hora) !== null);
  for (let a = 0; a < com.length; a++) {
    for (let b = a + 1; b < com.length; b++) {
      const x = com[a], y = com[b];
      if (x.data !== y.data) continue;
      const xi = minutos(x.hora)!, yi = minutos(y.hora)!;
      if (xi < yi + (y.duracaoMin ?? 120) && yi < xi + (x.duracaoMin ?? 120)) { out.add(x.id); out.add(y.id); }
    }
  }
  return out;
}
