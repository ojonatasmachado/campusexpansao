/* Acao: a base de todo elemento clicável do Service (BIBLIOTECA.md).
   É o <button> com os padrões da casa: type="button" (só envia formulário se
   pedir type="submit"), `desativado` e `carregando` (aria-busy). Botao,
   BotaoIcone, Interruptor e Opcao são feitos dela. Use Acao direto só para
   superfícies tocáveis que ainda não têm peça própria (linha de lista, cartão,
   célula de calendário); a aparência vem da classe da tela. Nenhuma tela
   escreve <button> à mão (lei 17, conferido no CI). */

import type { ButtonHTMLAttributes, Ref } from "react";

export type AcaoProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "disabled"> & {
  desativado?: boolean;
  carregando?: boolean;
  ref?: Ref<HTMLButtonElement>;
};

export function Acao({ desativado, carregando, type = "button", ...rest }: AcaoProps) {
  return <button {...rest} type={type} disabled={desativado || carregando} aria-busy={carregando || undefined} />;
}
