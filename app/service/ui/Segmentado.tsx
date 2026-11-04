"use client";

/* Segmentado (prancha 1): escolha única entre poucas opções. As opções são
   Opcao (estilo "segmento") dentro dele; a pílula desliza até a opção marcada
   com a mola. Com movimento reduzido, a pílula pula direto. Por cima da classe
   .seg que já existe. */

import type { HTMLAttributes } from "react";
import { useEffect, useState } from "react";
import { useIndicador } from "./indicador";

export function Segmentado({ className, children, rolavel, esconderEsfumadoNoFim, ...rest }: HTMLAttributes<HTMLDivElement> & { rolavel?: boolean; esconderEsfumadoNoFim?: boolean }) {
  const { caixa, indicador } = useIndicador<HTMLDivElement, HTMLSpanElement>();
  const [noFim, setNoFim] = useState(false);

  /* rolavel: as opções rolam para o lado e a ponta direita ganha um esfumado.
     A pílula fica dentro da área que rola, então acompanha a rolagem sozinha.
     esconderEsfumadoNoFim: o esfumado some quando não há mais nada para rolar,
     para não cobrir o texto da última opção. */
  useEffect(() => {
    const el = caixa.current;
    if (!rolavel || !esconderEsfumadoNoFim || !el) return;
    /* A folga interna da direita conta como fim: a última opção já está inteira. */
    const medir = () => setNoFim(el.scrollLeft + el.clientWidth >= el.scrollWidth - parseFloat(getComputedStyle(el).paddingRight) - 1);
    el.addEventListener("scroll", medir, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(medir) : null;
    ro?.observe(el);
    return () => { el.removeEventListener("scroll", medir); ro?.disconnect(); };
  }, [rolavel, esconderEsfumadoNoFim, caixa]);

  const cls = [
    "seg",
    "tem-pilula",
    rolavel ? "seg-rolavel" : "",
    rolavel && esconderEsfumadoNoFim && noFim ? "seg-no-fade" : "",
    className ?? "",
  ].filter(Boolean).join(" ");

  return (
    <div {...rest} ref={caixa} className={cls}>
      <span ref={indicador} className="seg-pilula" aria-hidden="true" />
      {children}
    </div>
  );
}
