"use client";

/* Formulários do financeiro: lançar entrada ou despesa, transferir entre
   contas, contar a oferta do culto e cadastrar conta. Todos em FormScreen
   (mais de 4 campos). Valor sempre em centavos inteiros (./dinheiro.ts). */

import { useId, useMemo, useRef, useState } from "react";
import { FormScreen, FormSection, type FormScreenHandle } from "../../painel/form/FormScreen";
import { friendlyWriteError } from "../../painel/erros";
import { avisar } from "../../lib/avisar";
import { todayISO } from "../../lib/date";
import { Icon } from "../../lib/icons";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { uploadServicePrivateFile } from "../../lib/upload-image";
import { useServiceAccess } from "../../AccessContext";
import { abrirComprovante, BUCKET_FIN, db, type Campanha, type Categoria, type Conta, type Fundo, type Lancamento, type PessoaFin } from "./dados";
import { brl, centavosTexto, digitadoParaCentavos, FORMAS, type Forma } from "./dinheiro";

export type Base = { org: string; churchId: string | null; onClose: () => void; onDone: () => void };
export type Cadastros = { contas: Conta[]; categorias: Categoria[]; fundos: Fundo[]; pessoas: PessoaFin[]; saldoConta: Record<string, number>; campanhas?: Campanha[] };

/* ── campos ──────────────────────────────────────────────────────────────── */

/** valor em reais com máscara de caixa: a pessoa digita só números */
export function CampoValor({ id, value, onChange, label, req = false, half = true }: { id: string; value: number; onChange: (c: number) => void; label: string; req?: boolean; half?: boolean }) {
  return (
    <div className={`field${half ? " half" : ""}`}>
      <label className={`field-label${req ? " req" : ""}`} htmlFor={id}>{label}</label>
      <div className="fin-valor">
        <span className="fin-valor-rs" aria-hidden="true">R$</span>
        <input id={id} className="input fin-valor-in" inputMode="numeric" autoComplete="off" aria-required={req || undefined}
          value={value ? centavosTexto(value) : ""} placeholder="0,00"
          onChange={(e) => onChange(digitadoParaCentavos(e.target.value))} />
      </div>
    </div>
  );
}

/** escolher uma pessoa da igreja pelo nome (lista vem de fin_pessoas: só id e nome) */
function CampoPessoa({ id, label, pessoas, value, onChange, req = false, hint, excluir, half = false }: { id: string; label: string; pessoas: PessoaFin[]; value: string | null; onChange: (id: string | null) => void; req?: boolean; hint?: string; excluir?: string | null; half?: boolean }) {
  const atual = pessoas.find((p) => p.id === value) ?? null;
  const [q, setQ] = useState("");
  const [aberto, setAberto] = useState(false);
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const lista = pessoas.filter((p) => p.id !== excluir && (!q || norm(p.name).includes(norm(q)))).slice(0, 8);
  return (
    <div className={`field${half ? " half" : ""}`}>
      <label className={`field-label${req ? " req" : ""}`} htmlFor={id}>{label}</label>
      {atual ? (
        <div className="anx-item fin-pessoa">
          <span className="anx-nome">{atual.name}{atual.eu ? " (você)" : ""}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { onChange(null); setQ(""); }}>Trocar</button>
        </div>
      ) : (
        <div className="sel-wrap">
          <input id={id} className="input" role="combobox" aria-expanded={aberto && lista.length > 0} aria-controls={`${id}-l`} aria-autocomplete="list" autoComplete="off"
            placeholder="Buscar pelo nome" value={q} onChange={(e) => { setQ(e.target.value); setAberto(true); }} onFocus={() => setAberto(true)}
            onBlur={() => window.setTimeout(() => setAberto(false), 150)} />
          {aberto && q.trim() && (
            <div className="sel-pop" id={`${id}-l`} role="listbox">
              {lista.map((p) => (
                <button key={p.id} type="button" role="option" aria-selected={false} className="sel-opt" onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange(p.id); setAberto(false); setQ(""); }}>{p.name}</button>
              ))}
              {lista.length === 0 && <div className="sel-opt fin-sem">Ninguém com esse nome no cadastro.</div>}
            </div>
          )}
        </div>
      )}
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  );
}

