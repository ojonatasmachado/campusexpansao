"use client";

import { useState, useRef } from "react";
import { toPng } from "html-to-image";
import { formatDateBR } from "./lib/date";

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
  logoUrl?: string | null;
  onClose: () => void;
};

// ── componente principal ──────────────────────────────────────────────────────

/* "Arte do evento" é um cartão pra avisar a EQUIPE internamente (grupo do
   WhatsApp da igreja) : roteiro, quem serve e repertório. Não é peça de
   divulgação pública (sem CTA de convite, sem framing de "stories"). Tem
   duas versões : simplificada (a de sempre, compacta) e completa (tudo,
   sem cortar nada — pode ficar bem alta verticalmente, sem problema). */
export default function EventoShare({ event, ministries, churchName = "Service", logoUrl, onClose }: EventoShareProps) {
  const artRef = useRef<HTMLDivElement>(null);
  const [modo, setModo] = useState<"simples" | "completa">("simples");
  const completa = modo === "completa";

  const envolvidos = ministries.filter((m) => event.ministries.includes(m.id));
  const roteiroCompleto = event.schedule.filter((s) => s.item);
  const passos = completa ? roteiroCompleto : roteiroCompleto.slice(0, 7);
  const setlistCompleto = event.setlist;
  const setlist = completa ? setlistCompleto : setlistCompleto.slice(0, 6);
  const dataFmt = formatDateBR(event.eventDate);

  const baixar = async () => {
    if (!artRef.current) return;
    try {
      const url = await toPng(artRef.current, { pixelRatio: 3, cacheBust: true });
      const a = document.createElement("a");
      a.href = url;
      a.download = `evento-${event.name.toLowerCase().replace(/\s+/g, "-")}-${modo}.png`;
      a.click();
    } catch {
      alert("Não consegui exportar agora. Tente novamente.");
    }
  };

  const copiarTexto = () => {
    const L: string[] = [];
    L.push(`${event.name.toUpperCase()}`);
    L.push(`${event.weekday}${dataFmt ? " · " + dataFmt : ""} · ${event.time}`);
    L.push(`${event.location}`);
    if (envolvidos.length) {
      L.push("");
      if (completa) {
        L.push("Equipes escaladas:");
        envolvidos.forEach((m) => {
          L.push(`${m.name}:`);
          m.people.forEach((p) => {
            L.push(`  · ${p.personName}${p.functions.length ? " — " + p.functions.join(", ") : ""}${p.isLeader ? " (líder)" : ""}`);
          });
        });
      } else {
        L.push("Equipes: " + envolvidos.map((m) => m.name).join(", "));
      }
    }
    if (roteiroCompleto.length) {
      L.push("");
      L.push("Programação:");
      roteiroCompleto.forEach((s) => {
        L.push((s.time ? s.time + "  " : "") + s.item);
      });
    }
    if (setlistCompleto.length) {
      L.push("");
      L.push(
        "Repertório: " +
          setlistCompleto.map((x) => x.title + (x.song_key ? " (" + x.song_key + ")" : "")).join(", "),
      );
    }
    L.push("");
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
            className={`evt2-art${completa ? " full" : ""}`}
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
              {logoUrl ? (
                <img src={logoUrl} alt={churchName} style={{ height: 22, maxWidth: 140, objectFit: "contain" }} />
              ) : (
                <div className="evt2-logo-txt">{churchName}</div>
              )}
              <div className="evt2-kicker">{event.kind || "Celebração"}</div>
            </div>

            {/* hero: data, nome, hora, local */}
            <div className="evt2-hero">
              <div className="evt2-dia">
                {event.weekday}
                {dataFmt ? " · " + dataFmt : ""}
              </div>
              <div className="evt2-nome">{event.name}</div>
              <div className="evt2-hora">{event.time}</div>
              <div className="evt2-local">{event.location}</div>
            </div>

            {/* programação */}
            {passos.length > 0 && (
              <div className="evt2-prog">
                <div className="evt2-prog-t">Programação</div>
                <div className="evt2-prog-list">
                  {passos.map((s, i) => (
                    <div className="evt2-prog-row" key={i}>
                      <span className="evt2-prog-h">{s.time || "-"}</span>
                      <span className="evt2-prog-i">{s.item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* equipes : chips (simples) ou roteiro completo com funções (completa) */}
            {envolvidos.length > 0 && (
              <div className="evt2-prog">
                <div className="evt2-prog-t">Equipes escaladas</div>
                {completa ? (
                  <div className="evt2-prog-list">
                    {envolvidos.map((m) => (
                      <div key={m.id} style={{ marginBottom: 10 }}>
                        <div className="evt2-prog-i" style={{ fontWeight: 700, marginBottom: 4 }}>{m.name}</div>
                        {m.people.map((p) => (
                          <div className="evt2-prog-row" key={p.personId}>
                            <span className="evt2-prog-i">{p.personName}</span>
                            <span className="evt2-prog-r">{p.functions[0] || (p.isLeader ? "Líder" : "")}</span>
                          </div>
                        ))}
                        {m.people.length === 0 && <div className="evt2-prog-row"><span className="evt2-prog-i" style={{ opacity: 0.6 }}>Ninguém escalado ainda</span></div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="evt2-equipes">
                    {envolvidos.map((m) => (
                      <span className="evt2-eqchip" key={m.id}>
                        {m.name.split(" ")[0]}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* repertório completo (só no modo completa, já que no simples entra no rodapé do painel) */}
            {completa && setlist.length > 0 && (
              <div className="evt2-prog">
                <div className="evt2-prog-t">Repertório</div>
                <div className="evt2-prog-list">
                  {setlist.map((s, i) => (
                    <div className="evt2-prog-row" key={i}>
                      <span className="evt2-prog-i">{s.title}</span>
                      <span className="evt2-prog-h">{s.song_key || ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {passos.length === 0 && envolvidos.length === 0 && !completa && <div className="evt2-spacer" />}

            {/* rodapé */}
            <div className="evt2-foot">
              <div className="evt2-sig">{churchName} · Service</div>
            </div>
          </div>
        </div>

        {/* ── painel lateral ── */}
        <div className="evt2-side">
          <div className="evt2-side-t">Arte do evento</div>
          <div className="evt2-side-s">
            Cartão pra avisar a equipe internamente : roteiro, quem serve e repertório do culto.
            Baixe a imagem ou copie o texto formatado pra colar no grupo da igreja.
          </div>

          <div className="seg" style={{ marginBottom: 18 }}>
            <button type="button" className={modo === "simples" ? "on" : ""} onClick={() => setModo("simples")}>Simplificada</button>
            <button type="button" className={modo === "completa" ? "on" : ""} onClick={() => setModo("completa")}>Completa</button>
          </div>

          {!completa && setlist.length > 0 && (
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
            Copiar texto p/ WhatsApp
          </button>
          <button
            className="btn btn-ghost"
            style={{ width: "100%", justifyContent: "center", marginTop: 10 }}
            onClick={onClose}
          >
            Fechar
          </button>

          <div className="evt2-side-tip">
            {completa
              ? "Versão completa : todo o roteiro, todas as equipes com função de cada um e o repertório inteiro. Pode ficar alta, é só rolar."
              : "A imagem traz o resumo; o texto traz a programação completa pra colar na conversa."}
          </div>
        </div>
      </div>
    </div>
  );
}
