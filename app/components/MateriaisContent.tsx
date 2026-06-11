"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ProdCard, ModelA, ModelB, ModelC, ModelD } from "./ProdCard";
import type { Modelo } from "./ProdCard";
import { ACCENTS } from "../lib/accents";
import type { AccentKey } from "../lib/accents";
import {
  MATERIAIS, ESTANTES, ESTANTE_MAP, ESTANTES_MINISTRAR, ESTANTES_LIDERAR,
  INFANTIL_CHIP, L2_MINISTRAR, INFANTIL_ESTANTES,
} from "../lib/materiais-data";
import type { Material, Familia, Colecao, Estante } from "../lib/materiais-data";

const SHELF_CAROUSEL_THRESHOLD = 6;

type FiltroL1 = "tudo" | Familia | "eventos";


// ─── SHELF CAROUSEL ───────────────────────────────────────────────────────────
function ShelfCarousel({ materiais, accentKey, onCardClick }: { materiais: Material[]; accentKey: AccentKey; onCardClick: (m: Material) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: "left" | "right") => {
    trackRef.current?.scrollBy({ left: dir === "left" ? -350 : 350, behavior: "smooth" });
  };
  return (
    <div className="loja-shelf-carousel">
      <div className="loja-carousel-track" ref={trackRef}>
        {materiais.map((m, i) => {
          const model = (["A","C","B"] as const)[i % 3] as Modelo;
          const big = (m.meta.mensagens ?? m.meta.paginas).toString();
          const bigLabel = m.meta.mensagens != null ? "mensagens" : "páginas";
          return <ProdCard key={m.id} material={{...m, model, big, bigLabel}} accentKey={accentKey} onClick={() => onCardClick(m)} />;
        })}
      </div>
      <div className="loja-carousel-arrows">
        <button className="loja-carousel-arrow" onClick={() => scroll("left")} aria-label="Anterior">←</button>
        <button className="loja-carousel-arrow" onClick={() => scroll("right")} aria-label="Próximo">→</button>
      </div>
    </div>
  );
}

