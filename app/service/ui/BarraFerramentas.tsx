"use client";

/* Barra de ferramentas do mapa (BIBLIOTECA.md, ficha "Barra de ferramentas";
   mapa/PLANO.md §10, P1 e P2). Cartão flutuante com as ferramentas à vista, cada
   uma com ícone e nome. Um item `alerta` (Emergência) fica separado no fim, no tom
   de cuidado. `fileira` é a versão do celular: uma fileira que rola para o lado.
   Item com `href` vira link com a mesma aparência do item (não é botão de ação,
   por isso não usa botaoClasse()); o resto usa Acao. */

import type { ReactNode } from "react";
import { Acao } from "./Acao";

export type ItemFerramenta = {
  id: string;
  rotulo: string;
  icone: ReactNode;
  aoTocar?: () => void;
  href?: string;
  /* Emergência: separado no fim, tom de cuidado */
  alerta?: boolean;
  ativo?: boolean;
  desativado?: boolean;
};

export function BarraFerramentas({ rotulo, itens, fileira, desloc = 0 }: {
  rotulo: string;
  itens: ItemFerramenta[];
  fileira?: boolean;
  /* largura ocupada à esquerda (o painel aberto ou o trilho): a barra centra no espaço livre */
  desloc?: number;
}) {
  const comuns = itens.filter((i) => !i.alerta);
  const alertas = itens.filter((i) => i.alerta);
  const item = (i: ItemFerramenta) => {
    const cls = `bf-item${i.alerta ? " alerta" : ""}${i.ativo ? " ativo" : ""}`;
    const miolo = (
      <>
        <span className="bf-ic" aria-hidden="true">{i.icone}</span>
        <span className="bf-rot">{i.rotulo}</span>
      </>
    );
    return i.href && !i.desativado ? (
      <a key={i.id} className={cls} href={i.href} aria-current={i.ativo ? "page" : undefined}>{miolo}</a>
    ) : (
      <Acao key={i.id} className={cls} onClick={i.aoTocar} aria-pressed={i.aoTocar && i.ativo !== undefined ? !!i.ativo : undefined} desativado={i.desativado}>{miolo}</Acao>
    );
  };
  return (
    <nav className={fileira ? "bf-barra fileira" : "bf-barra"} aria-label={rotulo} style={desloc ? { ["--bf-desloc" as string]: `${desloc}px` } : undefined}>
      <div className="bf-trilho">
        {comuns.map(item)}
        {alertas.length > 0 && comuns.length > 0 && <span className="bf-sep" aria-hidden="true" />}
        {alertas.map(item)}
      </div>
    </nav>
  );
}
