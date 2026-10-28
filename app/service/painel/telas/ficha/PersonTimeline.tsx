"use client";

import { useTermos } from "../../../lib/vocabulario-context";
import { JRN_STEPS } from "../../caminhada";
import { porData, tipoDoFato } from "../../../lib/historico";
import type { MemberView, TimelineEventView } from "../../tipos";
import { Etapas, type Etapa } from "../../../ui/Etapas";

export function PersonTimeline({ member, events, compact }: { member: MemberView; events: TimelineEventView[]; compact?: boolean }) {
  const { comTermos: ct } = useTermos();
  const sorted = porData(events);
  const stepsWithoutEvent = JRN_STEPS.filter((step, i) => !!member.journey[i] && !events.some((e) => e.event_type === step.kind));

  if (!sorted.length && !stepsWithoutEvent.length) {
    return <div style={{ fontSize: "var(--fs-pn-13)", color: "var(--muted)", padding: "12px 0" }}>Nada registrado ainda.</div>;
  }
  /* evento com data real; etapa marcada sem fato registrado diz que falta a data */
  return (
    <Etapas compacto={compact} rotulo={ct("{Caminhada}")} itens={[
      ...sorted.map((event): Etapa => {
        const step = JRN_STEPS.find((s) => s.kind === event.event_type);
        return { id: event.id, estado: "feito", titulo: event.title, detalhe: event.body || undefined, icone: step?.icon ?? tipoDoFato(event.event_type).icone, quando: event.when_label ?? new Date(event.created_at).toLocaleDateString("pt-BR") };
      }),
      ...stepsWithoutEvent.map((step): Etapa => ({ id: step.kind, estado: "feito", titulo: ct(step.label), icone: step.icon })),
    ]} />
  );
}
