/* Fila do Início do membro (lei 5): a casca recebe as entradas dos módulos,
   tira as de módulo desligado, ordena por prioridade (maior primeiro) e prazo
   (mais perto primeiro; sem prazo vai depois) e mostra até FILA_DOBRA na
   primeira dobra. Só a primeira entrada recebe botão cheio. */
import type { TipoCartao } from "./define";

export type EntradaFila<T> = {
  id: string;
  /** id do módulo dono (some se o módulo estiver desligado na igreja) */
  modulo: string;
  tipo: TipoCartao;
  /** 0 a 100 */
  prioridade: number;
  /** "AAAA-MM-DD" ou ISO completo */
  prazo?: string | null;
  conteudo: T;
};

export const FILA_DOBRA = 3;

export function ordenarFila<T>(entradas: EntradaFila<T>[], ligados?: Set<string>): EntradaFila<T>[] {
  return entradas
    .filter((e) => !ligados || ligados.has(e.modulo))
    .map((e, i) => ({ e, i }))
    .sort((a, b) => {
      if (a.e.prioridade !== b.e.prioridade) return b.e.prioridade - a.e.prioridade;
      const pa = a.e.prazo ?? "";
      const pb = b.e.prazo ?? "";
      if (pa !== pb) return !pa ? 1 : !pb ? -1 : pa.localeCompare(pb);
      return a.i - b.i;
    })
    .map((x) => x.e);
}
