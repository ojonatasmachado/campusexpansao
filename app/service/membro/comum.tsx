"use client";

import { cpfValido } from "../lib/cpf";
import { enderecoNoBrasil } from "../lib/endereco";
import { isCivilDate, todayISO } from "../lib/date";
import { telefoneValido } from "../lib/telefone";
import { createContext, useContext } from "react";
import { Icon } from "../lib/icons";
import { Folha } from "../ui/Janela";
import { parseISODate, weekdayFromISO } from "../lib/date";
import { iniciais } from "../lib/iniciais";
import { useTermos } from "../lib/vocabulario-context";
import { requirementLabel } from "../lib/requirements";
import type { JourneyActions, MemberContactInput, MemberUi, Ministry, MissingRequirement } from "./tipos";

import { Acao } from "../ui/Acao";
import { Avatar } from "../ui/Avatar";
import { Selo, tomDaClasse } from "../ui/Selo";
import { linhaClasse } from "../ui/Linha";
/* o servidor troca vazio por "Telefone não informado" / "E-mail não
   informado" (page.tsx toMemberView); em campo editável isso vira vazio */
export const realValue = (v: string | null | undefined) => (v && !/não informado$/.test(v) ? v : "");
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const contactErrors = (c: MemberContactInput) => ({
  cpf: c.cpf?.trim() && !cpfValido(c.cpf) ? "Confira os números do CPF." : "",
  name: c.name.trim().split(/\s+/).length < 2 ? "Coloque nome e sobrenome." : "",
  email: !EMAIL_RE.test(c.email.trim()) ? "Coloque um e-mail válido." : "",
  phone: !telefoneValido(c.phone) ? "Coloque o telefone com DDD. Para outro país, inclua + e o código do país." : "",
  nasc: c.nasc && (!isCivilDate(c.nasc) || c.nasc > todayISO()) ? "Confira a data do seu aniversário." : "",
  cep: enderecoNoBrasil(c.country) && !/^\d{5}-?\d{3}$/.test(c.cep.trim()) ? "Coloque o CEP com 8 números." : c.cep.trim().length > 32 ? "Use até 32 caracteres no código postal." : "",
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
  time_fechado: "Este time não está recebendo pedidos agora.",
  sem_lider_no_app: "O time ainda não tem um líder disponível no app.",
  ja_serve: "Você já serve neste time.",
  sem_ficha: "Sua ficha ainda não está ligada ao app. Fale com a liderança.",
};
export const mensagemAcao = (r: string) => RESULTADO_ACAO[r] ?? "Não foi possível agora. Tente de novo.";

// ── helpers ───────────────────────────────────────────────────────────────────

export const ini = (name: string) => iniciais(name);

/* avatar do app: a peça é Avatar (app/service/ui/Avatar.tsx) */
export function Av({ name, size = "sm", photoUrl }: { name: string; size?: "xs" | "sm" | "md" | "lg" | "xl"; photoUrl?: string | null }) { /* lei17-ok: nome antigo, só repassa para Avatar */
  return <Avatar nome={name} tamanho={size} foto={photoUrl} />;
}
export const MemberUiContext = createContext<MemberUi>({ go: () => {}, sheet: () => {}, toast: () => {}, respostas: {}, responderEscala: () => {}, tamanhoTexto: () => {}, abrirEvento: () => {}, escalaConfirmada: () => {} });

export function M6Row({ ic, t, s, onClick, right, cls }: { ic?: string; t: React.ReactNode; s?: React.ReactNode; onClick?: () => void; right?: React.ReactNode | null; cls?: string }) {
  return (
    <Acao className={`${linhaClasse({ estilo: "app" })}${cls ? ` ${cls}` : ""}`} onClick={onClick}>
      {ic && <span className="m6-ic"><Icon name={ic} size={22} /></span>}
      <span className="m6-rb">
        <span className="m6-rt">{t}</span>
        {s ? <span className="m6-rs">{s}</span> : null}
      </span>
      {right !== undefined ? right : <span className="m6-chev"><Icon name="avancar" size={18} /></span>}
    </Acao>
  );
}

/* folha de baixo do app do membro: a peça é Folha (app/service/ui/Janela.tsx),
   com a alça de arrastar para fechar. */
export function M6Sheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return <Folha aoFechar={onClose}>{children}</Folha>;
}

export function M6St({ k, ic, children }: { k: "ok" | "warn" | "neutral" | "danger"; ic?: string; children: React.ReactNode }) {
  return <Selo tamanho="toque" tom={tomDaClasse(k)}>{ic && <Icon name={ic} size={16} />}<span>{children}</span></Selo>;
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