function CampoComprovante({ arquivo, existente, onArquivo, onTirarExistente }: { arquivo: File | null; existente: string | null; onArquivo: (f: File | null) => void; onTirarExistente: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [erro, setErro] = useState("");
  const nome = arquivo?.name ?? (existente ? "Comprovante anexado" : null);
  return (
    <div className="field">
      <div className="field-label">Comprovante</div>
      <input ref={ref} type="file" accept="image/*,application/pdf" hidden onChange={(e) => {
        const f = e.target.files?.[0] ?? null;
        e.target.value = "";
        if (f && f.size > 15 * 1024 * 1024) { setErro("O arquivo precisa ter até 15MB."); return; }
        setErro("");
        onArquivo(f);
      }} />
      {nome ? (
        <div className="anx-item">
          <span className="anx-tag">{arquivo?.type === "application/pdf" || existente?.endsWith(".pdf") ? "PDF" : "Foto"}</span>
          <span className="anx-nome">{nome}</span>
          {!arquivo && existente && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={async () => { const u = await abrirComprovante(existente); if (u) window.open(u, "_blank", "noopener"); else avisar("Não foi possível abrir o comprovante.", "warn"); }}>Ver</button>
          )}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => (arquivo ? onArquivo(null) : onTirarExistente())}>Tirar</button>
        </div>
      ) : (
        <div><button type="button" className="btn btn-sec btn-sm" onClick={() => ref.current?.click()}><Icon name="anexo" size={14} /> Anexar foto ou PDF</button></div>
      )}
      {erro ? <p className="field-error">{erro}</p> : <div className="field-hint">Nota fiscal, recibo ou print do Pix. Só quem cuida do financeiro vê.</div>}
    </div>
  );
}

export function Excluir({ rotulo, pergunta, onConfirmar }: { rotulo: string; pergunta: string; onConfirmar: () => Promise<void> }) {
  const [confirmar, setConfirmar] = useState(false);
  const [indo, setIndo] = useState(false);
  return (
    <div className="fin-excluir">
      {confirmar ? (
        <>
          <p className="fs-note">{pergunta}</p>
          <div className="fin-excluir-acts">
            <button type="button" className="btn btn-sec btn-sm" onClick={() => setConfirmar(false)} disabled={indo}>Manter</button>
            <button type="button" className="btn btn-danger btn-sm" disabled={indo} onClick={async () => { setIndo(true); await onConfirmar(); setIndo(false); }}>{indo ? "Excluindo…" : "Excluir"}</button>
          </div>
        </>
      ) : (
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmar(true)}><Icon name="lixeira" size={14} /> {rotulo}</button>
      )}
    </div>
  );
}

const ext = (f: File) => (f.type === "application/pdf" ? "pdf" : (f.name.split(".").pop() || "jpg").toLowerCase().slice(0, 5));

/* ── entrada ou despesa ──────────────────────────────────────────────────── */

