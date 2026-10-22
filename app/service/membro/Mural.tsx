"use client";

import { useEffect, useRef, useState } from "react";
import { useRelogioDaIgreja } from "../lib/relogio-context";
import { joinDot, paraPublico } from "../lib/date";
import { M6St } from "./comum";
import { RespostaEvento } from "./Agenda";
import type { Announcement, P } from "./tipos";

export function MuralV6({ announcements, unreadIds, person, onReadAnnouncement, responses = [], onRespond, initialId }: {
  initialId?: string | null;
  announcements: Announcement[]; unreadIds: Set<string>; person: P;
  onReadAnnouncement?: (personId: string, announcementId: string) => void;
  responses?: { announcement_id: string; response: "vou" | "nao" }[];
  onRespond?: (announcementId: string, response: "vou" | "nao" | null) => Promise<boolean>;
}) {
  const { quandoPublicado } = useRelogioDaIgreja();
  /* Abertura da lista não significa que todas as publicações foram vistas. */
  const [novas] = useState(() => new Set(unreadIds));
  const [onlyTarget, setOnlyTarget] = useState(!!initialId);
  const target = announcements.find((a) => a.id === initialId);
  const visible = onlyTarget && target ? [target] : announcements;
  const enviado = useRef(new Set<string>());
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const id = (entry.target as HTMLElement).dataset.announcement;
        if (!entry.isIntersecting || !id || !unreadIds.has(id) || enviado.current.has(id)) continue;
        enviado.current.add(id);
        onReadAnnouncement?.(person.id, id);
      }
    }, { threshold: 0.15 });
    root.current?.querySelectorAll("[data-announcement]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [announcements, unreadIds, person.id, onReadAnnouncement, onlyTarget]);
  useEffect(() => {
    if (!initialId) return;
    const article = Array.from(root.current?.querySelectorAll<HTMLElement>("[data-announcement]") ?? []).find((el) => el.dataset.announcement === initialId);
    article?.scrollIntoView({ block: "start" });
    article?.focus({ preventScroll: true });
  }, [initialId]);
  if (announcements.length === 0) {
    return <div className="m6-sec0"><div className="m6-card"><div className="m6-ct">Nada no Mural ainda</div><div className="m6-meta">As publicações da igreja aparecem aqui.</div></div></div>;
  }
  return (
    <div className="m6-sec0" ref={root}>
      {onlyTarget && target && <div className="m6-pad"><button className="m6-link" type="button" onClick={() => setOnlyTarget(false)}>Ver todas as publicações →</button></div>}
      {visible.map((a) => (
        <article className="m6-card" key={a.id} data-announcement={a.id} tabIndex={-1} aria-label={a.title}>
          {novas.has(a.id) && <span className="m6-new">Nova</span>}
          {a.urgent && <M6St k="warn" ic="alerta">Urgente</M6St>}
          <div className="m6-ct">{a.title}</div>
          {a.body && <p className="m6-txt">{a.body}</p>}
          <div className="m6-meta">{joinDot(quandoPublicado(a.created_at), paraPublico(a.audience))}</div>
          {a.kind === "evento" && onRespond && <RespostaEvento id={a.id} inicial={responses.find((r) => r.announcement_id === a.id)?.response ?? null} onRespond={onRespond} />}
        </article>
      ))}
      <p className="m6-help">A igreja recebe um registro quando a publicação aparece na sua tela. Isso não confirma presença nem substitui sua resposta.</p>
    </div>
  );
}
