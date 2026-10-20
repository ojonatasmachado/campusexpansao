"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { formatDateBR } from "../../lib/date";
import type { TipoPergunta as TipoPerguntaPesquisa } from "../../lib/pesquisas";

import { useTermos } from "../../lib/vocabulario-context";
import { FormScreen, FormSection } from "../form/FormScreen";
import { PAPEIS_V2, REACOES_PESQUISA } from "../comum";
import type { MinistryView, PesquisaAdminRow, PesquisaDraft, PesquisaPerguntaDraft } from "../tipos";

export const novaPesquisaDraft = (): PesquisaDraft => ({
  id: `nova-${Date.now()}`,
  nome: "",
  status: "ativa",
  segmentacaoModo: "todos",
  segmentacaoValores: [],
  disparoModo: "posescala",
  ativoComoLivre: false,
  intervaloDias: null,
  recorrentePorEscala: true,
  emitidaEm: null,
  perguntas: [],
});

export const modeloPulsoPosEscala = (): PesquisaDraft => {
  const base = Date.now();
  return {
    ...novaPesquisaDraft(),
    nome: "Pulso pós-escala",
    perguntas: [
      { id: `nova-${base}-1`, ordem: 0, tipo: "emoji", texto: "Como foi o culto pra você?", obrigatoria: true, escala: null, opcoes: null },
      { id: `nova-${base}-2`, ordem: 1, tipo: "emoji", texto: "Como foi servir na escala dessa vez?", obrigatoria: true, escala: null, opcoes: null },
      { id: `nova-${base}-3`, ordem: 2, tipo: "emoji", texto: "Como você está, de um jeito geral?", obrigatoria: true, escala: null, opcoes: null },
      { id: `nova-${base}-4`, ordem: 3, tipo: "texto", texto: "Quer contar mais alguma coisa pra sua liderança?", obrigatoria: false, escala: null, opcoes: null },
    ],
  };
};

export function disparoLabelPesquisa(p: Pick<PesquisaAdminRow, "disparoModo" | "recorrentePorEscala" | "ativoComoLivre" | "emitidaEm">): string {
  if (p.disparoModo === "posescala") return p.recorrentePorEscala ? "Pós-escala · recorrente" : "Pós-escala · uma vez";
  if (p.disparoModo === "campanha") return p.emitidaEm ? "Campanha · disparada" : "Campanha · não disparada";
  if (p.disparoModo === "periodica") return "Periódica";
  return p.ativoComoLivre ? "Livre · atalho ativo" : "Livre · atalho desligado";
}

export function toPesquisaDraft(p: PesquisaAdminRow): PesquisaDraft {
  const { totalRespostas: _totalRespostas, ...draft } = p;
  return draft;
}

export async function fetchPesquisas(organizationId: string): Promise<PesquisaAdminRow[]> {
  const db = createServiceBrowserClient().schema("service");
  const { data: pesquisasData, error: pError } = await db
    .from("pesquisas")
    .select("id,nome,status,segmentacao_modo,segmentacao_valores,disparo_modo,ativo_como_livre,intervalo_dias,recorrente_por_escala,emitida_em")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (pError) throw pError;
  const pesquisas = (pesquisasData ?? []) as {
    id: string; nome: string; status: "ativa" | "pausada" | "encerrada";
    segmentacao_modo: "todos" | "papel" | "time"; segmentacao_valores: string[];
    disparo_modo: "livre" | "periodica" | "posescala" | "campanha";
    ativo_como_livre: boolean; intervalo_dias: number | null; recorrente_por_escala: boolean; emitida_em: string | null;
  }[];
  if (pesquisas.length === 0) return [];
  const ids = pesquisas.map((p) => p.id);
  const [{ data: perguntasData, error: qError }, { data: respostasData, error: rError }] = await Promise.all([
    db.from("pesquisas_perguntas").select("id,pesquisa_id,ordem,tipo,texto,obrigatoria,escala,opcoes").in("pesquisa_id", ids).order("ordem", { ascending: true }),
    db.from("pesquisas_respostas").select("id,pesquisa_id").in("pesquisa_id", ids),
  ]);
  if (qError) throw qError;
  if (rError) throw rError;
  const perguntasPor = new Map<string, PesquisaPerguntaDraft[]>();
  for (const q of (perguntasData ?? []) as { id: string; pesquisa_id: string; ordem: number; tipo: TipoPerguntaPesquisa; texto: string; obrigatoria: boolean; escala: 5 | 10 | null; opcoes: string[] | null }[]) {
    const arr = perguntasPor.get(q.pesquisa_id) ?? [];
    arr.push({ id: q.id, ordem: q.ordem, tipo: q.tipo, texto: q.texto, obrigatoria: q.obrigatoria, escala: q.escala, opcoes: q.opcoes });
    perguntasPor.set(q.pesquisa_id, arr);
  }
  const respostasPor = new Map<string, number>();
  for (const r of (respostasData ?? []) as { id: string; pesquisa_id: string }[]) respostasPor.set(r.pesquisa_id, (respostasPor.get(r.pesquisa_id) ?? 0) + 1);

  return pesquisas.map((p) => ({
    id: p.id, nome: p.nome, status: p.status,
    segmentacaoModo: p.segmentacao_modo, segmentacaoValores: p.segmentacao_valores ?? [],
    disparoModo: p.disparo_modo, ativoComoLivre: p.ativo_como_livre, intervaloDias: p.intervalo_dias,
    recorrentePorEscala: p.recorrente_por_escala, emitidaEm: p.emitida_em,
    perguntas: perguntasPor.get(p.id) ?? [], totalRespostas: respostasPor.get(p.id) ?? 0,
  }));
}

