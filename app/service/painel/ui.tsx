"use client";

/* Peças de tela do painel usadas pela casca e pelos módulos (app/service/modules/*).
   Saíram de ServiceExactApp.tsx na 4.1 para os módulos importarem sem ciclo. */

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Caret, Icon } from "../lib/icons";
import { HelpDot } from "../HelpSystem";
import { iniciais } from "../lib/iniciais";

import { Botao } from "../ui/Botao";
import { Acao } from "../ui/Acao";
import { Selo, tomDaClasse } from "../ui/Selo";
/* grupo do menu da tela aberta: o sobretítulo da página mostra o grupo */
export const RouteGroupContext = createContext<string | null>(null);

export const initials = (name: string) => iniciais(name);

export function Av({ name, size = "sm", photoUrl }: { name: string; size?: "xs" | "sm" | "md" | "lg"; photoUrl?: string | null }) {
  return (
    <div className={`av av-${size}${photoUrl ? " has-foto" : ""}`} style={photoUrl ? { backgroundImage: `url(${photoUrl})` } : undefined}>
      {initials(name)}
    </div>
  );
}

const CHIP_LABEL: Record<string, string> = { ativo: "Ativo", pausa: "Em pausa", ferias: "Férias", membro: "Membro", ok: "Confirmado", wait: "Aguardando", no: "Não pode" };

export function Chip({ status }: { status: string }) {
  const cls = status === "ativo" || status === "membro" || status === "ok" ? "chip-ok" : status === "pausa" || status === "wait" ? "chip-wait" : "chip-neutral";
  return <Selo tom={tomDaClasse(cls)}>{CHIP_LABEL[status] ?? status}</Selo>;
}

/* subtitle: só uma contagem ou um fato curto ("34 pessoas"), no máximo uma linha.
   O que explica a tela vai em help, no "?" ao lado do título (onda 0). */
export function PageHead({ title, eyebrow, subtitle, action, help }: { title: string; eyebrow: string; subtitle?: string; action?: React.ReactNode; help?: string }) {
  const grupo = useContext(RouteGroupContext);
  return (
    <div className="ph">
      <div>
        <div className="ph-eyebrow">{grupo ?? eyebrow}</div>
        <h1 className="ph-title">{title} {help ? <HelpDot text={help} /> : null}</h1>
        {subtitle ? <p className="ph-sub">{subtitle}</p> : null}
      </div>
      {action ? <div className="ph-actions">{action}</div> : null}
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="empty-state">
      <div className="empty-state-t">{title}</div>
      <p className="empty-state-s">{text}</p>
      {action ? <Botao variante="principal" compacto onClick={action.onClick}>{action.label}</Botao> : null}
    </div>
  );
}

export type AcaoMais = { rotulo: string; icone?: string; onClick: () => void; desligada?: boolean };

/** "Mais": ações de uso ocasional de uma tela, num menu (as principais ficam à vista).
    Fecha no clique fora e no Esc, que devolve o foco ao botão. */
export function MenuMais({ acoes, rotulo = "Mais" }: { acoes: AcaoMais[]; rotulo?: string }) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => { if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false); };
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      setAberto(false);
      botao.current?.focus();
    };
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", tecla);
    caixa.current?.querySelector<HTMLButtonElement>("[role=menuitem]:not([disabled])")?.focus();
    return () => { document.removeEventListener("mousedown", fora); document.removeEventListener("keydown", tecla); };
  }, [aberto]);
  if (!acoes.length) return null;
  return (
    <div className="menu-mais" ref={caixa}>
      <Botao ref={botao} aria-haspopup="menu" aria-expanded={aberto} onClick={() => setAberto((v) => !v)}>
        {rotulo} <Caret open={aberto} size={13} />
      </Botao>
      {aberto && (
        <div className="menu-mais-pop" role="menu">
          {acoes.map((a) => (
            <Acao key={a.rotulo} role="menuitem" desativado={a.desligada} onClick={() => { setAberto(false); a.onClick(); }}>
              {a.icone ? <span className="ic"><Icon name={a.icone} size={16} /></span> : null}
              {a.rotulo}
            </Acao>
          ))}
        </div>
      )}
    </div>
  );
}
