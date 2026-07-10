"use client";
import React from "react";
import Link from "next/link";
import { ACCENTS } from "../lib/accents";
import { NIVEIS, CURSOS_DATA } from "../lib/cursos-data";
import type { CursoDado } from "../lib/cursos-data";
import type { DbCurso, DbMentoria } from "../lib/types";

export type { CursoDado };
export { NIVEIS, CURSOS_DATA };

function dbCursoToCursoDado(c: DbCurso): CursoDado {
  return {
    num: c.num, slug: c.slug, nivel: c.nivel as CursoDado['nivel'],
    title: c.title, desc: c.desc_text, dur: c.dur,
    promessa: '', praQuem: '', ementa: [], formato: '',
    mentor: c.mentor, mentorBio: '',
    depoimento: { texto: '', autor: '', cargo: '' },
    turma: c.turma,
  }
}

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

// ─── CARD MENTORIA ────────────────────────────────────────────────────────────
export function MentoriaCard({ mentoria }: { mentoria: DbMentoria }) {
  return (
    <div className="cex-course" style={{ "--cex-ac": mentoria.accent } as React.CSSProperties}>
      <div className="cex-course__body">
        <div className="cex-course__top">
          <span className="cex-course__eyebrow">Mentoria</span>
          {mentoria.vagas > 0 && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: mentoria.accent, letterSpacing: '.06em' }}>
              {mentoria.vagas} vagas
            </span>
          )}
        </div>
        <div className="cex-course__head">
          <h3 className="cex-course__title">{mentoria.title}</h3>
          <p className="cex-course__desc">{mentoria.desc_text}</p>
        </div>
      </div>
      <div className="cex-course__foot">
        <div className="cex-course__meta">
          <span className="cex-course__meta-dot" />
          {mentoria.cadencia || mentoria.formato}
        </div>
        <div className="cex-course__foot-row">
          <span className="cex-course__stage">{mentoria.mentor}</span>
          <span className="cex-course__more">Entrar na lista →</span>
        </div>
      </div>
    </div>
  );
}

// ─── GRADE POR NÍVEL ─────────────────────────────────────────────────────────
export function CursosNiveis({ dbCursos, dbMentorias }: { dbCursos?: DbCurso[]; dbMentorias?: DbMentoria[] }) {
  const cursos = dbCursos ? dbCursos.map(dbCursoToCursoDado) : CURSOS_DATA
  const mentorias = dbMentorias ?? []

  return (
    <>
      {NIVEIS.map((nivel) => {
        const cursosDoNivel = cursos.filter(c => c.nivel === nivel.key);
        if (cursosDoNivel.length === 0) return null;

        const accent = ACCENTS[nivel.accent];
        return (
          <div key={nivel.key} className="loja-shelf">
            <div className="loja-shelf-head">
              <span className="loja-shelf-name" style={{ color: accent.base }}>◆ {nivel.label}</span>
              <span className="loja-shelf-count">· {cursosDoNivel.length} {cursosDoNivel.length === 1 ? "curso" : "cursos"}</span>
            </div>
            <div className="loja-shelf-grid">
              {cursosDoNivel.map(c => <CursoCard key={c.num} curso={c} />)}
            </div>
          </div>
        );
      })}
      {mentorias.length > 0 && (
        <div className="loja-shelf">
          <div className="loja-shelf-head">
            <span className="loja-shelf-name" style={{ color: 'var(--olive)' }}>◆ Mentorias</span>
            <span className="loja-shelf-count">· {mentorias.length} {mentorias.length === 1 ? 'mentoria' : 'mentorias'}</span>
          </div>
          <div className="loja-shelf-grid">
            {mentorias.map(m => <MentoriaCard key={m.id} mentoria={m} />)}
          </div>
        </div>
      )}
    </>
  );
}
