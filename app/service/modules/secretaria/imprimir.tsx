"use client";

/* Impressão limpa: o que vai para o papel é montado num portal fora do app
   (<body> direto). Durante a impressão só ele aparece; o resto do app some
   com display:none, sem páginas em branco. A orientação da folha vem de um
   @page colocado só enquanto imprime. CSS em service-app.css (v7 · secretaria). */
import { useNoNavegador } from "../../lib/cliente";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type Folha = "livro" | "cartao";

export function imprimir(folha: Folha, orientacao: "portrait" | "landscape") {
  const css = document.createElement("style");
  css.textContent = `@page { size: A4 ${orientacao}; margin: 12mm; }`;
  document.head.appendChild(css);
  document.documentElement.dataset.secImprime = folha;
  const fim = () => {
    delete document.documentElement.dataset.secImprime;
    css.remove();
    window.removeEventListener("afterprint", fim);
  };
  window.addEventListener("afterprint", fim);
  window.print();
}

/** conteúdo só de papel: invisível na tela, único visível ao imprimir */
export function FolhaDeImpressao({ folha, children }: { folha: Folha; children: React.ReactNode }) {
  const noNavegador = useNoNavegador();
  return noNavegador ? createPortal(<div className="sec-papel" data-folha={folha}>{children}</div>, document.body) : null;
}
