"use client";

import React from "react";
import Link from "next/link";
import { ACCENTS } from "../lib/accents";
import type { AccentKey } from "../lib/accents";
import { CURSOS_EM_ORDEM, NIVEIS } from "../lib/cursos-data";
import type { CursoDado } from "../lib/cursos-data";
import { trackMetricEvent } from "../lib/metrics-client";

// ── HELPERS ───────────────────────────────────────────────────────────────────

function SecMark({ label, accent }: { label: string; accent: string }) {
  return (
    <div style={{
      fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.16em",
      textTransform: "uppercase", color: accent,
      display: "inline-flex", alignItems: "center", gap: 9, marginBottom: 22,
    }}>
      <span style={{ fontSize: 8 }}>◆</span> {label}
    </div>
  );
}

const FAQ_CURSOS = [
  { q: "Como funciona a lista de espera?", a: "Você se cadastra, a gente te avisa quando a próxima turma abrir. Não há cobrança agora. A cobrança só acontece quando a turma for confirmada." },
  { q: "As turmas são ao vivo?", a: "Sim. Os encontros são ao vivo, com mentoria em grupo. Você também recebe acesso à gravação por 12 meses." },
  { q: "Preciso ter feito algum curso antes?", a: "Cada curso da trilha pode ser feito de forma independente. A trilha tem uma sequência sugerida, mas não é obrigatória." },
  { q: "Quantas vagas por turma?", a: "As turmas são pequenas e limitadas justamente para garantir mentoria real. Quando enchem, enchem." },
];

// ── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function CursoLanding({
  curso,
  relacionados,
}: {
  curso: CursoDado;
  relacionados: CursoDado[];
}) {
  const nivel = NIVEIS.find(n => n.key === curso.nivel) ?? NIVEIS[0];
  const accentKey: AccentKey = nivel.accent;
  const accent = ACCENTS[accentKey];
  const ac = accent.base;

  return (
    <>
      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <div className="ld-sec" style={{ paddingTop: 54, paddingBottom: 70 }}>
        <div className="ld-wrap">
          <Link href="/cursos" style={{
            fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "var(--muted)",
            textDecoration: "none", display: "inline-flex", gap: 8, marginBottom: 26,
          }}>← Voltar pra Cursos</Link>

          <div style={{ maxWidth: 680 }}>
            {/* badges */}
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 22 }}>
              <span style={{
                fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.14em",
                textTransform: "uppercase", color: ac,
              }}>◆ {nivel.label}</span>
              <span style={{
                fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.10em",
                textTransform: "uppercase", background: ac,
                color: "#0E110D", padding: "3px 8px", borderRadius: 4, fontWeight: 700,
              }}>● AO VIVO</span>
              <span style={{
                fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.08em",
                color: "var(--muted)",
              }}>ETAPA {curso.num.padStart(2, "0")} de 06 · {curso.dur}</span>
            </div>

            <h1 style={{
              fontSize: "clamp(44px, 7vw, 88px)", fontWeight: 800,
              letterSpacing: "-0.05em", lineHeight: 0.9,
              color: "var(--cream)",
            }}>{curso.title}</h1>
            <p style={{
              fontSize: 20, lineHeight: 1.45, color: "var(--light)",
              maxWidth: 480, marginTop: 22,
            }}>{curso.promessa}</p>

            {/* chips de meta */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 26 }}>
              <span className="ld-tag">{curso.dur}</span>
              <span className="ld-tag">{curso.ementa.length} semanas</span>
              <span className="ld-tag-fmt" style={{ color: ac, borderColor: `${ac}55` }}>
                <span style={{ fontSize: 7 }}>◆</span> Ao vivo
              </span>
            </div>

            {/* CTA */}
            <div style={{ display: "flex", alignItems: "center", gap: 22, marginTop: 36, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--muted)", letterSpacing: "0.04em", marginBottom: 2 }}>
                  Próxima turma
                </div>
                <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--white)", lineHeight: 1 }}>
                  {curso.turma}
                </div>
              </div>
              <a
                href="/landing"
                className="ld-btn-buy"
                onClick={() => trackMetricEvent({ eventName: "waitlist_click", cursoSlug: curso.slug, metadata: { title: curso.title } })}
                style={{ background: ac, boxShadow: `0 12px 30px -14px ${ac}` }}
              >
                Entrar na lista de espera →
              </a>
            </div>
            <div style={{
              fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.04em",
              color: "var(--muted)", marginTop: 16,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ color: ac }}>◇</span>
              Vagas limitadas · Mentoria inclusa · Sem cobrança agora
            </div>
          </div>
        </div>
      </div>

      {/* ── BANDA DE AUTORIDADE ─────────────────────────────────────────────── */}
      <div className="ld-dark-panel" style={{
        borderBottom: "0.5px solid #25291F", background: "#14170F",
        backgroundImage: "linear-gradient(#25291F 1px, transparent 1px)",
        backgroundSize: "100% 46px",
      }}>
        <div className="ld-wrap" style={{ padding: "78px clamp(22px, 5vw, 64px)" }}>
          <p style={{
            fontSize: "clamp(22px, 4vw, 42px)", fontWeight: 700,
            letterSpacing: "-0.035em", lineHeight: 1.16,
            color: "var(--cream)", maxWidth: 880,
          }}>
            A maioria dos líderes aprende no erro. Os que avançam{" "}
            <em style={{ fontStyle: "normal", color: ac }}>aprendem com estrutura</em>.
          </p>
          <div style={{
            fontFamily: "var(--mono)", fontSize: 12, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "var(--muted)",
            marginTop: 26, display: "inline-flex", gap: 10, alignItems: "center",
          }}>
            <span style={{ color: ac }}>◇</span> Tese CE.X · Campus Expansão
          </div>
        </div>
      </div>

      {/* ── PRA QUEM É ─────────────────────────────────────────────────────── */}
      <div className="ld-sec">
        <div className="ld-wrap">
          <div className="ld-sec-grid">
            <div>
              <SecMark label="Pra quem é" accent={ac} />
              <h2 style={{
                fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 700,
                letterSpacing: "-0.035em", lineHeight: 1.04, color: "var(--cream)",
              }}>
                Se você lidera{" "}
                <em style={{ fontStyle: "italic", color: ac, fontWeight: 600 }}>
                  e sente o peso disso
                </em>, isso é pra você.
              </h2>
            </div>
            <p style={{ fontSize: 18, lineHeight: 1.62, color: "var(--light)" }}>{curso.praQuem}</p>
          </div>
        </div>
      </div>

      {/* ── A TRILHA ────────────────────────────────────────────────────────── */}
      <div className="ld-sec">
        <div className="ld-wrap">
          <SecMark label="A trilha completa" accent={ac} />
          <div className="ld-sec-grid" style={{ marginBottom: 32 }}>
            <h2 style={{
              fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 700,
              letterSpacing: "-0.035em", lineHeight: 1.04, color: "var(--cream)",
            }}>
              Etapa{" "}
              <em style={{ fontStyle: "normal", color: ac }}>{curso.num.padStart(2, "0")}</em>{" "}
              de 06
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.6, color: "var(--light)" }}>
              Cada curso da trilha é uma etapa da jornada. Você entra onde está e avança no seu ritmo.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {CURSOS_EM_ORDEM.map((c) => {
              const isAtual = c.slug === curso.slug;
              const nivelItem = NIVEIS.find(n => n.key === c.nivel) ?? NIVEIS[0];
              const acItem = ACCENTS[nivelItem.accent].base;
              return (
                <Link key={c.slug} href={`/cursos/${c.slug}`} style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "12px 16px", borderRadius: 8,
                  background: isAtual ? `${ac}18` : "transparent",
                  border: `1px solid ${isAtual ? ac + "44" : "#25291F"}`,
                  textDecoration: "none",
                  transition: "background 0.2s",
                }}>
                  <span style={{
                    fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.1em",
                    color: isAtual ? ac : "var(--muted)", minWidth: 24,
                  }}>{c.num.padStart(2, "0")}</span>
                  <span style={{
                    fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.12em",
                    textTransform: "uppercase", color: acItem,
                    background: `${acItem}18`, padding: "2px 6px", borderRadius: 3,
                    minWidth: 88, textAlign: "center",
                  }}>{nivelItem.label}</span>
                  <span style={{
                    fontSize: 14, fontWeight: isAtual ? 700 : 400,
                    color: isAtual ? "var(--white)" : "var(--muted)",
                    flex: 1,
                  }}>{c.title}</span>
                  {isAtual && (
                    <span style={{
                      fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.1em",
                      textTransform: "uppercase", color: ac,
                    }}>← você está aqui</span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── EMENTA ──────────────────────────────────────────────────────────── */}
      <div className="ld-sec">
        <div className="ld-wrap">
          <SecMark label="Ementa semana a semana" accent={ac} />
          <div className="ld-sec-grid" style={{ marginBottom: 32 }}>
            <h2 style={{
              fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 700,
              letterSpacing: "-0.035em", lineHeight: 1.04, color: "var(--cream)",
            }}>
              {curso.ementa.length} semanas,{" "}
              <em style={{ fontStyle: "italic", color: ac }}>sem enrolação</em>.
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.6, color: "var(--light)" }}>
              Cada encontro tem um objetivo claro. Você sai com algo aplicável na semana seguinte.
            </p>
          </div>
          <div style={{ borderTop: "0.5px solid #25291F" }}>
            {curso.ementa.map((s) => (
              <div key={s.semana} style={{
                display: "grid", gridTemplateColumns: "64px 1fr",
                gap: 20, padding: "22px 0",
                borderBottom: "0.5px solid #25291F", alignItems: "baseline",
              }}>
                <span style={{
                  fontFamily: "var(--mono)", fontSize: 14, letterSpacing: "0.06em",
                  color: ac,
                }}>SEM {String(s.semana).padStart(2, "0")}</span>
                <div>
                  <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--cream)", marginBottom: 6 }}>
                    {s.titulo}
                  </div>
                  <div style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.55 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── COMO É + MENTOR ─────────────────────────────────────────────────── */}
      <div className="ld-sec">
        <div className="ld-wrap">
          <div className="ld-sec-grid">
            {/* como é */}
            <div>
              <SecMark label="Como é" accent={ac} />
              <h2 style={{
                fontSize: "clamp(24px, 3.5vw, 36px)", fontWeight: 700,
                letterSpacing: "-0.03em", lineHeight: 1.1, color: "var(--cream)",
                marginBottom: 20,
              }}>
                Ao vivo,{" "}
                <em style={{ fontStyle: "italic", color: ac }}>com mentoria</em>.
              </h2>
              <p style={{ fontSize: 17, lineHeight: 1.7, color: "var(--light)" }}>{curso.formato}</p>
            </div>

            {/* mentor */}
            <div>
              <SecMark label="Mentor" accent={ac} />
              <div className="ld-dark-panel" style={{
                display: "flex", gap: 20, alignItems: "flex-start",
                padding: "24px 28px",
                background: "#181B16", border: "0.5px solid #2E3327",
                borderTop: `2px solid ${ac}`,
                borderRadius: 12,
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
                  background: `${ac}30`, border: `1px solid ${ac}44`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--mono)", fontSize: 14, fontWeight: 700, color: ac,
                }}>
                  {curso.mentor.split(" ").map(w => w[0]).slice(0, 2).join("")}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--white)", marginBottom: 6 }}>
                    {curso.mentor}
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.55, color: "var(--muted)" }}>{curso.mentorBio}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── DEPOIMENTO ──────────────────────────────────────────────────────── */}
      <div className="ld-sec ld-dark-panel" style={{ background: "#0A0D09" }}>
        <div className="ld-wrap">
          <blockquote style={{
            borderLeft: `2px solid ${ac}`,
            padding: "6px 0 6px 32px", maxWidth: 760,
          }}>
            <p style={{
              fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 600,
              letterSpacing: "-0.025em", lineHeight: 1.42,
              color: "var(--cream)", margin: 0,
            }}>
              &ldquo;{curso.depoimento.texto}&rdquo;
            </p>
            <cite style={{
              display: "block", fontStyle: "normal",
              fontFamily: "var(--mono)", fontSize: 12,
              letterSpacing: "0.06em", color: "var(--muted)", marginTop: 20,
            }}>
              ◇ {curso.depoimento.autor} · {curso.depoimento.cargo}
            </cite>
          </blockquote>
        </div>
      </div>

      {/* ── TESE COLOR BAND ─────────────────────────────────────────────────── */}
      <div style={{ background: ac }}>
        <div className="ld-wrap" style={{ padding: "96px clamp(22px, 5vw, 64px)", textAlign: "center" }}>
          <div style={{
            fontFamily: "var(--mono)", fontSize: 12, letterSpacing: "0.16em",
            textTransform: "uppercase", color: "rgba(14,17,13,.6)",
          }}>◆ Campus Expansão</div>
          <div style={{
            fontSize: "clamp(34px, 6vw, 64px)", fontWeight: 800,
            letterSpacing: "-0.04em", lineHeight: 0.98,
            color: "#0E110D", marginTop: 20, whiteSpace: "pre-line",
          }}>{"Nós preparamos.\nDeus multiplica."}</div>
          <p style={{
            fontSize: 18, color: "rgba(14,17,13,.72)", marginTop: 22,
            maxWidth: 520, marginLeft: "auto", marginRight: "auto", lineHeight: 1.55,
          }}>
            Formação ao vivo com mentoria real. Você avança com quem já passou pelo mesmo caminho.
          </p>
        </div>
      </div>

      {/* ── LISTA DE ESPERA ─────────────────────────────────────────────────── */}
      <div id="lista" className="ld-sec">
        <div className="ld-wrap">
          <div className="ld-offer-grid ld-offer-panel ld-dark-panel" style={{
            background: "#181B16", border: "0.5px solid #2E3327",
            borderTop: `2px solid ${ac}`, borderRadius: 18,
            padding: "clamp(32px, 5vw, 54px) clamp(24px, 5vw, 56px)",
            boxShadow: "0 30px 70px -45px rgba(0,0,0,.9)",
          }}>
            <div>
              <SecMark label="Próxima turma" accent={ac} />
              <h2 style={{
                fontSize: 34, fontWeight: 700, letterSpacing: "-0.03em",
                lineHeight: 1.1, color: "var(--cream)",
              }}>
                <em style={{ fontStyle: "normal", color: ac }}>{curso.title}</em>
                {" "}· {curso.ementa.length} semanas ao vivo com mentoria
              </h2>
              <ul style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 11 }}>
                {[
                  `${curso.ementa.length} encontros ao vivo com mentoria em grupo`,
                  "Acesso à gravação por 12 meses",
                  "Materiais editáveis inclusos",
                  "Certificado de conclusão",
                  "Vagas limitadas por turma",
                ].map((item, i) => (
                  <li key={i} style={{
                    listStyle: "none", fontSize: 15, color: "var(--light)",
                    display: "flex", gap: 12, alignItems: "baseline",
                  }}>
                    <span style={{ color: ac, fontFamily: "var(--mono)", flexShrink: 0 }}>→</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="ld-offer-right">
              <div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--muted)", letterSpacing: "0.04em" }}>Próxima abertura de turma</div>
                <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.04em", color: "var(--white)", lineHeight: 1.1 }}>{curso.turma}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--muted)", marginTop: 6 }}>sem cobrança agora</div>
              </div>
              <a href="/landing" className="ld-btn-buy" style={{ background: ac }}>
                Entrar na lista →
              </a>
              <div style={{
                fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.04em",
                color: "var(--muted)", maxWidth: 230, textAlign: "right", lineHeight: 1.5,
              }}>
                <span style={{ color: ac }}>◇ </span>
                Você é avisado primeiro. As vagas abrem só pra lista.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── RELACIONADOS ───────────────────────────────────────────────────── */}
      {relacionados.length > 0 && (
        <div className="ld-sec">
          <div className="ld-wrap">
            <div style={{
              display: "flex", alignItems: "flex-end", justifyContent: "space-between",
              gap: 24, marginBottom: 30, flexWrap: "wrap",
            }}>
              <div>
                <h2 style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--cream)" }}>
                  Da mesma <em style={{ fontStyle: "italic", color: ac }}>trilha</em>
                </h2>
                <div style={{ fontFamily: "var(--mono)", fontSize: 12, letterSpacing: "0.04em", color: "var(--muted)", marginTop: 8 }}>
                  Mais cursos do nível {nivel.label}
                </div>
              </div>
              <Link href="/cursos" style={{
                fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.08em",
                textTransform: "uppercase", color: "var(--muted)", textDecoration: "none",
              }}>Ver todos os cursos →</Link>
            </div>
            <div className="ld-rel-grid">
              {relacionados.slice(0, 3).map(r => (
                <Link key={r.slug} href={`/cursos/${r.slug}`} className="ld-rcard"
                  style={{ borderTop: `2px solid ${ac}` }}>
                  <div className="ld-dark-panel" style={{
                    flex: 1, background: "#0E110D", padding: 18,
                    display: "flex", flexDirection: "column", justifyContent: "space-between",
                  }}>
                    <span style={{
                      fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.14em",
                      textTransform: "uppercase", color: ac,
                      display: "inline-flex", gap: 6, alignItems: "center",
                    }}><span style={{ fontSize: 7 }}>◆</span>{nivel.label}</span>
                    <span style={{
                      fontSize: 24, fontWeight: 800, letterSpacing: "-0.035em",
                      lineHeight: 1.0, color: "#EDE6D3",
                    }}>{r.title}</span>
                  </div>
                  <div style={{
                    padding: "14px 18px 16px", borderTop: "0.5px solid #25291F",
                    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
                  }}>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--muted)" }}>
                      {r.dur} · {r.ementa.length} semanas
                    </span>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: ac }}>Ver →</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── FAQ ────────────────────────────────────────────────────────────── */}
      <div className="ld-sec">
        <div className="ld-wrap">
          <div className="ld-sec-grid">
            <div>
              <SecMark label="Perguntas" accent={ac} />
              <h2 style={{
                fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 700,
                letterSpacing: "-0.035em", lineHeight: 1.04, color: "var(--cream)",
              }}>
                Antes de <em style={{ fontStyle: "italic", color: ac }}>entrar</em>.
              </h2>
            </div>
            <div style={{ borderTop: "0.5px solid #25291F" }}>
              {FAQ_CURSOS.map((f, i) => (
                <div key={i} style={{ borderBottom: "0.5px solid #25291F", padding: "24px 0" }}>
                  <div style={{
                    fontSize: 19, fontWeight: 600, letterSpacing: "-0.02em",
                    color: "var(--cream)", display: "flex", gap: 12, alignItems: "baseline",
                  }}>
                    <span style={{ color: ac, fontFamily: "var(--mono)", fontSize: 13, flexShrink: 0 }}>◆</span>
                    {f.q}
                  </div>
                  <div style={{
                    fontSize: 16, color: "var(--muted)", lineHeight: 1.6,
                    marginTop: 12, paddingLeft: 26,
                  }}>{f.a}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── CTA FINAL ──────────────────────────────────────────────────────── */}
      <div style={{ padding: "96px 0", textAlign: "center" }}>
        <div className="ld-wrap">
          <h2 style={{
            fontSize: "clamp(30px, 5vw, 52px)", fontWeight: 800,
            letterSpacing: "-0.04em", lineHeight: 0.98,
            color: "var(--cream)", maxWidth: 760, margin: "0 auto",
          }}>
            Sua liderança merece{" "}
            <em style={{ fontStyle: "normal", color: ac }}>estrutura de verdade</em>.
          </h2>
          <p style={{ fontSize: 18, color: "var(--light)", marginTop: 22 }}>
            Entre na lista. Quando a turma de {curso.title} abrir, você é o primeiro a saber.
          </p>
          <a href="/landing" className="ld-btn-buy" style={{
            background: ac, display: "inline-flex",
            marginTop: 36, fontSize: 17, padding: "18px 36px",
            boxShadow: `0 12px 30px -14px ${ac}`,
          }}>
            Entrar na lista de espera →
          </a>
          <div style={{
            fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.04em",
            color: "var(--muted)", marginTop: 18,
          }}>
            <span style={{ color: ac }}>◇ </span>
            Sem compromisso agora. As vagas abrem primeiro pra lista.
          </div>
        </div>
      </div>
    </>
  );
}
