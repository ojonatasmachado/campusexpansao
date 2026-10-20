"use client";

import { createContext, useContext, useRef } from "react";
import { Icon } from "../lib/icons";
import { parseISODate, weekdayFromISO } from "../lib/date";
import { iniciais } from "../lib/iniciais";
import { useTermos } from "../lib/vocabulario-context";
import { requirementLabel } from "../lib/requirements";
import type { JourneyActions, MemberContactInput, MemberUi, Ministry, MissingRequirement } from "./tipos";

/* o servidor troca vazio por "Telefone não informado" / "E-mail não
   informado" (page.tsx toMemberView); em campo editável isso vira vazio */
export const realValue = (v: string | null | undefined) => (v && !/não informado$/.test(v) ? v : "");
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const contactErrors = (c: MemberContactInput) => ({
  name: c.name.trim().split(/\s+/).length < 2 ? "Coloque nome e sobrenome." : "",
  email: !EMAIL_RE.test(c.email.trim()) ? "Coloque um e-mail válido." : "",
  phone: c.phone.replace(/\D/g, "").length < 10 ? "Coloque o telefone com DDD." : "",
  nasc: !c.nasc ? "Coloque a data do seu aniversário." : "",
  cep: c.cep.replace(/\D/g, "").length !== 8 ? "Coloque o CEP com 8 números." : "",
});
export const JourneyContext = createContext<JourneyActions>({ missing: [], serveRequests: [], baptismCandidates: [], names: { courses: [], events: [] } });

/* o que falta pra um alvo, já em texto */
export function useFaltas() {
  const j = useContext(JourneyContext);
  const { comTermos: ct } = useTermos();
  return (kind: MissingRequirement["target_kind"], id: string | null) =>
    j.missing
      .filter((m) => m.target_kind === kind && (m.target_id ?? null) === id)
      .map((m) => ct(requirementLabel({ kind: m.req_kind, ref: m.req_ref }, j.names)));
}

export const RESULTADO_ACAO: Record<string, string> = {
  faltam_requisitos: "Ainda falta cumprir os pré-requisitos.",
  inscricoes_fechadas: "As inscrições desta turma estão fechadas.",
  ja_serve: "Você já serve neste time.",
  sem_ficha: "Sua ficha ainda não está ligada ao app. Fale com a liderança.",
};
export const mensagemAcao = (r: string) => RESULTADO_ACAO[r] ?? "Não foi possível agora. Tente de novo.";

// ── helpers ───────────────────────────────────────────────────────────────────

export const ini = (name: string) => iniciais(name);

export function Av({ name, size = "sm", photoUrl }: { name: string; size?: "xs" | "sm" | "md" | "lg" | "xl"; photoUrl?: string | null }) {
  return (
    <div className={`av av-${size}${photoUrl ? " has-foto" : ""}`} style={photoUrl ? { backgroundImage: `url(${photoUrl})` } : undefined}>
      {ini(name)}
    </div>
  );
}
export const MemberUiContext = createContext<MemberUi>({ go: () => {}, sheet: () => {}, toast: () => {}, respostas: {}, responderEscala: () => {}, tamanhoTexto: () => {}, abrirEvento: () => {}, escalaConfirmada: () => {} });

export function M6Row({ ic, t, s, onClick, right, cls }: { ic?: string; t: React.ReactNode; s?: React.ReactNode; onClick?: () => void; right?: React.ReactNode | null; cls?: string }) {
  return (
    <button type="button" className={`m6-row${cls ? ` ${cls}` : ""}`} onClick={onClick}>
      {ic && <span className="m6-ic"><Icon name={ic} size={22} /></span>}
      <span className="m6-rb">
        <span className="m6-rt">{t}</span>
        {s ? <span className="m6-rs">{s}</span> : null}
      </span>
      {right !== undefined ? right : <span className="m6-chev"><Icon name="avancar" size={18} /></span>}
    </button>
  );
}

