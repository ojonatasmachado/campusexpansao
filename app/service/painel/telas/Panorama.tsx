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
import { useTexto } from "../../lib/internacional/contexto";

export function Panorama({
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
  const traduzirUi = useTexto();

  const { comTermos: ct } = useTermos();
  const incompletos = cobertura.filter((t) => t.preenchidas < t.total);
  const completosCount = cobertura.length - incompletos.length;

  return (
    <>
      <DrawerSection title={ct(traduzirUi("Cobertura"))}>
        {incompletos.length === 0 && completosCount === 0 ? (
          <p className="mini-sub">{traduzirUi("Sem times neste culto.")}</p>
        ) : (
          <ul className="panorama-cob" aria-label={ct(traduzirUi("Cobertura"))}>
            {incompletos.map((t) => (
              <li key={t.timeId}>
                <Acao
                  className="panorama-cob-linha mini-row"
                  aria-label={`${t.time}: ${t.preenchidas}/${t.total}`}
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
            ))}
            {completosCount > 0 && (
              <li className="panorama-cob-ok-li">
                <div className="mini-sub panorama-cob-ok">
                  +{completosCount} {completosCount === 1 ? traduzirUi("ok") : traduzirUi("ok")}
                </div>
              </li>
            )}
          </ul>
        )}
      </DrawerSection>

      <DrawerSection title={ct(traduzirUi("Roteiro"))}>
        {schedule.length === 0 ? (
          <p className="mini-sub">{traduzirUi("Sem etapas.")}</p>
        ) : (
          <ul className="panorama-crono" aria-label={ct(traduzirUi("Roteiro"))}>
            {schedule.map((step) => (
              <li key={step.id}>
                <Linha>
                  <span className="panorama-crono-hora">{step.time ?? "--:--"}</span>
                  <div className="mini-main">
                    <div className="panorama-crono-item">{step.item || traduzirUi("Sem nome")}</div>
                  </div>
                </Linha>
              </li>
            ))}
          </ul>
        )}
      </DrawerSection>
    </>
  );
}