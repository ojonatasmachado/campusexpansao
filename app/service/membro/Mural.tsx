"use client";

import { useEffect, useRef, useState } from "react";
import { joinDot, paraPublico, quandoPublicado } from "../lib/date";
import { M6St } from "./comum";
import { RespostaEvento } from "./Agenda";
import type { Announcement, P } from "./tipos";

export function MuralV6({ announcements, unreadIds, person, onReadAnnouncement, responses = [], onRespond }: {
  announcements: Announcement[]; unreadIds: Set<string>; person: P;
  onReadAnnouncement?: (personId: string, announcementId: string) => void;
  responses?: { announcement_id: string; response: "vou" | "nao" }[];
  onRespond?: (announcementId: string, response: "vou" | "nao" | null) => Promise<boolean>;
}) {
  /* "Nova" fica marcada nesta visita; abrir o Mural registra a leitura */
  const [novas] = useState(() => new Set(unreadIds));
  const enviado = useRef(new Set<string>());
  useEffect(() => {
    announcements.forEach((a) => {
      if (!unreadIds.has(a.id) || enviado.current.has(a.id)) return;
      enviado.current.add(a.id);
      onReadAnnouncement?.(person.id, a.id);
    });
  }, [announcements, unreadIds, person.id, onReadAnnouncement]);
  if (announcements.length === 0) {
    return <div className="m6-sec0"><div className="m6-card"><div className="m6-ct">Nada no Mural ainda</div><div className="m6-meta">As publicações da igreja aparecem aqui.</div></div></div>;
  }
  return (
    <div className="m6-sec0">
      {announcements.map((a) => (
        <article className="m6-card" key={a.id}>
          {novas.has(a.id) && <span className="m6-new">Nova</span>}
          {a.urgent && <M6St k="warn" ic="alerta">Urgente</M6St>}
          <div className="m6-ct">{a.title}</div>
          {a.body && <p className="m6-txt">{a.body}</p>}
          <div className="m6-meta">{joinDot(quandoPublicado(a.created_at), paraPublico(a.audience))}</div>
          {a.kind === "evento" && onRespond && <RespostaEvento id={a.id} inicial={responses.find((r) => r.announcement_id === a.id)?.response ?? null} onRespond={onRespond} />}
        </article>
      ))}
      <p className="m6-help">Quando você abre o Mural, a igreja sabe que a mensagem chegou.</p>
    </div>
  );
}
