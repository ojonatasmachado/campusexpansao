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
  draftKey,
  className,
}: {
  src: string;
  title: string;
  titulo: string;
  draftKey: string;
  className?: string;
}) {
  const [ready, setReady] = useState(false);

  // O editor Documentos restaura o rascunho salvo em `draftKey` ao carregar.
  // Só semeamos o título quando ainda não existe rascunho pra essa mensagem,
  // pra não sobrescrever o que a pessoa já escreveu ao reabrir a página.
  useEffect(() => {
    try {
      if (!window.localStorage.getItem(draftKey)) {
        window.localStorage.setItem(
          "cex_studio_doc_seed",
          JSON.stringify({
            title: titulo,
            html: `<h1 data-ph="Título do documento">${escapeHtml(titulo)}</h1><p data-ph="Comece a escrever aqui…"></p>`,
          }),
        );
      }
    } catch {
      // localStorage indisponível (modo privado etc): segue sem seed.
    }
    setReady(true);
  }, [draftKey, titulo]);

  if (!ready) return <div className={className} />;

  return <iframe className={className} src={src} title={title} />;
}
