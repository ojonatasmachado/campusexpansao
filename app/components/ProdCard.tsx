"use client";
import React from "react";
import type { AccentKey, Accent } from "../lib/accents";
import { ACCENTS } from "../lib/accents";

export type { AccentKey, Accent } from "../lib/accents";
export { ACCENTS } from "../lib/accents";

export type Modelo = "A" | "B" | "C" | "D";

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

function FitTitle({
  children,
  className,
  max,
  min = 12,
}: {
  children: string;
  className: string;
  max: number;
  min?: number;
}) {
  const boxRef = React.useRef<HTMLDivElement>(null);
  const textRef = React.useRef<HTMLSpanElement>(null);
  const [fontSize, setFontSize] = React.useState(max);

  React.useLayoutEffect(() => {
    const box = boxRef.current;
    const text = textRef.current;
    if (!box || !text) return;

    let frame = 0;
    const fit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const width = box.clientWidth;
        const height = box.clientHeight;
        if (!width || !height) return;

        let lo = min;
        let hi = max;
        let best = min;

        for (let i = 0; i < 12; i += 1) {
          const mid = (lo + hi) / 2;
          text.style.fontSize = `${mid}px`;

          const fitsWidth = text.scrollWidth <= width + 0.5;
          const fitsHeight = text.scrollHeight <= height + 0.5;

          if (fitsWidth && fitsHeight) {
            best = mid;
            lo = mid;
          } else {
            hi = mid;
          }
        }

        text.style.fontSize = `${best}px`;
        setFontSize(best);
      });
    };

    fit();

    const resizeObserver = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(fit)
      : null;
    resizeObserver?.observe(box);
    document.fonts?.ready.then(fit);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
    };
  }, [children, max, min]);

  return (
    <div className={className} ref={boxRef}>
      <span ref={textRef} className="cex-fit-title-text" style={{ fontSize }}>
        {children}
      </span>
    </div>
  );
}

export function ModelA({ etiqueta, titulo, code }: { etiqueta: string; titulo: string; code?: string }) {
  return (
    <div className="cex-art-a">
      <div className="cex-art-a-top">
        <Eyebrow>{etiqueta}</Eyebrow>
        {code && <span className="cex-code">{code}</span>}
      </div>
      <FitTitle className="cex-art-a-title" max={38} min={13}>{titulo}</FitTitle>
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
        <FitTitle className="cex-art-b-title" max={34} min={13}>{titulo}</FitTitle>
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
      <FitTitle className="cex-art-c-title" max={20} min={11}>{titulo}</FitTitle>
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
        <FitTitle className="cex-art-d-title" max={32} min={12}>{titulo}</FitTitle>
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
