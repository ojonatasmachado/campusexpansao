/* Linha de lista do Service (BIBLIOTECA.md, prancha 6, "Pessoa" e "Linha de
   tarefa"): sem borda própria, separada da vizinha por linha fina. Por cima das
   classes que já existem: tabela do painel .tr, linha curta do painel .mini-row,
   linha de configuração .cfg-row e linha do app .m6-row; o grupo de linhas do app
   é a Lista (.m6-list). Linha clicável é uma Acao com linhaClasse(). */

import type { HTMLAttributes } from "react";

/* tabela = .tr; curta = .mini-row; config = .cfg-row; app = .m6-row */
export type LinhaEstilo = "tabela" | "curta" | "config" | "app";

const CLASSE: Record<LinhaEstilo, string> = { tabela: "tr", curta: "mini-row", config: "cfg-row", app: "m6-row" };

export function linhaClasse({ estilo = "curta" }: { estilo?: LinhaEstilo }) {
  return CLASSE[estilo];
}

export type LinhaProps = HTMLAttributes<HTMLElement> & {
  estilo?: LinhaEstilo;
  como?: "div" | "li" | "label";
};

export function Linha({ estilo, como: Tag = "div", className, ...rest }: LinhaProps) {
  const cls = linhaClasse({ estilo });
  return <Tag {...rest} className={className ? `${cls} ${className}` : cls} />;
}

/* grupo de linhas do app do membro (.m6-list; .flat sem margem própria) */
export function Lista({ plano, className, ...rest }: HTMLAttributes<HTMLDivElement> & { plano?: boolean }) {
  const cls = plano ? "m6-list flat" : "m6-list";
  return <div {...rest} className={className ? `${cls} ${className}` : cls} />;
}
