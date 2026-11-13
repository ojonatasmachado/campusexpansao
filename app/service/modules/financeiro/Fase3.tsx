"use client";

/* Financeiro, fase 3 (0111): orçamento por categoria de despesa (cada categoria
   representa um ministério ou área da igreja), num período escolhido (mês,
   semestre ou ano). Mesmas regras de acesso das fases anteriores: quem só lê
   vê a barra de progresso, sem o botão de definir orçamento. */

import { useEffect, useId, useRef, useState } from "react";
import { FormScreen, FormSection, type FormScreenHandle } from "../../painel/form/FormScreen";
import { EmptyState } from "../../painel/ui";
import { friendlyWriteError } from "../../painel/erros";
import { avisar } from "../../lib/avisar";
import { Icon } from "../../lib/icons";
import { db, type Categoria } from "./dados";
import { brl, limitesDoPeriodo, periodoTexto, somaPeriodo, type Periodo, PERIODOS } from "./dinheiro";
import { CampoValor, Excluir, type Base } from "./Formularios";

import { BotaoIcone } from "../../ui/Botao";
import { Acao } from "../../ui/Acao";
import { Opcao } from "../../ui/Opcao";
import { Linha, linhaClasse } from "../../ui/Linha";
import { Campo, TextoLongo } from "../../ui/Campo";
import { Carregando } from "../../ui/Estados";
import { Indicador } from "../../ui/Indicador";

/** linha devolvida por fin_orcamento: budget_id vem nulo quando a categoria ainda não tem orçamento no período */
export type LinhaOrcamento = { category_id: string; budget_id: string | null; amount_cents: number | null; notes: string | null; realizado_cents: number };

/** painel de orçamento: período (mês/semestre/ano, com navegação) + barra de progresso por categoria de despesa.
    tipo/refMes/versao são controlados por quem chama (Financeiro.tsx): o carregando geral troca todo o retorno
    desse componente pai e desmontaria um estado interno aqui, voltando sempre para "mês atual" depois de
    salvar ou excluir um orçamento. */