export function LancamentoForm({ org, churchId, tipo, edit, cad, onClose, onDone }: Base & { tipo: "entrada" | "despesa"; edit?: Lancamento | null; cad: Cadastros }) {
  const { currentPersonId } = useServiceAccess();
  const fid = useId();
  const telaRef = useRef<FormScreenHandle>(null);
  const cats = cad.categorias.filter((c) => c.kind === tipo && (c.active || c.id === edit?.category_id));
  const fundos = cad.fundos.filter((f) => f.active || f.id === edit?.fund_id);
  const contas = cad.contas.filter((c) => c.active || c.id === edit?.account_id);
  const padraoFundo = fundos.find((f) => f.is_default)?.id ?? fundos[0]?.id ?? "";
  const [valor, setValor] = useState(edit?.amount_cents ?? 0);
  const [data, setData] = useState(edit?.occurred_on ?? todayISO());
  const [desc, setDesc] = useState(edit?.description ?? "");
  const [cat, setCat] = useState(edit?.category_id ?? "");
  const [fundo, setFundo] = useState(edit?.fund_id ?? padraoFundo);
  const [forma, setForma] = useState<Forma | "">((edit?.method as Forma) ?? "");
  const contaPara = (f: Forma | "") => (f === "dinheiro" ? contas.find((c) => c.kind === "caixa") : contas.find((c) => c.kind === "banco"))?.id ?? contas[0]?.id ?? "";
  const [conta, setConta] = useState(edit?.account_id ?? contas[0]?.id ?? "");
  const [contaTocada, setContaTocada] = useState(!!edit);
  const [pessoa, setPessoa] = useState<string | null>(edit?.contributor_member_id ?? null);
  const [fornecedor, setFornecedor] = useState(edit?.supplier_name ?? "");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [anexo, setAnexo] = useState<string | null>(edit?.attachment_path ?? null);
  /* fase 2: campanha (só entrada) e previsto (conta fixa ainda não paga) */
  const campanhas = (cad.campanhas ?? []).filter((c) => c.active || c.id === edit?.campaign_id);
  const [campanha, setCampanha] = useState(edit?.campaign_id ?? "");
  const [realizado, setRealizado] = useState(edit ? edit.status === "realizado" : true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const retrato = JSON.stringify({ valor, data, desc, cat, fundo, forma, conta, pessoa, fornecedor, a: arquivo?.name, anexo, campanha, realizado });
  const [inicial] = useState(retrato);
  const falta = [!valor && "valor", !desc.trim() && "descrição", !data && "data", !cat && "categoria", !fundo && "fundo", !conta && "conta"].filter(Boolean) as string[];

  const salvar = async () => {
    setSalvando(true);
    setErro("");
    const id = edit?.id ?? crypto.randomUUID();
    let caminho = anexo;
    try {
      if (arquivo) caminho = await uploadServicePrivateFile(createServiceBrowserClient(), BUCKET_FIN, arquivo, `${org}/${id}-${Date.now()}.${ext(arquivo)}`);
    } catch (e) {
      setSalvando(false);
      setErro(e instanceof Error && e.message.startsWith("Envie") ? e.message : "Não foi possível enviar o comprovante. Tente de novo ou salve sem ele.");
      return;
    }
    const linha = {
      kind: tipo, occurred_on: data, amount_cents: valor, account_id: conta, category_id: cat, fund_id: fundo,
      method: forma || null, description: desc.trim().slice(0, 140),
      contributor_member_id: tipo === "entrada" ? pessoa : null,
      supplier_name: tipo === "despesa" ? fornecedor.trim() || null : null,
      attachment_path: caminho,
      campaign_id: tipo === "entrada" ? campanha || null : null,
      status: realizado ? "realizado" : "previsto",
    };
    const { error } = edit
      ? await db().from("fin_transactions").update(linha).eq("id", edit.id)
      : await db().from("fin_transactions").insert({ id, organization_id: org, church_id: churchId, created_by: currentPersonId, ...linha });
    if (error) { setSalvando(false); setErro(friendlyWriteError(error.message)); return; }
    /* comprovante trocado ou tirado: o antigo sai do armazenamento */
    if (edit?.attachment_path && edit.attachment_path !== caminho) await createServiceBrowserClient().storage.from(BUCKET_FIN).remove([edit.attachment_path]);
    avisar(edit ? "Lançamento atualizado." : tipo === "entrada" ? "Entrada lançada." : "Despesa lançada.");
    if (telaRef.current) await telaRef.current.fechar();
    onDone();
  };

  const excluir = async () => {
    if (!edit) return;
    const { error } = await db().from("fin_transactions").delete().eq("id", edit.id);
    if (error) { setErro(friendlyWriteError(error.message)); return; }
    if (edit.attachment_path) await createServiceBrowserClient().storage.from(BUCKET_FIN).remove([edit.attachment_path]);
    avisar("Lançamento excluído.");
    if (telaRef.current) await telaRef.current.fechar();
    onDone();
  };

  const entrada = tipo === "entrada";
  return (
    <FormScreen ref={telaRef} eyebrow="Financeiro" title={edit ? (entrada ? "Editar entrada" : "Editar despesa") : entrada ? "Lançar entrada" : "Lançar despesa"}
      saveLabel={edit ? "Salvar" : entrada ? "Lançar entrada" : "Lançar despesa"} saving={salvando} missing={falta} dirty={retrato !== inicial} error={erro} onSave={salvar} onClose={onClose}>
      <FormSection title={entrada ? "Entrada" : "Despesa"}>
        <div className="fs-grid">
          <CampoValor id={`${fid}-v`} label="Valor" req value={valor} onChange={setValor} />
          <div className="field half"><label className="field-label req" htmlFor={`${fid}-d`}>Data</label><input id={`${fid}-d`} className="input" type="date" aria-required="true" value={data} onChange={(e) => setData(e.target.value)} /></div>
          <div className="field">
            <label className="field-label req" htmlFor={`${fid}-desc`}>Descrição</label>
            <input id={`${fid}-desc`} className="input" maxLength={140} aria-required="true" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={entrada ? "Ex.: Dízimos do culto de domingo" : "Ex.: Conta de energia de outubro"} />
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
              {fundos.map((f) => <option key={f.id} value={f.id}>{f.name}{f.designated ? " · designado" : ""}</option>)}
            </select>
          </div>
          <div className="field">
            <div className="field-label" id={`${fid}-fm`}>{entrada ? "Como entrou" : "Como foi pago"}</div>
            <div className="fs-chips" role="group" aria-labelledby={`${fid}-fm`}>
              {FORMAS.map((f) => (
                <button key={f.id} type="button" className={`seg-chip${forma === f.id ? " on" : ""}`} aria-pressed={forma === f.id}
                  onClick={() => { const nova = forma === f.id ? "" : f.id; setForma(nova); if (!contaTocada) setConta(contaPara(nova)); }}>{f.rotulo}</button>
              ))}
            </div>
          </div>
          {entrada && campanhas.length > 0 && (
            <div className="field">
              <label className="field-label" htmlFor={`${fid}-camp`}>Campanha</label>
              <select id={`${fid}-camp`} className="select" value={campanha} onChange={(e) => {
                setCampanha(e.target.value);
                const f = campanhas.find((c) => c.id === e.target.value)?.fund_id;
                if (f) setFundo(f);
              }}>
                <option value="">Nenhuma</option>
                {campanhas.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="field-hint">Conta para a meta da campanha. Escolher a campanha usa o fundo dela.</div>
            </div>
          )}
          {edit?.status === "previsto" && (
            <div className="field">
              <label className="fin-check"><input type="checkbox" checked={realizado} onChange={(e) => setRealizado(e.target.checked)} /> {entrada ? "Já foi recebido" : "Já foi pago"}</label>
              <div className="field-hint">{realizado ? "Entra no saldo da conta na data acima." : "Continua como previsto: não mexe no saldo."}</div>
            </div>
          )}
          <div className="field">
            <label className="field-label req" htmlFor={`${fid}-ct`}>{entrada ? "Entrou na conta" : "Saiu da conta"}</label>
            <select id={`${fid}-ct`} className="select" value={conta} onChange={(e) => { setConta(e.target.value); setContaTocada(true); }}>
              {contas.map((c) => <option key={c.id} value={c.id}>{c.name} · saldo {brl(cad.saldoConta[c.id] ?? 0)}</option>)}
            </select>
          </div>
        </div>
      </FormSection>
      <FormSection title={entrada ? "Contribuinte e comprovante" : "Fornecedor e comprovante"}>
        <div className="fs-grid">
          {entrada ? (
            <CampoPessoa id={`${fid}-p`} label="Contribuinte" pessoas={cad.pessoas} value={pessoa} onChange={setPessoa}
              hint="Opcional. Serve para o dízimo de cada pessoa; só quem cuida do financeiro vê." />
          ) : (
            <div className="field">
              <label className="field-label" htmlFor={`${fid}-forn`}>Fornecedor</label>
              <input id={`${fid}-forn`} className="input" maxLength={120} value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Ex.: Companhia de energia" />
            </div>
          )}
          <CampoComprovante arquivo={arquivo} existente={anexo} onArquivo={setArquivo} onTirarExistente={() => setAnexo(null)} />
        </div>
      </FormSection>
      {edit && <Excluir rotulo="Excluir lançamento" pergunta="O lançamento sai do caixa e dos relatórios. Fica registrado no histórico de alterações." onConfirmar={excluir} />}
    </FormScreen>
  );
}

/* ── transferência entre contas ──────────────────────────────────────────── */

export function TransferenciaForm({ org, churchId, edit, cad, onClose, onDone }: Base & { edit?: Lancamento | null; cad: Cadastros }) {
  const { currentPersonId } = useServiceAccess();
  const fid = useId();
  const telaRef = useRef<FormScreenHandle>(null);
  const contas = cad.contas.filter((c) => c.active || c.id === edit?.account_id || c.id === edit?.to_account_id);
  const [valor, setValor] = useState(edit?.amount_cents ?? 0);
  const [data, setData] = useState(edit?.occurred_on ?? todayISO());
  const [de, setDe] = useState(edit?.account_id ?? contas.find((c) => c.kind === "caixa")?.id ?? contas[0]?.id ?? "");
  const [para, setPara] = useState(edit?.to_account_id ?? contas.find((c) => c.id !== de)?.id ?? "");
  const [desc, setDesc] = useState(edit?.description ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const retrato = JSON.stringify({ valor, data, de, para, desc });
  const [inicial] = useState(retrato);
  const falta = [!valor && "valor", !data && "data", !de && "conta de origem", (!para || para === de) && "outra conta de destino"].filter(Boolean) as string[];

  const salvar = async () => {
    setSalvando(true);
    setErro("");
    const linha = { kind: "transferencia", occurred_on: data, amount_cents: valor, account_id: de, to_account_id: para, description: desc.trim() || "Transferência entre contas" };
    const { error } = edit
      ? await db().from("fin_transactions").update(linha).eq("id", edit.id)
      : await db().from("fin_transactions").insert({ organization_id: org, church_id: churchId, created_by: currentPersonId, ...linha });
    if (error) { setSalvando(false); setErro(friendlyWriteError(error.message)); return; }
    avisar(edit ? "Transferência atualizada." : "Transferência registrada.");
    if (telaRef.current) await telaRef.current.fechar();
    onDone();
  };
  const excluir = async () => {
    if (!edit) return;
    const { error } = await db().from("fin_transactions").delete().eq("id", edit.id);
    if (error) { setErro(friendlyWriteError(error.message)); return; }
    avisar("Transferência excluída.");
    if (telaRef.current) await telaRef.current.fechar();
    onDone();
  };
  const saldo = (id: string) => brl(cad.saldoConta[id] ?? 0);
  return (
    <FormScreen ref={telaRef} eyebrow="Financeiro" title={edit ? "Editar transferência" : "Transferir entre contas"} subtitle={edit ? undefined : "Depósito do caixa no banco, saque, troca de conta. Não conta como entrada nem como despesa."}
      saveLabel={edit ? "Salvar" : "Transferir"} saving={salvando} missing={falta} dirty={retrato !== inicial} error={erro} onSave={salvar} onClose={onClose}>
      <FormSection title="Transferência">
        <div className="fs-grid">
          <CampoValor id={`${fid}-v`} label="Valor" req value={valor} onChange={setValor} />
          <div className="field half"><label className="field-label req" htmlFor={`${fid}-d`}>Data</label><input id={`${fid}-d`} className="input" type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
          <div className="field half">
            <label className="field-label req" htmlFor={`${fid}-de`}>Sai de</label>
            <select id={`${fid}-de`} className="select" value={de} onChange={(e) => setDe(e.target.value)}>{contas.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            {de && <div className="field-hint">Saldo hoje: {saldo(de)}</div>}
          </div>
          <div className="field half">
            <label className="field-label req" htmlFor={`${fid}-para`}>Entra em</label>
            <select id={`${fid}-para`} className="select" value={para} onChange={(e) => setPara(e.target.value)}>
              <option value="">Escolha</option>
              {contas.filter((c) => c.id !== de).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {para && para !== de && <div className="field-hint">Saldo hoje: {saldo(para)}</div>}
          </div>
          <div className="field">
            <label className="field-label" htmlFor={`${fid}-desc`}>Descrição</label>
            <input id={`${fid}-desc`} className="input" maxLength={140} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex.: Depósito da oferta de domingo" />
          </div>
        </div>
        {contas.length < 2 && <p className="fs-note">Para transferir, cadastre mais uma conta em Contas e categorias.</p>}
      </FormSection>
      {edit && <Excluir rotulo="Excluir transferência" pergunta="Os saldos das duas contas voltam ao que eram antes." onConfirmar={excluir} />}
    </FormScreen>
  );
}

/* ── contagem de oferta ──────────────────────────────────────────────────── */

export function OfertaForm({ org, churchId, cad, onClose, onDone }: Base & { cad: Cadastros }) {
  const { events } = useServiceAccess();
  const fid = useId();
  const telaRef = useRef<FormScreenHandle>(null);
  const contas = cad.contas.filter((c) => c.active);
  const fundos = cad.fundos.filter((f) => f.active);
  const cats = cad.categorias.filter((c) => c.kind === "entrada" && c.active);
  const [data, setData] = useState(todayISO());
  const [culto, setCulto] = useState("");
  const [fundo, setFundo] = useState(fundos.find((f) => f.is_default)?.id ?? fundos[0]?.id ?? "");
  const [cat, setCat] = useState(cats.find((c) => c.system_code === "oferta")?.id ?? cats[0]?.id ?? "");
  const [dinheiro, setDinheiro] = useState(0);
  const [pix, setPix] = useState(0);
  const [cartao, setCartao] = useState(0);
  const [contaDinheiro, setContaDinheiro] = useState(contas.find((c) => c.kind === "caixa")?.id ?? contas[0]?.id ?? "");
  const [contaDigital, setContaDigital] = useState(contas.find((c) => c.kind === "banco")?.id ?? contas[0]?.id ?? "");
  const [contou, setContou] = useState<string | null>(cad.pessoas.find((p) => p.eu)?.id ?? null);
  const [conferiu, setConferiu] = useState<string | null>(null);
  const [obs, setObs] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const total = dinheiro + pix + cartao;
  /* cultos marcados nesta data; sem nenhum (culto semanal sem data), mostra todos */
  const cultosDoDia = useMemo(() => { const doDia = events.filter((e) => e.eventDate === data); return doDia.length ? doDia : events.slice(0, 40); }, [events, data]);
  const retrato = JSON.stringify({ data, culto, fundo, cat, dinheiro, pix, cartao, contaDinheiro, contaDigital, contou, conferiu, obs });
  const [inicial] = useState(retrato);
  const falta = [
    !total && "pelo menos um valor",
    !data && "data",
    !fundo && "fundo",
    !cat && "categoria",
    dinheiro > 0 && !contaDinheiro && "conta do dinheiro",
    pix + cartao > 0 && !contaDigital && "conta do Pix e cartão",
    !contou && "quem contou",
    !conferiu && "quem conferiu",
  ].filter(Boolean) as string[];

  const salvar = async () => {
    if (contou === conferiu) { setErro("Quem confere precisa ser outra pessoa."); return; }
    setSalvando(true);
    setErro("");
    const { error } = await db().rpc("fin_registrar_oferta", {
      p_org: org, p_church: churchId, p_data: data, p_event: culto || null, p_fund: fundo, p_category: cat,
      p_conta_dinheiro: dinheiro > 0 ? contaDinheiro : null, p_conta_digital: pix + cartao > 0 ? contaDigital : null,
      p_dinheiro: dinheiro, p_pix: pix, p_cartao: cartao, p_contou: contou, p_conferiu: conferiu, p_obs: obs.trim() || null,
    });
    if (error) {
      setSalvando(false);
      setErro(error.message.includes("duas_pessoas") ? "Quem confere precisa ser outra pessoa." : error.message.includes("sem_permissao") ? "Você pode ver o financeiro, mas não lançar. Peça a liberação para lançar." : friendlyWriteError(error.message));
      return;
    }
    avisar(`Oferta de ${brl(total)} lançada.`);
    if (telaRef.current) await telaRef.current.fechar();
    onDone();
  };

  return (
    <FormScreen ref={telaRef} eyebrow="Financeiro" title="Contar oferta" subtitle="Duas pessoas contam juntas. Cada forma de pagamento vira uma entrada na conta certa."
      saveLabel="Lançar oferta" saving={salvando} missing={falta} dirty={retrato !== inicial} error={erro} onSave={salvar} onClose={onClose}>
      <FormSection title="Culto">
        <div className="fs-grid">
          <div className="field half"><label className="field-label req" htmlFor={`${fid}-d`}>Data</label><input id={`${fid}-d`} className="input" type="date" value={data} onChange={(e) => { setData(e.target.value); setCulto(""); }} /></div>
          <div className="field half">
            <label className="field-label" htmlFor={`${fid}-cu`}>Culto</label>
            <select id={`${fid}-cu`} className="select" value={culto} onChange={(e) => setCulto(e.target.value)}>
              <option value="">Sem culto específico</option>
              {cultosDoDia.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div className="field half">
            <label className="field-label req" htmlFor={`${fid}-c`}>Categoria</label>
            <select id={`${fid}-c`} className="select" value={cat} onChange={(e) => setCat(e.target.value)}>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          </div>
          <div className="field half">
            <label className="field-label req" htmlFor={`${fid}-f`}>Fundo</label>
            <select id={`${fid}-f`} className="select" value={fundo} onChange={(e) => setFundo(e.target.value)}>{fundos.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
          </div>
        </div>
      </FormSection>
      <FormSection title="Quanto entrou">
        <div className="fs-grid">
          <CampoValor id={`${fid}-di`} label="Dinheiro" value={dinheiro} onChange={setDinheiro} />
          <div className="field half">
            <label className="field-label" htmlFor={`${fid}-cd`}>Dinheiro vai para</label>
            <select id={`${fid}-cd`} className="select" value={contaDinheiro} onChange={(e) => setContaDinheiro(e.target.value)}>{contas.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          </div>
          <CampoValor id={`${fid}-px`} label="Pix" value={pix} onChange={setPix} />
          <CampoValor id={`${fid}-ca`} label="Cartão" value={cartao} onChange={setCartao} />
          <div className="field">
            <label className="field-label" htmlFor={`${fid}-cg`}>Pix e cartão vão para</label>
            <select id={`${fid}-cg`} className="select" value={contaDigital} onChange={(e) => setContaDigital(e.target.value)}>{contas.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          </div>
          <div className="field">
            <div className="field-label" id={`${fid}-tot`}>Total da oferta</div>
            <div className={`fs-calc fin-total${total ? " ok" : ""}`} role="status" aria-labelledby={`${fid}-tot`}>{brl(total)}</div>
          </div>
        </div>
      </FormSection>
      <FormSection title="Quem contou e quem conferiu">
        <div className="fs-grid">
          <CampoPessoa id={`${fid}-co`} label="Contou" req half pessoas={cad.pessoas} value={contou} onChange={setContou} excluir={conferiu} />
          <CampoPessoa id={`${fid}-cf`} label="Conferiu" req half pessoas={cad.pessoas} value={conferiu} onChange={setConferiu} excluir={contou} />
          <div className="field">
            <label className="field-label" htmlFor={`${fid}-o`}>Observação</label>
            <input id={`${fid}-o`} className="input" maxLength={200} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: envelope de missões separado" />
          </div>
        </div>
        <p className="fs-note">Os nomes ficam guardados na contagem, para conferência depois.</p>
      </FormSection>
    </FormScreen>
  );
}

/* ── conta (caixa ou banco) ──────────────────────────────────────────────── */

export function ContaForm({ org, churchId, edit, onClose, onDone }: Base & { edit?: Conta | null }) {
  const fid = useId();
  const telaRef = useRef<FormScreenHandle>(null);
  const [nome, setNome] = useState(edit?.name ?? "");
  const [tipo, setTipo] = useState<"caixa" | "banco">(edit?.kind ?? "banco");
  const [banco, setBanco] = useState(edit?.institution ?? "");
  const [abertura, setAbertura] = useState(edit?.opening_balance_cents ?? 0);
  const [negativo, setNegativo] = useState((edit?.opening_balance_cents ?? 0) < 0);
  const [dataAb, setDataAb] = useState(edit?.opening_date ?? todayISO());
  const [ativa, setAtiva] = useState(edit?.active ?? true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const retrato = JSON.stringify({ nome, tipo, banco, abertura, negativo, dataAb, ativa });
  const [inicial] = useState(retrato);
  const falta = [!nome.trim() && "nome"].filter(Boolean) as string[];
  const salvar = async () => {
    setSalvando(true);
    setErro("");
    const linha = { name: nome.trim().slice(0, 60), kind: tipo, institution: tipo === "banco" ? banco.trim() || null : null, opening_balance_cents: Math.abs(abertura) * (negativo ? -1 : 1), opening_date: dataAb || null, active: ativa };
    const { error } = edit
      ? await db().from("fin_accounts").update(linha).eq("id", edit.id)
      : await db().from("fin_accounts").insert({ organization_id: org, church_id: churchId, sort_order: 10, ...linha });
    if (error) { setSalvando(false); setErro(friendlyWriteError(error.message)); return; }
    avisar(edit ? "Conta atualizada." : "Conta cadastrada.");
    if (telaRef.current) await telaRef.current.fechar();
    onDone();
  };
  return (
    <FormScreen ref={telaRef} eyebrow="Financeiro" title={edit ? "Editar conta" : "Nova conta"} saveLabel={edit ? "Salvar" : "Cadastrar conta"}
      saving={salvando} missing={falta} dirty={retrato !== inicial} error={erro} onSave={salvar} onClose={onClose}>
      <FormSection title="Conta">
        <div className="fs-grid">
          <div className="field">
            <div className="field-label" id={`${fid}-t`}>Tipo</div>
            <div className="fs-chips" role="group" aria-labelledby={`${fid}-t`}>
              {([["banco", "Conta no banco"], ["caixa", "Caixa (dinheiro em espécie)"]] as const).map(([v, l]) => (
                <button key={v} type="button" className={`seg-chip${tipo === v ? " on" : ""}`} aria-pressed={tipo === v} onClick={() => setTipo(v)}>{l}</button>
              ))}
            </div>
          </div>
          <div className="field half"><label className="field-label req" htmlFor={`${fid}-n`}>Nome</label><input id={`${fid}-n`} className="input" maxLength={60} value={nome} onChange={(e) => setNome(e.target.value)} placeholder={tipo === "banco" ? "Ex.: Conta corrente" : "Ex.: Caixa da secretaria"} /></div>
          {tipo === "banco" && <div className="field half"><label className="field-label" htmlFor={`${fid}-b`}>Banco</label><input id={`${fid}-b`} className="input" maxLength={60} value={banco} onChange={(e) => setBanco(e.target.value)} placeholder="Ex.: Banco do Brasil" /></div>}
        </div>
      </FormSection>
      <FormSection title="Saldo de abertura">
        <div className="fs-grid">
          <CampoValor id={`${fid}-ab`} label="Saldo no dia de início" value={abertura} onChange={setAbertura} />
          <div className="field half"><label className="field-label" htmlFor={`${fid}-da`}>Dia de início</label><input id={`${fid}-da`} className="input" type="date" value={dataAb} onChange={(e) => setDataAb(e.target.value)} /></div>
          <div className="field">
            <label className="fs-check"><input type="checkbox" checked={negativo} onChange={(e) => setNegativo(e.target.checked)} /> A conta começou no negativo</label>
            <div className="field-hint">O que já havia na conta antes de começar a lançar no Service.</div>
          </div>
        </div>
      </FormSection>
      {edit && (
        <FormSection title="Uso">
          <label className="fs-check"><input type="checkbox" checked={!ativa} onChange={(e) => setAtiva(!e.target.checked)} /> Conta encerrada (sai das opções de lançamento; o histórico fica)</label>
        </FormSection>
      )}
    </FormScreen>
  );
}

