"use client";

/* Superfícies por cima da tela (BIBLIOTECA.md, prancha 5): Janela, Gaveta e Folha.
   - Janela: para criar algo curto ou confirmar. Mais de quatro campos, use a Gaveta
     (ou a tela cheia do FormScreen). Abre crescendo de 96% a 100% com fade; no
     celular vira folha inferior, com alça para arrastar e fechar.
   - Gaveta: abre da direita sem tirar a pessoa da lista, para ver e editar um item.
     440 px no computador (larga: 560), tela cheia no celular. Entra em 0,45 s com a
     curva de gaveta e o véu escurece junto; no toque, fecha arrastando pela borda.
   - Folha: a do app do membro. Sobe de baixo, fecha arrastando a alça.
   Todas usam as classes de sempre (.modal-bg/.modal, .drawer-bg/.drawer,
   .m6-scrim/.m6-sheet), então o DialogosAcessiveis cuida de foco, Tab, Esc e da
   animação de saída. Visual e movimento em biblioteca.css. */

import { useId } from "react";
import type { CSSProperties, ReactNode } from "react";
import { BotaoIcone } from "./Botao";
import { useArrastarParaFechar } from "./arrastar";

const parar = (e: { stopPropagation: () => void }) => e.stopPropagation();

export type JanelaProps = {
  titulo: ReactNode;
  sobretitulo?: ReactNode;
  /* uma ou duas frases embaixo do título */
  texto?: ReactNode;
  /* o que mais mora no cabeçalho (abas da janela, por exemplo) */
  cabecalho?: ReactNode;
  aoFechar: () => void;
  larga?: boolean;
  /* botões do rodapé: Cancelar à esquerda, a ação principal por último */
  rodape?: ReactNode;
  /* false: o clique no véu (e o Esc) não fecha; para quem está no meio de algo */
  fecharNoFundo?: boolean;
  /* corpo em bloco, sem a grade de duas colunas dos formulários */
  corpoBloco?: boolean;
  corpoStyle?: CSSProperties;
  /* janela aberta de dentro de outra janela: fica na camada de cima */
  acima?: boolean;
  /* salvando: nada fecha (véu, Esc e ✕) até terminar */
  ocupada?: boolean;
  className?: string;
  children?: ReactNode;
};

export function Janela({ titulo, sobretitulo, texto, cabecalho, aoFechar, larga, rodape, fecharNoFundo = true, corpoBloco, corpoStyle, acima, ocupada, className, children }: JanelaProps) {
  const tituloId = useId();
  const { alvo, zona } = useArrastarParaFechar("baixo", aoFechar);
  return (
    <div className={`modal-bg${acima ? " janela-acima" : ""}`} onClick={fecharNoFundo && !ocupada ? aoFechar : undefined}>
      <div ref={alvo} className={`modal${larga ? " wide" : ""}${className ? ` ${className}` : ""}`}
        role="dialog" aria-modal="true" aria-labelledby={tituloId} aria-busy={ocupada || undefined} onClick={parar}>
        <div className="janela-alca" aria-hidden="true" {...(ocupada ? {} : zona)}><span /></div>
        <div className="modal-head">
          {sobretitulo ? <div className="modal-eyebrow">{sobretitulo}</div> : null}
          <h2 className="modal-title" id={tituloId}>{titulo}</h2>
          {texto ? <div className="modal-sub">{texto}</div> : null}
          {cabecalho}
          <BotaoIcone className="janela-x" rotulo="Fechar" desativado={ocupada} onClick={aoFechar}>✕</BotaoIcone>
        </div>
        {children != null ? <div className="modal-body" style={corpoBloco ? { display: "block", ...corpoStyle } : corpoStyle}>{children}</div> : null}
        {rodape ? <div className="modal-foot">{rodape}</div> : null}
      </div>
    </div>
  );
}

export type GavetaProps = {
  aoFechar: () => void;
  larga?: boolean;
  /* nome falado da gaveta (o título visível costuma estar no drawer-head) */
  rotulo?: string;
  className?: string;
  children: ReactNode;
};

export function Gaveta({ aoFechar, larga, rotulo, className, children }: GavetaProps) {
  const { alvo, zona } = useArrastarParaFechar("direita", aoFechar);
  return (
    <>
      <div className="drawer-bg" onClick={aoFechar} />
      <div ref={alvo} className={`drawer${larga ? " drawer-wide" : ""}${className ? ` ${className}` : ""}`} role="dialog" aria-modal="true" aria-label={rotulo}>
        <div className="gaveta-borda" aria-hidden="true" {...zona} />
        {children}
      </div>
    </>
  );
}

export function Folha({ aoFechar, rotulo, className, children }: { aoFechar: () => void; rotulo?: string; className?: string; children: ReactNode }) {
  const { alvo, zona } = useArrastarParaFechar("baixo", aoFechar);
  return (
    <div className="m6-scrim" onClick={aoFechar}>
      <div ref={alvo} className={`m6-sheet${className ? ` ${className}` : ""}`} role="dialog" aria-modal="true" aria-label={rotulo} onClick={parar}>
        <div className="m6-grab-zona" aria-hidden="true" {...zona}><div className="m6-grab" /></div>
        {children}
      </div>
    </div>
  );
}
