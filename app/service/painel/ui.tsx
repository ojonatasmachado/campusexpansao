"use client";

/* Peças de tela do painel usadas pela casca e pelos módulos (app/service/modules/*).
   Saíram de ServiceExactApp.tsx na 4.1 para os módulos importarem sem ciclo. */

import { createContext, useContext } from "react";
import { HelpDot } from "../HelpSystem";

/* grupo do menu da tela aberta: o sobretítulo da página mostra o grupo */
export const RouteGroupContext = createContext<string | null>(null);

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

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
  return <span className={`chip ${cls}`}>{CHIP_LABEL[status] ?? status}</span>;
}

export function PageHead({ title, eyebrow, subtitle, action, help }: { title: string; eyebrow: string; subtitle: string; action?: React.ReactNode; help?: string }) {
  const grupo = useContext(RouteGroupContext);
  return (
    <div className="ph">
      <div>
        <div className="ph-eyebrow">{grupo ?? eyebrow}</div>
        <h1 className="ph-title">{title} {help ? <HelpDot text={help} /> : null}</h1>
        <p className="ph-sub">{subtitle}</p>
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
      {action ? <button className="btn btn-pri btn-sm" type="button" onClick={action.onClick}>{action.label}</button> : null}
    </div>
  );
}