export async function savePesquisa(organizationId: string, draft: PesquisaDraft): Promise<void> {
  const db = createServiceBrowserClient().schema("service");
  const isNew = draft.id.startsWith("nova-");

  if (draft.disparoModo === "livre" && draft.ativoComoLivre) {
    let query = db.from("pesquisas").update({ ativo_como_livre: false }).eq("organization_id", organizationId).eq("disparo_modo", "livre");
    if (!isNew) query = query.neq("id", draft.id);
    await query;
  }

  const payload = {
    organization_id: organizationId,
    nome: draft.nome,
    status: draft.status,
    segmentacao_modo: draft.segmentacaoModo,
    segmentacao_valores: draft.segmentacaoValores,
    disparo_modo: draft.disparoModo,
    ativo_como_livre: draft.disparoModo === "livre" ? draft.ativoComoLivre : false,
    intervalo_dias: draft.disparoModo === "periodica" ? draft.intervaloDias : null,
    recorrente_por_escala: draft.disparoModo === "posescala" ? draft.recorrentePorEscala : false,
  };

  let pesquisaId = draft.id;
  if (isNew) {
    const { data, error } = await db.from("pesquisas").insert(payload).select("id").single();
    if (error) throw error;
    pesquisaId = (data as { id: string }).id;
  } else {
    const { error } = await db.from("pesquisas").update(payload).eq("id", draft.id);
    if (error) throw error;
  }

  const { data: existentes } = await db.from("pesquisas_perguntas").select("id").eq("pesquisa_id", pesquisaId);
  const idsAtuais = new Set(draft.perguntas.filter((p) => !p.id.startsWith("nova-")).map((p) => p.id));
  const idsRemover = ((existentes ?? []) as { id: string }[]).map((p) => p.id).filter((id) => !idsAtuais.has(id));
  if (idsRemover.length) {
    const { error } = await db.from("pesquisas_perguntas").delete().in("id", idsRemover);
    if (error) throw error;
  }
  for (const [ordem, p] of draft.perguntas.entries()) {
    const perguntaPayload = {
      pesquisa_id: pesquisaId, ordem, tipo: p.tipo, texto: p.texto, obrigatoria: p.obrigatoria,
      escala: p.tipo === "nota" ? (p.escala ?? 5) : null,
      opcoes: p.tipo === "multipla" ? (p.opcoes ?? []) : null,
    };
    if (p.id.startsWith("nova-")) {
      const { error } = await db.from("pesquisas_perguntas").insert(perguntaPayload);
      if (error) throw error;
    } else {
      const { error } = await db.from("pesquisas_perguntas").update(perguntaPayload).eq("id", p.id);
      if (error) throw error;
    }
  }
}

export async function deletePesquisaRemota(id: string): Promise<void> {
  const { error } = await createServiceBrowserClient().schema("service").from("pesquisas").delete().eq("id", id);
  if (error) throw error;
}

