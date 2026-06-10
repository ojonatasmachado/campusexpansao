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
        <div className="cex-art-c">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div className="cex-eyebrow cex-eyebrow-sand">{nivel.label}</div>
            <div style={{
              fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.10em",
              textTransform: "uppercase", backgroundColor: accent.base,
              color: "#0E110D", padding: "3px 8px", borderRadius: 4,
              fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0,
            }}>● AO VIVO</div>
          </div>
          <div className="cex-art-c-num-row">
            <span className="cex-art-c-num">{curso.num.padStart(2, "0")}</span>
            <span className="cex-art-c-label">etapa</span>
          </div>
          <div className="cex-art-c-title">{curso.title}</div>
        </div>

        <div className="cex-card-foot">
          <div className="cex-foot-meta">{curso.dur} · Mentoria inclusa</div>
          <div className="cex-foot-price-row">
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
