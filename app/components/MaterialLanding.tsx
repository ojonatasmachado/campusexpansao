"use client";

import React from "react";
import Link from "next/link";
import { ACCENTS, HEX_TO_ACCENT } from "../lib/accents";
import type { AccentKey } from "../lib/accents";
import { ESTANTE_MAP } from "../lib/materiais-data";
import type { DbEstante, DbMaterial, DbMaterialContent } from "../lib/types";

// ── TEMPLATE FIXO ────────────────────────────────────────────────────────────

const COMO_USAR = [
  { num: "01", titulo: "Recebe na hora", desc: "Ao comprar, o material é liberado direto no seu perfil CE.X. Acesso vitalício, abre quando quiser." },
  { num: "02", titulo: "Abre e prepara", desc: "Vem nos formatos que você já usa. Dá uma lida, separa o material de apoio e está pronto." },
  { num: "03", titulo: "É só ministrar", desc: "Cada encontro já vem estruturado. Você foca em pastorear gente, não em produzir conteúdo." },
];

const FAQ_PADRAO = [
  { q: "Como eu recebo?", a: "O material fica liberado no seu perfil CE.X. Você entra com sua conta e acessa sempre que precisar." },
  { q: "Preciso de algum programa especial?", a: "Não. Você ministra direto do arquivo e usa o material de apoio em qualquer tela ou projetor que já tenha." },
  { q: "Serve pra qualquer tamanho de grupo?", a: "Sim. Funciona com um grupo pequeno ou com o ministério inteiro. A estrutura é a mesma, você ajusta a escala." },
  { q: "É compra única?", a: "Sim. Você paga uma vez e o material é seu, pra sempre. Sem mensalidade." },
];

// ── POSTER TIPOGRÁFICO ────────────────────────────────────────────────────────

