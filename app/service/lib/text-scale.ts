"use client";

import { useSyncExternalStore } from "react";
import { createServiceBrowserClient } from "./supabase-browser";

/* Tamanho do texto do app do membro (v7 4.9, manifesto seção 7). Sete posições,
   como em Ajustes do iPhone: corpo de 14, 15, 16, 17, 19, 21 e 23px, padrão na
   quarta. Guarda a posição (0 a 6), não o fator. O fator (corpo / 17) vai em
   --m-scale e o CSS aplica com zoom na coluna do conteúdo (service-v6.css);
   a barra de abas fica de fora e o rótulo dela vai até 16px; nada fica abaixo
   de 13px.
   Onde fica: no perfil (service.members.text_size, 0057) com cópia no aparelho.
   Valor inicial: o do perfil; sem perfil, a cópia do aparelho; sem cópia, o
   tamanho antigo (1,15 → 19px, 1,3 → 23px); sem nada, o tamanho do sistema
   (Safari: fonte -apple-system-body) na posição mais próxima; senão a padrão. */

export const CORPOS = [14, 15, 16, 17, 19, 21, 23] as const;
export const POSICAO_PADRAO = 3;
export const NOMES_POSICAO = ["Muito pequeno", "Pequeno", "Um pouco menor", "Padrão", "Um pouco maior", "Grande", "Muito grande"] as const;

export const fatorDa = (pos: number) => CORPOS[clamp(pos)] / 17;
export const textoDaPosicao = (pos: number) => `${NOMES_POSICAO[clamp(pos)]}, ${clamp(pos) + 1} de ${CORPOS.length}`;

function clamp(pos: number) {
  return Math.min(CORPOS.length - 1, Math.max(0, Math.round(Number.isFinite(pos) ? pos : POSICAO_PADRAO)));
}

const KEY = "cex_text_size"; // posição 0..6
const KEY_ANTIGA = "cex_text_scale"; // fator 1 / 1,15 / 1,3 (até a 4.8)
const EVENT = "cex-text-scale";

/** Posição mais próxima de um corpo em px (14 a 23). */
export function posicaoMaisProxima(px: number): number {
  let melhor = POSICAO_PADRAO;
  CORPOS.forEach((c, i) => { if (Math.abs(c - px) < Math.abs(CORPOS[melhor] - px)) melhor = i; });
  return melhor;
}

function lerLocal(): number | null {
  try {
    const v = localStorage.getItem(KEY);
    if (v !== null && /^[0-6]$/.test(v)) return Number(v);
  } catch { /* sem armazenamento */ }
  return null;
}

function lerAntiga(): number | null {
  try {
    const v = Number(localStorage.getItem(KEY_ANTIGA));
    if (v === 1.15) return 4; // 19px
    if (v === 1.3) return 6; // 23px
    if (v === 1) return POSICAO_PADRAO;
  } catch { /* sem armazenamento */ }
  return null;
}

let sistemaCache: number | null | undefined;
function lerSistema(): number | null {
  if (sistemaCache !== undefined) return sistemaCache;
  sistemaCache = null;
  try {
    if (typeof CSS !== "undefined" && CSS.supports("font", "-apple-system-body")) {
      const el = document.createElement("span");
      el.style.font = "-apple-system-body";
      el.style.position = "absolute";
      el.style.visibility = "hidden";
      document.body.appendChild(el);
      const px = parseFloat(getComputedStyle(el).fontSize);
      el.remove();
      if (px > 0) sistemaCache = posicaoMaisProxima(Math.min(23, Math.max(14, px)));
    }
  } catch { /* sem leitura do sistema */ }
  return sistemaCache;
}

function read(): number {
  return lerLocal() ?? lerAntiga() ?? lerSistema() ?? POSICAO_PADRAO;
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function gravarLocal(pos: number) {
  try {
    localStorage.setItem(KEY, String(pos));
    localStorage.removeItem(KEY_ANTIGA);
  } catch { /* sem armazenamento: vale só agora */ }
  window.dispatchEvent(new Event(EVENT));
}

/* o trilho muda várias vezes num arraste: grava no perfil só a última */
let timer: ReturnType<typeof setTimeout> | null = null;
function gravarPerfil(pos: number) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    void createServiceBrowserClient().schema("service").rpc("set_my_text_size", { p_size: pos }).then(() => undefined, () => undefined);
  }, 600);
}

/** Posição do tamanho do texto (0 a 6) e o que muda ela (aparelho + perfil). */
export function useTextSize(): [number, (pos: number) => void] {
  const pos = useSyncExternalStore(subscribe, read, () => POSICAO_PADRAO);
  const set = (p: number) => {
    const v = clamp(p);
    gravarLocal(v);
    gravarPerfil(v);
  };
  return [pos, set];
}

/** Fator para --m-scale (corpo / 17). */
export function useTextScale(): number {
  const [pos] = useTextSize();
  return fatorDa(pos);
}

/** Acerta o aparelho com o perfil ao abrir o app. Perfil vazio e escolha
    antiga no aparelho (1,15 ou 1,3): sobe a escolha para o perfil. */
export function sincronizarComPerfil(doPerfil: number | null | undefined) {
  if (typeof window === "undefined") return;
  if (doPerfil !== null && doPerfil !== undefined && /^[0-6]$/.test(String(doPerfil))) {
    if (lerLocal() !== doPerfil) gravarLocal(doPerfil);
    return;
  }
  if (lerLocal() === null) {
    const antiga = lerAntiga();
    if (antiga !== null) {
      gravarLocal(antiga);
      gravarPerfil(antiga);
    }
  }
}