export async function setStatusPesquisa(id: string, status: "ativa" | "pausada" | "encerrada"): Promise<void> {
  const { error } = await createServiceBrowserClient().schema("service").from("pesquisas").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function emitirCampanhaPesquisa(id: string): Promise<void> {
  const { error } = await createServiceBrowserClient().schema("service").from("pesquisas").update({ emitida_em: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function fetchRespostasPesquisa(pesquisaId: string): Promise<{ perguntaId: string; valor: string }[]> {
  const db = createServiceBrowserClient().schema("service");
  const { data: respostas, error } = await db.from("pesquisas_respostas").select("id").eq("pesquisa_id", pesquisaId);
  if (error) throw error;
  const ids = ((respostas ?? []) as { id: string }[]).map((r) => r.id);
  if (ids.length === 0) return [];
  const { data: itens, error: itensErr } = await db.from("pesquisas_respostas_perguntas").select("pergunta_id,valor").in("resposta_id", ids);
  if (itensErr) throw itensErr;
  return ((itens ?? []) as { pergunta_id: string; valor: string }[]).map((i) => ({ perguntaId: i.pergunta_id, valor: i.valor }));
}

export function PesquisasView({ organizationId, ministries }: { organizationId: string; ministries: MinistryView[] }) {
  const [pesquisas, setPesquisas] = useState<PesquisaAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [route, setRoute] = useState<{ screen: "lista" } | { screen: "editor"; draft: PesquisaDraft } | { screen: "resultados"; pesquisa: PesquisaAdminRow }>({ screen: "lista" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [toDelete, setToDelete] = useState<PesquisaAdminRow | null>(null);
  const [novaMenuOpen, setNovaMenuOpen] = useState(false);
  const novaMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!novaMenuOpen) return;
    const onClickAway = (e: MouseEvent) => { if (novaMenuRef.current && !novaMenuRef.current.contains(e.target as Node)) setNovaMenuOpen(false); };
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, [novaMenuOpen]);

  const carregar = async () => {
    setLoading(true);
    try {
      setPesquisas(await fetchPesquisas(organizationId));
      setErrorMsg("");
    } catch (err) {
      console.error("PesquisasView: falhou ao carregar", err);
      setErrorMsg("Não foi possível carregar as pesquisas.");
    }
    setLoading(false);
  };

  useEffect(() => { void carregar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [organizationId]);

  if (route.screen === "editor") {
    return (
      <PesquisaEditor
        draft={route.draft}
        ministries={ministries}
        saving={saving}
        saveError={saveError}
        onCancel={() => { setSaveError(""); setRoute({ screen: "lista" }); }}
        onSave={async (draft) => {
          setSaving(true); setSaveError("");
          try { await savePesquisa(organizationId, draft); await carregar(); setRoute({ screen: "lista" }); }
          catch (err) { console.error("PesquisasView: falhou ao salvar", err); setSaveError("Não foi possível salvar a pesquisa."); }
          setSaving(false);
        }}
      />
    );
  }

  if (route.screen === "resultados") {
    return <PesquisaResultados pesquisa={route.pesquisa} onVoltar={() => setRoute({ screen: "lista" })} />;
  }

  return (
    <div className="cfg-card">
      <div className="cfg-card-t">Pesquisas da igreja</div>
      <div className="cfg-card-s">Pesquise a própria congregação: pulso pós-escala, satisfação, o que quiser saber. Master, pastor e líder veem as respostas e podem criar pesquisas novas.</div>
      {errorMsg ? <p className="field-error">{errorMsg}</p> : null}
      <div style={{ marginBottom: 16 }}>
        {(() => {
          const temPulso = pesquisas.some((p) => p.disparoModo === "posescala");
          return (
            <div style={{ position: "relative", display: "inline-block" }} ref={novaMenuRef}>
              <button
                className="btn btn-pri btn-sm"
                type="button"
                onClick={() => (temPulso ? setRoute({ screen: "editor", draft: novaPesquisaDraft() }) : setNovaMenuOpen((o) => !o))}
              >
                + Nova pesquisa
              </button>
              {novaMenuOpen && !temPulso && (
                <div className="sel-pop" style={{ left: 0, right: "auto", width: 260 }}>
                  <button type="button" className="sel-opt" onClick={() => { setNovaMenuOpen(false); setRoute({ screen: "editor", draft: novaPesquisaDraft() }); }}>Em branco</button>
                  <button type="button" className="sel-opt" onClick={() => { setNovaMenuOpen(false); setRoute({ screen: "editor", draft: modeloPulsoPosEscala() }); }}>Modelo: Pulso pós-escala</button>
                </div>
              )}
            </div>
          );
        })()}
      </div>
      {loading && <div className="empty">Carregando...</div>}
      {!loading && pesquisas.length === 0 && <div className="empty">Nenhuma pesquisa ainda. Clique em <em>+ Nova pesquisa</em> pra criar.</div>}
      <div className="acesso-list">
        {pesquisas.map((p) => (
          <div key={p.id} className="flag-row" style={{ cursor: "default" }}>
            <div className="flag-main" style={{ cursor: "pointer" }} onClick={() => setRoute({ screen: "resultados", pesquisa: p })}>
              <div className="flag-nome">{p.nome || "Sem nome"}</div>
              <div className="flag-meta">{disparoLabelPesquisa(p)} · {p.totalRespostas} resposta{p.totalRespostas === 1 ? "" : "s"} · {p.status}</div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {p.disparoModo === "campanha" && !p.emitidaEm && (
                <button className="btn btn-sec btn-sm" type="button" onClick={() => { void emitirCampanhaPesquisa(p.id).then(carregar); }}>Disparar agora</button>
              )}
              <button className="btn btn-sec btn-sm" type="button" onClick={() => setRoute({ screen: "editor", draft: toPesquisaDraft(p) })}>Editar</button>
              <button className="btn btn-sec btn-sm" type="button" onClick={() => { void setStatusPesquisa(p.id, p.status === "ativa" ? "pausada" : "ativa").then(carregar); }}>
                {p.status === "ativa" ? "Pausar" : "Reativar"}
              </button>
              <button className="btn btn-danger btn-sm" type="button" onClick={() => setToDelete(p)}>Excluir</button>
            </div>
          </div>
        ))}
      </div>
      {toDelete && (
        <div className="modal-bg" onClick={() => setToDelete(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">Excluir &ldquo;{toDelete.nome}&rdquo;?</div>
              <div className="modal-sub">Remove a pesquisa, as perguntas e todas as respostas já recebidas. Não pode ser desfeito.</div>
            </div>
            <div className="modal-body">
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button className="btn btn-sec" type="button" onClick={() => setToDelete(null)}>Cancelar</button>
                <button
                  className="btn btn-danger"
                  type="button"
                  onClick={async () => { try { await deletePesquisaRemota(toDelete.id); setToDelete(null); await carregar(); } catch (err) { console.error(err); } }}
                >
                  Excluir pesquisa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function PesquisaEditor({ draft: initial, ministries, saving, saveError, onSave, onCancel }: {
  draft: PesquisaDraft;
  ministries: MinistryView[];
  saving: boolean;
  saveError: string;
  onSave: (d: PesquisaDraft) => Promise<void>;
  onCancel: () => void;
}) {
  const { comTermos: ct } = useTermos();
  const [d, setD] = useState<PesquisaDraft>(initial);
  const isNew = initial.id.startsWith("nova-");
  const fid = useId();
  const [retratoInicial] = useState(() => JSON.stringify(initial));
  const falta = [
    !d.nome.trim() && "nome",
    d.perguntas.length === 0 && "uma pergunta",
    d.perguntas.some((p) => !p.texto.trim()) && "o texto de cada pergunta",
  ].filter(Boolean) as string[];
  const times = Array.from(new Set(ministries.map((m) => m.name))).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const addPergunta = () => {
    setD((prev) => ({ ...prev, perguntas: [...prev.perguntas, { id: `nova-${Date.now()}`, ordem: prev.perguntas.length, tipo: "emoji", texto: "", obrigatoria: true, escala: null, opcoes: null }] }));
  };
  const updatePergunta = (id: string, patch: Partial<PesquisaPerguntaDraft>) => {
    setD((prev) => ({ ...prev, perguntas: prev.perguntas.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  };
  const removePergunta = (id: string) => {
    setD((prev) => ({ ...prev, perguntas: prev.perguntas.filter((p) => p.id !== id) }));
  };
  const toggleValor = (valor: string) => {
    setD((prev) => ({ ...prev, segmentacaoValores: prev.segmentacaoValores.includes(valor) ? prev.segmentacaoValores.filter((v) => v !== valor) : [...prev.segmentacaoValores, valor] }));
  };

  return (
    <FormScreen
      eyebrow="Pesquisas"
      title={d.nome.trim() || (isNew ? "Nova pesquisa" : "Editar pesquisa")}
      saveLabel="Salvar pesquisa"
      saving={saving}
      missing={falta}
      dirty={JSON.stringify(d) !== retratoInicial}
      error={saveError}
      onSave={() => { void onSave(d); }}
      onClose={onCancel}
    >
      <FormSection title="Pesquisa">
        <div className="field"><label className="field-label req" htmlFor={`${fid}-nome`}>Nome da pesquisa</label><input id={`${fid}-nome`} className="input" aria-required="true" placeholder="ex: Pulso pós-escala" value={d.nome} onChange={(e) => setD({ ...d, nome: e.target.value })} /></div>
      </FormSection>

      <FormSection title="Quem vê">
      <div className="field">
        <div className="fs-chips" role="group" aria-label="Quem vê essa pesquisa" style={{ marginBottom: 8 }}>
          {(["todos", "papel", "time"] as const).map((m) => (
            <button key={m} type="button" className={`seg-chip${d.segmentacaoModo === m ? " on" : ""}`} onClick={() => setD({ ...d, segmentacaoModo: m, segmentacaoValores: [] })}>
              {m === "todos" ? "Todo mundo" : m === "papel" ? "Por papel" : "Por time"}
            </button>
          ))}
        </div>
        {d.segmentacaoModo === "papel" && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {PAPEIS_V2.map((pp) => (
              <button key={pp.id} type="button" className={`seg-chip${d.segmentacaoValores.includes(pp.id) ? " on" : ""}`} onClick={() => toggleValor(pp.id)}>{ct(pp.nome)}</button>
            ))}
          </div>
        )}
        {d.segmentacaoModo === "time" && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {times.length === 0 && <span style={{ fontSize: "var(--fs-pn-13)", color: "var(--muted)" }}>Nenhum time cadastrado ainda.</span>}
            {times.map((t) => (
              <button key={t} type="button" className={`seg-chip${d.segmentacaoValores.includes(t) ? " on" : ""}`} onClick={() => toggleValor(t)}>{t}</button>
            ))}
          </div>
        )}
      </div>

      </FormSection>

      <FormSection title="Quando aparece">
      <div className="field">
        <div className="fs-chips" role="group" aria-label="Quando aparece" style={{ marginBottom: 8 }}>
          {(["posescala", "campanha", "periodica", "livre"] as const).map((m) => (
            <button key={m} type="button" className={`seg-chip${d.disparoModo === m ? " on" : ""}`} onClick={() => setD({ ...d, disparoModo: m })}>
              {m === "posescala" ? "Pós-escala" : m === "campanha" ? "Campanha pontual" : m === "periodica" ? "Periódica" : "Atalho livre"}
            </button>
          ))}
        </div>
        {d.disparoModo === "posescala" && (
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--fs-pn-13)", color: "var(--light)" }}>
            <input type="checkbox" checked={d.recorrentePorEscala} onChange={(e) => setD({ ...d, recorrentePorEscala: e.target.checked })} />
            Repete a cada escala nova (senão, responde só uma vez)
          </label>
        )}
        {d.disparoModo === "periodica" && (
          <div className="field field-half"><label className="field-label">Intervalo (dias)</label><input className="input" type="number" min={1} value={d.intervaloDias ?? 30} onChange={(e) => setD({ ...d, intervaloDias: Number(e.target.value) })} /></div>
        )}
        {d.disparoModo === "livre" && (
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--fs-pn-13)", color: "var(--light)" }}>
            <input type="checkbox" checked={d.ativoComoLivre} onChange={(e) => setD({ ...d, ativoComoLivre: e.target.checked })} />
            Ativa como atalho livre (só uma por igreja; ligar essa desliga qualquer outra)
          </label>
        )}
        {d.disparoModo === "campanha" && (
          <p style={{ fontSize: "var(--fs-pn-13)", color: "var(--muted)" }}>{d.emitidaEm ? `Disparada em ${formatDateBR(d.emitidaEm.slice(0, 10))}.` : "Salve e depois clique em “Disparar agora” na lista."}</p>
        )}
      </div>

      </FormSection>

      <FormSection title="Perguntas">
      <div className="field">
        <div style={{ display: "grid", gap: 12 }}>
          {d.perguntas.map((p, idx) => (
            <div key={p.id} className="cfg-card" style={{ padding: 14 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: "var(--fs-pn-12)", color: "var(--muted)" }}>#{idx + 1}</span>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1 }}>
                  {(["emoji", "nota", "texto", "simnao", "multipla"] as const).map((t) => (
                    <button key={t} type="button" className={`seg-chip${p.tipo === t ? " on" : ""}`} onClick={() => updatePergunta(p.id, { tipo: t })}>
                      {t === "emoji" ? "Emoji" : t === "nota" ? "Nota" : t === "texto" ? "Texto livre" : t === "simnao" ? "Sim/Não" : "Múltipla escolha"}
                    </button>
                  ))}
                </div>
                <button type="button" className="btn btn-sec btn-sm" onClick={() => removePergunta(p.id)}>Remover</button>
              </div>
              <input className="input" placeholder="Texto da pergunta" value={p.texto} onChange={(e) => updatePergunta(p.id, { texto: e.target.value })} style={{ marginBottom: 8 }} />
              {p.tipo === "emoji" && <div style={{ display: "flex", gap: 6, fontSize: "var(--fs-pn-20)" }}>{REACOES_PESQUISA.map((r) => <span key={r}>{r}</span>)}</div>}
              {p.tipo === "nota" && (
                <div style={{ display: "flex", gap: 8 }}>
                  {[5, 10].map((s) => <button key={s} type="button" className={`seg-chip${(p.escala ?? 5) === s ? " on" : ""}`} onClick={() => updatePergunta(p.id, { escala: s as 5 | 10 })}>0 a {s}</button>)}
                </div>
              )}
              {p.tipo === "multipla" && (
                <input className="input" placeholder="Opções separadas por vírgula" value={(p.opcoes ?? []).join(", ")} onChange={(e) => updatePergunta(p.id, { opcoes: e.target.value.split(",").map((o) => o.trim()).filter(Boolean) })} />
              )}
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--fs-pn-13)", color: "var(--muted)", marginTop: 8 }}>
                <input type="checkbox" checked={p.obrigatoria} onChange={(e) => updatePergunta(p.id, { obrigatoria: e.target.checked })} />
                Obrigatória
              </label>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-sec btn-sm" style={{ marginTop: 10 }} onClick={addPergunta}>Adicionar pergunta</button>
      </div>

      </FormSection>
    </FormScreen>
  );
}

export function PesquisaResultados({ pesquisa, onVoltar }: { pesquisa: PesquisaAdminRow; onVoltar: () => void }) {
  const [itens, setItens] = useState<{ perguntaId: string; valor: string }[] | null>(null);

  useEffect(() => {
    let ativo = true;
    fetchRespostasPesquisa(pesquisa.id).then((data) => { if (ativo) setItens(data); }).catch((err) => { console.error(err); if (ativo) setItens([]); });
    return () => { ativo = false; };
  }, [pesquisa.id]);

  return (
    <div className="cfg-card">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <button type="button" className="btn btn-sec btn-sm" onClick={onVoltar}>← Voltar</button>
        <div className="cfg-card-t" style={{ margin: 0 }}>{pesquisa.nome}</div>
      </div>
      <div className="cfg-card-s">{pesquisa.totalRespostas} resposta{pesquisa.totalRespostas === 1 ? "" : "s"} · {disparoLabelPesquisa(pesquisa)}</div>
      {itens === null && <div className="empty">Carregando respostas...</div>}
      {itens !== null && pesquisa.perguntas.map((p) => {
        const valores = itens.filter((i) => i.perguntaId === p.id).map((i) => i.valor);
        if (p.tipo === "texto") {
          return (
            <div key={p.id} className="panel" style={{ marginTop: 14 }}>
              <div className="panel-head"><span className="panel-title">{p.texto}</span></div>
              <div className="panel-body flush">
                {valores.length === 0 && <div className="empty">Ninguém respondeu ainda.</div>}
                {valores.map((v, i) => <div key={i} className="mini-row"><div className="mini-main"><div className="mini-sub">{v}</div></div></div>)}
              </div>
            </div>
          );
        }
        const contagem = new Map<string, number>();
        for (const v of valores) contagem.set(v, (contagem.get(v) ?? 0) + 1);
        const max = Math.max(1, ...Array.from(contagem.values()));
        return (
          <div key={p.id} className="panel" style={{ marginTop: 14 }}>
            <div className="panel-head"><span className="panel-title">{p.texto}</span></div>
            <div className="panel-body flush">
              {valores.length === 0 && <div className="empty">Ninguém respondeu ainda.</div>}
              {Array.from(contagem.entries()).map(([valor, count]) => (
                <div className="dist-row" key={valor}>
                  <span className="dist-name">{valor}</span>
                  <div className="dist-bar"><div className="dist-bar-fill" style={{ width: `${(count / max) * 100}%` }} /></div>
                  <span className="dist-num">{count}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