/* folha de baixo com alça de arrastar (apple-design · familiaridade; receita "drag to
   dismiss" da skill animate): a alça promete arrastar, então arrasta. Segue o dedo
   1:1 por transform direto no elemento, fecha num gesto rápido (velocidade > 0,11)
   ou depois de 30% da altura, resiste ao ser puxada para cima, ignora o segundo dedo
   e sai pela mesma borda por onde entrou. */
export function M6Sheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const folha = useRef<HTMLDivElement>(null);
  const arraste = useRef<{ id: number; y0: number; t0: number; dy: number } | null>(null);
  const soltarPara = (destino: "fechar" | "voltar") => {
    const el = folha.current;
    if (!el) return;
    el.style.transition = destino === "fechar" ? "transform .2s var(--ease-out)" : "transform .3s var(--ease-drawer)";
    el.style.transform = destino === "fechar" ? "translateY(100%)" : "";
    if (destino === "fechar") window.setTimeout(onClose, 200);
  };
  return (
    <div className="m6-scrim" onClick={onClose}>
      <div className="m6-sheet" ref={folha} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div
          className="m6-grab-zona"
          aria-hidden="true"
          onPointerDown={(e) => {
            if (arraste.current) return;
            arraste.current = { id: e.pointerId, y0: e.clientY, t0: Date.now(), dy: 0 };
            e.currentTarget.setPointerCapture(e.pointerId);
            if (folha.current) folha.current.style.transition = "none";
          }}
          onPointerMove={(e) => {
            const a = arraste.current;
            if (!a || a.id !== e.pointerId || !folha.current) return;
            const dy = e.clientY - a.y0;
            a.dy = dy;
            /* para cima: resistência crescente em vez de parede */
            const y = dy >= 0 ? dy : -(Math.abs(dy) * 40) / (40 + Math.abs(dy));
            folha.current.style.transform = `translateY(${y}px)`;
          }}
          onPointerUp={(e) => {
            const a = arraste.current;
            if (!a || a.id !== e.pointerId) return;
            arraste.current = null;
            const altura = folha.current?.offsetHeight ?? 1;
            const velocidade = a.dy / Math.max(1, Date.now() - a.t0);
            soltarPara(a.dy > 0 && (a.dy > altura * 0.3 || velocidade > 0.11) ? "fechar" : "voltar");
          }}
          onPointerCancel={(e) => { if (arraste.current?.id === e.pointerId) { arraste.current = null; soltarPara("voltar"); } }}
        >
          <div className="m6-grab" />
        </div>
        {children}
      </div>
    </div>
  );
}

export function M6St({ k, ic, children }: { k: "ok" | "warn" | "neutral" | "danger"; ic?: string; children: React.ReactNode }) {
  return <span className={`m6-st ${k}`}>{ic && <Icon name={ic} size={16} />}<span>{children}</span></span>;
}

export const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
export function dataLonga(iso?: string | null) {
  const d = parseISODate(iso);
  if (!d) return "";
  return `${weekdayFromISO(iso)}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

// ── cartão de escala (S18) ────────────────────────────────────────────────────
/* Confirmar e Não posso de 52px. A resposta só vai pro banco depois de alguns
   segundos: dá tempo de tocar em "Desfazer" no aviso. Pedir troca abre uma
   conversa com o líder do time, com a mensagem já escrita. */
export const UNDO_MS = 5000;

// ── Agenda (S19, v7 4.5) ──────────────────────────────────────────────────────
/* "Minha agenda" reúne tudo que envolve a pessoa, por dia, com o tipo escrito
   (Serve, Ensaio, Reunião, Aula, Tarefa, Evento, Culto) e o conflito de horário
   marcado. "Igreja" é a programação pública. Escala a confirmar continua em
   cartão no alto (com Confirmar e Não posso). */
export const chegadaDoTime = (m?: Ministry) => (typeof m?.profile?.chegada === "string" ? m.profile.chegada : null);
