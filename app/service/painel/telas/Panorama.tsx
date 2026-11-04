"use client";

/* Panorama do culto (E2): tela só de leitura para acompanhamento.
   - Cobertura: times incompletos um por um (problemas primeiro), completos em linha única.
   - Cronograma: etapas em ordem, sem edição.
   - Toque num time incompleto abre a aba Posições rolada até esse time.
   Lei 15: montar ≠ acompanhar. Lei 17: peças da BIBLIOTECA, zero elemento nativo à mão. */

import type { CoberturaTime } from "../../modules/escalas/cobertura";
import type { CronoStep, EventView, MinistryView } from "../tipos";

import { Acao } from "../../ui/Acao";
import { Linha } from "../../ui/Linha";
import { Selo } from "../../ui/Selo";
import { DrawerSection } from "../campos";
import { useTermos } from "../../lib/vocabulario-context";
import { joinDot } from "../../lib/date";

export function Panorama({
  event,
  ministries,
  cobertura,
  schedule,
  onAbrirTime,
}: {
  event: EventView;
  ministries: MinistryView[];
  cobertura: CoberturaTime[];
  schedule: CronoStep[];
  onAbrirTime: (timeId: string) => void;
}) {
  const { comTermos: ct } = useTermos();
  const incompletos = cobertura.filter((t) => t.preenchidas < t.total);
  const completosCount = cobertura.length - incompletos.length;
  const ministryName = (id: string | null) =>
    id ? ministries.find((m) => m.id === id)?.name ?? null : null;

  return (
    <>
      <DrawerSection title={ct("Cobertura por time")}>
        {incompletos.length === 0 && completosCount === 0 ? (
          <p className="mini-sub">Nenhum time cadastrado para este {ct("culto")}.</p>
        ) : (
          <ul className="panorama-cob" aria-label={ct("Cobertura por time")}>
            {incompletos.map((t) => {
              const falta = t.total - t.preenchidas;
              const rotulo = `${t.time}: ${t.preenchidas} de ${t.total} vagas preenchidas. Abrir as ${falta} vagas em aberto.`;
              return (
                <li key={t.timeId}>
                  <Acao
                    className="panorama-cob-linha mini-row"
                    aria-label={rotulo}
                    onClick={() => onAbrirTime(t.timeId)}
                  >
                    <div className="mini-main">
                      <div className="mini-title">{t.time}</div>
                    </div>
                    <Selo tom="cuidado" tamanho="lista">
                      {t.preenchidas}/{t.total}
                    </Selo>
                  </Acao>
                </li>
              );
            })}
            {completosCount > 0 && (
              <li>
                <Linha>
                  <div className="mini-main">
                    <div className="mini-sub panorama-cob-ok">
                      {completosCount} {completosCount === 1 ? "time completo" : "times completos"}
                    </div>
                  </div>
                </Linha>
              </li>
            )}
          </ul>
        )}
      </DrawerSection>

      <DrawerSection title={ct("Roteiro do {culto}")}>
        {schedule.length === 0 ? (
          <p className="mini-sub">Sem cronograma ainda.</p>
        ) : (
          <ul className="panorama-crono" aria-label={ct("Roteiro do {culto}")}>
            {schedule.map((step) => {
              const timeNome = ministryName(step.ministry_id ?? null);
              return (
                <li key={step.id}>
                  <Linha>
                    <div className="mini-main">
                      <div className="mini-title">
                        <span className="panorama-crono-hora">{step.time ?? "--:--"}</span>
                        <span className="panorama-crono-item">{step.item || ct("Etapa sem nome")}</span>
                      </div>
                      <div className="mini-sub">
                        {joinDot(
                          step.duration_min ? `${step.duration_min} min` : null,
                          timeNome,
                          step.notes ?? null,
                        )}
                      </div>
                    </div>
                  </Linha>
                </li>
              );
            })}
          </ul>
        )}
      </DrawerSection>
    </>
  );
}