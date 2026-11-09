"use client";

/* Balão preso a um ponto (BIBLIOTECA.md, ficha "Balão"; mapa/PLANO.md §10, P1).
   Abre do lado do ponto tocado no mapa, com a ponta apontando para ele; perto da
   borda direita abre para a esquerda; se não cabe de nenhum lado (tela estreita),
   encolhe e fica solto, sem ponta. Nunca sai do contêiner. Traz
   tudo do ponto (não há painel lateral). Fecha no ✕ e no Esc; ao abrir, o foco vai
   para o ✕ e, ao fechar, volta para onde estava; o Esc só fecha com o foco dentro
   dele e nada aberto por cima. O contêiner (o mapa) precisa ter
   position: relative. Visual e movimento em biblioteca.css (.balao).
   `folha` (celular, G16, prancha P3): o mesmo conteúdo sobe de baixo numa Folha
   da biblioteca, com fundo escuro; tocar fora ou arrastar a alça fecha. */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "../lib/icons";
import { BotaoIcone } from "./Botao";
import { Folha } from "./Janela";
import { Selo } from "./Selo";

export type BalaoProps = {
  /* ponto em px dentro do contêiner */
  x: number;
  y: number;
  titulo: string;
  sobretitulo?: ReactNode;
  aoFechar: () => void;
  children?: ReactNode;
  /* até duas ações (lei 5) */
  rodape?: ReactNode;
  largura?: number;
  /* o ponto saiu da tela: o balão fica montado (sem puxar o foco de novo), só escondido */
  oculto?: boolean;
  /* celular: abre como folha que sobe de baixo (x, y e largura não contam) */
  folha?: boolean;
};

const AFASTA = 34;
const MARGEM = 16;

export function Balao(props: BalaoProps) {
  return props.folha ? <BalaoFolha {...props} /> : <BalaoPreso {...props} />;
}

function BalaoFolha({ titulo, sobretitulo, aoFechar, children, rodape }: BalaoProps) {
  return (
    <Folha aoFechar={aoFechar} rotulo={titulo} className="balao-folha">
      <div className="balao-cab">
        <div className="balao-cab-texto">
          {sobretitulo && <div className="balao-sobre">{sobretitulo}</div>}
          <h3 className="balao-titulo">{titulo}</h3>
        </div>
        <BotaoIcone className="balao-fechar" rotulo="Fechar" onClick={aoFechar}>
          <Icon name="recusou" size={16} stroke={2.2} />
        </BotaoIcone>
      </div>
      {children && <div className="balao-corpo">{children}</div>}
      {rodape && <div className="balao-pe">{rodape}</div>}
    </Folha>
  );
}

