"use client";
import React from "react";

export type Modelo = "A" | "B" | "C" | "D";
export type AccentKey = "olive" | "clay" | "ochre" | "pine" | "slate";

export interface Accent { base: string; deep: string; name: string }

export const ACCENTS: Record<AccentKey, Accent> = {
  olive: { base: "#7A9E3F", deep: "#4F6B26", name: "Oliva" },
  clay:  { base: "#B07355", deep: "#7C4B33", name: "Argila" },
  ochre: { base: "#C0934E", deep: "#8A6630", name: "Ocre"  },
  pine:  { base: "#4F7264", deep: "#335147", name: "Pinho" },
  slate: { base: "#5C7488", deep: "#3C4E5C", name: "Ardósia" },
};

export interface CardMaterial {
  id: string;
  model: Modelo;
  etiqueta: string;
  titulo: string;
  code?: string;
  big?: string;
  bigLabel?: string;
  meta: { mensagens?: number; paginas: number; formatos: string[] };
  preco: string;
}

function Eyebrow({ children, variant = "default" }: { children: string; variant?: "default"|"dark"|"sand"|"cream" }) {
  const cls = { default: "cex-eyebrow", dark: "cex-eyebrow cex-eyebrow-dark", sand: "cex-eyebrow cex-eyebrow-sand", cream: "cex-eyebrow cex-eyebrow-cream" }[variant];
  return <div className={cls}>{children}</div>;
}

export function ModelA({ etiqueta, titulo, code }: { etiqueta: string; titulo: string; code?: string }) {
  return (
    <div className="cex-art-a">
      <div className="cex-art-a-top">
        <Eyebrow>{etiqueta}</Eyebrow>
        {code && <span className="cex-code">{code}</span>}
      </div>
      <div className="cex-art-a-title">{titulo}</div>
    </div>
  );
}

export function ModelB({ etiqueta, titulo, code }: { etiqueta: string; titulo: string; code?: string }) {
  return (
    <div className="cex-art-b">
      <div className="cex-art-b-header">
        <Eyebrow variant="dark">{etiqueta}</Eyebrow>
        {code && <span className="cex-code cex-code-dark">{code}</span>}
      </div>
      <div className="cex-art-b-body">
        <div className="cex-art-b-title">{titulo}</div>
      </div>
    </div>
  );
}

export function ModelC({ etiqueta, titulo, big, bigLabel }: { etiqueta: string; titulo: string; big?: string; bigLabel?: string }) {
  return (
    <div className="cex-art-c">
      <Eyebrow variant="sand">{etiqueta}</Eyebrow>
      <div className="cex-art-c-num-row">
        <span className="cex-art-c-num">{big}</span>
        {bigLabel && <span className="cex-art-c-label">{bigLabel}</span>}
      </div>
      <div className="cex-art-c-title">{titulo}</div>
    </div>
  );
}

export function ModelD({ etiqueta, titulo }: { etiqueta: string; titulo: string }) {
  return (
    <div className="cex-art-d">
      <div className="cex-art-d-bg" />
      <div className="cex-art-d-texture" />
      <div className="cex-art-d-scrim" />
      <div className="cex-art-d-content">
        <Eyebrow variant="cream">{etiqueta}</Eyebrow>
        <div className="cex-art-d-title">{titulo}</div>
      </div>
    </div>
  );
}

export function ProdCard({ material, accentKey, onClick }: {
  material: CardMaterial;
  accentKey: AccentKey;
  onClick?: () => void;
}) {
  const accent = ACCENTS[accentKey];
  const metaStr = [
    material.meta.mensagens ? `${material.meta.mensagens} mensagens` : null,
    `${material.meta.paginas} páginas`,
    material.meta.formatos[0],
  ].filter(Boolean).join(" · ");

  return (
    <div
      className="cex-card"
      style={{ "--cex-accent": accent.base, "--cex-accent-deep": accent.deep } as React.CSSProperties}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
    >
      {material.model === "A" && <ModelA etiqueta={material.etiqueta} titulo={material.titulo} code={material.code} />}
      {material.model === "B" && <ModelB etiqueta={material.etiqueta} titulo={material.titulo} code={material.code} />}
      {material.model === "C" && <ModelC etiqueta={material.etiqueta} titulo={material.titulo} big={material.big} bigLabel={material.bigLabel} />}
      {material.model === "D" && <ModelD etiqueta={material.etiqueta} titulo={material.titulo} />}
      <div className="cex-card-foot">
        <div className="cex-foot-meta">{metaStr}</div>
        <div className="cex-foot-price-row">
          <span className="cex-foot-price">{material.preco}</span>
          <span className="cex-foot-ver">Ver material →</span>
        </div>
      </div>
    </div>
  );
}
