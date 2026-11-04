"use client";

/* Segmentado (prancha 1): escolha única entre poucas opções. As opções são
   Opcao (estilo "segmento") dentro dele; a pílula desliza até a opção marcada
   com a mola. Com movimento reduzido, a pílula pula direto. Por cima da classe
   .seg que já existe. */

import type { HTMLAttributes } from "react";
import { useIndicador } from "./indicador";

export function Segmentado({ className, children, rolavel, ...rest }: HTMLAttributes<HTMLDivElement> & { rolavel?: boolean }) {
  const { caixa, indicador } = useIndicador<HTMLDivElement, HTMLSpanElement>();
  const cls = [
    "seg",
    "tem-pilula",
    rolavel ? "seg-rolavel" : "",
    className ?? "",
  ].filter(Boolean).join(" ");
  return (
    <div {...rest} ref={caixa} className={cls}>
      <span ref={indicador} className="seg-pilula" aria-hidden="true" />
      {children}
    </div>
  );
}
