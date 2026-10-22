"use client";

/* Abas do Service (BIBLIOTECA.md, pranchas 4 e 5): partes de uma mesma tela ou
   janela (QR Code / Quem está na sala; Geral / Personalização). Para escolher um
   valor (filtro, modo), use o Segmentado. Linha fina embaixo, o sublinhado na cor
   da igreja desliza até a aba ativa com a mola; contador opcional ao lado do nome.
   Teclado de abas (WAI-ARIA): setas trocam de aba, Home/End vão às pontas.
   O conteúdo de cada aba fica em <PainelAba> com o mesmo id. */

import { useId } from "react";
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
  /* prefixo dos ids (aba e painel); sem ele, um único por grupo de abas */
  prefixo?: string;
  /* a tela usa <PainelAba> com o mesmo prefixo: as abas apontam para os painéis */
  comPaineis?: boolean;
  className?: string;
};

export function Abas({ abas, ativa, aoMudar, rotulo, prefixo: prefixoDado, comPaineis, className }: AbasProps) {
  const auto = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const prefixo = prefixoDado ?? `aba${auto}`;
  const { caixa, indicador } = useIndicador<HTMLDivElement, HTMLSpanElement>();
  const andar = (e: KeyboardEvent) => {
    const i = abas.findIndex((a) => a.id === ativa);
    const ir = (j: number) => {
      e.preventDefault();
      const alvo = abas[(j + abas.length) % abas.length];
      aoMudar(alvo.id);
      [...(caixa.current?.querySelectorAll<HTMLButtonElement>("[role=tab]") ?? [])].find((b) => b.dataset.aba === alvo.id)?.focus();
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
          <Opcao key={a.id} id={`${prefixo}-${a.id}`} data-aba={a.id} estilo="aba" role="tab" marcada={on} aria-selected={on}
            aria-controls={comPaineis ? `${prefixo}-painel-${a.id}` : undefined} tabIndex={on ? 0 : -1} onClick={() => aoMudar(a.id)}>
            {a.rotulo}
            {a.contador != null ? <span className="aba-contador num">{a.contador}</span> : null}
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
