"use client";

/* Arrastar para fechar (folha, gaveta e janela no celular). Receita "drag to dismiss"
   da skill animate: segue o dedo 1:1 por transform direto no elemento, fecha num
   gesto rápido (velocidade > 0,11 px/ms) ou depois de 30% do tamanho, resiste ao
   ser puxado para o lado contrário, ignora o segundo dedo e sai pela mesma borda
   por onde entrou. Com movimento reduzido, fecha sem deslizar. */

import { useRef } from "react";
import type { PointerEvent } from "react";
import { movimentoReduzido } from "./movimento";

export type ArrastarDirecao = "baixo" | "direita";

export function useArrastarParaFechar(direcao: ArrastarDirecao, aoFechar: () => void) {
  const alvo = useRef<HTMLDivElement>(null);
  const arraste = useRef<{ id: number; p0: number; t0: number; d: number } | null>(null);
  const eixo = direcao === "baixo" ? "Y" : "X";
  const ponto = (e: PointerEvent) => (direcao === "baixo" ? e.clientY : e.clientX);

  const fechando = useRef(false);
  const soltarPara = (destino: "fechar" | "voltar") => {
    const el = alvo.current;
    if (!el) return;
    if (destino === "fechar") {
      if (fechando.current) return;
      fechando.current = true;
      if (movimentoReduzido()) { fechando.current = false; aoFechar(); return; }
    }
    el.style.transition = destino === "fechar" ? "transform .2s var(--ease-out)" : "transform .3s var(--ease-drawer)";
    el.style.transform = destino === "fechar" ? `translate${eixo}(100%)` : "";
    if (destino === "fechar") {
      window.setTimeout(() => {
        fechando.current = false;
        aoFechar();
        /* se a tela não fechou (ex.: segurou para salvar), a superfície volta ao lugar */
        window.setTimeout(() => { if (el.isConnected) { el.style.transition = "transform .3s var(--ease-drawer)"; el.style.transform = ""; } }, 60);
      }, 200);
    }
  };

  /* espalhar na zona de pegar (alça, cabeçalho) */
  const zona = {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (arraste.current || e.button !== 0) return;
      arraste.current = { id: e.pointerId, p0: ponto(e), t0: Date.now(), d: 0 };
      e.currentTarget.setPointerCapture(e.pointerId);
      if (alvo.current) alvo.current.style.transition = "none";
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const a = arraste.current;
      if (!a || a.id !== e.pointerId || !alvo.current) return;
      const d = ponto(e) - a.p0;
      a.d = d;
      /* para o lado contrário: resistência crescente em vez de parede */
      const v = d >= 0 ? d : -(Math.abs(d) * 40) / (40 + Math.abs(d));
      alvo.current.style.transform = `translate${eixo}(${v}px)`;
    },
    onPointerUp: (e: PointerEvent<HTMLElement>) => {
      const a = arraste.current;
      if (!a || a.id !== e.pointerId) return;
      arraste.current = null;
      const tamanho = (direcao === "baixo" ? alvo.current?.offsetHeight : alvo.current?.offsetWidth) ?? 1;
      const velocidade = a.d / Math.max(1, Date.now() - a.t0);
      /* toque sem arrastar: deixa o clique seguir */
      if (Math.abs(a.d) < 4) { if (alvo.current) alvo.current.style.transform = ""; return; }
      soltarPara(a.d > 0 && (a.d > tamanho * 0.3 || velocidade > 0.11) ? "fechar" : "voltar");
    },
    onPointerCancel: (e: PointerEvent<HTMLElement>) => {
      if (arraste.current?.id === e.pointerId) { arraste.current = null; soltarPara("voltar"); }
    },
  };

  return { alvo, zona };
}
