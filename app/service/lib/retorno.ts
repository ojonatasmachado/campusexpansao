"use client";

import { createContext, useCallback, useContext, useState } from "react";

/* M3: o que a pessoa estava fazendo volta depois de sair do app ou recarregar.
 * Rascunho e rolagem ficam no sessionStorage (some ao fechar a aba e na saída da
 * conta): pedido de oração e mensagem são sensíveis e não devem ficar no aparelho.
 * A URL continua sem texto; ela só leva IDs (member-navigation). */
const PREFIXO = "cex:retorno:";

function ler<T>(chave: string | null, inicial: T): T {
  if (!chave || typeof window === "undefined") return inicial;
  try {
    const bruto = sessionStorage.getItem(PREFIXO + chave);
    return bruto === null ? inicial : (JSON.parse(bruto) as T);
  } catch {
    return inicial;
  }
}

function gravar<T>(chave: string | null, valor: T, inicial: T) {
  if (!chave) return;
  try {
    const texto = JSON.stringify(valor);
    if (texto === JSON.stringify(inicial)) sessionStorage.removeItem(PREFIXO + chave);
    else sessionStorage.setItem(PREFIXO + chave, texto);
  } catch { /* sem armazenamento: o rascunho vive só na tela */ }
}

/** Ligado só no app de verdade (MobileApp mode="self"); a pré-visualização do líder não grava nada. */
export const RetornoContext = createContext(false);

/** Estado de formulário que sobrevive a recarga e retorno. `chave` null desliga.
 * Fora do RetornoContext ligado, também desliga. Trocar a chave carrega o rascunho dela. */
export function useRascunho<T>(chaveBruta: string | null, inicial: T): [T, (v: T | ((anterior: T) => T)) => void, () => void] {
  const ligado = useContext(RetornoContext);
  const chave = ligado ? chaveBruta : null;
  const [estado, setEstado] = useState(() => ({ chave, valor: ler(chave, inicial) }));
  let atual = estado;
  if (estado.chave !== chave) {
    atual = { chave, valor: ler(chave, inicial) };
    setEstado(atual);
  }
  const definir = useCallback((v: T | ((anterior: T) => T)) => {
    setEstado((e) => {
      const valor = typeof v === "function" ? (v as (anterior: T) => T)(e.valor) : v;
      gravar(e.chave, valor, inicial);
      return { chave: e.chave, valor };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `inicial` é o valor vazio do formulário, fixo por campo
  }, []);
  const limpar = useCallback(() => {
    setEstado((e) => {
      gravar(e.chave, inicial, inicial);
      return { chave: e.chave, valor: inicial };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- idem
  }, []);
  return [atual.valor, definir, limpar];
}

export function guardarRolagem(chave: string, topo: number) {
  gravar(`rolagem:${chave}`, Math.max(0, Math.round(topo)), 0);
}

export function lerRolagem(chave: string): number {
  const v = ler<number>(`rolagem:${chave}`, 0);
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/** Na saída da conta: nada do que a pessoa digitou fica para quem usar o aparelho depois. */
export function limparRetorno() {
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i);
      if (k?.startsWith(PREFIXO)) sessionStorage.removeItem(k);
    }
  } catch { /* sem armazenamento */ }
}
