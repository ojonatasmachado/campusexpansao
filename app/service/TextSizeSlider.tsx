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
import { useTermos } from "./lib/vocabulario-context";

const ULTIMA = CORPOS.length - 1;

export function TextSizeSlider({ previa = true }: { previa?: boolean }) {
  const [pos, setPos] = useTextSize();
  const { comTermos: ct } = useTermos();
  const trilho = useRef<HTMLDivElement>(null);
  const arrastando = useRef(false);

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
          <p className="ts-frase">O texto do app fica deste tamanho. Arraste até ler com conforto.</p>
          <div className="m6-card flat">
            <div className="m6-kick">Domingo · 9:30</div>
            <div className="m6-ct">{ct("{Culto} da manhã")}</div>
            <div className="m6-meta">Você serve na Recepção · chegar às 9:00</div>
          </div>
        </div>
      )}
      <div className="ts-ctl">
        <button type="button" className="ts-a ts-a-min" aria-label="Diminuir o texto" disabled={pos <= 0} onClick={() => mudar(pos - 1)}>A</button>
        <div
          className="ts-track"
          ref={trilho}
          onPointerDown={(e) => {
            arrastando.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            mudar(posDoPonto(e.clientX));
          }}
          onPointerMove={(e) => { if (arrastando.current) mudar(posDoPonto(e.clientX)); }}
          onPointerUp={(e) => { arrastando.current = false; e.currentTarget.releasePointerCapture(e.pointerId); }}
          onPointerCancel={() => { arrastando.current = false; }}
        >
          <span className="ts-rail" />
          {CORPOS.map((c, i) => <span key={c} className="ts-tick" style={{ left: `${(i / ULTIMA) * 100}%` }} />)}
          <span
            className="ts-thumb"
            role="slider"
            tabIndex={0}
            aria-label="Tamanho do texto"
            aria-valuemin={1}
            aria-valuemax={CORPOS.length}
            aria-valuenow={pos + 1}
            aria-valuetext={textoDaPosicao(pos)}
            style={{ left: `${(pos / ULTIMA) * 100}%` }}
            onKeyDown={(e) => {
              const passo: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, PageUp: 1, ArrowLeft: -1, ArrowDown: -1, PageDown: -1 };
              if (e.key in passo) { e.preventDefault(); mudar(pos + passo[e.key]); }
              else if (e.key === "Home") { e.preventDefault(); mudar(0); }
              else if (e.key === "End") { e.preventDefault(); mudar(ULTIMA); }
            }}
          />
        </div>
        <button type="button" className="ts-a ts-a-max" aria-label="Aumentar o texto" disabled={pos >= ULTIMA} onClick={() => mudar(pos + 1)}>A</button>
      </div>
    </div>
  );
}

/** Folha fixa embaixo (Perfil › Tamanho do texto). Fica fora do zoom do app:
    o controle não se mexe durante a troca, só a prévia e o conteúdo atrás. */
export function TextSizeSheet({ onClose }: { onClose: () => void }) {
  return (
    <div className="m6-scrim ts-scrim" onClick={onClose}>
      <div className="m6-sheet ts-sheet" role="dialog" aria-modal="true" aria-label="Tamanho do texto" onClick={(e) => e.stopPropagation()}>
        <div className="m6-grab" />
        <div className="ts-head">
          <span className="m6-rt">Tamanho do texto</span>
          <button type="button" className="m6-link" onClick={onClose}>Pronto</button>
        </div>
        <TextSizeSlider />
      </div>
    </div>
  );
}
