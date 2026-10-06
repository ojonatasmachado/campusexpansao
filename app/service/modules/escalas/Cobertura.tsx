"use client";

/* "Louvor 5/5 · Recepção 3/4": um item por time, incompleto primeiro.
   Com onAbrir, cada time incompleto vira botão que leva às vagas abertas. */
import type { CoberturaTime } from "./cobertura";

export function Cobertura({ itens, onAbrir, compacta }: { itens: CoberturaTime[]; onAbrir?: (timeId: string) => void; compacta?: boolean }) {
  if (!itens.length) return null;
  return (
    <ul className={`cob${compacta ? " cob-compacta" : ""}`} aria-label="Cobertura por time">
      {itens.map((t) => {
        const falta = t.preenchidas < t.total;
        const rotulo = `${t.time}, ${t.preenchidas} de ${t.total} ${t.total === 1 ? "vaga preenchida" : "vagas preenchidas"}`;
        const corpo = <><span className="cob-nome">{t.time}</span> <span className="cob-num">{t.preenchidas}/{t.total}</span></>;
        return (
          <li key={t.timeId} className={falta ? "cob-falta" : "cob-ok"}>
            {falta && onAbrir ? (
              <button type="button" aria-label={`${rotulo}. Abrir as vagas`} onClick={(e) => { e.stopPropagation(); onAbrir(t.timeId); }}>{corpo}</button>
            ) : (
              <span aria-label={rotulo}>{corpo}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
