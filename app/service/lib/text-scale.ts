"use client";

import { useSyncExternalStore } from "react";

/* Tamanho do texto do app do membro (S6): Padrão 1, Grande 1,15, Muito
   grande 1,3. Fica guardado no aparelho. O CSS aplica a escala no conteúdo
   do app (service-v6.css, --m-scale); a barra de abas cresce no máximo 1,15. */
export const TEXT_SCALES = [
  { value: 1, label: "Padrão" },
  { value: 1.15, label: "Grande" },
  { value: 1.3, label: "Muito grande" },
] as const;

const KEY = "cex_text_scale";
const EVENT = "cex-text-scale";

function read(): number {
  try {
    const v = Number(localStorage.getItem(KEY));
    return TEXT_SCALES.some((s) => s.value === v) ? v : 1;
  } catch {
    return 1;
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function useTextScale(): [number, (v: number) => void] {
  const scale = useSyncExternalStore(subscribe, read, () => 1);
  const set = (v: number) => {
    try { localStorage.setItem(KEY, String(v)); } catch { /* sem armazenamento: vale só agora */ }
    window.dispatchEvent(new Event(EVENT));
  };
  return [scale, set];
}
