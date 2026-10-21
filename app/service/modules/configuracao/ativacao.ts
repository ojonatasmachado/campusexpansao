import { horaAgoraBR, isCivilDate, somaDias, todayISO } from "../../lib/date";

export type EncontroInicial = { nome: string; data: string; hora: string; local: string };
export type EncontroPreparado = EncontroInicial & { id: string };
export type RascunhoEncontro = EncontroInicial & { repetir: boolean; ate: string };

/** A série parte da data escolhida. Nunca decide ano ou horário pela pessoa. */
export function planejarEncontros(d: RascunhoEncontro, hoje = todayISO(), agora = horaAgoraBR()): { encontros: EncontroInicial[]; erro?: string } {
  const vazio: EncontroInicial[] = [];
  if (!d.nome.trim()) return { encontros: vazio, erro: "Informe o nome do encontro." };
  if (!isCivilDate(d.data) || d.data < hoje) return { encontros: vazio, erro: "Escolha uma data válida a partir de hoje." };
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.hora)) return { encontros: vazio, erro: "Informe o horário de início." };
  if (d.data === hoje && d.hora < agora) return { encontros: vazio, erro: "Escolha um horário que ainda não passou." };
  if (!d.local.trim()) return { encontros: vazio, erro: "Informe onde as pessoas vão se encontrar." };
  if (d.repetir && (!isCivilDate(d.ate) || d.ate <= d.data)) return { encontros: vazio, erro: "A data final da repetição precisa ser posterior ao primeiro encontro." };
  const encontros: EncontroInicial[] = [];
  for (let data = d.data; data <= (d.repetir ? d.ate : d.data); data = somaDias(data, 7)) {
    if (encontros.length === 60) return { encontros: vazio, erro: "Escolha um período com até 60 encontros. Você pode preparar mais depois." };
    encontros.push({ nome: d.nome.trim(), data, hora: d.hora, local: d.local.trim() });
  }
  return { encontros };
}

export function encontroUtil(e: EncontroInicial, hoje = todayISO(), agora = horaAgoraBR()): boolean {
  return !planejarEncontros({ ...e, repetir: false, ate: e.data }, hoje, agora).erro;
}
