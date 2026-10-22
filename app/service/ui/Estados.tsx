"use client";

/* Estados de uma área do Service (BIBLIOTECA.md, prancha 3): vazio, carregando e erro.
   Vazio diz o que vai aparecer ali e oferece o próximo passo. Carregando é um
   esqueleto com a forma do conteúdo, nunca um ícone girando sozinho no meio.
   Erro diz o que houve em linguagem de gente e oferece tentar de novo.
   Visual em biblioteca.css (.estado, .esq). */

import type { ReactNode } from "react";
import { Botao } from "./Botao";

type AcaoEstado = { rotulo: string; onClick: () => void };

/* lista = painel; toque = app do membro */
export type EstadoTamanho = "lista" | "toque";

export function Vazio({ titulo, texto, icone, acao, tamanho = "lista", className }: {
  titulo: ReactNode;
  texto?: ReactNode;
  icone?: ReactNode;
  acao?: AcaoEstado;
  tamanho?: EstadoTamanho;
  className?: string;
}) {
  return (
    <div className={`estado estado-vazio estado-${tamanho}${className ? ` ${className}` : ""}`}>
      {icone ? <div className="estado-icone" aria-hidden="true">{icone}</div> : null}
      <div className="estado-t">{titulo}</div>
      {texto ? <p className="estado-s">{texto}</p> : null}
      {acao ? <Botao variante="principal" compacto onClick={acao.onClick}>{acao.rotulo}</Botao> : null}
    </div>
  );
}

export function ErroEstado({ titulo = "Não consegui carregar agora.", texto, tentar, tamanho = "lista", className }: {
  titulo?: ReactNode;
  texto?: ReactNode;
  tentar?: () => void;
  tamanho?: EstadoTamanho;
  className?: string;
}) {
  return (
    <div className={`estado estado-erro estado-${tamanho}${className ? ` ${className}` : ""}`} role="alert">
      <div className="estado-t">{titulo}</div>
      {texto ? <p className="estado-s">{texto}</p> : null}
      {tentar ? <Botao variante="secundario" compacto onClick={tentar}>Tentar de novo</Botao> : null}
    </div>
  );
}

/* Esqueleto: a forma do que vai chegar.
   lista = linhas com avatar; linhas = parágrafo; cartoes = blocos; indicadores = números do painel. */
export type EsqueletoForma = "lista" | "linhas" | "cartoes" | "indicadores";

export function Carregando({ forma = "lista", quantos = 3, rotulo = "Carregando", className }: {
  forma?: EsqueletoForma;
  quantos?: number;
  rotulo?: string;
  className?: string;
}) {
  const itens = Array.from({ length: quantos }, (_, i) => i);
  /* larguras variam um pouco para não parecer grade */
  const larg = (i: number, base: number) => `${base - ((i * 13) % 22)}%`;
  return (
    <div className={`esq esq-${forma}${className ? ` ${className}` : ""}`} role="status" aria-live="polite">
      <span className="sr-only">{rotulo}</span>
      {forma === "lista" && itens.map((i) => (
        <div key={i} className="esq-item" aria-hidden="true">
          <div className="esq-b esq-av" />
          <div className="esq-txt">
            <div className="esq-b esq-l1" style={{ width: larg(i, 76) }} />
            <div className="esq-b esq-l2" style={{ width: larg(i, 50) }} />
          </div>
        </div>
      ))}
      {forma === "linhas" && itens.map((i) => (
        <div key={i} className="esq-b esq-l1" style={{ width: larg(i, 96) }} aria-hidden="true" />
      ))}
      {forma === "cartoes" && itens.map((i) => (
        <div key={i} className="esq-b esq-cartao" aria-hidden="true" />
      ))}
      {forma === "indicadores" && itens.map((i) => (
        <div key={i} className="esq-ind" aria-hidden="true">
          <div className="esq-b esq-l2" style={{ width: "55%" }} />
          <div className="esq-b esq-num" />
        </div>
      ))}
    </div>
  );
}