function BalaoPreso({ x, y, titulo, sobretitulo, aoFechar, children, rodape, largura = 316, oculto }: BalaoProps) {
  const caixa = useRef<HTMLDivElement>(null);
  const fechar = useRef<HTMLButtonElement>(null);
  /* aoFechar costuma ser uma função nova a cada render: guardada num ref, o efeito
     de foco roda só ao abrir e não rouba o foco de quem está mexendo no painel */
  const aoFecharRef = useRef(aoFechar);
  useLayoutEffect(() => { aoFecharRef.current = aoFechar; });
  const [medida, setMedida] = useState(0);
  const [pos, setPos] = useState({ left: x + AFASTA, top: y - 120, ponta: 120, lado: "dir" as "dir" | "esq" | "solto", w: largura });

  useLayoutEffect(() => {
    const el = caixa.current;
    const pai = el?.offsetParent as HTMLElement | null;
    if (!el || !pai) return;
    const w = pai.clientWidth;
    const h = pai.clientHeight;
    /* nunca maior que o contêiner: em tela estreita o balão encolhe */
    const lw = Math.min(largura, w - 2 * MARGEM);
    /* mede a altura já na largura final: encolhido, o texto quebra em mais linhas */
    el.style.width = `${lw}px`;
    const alto = el.offsetHeight;
    const cabeDir = x + AFASTA + lw <= w - MARGEM;
    const cabeEsq = x - AFASTA - lw >= MARGEM;
    const lado = cabeDir ? "dir" : cabeEsq ? "esq" : "solto";
    const ideal = lado === "dir" ? x + AFASTA : lado === "esq" ? x - AFASTA - lw : x - lw / 2;
    const left = Math.max(MARGEM, Math.min(ideal, w - lw - MARGEM));
    const top = Math.max(MARGEM, Math.min(y - alto / 2, h - alto - MARGEM));
    const ponta = Math.max(20, Math.min(y - top, alto - 20));
    setPos((p) => (p.left === left && p.top === top && p.ponta === ponta && p.lado === lado && p.w === lw ? p : { left, top, ponta, lado, w: lw }));
  }, [x, y, largura, children, rodape, medida, oculto]);

  /* o contêiner mudou de tamanho (janela, painel recolhido): reposiciona */
  useEffect(() => {
    const pai = caixa.current?.offsetParent;
    if (!pai || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setMedida((m) => m + 1));
    ro.observe(pai);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const antes = document.activeElement as HTMLElement | null;
    /* sem rolar a página: o balão já está à vista, junto do ponto */
    fechar.current?.focus({ preventScroll: true });
    /* Esc na fase de bolha: quem está por cima (janela, folha, popover de campo)
       trata antes e marca o evento; só fecha se o foco estiver no balão */
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (document.querySelector(".modal-bg, .drawer-bg, .m6-scrim")) return;
      if (!caixa.current?.contains(document.activeElement)) return;
      e.preventDefault();
      aoFecharRef.current();
    };
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("keydown", esc);
      antes?.focus?.({ preventScroll: true });
    };
  }, []);

  return (
    <div
      ref={caixa}
      className={`balao ${pos.lado}`}
      role="dialog"
      aria-label={titulo}
      hidden={oculto}
      style={{ left: pos.left, top: pos.top, width: pos.w, ["--balao-ponta" as string]: `${pos.ponta}px` }}
    >
      <div className="balao-cab">
        <div className="balao-cab-texto">
          {sobretitulo && <div className="balao-sobre">{sobretitulo}</div>}
          <h3 className="balao-titulo">{titulo}</h3>
        </div>
        <BotaoIcone ref={fechar} className="balao-fechar" rotulo="Fechar" onClick={aoFechar}>
          <Icon name="recusou" size={16} stroke={2.2} />
        </BotaoIcone>
      </div>
      {children && <div className="balao-corpo">{children}</div>}
      {rodape && <div className="balao-pe">{rodape}</div>}
      <span className="balao-ponta" aria-hidden="true" />
    </div>
  );
}

/* Linha do balão: ícone num quadradinho de tom e o texto. */
export function LinhaBalao({ icone, children }: { icone: string; children: ReactNode }) {
  return (
    <div className="balao-linha">
      <span className="balao-linha-ic" aria-hidden="true"><Icon name={icone} size={16} stroke={2} /></span>
      <span>{children}</span>
    </div>
  );
}

/* Lotação no balão (prancha P1): "9 de 12 lugares", selo com as vagas (ou
   lotado) e a barra de ocupação. */
export function LotacaoBalao({ ocupados, total, vagas, cheio }: { ocupados: number; total: number; vagas: string; cheio: boolean }) {
  const pct = total > 0 ? Math.min(100, Math.round((ocupados / total) * 100)) : 0;
  return (
    <div className="balao-lotacao">
      <div className="balao-lotacao-cab">
        <span><b className="balao-lotacao-n">{ocupados} de {total}</b> lugares</span>
        <Selo tom={cheio ? "cuidado" : "ok"}>{vagas}</Selo>
      </div>
      <span className="balao-lotacao-barra" aria-hidden="true"><span style={{ width: `${pct}%` }} /></span>
    </div>
  );
}

/* Linha de apoio do balão, sem ícone: número em destaque e o resto do texto */
export function NotaBalao({ children }: { children: ReactNode }) {
  return <p className="balao-nota">{children}</p>;
}
