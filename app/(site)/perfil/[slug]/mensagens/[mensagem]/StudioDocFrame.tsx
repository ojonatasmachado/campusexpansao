"use client";

import { useEffect, useState } from "react";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function StudioDocFrame({
  src,
  title,
  titulo,
  roteiro,
  draftKey,
  className,
}: {
  src: string;
  title: string;
  titulo: string;
  roteiro?: string;
  draftKey: string;
  className?: string;
}) {
  const [ready, setReady] = useState(false);

  // O editor Documentos dá prioridade ao rascunho salvo no servidor (por
  // usuário) quando existe. Esse seed local só entra em jogo antes do
  // primeiro rascunho: injeta o roteiro do mentor (ou um template em
  // branco, se ainda não houver roteiro autorado) como ponto de partida.
  useEffect(() => {
    try {
      if (!window.localStorage.getItem(draftKey)) {
        const html = roteiro && roteiro.trim()
          ? roteiro
          : `<h1 data-ph="Título do documento">${escapeHtml(titulo)}</h1><p data-ph="Comece a escrever aqui…"></p>`;
        window.localStorage.setItem(
          "cex_studio_doc_seed",
          JSON.stringify({ title: titulo, html }),
        );
      }
    } catch {
      // localStorage indisponível (modo privado etc): segue sem seed.
    }
    setReady(true);
  }, [draftKey, titulo, roteiro]);

  if (!ready) return <div className={className} />;

  return <iframe className={className} src={src} title={title} />;
}
