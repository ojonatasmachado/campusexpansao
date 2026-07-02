"use client";

import { useRef } from "react";
import { toPng } from "html-to-image";

// ── tipos (subconjunto dos tipos de ServiceExactApp) ──────────────────────────

type EventView = {
  id: string;
  name: string;
  kind: string;
  weekday: string;
  eventDate: string;
  time: string;
  location: string;
  ministries: string[];
  schedule: Array<{ id: string; item: string; time: string | null; category: string | null }>;
  setlist: Array<{ id: string; title: string; song_key: string | null }>;
};

type MinistryView = {
  id: string;
  name: string;
  people: Array<{ personId: string; personName: string; isLeader: boolean; functions: string[] }>;
};

export type EventoShareProps = {
  event: EventView;
  ministries: MinistryView[];
  churchName?: string;
  onClose: () => void;
};

// ── componente principal ──────────────────────────────────────────────────────

export default function EventoShare({ event, ministries, churchName = "CE.X Service", onClose }: EventoShareProps) {
  const artRef = useRef<HTMLDivElement>(null);

  const envolvidos = ministries.filter((m) => event.ministries.includes(m.id));
  const passos = event.schedule.filter((s) => s.item).slice(0, 7);
  const setlist = event.setlist.slice(0, 6);

  const nomeCurto = (name: string) => name.split(" ").slice(0, 2).join(" ");

  const baixar = async () => {
    if (!artRef.current) return;
    try {
      const url = await toPng(artRef.current, { pixelRatio: 3, cacheBust: true });
      const a = document.createElement("a");
      a.href = url;
      a.download = `evento-${event.name.toLowerCase().replace(/\s+/g, "-")}.png`;
      a.click();
    } catch {
      alert("Não consegui exportar agora. Tente novamente.");
    }
  };

  const copiarTexto = () => {
    const L: string[] = [];
    L.push(`◆ ${event.name.toUpperCase()}`);
    L.push(`${event.weekday}${event.eventDate ? " · " + event.eventDate : ""} · ${event.time}`);
    L.push(`◇ ${event.location}`);
    if (envolvidos.length) {
      L.push("");
      L.push("Equipes: " + envolvidos.map((m) => m.name).join(", "));
    }
    if (passos.length) {
      L.push("");
      L.push("Programação:");
      event.schedule.filter((s) => s.item).slice(0, 14).forEach((s) => {
        L.push((s.time ? s.time + "  " : "") + s.item);
      });
    }
    if (setlist.length) {
      L.push("");
      L.push(
        "Repertório: " +
          setlist.map((x) => x.title + (x.song_key ? " (" + x.song_key + ")" : "")).join(", "),
      );
    }
    L.push("");
    L.push("Te esperamos. Traga alguém. →");
    L.push(`${churchName} · Service`);

    const txt = L.join("\n");
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(txt).catch(() => window.prompt("Copie o texto:", txt));
    } else {
      window.prompt("Copie o texto:", txt);
    }
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="evt2-wrap" onClick={(e) => e.stopPropagation()}>

        {/* ── pré-visualização da arte ── */}
        <div className="evt2-stage">
          <div
            ref={artRef}
            className="evt2-art"
            style={
              {
                "--evt-accent": "var(--olive)",
                "--evt-deep": "var(--olive-deep, #4F6B26)",
              } as React.CSSProperties
            }
          >
            <div className="evt2-bg" />

            {/* cabeçalho */}
            <div className="evt2-head">
              <div className="evt2-logo-txt">{churchName}</div>
              <div className="evt2-kicker">{event.kind || "Celebração"}</div>
            </div>

            {/* hero: data, nome, hora, local */}
            <div className="evt2-hero">
              <div className="evt2-dia">
                {event.weekday}
                {event.eventDate ? " · " + event.eventDate : ""}
              </div>
              <div className="evt2-nome">{event.name}</div>
              <div className="evt2-hora">{event.time}</div>
              <div className="evt2-local">◇ {event.location}</div>
            </div>

            {/* programação ou equipes */}
            {passos.length > 0 ? (
              <div className="evt2-prog">
                <div className="evt2-prog-t">Programação</div>
                <div className="evt2-prog-list">
                  {passos.map((s, i) => (
                    <div className="evt2-prog-row" key={i}>
                      <span className="evt2-prog-h">{s.time || "—"}</span>
                      <span className="evt2-prog-i">{s.item}</span>
                    </div>
                  ))}
                </div>
                {envolvidos.length > 0 && (
                  <div className="evt2-equipes">
                    {envolvidos.map((m) => (
                      <span className="evt2-eqchip" key={m.id}>
                        {m.name.split(" ")[0]}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : envolvidos.length > 0 ? (
              <div className="evt2-prog">
                <div className="evt2-prog-t">Equipes</div>
                <div className="evt2-prog-list">
                  {envolvidos.slice(0, 6).map((m, i) => {
                    const lider = m.people.find((p) => p.isLeader);
                    return (
                      <div className="evt2-prog-row" key={i}>
                        <span className="evt2-prog-i">{m.name}</span>
                        {lider && (
                          <span className="evt2-prog-q">{nomeCurto(lider.personName)}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="evt2-spacer" />
            )}

            {/* rodapé */}
            <div className="evt2-foot">
              <div className="evt2-cta">Te esperamos. Traga alguém. →</div>
              <div className="evt2-sig">{churchName} · Service</div>
            </div>
          </div>
        </div>

        {/* ── painel lateral ── */}
        <div className="evt2-side">
          <div className="evt2-side-t">Arte do evento</div>
          <div className="evt2-side-s">
            Story 1080×1920 pronta para os grupos, com programação, equipes e repertório.
            Baixe a imagem ou copie o texto formatado para colar no WhatsApp.
          </div>

          {setlist.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--muted)",
                  marginBottom: 8,
                }}
              >
                Repertório
              </div>
              {setlist.map((s, i) => (
                <div
                  key={i}
                  style={{ fontSize: 13, color: "var(--light)", lineHeight: 1.55 }}
                >
                  {s.title}
                  {s.song_key && (
                    <span style={{ color: "var(--olive-soft)", marginLeft: 6 }}>
                      {s.song_key}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <button
            className="btn btn-pri"
            style={{ width: "100%", justifyContent: "center" }}
            onClick={baixar}
          >
            ↓ Baixar imagem
          </button>
          <button
            className="btn btn-sec"
            style={{ width: "100%", justifyContent: "center", marginTop: 10 }}
            onClick={copiarTexto}
          >
            ◇ Copiar texto p/ WhatsApp
          </button>
          <button
            className="btn btn-ghost"
            style={{ width: "100%", justifyContent: "center", marginTop: 10 }}
            onClick={onClose}
          >
            Fechar
          </button>

          <div className="evt2-side-tip">
            A imagem traz o card; o texto traz a programação completa para colar na conversa.
          </div>
        </div>
      </div>
    </div>
  );
}
