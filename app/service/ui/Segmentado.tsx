"use client";

/* Segmentado (prancha 1): escolha única entre poucas opções. As opções são
   Opcao (estilo "segmento") dentro dele; a pílula desliza até a opção marcada
   com a mola. Com movimento reduzido, a pílula pula direto. Por cima da classe
   .seg que já existe. */

import type { HTMLAttributes } from "react";
import { useEffect } from "react";
import { useIndicador } from "./indicador";

const MARCADA = 'button.on, [aria-checked="true"], [aria-selected="true"]';

export function Segmentado({ className, children, rolavel, esconderEsfumadoNoFim, ...rest }: HTMLAttributes<HTMLDivElement> & { rolavel?: boolean; esconderEsfumadoNoFim?: boolean }) {
  const { caixa, indicador } = useIndicador<HTMLDivElement, HTMLSpanElement>();
  const cls = [
    "seg",
    "tem-pilula",
    rolavel ? "seg-rolavel" : "",
    className ?? "",
  ].filter(Boolean).join(" ");

  /* Em containers roláveis, offsetLeft não muda com o scroll, mas a posição
     visual sim. Este listener ajusta a pílula durante a rolagem, sem alterar
     o hook global que é usado por Abas e Segmentados não-roláveis.
     Quando esconderEsfumadoNoFim está ligado, o fade da direita some ao chegar
     no fim da rolagem, para não cobrir o texto da última aba. */
  useEffect(() => {
    if (!rolavel) return;
    const el = caixa.current;
    const p = indicador.current;
    if (!el || !p) return;
    const atualizar = () => {
      const alvo = el.querySelector<HTMLElement>(MARCADA);
      if (!alvo) return;
      p.style.transform = `translateX(${alvo.offsetLeft - el.scrollLeft}px)`;
      if (esconderEsfumadoNoFim) {
        const noFim = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
        el.classList.toggle("seg-no-fade", noFim);
      }
    };
    atualizar();
    el.addEventListener("scroll", atualizar, { passive: true });
    return () => el.removeEventListener("scroll", atualizar);
  }, [rolavel, esconderEsfumadoNoFim, caixa, indicador]);

  return (
    <div {...rest} ref={caixa} className={cls}>
      <span ref={indicador} className="seg-pilula" aria-hidden="true" />
      {children}
    </div>
  );
}