export function OrcamentoPainel({ org, categorias, podeLancar, tipo, aoMudarTipo, refMes, aoMudarRefMes, versao, onEditar }: {
  org: string | undefined;
  categorias: Categoria[];
  podeLancar: boolean;
  tipo: Periodo;
  aoMudarTipo: (t: Periodo) => void;
  refMes: string;
  aoMudarRefMes: (r: string | ((atual: string) => string)) => void;
  versao: number;
  onEditar: (l: LinhaOrcamento, periodo: { inicio: string; fim: string }) => void;
}) {
  const [linhas, setLinhas] = useState<LinhaOrcamento[] | null>(null);
  const [erro, setErro] = useState("");
  const { de, ate } = limitesDoPeriodo(tipo, refMes);

  useEffect(() => {
    if (!org) return;
    let vivo = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- o período mudou (tipo, navegação ou um orçamento foi salvo/excluído); reinicia o carregamento
    setLinhas(null);
    setErro("");
    db().rpc("fin_orcamento", { p_org: org, p_inicio: de, p_fim: ate }).then(({ data, error }) => {
      if (!vivo) return;
      if (error) { setErro("Não foi possível carregar o orçamento."); setLinhas([]); return; }
      setLinhas((data ?? []) as LinhaOrcamento[]);
    });
    return () => { vivo = false; };
  }, [org, de, ate, versao]);

  const catNome = (id: string) => categorias.find((c) => c.id === id)?.name ?? "";
  const comOrcamento = (linhas ?? []).filter((l) => l.amount_cents !== null);
  const semOrcamento = (linhas ?? []).filter((l) => l.amount_cents === null);
  const totalOrcado = comOrcamento.reduce((s, l) => s + (l.amount_cents ?? 0), 0);
  const totalRealizado = comOrcamento.reduce((s, l) => s + l.realizado_cents, 0);

  return (
    <>
      <div className="toolbar fin-orc-periodo">
        <div className="fs-chips" role="group" aria-label="Tipo de período">
          {PERIODOS.map((p) => (
            <Opcao key={p.id} marcada={tipo === p.id} estilo="seg-chip" aria-pressed={tipo === p.id} onClick={() => aoMudarTipo(p.id)}>{p.rotulo}</Opcao>
          ))}
        </div>
        <div className="fin-mes" role="group" aria-label="Período">
          <BotaoIcone className="fin-mes-b" rotulo="Período anterior" onClick={() => aoMudarRefMes((r) => somaPeriodo(tipo, r, -1))}><Icon name="voltar" size={15} /></BotaoIcone>
          <span className="fin-mes-t" aria-live="polite">{periodoTexto(tipo, refMes)}</span>
          <BotaoIcone className="fin-mes-b" rotulo="Próximo período" onClick={() => aoMudarRefMes((r) => somaPeriodo(tipo, r, 1))}><Icon name="avancar" size={15} /></BotaoIcone>
        </div>
      </div>

      {linhas === null ? (
        <Carregando />
      ) : erro ? (
        <EmptyState title="Não foi possível carregar" text={erro} />
      ) : (
        <>
          {comOrcamento.length > 0 && (
            <div className="kpi-row">
              <Indicador rotulo={`Orçado · ${periodoTexto(tipo, refMes)}`} valor={brl(totalOrcado)} />
              <Indicador rotulo="Gasto no período" valor={brl(totalRealizado)} classeValor={totalRealizado > totalOrcado ? "fin-neg" : undefined} />
            </div>
          )}

          {comOrcamento.length === 0 && semOrcamento.length === 0 ? (
            <EmptyState title="Nenhuma categoria de despesa ativa" text="Cadastre categorias de despesa em Contas e categorias para orçar por ministério." />
          ) : (
            <div className="fin-camps">
              {comOrcamento.map((l) => {
                const pct = l.amount_cents ? Math.min(100, Math.round((l.realizado_cents / l.amount_cents) * 100)) : 0;
                const estourou = l.amount_cents !== null && l.realizado_cents > l.amount_cents;
                const corpo = (
                  <>
                    <div className="fin-camp-h">
                      <span className="cell-name">{catNome(l.category_id)}</span>
                      <span className={`fin-num${estourou ? " fin-neg" : ""}`}>{pct}%</span>
                    </div>
                    <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`Orçamento de ${catNome(l.category_id)}`}>
                      <div className={`bar-fill${estourou ? " danger" : ""}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="cell-sub">{`${brl(l.realizado_cents)} de ${brl(l.amount_cents ?? 0)}`}{estourou ? " · orçamento estourado" : ""}</div>
                  </>
                );
                return podeLancar
                  ? <Acao key={l.category_id} className="fin-camp click" onClick={() => onEditar(l, { inicio: de, fim: ate })}>{corpo}</Acao>
                  : <div key={l.category_id} className="fin-camp">{corpo}</div>;
              })}
            </div>
          )}

          {semOrcamento.length > 0 && (
            <>
              <div className="section-divide" style={{ marginTop: 28 }}><Icon name="meta" size={15} /><span className="label">Sem orçamento neste período</span><span className="line" /></div>
              <div className="tbl fin-lista">
                {semOrcamento.map((l) => {
                  const miolo = (
                    <>
                      <span className="fin-lin-main"><span className="cell-name fin-desc">{catNome(l.category_id)}</span></span>
                      <span className="fin-num">{l.realizado_cents > 0 ? `${brl(l.realizado_cents)} gasto` : podeLancar ? "Definir orçamento" : "Sem orçamento"}</span>
                    </>
                  );
                  return podeLancar
                    ? <Acao key={l.category_id} className={`${linhaClasse({ estilo: "tabela" })} fin-lin click`} onClick={() => onEditar(l, { inicio: de, fim: ate })}>{miolo}</Acao>
                    : <Linha key={l.category_id} estilo="tabela" className="fin-lin">{miolo}</Linha>;
                })}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}

/** cadastra ou edita o orçamento de uma categoria no período em foco (período já fixado por quem abriu) */
export function OrcamentoForm({ org, linha, categoriaNome, periodo, onClose, onDone }: Base & {
  linha: LinhaOrcamento;
  categoriaNome: string;
  periodo: { inicio: string; fim: string };
}) {
  const fid = useId();
  const telaRef = useRef<FormScreenHandle>(null);
  const existe = linha.budget_id !== null;
  const [valor, setValor] = useState(linha.amount_cents ?? 0);
  const [notas, setNotas] = useState(linha.notes ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const retrato = JSON.stringify({ valor, notas });
  const [inicial] = useState(retrato);
  const falta = [!valor && "o valor do orçamento"].filter(Boolean) as string[];

  const salvar = async () => {
    setSalvando(true);
    setErro("");
    const linhaGravar = { amount_cents: valor, notes: notas.trim() || null };
    const { error } = existe
      ? await db().from("fin_budgets").update(linhaGravar).eq("id", linha.budget_id as string)
      : await db().from("fin_budgets").insert({ organization_id: org, category_id: linha.category_id, period_start: periodo.inicio, period_end: periodo.fim, ...linhaGravar });
    if (error) { setSalvando(false); setErro(friendlyWriteError(error.message)); return; }
    avisar(existe ? "Orçamento atualizado." : "Orçamento definido.");
    if (telaRef.current) await telaRef.current.fechar();
    onDone();
  };
  const excluir = async () => {
    if (!linha.budget_id) return;
    const { error } = await db().from("fin_budgets").delete().eq("id", linha.budget_id);
    if (error) { setErro(friendlyWriteError(error.message)); return; }
    avisar("Orçamento removido. O gasto do período continua lançado.");
    if (telaRef.current) await telaRef.current.fechar();
    onDone();
  };

  return (
    <FormScreen ref={telaRef} eyebrow="Financeiro" title={`Orçamento · ${categoriaNome}`} saveLabel={existe ? "Salvar" : "Definir orçamento"}
      saving={salvando} missing={falta} dirty={retrato !== inicial} error={erro} onSave={salvar} onClose={onClose}>
      <FormSection title={categoriaNome}>
        <div className="fs-grid">
          <CampoValor id={`${fid}-v`} label="Valor orçado no período" req half={false} value={valor} onChange={setValor} />
          <Campo rotulo="Notas" ajuda="Opcional: o que esse valor cobre, decisão do conselho, etc."><TextoLongo id={`${fid}-n`} maxLength={280} value={notas} onChange={(e) => setNotas(e.target.value)} /></Campo>
        </div>
      </FormSection>
      {existe && <Excluir rotulo="Remover orçamento" pergunta="O gasto já lançado no período continua, só deixa de ter um orçamento comparado." onConfirmar={excluir} />}
    </FormScreen>
  );
}
