"use client";

/* Painel do mapa (BIBLIOTECA.md, ficha "Painel do mapa"; mapa/PLANO.md §10, P1).
   - PainelMapa: cartão flutuante à esquerda do mapa. Aberto, mostra cabeçalho,
     busca (opcional), corpo com as camadas ou a ferramenta, e rodapé. Recolhido,
     vira um trilho de ícones; tocar num ícone abre de novo. Com `voltar`, é o
     painel de uma ferramenta (o lugar das camadas) e mostra "Voltar ao mapa".
   - GrupoCamadas: título de um grupo; `recolhivel` vira um botão que abre e fecha.
   - LinhaCamada: a linha inteira é o interruptor (role="switch"), com o ícone
     que é o próprio marcador da camada. O que vier em `children` (legenda,
     transparência) aparece embaixo só com a camada ligada.
   Visual e movimento em biblioteca.css (.pm-*). */

import { useId } from "react";
import type { ReactNode } from "react";
import { Icon } from "../lib/icons";
import { Acao } from "./Acao";
import { BotaoIcone } from "./Botao";

export type ItemTrilho = { id: string; rotulo: string; icone: ReactNode };

export type PainelMapaProps = {
  titulo: ReactNode;
  sobretitulo?: ReactNode;
  /* nome falado do painel (aria-label) */
  rotulo: string;
  busca?: ReactNode;
  rodape?: ReactNode;
  children: ReactNode;
  recolhido?: boolean;
  aoRecolher?: (recolher: boolean) => void;
  /* ícones do trilho quando recolhido; tocar abre o painel */
  trilho?: ItemTrilho[];
  /* painel de ferramenta: mostra "Voltar ao mapa" no lugar do botão de recolher */
  voltar?: { rotulo?: string; aoTocar: () => void };
};

export function PainelMapa({ titulo, sobretitulo, rotulo, busca, rodape, children, recolhido = false, aoRecolher, trilho = [], voltar }: PainelMapaProps) {
  if (recolhido && aoRecolher) {
    return (
      <nav className="pm-trilho" aria-label={rotulo}>
        <BotaoIcone className="pm-trilho-abrir" rotulo="Abrir o painel" onClick={() => aoRecolher(false)}>
          <Icon name="avancar" size={18} stroke={2} />
        </BotaoIcone>
        {trilho.map((t) => (
          <BotaoIcone key={t.id} className="pm-trilho-item" rotulo={t.rotulo} onClick={() => aoRecolher(false)}>
            {t.icone}
          </BotaoIcone>
        ))}
      </nav>
    );
  }
  return (
    <aside className="pm-painel" aria-label={rotulo}>
      <div className="pm-cab">
        {voltar && (
          <Acao className="pm-voltar" onClick={voltar.aoTocar}>
            <Icon name="voltar" size={16} stroke={2.2} />
            {voltar.rotulo ?? "Voltar ao mapa"}
          </Acao>
        )}
        <div className="pm-cab-linha">
          <div className="pm-cab-texto">
            {sobretitulo && <div className="pm-sobre">{sobretitulo}</div>}
            <h2 className="pm-titulo">{titulo}</h2>
          </div>
          {!voltar && aoRecolher && (
            <BotaoIcone className="pm-recolher" rotulo="Recolher o painel" onClick={() => aoRecolher(true)}>
              <Icon name="voltar" size={18} stroke={2} />
            </BotaoIcone>
          )}
        </div>
        {busca && <div className="pm-busca">{busca}</div>}
      </div>
      <div className="pm-corpo">{children}</div>
      {rodape && <div className="pm-pe">{rodape}</div>}
    </aside>
  );
}

