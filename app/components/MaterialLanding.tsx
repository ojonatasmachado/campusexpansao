"use client";

import React from "react";
import Link from "next/link";
import { ProdCard, ModelA, ModelB, ModelC, ModelD } from "./ProdCard";
import type { Modelo } from "./ProdCard";
import { ACCENTS } from "../lib/accents";
import type { AccentKey } from "../lib/accents";
import { ESTANTE_MAP } from "../lib/materiais-data";
import type { Material, Familia, Colecao } from "../lib/materiais-data";

const HEX_TO_ACCENT: Record<string, AccentKey> = {
  '#E2D6B4': 'sand', '#CBA95C': 'wheat', '#D6A23E': 'amber', '#C5805A': 'clay',
  '#B5694A': 'terra', '#9C5A33': 'rust', '#6F523A': 'cocoa', '#7A9E3F': 'olive',
};

type DbEstante = { key: string; label: string; familia: string; accent: string; faixa_etaria: string; status: string; ord: number };
type DbMaterial = { id: string; familia: string; estante: string; model: string; etiqueta: string; titulo: string; code: string | null; big: string | null; big_label: string | null; promessa: string; mensagens: number | null; paginas: number; formatos: string[]; preco: string; hotmart_url: string; colecoes: string[]; pra_quem: string; conteudo: string[]; como_usar: string; faq: { q: string; a: string }[] };

function toMaterial(m: DbMaterial): Material {
  return {
    id: m.id, familia: m.familia as Familia, estante: m.estante,
    model: m.model as Material["model"], etiqueta: m.etiqueta, titulo: m.titulo,
    code: m.code ?? undefined, big: m.big ?? undefined, bigLabel: m.big_label ?? undefined,
    promessa: m.promessa,
    meta: { mensagens: m.mensagens ?? undefined, paginas: m.paginas, formatos: m.formatos ?? [] },
    preco: m.preco, hotmartUrl: m.hotmart_url,
    colecoes: (m.colecoes ?? []) as Colecao[],
    praQuem: m.pra_quem, conteudo: m.conteudo ?? [],
    comoUsar: m.como_usar, faq: m.faq ?? [],
  };
}

export default function MaterialLanding({
  material: rawMaterial,
  dbEstantes,
  allDbMateriais,
}: {
  material: DbMaterial;
  dbEstantes?: DbEstante[];
  allDbMateriais?: DbMaterial[];
}) {
  const material = toMaterial(rawMaterial);

  const estanteDb = dbEstantes?.find(e => e.key === material.estante);
  const accentKey: AccentKey = estanteDb
    ? (HEX_TO_ACCENT[estanteDb.accent] ?? "olive")
    : (ESTANTE_MAP[material.estante]?.accent ?? "olive");
  const accent = ACCENTS[accentKey];

  const allMateriais = allDbMateriais ? allDbMateriais.map(toMaterial) : [];
  const shelfItems = allMateriais.filter(mi => mi.estante === material.estante);
  const posInShelf = shelfItems.findIndex(mi => mi.id === material.id);
  const derivedModel = (["A", "C", "B"] as const)[Math.max(0, posInShelf) % 3] as Modelo;
  const derivedBig = (material.meta.mensagens ?? material.meta.paginas).toString();
  const derivedBigLabel = material.meta.mensagens != null ? "mensagens" : "páginas";

  const relacionados = allMateriais
    .filter(m => m.estante === material.estante && m.id !== material.id)
    .slice(0, 3);

  const metaStr = [
    material.meta.mensagens ? `${material.meta.mensagens} mensagens` : null,
    `${material.meta.paginas} páginas`,
  ].filter(Boolean).join(" · ");

  return (
    <div className="pg-wrap" style={{ paddingTop: 32, paddingBottom: 80 }}>
      {/* breadcrumb */}
      <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 32 }}>
        <Link href="/materiais" style={{ color: "var(--muted)", textDecoration: "none" }}>Materiais</Link>
        {" → "}
        <span style={{ color: accent.base }}>{material.etiqueta}</span>
      </div>

      {/* hero */}
      <div className="loja-detail">
        <div className="loja-detail-hero">
          <div
            className="loja-detail-capa"
            style={{ "--cex-accent": accent.base, "--cex-accent-deep": accent.deep } as React.CSSProperties}
          >
            {derivedModel === "A" && <ModelA etiqueta={material.etiqueta} titulo={material.titulo} code={material.code} />}
            {derivedModel === "B" && <ModelB etiqueta={material.etiqueta} titulo={material.titulo} code={material.code} />}
            {derivedModel === "C" && <ModelC etiqueta={material.etiqueta} titulo={material.titulo} big={derivedBig} bigLabel={derivedBigLabel} />}
            {derivedModel === "D" && <ModelD etiqueta={material.etiqueta} titulo={material.titulo} />}
          </div>
          <div>
            <div className="loja-detail-meta-row">
              <span
                className="loja-detail-etiqueta"
                style={{ color: accent.base, background: `${accent.base}18`, borderColor: `${accent.base}44` }}
              >
                {material.etiqueta}
              </span>
              {material.colecoes.length > 0 && (
                <span
                  className="loja-detail-etiqueta"
                  style={{ color: "var(--muted)", background: "var(--card)", borderColor: "var(--border-2)" }}
                >
                  {material.colecoes.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(", ")}
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
            {material.meta.formatos.map(f => (
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
            <a
              href={material.hotmartUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ background: accent.base, color: "#0E110D", borderColor: accent.base } as React.CSSProperties}
              className="btn btn-lg btn-arrow"
            >
              Comprar
            </a>
          </div>
        </div>

        {relacionados.length > 0 && (
          <div className="loja-detail-sec">
            <div className="loja-detail-sec-label">◆ Da mesma estante</div>
            <div className="loja-relacionados">
              {relacionados.map(m => {
                const pos = shelfItems.findIndex(mi => mi.id === m.id);
                const relModel = (["A", "C", "B"] as const)[Math.max(0, pos) % 3] as Modelo;
                const relBig = (m.meta.mensagens ?? m.meta.paginas).toString();
                const relBigLabel = m.meta.mensagens != null ? "mensagens" : "páginas";
                return (
                  <Link key={m.id} href={`/materiais/${m.id}`} style={{ textDecoration: "none" }}>
                    <ProdCard
                      material={{ ...m, model: relModel, big: relBig, bigLabel: relBigLabel }}
                      accentKey={accentKey}
                      onClick={() => {}}
                    />
                  </Link>
                );
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
  );
}
