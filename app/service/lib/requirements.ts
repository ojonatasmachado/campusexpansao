import { createServiceBrowserClient } from "./supabase-browser";
import { sourceText, type Text } from "./internacional/mensagens";

/* Requisitos que a igreja define pra curso, time ou "Quero servir"
   (service.requirements, migração 0043). Quem avalia se a pessoa cumpre é o
   banco (service.missing_requirements): aqui só edição e rótulos. */

export type RequirementTarget = "course" | "ministry" | "serve";
export type RequirementKind = "journey" | "course" | "event";
export type Requirement = { kind: RequirementKind; ref: string };
export type RequirementRow = { target_kind: RequirementTarget; target_id: string | null; req_kind: RequirementKind; req_ref: string };

export const JOURNEY_REQ_STEPS = [
  { ref: "decisao", label: "Decisão" },
  { ref: "batismo", label: "Batismo" },
  { ref: "curso", label: "Fundamentos" },
  { ref: "integracao", label: "{Grupo}" },
  { ref: "time", label: "Servindo" },
] as const;

/** Rótulo da etapa na tela, no idioma de quem vê (o ref gravado não muda). */
export function rotuloEtapaRequisito(label: string, t: Text = sourceText): string {
  const rotulos: Record<string, string> = { "Decisão": t("Decisão"), "Batismo": t("Batismo"), "Fundamentos": t("Fundamentos"), "{Grupo}": t("{Grupo}"), "Servindo": t("Servindo") };
  return Object.hasOwn(rotulos, label) ? rotulos[label] : label;
}

export function requirementsFor(rows: RequirementRow[], target: RequirementTarget, targetId: string | null): Requirement[] {
  return rows
    .filter((r) => r.target_kind === target && (r.target_id ?? null) === targetId)
    .map((r) => ({ kind: r.req_kind, ref: r.req_ref }));
}

export function requirementLabel(
  req: Requirement,
  names: { courses: { id: string; name: string }[]; events: { id: string; name: string; eventDate?: string }[]; groupsLabel?: string },
  t: Text = sourceText,
): string {
  if (req.kind === "journey") {
    const step = JOURNEY_REQ_STEPS.find((s) => s.ref === req.ref);
    const label = step?.ref === "integracao" && names.groupsLabel ? names.groupsLabel : step?.label ?? req.ref;
    /* sem tradutor, devolve o marcador do vocabulário (lei 7): quem mostra passa por comTermos/ct */
    return t === sourceText ? `{Caminhada}: ${label}` : t("{Caminhada}: {etapa}", { etapa: rotuloEtapaRequisito(label, t) });
  }
  if (req.kind === "course") return t("Concluiu: {curso}", { curso: names.courses.find((c) => c.id === req.ref)?.name ?? t("curso removido") });
  const ev = names.events.find((e) => e.id === req.ref);
  return t("Participou: {evento}", { evento: ev ? ev.name : t("evento removido") });
}

/* troca o conjunto inteiro de requisitos de um alvo numa transação só
   (service.set_requirements): se falhar, os requisitos antigos continuam */
export async function saveRequirements(
  organizationId: string,
  target: RequirementTarget,
  targetId: string | null,
  reqs: Requirement[],
): Promise<{ error?: string }> {
  const { error } = await createServiceBrowserClient()
    .schema("service")
    .rpc("set_requirements", { p_org: organizationId, p_target_kind: target, p_target_id: targetId, p_reqs: reqs });
  return error ? { error: error.message } : {};
}
