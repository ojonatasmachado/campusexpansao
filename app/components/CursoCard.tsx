"use client";
import React from "react";
import Link from "next/link";
import { ACCENTS } from "../lib/accents";
import { NIVEIS, CURSOS_DATA } from "../lib/cursos-data";
import type { CursoDado } from "../lib/cursos-data";

export type { CursoDado };
export { NIVEIS, CURSOS_DATA };

// ─── CARD ─────────────────────────────────────────────────────────────────────
export function CursoCard({ curso }: { curso: CursoDado }) {
  const nivel = NIVEIS.find(n => n.key === curso.nivel)!;
  const accent = ACCENTS[nivel.accent];

  return (
    <Link
      href={`/cursos/${curso.slug}`}
      className="cex-course"
      style={{ "--cex-ac": accent.base } as React.CSSProperties}
    >
      <div className="cex-course__body">
        <div className="cex-course__top">
          <span className="cex-course__eyebrow">{nivel.label}</span>
          <span className="cex-live">
            <span className="cex-live__dot" />
            AO VIVO
          </span>
        </div>
        <div className="cex-course__head">
          <h3 className="cex-course__title">{curso.title}</h3>
          <p className="cex-course__desc">{curso.desc}</p>
        </div>
      </div>
      <div className="cex-course__foot">
        <div className="cex-course__meta">
          <span className="cex-course__meta-dot" />
          {curso.dur} · Mentoria inclusa
        </div>
        <div className="cex-course__foot-row">
          <span className="cex-course__stage">ETAPA {curso.num.padStart(2, "0")}</span>
          <span className="cex-course__more">Detalhes →</span>
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
