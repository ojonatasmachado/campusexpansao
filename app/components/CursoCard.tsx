"use client";
import React from "react";
import Link from "next/link";
import { ACCENTS } from "./ProdCard";
import { NIVEIS, CURSOS_DATA } from "../lib/cursos-data";
import type { CursoDado } from "../lib/cursos-data";

export type { CursoDado };
export { NIVEIS, CURSOS_DATA };

// ─── CARD ─────────────────────────────────────────────────────────────────────
export function CursoCard({ curso }: { curso: CursoDado }) {
  const nivel = NIVEIS.find(n => n.key === curso.nivel)!;
  const accent = ACCENTS[nivel.accent];

  return (
    <Link href={`/cursos/${curso.slug}`} style={{ textDecoration: "none", display: "flex", flexDirection: "column" }}>
      <div
        className="cex-card"
        style={{ "--cex-accent": accent.base, "--cex-accent-deep": accent.deep, cursor: "pointer" } as React.CSSProperties}
      >
        {/* MIOLO — fundo ink com linhas-guia */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "18px 20px 16px",
          background: "#0E110D",
          backgroundImage: "linear-gradient(#25291F 1px, transparent 1px)",
          backgroundSize: "100% 44px",
          position: "relative",
          overflow: "hidden",
          minHeight: 160,
        }}>
          {/* TOPO: nível + badge AO VIVO */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <div style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: accent.base,
            }}>◆ {nivel.label}</div>
            <div style={{
              fontFamily: "var(--mono)",
              fontSize: 9,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              background: accent.base,
              color: "#0E110D",
              padding: "3px 8px",
              borderRadius: 4,
              fontWeight: 700,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}>● AO VIVO</div>
          </div>

          {/* BASE: título + desc */}
          <div>
            <div style={{
              fontSize: 22,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              color: "#EDE6D3",
              marginBottom: 8,
            }}>{curso.title}</div>
            <div style={{
              fontSize: 13,
              lineHeight: 1.45,
              color: "#C9BFA0",
            }}>{curso.desc}</div>
          </div>
        </div>

        {/* RODAPÉ */}
        <div className="cex-card-foot" style={{ background: "#181B16", borderTop: "1px solid #25291F" }}>
          <div className="cex-foot-meta">
            <span style={{ color: accent.base }}>●</span>{" "}{curso.dur} · Mentoria inclusa
          </div>
          <div className="cex-foot-price-row">
            <span style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: accent.base,
            }}>ETAPA {curso.num.padStart(2, "0")}</span>
            <span className="cex-foot-ver">Detalhes →</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── GRADE POR NÍVEL ─────────────────────────────────────────────────────────
export function CursosNiveis() {
  return (
    <>
      {NIVEIS.map((nivel) => {
        const cursosDoNivel = CURSOS_DATA.filter(c => c.nivel === nivel.key);
        const accent = ACCENTS[nivel.accent];
        return (
          <div key={nivel.key} className="loja-shelf">
            <div className="loja-shelf-head">
              <span className="loja-shelf-name" style={{ color: accent.base }}>◆ {nivel.label}</span>
              <span className="loja-shelf-count">{cursosDoNivel.length} cursos</span>
            </div>
            <div className="loja-shelf-grid">
              {cursosDoNivel.map(c => <CursoCard key={c.num} curso={c} />)}
            </div>
          </div>
        );
      })}
    </>
  );
}
