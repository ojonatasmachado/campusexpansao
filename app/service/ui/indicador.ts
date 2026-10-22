"use client";

/* Indicador que desliza até a opção marcada (pílula do Segmentado, sublinhado das
   Abas). Mede a opção marcada e move o indicador com transform e largura; a curva
   e a duração ficam no CSS de cada peça. Na primeira medida (e com movimento
   reduzido, pelo CSS) ele aparece direto no lugar, sem deslizar. */

import { useLayoutEffect, useRef } from "react";

const MARCADA = 'button.on, [aria-checked="true"], [aria-selected="true"]';

export function useIndicador<C extends HTMLElement, I extends HTMLElement>() {
  const caixa = useRef<C>(null);
  const indicador = useRef<I>(null);

  useLayoutEffect(() => {
    const el = caixa.current;
    const p = indicador.current;
    if (!el || !p) return;
    let primeira = true;
    const posicionar = () => {
      const alvo = el.querySelector<HTMLElement>(MARCADA);
      if (!alvo) { p.style.opacity = "0"; return; }
      if (primeira) p.style.transition = "none";
      p.style.opacity = "1";
      p.style.width = `${alvo.offsetWidth}px`;
      p.style.transform = `translateX(${alvo.offsetLeft}px)`;
      if (primeira) { void p.offsetWidth; p.style.transition = ""; primeira = false; }
    };
    posicionar();
    const mo = new MutationObserver(posicionar);
    mo.observe(el, { subtree: true, attributes: true, attributeFilter: ["class", "aria-checked", "aria-selected"], childList: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(posicionar) : null;
    ro?.observe(el);
    return () => { mo.disconnect(); ro?.disconnect(); };
  }, []);

  return { caixa, indicador };
}
