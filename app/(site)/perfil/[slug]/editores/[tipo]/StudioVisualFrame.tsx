"use client";

import { useEffect, useState } from "react";

export function StudioVisualFrame({
  src,
  title,
  seedKey,
  payload,
  className,
  style,
}: {
  src: string;
  title: string;
  seedKey: string;
  payload?: Record<string, unknown> | null;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [ready, setReady] = useState(false);

  // A arte/apresentação oficial do mentor (se existir) vira o ponto de
  // partida do comprador. O editor dá prioridade ao próprio rascunho salvo
  // no servidor quando já existe um; esse seed só entra em jogo antes do
  // primeiro rascunho do comprador.
  useEffect(() => {
    try {
      if (payload) {
        window.localStorage.setItem(seedKey, JSON.stringify({ ...payload, full: true }));
      }
    } catch {
      // localStorage indisponível (modo privado etc): segue sem seed.
    }
    setReady(true);
  }, [seedKey, payload]);

  if (!ready) return <div className={className} style={style} />;

  return <iframe className={className} src={src} title={title} style={style} />;
}
