/* Botão e Botão de ícone do Service (BIBLIOTECA.md, prancha 1).
   Peça única por cima das duas famílias de CSS que já existem em service-app.css:
   painel (.btn, .btn-pri, .btn-sec, .btn-ghost, .btn-danger, .btn-sm) e
   membro (.m6-btn, .pri, .sec, .danger, .small, .full), mais as telas de entrada
   (.login-btn, .login-link, cores CE.X do AuthShell) e o mapa (.mp-botao).
   Não traz CSS novo: cada tela continua com o visual que tinha, e unificar o
   visual daqui pra frente é mexer só neste arquivo. */

import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { Acao } from "./Acao";

/* texto = botão com cara de link (sem fundo e sem borda) */
export type BotaoVariante = "principal" | "secundario" | "discreto" | "perigo" | "texto";
/* família visual: toque = app do membro (52px, 44px compacto); lista = painel
   (36px, 32px compacto); entrada = login, convite e senha (52px); mapa = botões
   sobre o mapa da igreja (44px) */
export type BotaoTamanho = "toque" | "lista" | "entrada" | "mapa";

const PAINEL: Record<BotaoVariante, string> = {
  principal: "btn-pri",
  secundario: "btn-sec",
  discreto: "btn-ghost",
  perigo: "btn-danger",
  texto: "",
};

/* o membro não tem botão discreto: fica sem fundo e sem borda (.m6-btn puro) */
const MEMBRO: Record<BotaoVariante, string> = {
  principal: "pri",
  secundario: "sec",
  discreto: "",
  perigo: "danger",
  texto: "",
};

export type BotaoProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "disabled"> & {
  variante?: BotaoVariante;
  tamanho?: BotaoTamanho;
  /* menor da família: .btn-sm no painel, .m6-btn.small no membro */
  compacto?: boolean;
  /* ocupa a linha toda (.m6-btn.full); no painel, use a classe do contêiner */
  largo?: boolean;
  carregando?: boolean;
  desativado?: boolean;
  ref?: Ref<HTMLButtonElement>;
  children?: ReactNode;
};

export function botaoClasse({ variante = "secundario", tamanho = "lista", compacto, largo }: Pick<BotaoProps, "variante" | "tamanho" | "compacto" | "largo">) {
  if (tamanho === "entrada") return variante === "principal" || variante === "perigo" ? "login-btn" : "login-link";
  if (tamanho === "mapa") return "mp-botao";
  if (variante === "texto") return tamanho === "toque" ? "m6-link" : "panel-link";
  if (tamanho === "toque") return ["m6-btn", MEMBRO[variante], compacto && "small", largo && "full"].filter(Boolean).join(" ");
  return ["btn", PAINEL[variante], compacto && "btn-sm"].filter(Boolean).join(" ");
}

export function Botao({ variante, tamanho, compacto, largo, className, children, ...rest }: BotaoProps) {
  const cls = botaoClasse({ variante, tamanho, compacto, largo });
  return (
    <Acao {...rest} className={className ? `${cls} ${className}` : cls}>
      {children}
    </Acao>
  );
}

/* Botão só com ícone: o nome falado é obrigatório (vira aria-label).
   A aparência vem da classe que a tela já usa (.drawer-close, .top-icon...). */
export type BotaoIconeProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "disabled"> & {
  rotulo: string;
  desativado?: boolean;
  carregando?: boolean;
  ref?: Ref<HTMLButtonElement>;
  children: ReactNode;
};

export function BotaoIcone({ rotulo, children, ...rest }: BotaoIconeProps) {
  return (
    <Acao {...rest} aria-label={rotulo}>
      {children}
    </Acao>
  );
}
