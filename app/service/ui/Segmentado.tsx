"use client";

/* Segmentado (prancha 1): escolha única entre poucas opções. As opções são
   Opcao (estilo "segmento") dentro dele; a pílula desliza até a opção marcada
   com a mola. Com movimento reduzido, a pílula pula direto. Por cima da classe
   .seg que já existe. */

import type { HTMLAttributes } from "react";
import { useIndicador } from "./indicador";

export function Segmentado({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  const { caixa, indicador } = useIndicador<HTMLDivElement, HTMLSpanElement>();
  return (
    <div {...rest} ref={caixa} className={className ? `seg tem-pilula ${className}` : "seg tem-pilula"}>
      <span ref={indicador} className="seg-pilula" aria-hidden="true" />
      {children}
    </div>
  );
}
