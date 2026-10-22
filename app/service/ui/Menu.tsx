"use client";

/* Menu de ações do Service (BIBLIOTECA.md, prancha 4): as ações de uso ocasional
   de uma tela ou de um item, num lugar só (as principais ficam à vista, lei 15).
   Ações agrupadas por tipo; a que apaga fica sozinha no fim, em rosa.
   Abre crescendo a partir do botão (0,32 s, mola) e fecha com a mesma curva, mais
   rápido; a seta gira junto. Teclado: setas, Home/End, a inicial pula para a ação,
   Esc fecha e devolve o foco ao botão, Tab fecha.
   Visual em biblioteca.css (.menu-*). */

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { Caret, Icon } from "../lib/icons";
import { Acao } from "./Acao";
import { Botao, BotaoIcone } from "./Botao";
import { movimentoReduzido } from "./movimento";
import { usePopover } from "./popover";

export type ItemMenu = {
  rotulo: string;
  onClick: () => void;
  icone?: string;
  desligado?: boolean;
  /* apaga ou tira algo: vai para o fim, separado, em rosa */
  perigo?: boolean;
};

export type MenuAcoesProps = {
  itens: ItemMenu[];
  /* texto do botão; com soIcone, vira o nome falado */
  rotulo?: string;
  /* botão só com os três pontos (linha de lista, cartão) */
  soIcone?: boolean;
  /* de que lado o menu abre em relação ao botão */
  alinhar?: "inicio" | "fim";
  className?: string;
  /* conteúdo próprio do botão, no lugar do rótulo e da seta */
  gatilho?: ReactNode;
  /* botão menor, para linha de lista e cartão */
  compacto?: boolean;
};

const SAIDA_MS = 140;

export function MenuAcoes({ itens, rotulo = "Mais", soIcone, alinhar = "fim", className, gatilho: conteudo, compacto }: MenuAcoesProps) {
  const [aberto, setAberto] = useState(false);
  const [saindo, setSaindo] = useState(false);
  /* fecha com a saída curta; o usePopover chama no clique fora e no Esc */
  const sair = () => {
    if (movimentoReduzido()) { setAberto(false); return; }
    setSaindo(true);
    window.setTimeout(() => { setAberto(false); setSaindo(false); }, SAIDA_MS);
  };
  const { caixa, gatilho } = usePopover(aberto && !saindo, (v) => { if (!v) sair(); });
  const fechar = () => { if (aberto && !saindo) sair(); };
  const lista = useRef<HTMLDivElement>(null);

  const comuns = itens.filter((i) => !i.perigo);
  const perigosos = itens.filter((i) => i.perigo);

  useEffect(() => {
    if (!aberto || saindo) return;
    lista.current?.querySelector<HTMLButtonElement>("[role=menuitem]:not(:disabled)")?.focus();
  }, [aberto, saindo]);

  if (!itens.length) return null;

  const navegar = (e: KeyboardEvent) => {
    if (e.key === "Tab") { fechar(); return; }
    const botoes = [...(lista.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]:not(:disabled)") ?? [])];
    const i = botoes.indexOf(document.activeElement as HTMLButtonElement);
    const ir = (j: number) => { e.preventDefault(); botoes[(j + botoes.length) % botoes.length]?.focus(); };
    if (e.key === "ArrowDown") ir(i + 1);
    else if (e.key === "ArrowUp") ir(i - 1);
    else if (e.key === "Home") ir(0);
    else if (e.key === "End") ir(botoes.length - 1);
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const k = e.key.toLocaleLowerCase("pt-BR");
      const ordem = [...botoes.slice(i + 1), ...botoes.slice(0, i + 1)];
      const alvo = ordem.find((b) => (b.textContent ?? "").trim().toLocaleLowerCase("pt-BR").startsWith(k));
      if (alvo) { e.preventDefault(); alvo.focus(); }
    }
  };

  const item = (a: ItemMenu) => (
    <Acao key={a.rotulo} role="menuitem" className={`menu-item${a.perigo ? " perigo" : ""}`} desativado={a.desligado}
      onClick={() => { gatilho.current?.focus(); fechar(); a.onClick(); }}>
      {a.icone ? <span className="menu-ic" aria-hidden="true"><Icon name={a.icone} size={16} /></span> : null}
      <span>{a.rotulo}</span>
    </Acao>
  );

  const alternar = () => (aberto ? fechar() : setAberto(true));
  return (
    <div className={`menu-mais${className ? ` ${className}` : ""}`} ref={caixa}>
      {soIcone
        ? <BotaoIcone ref={gatilho} rotulo={rotulo} className="menu-pontos" aria-haspopup="menu" aria-expanded={aberto} onClick={alternar}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
          </BotaoIcone>
        : <Botao ref={gatilho} compacto={compacto} aria-haspopup="menu" aria-expanded={aberto} onClick={alternar}>
            {conteudo ?? <>{rotulo} <span className="menu-seta" aria-hidden="true"><Caret open={aberto && !saindo} size={13} /></span></>}
          </Botao>}
      {aberto && (
        <div ref={lista} className={`menu-mais-pop menu-${alinhar}${saindo ? " saindo" : ""}`} role="menu" aria-label={rotulo} onKeyDown={navegar}>
          {comuns.map(item)}
          {perigosos.length > 0 && comuns.length > 0 ? <div className="menu-sep" role="separator" /> : null}
          {perigosos.map(item)}
        </div>
      )}
    </div>
  );
}
