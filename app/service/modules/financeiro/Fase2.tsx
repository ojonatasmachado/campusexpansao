"use client";

/* Financeiro, fase 2 (0080): contas fixas e o que vence no mês, campanhas com
   meta e fechamento do mês com relatório para imprimir. Mesmas regras de acesso
   da fase 1: quem só lê vê tudo, sem os botões. */

import { useId, useRef, useState } from "react";
import { FormScreen, FormSection, type FormScreenHandle } from "../../painel/form/FormScreen";
import { EmptyState } from "../../painel/ui";
import { friendlyWriteError } from "../../painel/erros";
import { FolhaDeImpressao, imprimir } from "../../painel/imprimir";
import { avisar } from "../../lib/avisar";
import { plural } from "../../lib/plural";
import { formatDateBR, todayISO } from "../../lib/date";
import { Icon } from "../../lib/icons";
import { db, type Campanha, type ContaFixa, type Fechamento, type Lancamento, type Totais, type useFinanceiro } from "./dados";
import { brl, FORMAS, mesNome, mesTexto, type Forma } from "./dinheiro";
import { CampoValor, Excluir, type Base, type Cadastros } from "./Formularios";

type Fin = ReturnType<typeof useFinanceiro>;

/* ── o que vence no mês ──────────────────────────────────────────────────── */

/** previstos do mês (contas fixas e lançamentos marcados como previstos), com o vencimento e o botão de pagar */
export function APagar({ previstos, podeLancar, nomeConta, onEditar, onMudou }: {
  previstos: Lancamento[];
  podeLancar: boolean;
  nomeConta: (id: string) => string;
  onEditar: (l: Lancamento) => void;
  onMudou: () => void;
}) {
  const hoje = todayISO();
  const [pagando, setPagando] = useState<string | null>(null);
  if (!previstos.length) return null;
  const ordenados = [...previstos].sort((a, b) => (a.due_on ?? a.occurred_on).localeCompare(b.due_on ?? b.occurred_on));
  const pagar = async (l: Lancamento) => {
    setPagando(l.id);
    const { error } = await db().from("fin_transactions").update({ status: "realizado", occurred_on: hoje < (l.due_on ?? l.occurred_on) ? hoje : l.due_on ?? l.occurred_on }).eq("id", l.id);
    setPagando(null);
    if (error) { avisar(friendlyWriteError(error.message), "warn"); return; }
    avisar(l.kind === "entrada" ? "Marcado como recebido." : "Marcado como pago.");
    onMudou();
  };
  return (
    <section className="tbl fin-bloco fin-apagar" aria-labelledby="fin-apagar-t">
      <div className="fin-bloco-h"><h2 id="fin-apagar-t" className="fin-bloco-t">A pagar e a receber</h2><span className="fin-bloco-s">{plural(previstos.length, "previsto")} no mês</span></div>
      {ordenados.map((l) => {
        const venc = l.due_on ?? l.occurred_on;
        const atrasado = venc < hoje;
        return (
          <div className="tr fin-prev" key={l.id}>
            <button type="button" className="fin-prev-main" onClick={() => podeLancar && onEditar(l)} disabled={!podeLancar}>
              <span className="cell-name">{l.description}</span>
              <span className={`cell-sub${atrasado ? " fin-atrasado" : ""}`}>{atrasado ? `Venceu em ${formatDateBR(venc)}` : `Vence em ${formatDateBR(venc)}`} · {nomeConta(l.account_id)}</span>
            </button>
            <span className={`fin-num fin-saldo-v${l.kind === "despesa" ? " fin-saida" : ""}`}>{brl(l.kind === "despesa" ? -l.amount_cents : l.amount_cents, true)}</span>
            {podeLancar && (
              <button type="button" className="btn btn-sec btn-sm" disabled={pagando === l.id} onClick={() => pagar(l)}>
                {pagando === l.id ? "Salvando…" : l.kind === "entrada" ? "Recebido" : "Pago"}
              </button>
            )}
          </div>
        );
      })}
    </section>
  );
}

/* ── contas fixas e campanhas ────────────────────────────────────────────── */

