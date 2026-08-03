"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { ProdCard } from "./ProdCard";
import type { Modelo } from "./ProdCard";
import { ACCENTS } from "../lib/accents";
import type { AccentKey } from "../lib/accents";
import { MATERIAIS, ESTANTES, ESTANTE_MAP } from "../lib/materiais-data";
import type { Material, Familia, Estante } from "../lib/materiais-data";
import type { DbEstante, DbMaterial } from "../lib/types";
import { dbEstanteToEstante, dbMaterialToMaterial } from "../lib/material-mappers";

const SHELF_CAROUSEL_THRESHOLD = 6;

type FiltroL1 = "tudo" | Familia | "eventos";


// ─── SHELF CAROUSEL ───────────────────────────────────────────────────────────
function ShelfCarousel({ materiais, accentKey }: { materiais: Material[]; accentKey: AccentKey }) {
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
          return (
            <Link key={m.id} href={`/materiais/${m.id}`} style={{ textDecoration: "none" }}>
              <ProdCard material={{...m, model, big, bigLabel}} accentKey={accentKey} onClick={() => {}} />
            </Link>
          );
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
function Shelf({ estante, materiais, onVerTodos }: {
  estante: Estante;
  materiais: Material[];
  onVerTodos: (e: Estante) => void;
}) {
  if (materiais.length === 0) return null;
  const accent = ACCENTS[estante.accent];
  const isCarousel = materiais.length > SHELF_CAROUSEL_THRESHOLD;
  return (
    <div className="loja-shelf">
      <div className="loja-shelf-head">
        <span className="loja-shelf-name" style={{ color: accent.base }}>{estante.label}</span>
        {estante.faixaEtaria && (
          <span className="loja-shelf-count">· {estante.faixaEtaria}</span>
        )}
        <span className="loja-shelf-count">· {materiais.length} {materiais.length === 1 ? "material" : "materiais"}</span>
        {isCarousel && (
          <button className="loja-shelf-ver" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }} onClick={() => onVerTodos(estante)}>
            Ver todos
          </button>
        )}
      </div>
      {isCarousel ? (
        <ShelfCarousel materiais={materiais} accentKey={estante.accent} />
      ) : (
        <div className="loja-shelf-grid">
          {materiais.map((m, i) => {
            const model = (["A","C","B"] as const)[i % 3] as Modelo;
            const big = (m.meta.mensagens ?? m.meta.paginas).toString();
            const bigLabel = m.meta.mensagens != null ? "mensagens" : "páginas";
            return (
              <Link key={m.id} href={`/materiais/${m.id}`} style={{ textDecoration: "none" }}>
                <ProdCard material={{...m, model, big, bigLabel}} accentKey={estante.accent} onClick={() => {}} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}


// ─── SHELF MODAL ─────────────────────────────────────────────────────────────
function ShelfModal({ estante, materiais, onClose }: {
  estante: Estante;
  materiais: Material[];
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
            <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: accent.base, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>Estante</div>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--white)" }}>{estante.label}</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>{materiais.length} materiais disponíveis</div>
          </div>
          <div className="loja-shelf-grid">
            {materiais.map((m, i) => {
              const model = (["A","C","B"] as const)[i % 3] as Modelo;
              const big = (m.meta.mensagens ?? m.meta.paginas).toString();
              const bigLabel = m.meta.mensagens != null ? "mensagens" : "páginas";
              return (
                <Link key={m.id} href={`/materiais/${m.id}`} style={{ textDecoration: "none" }}>
                  <ProdCard material={{...m, model, big, bigLabel}} accentKey={estante.accent} onClick={() => {}} />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function MateriaisContent({
  showHero = true, showCrossLink = true,
  dbEstantes, dbMateriais,
}: {
  showHero?: boolean; showCrossLink?: boolean
  dbEstantes?: DbEstante[]; dbMateriais?: DbMaterial[]
}) {
  // Usa dados do banco se disponíveis, senão fallback para estáticos
  const allEstantes = dbEstantes
    ? dbEstantes.filter(e => e.status === 'visible').map(dbEstanteToEstante)
    : ESTANTES
  const allMateriais = dbMateriais
    ? dbMateriais.map(dbMaterialToMaterial)
    : MATERIAIS

  const estantesMinistrar = allEstantes.filter(e => e.familia === "ministrar" && !e.key.startsWith("infantil-"))
  const estantesLiderar   = allEstantes.filter(e => e.familia === "liderar")
  const infantilEstantes  = allEstantes.filter(e => e.key.startsWith("infantil-"))
  const infantilChip      = { key: "infantil", label: "Infantil", accent: "wheat" as AccentKey }
  const l2Ministrar       = [infantilChip, ...estantesMinistrar]
  const estantePorKey     = Object.fromEntries(allEstantes.map((e) => [e.key, e]))

  const [filtroL1, setFiltroL1] = useState<FiltroL1>("tudo");
  const [estanteAtiva, setEstanteAtiva] = useState<string | null>(null);
  const [faixaInfantil, setFaixaInfantil] = useState<string | null>(null);
  const [estanteAberta, setEstanteAberta] = useState<Estante | null>(null);

  const handleL1 = useCallback((f: FiltroL1) => { setFiltroL1(f); setEstanteAtiva(null); setFaixaInfantil(null); }, []);
  const handleL2 = useCallback((k: string) => { setEstanteAtiva((prev) => (prev === k ? null : k)); setFaixaInfantil(null); }, []);
  const handleFaixa = useCallback((k: string) => { setFaixaInfantil((prev) => (prev === k ? null : k)); }, []);

  const estantesVisiveis = (lista: Estante[]) => lista.filter((e) => !estanteAtiva || e.key === estanteAtiva);
  const infantilVisiveis = () => estanteAtiva === "infantil" || !estanteAtiva
    ? infantilEstantes.filter(e => !faixaInfantil || e.key === faixaInfantil)
    : [];
  const materiaisDe = (estante: string) => allMateriais.filter((m) => m.estante === estante);

  const eventosGrupos: Record<string, Material[]> = {};
  allMateriais.forEach((m) => m.colecoes.forEach((c) => {
    if (!eventosGrupos[c]) eventosGrupos[c] = [];
    eventosGrupos[c].push(m);
  }));
  const eventosLabels: Record<string, string> = { retiro: "Retiro", conferencia: "Conferência" };

  const l2Options = filtroL1 === "ministrar" ? l2Ministrar : filtroL1 === "liderar" ? estantesLiderar : null;
  const showFaixaInfantil = filtroL1 === "ministrar" && estanteAtiva === "infantil";

  return (
    <>
      {showHero && (
        <div className="loja-hero pg-wrap">
          <div className="loja-hero-tag">Materiais editáveis</div>
          <h1 className="loja-hero-title">
            Para <em>ministrar.</em><br />Para <em>liderar.</em>
          </h1>
          <p className="loja-hero-desc">
            Séries prontas e ferramentas de gestão: compra única, editável, pronto pra usar no seu contexto.
          </p>
        </div>
      )}

      <div className={`loja-filter-bar${showHero ? "" : " loja-filter-bar--section"}`}>
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
              {infantilEstantes.map((e) => (
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
          <div className="loja-familia">
            <div className="loja-familia-head loja-familia-head--eventos">
              <div className="loja-familia-num" aria-hidden="true">03</div>
              <div className="loja-familia-inner">
                <div className="loja-familia-rule">
                  <span className="loja-familia-rule-seg loja-familia-rule-seg--terra" />
                </div>
                <div className="loja-familia-meta">
                  <span className="loja-familia-eyebrow loja-familia-eyebrow--terra">§ 03 · Ocasiões</span>
                  <div className="loja-familia-title loja-familia-title--terra">Eventos</div>
                  <p className="loja-familia-desc">Materiais para retiros, conferências e datas especiais da igreja local.</p>
                </div>
                <div className="loja-familia-counter">
                  {Object.keys(eventosGrupos).length} coleções
                </div>
              </div>
            </div>
            {Object.entries(eventosGrupos).map(([colecao, mats]) => (
              <div key={colecao} className="loja-eventos-grupo">
                <div className="loja-eventos-label">{eventosLabels[colecao] ?? colecao}</div>
                <div className="loja-shelf-grid">
                  {mats.map((m) => {
                    const e = estantePorKey[m.estante] ?? ESTANTE_MAP[m.estante];
                    return (
                      <Link key={m.id} href={`/materiais/${m.id}`} style={{ textDecoration: "none" }}>
                        <ProdCard material={m} accentKey={e?.accent || "olive"} onClick={() => {}} />
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {(filtroL1 === "tudo" || filtroL1 === "ministrar") && (
          <div className="loja-familia">
            <div className="loja-familia-head">
              <div className="loja-familia-num" aria-hidden="true">01</div>
              <div className="loja-familia-inner">
                <div className="loja-familia-rule">
                  <span className="loja-familia-rule-seg" />
                </div>
                <div className="loja-familia-meta">
                  <span className="loja-familia-eyebrow">§ 01 · Conteúdo</span>
                  <div className="loja-familia-title">Para <em>ministrar</em></div>
                  <p className="loja-familia-desc">Material por faixa e ocasião. Do berçário à igreja toda.</p>
                </div>
                <div className="loja-familia-counter">
                  {(infantilEstantes.length + estantesMinistrar.length)} faixas
                </div>
              </div>
            </div>
            {infantilVisiveis().map((e) => (
              <Shelf key={e.key} estante={e} materiais={materiaisDe(e.key)} onVerTodos={setEstanteAberta} />
            ))}
            {estanteAtiva !== "infantil" && estantesVisiveis(estantesMinistrar).map((e) => (
              <Shelf key={e.key} estante={e} materiais={materiaisDe(e.key)} onVerTodos={setEstanteAberta} />
            ))}
          </div>
        )}

        {(filtroL1 === "tudo" || filtroL1 === "liderar") && (
          <div className="loja-familia">
            <div className="loja-familia-head loja-familia-head--liderar">
              <div className="loja-familia-num" aria-hidden="true">02</div>
              <div className="loja-familia-inner">
                <div className="loja-familia-rule">
                  <span className="loja-familia-rule-seg loja-familia-rule-seg--olive" />
                </div>
                <div className="loja-familia-meta">
                  <span className="loja-familia-eyebrow loja-familia-eyebrow--olive">§ 02 · Estrutura</span>
                  <div className="loja-familia-title loja-familia-title--olive">Para <em>liderar</em></div>
                  <p className="loja-familia-desc">Ferramentas de gestão, formação e organização ministerial.</p>
                </div>
                <div className="loja-familia-counter">
                  {estantesLiderar.length} categorias
                </div>
              </div>
            </div>
            {estantesVisiveis(estantesLiderar).map((e) => (
              <Shelf key={e.key} estante={e} materiais={materiaisDe(e.key)} onVerTodos={setEstanteAberta} />
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
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--olive)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>Quer ir além do material pronto?</div>
              <p style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--white)" }}>
                Precisa de formação ao vivo, não só de material pronto?
              </p>
            </div>
            <Link href="/cursos" className="btn btn-primary btn-arrow">Conheça os cursos</Link>
          </div>
        </div>
      )}

      {estanteAberta && (
        <ShelfModal
          estante={estanteAberta}
          materiais={materiaisDe(estanteAberta.key)}
          onClose={() => setEstanteAberta(null)}
        />
      )}
    </>
  );
}
