/* Botão e Botão de ícone do Service (BIBLIOTECA.md, prancha 1).
   Peça única por cima das duas famílias de CSS que já existem em service-app.css:
   painel (.btn, .btn-pri, .btn-sec, .btn-ghost, .btn-danger, .btn-sm) e
   membro (.m6-btn, .pri, .sec, .danger, .small, .full). Não traz CSS novo:
   trocar <button className="btn ..."> por <Botao> não muda o visual. */

import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";

export type BotaoVariante = "principal" | "secundario" | "discreto" | "perigo";
/* toque = app do membro (52px, 44px compacto); lista = painel (36px, 32px compacto) */
export type BotaoTamanho = "toque" | "lista";

const PAINEL: Record<BotaoVariante, string> = {
  principal: "btn-pri",
  secundario: "btn-sec",
  discreto: "btn-ghost",
  perigo: "btn-danger",
};

/* o membro não tem botão discreto: fica sem fundo e sem borda (.m6-btn puro) */
const MEMBRO: Record<BotaoVariante, string> = {
  principal: "pri",
  secundario: "sec",
  discreto: "",
  perigo: "danger",
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
  if (tamanho === "toque") return ["m6-btn", MEMBRO[variante], compacto && "small", largo && "full"].filter(Boolean).join(" ");
  return ["btn", PAINEL[variante], compacto && "btn-sm"].filter(Boolean).join(" ");
}

export function Botao({ variante, tamanho, compacto, largo, carregando, desativado, className, type = "button", children, ...rest }: BotaoProps) {
  const cls = botaoClasse({ variante, tamanho, compacto, largo });
  return (
    <button
      {...rest}
      type={type}
      className={className ? `${cls} ${className}` : cls}
      disabled={desativado || carregando}
      aria-busy={carregando || undefined}
    >
      {children}
    </button>
  );
}

/* Botão só com ícone: o nome falado é obrigatório (vira aria-label).
   A aparência vem da classe que a tela já usa (.drawer-close, .top-icon...). */
export type BotaoIconeProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "disabled"> & {
  rotulo: string;
  desativado?: boolean;
  ref?: Ref<HTMLButtonElement>;
  children: ReactNode;
};

export function BotaoIcone({ rotulo, desativado, type = "button", children, ...rest }: BotaoIconeProps) {
  return (
    <button {...rest} type={type} aria-label={rotulo} disabled={desativado}>
      {children}
    </button>
  );
}