export function Planejamento({ fin, podeLancar, onFixa, onCampanha }: {
  fin: Fin;
  podeLancar: boolean;
  onFixa: (c: ContaFixa | null) => void;
  onCampanha: (c: Campanha | null) => void;
}) {
  const catNome = (id: string) => fin.categorias.find((c) => c.id === id)?.name ?? "";
  const ativas = fin.contasFixas.filter((c) => c.active);
  const totalMes = ativas.reduce((s, c) => s + (c.kind === "despesa" ? -c.amount_cents : c.amount_cents), 0);
  return (
    <>
      <div className="section-divide"><Icon name="agenda" size={15} /><span className="label">Contas fixas</span><span className="line" />
        {podeLancar && <button type="button" className="btn btn-sec btn-sm" onClick={() => onFixa(null)}><Icon name="add" size={14} /> Nova conta fixa</button>}
      </div>
      {fin.contasFixas.length === 0 ? (
        <EmptyState title="Nenhuma conta fixa" text="Aluguel, energia, internet, repasses: o que se repete todo mês. Cada uma aparece em A pagar e a receber no mês, com o vencimento." action={podeLancar ? { label: "Nova conta fixa", onClick: () => onFixa(null) } : undefined} />
      ) : (
        <div className="tbl fin-lista">
          {fin.contasFixas.map((c) => {
            const miolo = (
              <>
                <span className="fin-data">dia {c.day_of_month}</span>
                <span className="fin-lin-main">
                  <span className="cell-name fin-desc">{c.description}{c.active ? "" : " · pausada"}</span>
                  <span className="cell-sub fin-meta">{[c.kind === "entrada" ? "Entrada" : "Despesa", catNome(c.category_id), c.supplier_name].filter(Boolean).join(" · ")}</span>
                </span>
                <span className={`fin-num fin-valor-l${c.kind === "despesa" ? " fin-saida" : ""}`}>{brl(c.kind === "despesa" ? -c.amount_cents : c.amount_cents, true)}</span>
              </>
            );
            return podeLancar
              ? <button key={c.id} type="button" className="tr fin-lin click" onClick={() => onFixa(c)}>{miolo}</button>
              : <div key={c.id} className="tr fin-lin">{miolo}</div>;
          })}
          <div className="tr fin-rodape"><span className="cell-sub">{`${plural(ativas.length, "conta fixa ativa", "contas fixas ativas")} · ${brl(totalMes, true)} por mês`}</span></div>
        </div>
      )}

      <div className="section-divide" style={{ marginTop: 28 }}><Icon name="meta" size={15} /><span className="label">Campanhas</span><span className="line" />
        {podeLancar && <button type="button" className="btn btn-sec btn-sm" onClick={() => onCampanha(null)}><Icon name="add" size={14} /> Nova campanha</button>}
      </div>
      {fin.campanhas.length === 0 ? (
        <EmptyState title="Nenhuma campanha" text="Reforma, missões, um projeto com meta: as entradas ligadas à campanha somam no progresso." action={podeLancar ? { label: "Nova campanha", onClick: () => onCampanha(null) } : undefined} />
      ) : (
        <div className="fin-camps">
          {fin.campanhas.map((c) => {
            const arrec = fin.arrecadado[c.id] ?? 0;
            const pct = Math.min(100, Math.round((arrec / c.goal_cents) * 100));
            const corpo = (
              <>
                <div className="fin-camp-h">
                  <span className="cell-name">{c.name}{c.active ? "" : " · encerrada"}</span>
                  <span className="fin-num">{pct}%</span>
                </div>
                <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`Progresso de ${c.name}`}><div className="bar-fill" style={{ width: `${pct}%` }} /></div>
                <div className="cell-sub">{`${brl(arrec)} de ${brl(c.goal_cents)}`}{c.ends_on ? ` · até ${formatDateBR(c.ends_on)}` : ""}</div>
              </>
            );
            return podeLancar
              ? <button key={c.id} type="button" className="fin-camp click" onClick={() => onCampanha(c)}>{corpo}</button>
              : <div key={c.id} className="fin-camp">{corpo}</div>;
          })}
        </div>
      )}
    </>
  );
}

