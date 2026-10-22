"use client";

/* Contagem (prancha 1, Movimento): o número sobe do zero (ou do valor anterior) em 1,2 s,
   desacelerando no fim, com algarismos tabulares para não pular. Aceita número
   ou texto que começa com número ("39%", "1.234"). Com movimento reduzido, ou
   quando o valor não é numérico, mostra direto o valor final. Leitor de tela
   ouve só o valor final. */

import { useLayoutEffect, useRef, useState } from "react";
import { movimentoReduzido } from "./movimento";

const DURACAO = 1200;

function partes(valor: number | string) {
  if (typeof valor === "number") return { n: valor, antes: "", depois: "", casas: 0, numero: true };
  const m = /^(\D*?)(\d[\d.]*(?:,\d+)?)(.*)$/.exec(valor);
  if (!m) return { n: 0, antes: "", depois: "", casas: 0, numero: false };
  const casas = m[2].includes(",") ? m[2].split(",")[1].length : 0;
  return { n: Number(m[2].replace(/\./g, "").replace(",", ".")), antes: m[1], depois: m[3], casas, numero: true };
}

export function Contagem({ valor, className }: { valor: number | string; className?: string }) {
  const p = partes(valor);
  const final = typeof valor === "number" ? valor.toLocaleString("pt-BR") : valor;
  /* começa do zero já no servidor: sem mostrar o valor final e depois voltar a 0 */
  const [atual, setAtual] = useState<number | null>(() => (p.numero && p.n !== 0 ? 0 : null));
  const de = useRef(0);

  useLayoutEffect(() => {
    let raf = 0;
    /* sem animar: mostra o final no próximo quadro (setState fora do corpo do efeito) */
    const mostrarFinal = () => { de.current = p.n; raf = requestAnimationFrame(() => setAtual(null)); return () => cancelAnimationFrame(raf); };
    if (!p.numero || movimentoReduzido()) return mostrarFinal();
    const inicio = de.current;
    if (inicio === p.n) return mostrarFinal();
    const t0 = performance.now();
    const passo = (t: number) => {
      const k = Math.min(1, Math.max(0, (t - t0) / DURACAO));
      const e = 1 - Math.pow(1 - k, 3);
      const v = inicio + (p.n - inicio) * e;
      de.current = v;
      setAtual(k < 1 ? v : null);
      if (k < 1) raf = requestAnimationFrame(passo);
      else de.current = p.n;
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [p.n, p.numero]);

  const texto = atual === null
    ? final
    : `${p.antes}${atual.toLocaleString("pt-BR", { minimumFractionDigits: p.casas, maximumFractionDigits: p.casas })}${p.depois}`;
  return (
    <span className={className ? `num ${className}` : "num"}>
      <span aria-hidden="true">{texto}</span>
      <span className="sr-only">{final}</span>
    </span>
  );
}
