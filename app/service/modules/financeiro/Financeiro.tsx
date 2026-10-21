"use client";

/* Financeiro. Movimento do mês: saldo por conta, entradas, saídas, o que vence
   (fase 2), lista filtrável e CSV. Contas fixas e campanhas, fechamento do mês
   com relatório (fase 2, 0080). Cadastros: contas, fundos e categorias. Quem só tem
   financeiro.ver lê tudo e não vê os botões de lançar. Manifesto em
   ./manifest.ts; banco em supabase/migrations/0073_service_financeiro.sql. */

import { useMemo, useState } from "react";
import { EmptyState, PageHead } from "../../painel/ui";
import { friendlyWriteError } from "../../painel/erros";
import { Icon } from "../../lib/icons";
import { plural } from "../../lib/plural";
import { avisar } from "../../lib/avisar";
import { baixarCsv } from "../../lib/csv";
import { useRelogioDaIgreja } from "../../lib/relogio-context";
import { formatDateBR } from "../../lib/date";
import { useServiceAccess } from "../../AccessContext";
import type { ChurchView } from "../../ServiceExactApp";
import { ACESSO_FIN_LANCAR } from "./manifest";
import { db, useFinanceiro, type Categoria, type Conta, type Fundo, type Lancamento } from "./dados";
import { brl, centavosCsv, FORMA_ROTULO, mesNome, mesTexto, somaMes } from "./dinheiro";
import { ContaForm, LancamentoForm, OfertaForm, TransferenciaForm } from "./Formularios";
import { APagar, CampanhaForm, ContaFixaForm, FechamentoMes, Planejamento } from "./Fase2";
import type { Campanha, ContaFixa } from "./dados";

type Tela =
  | null
  | { k: "entrada" | "despesa"; edit?: Lancamento }
  | { k: "transferencia"; edit?: Lancamento }
  | { k: "oferta" }
  | { k: "conta"; edit?: Conta }
  | { k: "fixa"; edit?: ContaFixa }
  | { k: "campanha"; edit?: Campanha };

type FiltroTipo = "todos" | "entrada" | "despesa" | "transferencia";

const HELP = "Entradas, despesas e transferências da igreja, com saldo de cada conta. Só a direção, o pastor e quem recebeu a liberação em Acessos por pessoa abrem esta tela; o dízimo de cada pessoa não aparece em nenhum outro lugar do Service.";

