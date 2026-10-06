"use client";

/* Saúde da igreja (v7 4.11): primeira coisa que gestão e pastores veem no
   Início do painel. Período de 30 dias por padrão, 90 dias, 12 meses ou
   datas escolhidas, comparado ao período anterior. Cada número abre a lista
   das pessoas que ele conta. */
import { useState } from "react";
import { formatDateBR } from "../../lib/date";
import { useTermos } from "../../lib/vocabulario-context";
import { anteriorDe, comparacao, etapasDaCaminhada, numerosDaBase, numerosDoPeriodo, periodoDe, type DadosSaude, type ItemPessoa, type Numero, type Periodo, type Preset } from "./saude";

const PRESETS: { v: Preset; l: string }[] = [
  { v: "30", l: "30 dias" },
  { v: "90", l: "90 dias" },
  { v: "365", l: "12 meses" },
  { v: "datas", l: "Datas" },
];

export function SaudeDaIgreja({ dados, etapas, onAbrir }: {
  dados: DadosSaude;
  etapas: { label: string }[];
  onAbrir: (item: ItemPessoa) => void;
}) {
  const { comTermos: ct } = useTermos();
  const [preset, setPreset] = useState<Preset>("30");
  const [datas, setDatas] = useState<Periodo>(() => periodoDe("30"));
  const [lista, setLista] = useState<Numero | null>(null);
  const periodo = periodoDe(preset, datas);
  const dias = Math.round((new Date(`${periodo.fim}T12:00:00Z`).getTime() - new Date(`${periodo.ini}T12:00:00Z`).getTime()) / 86400000) + 1;
  const ant = anteriorDe(periodo);

  const grade = (nums: Numero[]) => (
    <div className="saude-grid">
      {nums.map((n) => {
        const cmp = comparacao(n.valor, n.anterior, dias);
        return (
          <button key={n.id} type="button" className="saude-n" onClick={() => setLista(n)} disabled={!n.itens.length} aria-label={`${ct(n.rotulo)}: ${n.valor}${cmp ? `, ${cmp}` : ""}. Ver a lista`}>
            <span className="saude-v">{n.valor}</span>
            <span className="saude-l">{ct(n.rotulo)}</span>
            {cmp && <span className="saude-c">{cmp}</span>}
          </button>
        );
      })}
    </div>
  );

  return (
    <section className="saude" aria-label="Saúde da igreja">
      <div className="saude-head">
        <h2 className="saude-t">Saúde da igreja</h2>
        <div className="seg seg-sm" role="radiogroup" aria-label="Período">
          {PRESETS.map((p) => (
            <button key={p.v} type="button" role="radio" aria-checked={preset === p.v} className={preset === p.v ? "on" : ""} onClick={() => setPreset(p.v)}>{p.l}</button>
          ))}
        </div>
      </div>
      {preset === "datas" && (
        <div className="saude-datas">
          <label>De <input className="input" type="date" value={datas.ini} onChange={(e) => setDatas((d) => ({ ...d, ini: e.target.value }))} /></label>
          <label>até <input className="input" type="date" value={datas.fim} onChange={(e) => setDatas((d) => ({ ...d, fim: e.target.value }))} /></label>
        </div>
      )}
      <div className="saude-grp">Hoje</div>
      {grade(numerosDaBase(dados))}
      <div className="saude-grp">{`De ${formatDateBR(periodo.ini)} a ${formatDateBR(periodo.fim)}`}<span className="saude-grp-s">{` · comparado a ${formatDateBR(ant.ini)} a ${formatDateBR(ant.fim)}`}</span></div>
      {grade(numerosDoPeriodo(dados, periodo))}
      <div className="saude-grp">{ct("Etapas da {caminhada}")}<span className="saude-grp-s"> · membros que já fizeram cada uma</span></div>
      {grade(etapasDaCaminhada(dados.membros, etapas))}

      {lista && (
        <div className="modal-bg" onClick={() => setLista(null)}>
          <div className="modal" role="dialog" aria-label={ct(lista.rotulo)} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">{ct(lista.rotulo)}</div>
              <div className="modal-sub">{lista.itens.length === 1 ? "1 pessoa" : `${lista.itens.length} pessoas`}</div>
            </div>
            <div className="modal-body" style={{ display: "block" }}>
              {[...lista.itens].sort((a, b) => a.nome.localeCompare(b.nome)).map((it) => (
                <button key={`${it.tipo}-${it.id}`} type="button" className="mini-row click" onClick={() => { setLista(null); onAbrir(it); }}>
                  <div className="mini-main"><div className="mini-title">{it.nome}</div></div>
                </button>
              ))}
            </div>
            <div className="modal-foot"><button className="btn btn-pri" type="button" onClick={() => setLista(null)}>Fechar</button></div>
          </div>
        </div>
      )}
    </section>
  );
}
