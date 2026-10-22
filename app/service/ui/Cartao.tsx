/* Cartão do Service (BIBLIOTECA.md, pranchas 1 e 6): superfície que agrupa um
   assunto. Plano por padrão (linha fina, sem sombra); o destaque da igreja não
   pinta o fundo. Por cima das classes que já existem: painel .panel, app
   .m6-card (e .flat) e a família antiga do app .m-card. Cartão clicável é uma
   Acao com cartaoClasse(). */

import type { HTMLAttributes } from "react";

/* painel = .panel; app = .m6-card; app-solto = .m-card (telas antigas do membro) */
export type CartaoEstilo = "painel" | "app" | "app-solto";

const CLASSE: Record<CartaoEstilo, string> = { painel: "panel", app: "m6-card", "app-solto": "m-card" };

export function cartaoClasse({ estilo = "painel", plano }: { estilo?: CartaoEstilo; plano?: boolean }) {
  return plano && estilo === "app" ? "m6-card flat" : CLASSE[estilo];
}

export type CartaoProps = HTMLAttributes<HTMLElement> & {
  estilo?: CartaoEstilo;
  /* sem margem própria (.m6-card.flat), para cartão dentro de outro bloco */
  plano?: boolean;
  como?: "div" | "article" | "section" | "li";
};

export function Cartao({ estilo, plano, como: Tag = "div", className, ...rest }: CartaoProps) {
  const cls = cartaoClasse({ estilo, plano });
  return <Tag {...rest} className={className ? `${cls} ${className}` : cls} />;
}
