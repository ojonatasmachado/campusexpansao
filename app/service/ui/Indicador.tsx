"use client";

/* Indicador do Service (BIBLIOTECA.md, prancha 2): rótulo, número que conta do
   zero (Contagem), variação com cor de estado e minilinha que se desenha da
   esquerda. Até quatro por linha (.kpi-row). Dois estilos por cima das classes
   que já existem: cartao (.kpi do painel) e numero (.saude-n, bloco tocável da
   Saúde que abre a lista do que ele conta). Com movimento reduzido, tudo aparece
   no estado final. Visual em biblioteca.css. */

import type { ReactNode } from "react";
import { HelpDot } from "../HelpSystem";
import { Icon } from "../lib/icons";
import { Acao } from "./Acao";
import { Contagem } from "./Contagem";
import { Selo } from "./Selo";

export type TomVariacao = "ok" | "pendente" | "neutro";

export type IndicadorProps = {
  rotulo: ReactNode;
  valor: number | string;
  estilo?: "cartao" | "numero";
  icone?: string;
  /* texto do "?" ao lado do rótulo */
  ajuda?: string;
  /* linha curta embaixo ("de 12 vagas") */
  rodape?: ReactNode;
  /* variação contra o período anterior, em selo */
  variacao?: { texto: string; tom?: TomVariacao };
  /* série para a minilinha (do mais antigo ao atual) */
  serie?: number[];
  /* pendente: número em âmbar (pede atenção); cuidado: negativo */
  tom?: "pendente" | "cuidado";
  carregando?: boolean;
  /* classe extra no número (ex. fin-num do Financeiro) */
  classeValor?: string;
  /* estilo numero: abre a lista */
  aoAbrir?: () => void;
  rotuloAcao?: string;
  className?: string;
};

export function Indicador({ rotulo, valor, estilo = "cartao", icone, ajuda, rodape, variacao, serie, tom, carregando, classeValor, aoAbrir, rotuloAcao, className }: IndicadorProps) {
  const numero = carregando ? "…" : <Contagem valor={valor} />;
  const tomCls = tom ? ` ind-${tom}` : "";
  if (estilo === "numero") {
    return (
      <Acao className={`saude-n indicador${tomCls}${className ? ` ${className}` : ""}`} onClick={aoAbrir} desativado={!aoAbrir} aria-label={rotuloAcao}>
        <span className={`saude-v${classeValor ? ` ${classeValor}` : ""}`}>{numero}</span>
        <span className="saude-l">{rotulo}</span>
        {rodape ? <span className="saude-c">{rodape}</span> : null}
      </Acao>
    );
  }
  const conteudo = (
    <>
      <div className="kpi-label">{icone ? <Icon name={icone} size={13} /> : null} <span>{rotulo} {ajuda ? <HelpDot text={ajuda} /> : null}</span></div>
      <div className={`kpi-value${classeValor ? ` ${classeValor}` : ""}`}>{numero}</div>
      {variacao || rodape || (serie && serie.length > 1) ? (
        <div className="kpi-foot">
          {variacao ? <Selo tom={variacao.tom ?? "neutro"}>{variacao.texto}</Selo> : null}
          {rodape ? <span className="ind-rodape">{rodape}</span> : null}
          {serie && serie.length > 1 ? <Minilinha serie={serie} /> : null}
        </div>
      ) : null}
    </>
  );
  if (aoAbrir) {
    return (
      <Acao className={`kpi indicador${tomCls}${className ? ` ${className}` : ""}`} onClick={aoAbrir} aria-label={rotuloAcao}>
        {conteudo}
      </Acao>
    );
  }
  return (
    <div className={`kpi indicador${tomCls}${className ? ` ${className}` : ""}`}>
      {conteudo}
    </div>
  );
}

/* minilinha: tendência sem eixo, desenha da esquerda em 1,2 s */
export function Minilinha({ serie, className }: { serie: number[]; className?: string }) {
  const mn = Math.min(...serie);
  const mx = Math.max(...serie);
  const d = serie.map((y, i) => `${i ? "L" : "M"}${(4 + i * (102 / (serie.length - 1))).toFixed(1)} ${(30 - ((y - mn) / (mx - mn || 1)) * 26).toFixed(1)}`).join(" ");
  return (
    <svg className={`minilinha${className ? ` ${className}` : ""}`} width="110" height="34" viewBox="0 0 110 34" fill="none" aria-hidden="true">
      <path className="graf-traco" d={d} pathLength={1} />
    </svg>
  );
}