export function ContaFixaForm({ org, churchId, edit, cad, onClose, onDone }: Base & { edit?: ContaFixa | null; cad: Cadastros }) {
  const fid = useId();
  const telaRef = useRef<FormScreenHandle>(null);
  const [tipo, setTipo] = useState<"entrada" | "despesa">(edit?.kind ?? "despesa");
  const cats = cad.categorias.filter((c) => c.kind === tipo && (c.active || c.id === edit?.category_id));
  const fundos = cad.fundos.filter((f) => f.active || f.id === edit?.fund_id);
  const contas = cad.contas.filter((c) => c.active || c.id === edit?.account_id);
  const [valor, setValor] = useState(edit?.amount_cents ?? 0);
  const [desc, setDesc] = useState(edit?.description ?? "");
  const [dia, setDia] = useState(String(edit?.day_of_month ?? 10));
  const [cat, setCat] = useState(edit?.category_id ?? "");
  const [fundo, setFundo] = useState(edit?.fund_id ?? fundos.find((f) => f.is_default)?.id ?? fundos[0]?.id ?? "");
  const [conta, setConta] = useState(edit?.account_id ?? contas.find((c) => c.kind === "banco")?.id ?? contas[0]?.id ?? "");
  const [forma, setForma] = useState<Forma | "">((edit?.method as Forma) ?? "");
  const [fornecedor, setFornecedor] = useState(edit?.supplier_name ?? "");
  const [inicio, setInicio] = useState(edit?.starts_on ?? todayISO());
  const [fim, setFim] = useState(edit?.ends_on ?? "");
  const [ativa, setAtiva] = useState(edit?.active ?? true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const retrato = JSON.stringify({ tipo, valor, desc, dia, cat, fundo, conta, forma, fornecedor, inicio, fim, ativa });
  const [inicial] = useState(retrato);
  const diaN = Number(dia);
  const falta = [!valor && "valor", !desc.trim() && "descrição", !(diaN >= 1 && diaN <= 31) && "dia do vencimento", !cat && "categoria", !fundo && "fundo", !conta && "conta", !!fim && fim < inicio && "fim depois do início"].filter(Boolean) as string[];

  const salvar = async () => {
    setSalvando(true);
    setErro("");
    const linha = {
      kind: tipo, description: desc.trim().slice(0, 140), amount_cents: valor, account_id: conta, category_id: cat, fund_id: fundo,
      method: forma || null, supplier_name: tipo === "despesa" ? fornecedor.trim() || null : null,
      day_of_month: diaN, starts_on: inicio, ends_on: fim || null, active: ativa,
    };
    const { error } = edit
      ? await db().from("fin_recurring").update(linha).eq("id", edit.id)
      : await db().from("fin_recurring").insert({ organization_id: org, church_id: churchId, ...linha });
    if (error) { setSalvando(false); setErro(friendlyWriteError(error.message)); return; }
    avisar(edit ? "Conta fixa atualizada." : "Conta fixa cadastrada. Ela aparece em A pagar e a receber a cada mês.");
    if (telaRef.current) await telaRef.current.fechar();
    onDone();
  };
  const excluir = async () => {
    if (!edit) return;
    const { error } = await db().from("fin_recurring").delete().eq("id", edit.id);
    if (error) { setErro(friendlyWriteError(error.message)); return; }
    avisar("Conta fixa excluída. O que já foi lançado continua no caixa.");
    if (telaRef.current) await telaRef.current.fechar();
    onDone();
  };

  return (
    <FormScreen ref={telaRef} eyebrow="Financeiro" title={edit ? "Editar conta fixa" : "Nova conta fixa"} saveLabel={edit ? "Salvar" : "Cadastrar"}
      saving={salvando} missing={falta} dirty={retrato !== inicial} error={erro} onSave={salvar} onClose={onClose}>
      <FormSection title="Conta fixa">
        <div className="fs-grid">
          <div className="field">
            <div className="field-label" id={`${fid}-t`}>Tipo</div>
            <div className="fs-chips" role="group" aria-labelledby={`${fid}-t`}>
              {(["despesa", "entrada"] as const).map((k) => (
                <button key={k} type="button" className={`seg-chip${tipo === k ? " on" : ""}`} aria-pressed={tipo === k} onClick={() => { setTipo(k); setCat(""); }}>{k === "despesa" ? "Despesa (a pagar)" : "Entrada (a receber)"}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <label className="field-label req" htmlFor={`${fid}-desc`}>Descrição</label>
            <input id={`${fid}-desc`} className="input" maxLength={140} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={tipo === "despesa" ? "Ex.: Aluguel do templo" : "Ex.: Repasse da congregação"} />
          </div>
          <CampoValor id={`${fid}-v`} label="Valor por mês" req value={valor} onChange={setValor} />
          <div className="field half">
            <label className="field-label req" htmlFor={`${fid}-dia`}>Vence todo dia</label>
            <input id={`${fid}-dia`} className="input" inputMode="numeric" maxLength={2} value={dia} onChange={(e) => setDia(e.target.value.replace(/\D/g, ""))} />
            <div className="field-hint">Dia 31 em mês curto vence no último dia.</div>
          </div>
          <div className="field half">
            <label className="field-label req" htmlFor={`${fid}-c`}>Categoria</label>
            <select id={`${fid}-c`} className="select" value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="">Escolha</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field half">
            <label className="field-label req" htmlFor={`${fid}-f`}>Fundo</label>
            <select id={`${fid}-f`} className="select" value={fundo} onChange={(e) => setFundo(e.target.value)}>
              {fundos.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field-label req" htmlFor={`${fid}-ct`}>{tipo === "despesa" ? "Sai da conta" : "Entra na conta"}</label>
            <select id={`${fid}-ct`} className="select" value={conta} onChange={(e) => setConta(e.target.value)}>
              {contas.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field">
            <div className="field-label" id={`${fid}-fm`}>Forma</div>
            <div className="fs-chips" role="group" aria-labelledby={`${fid}-fm`}>
              {FORMAS.map((f) => (
                <button key={f.id} type="button" className={`seg-chip${forma === f.id ? " on" : ""}`} aria-pressed={forma === f.id} onClick={() => setForma(forma === f.id ? "" : f.id)}>{f.rotulo}</button>
              ))}
            </div>
          </div>
          {tipo === "despesa" && (
            <div className="field">
              <label className="field-label" htmlFor={`${fid}-forn`}>Fornecedor</label>
              <input id={`${fid}-forn`} className="input" maxLength={120} value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Ex.: Imobiliária Centro" />
            </div>
          )}
        </div>
      </FormSection>
      <FormSection title="Vigência">
        <div className="fs-grid">
          <div className="field half"><label className="field-label req" htmlFor={`${fid}-ini`}>A partir de</label><input id={`${fid}-ini`} className="input" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} /></div>
          <div className="field half"><label className="field-label" htmlFor={`${fid}-fim`}>Até (opcional)</label><input id={`${fid}-fim`} className="input" type="date" value={fim} onChange={(e) => setFim(e.target.value)} /></div>
          {edit && (
            <div className="field">
              <label className="fin-check"><input type="checkbox" checked={ativa} onChange={(e) => setAtiva(e.target.checked)} /> Ativa</label>
              <div className="field-hint">Pausada, ela não gera os próximos meses. O que já foi gerado continua.</div>
            </div>
          )}
        </div>
      </FormSection>
      {edit && <Excluir rotulo="Excluir conta fixa" pergunta="Os próximos meses deixam de ser gerados. O que já foi lançado continua no caixa." onConfirmar={excluir} />}
    </FormScreen>
  );
}

export function CampanhaForm({ org, churchId, edit, cad, onClose, onDone }: Base & { edit?: Campanha | null; cad: Cadastros }) {
  const fid = useId();
  const telaRef = useRef<FormScreenHandle>(null);
  const fundos = cad.fundos.filter((f) => f.active || f.id === edit?.fund_id);
  const [nome, setNome] = useState(edit?.name ?? "");
  const [desc, setDesc] = useState(edit?.description ?? "");
  const [meta, setMeta] = useState(edit?.goal_cents ?? 0);
  const [fundo, setFundo] = useState(edit?.fund_id ?? "");
  const [inicio, setInicio] = useState(edit?.starts_on ?? todayISO());
  const [fim, setFim] = useState(edit?.ends_on ?? "");
  const [ativa, setAtiva] = useState(edit?.active ?? true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const retrato = JSON.stringify({ nome, desc, meta, fundo, inicio, fim, ativa });
  const [inicial] = useState(retrato);
  const falta = [!nome.trim() && "nome", !meta && "meta", !!fim && fim < inicio && "fim depois do início"].filter(Boolean) as string[];

  const salvar = async () => {
    setSalvando(true);
    setErro("");
    const linha = { name: nome.trim().slice(0, 80), description: desc.trim() || null, goal_cents: meta, fund_id: fundo || null, starts_on: inicio, ends_on: fim || null, active: ativa };
    const { error } = edit
      ? await db().from("fin_campaigns").update(linha).eq("id", edit.id)
      : await db().from("fin_campaigns").insert({ organization_id: org, church_id: churchId, ...linha });
    if (error) { setSalvando(false); setErro(friendlyWriteError(error.message)); return; }
    avisar(edit ? "Campanha atualizada." : "Campanha criada. Ao lançar uma entrada, escolha a campanha para somar na meta.");
    if (telaRef.current) await telaRef.current.fechar();
    onDone();
  };
  const excluir = async () => {
    if (!edit) return;
    const { error } = await db().from("fin_campaigns").delete().eq("id", edit.id);
    if (error) { setErro(friendlyWriteError(error.message)); return; }
    avisar("Campanha excluída. As entradas continuam no caixa, sem a campanha.");
    if (telaRef.current) await telaRef.current.fechar();
    onDone();
  };

  return (
    <FormScreen ref={telaRef} eyebrow="Financeiro" title={edit ? "Editar campanha" : "Nova campanha"} saveLabel={edit ? "Salvar" : "Criar campanha"}
      saving={salvando} missing={falta} dirty={retrato !== inicial} error={erro} onSave={salvar} onClose={onClose}>
      <FormSection title="Campanha">
        <div className="fs-grid">
          <div className="field"><label className="field-label req" htmlFor={`${fid}-n`}>Nome</label><input id={`${fid}-n`} className="input" maxLength={80} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Reforma do templo" /></div>
          <CampoValor id={`${fid}-m`} label="Meta" req value={meta} onChange={setMeta} />
          <div className="field half">
            <label className="field-label" htmlFor={`${fid}-f`}>Fundo</label>
            <select id={`${fid}-f`} className="select" value={fundo} onChange={(e) => setFundo(e.target.value)}>
              <option value="">Escolher em cada entrada</option>
              {fundos.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div className="field"><label className="field-label" htmlFor={`${fid}-d`}>Para que é</label><textarea id={`${fid}-d`} className="textarea" maxLength={500} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex.: Troca do telhado e da pintura do salão principal." /></div>
          <div className="field half"><label className="field-label req" htmlFor={`${fid}-i`}>Começa em</label><input id={`${fid}-i`} className="input" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} /></div>
          <div className="field half"><label className="field-label" htmlFor={`${fid}-fi`}>Termina em (opcional)</label><input id={`${fid}-fi`} className="input" type="date" value={fim} onChange={(e) => setFim(e.target.value)} /></div>
          {edit && <div className="field"><label className="fin-check"><input type="checkbox" checked={ativa} onChange={(e) => setAtiva(e.target.checked)} /> Recebendo entradas</label></div>}
        </div>
      </FormSection>
      {edit && <Excluir rotulo="Excluir campanha" pergunta="As entradas continuam no caixa, só deixam de estar ligadas à campanha." onConfirmar={excluir} />}
    </FormScreen>
  );
}

/* ── fechamento e relatório ──────────────────────────────────────────────── */

/** totais do mês ainda aberto, no mesmo formato do retrato do fechamento */
function totaisAbertos(fin: Fin): Totais {
  const real = fin.lancamentos.filter((l) => l.status === "realizado" && l.kind !== "transferencia");
  const porCat = new Map<string, { categoria: string; tipo: "entrada" | "despesa"; total_cents: number }>();
  for (const l of real) {
    const c = fin.categorias.find((x) => x.id === l.category_id);
    const k = `${l.kind}:${l.category_id}`;
    const atual = porCat.get(k) ?? { categoria: c?.name ?? "Sem categoria", tipo: l.kind as "entrada" | "despesa", total_cents: 0 };
    atual.total_cents += l.amount_cents;
    porCat.set(k, atual);
  }
  return {
    entradas_cents: real.filter((l) => l.kind === "entrada").reduce((s, l) => s + l.amount_cents, 0),
    despesas_cents: real.filter((l) => l.kind === "despesa").reduce((s, l) => s + l.amount_cents, 0),
    previstos_em_aberto: fin.lancamentos.filter((l) => l.status === "previsto").length,
    por_categoria: [...porCat.values()].sort((a, b) => a.tipo.localeCompare(b.tipo) || b.total_cents - a.total_cents),
    saldo_contas: fin.contas.filter((c) => c.active || (fin.saldoConta[c.id] ?? 0) !== 0).map((c) => ({ conta: c.name, saldo_cents: fin.saldoConta[c.id] ?? 0 })),
    saldo_fundos: fin.fundos.filter((f) => f.active || (fin.saldoFundo[f.id] ?? 0) !== 0).map((f) => ({ fundo: f.name, saldo_cents: fin.saldoFundo[f.id] ?? 0 })),
  };
}

export function FechamentoMes({ fin, mes, org, igreja, podeLancar, podeReabrir }: {
  fin: Fin; mes: string; org: string; igreja: string; podeLancar: boolean; podeReabrir: boolean;
}) {
  const fid = useId();
  const fechado: Fechamento | undefined = fin.fechamentos.find((f) => f.month === mes);
  const t = fechado ? fechado.totals : totaisAbertos(fin);
  const [confirmando, setConfirmando] = useState(false);
  const [notas, setNotas] = useState("");
  const [salvando, setSalvando] = useState(false);
  const futuro = mes > todayISO().slice(0, 7);
  const entradas = t.por_categoria.filter((c) => c.tipo === "entrada");
  const despesas = t.por_categoria.filter((c) => c.tipo === "despesa");

  const fechar = async () => {
    setSalvando(true);
    const { data, error } = await db().rpc("fin_fechar_mes", { p_org: org, p_mes: mes, p_notas: notas });
    setSalvando(false);
    if (error || data !== "ok") {
      avisar(data === "ja_fechado" ? "Este mês já está fechado." : data === "mes_futuro" ? "Só dá para fechar um mês que já começou." : friendlyWriteError(error?.message ?? "Não foi possível fechar o mês."), "warn");
      return;
    }
    setConfirmando(false);
    avisar(`${mesTexto(mes)} fechado. Os lançamentos do mês ficam travados.`);
    fin.recarregar();
  };
  const reabrir = async () => {
    const { data, error } = await db().rpc("fin_reabrir_mes", { p_org: org, p_mes: mes });
    if (error || data !== "ok") { avisar(friendlyWriteError(error?.message ?? "Não foi possível reabrir."), "warn"); return; }
    avisar(`${mesTexto(mes)} reaberto. O fechamento anterior fica no histórico.`);
    fin.recarregar();
  };

  const linhas = (lista: { categoria: string; total_cents: number }[]) => lista.map((c) => (
    <div className="tr fin-saldo" key={c.categoria}><div className="fin-saldo-main"><div className="cell-name">{c.categoria}</div></div><div className="fin-num fin-saldo-v">{brl(c.total_cents)}</div></div>
  ));

  return (
    <>
      <div className={`fin-fech-status${fechado ? " fechado" : ""}`} role="status">
        <Icon name={fechado ? "cadeado" : "pendente"} size={16} />
        <span>{fechado
          ? `Fechado em ${formatDateBR(fechado.closed_at.slice(0, 10))}. Os lançamentos de ${mesNome(mes)} estão travados.`
          : futuro ? `${mesTexto(mes)} ainda não começou.` : `${mesTexto(mes)} está aberto. Os números abaixo ainda podem mudar.`}</span>
      </div>
      {fechado?.notes ? <p className="fs-note">{fechado.notes}</p> : null}

      <div className="kpi-row kpi-3">
        {([[`Entradas`, brl(t.entradas_cents), false], [`Saídas`, brl(t.despesas_cents), false], ["Resultado", brl(t.entradas_cents - t.despesas_cents, true), t.entradas_cents - t.despesas_cents < 0]] as const).map(([rotulo, valor, neg]) => (
          <div className="kpi" key={rotulo}><div className="kpi-label">{rotulo}</div><div className={`kpi-value fin-num${valor.length > 15 ? " fin-longo" : ""}${neg ? " fin-neg" : ""}`}>{fin.carregando ? "…" : valor}</div></div>
        ))}
      </div>
      {t.previstos_em_aberto > 0 && <p className="fs-note fin-atrasado">{`${plural(t.previstos_em_aberto, "previsto ficou", "previstos ficaram")} sem pagar ou receber neste mês.`}</p>}

      <div className="fin-grid">
        <section className="tbl fin-bloco"><div className="fin-bloco-h"><h2 className="fin-bloco-t">Entradas por categoria</h2></div>{entradas.length ? linhas(entradas) : <div className="tr"><span className="cell-sub">Nenhuma entrada.</span></div>}</section>
        <section className="tbl fin-bloco"><div className="fin-bloco-h"><h2 className="fin-bloco-t">Saídas por categoria</h2></div>{despesas.length ? linhas(despesas) : <div className="tr"><span className="cell-sub">Nenhuma saída.</span></div>}</section>
      </div>

      <div className="fin-fech-acoes">
        <button type="button" className="btn btn-sec" onClick={() => imprimir("relatorio", "portrait")}><Icon name="documento" size={14} /> Imprimir relatório</button>
        {!fechado && podeLancar && !futuro && !confirmando && <button type="button" className="btn btn-pri" onClick={() => setConfirmando(true)}><Icon name="cadeado" size={14} /> Fechar {mesNome(mes)}</button>}
        {fechado && podeReabrir && <button type="button" className="btn btn-sec" onClick={reabrir}>Reabrir o mês</button>}
      </div>
      {confirmando && (
        <div className="fin-fech-conf">
          <p className="fs-note">Depois de fechar, ninguém lança, edita ou exclui nada em {mesNome(mes)}. Só a direção ou o pastor reabrem.</p>
          <div className="field"><label className="field-label" htmlFor={`${fid}-n`}>Observação (opcional)</label><textarea id={`${fid}-n`} className="textarea" maxLength={1000} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ex.: Conferido com o extrato do banco." /></div>
          <div className="fin-fech-acoes">
            <button type="button" className="btn btn-sec" onClick={() => setConfirmando(false)}>Cancelar</button>
            <button type="button" className="btn btn-pri" disabled={salvando} onClick={fechar}>{salvando ? "Fechando…" : `Fechar ${mesNome(mes)}`}</button>
          </div>
        </div>
      )}

      <FolhaDeImpressao folha="relatorio">
        <div className="sec-papel-head">
          <div><div className="sec-papel-igreja">{igreja}</div><h1 className="sec-papel-t">Relatório financeiro · {mesTexto(mes)}</h1></div>
          <div className="sec-papel-meta">{fechado ? `Fechado em ${formatDateBR(fechado.closed_at.slice(0, 10))}` : `Prévia, mês aberto · ${formatDateBR(todayISO())}`}</div>
        </div>
        <div className="fin-papel-tot">
          <div>Entradas<b>{brl(t.entradas_cents)}</b></div>
          <div>Saídas<b>{brl(t.despesas_cents)}</b></div>
          <div>Resultado<b>{brl(t.entradas_cents - t.despesas_cents, true)}</b></div>
        </div>
        {[["Entradas por categoria", entradas], ["Saídas por categoria", despesas]].map(([titulo, lista]) => (
          <div className="fin-papel-sec" key={titulo as string}>
            <h2>{titulo as string}</h2>
            <table className="sec-papel-tbl"><tbody>{(lista as { categoria: string; total_cents: number }[]).map((c) => <tr key={c.categoria}><td style={{ fontFamily: "inherit" }}>{c.categoria}</td><td className="num">{brl(c.total_cents)}</td></tr>)}</tbody></table>
          </div>
        ))}
        <div className="fin-papel-sec">
          <h2>{fechado ? "Saldo das contas no fim do mês" : "Saldo das contas hoje"}</h2>
          <table className="sec-papel-tbl"><tbody>{t.saldo_contas.map((c) => <tr key={c.conta}><td style={{ fontFamily: "inherit" }}>{c.conta}</td><td className="num">{brl(c.saldo_cents, true)}</td></tr>)}</tbody></table>
        </div>
        <div className="fin-papel-sec">
          <h2>{fechado ? "Saldo dos fundos no fim do mês" : "Saldo dos fundos hoje"}</h2>
          <table className="sec-papel-tbl"><tbody>{t.saldo_fundos.map((f) => <tr key={f.fundo}><td style={{ fontFamily: "inherit" }}>{f.fundo}</td><td className="num">{brl(f.saldo_cents, true)}</td></tr>)}</tbody></table>
        </div>
        {fechado?.notes ? <div className="fin-papel-sec"><h2>Observação</h2><p>{fechado.notes}</p></div> : null}
      </FolhaDeImpressao>
    </>
  );
}
