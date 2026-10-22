"use client";

/* Abas do Service (BIBLIOTECA.md, pranchas 4 e 5): partes de uma mesma tela ou
   janela (QR Code / Quem está na sala; Geral / Personalização). Para escolher um
   valor (filtro, modo), use o Segmentado. Linha fina embaixo, o sublinhado na cor
   da igreja desliza até a aba ativa com a mola; contador opcional ao lado do nome.
   Teclado de abas (WAI-ARIA): setas trocam de aba, Home/End vão às pontas.
   O conteúdo de cada aba fica em <PainelAba> com o mesmo id. */

import type { HTMLAttributes, KeyboardEvent, ReactNode } from "react";
import { Opcao } from "./Opcao";
import { useIndicador } from "./indicador";

export type Aba = { id: string; rotulo: ReactNode; contador?: number };

export type AbasProps = {
  abas: Aba[];
  ativa: string;
  aoMudar: (id: string) => void;
  /* nome falado do grupo de abas */
  rotulo: string;
  /* prefixo dos ids (aba e painel), quando a tela tem mais de um grupo */
  prefixo?: string;
  className?: string;
};

export function Abas({ abas, ativa, aoMudar, rotulo, prefixo = "aba", className }: AbasProps) {
  const { caixa, indicador } = useIndicador<HTMLDivElement, HTMLSpanElement>();
  const andar = (e: KeyboardEvent) => {
    const i = abas.findIndex((a) => a.id === ativa);
    const ir = (j: number) => {
      e.preventDefault();
      const alvo = abas[(j + abas.length) % abas.length];
      aoMudar(alvo.id);
      caixa.current?.querySelector<HTMLButtonElement>(`#${prefixo}-${alvo.id}`)?.focus();
    };
    if (e.key === "ArrowRight") ir(i + 1);
    else if (e.key === "ArrowLeft") ir(i - 1);
    else if (e.key === "Home") ir(0);
    else if (e.key === "End") ir(abas.length - 1);
  };
  return (
    <div ref={caixa} className={`abas${className ? ` ${className}` : ""}`} role="tablist" aria-label={rotulo} onKeyDown={andar}>
      {abas.map((a) => {
        const on = a.id === ativa;
        return (
          <Opcao key={a.id} id={`${prefixo}-${a.id}`} estilo="aba" role="tab" marcada={on} aria-selected={on}
            aria-controls={`${prefixo}-painel-${a.id}`} tabIndex={on ? 0 : -1} onClick={() => aoMudar(a.id)}>
            {a.rotulo}
            {a.contador != null && a.contador > 0 ? <span className="aba-contador num">{a.contador}</span> : null}
          </Opcao>
        );
      })}
      <span ref={indicador} className="abas-indicador" aria-hidden="true" />
    </div>
  );
}

export function PainelAba({ id, prefixo = "aba", ...rest }: HTMLAttributes<HTMLDivElement> & { id: string; prefixo?: string }) {
  return <div {...rest} role="tabpanel" id={`${prefixo}-painel-${id}`} aria-labelledby={`${prefixo}-${id}`} tabIndex={0} />;
}
