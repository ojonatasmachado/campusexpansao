"use client";

/* Saúde da igreja (v7 4.11): primeira coisa que gestão e pastores veem no
   Início do painel. Período de 30 dias por padrão, 90 dias, 12 meses ou
   datas escolhidas, comparado ao período anterior. Cada número abre a lista
   das pessoas que ele conta. */
import { useRelogioDaIgreja } from "../../lib/relogio-context";
import { useEffect, useState } from "react";
import { formatDateBR } from "../../lib/date";
import { useTermos } from "../../lib/vocabulario-context";
import { anteriorDe, comparacao, etapasDaCaminhada, numerosDaBase, numerosDoPeriodo, periodoDe, type DadosSaude, type ItemPessoa, type Numero, type Periodo, type Preset } from "./saude";

import { Botao } from "../../ui/Botao";
import { Acao } from "../../ui/Acao";
import { Opcao } from "../../ui/Opcao";
import { Linha, linhaClasse } from "../../ui/Linha";
import { Segmentado } from "../../ui/Segmentado";
import { Contagem } from "../../ui/Contagem";
const PRESETS: { v: Preset; l: string }[] = [
  { v: "30", l: "30 dias" },
  { v: "90", l: "90 dias" },
  { v: "365", l: "12 meses" },
  { v: "datas", l: "Datas" },
];

export function SaudeDaIgreja({ dados, etapas, onAbrir, podeAbrirPessoa = () => true, extras = [] }: {
  dados: DadosSaude;
  etapas: { label: string }[];
  /* números de módulos (ex. ausentes da Lista de cuidado), no grupo "Hoje" */
  extras?: Numero[];
  onAbrir: (item: ItemPessoa) => void;
  podeAbrirPessoa?: (item: ItemPessoa) => boolean;
}) {
  const { todayISO } = useRelogioDaIgreja();
  const { comTermos: ct } = useTermos();
  const [preset, setPreset] = useState<Preset>("30");
  const [datas, setDatas] = useState<Periodo>(() => periodoDe("30", undefined, todayISO()));
  const [lista, setLista] = useState<Numero | null>(null);
  /* compacta por padrão: os números de hoje sempre; período, comparação e etapas
     sob demanda, para "Para resolver" caber na primeira dobra (crítica de design 2026-10-20).
     A escolha fica neste navegador. */
  const [panorama, setPanorama] = useState(false);
  useEffect(() => {
    let salvo = false;
    try { salvo = localStorage.getItem("svc-saude-panorama") === "1"; } catch { /* sem armazenamento */ }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- preferência do navegador, lida depois de montar (o servidor não tem)
    if (salvo) setPanorama(true);
  }, []);
  const alternarPanorama = () => setPanorama((v) => {
    try { localStorage.setItem("svc-saude-panorama", v ? "0" : "1"); } catch { /* sem armazenamento: só nesta visita */ }
    return !v;
  });
  const periodo = periodoDe(preset, datas, todayISO());
  const dias = Math.round((new Date(`${periodo.fim}T12:00:00Z`).getTime() - new Date(`${periodo.ini}T12:00:00Z`).getTime()) / 86400000) + 1;
  const ant = anteriorDe(periodo);

  const grade = (nums: Numero[]) => (
    <div className="saude-grid">
      {nums.map((n) => {
        const cmp = comparacao(n.valor, n.anterior, dias);
        /* "igual aos 30 dias anteriores" em todo bloco parado só fazia barulho:
           a comparação aparece na tela quando o número mudou (o leitor de tela ouve sempre) */
        const mudou = n.anterior !== undefined && n.anterior !== n.valor;
        return (
          <Acao key={n.id} className="saude-n" onClick={() => setLista(n)} desativado={!n.itens.length} aria-label={`${ct(n.rotulo)}: ${n.valor}${cmp ? `, ${cmp}` : ""}. Ver a lista`}>
            <Contagem className="saude-v" valor={n.valor} />
            <span className="saude-l">{ct(n.rotulo)}</span>
            {cmp && mudou && <span className="saude-c">{cmp}</span>}
          </Acao>
        );
      })}
    </div>
  );

  return (
    <section className="saude" aria-label="Saúde da igreja">
      <div className="saude-head">
        <h2 className="saude-t">Saúde da igreja</h2>
        {panorama && (
          <Segmentado className="seg-sm" role="radiogroup" aria-label="Período">
            {PRESETS.map((p) => (
              <Opcao key={p.v} role="radio" aria-checked={preset === p.v} marcada={preset === p.v} onClick={() => setPreset(p.v)}>{p.l}</Opcao>
            ))}
          </Segmentado>
        )}
      </div>
      {panorama && preset === "datas" && (
        <div className="saude-datas">
          <label>De <input className="input" type="date" value={datas.ini} onChange={(e) => setDatas((d) => ({ ...d, ini: e.target.value }))} /></label>
          <label>até <input className="input" type="date" value={datas.fim} onChange={(e) => setDatas((d) => ({ ...d, fim: e.target.value }))} /></label>
        </div>
      )}
      <div className="saude-grp">Hoje</div>
      {grade([...numerosDaBase(dados), ...extras])}
      {panorama && (
        <>
          <div className="saude-grp">{`De ${formatDateBR(periodo.ini)} a ${formatDateBR(periodo.fim)}`}<span className="saude-grp-s">{` · comparado a ${formatDateBR(ant.ini)} a ${formatDateBR(ant.fim)}`}</span></div>
          {grade(numerosDoPeriodo(dados, periodo))}
          <div className="saude-grp">{ct("Etapas da {caminhada}")}<span className="saude-grp-s"> · membros que já fizeram cada uma</span></div>
          {grade(etapasDaCaminhada(dados.membros, etapas))}
        </>
      )}
      <Botao variante="texto" className="saude-mais" aria-expanded={panorama} onClick={alternarPanorama}>
        {panorama ? "Mostrar só o de hoje" : ct("Ver o panorama: período, visitantes, decisões e {caminhada}")}
      </Botao>

      {lista && (
        <div className="modal-bg" onClick={() => setLista(null)}>
          <div className="modal" role="dialog" aria-label={ct(lista.rotulo)} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">{ct(lista.rotulo)}</div>
              <div className="modal-sub">{lista.itens.length === 1 ? "1 pessoa" : `${lista.itens.length} pessoas`}</div>
            </div>
            <div className="modal-body" style={{ display: "block" }}>
              {[...lista.itens].sort((a, b) => a.nome.localeCompare(b.nome)).map((it) => podeAbrirPessoa(it) ? (
                <Acao key={`${it.tipo}-${it.id}`} className={`${linhaClasse({})} click`} onClick={() => { setLista(null); onAbrir(it); }}>
                  <div className="mini-main"><div className="mini-title">{it.nome}</div></div>
                </Acao>
              ) : <Linha key={`${it.tipo}-${it.id}`}><div className="mini-main"><div className="mini-title">{it.nome}</div></div></Linha>)}
            </div>
            <div className="modal-foot"><Botao variante="principal" onClick={() => setLista(null)}>Fechar</Botao></div>
          </div>
        </div>
      )}
    </section>
  );
}
