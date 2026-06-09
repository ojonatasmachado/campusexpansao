"use client";
import React from "react";
import { ACCENTS } from "./ProdCard";
import type { AccentKey } from "./ProdCard";

// ─── DADOS ────────────────────────────────────────────────────────────────────
export interface CursoDado {
  num: string;
  nivel: "fundacao" | "lideranca" | "multiplicacao";
  title: string;
  desc: string;
  dur: string;
}

interface Nivel { key: CursoDado["nivel"]; label: string; accent: AccentKey }

export const NIVEIS: Nivel[] = [
  { key: "fundacao",      label: "Fundação",      accent: "ochre" },
  { key: "lideranca",     label: "Liderança",     accent: "clay"  },
  { key: "multiplicacao", label: "Multiplicação", accent: "olive" },
];

export const CURSOS_DATA: CursoDado[] = [
  { num: "01", nivel: "fundacao",      title: "Fundamentos da Estrutura", desc: "Por que estrutura honra o agir de Deus. O alicerce de todo ministério que multiplica.", dur: "4 semanas" },
  { num: "04", nivel: "fundacao",      title: "Gestão de Equipe",         desc: "Reuniões que decidem, processos que documentam, pessoas que crescem com o sistema.", dur: "5 semanas" },
  { num: "02", nivel: "lideranca",     title: "Formação de Líderes",      desc: "Como identificar, treinar e soltar líderes que não dependem de você pra funcionar.", dur: "6 semanas" },
  { num: "06", nivel: "lideranca",     title: "Liderança e Descanso",     desc: "Como liderar sem queimar. Ritmo sustentável pra quem carrega muita responsabilidade.", dur: "4 semanas" },
  { num: "03", nivel: "multiplicacao", title: "Discipulado Intencional",  desc: "Um sistema de discipulado que nasce com data pra multiplicar, não só informar.", dur: "8 semanas" },
  { num: "05", nivel: "multiplicacao", title: "Plantação de Igrejas",     desc: "Estrutura mínima viável pra plantar com saúde e multiplicar com intenção.", dur: "10 semanas" },
];

// ─── CARD ─────────────────────────────────────────────────────────────────────
export function CursoCard({ curso, accentKey, onClick }: {
  curso: CursoDado;
  accentKey: AccentKey;
  onClick?: () => void;
}) {
  const accent = ACCENTS[accentKey];
  const nivel = NIVEIS.find(n => n.key === curso.nivel)!;

  return (
    <div
      className="cex-card"
      style={{ "--cex-accent": accent.base, "--cex-accent-deep": accent.deep } as React.CSSProperties}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
    >
      {/* MIOLO */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "18px 20px 16px",
        background: accent.deep,
        position: "relative",
        overflow: "hidden",
        minHeight: 160,
      }}>
        {/* Textura sutil */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "repeating-linear-gradient(45deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 8px)",
        }} />

        {/* TOPO: nível + badge AO VIVO */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", gap: 8 }}>
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
        <div style={{ position: "relative" }}>
          <div style={{
            fontSize: 22,
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            color: "var(--cream, #EDE6D3)",
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
      <div className="cex-card-foot">
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
  );
}

// ─── GRADE POR NÍVEL ─────────────────────────────────────────────────────────
export function CursosNiveis({ onCardClick }: { onCardClick?: (c: CursoDado) => void }) {
  return (
    <>
      {NIVEIS.map((nivel) => {
        const cursosDoNivel = CURSOS_DATA.filter(c => c.nivel === nivel.key);
        const accent = ACCENTS[nivel.accent];
        return (
          <div key={nivel.key} className="loja-shelf">
            <div className="loja-shelf-head">
              <span className="loja-shelf-name" style={{ color: accent.base }}>
                ◆ {nivel.label}
              </span>
              <span className="loja-shelf-count">{cursosDoNivel.length} cursos</span>
            </div>
            <div className="loja-shelf-grid">
              {cursosDoNivel.map(c => (
                <CursoCard key={c.num} curso={c} accentKey={nivel.accent}
                  onClick={onCardClick ? () => onCardClick(c) : undefined} />
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}
