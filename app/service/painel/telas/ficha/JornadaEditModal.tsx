"use client";

import { useState } from "react";
import { useTermos } from "../../../lib/vocabulario-context";
import { JRN_STEPS, rotuloEtapaJornada } from "../../caminhada";
import { avisar } from "../../../lib/avisar";
import { JORNADA_KIND_INDEX, writeJourneyStep } from "../../comum";
import type { ChurchView, JourneyStepKind, MemberView, TimelineEventView } from "../../tipos";
import { Botao } from "../../../ui/Botao";
import { Linha } from "../../../ui/Linha";
import { Campo } from "../../../ui/Campo";
import { SeletorData } from "../../../ui/Data";
import { Janela } from "../../../ui/Janela";
import { useTexto } from "../../../lib/internacional/contexto";


export function JornadaEditModal({
  member, events, church, onClose, onRefresh,
}: {
  member: MemberView;
  events: TimelineEventView[];
  church: ChurchView | undefined;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const traduzirUi = useTexto();

  const { comTermos: ct } = useTermos();
  const [rows, setRows] = useState<Record<JourneyStepKind, { done: boolean; date: string }>>(() =>
    Object.fromEntries(JRN_STEPS.map((step) => [step.kind, { done: false, date: "" }])) as Record<JourneyStepKind, { done: boolean; date: string }>,
  );
  const [saving, setSaving] = useState(false);

  const marcar = (kind: JourneyStepKind) => setRows((prev) => ({ ...prev, [kind]: { ...prev[kind], done: true } }));
  const setData = (kind: JourneyStepKind, date: string) => setRows((prev) => ({ ...prev, [kind]: { ...prev[kind], date } }));

  const salvar = async () => {
    setSaving(true);
    try {
      if (!church?.organizationId) throw new Error("Organização da igreja ausente.");
      for (const step of JRN_STEPS) {
        const jaConcluido = !!member.journey[JORNADA_KIND_INDEX[step.kind]];
        if (!jaConcluido && rows[step.kind].done) {
          await writeJourneyStep(member, step.kind, rows[step.kind].date || null);
        }
      }
      onRefresh();
      onClose();
    } catch {
      avisar(ct(traduzirUi("Não conseguimos salvar a {caminhada}. Tente de novo.")), "warn");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Janela sobretitulo={<>{ct("{Caminhada}")}</>} titulo={member.name} texto={traduzirUi("Marque as etapas já concluídas, com a data real de cada uma.")} aoFechar={onClose} corpoBloco rodape={<>
          <Botao onClick={onClose}>{traduzirUi("Cancelar")}</Botao>
          <Botao variante="principal" desativado={saving} onClick={salvar}>{traduzirUi("Salvar")}</Botao>
      </>}>
      {JRN_STEPS.map((step) => {
        const jaConcluido = !!member.journey[JORNADA_KIND_INDEX[step.kind]];
        const event = events.find((e) => e.event_type === step.kind);
        return (
          <Linha estilo="config" key={step.kind} style={{ alignItems: "flex-start" }}>
            <div className="cfg-row-main">
              <div className="cfg-row-t">{ct(rotuloEtapaJornada(step.label, traduzirUi))}</div>
              {jaConcluido ? (
                <div className="cfg-row-s">{event?.when_label ? traduzirUi("Concluído em {data}", { data: event.when_label }) : traduzirUi("Concluído")}</div>
              ) : rows[step.kind].done ? (
                <Campo rotulo={traduzirUi("Data")} style={{ marginTop: 8 }}>
                  <SeletorData valor={rows[step.kind].date} aoMudar={(v) => setData(step.kind, v)} />
                </Campo>
              ) : (
                <Botao compacto style={{ marginTop: 8 }} onClick={() => marcar(step.kind)}>{traduzirUi("Marcar como concluído")}</Botao>
              )}
            </div>
          </Linha>
        );
      })}
    </Janela>
  );
}