export default function Financeiro({ church, currentRole }: { church: ChurchView | undefined; currentRole: string }) {
  const { todayISO } = useRelogioDaIgreja();
  const { personGrants, currentPersonId } = useServiceAccess();
  const podeLancar = currentRole === "master" || currentRole === "pastor" || personGrants.some((g) => g.personId === currentPersonId && g.code === ACESSO_FIN_LANCAR);
  const org = church?.organizationId;
  const [mes, setMes] = useState(todayISO().slice(0, 7));
  const fin = useFinanceiro(org, mes, podeLancar);
  const [aba, setAba] = useState<"movimento" | "planejamento" | "fechamento" | "cadastros">("movimento");
  const podeReabrir = currentRole === "master" || currentRole === "pastor";
  const [tela, setTela] = useState<Tela>(null);
  const [tipo, setTipo] = useState<FiltroTipo>("todos");
  const [conta, setConta] = useState("");
  const [cat, setCat] = useState("");
  const [q, setQ] = useState("");

  const contaPor = useMemo(() => new Map(fin.contas.map((c) => [c.id, c])), [fin.contas]);
  const catPor = useMemo(() => new Map(fin.categorias.map((c) => [c.id, c])), [fin.categorias]);
  const fundoPor = useMemo(() => new Map(fin.fundos.map((f) => [f.id, f])), [fin.fundos]);
  const pessoaPor = useMemo(() => new Map(fin.pessoas.map((p) => [p.id, p.name])), [fin.pessoas]);

  const realizados = fin.lancamentos.filter((l) => l.status === "realizado");
  const entradas = realizados.filter((l) => l.kind === "entrada").reduce((s, l) => s + l.amount_cents, 0);
  const saidas = realizados.filter((l) => l.kind === "despesa").reduce((s, l) => s + l.amount_cents, 0);
  const contasAtivas = fin.contas.filter((c) => c.active || (fin.saldoConta[c.id] ?? 0) !== 0);
  const saldoTotal = contasAtivas.reduce((s, c) => s + (fin.saldoConta[c.id] ?? 0), 0);
  const designados = fin.fundos.filter((f) => f.designated && (f.active || (fin.saldoFundo[f.id] ?? 0) !== 0));

  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const lista = fin.lancamentos.filter((l) =>
    (tipo === "todos" || l.kind === tipo)
    && (!conta || l.account_id === conta || l.to_account_id === conta)
    && (!cat || l.category_id === cat)
    && (!q || norm(`${l.description} ${l.supplier_name ?? ""} ${l.contributor_member_id ? pessoaPor.get(l.contributor_member_id) ?? "" : ""}`).includes(norm(q))));

  /* valor com sinal do ponto de vista do filtro de conta (transferência entra ou sai) */
  const sinalDe = (l: Lancamento) => (l.kind === "entrada" ? 1 : l.kind === "despesa" ? -1 : conta && l.to_account_id === conta ? 1 : conta ? -1 : 0);

  const exportar = () => {
    const tipoRotulo = { entrada: "Entrada", despesa: "Despesa", transferencia: "Transferência" } as const;
    baixarCsv(`financeiro-${mes}.csv`, [
      ["Data", "Tipo", "Descrição", "Categoria", "Fundo", "Conta", "Conta de destino", "Forma", "Contribuinte", "Fornecedor", "Valor (R$)"],
      ...lista.map((l) => [
        formatDateBR(l.occurred_on), tipoRotulo[l.kind], l.description,
        l.category_id ? catPor.get(l.category_id)?.name ?? "" : "", l.fund_id ? fundoPor.get(l.fund_id)?.name ?? "" : "",
        contaPor.get(l.account_id)?.name ?? "", l.to_account_id ? contaPor.get(l.to_account_id)?.name ?? "" : "",
        l.method ? FORMA_ROTULO[l.method] ?? "" : "", l.contributor_member_id ? pessoaPor.get(l.contributor_member_id) ?? "" : "", l.supplier_name ?? "",
        `${l.kind === "despesa" ? "-" : ""}${centavosCsv(l.amount_cents)}`,
      ]),
    ]);
  };

  const abrir = (l: Lancamento) => {
    if (!podeLancar) return;
    if (l.offering_count_id) { setTela(null); avisarOferta(l); return; }
    setTela(l.kind === "transferencia" ? { k: "transferencia", edit: l } : { k: l.kind, edit: l });
  };
  const [ofertaAberta, setOfertaAberta] = useState<Lancamento | null>(null);
  const avisarOferta = (l: Lancamento) => setOfertaAberta(l);

  const cad = { contas: fin.contas, categorias: fin.categorias, fundos: fin.fundos, pessoas: fin.pessoas, saldoConta: fin.saldoConta, campanhas: fin.campanhas };
  const previstos = fin.lancamentos.filter((l) => l.status === "previsto");
  const fechadoMes = fin.fechamentos.some((f) => f.month === mes);
  const base = { org: org ?? "", churchId: church?.id ?? null, onClose: () => setTela(null), onDone: () => { setTela(null); fin.recarregar(); } };

  if (!org) return null;
  if (fin.carregando || fin.erro) return (
    <div className="content wide fin">
      <PageHead title="Financeiro" eyebrow="Gestão" help={HELP} />
      {fin.carregando ? <div className="panel"><div className="panel-body" role="status">Carregando saldos e lançamentos...</div></div> : (
        <div className="panel"><div className="panel-body">
          <p className="fs-error" role="alert">{fin.erro}</p>
          <p className="ph-sub">Os valores estão indisponíveis. Tente carregar novamente para consultar saldos e lançamentos.</p>
          <button className="btn btn-sec" type="button" style={{ marginTop: 16 }} onClick={fin.recarregar}>Tentar novamente</button>
        </div></div>
      )}
    </div>
  );

  return (
    <div className="content wide fin">
      <PageHead title="Financeiro" eyebrow="Gestão" help={HELP}
        subtitle={fin.carregando ? undefined : `Saldo em caixa e bancos: ${brl(saldoTotal)}`}
        action={podeLancar && aba === "movimento" ? (
          <div className="fin-acoes">
            <button className="btn btn-pri" type="button" onClick={() => setTela({ k: "entrada" })}><Icon name="add" size={14} /> Lançar entrada</button>
            <details className="fin-mais">
              <summary className="btn btn-sec">Outras operações</summary>
              <div className="fin-mais-menu">
                <button className="btn btn-sec" type="button" onClick={() => setTela({ k: "despesa" })}>Lançar despesa</button>
                <button className="btn btn-sec" type="button" onClick={() => setTela({ k: "oferta" })}>Contar oferta</button>
                <button className="btn btn-sec" type="button" onClick={() => setTela({ k: "transferencia" })}>Transferir entre contas</button>
              </div>
            </details>
          </div>
        ) : undefined} />

      <div className="toolbar fin-abas">
        <div className="seg" role="tablist" aria-label="Seções do financeiro">
          <button type="button" role="tab" aria-selected={aba === "movimento"} className={aba === "movimento" ? "on" : ""} onClick={() => setAba("movimento")}>Movimento</button>
          <button type="button" role="tab" aria-selected={aba === "planejamento"} className={aba === "planejamento" ? "on" : ""} onClick={() => setAba("planejamento")}>Contas fixas e campanhas</button>
          <button type="button" role="tab" aria-selected={aba === "fechamento"} className={aba === "fechamento" ? "on" : ""} onClick={() => setAba("fechamento")}>Fechamento</button>
          <button type="button" role="tab" aria-selected={aba === "cadastros"} className={aba === "cadastros" ? "on" : ""} onClick={() => setAba("cadastros")}>Contas e categorias</button>
        </div>
        {(aba === "movimento" || aba === "fechamento") && (
          <div className="fin-mes" role="group" aria-label="Mês">
            <button type="button" className="fin-mes-b" aria-label="Mês anterior" onClick={() => setMes(somaMes(mes, -1))}><Icon name="voltar" size={15} /></button>
            <span className="fin-mes-t" aria-live="polite">{mesTexto(mes)}{fechadoMes ? " · fechado" : ""}</span>
            <button type="button" className="fin-mes-b" aria-label="Próximo mês" onClick={() => setMes(somaMes(mes, 1))}><Icon name="avancar" size={15} /></button>
          </div>
        )}
      </div>


      {aba === "movimento" ? (
        <>
          <div className="kpi-row kpi-3">
            {([[`Entradas em ${mesNome(mes)}`, brl(entradas), false], [`Saídas em ${mesNome(mes)}`, brl(saidas), false], ["Resultado do mês", brl(entradas - saidas, true), entradas - saidas < 0]] as const).map(([rotulo, valor, neg]) => (
              <div className="kpi" key={rotulo}>
                <div className="kpi-label">{rotulo}</div>
                {/* valor grande demais para a letra de 32 desce para 20, sem cortar */}
                <div className={`kpi-value fin-num${valor.length > 15 ? " fin-longo" : ""}${neg ? " fin-neg" : ""}`}>{fin.carregando ? "…" : valor}</div>
              </div>
            ))}
          </div>

          <div className="fin-grid">
            <section className="tbl fin-bloco" aria-labelledby="fin-contas-t">
              <div className="fin-bloco-h"><h2 id="fin-contas-t" className="fin-bloco-t">Contas</h2><span className="fin-bloco-s">saldo hoje</span></div>
              {contasAtivas.map((c) => (
                <div className="tr fin-saldo" key={c.id}>
                  <div className="fin-saldo-main"><div className="cell-name">{c.name}</div><div className="cell-sub">{c.kind === "caixa" ? "Caixa" : c.institution || "Banco"}{c.active ? "" : " · encerrada"}</div></div>
                  <div className={`fin-num fin-saldo-v${(fin.saldoConta[c.id] ?? 0) < 0 ? " fin-neg" : ""}`}>{brl(fin.saldoConta[c.id] ?? 0)}</div>
                </div>
              ))}
              {!fin.carregando && !fin.contas.some((c) => c.kind === "banco") && podeLancar && (
                <button type="button" className="tr click fin-add" onClick={() => setTela({ k: "conta" })}><Icon name="add" size={14} /> Cadastrar a conta do banco</button>
              )}
            </section>
            {designados.length > 0 && (
              <section className="tbl fin-bloco" aria-labelledby="fin-fundos-t">
                <div className="fin-bloco-h"><h2 id="fin-fundos-t" className="fin-bloco-t">Fundos designados</h2><span className="fin-bloco-s">separado do geral</span></div>
                {designados.map((f) => (
                  <div className="tr fin-saldo" key={f.id}>
                    <div className="fin-saldo-main"><div className="cell-name">{f.name}</div></div>
                    <div className={`fin-num fin-saldo-v${(fin.saldoFundo[f.id] ?? 0) < 0 ? " fin-neg" : ""}`}>{brl(fin.saldoFundo[f.id] ?? 0)}</div>
                  </div>
                ))}
              </section>
            )}
          </div>

          <APagar previstos={previstos} podeLancar={podeLancar && !fechadoMes} nomeConta={(id) => contaPor.get(id)?.name ?? "Conta"}
            onEditar={(l) => abrir(l)} onMudou={fin.recarregar} />

          <div className="section-divide"><Icon name="lista" size={15} /><span className="label">Lançamentos de {mesNome(mes)}</span><span className="line" /></div>
          <div className="toolbar fin-filtros">
            <div className="tb-search">
              <span className="si"><Icon name="buscar" size={13} /></span>
              <input placeholder="Buscar descrição ou nome" aria-label="Buscar lançamento" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="seg" role="group" aria-label="Tipo">
              {([["todos", "Todos"], ["entrada", "Entradas"], ["despesa", "Saídas"], ["transferencia", "Transferências"]] as const).map(([v, l]) => (
                <button key={v} type="button" className={tipo === v ? "on" : ""} aria-pressed={tipo === v} onClick={() => { setTipo(v); setCat(""); }}>{l}</button>
              ))}
            </div>
            <select className="select fin-sel" aria-label="Conta" value={conta} onChange={(e) => setConta(e.target.value)}>
              <option value="">Todas as contas</option>
              {fin.contas.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {tipo !== "transferencia" && (
              <select className="select fin-sel" aria-label="Categoria" value={cat} onChange={(e) => setCat(e.target.value)}>
                <option value="">Todas as categorias</option>
                {fin.categorias.filter((c) => tipo === "todos" || c.kind === tipo).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            <span className="tb-spacer" />
            <button type="button" className="btn btn-sec btn-sm" onClick={exportar} disabled={lista.length === 0}><Icon name="baixar" size={14} /> Exportar CSV</button>
          </div>

          {!fin.carregando && lista.length === 0 ? (
            fin.lancamentos.length === 0
              ? <EmptyState title={`Nada lançado em ${mesNome(mes)}`} text="Entradas, despesas e ofertas contadas aparecem aqui, com o saldo de cada conta." action={podeLancar ? { label: "Lançar entrada", onClick: () => setTela({ k: "entrada" }) } : undefined} />
              : <EmptyState title="Nenhum lançamento com esse filtro" text="Mude a busca, o tipo, a conta ou a categoria." />
          ) : (
            <div className="tbl fin-lista">
              {lista.map((l) => {
                const s = sinalDe(l);
                const meta = l.kind === "transferencia"
                  ? `${contaPor.get(l.account_id)?.name ?? "Conta"} → ${l.to_account_id ? contaPor.get(l.to_account_id)?.name ?? "Conta" : ""}`
                  : [l.category_id ? catPor.get(l.category_id)?.name : null, contaPor.get(l.account_id)?.name, l.method ? FORMA_ROTULO[l.method] : null,
                     l.contributor_member_id ? pessoaPor.get(l.contributor_member_id) : null, l.supplier_name, l.offering_count_id ? "contagem de oferta" : null,
                     l.status === "previsto" ? "previsto" : null].filter(Boolean).join(" · ");
                const miolo = (
                  <>
                    <span className="fin-data">{formatDateBR(l.occurred_on).slice(0, 5)}</span>
                    <span className="fin-lin-main">
                      <span className="cell-name fin-desc">{l.description}{l.attachment_path ? <Icon name="anexo" size={12} /> : null}</span>
                      <span className="cell-sub fin-meta">{meta}</span>
                    </span>
                    <span className={`fin-num fin-valor-l${l.kind === "transferencia" && !conta ? " fin-transf" : s < 0 ? " fin-saida" : ""}`}>
                      {l.kind === "transferencia" && !conta ? brl(l.amount_cents) : brl(s * l.amount_cents, true)}
                    </span>
                  </>
                );
                return podeLancar
                  ? <button key={l.id} type="button" className="tr fin-lin click" onClick={() => abrir(l)}>{miolo}</button>
                  : <div key={l.id} className="tr fin-lin">{miolo}</div>;
              })}
              {lista.length > 0 && <div className="tr fin-rodape"><span className="cell-sub">{plural(lista.length, "lançamento")}</span></div>}
            </div>
          )}
        </>
      ) : aba === "planejamento" ? (
        <Planejamento fin={fin} podeLancar={podeLancar} onFixa={(c) => setTela({ k: "fixa", edit: c ?? undefined })} onCampanha={(c) => setTela({ k: "campanha", edit: c ?? undefined })} />
      ) : aba === "fechamento" ? (
        <FechamentoMes fin={fin} mes={mes} org={org} igreja={church?.nome ?? ""} podeLancar={podeLancar} podeReabrir={podeReabrir} />
      ) : (
        <Cadastros contas={fin.contas} fundos={fin.fundos} categorias={fin.categorias} saldoConta={fin.saldoConta} podeLancar={podeLancar} org={org}
          onConta={(c) => setTela({ k: "conta", edit: c ?? undefined })} onMudou={fin.recarregar} />
      )}

      {ofertaAberta && <OfertaDetalhe l={ofertaAberta} onClose={() => setOfertaAberta(null)} onExcluida={() => { setOfertaAberta(null); fin.recarregar(); }} />}

      {tela?.k === "entrada" || tela?.k === "despesa" ? <LancamentoForm {...base} tipo={tela.k} edit={tela.edit} cad={cad} /> : null}
      {tela?.k === "transferencia" ? <TransferenciaForm {...base} edit={tela.edit} cad={cad} /> : null}
      {tela?.k === "oferta" ? <OfertaForm {...base} cad={cad} /> : null}
      {tela?.k === "conta" ? <ContaForm {...base} edit={tela.edit} /> : null}
      {tela?.k === "fixa" ? <ContaFixaForm {...base} edit={tela.edit} cad={cad} /> : null}
      {tela?.k === "campanha" ? <CampanhaForm {...base} edit={tela.edit} cad={cad} /> : null}
    </div>
  );
}

/* lançamento que veio da contagem: corrige-se a contagem inteira (as formas andam juntas) */
function OfertaDetalhe({ l, onClose, onExcluida }: { l: Lancamento; onClose: () => void; onExcluida: () => void }) {
  const [indo, setIndo] = useState(false);
  const excluir = async () => {
    setIndo(true);
    const { error } = await db().from("fin_offering_counts").delete().eq("id", l.offering_count_id!);
    setIndo(false);
    if (error) { avisar(friendlyWriteError(error.message), "warn"); return; }
    avisar("Contagem excluída. Conte de novo para lançar o valor certo.");
    onExcluida();
  };
  return (
    <div className="modal-bg" onClick={onClose} role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="fin-of-t" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}>
        <div className="modal-head"><div><div className="modal-eyebrow">Contagem de oferta</div><div className="modal-title" id="fin-of-t">{l.description}</div></div></div>
        <div className="modal-body">
          <p className="fs-note" style={{ marginTop: 0 }}>Este valor veio da contagem de {formatDateBR(l.occurred_on)}. Para corrigir, exclua a contagem inteira (todas as formas de pagamento dela) e conte de novo.</p>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn btn-sec" onClick={onClose} autoFocus>Fechar</button>
          <button type="button" className="btn btn-danger" disabled={indo} onClick={excluir}>{indo ? "Excluindo…" : "Excluir contagem"}</button>
        </div>
      </div>
    </div>
  );
}

/* ── cadastros: contas, fundos e categorias ──────────────────────────────── */

function Cadastros({ contas, fundos, categorias, saldoConta, podeLancar, org, onConta, onMudou }: {
  contas: Conta[]; fundos: Fundo[]; categorias: Categoria[]; saldoConta: Record<string, number>; podeLancar: boolean; org: string;
  onConta: (c: Conta | null) => void; onMudou: () => void;
}) {
  return (
    <div className="fin-cad">
      <section className="tbl fin-bloco" aria-labelledby="fin-cad-contas">
        <div className="fin-bloco-h"><h2 id="fin-cad-contas" className="fin-bloco-t">Contas</h2>{podeLancar && <button type="button" className="btn btn-sec btn-sm" onClick={() => onConta(null)}><Icon name="add" size={13} /> Nova conta</button>}</div>
        {contas.map((c) => (
          <div className="tr fin-saldo" key={c.id}>
            <div className="fin-saldo-main"><div className="cell-name">{c.name}</div><div className="cell-sub">{c.kind === "caixa" ? "Caixa" : c.institution || "Banco"}{c.active ? "" : " · encerrada"} · saldo {brl(saldoConta[c.id] ?? 0)}</div></div>
            {podeLancar && <button type="button" className="btn btn-ghost btn-sm" onClick={() => onConta(c)}>Editar</button>}
          </div>
        ))}
      </section>
      <ListaSimples titulo="Fundos" tabela="fin_funds" itens={fundos} org={org} podeLancar={podeLancar} onMudou={onMudou}
        extra={(f) => (f.is_default ? "padrão" : f.designated ? "designado" : "")} comDesignado
        ajuda="Designado é o dinheiro que só pode ir para o fim dele, como missões ou construção." />
      <ListaSimples titulo="Categorias de entrada" tabela="fin_categories" kind="entrada" itens={categorias.filter((c) => c.kind === "entrada")} org={org} podeLancar={podeLancar} onMudou={onMudou} />
      <ListaSimples titulo="Categorias de despesa" tabela="fin_categories" kind="despesa" itens={categorias.filter((c) => c.kind === "despesa")} org={org} podeLancar={podeLancar} onMudou={onMudou} />
    </div>
  );
}

type ItemSimples = { id: string; name: string; active: boolean; is_default?: boolean; designated?: boolean };

function ListaSimples<T extends ItemSimples>({ titulo, tabela, kind, itens, org, podeLancar, onMudou, extra, comDesignado = false, ajuda }: {
  titulo: string; tabela: "fin_funds" | "fin_categories"; kind?: "entrada" | "despesa"; itens: T[]; org: string; podeLancar: boolean; onMudou: () => void;
  extra?: (i: T) => string; comDesignado?: boolean; ajuda?: string;
}) {
  const [novo, setNovo] = useState("");
  const [designado, setDesignado] = useState(true);
  const [editando, setEditando] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [verArquivadas, setVerArquivadas] = useState(false);
  const arquivadas = itens.filter((i) => !i.active).length;
  const visiveis = itens.filter((i) => i.active || verArquivadas);
  const gravar = async (fn: () => PromiseLike<{ error: { message: string } | null }>, ok: string) => {
    const { error } = await fn();
    if (error) { avisar(error.message.includes("duplicate") ? "Já existe um com esse nome." : friendlyWriteError(error.message), "warn"); return false; }
    avisar(ok);
    onMudou();
    return true;
  };
  const adicionar = async () => {
    const n = novo.trim().slice(0, 60);
    if (!n) return;
    const linha: Record<string, unknown> = tabela === "fin_funds" ? { organization_id: org, name: n, designated: designado, sort_order: 50 } : { organization_id: org, name: n, kind, sort_order: 50 };
    if (await gravar(() => db().from(tabela).insert(linha), `${n} cadastrado.`)) setNovo("");
  };
  return (
    <section className="tbl fin-bloco" aria-label={titulo}>
      <div className="fin-bloco-h"><h2 className="fin-bloco-t">{titulo}</h2><span className="fin-bloco-s">{plural(itens.length - arquivadas, "ativo", "ativos")}</span></div>
      {visiveis.map((i) => (
        <div className="tr fin-saldo" key={i.id}>
          {editando === i.id ? (
            <form className="fin-inline" onSubmit={async (e) => { e.preventDefault(); if (nome.trim() && await gravar(() => db().from(tabela).update({ name: nome.trim().slice(0, 60) }).eq("id", i.id), "Nome atualizado.")) setEditando(null); }}>
              <input className="input" aria-label="Novo nome" maxLength={60} value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
              <button type="submit" className="btn btn-sec btn-sm" disabled={!nome.trim()}>Salvar</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditando(null)}>Cancelar</button>
            </form>
          ) : (
            <>
              <div className="fin-saldo-main"><div className="cell-name">{i.name}</div>{(extra?.(i) || !i.active) && <div className="cell-sub">{[extra?.(i), !i.active && "arquivado"].filter(Boolean).join(" · ")}</div>}</div>
              {podeLancar && (
                <div className="fin-item-acts">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setEditando(i.id); setNome(i.name); }}>Renomear</button>
                  {!i.is_default && <button type="button" className="btn btn-ghost btn-sm" onClick={() => gravar(() => db().from(tabela).update({ active: !i.active }).eq("id", i.id), i.active ? `${i.name} arquivado.` : `${i.name} de volta.`)}>{i.active ? "Arquivar" : "Reativar"}</button>}
                </div>
              )}
            </>
          )}
        </div>
      ))}
      {arquivadas > 0 && <button type="button" className="tr click fin-add" onClick={() => setVerArquivadas((v) => !v)}>{verArquivadas ? "Esconder arquivados" : `Ver ${plural(arquivadas, "arquivado", "arquivados")}`}</button>}
      {podeLancar && (
        <form className="tr fin-novo" onSubmit={(e) => { e.preventDefault(); void adicionar(); }}>
          <input className="input" aria-label={`Nome do novo item em ${titulo}`} maxLength={60} placeholder="Novo nome" value={novo} onChange={(e) => setNovo(e.target.value)} />
          {comDesignado && <label className="fs-check fin-check"><input type="checkbox" checked={designado} onChange={(e) => setDesignado(e.target.checked)} /> Designado</label>}
          <button type="submit" className="btn btn-sec btn-sm" disabled={!novo.trim()}>Adicionar</button>
        </form>
      )}
      {ajuda && <div className="tr fin-rodape"><span className="cell-sub">{ajuda}</span></div>}
    </section>
  );
}
