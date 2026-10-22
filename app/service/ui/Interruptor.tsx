/* Interruptor (liga/desliga) do Service (BIBLIOTECA.md, prancha 6).
   Peça única por cima das classes que já existem em service-app.css:
   painel .sw, app do membro .m6-tg e a matriz de acesso .m-toggle (compacto).
   Sempre role="switch" com aria-checked; o nome falado vem de `rotulo`
   (aria-label) ou de `rotuloId` (aria-labelledby, quando o texto já está na tela).
   O estado ligado usa a cor da igreja (exceção da lei 8). */

import type { ButtonHTMLAttributes, Ref } from "react";
import { Acao } from "./Acao";

/* toque = app do membro; lista = painel; compacto = matriz de acesso */
export type InterruptorTamanho = "toque" | "lista" | "compacto";

const CLASSE: Record<InterruptorTamanho, string> = { toque: "m6-tg", lista: "sw", compacto: "m-toggle" };

type Nome = { rotulo: string; rotuloId?: never } | { rotuloId: string; rotulo?: never };

export type InterruptorProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "disabled" | "children" | "role" | "aria-checked" | "aria-label" | "aria-labelledby"> &
  Nome & {
    ligado: boolean;
    tamanho?: InterruptorTamanho;
    desativado?: boolean;
    ref?: Ref<HTMLButtonElement>;
  };

export function Interruptor({ ligado, tamanho = "lista", desativado, rotulo, rotuloId, className, ...rest }: InterruptorProps) {
  const cls = `${CLASSE[tamanho]}${ligado ? " on" : ""}`;
  return (
    <Acao
      {...rest}
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      aria-labelledby={rotuloId}
      className={className ? `${cls} ${className}` : cls}
      desativado={desativado}
    />
  );
}