// ─── SHELF ────────────────────────────────────────────────────────────────────
function Shelf({ estante, materiais, onCardClick, onVerTodos }: {
  estante: Estante;
  materiais: Material[];
  onCardClick: (m: Material) => void;
  onVerTodos: (e: Estante) => void;
}) {
  if (materiais.length === 0) return null;
  const accent = ACCENTS[estante.accent];
  const isCarousel = materiais.length > SHELF_CAROUSEL_THRESHOLD;
  return (
    <div className="loja-shelf">
      <div className="loja-shelf-head">
        <span className="loja-shelf-name" style={{ color: accent.base }}>◆ {estante.label}</span>
        {estante.faixaEtaria && (
          <span className="loja-shelf-count">· {estante.faixaEtaria}</span>
        )}
        <span className="loja-shelf-count">{materiais.length} {materiais.length === 1 ? "material" : "materiais"}</span>
        {isCarousel && (
          <button className="loja-shelf-ver" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }} onClick={() => onVerTodos(estante)}>
            Ver todos
          </button>
        )}
      </div>
      {isCarousel ? (
        <ShelfCarousel materiais={materiais} accentKey={estante.accent} onCardClick={onCardClick} />
      ) : (
        <div className="loja-shelf-grid">
          {materiais.map((m, i) => {
            const model = (["A","C","B"] as const)[i % 3] as Modelo;
            const big = (m.meta.mensagens ?? m.meta.paginas).toString();
            const bigLabel = m.meta.mensagens != null ? "mensagens" : "páginas";
            return <ProdCard key={m.id} material={{...m, model, big, bigLabel}} accentKey={estante.accent} onClick={() => onCardClick(m)} />;
          })}
        </div>
      )}
    </div>
  );
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
function Modal({ material, onClose }: { material: Material; onClose: () => void }) {
  const estante = ESTANTE_MAP[material.estante];
  const accentKey = estante?.accent || "olive";
  const accent = ACCENTS[accentKey];

  const shelfItems = MATERIAIS.filter(mi => mi.estante === material.estante);
  const posInShelf = shelfItems.findIndex(mi => mi.id === material.id);
  const derivedModel = (["A","C","B"] as const)[Math.max(0, posInShelf) % 3] as Modelo;
  const derivedBig = (material.meta.mensagens ?? material.meta.paginas).toString();
  const derivedBigLabel = material.meta.mensagens != null ? "mensagens" : "páginas";

  const relacionados = MATERIAIS.filter(
    (m) => m.estante === material.estante && m.id !== material.id
  ).slice(0, 3);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", handleKey); };
  }, [onClose]);

  const metaStr = [
    material.meta.mensagens ? `${material.meta.mensagens} mensagens` : null,
    `${material.meta.paginas} páginas`,
  ].filter(Boolean).join(" · ");

  return (
    <div className="loja-modal">
      <div className="loja-modal-backdrop" onClick={onClose} />
      <div className="loja-modal-inner">
        <div className="loja-modal-bar">
          <span className="loja-modal-breadcrumb">Materiais → {material.etiqueta}</span>
          <button className="loja-modal-close" onClick={onClose}>Fechar ×</button>
        </div>
        <div className="loja-detail">
          <div className="loja-detail-hero">
            <div className="loja-detail-capa"
              style={{ "--cex-accent": accent.base, "--cex-accent-deep": accent.deep } as React.CSSProperties}>
              {derivedModel === "A" && <ModelA etiqueta={material.etiqueta} titulo={material.titulo} code={material.code} />}
              {derivedModel === "B" && <ModelB etiqueta={material.etiqueta} titulo={material.titulo} code={material.code} />}
              {derivedModel === "C" && <ModelC etiqueta={material.etiqueta} titulo={material.titulo} big={derivedBig} bigLabel={derivedBigLabel} />}
            </div>
            <div>
              <div className="loja-detail-meta-row">
                <span className="loja-detail-etiqueta" style={{ color: accent.base, background: `${accent.base}18`, borderColor: `${accent.base}44` }}>{material.etiqueta}</span>
                {material.colecoes.length > 0 && (
                  <span className="loja-detail-etiqueta" style={{ color: "var(--muted)", background: "var(--card)", borderColor: "var(--border-2)" }}>
                    {material.colecoes.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(", ")}
                  </span>
                )}
              </div>
              <div className="loja-detail-titulo">{material.titulo}</div>
              <p className="loja-detail-promessa">{material.promessa}</p>
            </div>
          </div>

          <div className="loja-detail-sec">
            <div className="loja-detail-sec-label">◆ Pra quem é</div>
            <p className="loja-detail-text">{material.praQuem}</p>
          </div>

          <div className="loja-detail-sec">
            <div className="loja-detail-sec-label">◆ O que vem dentro · {metaStr}</div>
            <ul className="loja-detail-list">
              {material.conteudo.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </div>

          <div className="loja-detail-sec">
            <div className="loja-detail-sec-label">◆ Como usar</div>
            <p className="loja-detail-text">{material.comoUsar}</p>
            <div className="loja-detail-formatos">
              {material.meta.formatos.map((f) => (
                <span key={f} className="loja-detail-formato" style={{ color: accent.base, borderColor: `${accent.base}44` }}>{f}</span>
              ))}
            </div>
          </div>

          <div className="loja-detail-sec">
            <div className="loja-detail-preco-block">
              <div>
                <div className="loja-detail-preco-val" style={{ color: accent.base }}>{material.preco}</div>
                <div className="loja-detail-preco-desc">Compra única · Acesso vitalício</div>
              </div>
              <div className="loja-detail-preco-info" />
              <a href={material.hotmartUrl} target="_blank" rel="noopener noreferrer"
                style={{ background: accent.base, color: "#0E110D", borderColor: accent.base } as React.CSSProperties}
                className="btn btn-lg btn-arrow">Comprar</a>
            </div>
          </div>

          {relacionados.length > 0 && (
            <div className="loja-detail-sec">
              <div className="loja-detail-sec-label">◆ Da mesma estante</div>
              <div className="loja-relacionados">
                {relacionados.map((m) => {
                  const allInShelf = MATERIAIS.filter(mi => mi.estante === material.estante);
                  const pos = allInShelf.findIndex(mi => mi.id === m.id);
                  const relModel = (["A","C","B"] as const)[Math.max(0, pos) % 3] as Modelo;
                  const relBig = (m.meta.mensagens ?? m.meta.paginas).toString();
                  const relBigLabel = m.meta.mensagens != null ? "mensagens" : "páginas";
                  return <ProdCard key={m.id} material={{...m, model: relModel, big: relBig, bigLabel: relBigLabel}} accentKey={accentKey} onClick={() => {}} />;
                })}
              </div>
            </div>
          )}

          <div className="loja-detail-sec">
            <div className="loja-detail-sec-label">◆ Perguntas frequentes</div>
            {material.faq.map((item, i) => (
              <div key={i} className="loja-detail-faq-item">
                <div className="loja-detail-faq-q">{item.q}</div>
                <div className="loja-detail-faq-a">{item.a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SHELF MODAL ─────────────────────────────────────────────────────────────
function ShelfModal({ estante, materiais, onCardClick, onClose }: {
  estante: Estante;
  materiais: Material[];
  onCardClick: (m: Material) => void;
  onClose: () => void;
}) {
  const accent = ACCENTS[estante.accent];

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", handleKey); };
  }, [onClose]);

  return (
    <div className="loja-modal">
      <div className="loja-modal-backdrop" onClick={onClose} />
      <div className="loja-modal-inner">
        <div className="loja-modal-bar">
          <span className="loja-modal-breadcrumb">Materiais → {estante.label}</span>
          <button className="loja-modal-close" onClick={onClose}>Fechar ×</button>
        </div>
        <div className="loja-detail">
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: accent.base, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>◆ Estante</div>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--white)" }}>{estante.label}</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>{materiais.length} materiais disponíveis</div>
          </div>
          <div className="loja-shelf-grid">
            {materiais.map((m, i) => {
              const model = (["A","C","B"] as const)[i % 3] as Modelo;
              const big = (m.meta.mensagens ?? m.meta.paginas).toString();
              const bigLabel = m.meta.mensagens != null ? "mensagens" : "páginas";
              return <ProdCard key={m.id} material={{...m, model, big, bigLabel}} accentKey={estante.accent} onClick={() => onCardClick(m)} />;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function MateriaisContent({ showHero = true, showCrossLink = true }: { showHero?: boolean; showCrossLink?: boolean }) {
  const [filtroL1, setFiltroL1] = useState<FiltroL1>("tudo");
  const [estanteAtiva, setEstanteAtiva] = useState<string | null>(null);
  const [faixaInfantil, setFaixaInfantil] = useState<string | null>(null);
  const [materialAberto, setMaterialAberto] = useState<Material | null>(null);
  const [estanteAberta, setEstanteAberta] = useState<Estante | null>(null);

  const handleL1 = useCallback((f: FiltroL1) => { setFiltroL1(f); setEstanteAtiva(null); setFaixaInfantil(null); }, []);
  const handleL2 = useCallback((k: string) => { setEstanteAtiva((prev) => (prev === k ? null : k)); setFaixaInfantil(null); }, []);
  const handleFaixa = useCallback((k: string) => { setFaixaInfantil((prev) => (prev === k ? null : k)); }, []);

  const estantesVisiveis = (lista: Estante[]) => lista.filter((e) => !estanteAtiva || e.key === estanteAtiva);
  const infantilVisiveis = () => estanteAtiva === "infantil" || !estanteAtiva
    ? INFANTIL_ESTANTES.filter(e => !faixaInfantil || e.key === faixaInfantil)
    : [];
  const materiaisDe = (estante: string) => MATERIAIS.filter((m) => m.estante === estante);

  const eventosGrupos: Record<string, Material[]> = {};
  MATERIAIS.forEach((m) => m.colecoes.forEach((c) => {
    if (!eventosGrupos[c]) eventosGrupos[c] = [];
    eventosGrupos[c].push(m);
  }));
  const eventosLabels: Record<string, string> = { retiro: "Retiro", conferencia: "Conferência" };

  const l2Options = filtroL1 === "ministrar" ? L2_MINISTRAR : filtroL1 === "liderar" ? ESTANTES_LIDERAR : null;
  const showFaixaInfantil = filtroL1 === "ministrar" && estanteAtiva === "infantil";

  return (
    <>
      {showHero && (
        <div className="loja-hero pg-wrap">
          <div className="loja-hero-tag">◆ Materiais editáveis</div>
          <h1 className="loja-hero-title">
            Para <em>ministrar.</em><br />Para <em>liderar.</em>
          </h1>
          <p className="loja-hero-desc">
            Séries prontas e ferramentas de gestão: compra única, editável, pronto pra usar no seu contexto.
          </p>
        </div>
      )}

      <div className="loja-filter-bar">
        <div className="pg-wrap">
          <div className="loja-filter-l1">
            {(["tudo", "ministrar", "liderar", "eventos"] as FiltroL1[]).map((f) => {
              const labels: Record<FiltroL1, string> = { tudo: "Tudo", ministrar: "Para ministrar", liderar: "Para liderar", eventos: "Eventos" };
              return (
                <button key={f} className={`loja-filter-btn${filtroL1 === f ? " ativo" : ""}`} onClick={() => handleL1(f)}>
                  {labels[f]}
                </button>
              );
            })}
          </div>
          {l2Options && (
            <div className="loja-filter-l2">
              {l2Options.map((e) => (
                <button key={e.key}
                  className={`loja-filter-btn${estanteAtiva === e.key ? " ativo" : ""}`}
                  style={{ "--cex-accent": ACCENTS[e.accent].base } as React.CSSProperties}
                  onClick={() => handleL2(e.key)}>
                  {e.label}
                </button>
              ))}
            </div>
          )}
          {showFaixaInfantil && (
            <div className="loja-filter-l2">
              <button className={`loja-filter-btn${!faixaInfantil ? " ativo" : ""}`} onClick={() => setFaixaInfantil(null)}>Todas</button>
              {INFANTIL_ESTANTES.map((e) => (
                <button key={e.key}
                  className={`loja-filter-btn${faixaInfantil === e.key ? " ativo" : ""}`}
                  style={{ "--cex-accent": ACCENTS[e.accent].base } as React.CSSProperties}
                  onClick={() => handleFaixa(e.key)}>
                  {e.label} <span style={{ color: "var(--subtle)", marginLeft: 4 }}>{e.faixaEtaria}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="pg-wrap pg-section">
        {filtroL1 === "eventos" && (
          <div>
            {Object.entries(eventosGrupos).map(([colecao, mats]) => (
              <div key={colecao} className="loja-eventos-grupo">
                <div className="loja-eventos-label">{eventosLabels[colecao] ?? colecao}</div>
                <div className="loja-shelf-grid">
                  {mats.map((m) => {
                    const e = ESTANTE_MAP[m.estante];
                    return <ProdCard key={m.id} material={m} accentKey={e?.accent || "olive"} onClick={() => setMaterialAberto(m)} />;
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {(filtroL1 === "tudo" || filtroL1 === "ministrar") && (
          <div className="loja-familia">
            {filtroL1 === "tudo" && (
              <div className="loja-familia-head">
                <span className="loja-familia-eyebrow">◆</span>
                <div className="loja-familia-title">Para <em>ministrar</em></div>
              </div>
            )}
            {infantilVisiveis().map((e) => (
              <Shelf key={e.key} estante={e} materiais={materiaisDe(e.key)} onCardClick={setMaterialAberto} onVerTodos={setEstanteAberta} />
            ))}
            {estanteAtiva !== "infantil" && estantesVisiveis(ESTANTES_MINISTRAR).map((e) => (
              <Shelf key={e.key} estante={e} materiais={materiaisDe(e.key)} onCardClick={setMaterialAberto} onVerTodos={setEstanteAberta} />
            ))}
          </div>
        )}

        {(filtroL1 === "tudo" || filtroL1 === "liderar") && (
          <div className="loja-familia">
            {filtroL1 === "tudo" && (
              <div className="loja-familia-head">
                <span className="loja-familia-eyebrow">◆</span>
                <div className="loja-familia-title">Para <em>liderar</em></div>
              </div>
            )}
            {estantesVisiveis(ESTANTES_LIDERAR).map((e) => (
              <Shelf key={e.key} estante={e} materiais={materiaisDe(e.key)} onCardClick={setMaterialAberto} onVerTodos={setEstanteAberta} />
            ))}
          </div>
        )}
      </div>

      {showCrossLink && (
        <div className="pg-wrap" style={{ paddingBottom: 64 }}>
          <div style={{
            background: "var(--graphite)",
            border: "0.5px solid var(--border-2)",
            borderRadius: "var(--r-lg)",
            padding: "32px 40px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 24,
            flexWrap: "wrap",
          }}>
            <div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--olive)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>◆ Quer ir além do material pronto?</div>
              <p style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--white)" }}>
                Precisa de formação ao vivo, não só de material pronto?
              </p>
            </div>
            <a href="/cursos" className="btn btn-primary btn-arrow">Conheça os cursos</a>
          </div>
        </div>
      )}

      {estanteAberta && (
        <ShelfModal
          estante={estanteAberta}
          materiais={materiaisDe(estanteAberta.key)}
          onCardClick={(m) => { setEstanteAberta(null); setMaterialAberto(m); }}
          onClose={() => setEstanteAberta(null)}
        />
      )}

      {materialAberto && (
        <Modal material={materialAberto} onClose={() => setMaterialAberto(null)} />
      )}
    </>
  );
}
