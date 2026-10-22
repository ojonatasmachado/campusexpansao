"use client";

/* Segmentado (prancha 1): escolha única entre poucas opções. As opções são
   Opcao (estilo "segmento") dentro dele; a pílula desliza até a opção marcada
   com a mola. Com movimento reduzido, a pílula pula direto. Por cima da classe
   .seg que já existe. */

import { useLayoutEffect, useRef, type HTMLAttributes } from "react";

const MARCADA = 'button.on, [aria-checked="true"], [aria-selected="true"]';

export function Segmentado({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  const caixa = useRef<HTMLDivElement>(null);
  const pilula = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = caixa.current;
    const p = pilula.current;
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

  return (
    <div {...rest} ref={caixa} className={className ? `seg tem-pilula ${className}` : "seg tem-pilula"}>
      <span ref={pilula} className="seg-pilula" aria-hidden="true" />
      {children}
    </div>
  );
}
