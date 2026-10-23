/* Etapas e linha do tempo do Service (BIBLIOTECA.md, pranchas 1 e 6): uma peça
   só no lugar de .tl, .jrn-tl, .m6-step e .imp-steps. Cada etapa é feita, atual
   ou futura, e mostra a data real em que aconteceu (regra da jornada: nunca só um
   "concluído"; sem data registrada, a etapa diz isso).

   - linha: vertical, para histórico e caminhada no painel (ponto, data, texto).
   - app: vertical do app do membro, ponto grande com check ou número e ação.
   - faixa: horizontal, para um fluxo curto (troca de escala, assistente).

   Movimento: as etapas entram em cascata com a mola, o trilho se preenche até a
   atual e a atual ganha um halo que pulsa ao chegar. Tudo some com movimento
   reduzido. Visual em biblioteca.css (.etapas). */

import type { CSSProperties, ReactNode } from "react";
import { Icon } from "../lib/icons";
import { Acao } from "./Acao";

export type EstadoEtapa = "feito" | "atual" | "futuro";

export type Etapa = {
  id: string;
  /* no histórico de anotações, sem título: o texto vai em detalhe */
  titulo?: ReactNode;
  estado: EstadoEtapa;
  /* data real do fato, já escrita para ler ("14/03/2026", "domingo, 9h") */
  quando?: ReactNode;
  /* complemento depois do título (linha) ou embaixo (app) */
  detalhe?: ReactNode;
  /* quem registrou */
  por?: ReactNode;
  icone?: string;
  /* botão ou link da etapa (só no estilo app) */
  acao?: ReactNode;
  /* tom do ponto quando a etapa vem de outra área (wheat, clay); padrão é a cor da igreja */
  tom?: "wheat" | "clay" | "neutro";
};

export type EtapasProps = {
  itens: Etapa[];
  estilo?: "linha" | "app" | "faixa";
  compacto?: boolean;
  /* nome da lista para o leitor de tela */
  rotulo?: string;
  /* etapa feita que pode ser reaberta (assistente): vira botão */
  aoEscolher?: (id: string) => void;
  /* texto quando falta a data de uma etapa feita */
  semData?: string;
  className?: string;
};

const ESTADO_FALADO: Record<EstadoEtapa, string> = { feito: "feito", atual: "etapa atual", futuro: "ainda não" };

export function Etapas({ itens, estilo = "linha", compacto, rotulo, aoEscolher, semData = "sem data registrada", className }: EtapasProps) {
  const cls = ["etapas", `etapas-${estilo}`, compacto ? "compacto" : "", className ?? ""].filter(Boolean).join(" ");
  return (
    <ol className={cls} aria-label={rotulo}>
      {itens.map((e, i) => {
        const ponto = (
          <span className="etapa-ponto" aria-hidden="true">
            {estilo === "app" ? (e.estado === "feito" ? <Icon name="ok" size={18} /> : e.estado === "atual" ? <Icon name={e.icone ?? "pendente"} size={18} /> : i + 1) : estilo === "faixa" ? (e.estado === "feito" ? <Icon name="ok" size={12} /> : i + 1) : null}
          </span>
        );
        const quando = e.quando ?? (e.estado === "feito" ? semData : null);
        const corpo = estilo === "app" ? (
          <span className="etapa-corpo">
            <span className="etapa-titulo">{e.titulo}</span>
            {quando || e.detalhe ? <span className="etapa-quando">{quando}{quando && e.detalhe ? " · " : ""}{e.detalhe}</span> : null}
            {e.acao ? <span className="etapa-acao">{e.acao}</span> : null}
          </span>
        ) : estilo === "faixa" ? (
          <span className="etapa-titulo">{e.titulo}</span>
        ) : (
          <span className="etapa-corpo">
            {quando ? <span className="etapa-quando">{e.icone ? <Icon name={e.icone} size={11} /> : null}{quando}</span> : null}
            <span className="etapa-texto">{e.titulo ? <b>{e.titulo}</b> : null}{e.detalhe ? <>{e.titulo ? " · " : ""}{e.detalhe}</> : null}</span>
            {e.por ? <span className="etapa-por">por {e.por}</span> : null}
          </span>
        );
        const podeVoltar = !!aoEscolher && e.estado === "feito";
        return (
          <li key={e.id} className={`etapa ${e.estado}${e.tom ? ` tom-${e.tom}` : ""}`} aria-current={e.estado === "atual" ? "step" : undefined}
            style={{ "--i": i } as CSSProperties}>
            {podeVoltar ? (
              <Acao className="etapa-volta" onClick={() => aoEscolher(e.id)}>{ponto}{corpo}</Acao>
            ) : <>{ponto}{corpo}</>}
            <span className="sr-only">, {ESTADO_FALADO[e.estado]}</span>
          </li>
        );
      })}
    </ol>
  );
}
