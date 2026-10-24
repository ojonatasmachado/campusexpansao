"use client";

/* Tamanho do texto com o componente do iPhone (v7 4.9, manifesto seção 7).
   Prévia no alto (frase + um cartão do app, com a escala aplicada) e, embaixo,
   "A" pequeno, trilho de sete marcas com botão redondo e "A" grande. Funciona
   arrastando, tocando numa marca ou pelas letras (− e +, alternativa ao arrasto
   da WCAG 2.2, critério 2.5.7). Leitor de tela: role="slider" com
   aria-valuetext "Padrão, 4 de 7". Componente único: Perfil (folha fixa embaixo)
   e o primeiro acesso usam este. */

import { useRef } from "react";
import { CORPOS, fatorDa, textoDaPosicao, useTextSize } from "./lib/text-scale";

import { Botao } from "./ui/Botao";
import { Acao } from "./ui/Acao";
import { Cartao } from "./ui/Cartao";
import { useTexto } from "./lib/internacional/contexto";

const ULTIMA = CORPOS.length - 1;

export function TextSizeSlider({ previa = true }: { previa?: boolean }) {
  const traduzirUi = useTexto();

  const [pos, setPos] = useTextSize();
  const trilho = useRef<HTMLDivElement>(null);
  /* dedo que está arrastando: um segundo dedo no trilho não faz a bolinha pular (emil-design-eng, gestos) */
  const dedo = useRef<number | null>(null);

  const posDoPonto = (clientX: number) => {
    const r = trilho.current?.getBoundingClientRect();
    if (!r || r.width <= 0) return pos;
    return Math.round(Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * ULTIMA);
  };
  const mudar = (p: number) => {
    const v = Math.min(ULTIMA, Math.max(0, p));
    if (v !== pos) setPos(v);
  };

  return (
    <div className="ts-slider">
      {previa && (
        <div className="ts-preview" aria-hidden="true" style={{ "--m-scale": fatorDa(pos) } as React.CSSProperties}>
          <p className="ts-frase">{traduzirUi("O texto do app fica deste tamanho. Arraste até ler com conforto.")}</p>
          <Cartao estilo="app" plano>
            <div className="m6-kick">{traduzirUi("Domingo · 9:30")}</div>
            <div className="m6-ct">{traduzirUi("{Culto} da manhã")}</div>
            <div className="m6-meta">{traduzirUi("Você serve na Recepção · chegar às 9:00")}</div>
          </Cartao>
        </div>
      )}
      <div className="ts-ctl">
        <Acao className="ts-a ts-a-min" aria-label={traduzirUi("Diminuir o texto")} desativado={pos <= 0} onClick={() => mudar(pos - 1)}>A</Acao>
        <div
          className="ts-track"
          ref={trilho}
          onPointerDown={(e) => {
            if (dedo.current !== null) return;
            dedo.current = e.pointerId;
            e.currentTarget.setPointerCapture(e.pointerId);
            mudar(posDoPonto(e.clientX));
          }}
          onPointerMove={(e) => { if (dedo.current === e.pointerId) mudar(posDoPonto(e.clientX)); }}
          onPointerUp={(e) => { if (dedo.current !== e.pointerId) return; dedo.current = null; e.currentTarget.releasePointerCapture(e.pointerId); }}
          onPointerCancel={(e) => { if (dedo.current === e.pointerId) dedo.current = null; }}
        >
          <span className="ts-rail" />
          {CORPOS.map((c, i) => <span key={c} className="ts-tick" style={{ left: `${(i / ULTIMA) * 100}%` }} />)}
          <span
            className="ts-thumb"
            role="slider"
            tabIndex={0}
            aria-label={traduzirUi("Tamanho do texto")}
            aria-valuemin={1}
            aria-valuemax={CORPOS.length}
            aria-valuenow={pos + 1}
            aria-valuetext={textoDaPosicao(pos, traduzirUi)}
            style={{ left: `${(pos / ULTIMA) * 100}%` }}
            onKeyDown={(e) => {
              const passo: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, PageUp: 1, ArrowLeft: -1, ArrowDown: -1, PageDown: -1 };
              if (e.key in passo) { e.preventDefault(); mudar(pos + passo[e.key]); }
              else if (e.key === "Home") { e.preventDefault(); mudar(0); }
              else if (e.key === "End") { e.preventDefault(); mudar(ULTIMA); }
            }}
          />
        </div>
        <Acao className="ts-a ts-a-max" aria-label={traduzirUi("Aumentar o texto")} desativado={pos >= ULTIMA} onClick={() => mudar(pos + 1)}>A</Acao>
      </div>
    </div>
  );
}

/** Folha fixa embaixo (Perfil › Tamanho do texto). Fica fora do zoom do app:
    o controle não se mexe durante a troca, só a prévia e o conteúdo atrás. */
export function TextSizeSheet({ onClose }: { onClose: () => void }) {
  const traduzirUi = useTexto();

  return (
    <div /* lei17-ok: folha de tamanho do texto com prévia ao vivo */ className="m6-scrim ts-scrim" onClick={onClose}>
      <div className="m6-sheet ts-sheet" role="dialog" aria-modal="true" aria-label={traduzirUi("Tamanho do texto")} onClick={(e) => e.stopPropagation()}>
        <div className="m6-grab" />
        <div className="ts-head">
          <span className="m6-rt">{traduzirUi("Tamanho do texto")}</span>
          <Botao tamanho="toque" variante="texto" onClick={onClose}>{traduzirUi("Pronto")}</Botao>
        </div>
        <TextSizeSlider />
      </div>
    </div>
  );
}
