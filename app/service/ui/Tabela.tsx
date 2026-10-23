"use client";

/* Tabela do painel com seleção (BIBLIOTECA.md, prancha 3, "Tabela de pessoas").
   Por cima do .tbl/.tr que já existe. A linha abre o detalhe (Acao); a caixa de
   marcar fica fora do botão, na primeira coluna. Marcar alguém faz subir a barra
   de ações em lote (0,5 s, mola), que some quando nada está marcado; Esc limpa.
   As linhas entram em sequência quando `chaveAnimacao` muda (filtro, busca,
   ordem). Só as linhas à vista contam na seleção. Tudo para com movimento
   reduzido. Visual em biblioteca.css (.tabela). */

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { plural } from "../lib/plural";
import { Acao } from "./Acao";
import { Botao } from "./Botao";
import { Marcar } from "./Campo";
import { MOLA, movimentoReduzido } from "./movimento";

export type Coluna<T> = {
  id: string;
  rotulo: ReactNode;
  /* largura na grade ("1.6fr", "110px"); padrão 1fr */
  largura?: string;
  celula: (linha: T) => ReactNode;
};

export type TabelaProps<T> = {
  linhas: T[];
  colunas: Coluna<T>[];
  chave: (linha: T) => string;
  /* abre o detalhe; sem ele, a linha não é clicável */
  aoAbrir?: (linha: T) => void;
  /* nome da linha para o leitor de tela ("Selecionar Ana Souza") */
  nomeLinha: (linha: T) => string;
  /* liga a seleção: as ações em lote recebem as linhas marcadas e o limpar */
  lote?: (marcadas: T[], limpar: () => void) => ReactNode;
  /* muda quando o conjunto à vista muda (filtro, busca): as linhas entram de novo */
  chaveAnimacao?: string;
  vazio?: ReactNode;
  rotulo?: string;
  className?: string;
};

export function Tabela<T>({ linhas, colunas, chave, aoAbrir, nomeLinha, lote, chaveAnimacao, vazio, rotulo, className }: TabelaProps<T>) {
  const [marcadas, setMarcadas] = useState<Set<string>>(() => new Set());
  const corpo = useRef<HTMLDivElement>(null);
  const comSelecao = !!lote;
  const visiveis = comSelecao ? linhas.filter((l) => marcadas.has(chave(l))) : [];
  const n = visiveis.length;
  const todas = n > 0 && n === linhas.length;
  const grade = `${comSelecao ? "44px " : ""}${colunas.map((c) => c.largura ?? "1fr").join(" ")}`;
  const limpar = () => setMarcadas(new Set());
  const alternar = (k: string) => setMarcadas((s) => {
    const novo = new Set(s);
    if (novo.has(k)) novo.delete(k); else novo.add(k);
    return novo;
  });
  const alternarTodas = () => setMarcadas(todas ? new Set() : new Set(linhas.map(chave)));

  /* linhas entram em sequência quando o conjunto à vista muda */
  const primeira = useRef(true);
  useLayoutEffect(() => {
    if (primeira.current) { primeira.current = false; return; }
    const el = corpo.current;
    if (!el || movimentoReduzido() || typeof el.animate !== "function") return;
    Array.from(el.querySelectorAll<HTMLElement>(":scope > .tabela-linha")).slice(0, 14).forEach((linha, i) => {
      linha.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 450, easing: MOLA, delay: i * 35, fill: "backwards" });
    });
  }, [chaveAnimacao]);

  /* Esc limpa a seleção */
  useEffect(() => {
    if (!n) return;
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape" && !e.defaultPrevented && !document.querySelector(".modal-bg, .drawer-bg, .m6-scrim, [aria-expanded=\"true\"]")) setMarcadas(new Set()); };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [n]);

  const cabecalho = colunas.map((c) => <span key={c.id}>{c.rotulo}</span>);
  return (
    <div className={`tbl tabela${comSelecao ? " com-selecao" : ""}${className ? ` ${className}` : ""}`} role={rotulo ? "region" : undefined} aria-label={rotulo} style={{ "--tabela-grade": grade } as CSSProperties}>
      <div className="tr head tabela-cab">
        {comSelecao ? (
          <span className="tabela-marca">
            <Marcar checked={todas} ref={(el) => { if (el) el.indeterminate = n > 0 && !todas; }} onChange={alternarTodas} aria-label={todas ? "Desmarcar todas" : "Marcar todas à vista"} disabled={!linhas.length} />
          </span>
        ) : null}
        {cabecalho}
      </div>
      <div ref={corpo} className="tabela-corpo">
        {linhas.map((l) => {
          const k = chave(l);
          const on = marcadas.has(k);
          const celulas = colunas.map((c) => <span key={c.id} className="tabela-cel">{c.celula(l)}</span>);
          return (
            <div key={k} className={`tr tabela-linha${on ? " marcada" : ""}${aoAbrir ? " click" : ""}`}>
              {comSelecao ? (
                <span className="tabela-marca">
                  <Marcar checked={on} onChange={() => alternar(k)} aria-label={`Selecionar ${nomeLinha(l)}`} />
                </span>
              ) : null}
              {aoAbrir
                ? <Acao className="tabela-abrir" onClick={() => aoAbrir(l)}>{celulas}</Acao>
                : <span className="tabela-abrir">{celulas}</span>}
            </div>
          );
        })}
      </div>
      {linhas.length === 0 ? vazio : null}
      {comSelecao ? <span className="sr-only" role="status">{n ? plural(n, "marcada", "marcadas") : ""}</span> : null}
      {comSelecao ? (
        <div className="tabela-lote-casa">
          <div className={`tabela-lote${n ? " on" : ""}`} role="region" aria-label="Ações para as marcadas" aria-hidden={!n} inert={!n}>
            <span className="tabela-lote-n">{plural(n, "marcada", "marcadas")}</span>
            <div className="tabela-lote-acoes">
              {lote(visiveis, limpar)}
              <Botao variante="discreto" compacto onClick={limpar}>Limpar</Botao>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
