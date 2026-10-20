"use client";

/* Abrir ou lançar um registro de livro. Batismo e Rol vêm dos fatos e das
   fichas: aqui só se completa (oficiante, folha, saída). Casamento e
   Apresentação se lançam e se apagam aqui. */
import { useId, useRef, useState } from "react";
import { avisar } from "../../lib/avisar";
import { formatDateBR, todayISO } from "../../lib/date";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { FormScreen, FormSection, type FormScreenHandle } from "../../painel/form/FormScreen";
import type { ChildGuardianView, ChildView, ChurchView, MemberView, PersonView } from "../../ServiceExactApp";
import { FORMAS_ENTRADA, MOTIVOS_SAIDA, REGISTRO_COLS, livroDe, numeroFmt, type Livro, type Registro } from "./livros";

export function RegistroForm({ livro, registro, church, demo, members, people, kidsChildren, childGuardians, currentPersonId, onSalvo, onCarteirinha, onClose }: {
  livro: Livro;
  registro: Registro | null;
  church: ChurchView;
  demo: boolean;
  members: MemberView[];
  people: PersonView[];
  kidsChildren: ChildView[];
  childGuardians: ChildGuardianView[];
  currentPersonId?: string | null;
  onSalvo: (r: Registro, removido?: boolean) => void;
  onCarteirinha: (memberId: string) => void;
  onClose: () => void;
}) {
  const fid = useId();
  const telaRef = useRef<FormScreenHandle>(null);
  const r = registro;
  const [data, setData] = useState(r?.data ?? todayISO());
  const [oficiante, setOficiante] = useState(r?.oficiante ?? "");
  const [local, setLocal] = useState(r?.local ?? "");
  const [livroFisico, setLivroFisico] = useState(r?.livro_fisico ?? "");
  const [folha, setFolha] = useState(r?.folha ?? "");
  const [obs, setObs] = useState(r?.observacao ?? "");
  const [noivo, setNoivo] = useState(r?.dados.noivo?.nome ?? "");
  const [noiva, setNoiva] = useState(r?.dados.noiva?.nome ?? "");
  const [testemunhas, setTestemunhas] = useState<string[]>(r?.dados.testemunhas?.length ? r.dados.testemunhas : ["", ""]);
  const [childId, setChildId] = useState(r?.child_id ?? "");
  const [crianca, setCrianca] = useState(livro === "apresentacao" ? r?.nome ?? "" : "");
  const [nascimento, setNascimento] = useState(r?.dados.nascimento ?? "");
  const [pais, setPais] = useState(r?.dados.pais ?? "");
  const [forma, setForma] = useState(r?.dados.forma ?? "");
  const [saiu, setSaiu] = useState(!!r?.saida);
  const [saida, setSaida] = useState(r?.saida ?? todayISO());
  const [motivo, setMotivo] = useState(r?.saida_motivo ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [apagar, setApagar] = useState(false);

  const def = livroDe(livro);
  const novo = !r;
  const retrato = JSON.stringify({ data, oficiante, local, livroFisico, folha, obs, noivo, noiva, testemunhas, childId, crianca, nascimento, pais, forma, saiu, saida, motivo });
  const [retratoInicial] = useState(retrato);

  const escolherCrianca = (id: string) => {
    setChildId(id);
    const c = kidsChildren.find((k) => k.id === id);
    if (!c) return;
    setCrianca(c.name);
    setNascimento(c.birth ?? "");
    const resp = childGuardians.filter((g) => g.child_id === id).sort((a, b) => Number(!!b.is_primary) - Number(!!a.is_primary))
      .map((g) => people.find((p) => p.id === g.guardian_person_id)?.name).filter(Boolean) as string[];
    if (resp.length) setPais(resp.join(" e "));
  };

  const memberPeloNome = (nome: string) => members.find((m) => m.name.trim().toLocaleLowerCase("pt-BR") === nome.trim().toLocaleLowerCase("pt-BR"))?.id ?? null;
  const nomeDoRegistro = livro === "casamento" ? [noivo.trim(), noiva.trim()].filter(Boolean).join(" e ") : livro === "apresentacao" ? crianca.trim() : r?.nome ?? "";

  const falta = [
    !data && (livro === "rol" ? "data de entrada" : "data"),
    livro === "casamento" && !noivo.trim() && "nome do noivo",
    livro === "casamento" && !noiva.trim() && "nome da noiva",
    livro === "apresentacao" && !crianca.trim() && "nome da criança",
    livro === "rol" && saiu && !saida && "data de saída",
    livro === "rol" && saiu && !motivo && "motivo da saída",
  ].filter(Boolean) as string[];

  const salvar = async () => {
    setSaving(true);
    setError("");
    const dados: Registro["dados"] = { ...(r?.dados ?? {}) };
    if (livro === "casamento") {
      dados.noivo = { nome: noivo.trim(), member_id: memberPeloNome(noivo) };
      dados.noiva = { nome: noiva.trim(), member_id: memberPeloNome(noiva) };
      dados.testemunhas = testemunhas.map((t) => t.trim()).filter(Boolean);
    }
    if (livro === "apresentacao") { dados.nascimento = nascimento || null; dados.pais = pais.trim() || null; }
    if (livro === "rol") dados.forma = forma || null;
    const campos = {
      data,
      nome: nomeDoRegistro || r?.nome || "",
      oficiante: oficiante.trim() || null,
      local: local.trim() || null,
      livro_fisico: livroFisico.trim() || null,
      folha: folha.trim() || null,
      observacao: obs.trim() || null,
      dados,
      child_id: livro === "apresentacao" ? childId || null : r?.child_id ?? null,
      saida: livro === "rol" && saiu ? saida : null,
      saida_motivo: livro === "rol" && saiu ? motivo : null,
    };
    let salvoReg: Registro;
    if (demo) {
      salvoReg = { ...(r ?? { id: `demo-novo-${Date.now()}`, organization_id: church.organizationId, church_id: church.id, livro, numero: 0, member_id: null, fato_id: null }), ...campos } as Registro;
    } else {
      const sb = createServiceBrowserClient().schema("service");
      const q = r
        ? sb.from("registros").update(campos).eq("id", r.id).select(REGISTRO_COLS).single()
        : sb.from("registros").insert({ ...campos, organization_id: church.organizationId, church_id: church.id, livro, created_by: currentPersonId ?? null }).select(REGISTRO_COLS).single();
      const { data: linha, error: e } = await q;
      if (e || !linha) { setSaving(false); setError("Não deu para salvar o registro. Confira a conexão e tente de novo."); return; }
      salvoReg = linha as Registro;
    }
    onSalvo(salvoReg);
    setSaving(false);
    avisar(!novo ? "Registro atualizado" : salvoReg.numero ? `Registro nº ${numeroFmt(salvoReg.numero)} criado em ${def.rotulo}` : `Registro criado em ${def.rotulo}`);
    if (telaRef.current) await telaRef.current.fechar(); else onClose();
  };

  const remover = async () => {
    if (!r) return;
    setSaving(true);
    if (!demo) {
      const { error: e } = await createServiceBrowserClient().schema("service").from("registros").delete().eq("id", r.id);
      if (e) { setSaving(false); setApagar(false); setError("Não deu para apagar o registro. Tente de novo."); return; }
    }
    onSalvo(r, true);
    setSaving(false);
    avisar("Registro apagado do livro", "info");
    if (telaRef.current) await telaRef.current.fechar(); else onClose();
  };

  const titulo = novo ? (livro === "casamento" ? "Registrar casamento" : "Registrar apresentação") : nomeDoRegistro || r.nome;
  const eyebrow = novo ? def.rotulo : `${def.rotulo} · nº ${numeroFmt(r.numero)}`;
  const listaPessoas = `${fid}-pessoas`;
  const listaMembros = `${fid}-membros`;

  return (
    <FormScreen
      ref={telaRef}
      eyebrow={eyebrow}
      title={titulo}
      subtitle={!novo && r.fato_id ? `Veio da etapa Batismo de ${r.nome}. A data do batismo pode ser corrigida aqui.` : !novo && livro === "rol" ? `No rol desde ${formatDateBR(r.data)}.` : undefined}
      saveLabel={novo ? "Registrar" : "Salvar"}
      saving={saving}
      missing={falta}
      dirty={retrato !== retratoInicial}
      error={error}
      onSave={salvar}
      onClose={onClose}
    >
      <datalist id={listaPessoas}>{people.map((p) => <option key={p.id} value={p.name} />)}</datalist>
      <datalist id={listaMembros}>{members.map((m) => <option key={m.id} value={m.name} />)}</datalist>

      {livro === "casamento" ? (
        <FormSection title="Noivos">
          <div className="fs-grid">
            <div className="field half"><label className="field-label req" htmlFor={`${fid}-noivo`}>Noivo</label><input id={`${fid}-noivo`} className="input" list={listaMembros} value={noivo} onChange={(e) => setNoivo(e.target.value)} placeholder="Nome completo" /></div>
            <div className="field half"><label className="field-label req" htmlFor={`${fid}-noiva`}>Noiva</label><input id={`${fid}-noiva`} className="input" list={listaMembros} value={noiva} onChange={(e) => setNoiva(e.target.value)} placeholder="Nome completo" /></div>
          </div>
          <div className="field-hint">Ao digitar, aparecem as pessoas da igreja. Quem não é membro pode ser escrito à mão.</div>
        </FormSection>
      ) : null}

      {livro === "apresentacao" ? (
        <FormSection title="Criança">
          {kidsChildren.length ? (
            <div className="field">
              <label className="field-label" htmlFor={`${fid}-kids`}>Criança do Kids</label>
              <select id={`${fid}-kids`} className="input" value={childId} onChange={(e) => (e.target.value ? escolherCrianca(e.target.value) : setChildId(""))}>
                <option value="">Não está no Kids</option>
                {[...kidsChildren].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="field-hint">Escolhendo a criança, nome, nascimento e responsáveis vêm do cadastro do Kids.</div>
            </div>
          ) : null}
          <div className="fs-grid">
            <div className="field"><label className="field-label req" htmlFor={`${fid}-cri`}>Nome da criança</label><input id={`${fid}-cri`} className="input" value={crianca} onChange={(e) => setCrianca(e.target.value)} placeholder="Nome completo" /></div>
            <div className="field half"><label className="field-label" htmlFor={`${fid}-nasc`}>Nascimento</label><input id={`${fid}-nasc`} className="input" type="date" value={nascimento ?? ""} onChange={(e) => setNascimento(e.target.value)} /></div>
            <div className="field"><label className="field-label" htmlFor={`${fid}-pais`}>Pais ou responsáveis</label><input id={`${fid}-pais`} className="input" list={listaMembros} value={pais} onChange={(e) => setPais(e.target.value)} placeholder="ex: Ana Souza e Pedro Souza" /></div>
          </div>
        </FormSection>
      ) : null}

      {livro === "rol" ? (
        <FormSection title="Entrada">
          <div className="fs-grid">
            <div className="field half"><label className="field-label req" htmlFor={`${fid}-data`}>Data de entrada</label><input id={`${fid}-data`} className="input" type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
            <div className="field half">
              <label className="field-label" htmlFor={`${fid}-forma`}>Como entrou</label>
              <select id={`${fid}-forma`} className="input" value={forma} onChange={(e) => setForma(e.target.value)}>
                <option value="">Não informado</option>
                {FORMAS_ENTRADA.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>
        </FormSection>
      ) : (
        <FormSection title={livro === "batismo" ? "Batismo" : livro === "casamento" ? "Cerimônia" : "Apresentação"}>
          <div className="fs-grid">
            <div className="field half"><label className="field-label req" htmlFor={`${fid}-data`}>Data</label><input id={`${fid}-data`} className="input" type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
            <div className="field half"><label className="field-label" htmlFor={`${fid}-ofi`}>Oficiante</label><input id={`${fid}-ofi`} className="input" list={listaPessoas} value={oficiante} onChange={(e) => setOficiante(e.target.value)} placeholder="Quem celebrou" /></div>
            <div className="field"><label className="field-label" htmlFor={`${fid}-local`}>Local</label><input id={`${fid}-local`} className="input" value={local} onChange={(e) => setLocal(e.target.value)} placeholder="ex: Templo sede" /></div>
          </div>
        </FormSection>
      )}

      {livro === "casamento" ? (
        <FormSection title="Testemunhas">
          {testemunhas.map((t, i) => (
            <div className="field" key={i}>
              <label className="field-label" htmlFor={`${fid}-tes-${i}`}>Testemunha {i + 1}</label>
              <input id={`${fid}-tes-${i}`} className="input" list={listaMembros} value={t} onChange={(e) => setTestemunhas((l) => l.map((x, j) => (j === i ? e.target.value : x)))} placeholder="Nome completo" />
            </div>
          ))}
          {testemunhas.length < 6 ? <button className="btn btn-sec btn-sm" type="button" onClick={() => setTestemunhas((l) => [...l, ""])}>Adicionar testemunha</button> : null}
        </FormSection>
      ) : null}

      {livro === "rol" ? (
        <FormSection title="Saída">
          <label className="fs-check">
            <input type="checkbox" checked={saiu} onChange={(e) => setSaiu(e.target.checked)} /> Saiu do rol
          </label>
          {saiu ? (
            <div className="fs-grid">
              <div className="field half"><label className="field-label req" htmlFor={`${fid}-saida`}>Data de saída</label><input id={`${fid}-saida`} className="input" type="date" value={saida} onChange={(e) => setSaida(e.target.value)} /></div>
              <div className="field half">
                <label className="field-label req" htmlFor={`${fid}-motivo`}>Motivo</label>
                <select id={`${fid}-motivo`} className="input" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                  <option value="">Escolha</option>
                  {[...new Set([...MOTIVOS_SAIDA, ...(motivo ? [motivo] : [])])].map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
          ) : <div className="field-hint">A ficha continua no app. Marcar a saída só muda o rol e a carteirinha deixa de valer.</div>}
        </FormSection>
      ) : null}

      <FormSection title="Livro de papel">
        <div className="fs-grid">
          <div className="field half"><label className="field-label" htmlFor={`${fid}-liv`}>Livro</label><input id={`${fid}-liv`} className="input" inputMode="numeric" value={livroFisico} onChange={(e) => setLivroFisico(e.target.value)} placeholder="ex: 2" /></div>
          <div className="field half"><label className="field-label" htmlFor={`${fid}-fl`}>Folha</label><input id={`${fid}-fl`} className="input" inputMode="numeric" value={folha} onChange={(e) => setFolha(e.target.value)} placeholder="ex: 14" /></div>
          <div className="field"><label className="field-label" htmlFor={`${fid}-obs`}>Observação</label><textarea id={`${fid}-obs`} className="input" rows={3} value={obs} onChange={(e) => setObs(e.target.value)} /></div>
        </div>
        <div className="field-hint">Opcional. Use se a igreja também registra no livro físico.</div>
      </FormSection>

      {livro === "rol" && r?.member_id && !r.saida ? (
        <FormSection title="Carteirinha">
          <button className="btn btn-sec" type="button" onClick={() => onCarteirinha(r.member_id!)}>Abrir carteirinha</button>
        </FormSection>
      ) : null}

      {!novo && (livro === "casamento" || livro === "apresentacao") ? (
        <FormSection title="Apagar">
          {apagar ? (
            <div className="sec-apagar">
              <p className="field-hint">Apagar o registro nº {numeroFmt(r.numero)}? O número fica vago no livro e não volta.</p>
              <div className="sec-apagar-acts">
                <button className="btn btn-sec btn-sm" type="button" onClick={() => setApagar(false)}>Manter registro</button>
                <button className="btn btn-danger btn-sm" type="button" disabled={saving} onClick={remover}>Apagar registro</button>
              </div>
            </div>
          ) : <button className="btn btn-sec btn-sm" type="button" onClick={() => setApagar(true)}>Apagar este registro</button>}
        </FormSection>
      ) : null}
    </FormScreen>
  );
}