function Poster({ etiqueta, titulo, code, faixa, formato, accent }: {
  etiqueta: string; titulo: string; code?: string | null;
  faixa: string; formato: string; accent: string;
}) {
  return (
    <div style={{
      position: "relative", background: "#0E110D",
      border: "0.5px solid #2E3327", borderTop: `2px solid ${accent}`,
      borderRadius: 14, aspectRatio: "4 / 4.6",
      display: "flex", flexDirection: "column", padding: 30,
      overflow: "hidden", boxShadow: "0 30px 70px -40px rgba(0,0,0,.9)",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(120% 80% at 80% 8%, ${accent}1F 0%, transparent 55%)`,
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "linear-gradient(#25291F 1px, transparent 1px)",
        backgroundSize: "100% 46px", opacity: 0.5, pointerEvents: "none",
      }} />
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", position: "relative", zIndex: 1,
      }}>
        <span style={{
          fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.14em",
          textTransform: "uppercase", color: accent,
          display: "inline-flex", gap: 7, alignItems: "center",
        }}>
          <span style={{ fontSize: 8 }}>◆</span>{etiqueta}
        </span>
        {code && (
          <span style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.1em", color: "#555650" }}>
            {code}
          </span>
        )}
      </div>
      <div style={{
        marginTop: "auto", fontFamily: "var(--sans)",
        fontSize: "clamp(44px, 5.5vw, 80px)", fontWeight: 900,
        letterSpacing: "-0.05em", lineHeight: 0.86,
        color: "#EDE6D3", position: "relative", zIndex: 1,
        overflowWrap: "break-word",
      }}>{titulo}</div>
      <div style={{
        marginTop: 20, fontFamily: "var(--mono)", fontSize: 11,
        letterSpacing: "0.06em", color: "#8B8C82",
        position: "relative", zIndex: 1,
        display: "flex", justifyContent: "space-between",
        borderTop: "0.5px solid #25291F", paddingTop: 16,
      }}>
        <span>{faixa}</span>
        <span>{formato}</span>
      </div>
    </div>
  );
}

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

function contentKindLabel(content: DbMaterialContent) {
  if (content.kind === "word") return content.delivery === "word" ? "Word" : "PDF";
  if (content.kind === "pdf") return "PDF";
  if (content.kind === "design") return "Design";
  return "Slides";
}

function contentMeta(content: DbMaterialContent) {
  if (content.kind === "word") {
    return [
      content.messages ? `${content.messages} mensagens` : null,
      content.pages ? `${content.pages} páginas` : null,
      content.delivery === "word" ? "Word" : "PDF",
    ].filter(Boolean).join(" · ");
  }
  if (content.kind === "pdf") {
    return ["PDF", content.pages ? `${content.pages} páginas` : null].filter(Boolean).join(" · ");
  }
  if (content.kind === "design") {
    const format = content.designFormat === "stories" ? "Stories" : content.designFormat === "telao" ? "Telão" : "Feed";
    return ["Design", content.designs ? `${content.designs} artes` : null, format].filter(Boolean).join(" · ");
  }
  return ["Slides", content.slides ? `${content.slides} telas` : null].filter(Boolean).join(" · ");
}

// ── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function MaterialLanding({
  material: raw,
  dbEstantes,
  allDbMateriais,
}: {
  material: DbMaterial;
  dbEstantes?: DbEstante[];
  allDbMateriais?: DbMaterial[];
}) {
  const estanteDb = dbEstantes?.find(e => e.key === raw.estante);
  const accentKey: AccentKey = estanteDb
    ? (HEX_TO_ACCENT[estanteDb.accent] ?? "olive")
    : (ESTANTE_MAP[raw.estante]?.accent ?? "olive");
  const accent = ACCENTS[accentKey];
  const ac = accent.base;

  const faixa = estanteDb?.faixa_etaria ?? "";
  const formatosValidos = (raw.formatos ?? []).filter(formato => formato.toLowerCase() !== "editável");
  const formatos = formatosValidos.length ? formatosValidos : ["PDF"];
  const checkoutHref = `/checkout/${raw.id}`;
  const formato = formatos[0] ?? "PDF";
  const preco = /^R\$/.test(raw.preco ?? "") ? raw.preco : `R$ ${raw.preco}`;

  const allMateriais = allDbMateriais ?? [];
  const shelfItems = allMateriais.filter(m => m.estante === raw.estante);
  const relacionados = shelfItems.filter(m => m.id !== raw.id).slice(0, 3);

  const mensagensLista = (raw.mensagens_lista ?? []).filter(m => m?.nome);
  const beneficios = raw.conteudo ?? [];
  const contents = (raw.contents ?? []).filter(content => content?.name);
  const ofertaItens = contents.length
    ? contents.map(content => content.note || content.name).filter(Boolean)
    : beneficios;
  const faq = raw.faq?.length ? raw.faq : FAQ_PADRAO;

  return (
    <>
      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <div className="ld-sec" style={{ paddingTop: 54, paddingBottom: 70 }}>
        <div className="ld-wrap">
          <Link href="/materiais" style={{
            fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "var(--muted)",
            textDecoration: "none", display: "inline-flex", gap: 8, marginBottom: 26,
          }}>← Voltar pra Materiais</Link>

          <div style={{ maxWidth: 680 }}>
            <div>
              <div style={{
                fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.12em",
                textTransform: "uppercase", color: ac,
                marginBottom: 18, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap",
              }}>
                <span>{raw.familia}</span>
                <span style={{ color: "#555650" }}>/</span>
                <span>{raw.etiqueta}</span>
                {raw.code && (
                  <><span style={{ color: "#555650" }}>·</span>
                  <span style={{ color: "#555650" }}>{raw.code}</span></>
                )}
              </div>
              <h1 style={{
                fontSize: "clamp(44px, 7vw, 88px)", fontWeight: 800,
                letterSpacing: "-0.05em", lineHeight: 0.9,
                color: "var(--cream)",
              }}>{raw.titulo}</h1>
              <p style={{
                fontSize: 20, lineHeight: 1.45, color: "var(--light)",
                maxWidth: 480, marginTop: 22,
              }}>{raw.promessa}</p>

              {/* chips de meta */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 26 }}>
                {raw.mensagens != null && (
                  <span className="ld-tag">
                    <b style={{ color: ac, fontWeight: 500 }}>{raw.mensagens}</b> mensagens
                  </span>
                )}
                {raw.paginas > 0 && (
                  <span className="ld-tag">
                    <b style={{ color: ac, fontWeight: 500 }}>{raw.paginas}</b> páginas
                  </span>
                )}
                {formatos.map(f => (
                  <span key={f} className="ld-tag-fmt" style={{ color: ac, borderColor: `${ac}55` }}>
                    <span style={{ fontSize: 7 }}>◆</span> {f}
                  </span>
                ))}
              </div>

              {/* preço + CTA */}
              <div style={{ display: "flex", alignItems: "center", gap: 22, marginTop: 36, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--muted)", letterSpacing: "0.04em", marginBottom: 2 }}>
                    Acesso vitalício
                  </div>
                  <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--white)", lineHeight: 1 }}>
                    {preco}
                  </div>
                </div>
                <a href={checkoutHref} rel="noopener noreferrer" className="ld-btn-buy"
                  style={{ background: ac, boxShadow: `0 12px 30px -14px ${ac}` }}>
                  Comprar material →
                </a>
              </div>
              <div style={{
                fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.04em",
                color: "var(--muted)", marginTop: 16,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <span style={{ color: ac }}>◇</span>
                Liberação imediata · {formatos.slice(0, 2).join(" · ")} · no seu perfil
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── BANDA DE AUTORIDADE ─────────────────────────────────────────────── */}
      <div style={{
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
            As igrejas que mais formam não improvisam o que ensinam. Elas{" "}
            <em style={{ fontStyle: "normal", color: ac }}>preparam</em>.
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
      {raw.pra_quem && (
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
                    {raw.etiqueta.toLowerCase()}
                  </em>, isso é pra você.
                </h2>
              </div>
              <p style={{ fontSize: 18, lineHeight: 1.62, color: "var(--light)" }}>{raw.pra_quem}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── O QUE VEM DENTRO ───────────────────────────────────────────────── */}
      <div className="ld-sec">
        <div className="ld-wrap">
          <SecMark label="O que vem dentro" accent={ac} />

          {/* fatos */}
          <div className="ld-facts-grid" style={{ marginBottom: 46 }}>
            {raw.mensagens != null && (
              <div className="ld-fact">
                <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: "-0.04em", color: ac, lineHeight: 1 }}>{raw.mensagens}</div>
                <div className="ld-fact-label">mensagens · encontros</div>
              </div>
            )}
            {raw.paginas > 0 && (
              <div className="ld-fact">
                <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: "-0.04em", color: ac, lineHeight: 1 }}>{raw.paginas}</div>
                <div className="ld-fact-label">páginas editáveis</div>
              </div>
            )}
            {formatos.length > 0 && (
              <div className="ld-fact">
                <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", color: ac, lineHeight: 1.1 }}>{formatos[0]}</div>
                <div className="ld-fact-label">
                  {formatos.length > 1 ? `+ ${formatos.length - 1} formato${formatos.length > 2 ? "s" : ""}` : "formato"}
                </div>
              </div>
            )}
          </div>

          {/* conteúdos estruturados */}
          {contents.length > 0 && (
            <div style={{ borderTop: "0.5px solid #25291F" }}>
              {contents.map((content, i) => (
                <div key={`${content.kind}-${i}`} style={{
                  display: "grid", gridTemplateColumns: "54px 1fr",
                  gap: 14, padding: "20px 0",
                  borderBottom: "0.5px solid #25291F", alignItems: "baseline",
                }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 14, color: ac, letterSpacing: "0.04em" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <div style={{
                      display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap",
                    }}>
                      <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--cream)" }}>
                        {content.name}
                      </div>
                      <span style={{
                        fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em",
                        textTransform: "uppercase", color: ac,
                      }}>
                        ◆ {contentKindLabel(content)}
                      </span>
                    </div>
                    {content.note && (
                      <div style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.5, marginTop: 5 }}>
                        {content.note}
                      </div>
                    )}
                    {contentMeta(content) && (
                      <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--subtle)", marginTop: 8 }}>
                        {contentMeta(content)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* lista de mensagens */}
          {contents.length === 0 && mensagensLista.length > 0 && (
            <>
              <div className="ld-sec-grid" style={{ marginBottom: 30 }}>
                <h2 style={{
                  fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 700,
                  letterSpacing: "-0.035em", lineHeight: 1.04, color: "var(--cream)",
                }}>
                  As <em style={{ fontStyle: "normal", color: ac }}>{raw.mensagens}</em> mensagens
                </h2>
                <p style={{ fontSize: 18, lineHeight: 1.62, color: "var(--light)" }}>
                  Cada encontro já vem fechado: abertura, desenvolvimento bíblico, dinâmica e aplicação. Você abre e ministra.
                </p>
              </div>
              <div style={{ borderTop: "0.5px solid #25291F" }}>
                {mensagensLista.map((m, i) => (
                  <div key={i} style={{
                    display: "grid", gridTemplateColumns: "54px 1fr",
                    gap: 14, padding: "20px 0",
                    borderBottom: "0.5px solid #25291F", alignItems: "baseline",
                  }}>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 14, color: ac, letterSpacing: "0.04em" }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--cream)" }}>{m.nome}</div>
                      {m.desc && <div style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.5, marginTop: 5 }}>{m.desc}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* benefícios (quando não tem lista de mensagens) */}
          {contents.length === 0 && mensagensLista.length === 0 && beneficios.length > 0 && (
            <div style={{ borderTop: "0.5px solid #25291F" }}>
              {beneficios.map((b, i) => (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "32px 1fr",
                  gap: 14, padding: "18px 0",
                  borderBottom: "0.5px solid #25291F", alignItems: "baseline",
                }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 14, color: ac }}>→</span>
                  <div style={{ fontSize: 18, fontWeight: 500, color: "var(--cream)" }}>{b}</div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* ── COMO USAR ──────────────────────────────────────────────────────── */}
      <div className="ld-sec">
        <div className="ld-wrap">
          <SecMark label="Como você usa" accent={ac} />
          <div className="ld-sec-grid" style={{ marginBottom: 36 }}>
            <h2 style={{
              fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 700,
              letterSpacing: "-0.035em", lineHeight: 1.04, color: "var(--cream)",
            }}>
              Comprou, abriu, <em style={{ fontStyle: "italic", color: ac }}>ministrou</em>.
            </h2>
            <p style={{ fontSize: 18, lineHeight: 1.62, color: "var(--light)" }}>
              Conteúdo pronto pra ensinar. Você não monta nada do zero: abre o arquivo e ministra.
            </p>
          </div>
          <div className="ld-steps-grid">
            {COMO_USAR.map(s => (
              <div key={s.num} style={{
                background: "#181B16", border: "0.5px solid #2E3327",
                borderRadius: 12, padding: "30px 26px",
              }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 12, letterSpacing: "0.1em", color: ac }}>Passo {s.num}</div>
                <h4 style={{ fontSize: 21, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--cream)", margin: "16px 0 10px" }}>{s.titulo}</h4>
                <p style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.55 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── TESE ───────────────────────────────────────────────────────────── */}
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
            Estrutura ministerial pra líderes locais. A gente carrega o peso do conteúdo pra você carregar gente.
          </p>
        </div>
      </div>

      {/* ── OFERTA ─────────────────────────────────────────────────────────── */}
      <div id="oferta" className="ld-sec">
        <div className="ld-wrap">
          <div className="ld-offer-grid" style={{
            background: "#181B16", border: "0.5px solid #2E3327",
            borderTop: `2px solid ${ac}`, borderRadius: 18,
            padding: "clamp(32px, 5vw, 54px) clamp(24px, 5vw, 56px)",
            boxShadow: "0 30px 70px -45px rgba(0,0,0,.9)",
          }}>
            <div>
              <SecMark label="A oferta" accent={ac} />
              <h2 style={{
                fontSize: 34, fontWeight: 700, letterSpacing: "-0.03em",
                lineHeight: 1.1, color: "var(--cream)",
              }}>
                <em style={{ fontStyle: "normal", color: ac }}>{raw.titulo}</em>
                {raw.mensagens ? ` · ${raw.mensagens} encontros prontos pra ministrar` : ""}
              </h2>
              <ul style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 11 }}>
                {[...ofertaItens, "Acesso vitalício, sem mensalidade", `Entregue em ${formatos.join(" · ")}`].map((b, i) => (
                  <li key={i} style={{
                    listStyle: "none", fontSize: 15, color: "var(--light)",
                    display: "flex", gap: 12, alignItems: "baseline",
                  }}>
                    <span style={{ color: ac, fontFamily: "var(--mono)", flexShrink: 0 }}>→</span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <div className="ld-offer-right">
              <div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--muted)", letterSpacing: "0.04em" }}>Compra única · sem mensalidade</div>
                <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: "-0.04em", color: "var(--white)", lineHeight: 1 }}>{preco}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--muted)", marginTop: 6 }}>acesso vitalício ao arquivo</div>
              </div>
              <a href={checkoutHref} rel="noopener noreferrer" className="ld-btn-buy"
                style={{ background: ac }}>
                Comprar agora →
              </a>
              <div style={{
                fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.04em",
                color: "var(--muted)", maxWidth: 230, textAlign: "right", lineHeight: 1.5,
              }}>
                <span style={{ color: ac }}>◇ </span>
                Liberação imediata no seu perfil. Compra única e acesso vitalício.
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
                  Da mesma <em style={{ fontStyle: "italic", color: ac }}>estante</em>
                </h2>
                <div style={{ fontFamily: "var(--mono)", fontSize: 12, letterSpacing: "0.04em", color: "var(--muted)", marginTop: 8 }}>
                  Mais materiais pra {raw.etiqueta}
                </div>
              </div>
              <Link href="/materiais" style={{
                fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.08em",
                textTransform: "uppercase", color: "var(--muted)", textDecoration: "none",
              }}>Ver a estante toda →</Link>
            </div>
            <div className="ld-rel-grid">
              {relacionados.map(m => (
                <Link key={m.id} href={`/materiais/${m.id}`} className="ld-rcard"
                  style={{ borderTop: `2px solid ${ac}` }}>
                  <div style={{
                    flex: 1, background: "#0E110D", padding: 18,
                    display: "flex", flexDirection: "column", justifyContent: "space-between",
                  }}>
                    <span style={{
                      fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.14em",
                      textTransform: "uppercase", color: ac,
                      display: "inline-flex", gap: 6, alignItems: "center",
                    }}><span style={{ fontSize: 7 }}>◆</span>{m.etiqueta}</span>
                    <span style={{
                      fontSize: 27, fontWeight: 800, letterSpacing: "-0.035em",
                      lineHeight: 0.95, color: "#EDE6D3",
                    }}>{m.titulo}</span>
                  </div>
                  <div style={{
                    padding: "14px 18px 16px", borderTop: "0.5px solid #25291F",
                    display: "flex", flexDirection: "column", gap: 10,
                  }}>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--muted)" }}>
                      {[m.mensagens ? `${m.mensagens} mensagens` : "", m.paginas ? `${m.paginas} pág` : ""].filter(Boolean).join(" · ")}
                    </span>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 8 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: "var(--white)" }}>{/^R\$/.test(m.preco) ? m.preco : `R$ ${m.preco}`}</span>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: ac }}>Ver →</span>
                    </div>
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
                Antes de <em style={{ fontStyle: "italic", color: ac }}>comprar</em>.
              </h2>
            </div>
            <div style={{ borderTop: "0.5px solid #25291F" }}>
              {faq.map((f, i) => (
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
            Pare de montar do zero{" "}
            <em style={{ fontStyle: "normal", color: ac }}>toda semana</em>.
          </h2>
          <p style={{ fontSize: 18, color: "var(--light)", marginTop: 22 }}>
            Leve {raw.titulo} e ministre com chão já no próximo encontro.
          </p>
          <a href={checkoutHref} rel="noopener noreferrer" className="ld-btn-buy"
            style={{
              background: ac, display: "inline-flex",
              marginTop: 36, fontSize: 17, padding: "18px 36px",
              boxShadow: `0 12px 30px -14px ${ac}`,
            }}>
            Comprar agora →
          </a>
          <div style={{
            fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.04em",
            color: "var(--muted)", marginTop: 18,
          }}>
            <span style={{ color: ac }}>◇ </span>
            Liberação imediata no seu perfil. Compra única, acesso vitalício.
          </div>
        </div>
      </div>
    </>
  );
}
