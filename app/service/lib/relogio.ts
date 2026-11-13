import { FUSO_PADRAO, normalizarFuso } from "./fuso";
import * as datas from "./date";
import * as silencio from "./silencio";
import type { Text } from "./internacional/mensagens";

/** Relógio explícito por igreja, sem estado compartilhado entre requisições. */
export function relogioDoFuso(value: unknown = FUSO_PADRAO) {
  const fuso = normalizarFuso(value);
  return {
    fuso,
    emSilencio: (instante = new Date()) => silencio.emSilencio(instante, fuso),
    foraDoSilencio: (instante: Date) => silencio.foraDoSilencio(instante, fuso),
    quandoLembra: (instante: Date, agora = new Date(), t?: Text) => silencio.quandoLembra(instante, agora, fuso, t),
    todayISO: () => datas.todayISO(fuso),
    horaAgoraBR: () => datas.horaAgoraBR(fuso),
    saudacao: (t?: Text) => datas.saudacao(fuso, undefined, t),
    aindaVaiAcontecer: (dia?: string | null, hora?: string | null, fusoEvento?: string) => datas.aindaVaiAcontecer(dia, hora, fusoEvento ?? fuso),
    quandoPublicado: (instante?: string | null) => datas.quandoPublicado(instante, fuso),
    dataPublicacao: (instante?: string | null) => datas.dataPublicacao(instante, fuso),
    quandoMensagem: (instante?: string | null) => datas.quandoMensagem(instante, fuso),
  };
}
