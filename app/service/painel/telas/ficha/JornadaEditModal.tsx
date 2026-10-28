"use client";

import { useState } from "react";
import { useTermos } from "../../../lib/vocabulario-context";
import { JRN_STEPS } from "../../caminhada";
import { JORNADA_KIND_INDEX, writeJourneyStep } from "../../comum";
import type { ChurchView, JourneyStepKind, MemberView, TimelineEventView } from "../../tipos";
import { Botao } from "../../../ui/Botao";
import { Linha } from "../../../ui/Linha";
import { Campo } from "../../../ui/Campo";
import { SeletorData } from "../../../ui/Data";
import { Janela } from "../../../ui/Janela";

export function JornadaEditModal({
  member, events, church, onClose, onRefresh,
}: {
  member: MemberView;
  events: TimelineEventView[];
  church: ChurchView | undefined;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const { comTermos: ct } = useTermos();
  const [rows, setRows] = useState<Record<JourneyStepKind, { done: boolean; date: string }>>(() =>
    Object.fromEntries(JRN_STEPS.map((step) => [step.kind, { done: false, date: "" }])) as Record<JourneyStepKind, { done: boolean; date: string }>,
  );
  const [saving, setSaving] = useState(false);

  const marcar = (kind: JourneyStepKind) => setRows((prev) => ({ ...prev, [kind]: { ...prev[kind], done: true } }));
  const setData = (kind: JourneyStepKind, date: string) => setRows((prev) => ({ ...prev, [kind]: { ...prev[kind], date } }));

  const salvar = async () => {
    if (!church?.organizationId) return;
    setSaving(true);
    for (const step of JRN_STEPS) {
      const jaConcluido = !!member.journey[JORNADA_KIND_INDEX[step.kind]];
      if (!jaConcluido && rows[step.kind].done) {
        await writeJourneyStep(church.organizationId, member, step.kind, rows[step.kind].date || null);
      }
    }
    setSaving(false);
    onRefresh();
    onClose();
  };

  return (
    <Janela sobretitulo={<>{ct("{Caminhada}")}</>} titulo={member.name} texto="Marque as etapas já concluídas, com a data real de cada uma." aoFechar={onClose} corpoBloco rodape={<>
          <Botao onClick={onClose}>Cancelar</Botao>
          <Botao variante="principal" desativado={saving} onClick={salvar}>Salvar</Botao>
      </>}>
      {JRN_STEPS.map((step) => {
        const jaConcluido = !!member.journey[JORNADA_KIND_INDEX[step.kind]];
        const event = events.find((e) => e.event_type === step.kind);
        return (
          <Linha estilo="config" key={step.kind} style={{ alignItems: "flex-start" }}>
            <div className="cfg-row-main">
              <div className="cfg-row-t">{ct(step.label)}</div>
              {jaConcluido ? (
                <div className="cfg-row-s">Concluído{event?.when_label ? ` em ${event.when_label}` : ""}</div>
              ) : rows[step.kind].done ? (
                <Campo rotulo="Data" style={{ marginTop: 8 }}>
                  <SeletorData valor={rows[step.kind].date} aoMudar={(v) => setData(step.kind, v)} />
                </Campo>
              ) : (
                <Botao compacto style={{ marginTop: 8 }} onClick={() => marcar(step.kind)}>Marcar como concluído</Botao>
              )}
            </div>
          </Linha>
        );
      })}
    </Janela>
  );
}
