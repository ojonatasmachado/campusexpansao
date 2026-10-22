"use client";

/* Contrato dos popovers de campo (data, hora, lista): fecha no clique fora e no Esc,
   e o Esc devolve o foco ao gatilho. O Esc é tratado na captura e marcado como
   tratado, para não fechar junto a janela ou a tela de formulário onde o campo está. */

import { useEffect, useRef } from "react";

export function usePopover(open: boolean, setOpen: (v: boolean) => void) {
  const caixa = useRef<HTMLDivElement>(null);
  const gatilho = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const fora = (e: MouseEvent) => { if (caixa.current && !caixa.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      gatilho.current?.focus();
    };
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc, true);
    return () => { document.removeEventListener("mousedown", fora); document.removeEventListener("keydown", esc, true); };
  }, [open, setOpen]);
  return { caixa, gatilho };
}
