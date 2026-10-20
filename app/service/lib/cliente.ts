"use client";

/* Valores que só existem no navegador, lidos sem efeito: o servidor desenha o
   valor neutro e o navegador o real, sem diferença na hidratação
   (useSyncExternalStore com o valor do servidor). */
import { useSyncExternalStore } from "react";

const semAssinatura = () => () => {};

/** endereço do site no navegador ("https://..."); vazio no servidor */
export function useOrigem(): string {
  return useSyncExternalStore(semAssinatura, () => window.location.origin, () => "");
}

/** true depois de chegar ao navegador (para portais em document.body, por exemplo) */
export function useNoNavegador(): boolean {
  return useSyncExternalStore(semAssinatura, () => true, () => false);
}