export function GrupoCamadas({ titulo, contagem, recolhivel, aberto = true, aoAlternar, children }: {
  titulo: ReactNode;
  contagem?: number;
  recolhivel?: boolean;
  aberto?: boolean;
  aoAlternar?: () => void;
  children?: ReactNode;
}) {
  const id = useId();
  const rotulo = (
    <>
      <span>{titulo}</span>
      {contagem !== undefined && <span className="pm-grupo-n">{contagem}</span>}
    </>
  );
  return (
    <section className="pm-grupo" aria-labelledby={recolhivel ? undefined : id}>
      {recolhivel ? (
        <Acao className="pm-grupo-tit pm-grupo-botao" aria-expanded={aberto} aria-controls={id} onClick={aoAlternar}>
          {rotulo}
          <Icon name="avancar" size={16} stroke={2} className={aberto ? "pm-seta aberta" : "pm-seta"} />
        </Acao>
      ) : (
        <div className="pm-grupo-tit" id={id}>{rotulo}</div>
      )}
      <div className="pm-grupo-corpo" id={recolhivel ? id : undefined} hidden={recolhivel && !aberto}>{children}</div>
    </section>
  );
}

export function LinhaCamada({ icone, rotulo, detalhe, ligada, aoAlternar, desativada, recuo, children }: {
  /* o próprio marcador da camada (dispensa legenda separada) */
  icone?: ReactNode;
  rotulo: string;
  detalhe?: ReactNode;
  ligada: boolean;
  aoAlternar: () => void;
  desativada?: boolean;
  /* linha dentro de um grupo recolhível (áreas, lugares): sem ícone, recuada */
  recuo?: boolean;
  /* legenda ou transparência, só com a camada ligada */
  children?: ReactNode;
}) {
  const id = useId();
  const cls = `pm-camada${ligada ? " ligada" : ""}${recuo ? " recuo" : ""}${children && ligada ? " com-extra" : ""}`;
  /* a linha inteira é o interruptor: o nome falado é só o rótulo e o detalhe vira
     descrição. O trilho .sw é o mesmo visual do Interruptor, só decorativo aqui
     (um Interruptor dentro da linha seria um botão dentro de outro). */
  return (
    <div className={cls}>
      <Acao className="pm-camada-linha" role="switch" aria-checked={ligada} aria-labelledby={`${id}-n`} aria-describedby={detalhe ? `${id}-d` : undefined} desativado={desativada} onClick={aoAlternar}>
        {icone && <span className="pm-camada-ic" aria-hidden="true">{icone}</span>}
        <span className="pm-camada-txt">
          <span className="pm-camada-nome" id={`${id}-n`}>{rotulo}</span>
          {detalhe && <span className="pm-camada-det" id={`${id}-d`}>{detalhe}</span>}
        </span>
        <span className={`sw${ligada ? " on" : ""} pm-camada-sw`} aria-hidden="true" />
      </Acao>
      {children && ligada && <div className="pm-camada-extra">{children}</div>}
    </div>
  );
}

/* Marca da camada no quadradinho do ícone, na paleta fixa do mapa: igreja
   (âmbar com silhueta), célula (clara com casinha) e lugar da igreja. Para as
   outras camadas, o ícone vai direto. */
export function MarcaCamada({ tipo }: { tipo: "igreja" | "celula" | "lugar" }) {
  const nome = tipo === "igreja" ? "igrejasilhueta" : tipo === "celula" ? "inicio" : "bandeira";
  return <span className={`pm-marca ${tipo}`}><Icon name={nome} size={20} stroke={1.9} /></span>;
}

/* Transparência de uma camada: controle deslizante com nome falado. */
export function TransparenciaCamada({ valor, aoMudar, rotulo = "Transparência" }: { valor: number; aoMudar: (v: number) => void; rotulo?: string }) {
  const id = useId();
  return (
    <div className="pm-transp">
      <label htmlFor={id}>{rotulo}</label>
      <input id={id} type="range" min={0} max={90} step={5} value={valor} onChange={(e) => aoMudar(Number(e.target.value))} aria-valuetext={`${valor}%`} />
    </div>
  );
}

/* Escala em tons (Presença da igreja): as 5 faixas da paleta fixa do mapa
   (cores em biblioteca.css, .pm-escala) e os rótulos das pontas. */
export function EscalaTons({ inicio, fim }: { inicio: ReactNode; fim: ReactNode }) {
  return (
    <div className="pm-escala">
      <div className="pm-escala-faixas" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((n) => <span key={n} className={`pm-tom-${n}`} />)}
      </div>
      <div className="pm-escala-rot"><span>{inicio}</span><span>{fim}</span></div>
    </div>
  );
}
