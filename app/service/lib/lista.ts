import type { Text } from "./internacional/mensagens";

/* Lei 13 (densidade medida): nenhuma tela concatena uma lista sem limite.
   "A e B" até 2 itens; "A, B e mais N" a partir de 3. Mesmas chaves de
   tradução já usadas pelo cartão de aniversário (pt-BR.json: m1dc81ff,
   modiem), então reusar este helper não cria texto novo pra traduzir. */
export function listaResumida(itens: string[], traduzirUi: Text): string {
  if (itens.length <= 1) return itens[0] ?? "";
  if (itens.length === 2) return traduzirUi("{a} e {b}", { a: itens[0], b: itens[1] });
  return traduzirUi("{nomes} e mais {n}", { nomes: itens.slice(0, 2).join(", "), n: String(itens.length - 2) });
}
