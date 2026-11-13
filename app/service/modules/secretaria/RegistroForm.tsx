"use client";

/* Abrir ou lançar um registro de livro. Batismo e Rol vêm dos fatos e das
   fichas: aqui só se completa (oficiante, folha, saída). Casamento e
   Apresentação se lançam e se apagam aqui. */
import { useId, useRef, useState } from "react";
import { avisar } from "../../lib/avisar";
import { useRelogioDaIgreja } from "../../lib/relogio-context";
import { formatDateBR } from "../../lib/date";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { FormScreen, FormSection, type FormScreenHandle } from "../../painel/form/FormScreen";
import type { ChildGuardianView, ChurchView, MemberView, PersonView } from "../../ServiceExactApp";
import { FORMAS_ENTRADA, MOTIVOS_SAIDA, REGISTRO_COLS, livroNaTela, numeroFmt, rotuloDoRol, type Livro, type Registro } from "./livros";

import { Botao } from "../../ui/Botao";
import { Campo, Entrada, TextoLongo, Marcar } from "../../ui/Campo";
import { Selecao } from "../../ui/Selecao";
import { SeletorData } from "../../ui/Data";
import { useTexto } from "../../lib/internacional/contexto";

/* id do registro criado no modo demonstração (fora do componente: roda só no clique) */
const idDemo = () => `demo-novo-${Date.now()}`;
/** o que o livro usa da criança do Kids */
export type CriancaKids = { id: string; name: string; birth: string | null };

export function RegistroForm({ livro, registro, church, demo, members, people, kidsChildren, childGuardians, currentPersonId, onSalvo, onCarteirinha, onClose }: {
  livro: Livro;
  registro: Registro | null;
  church: ChurchView;
  demo: boolean;
  members: MemberView[];
  people: PersonView[];
  kidsChildren: CriancaKids[];
  childGuardians: ChildGuardianView[];
  currentPersonId?: string | null;
  onSalvo: (r: Registro, removido?: boolean) => void;
  onCarteirinha: (memberId: string) => void;
  onClose: () => void;
}) {
  const traduzirUi = useTexto();
  const { todayISO } = useRelogioDaIgreja();
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
    !data && (livro === "rol" ? traduzirUi("data de entrada") : traduzirUi("data")),
    livro === "casamento" && !noivo.trim() && traduzirUi("nome do noivo"),
    livro === "casamento" && !noiva.trim() && traduzirUi("nome da noiva"),
    livro === "apresentacao" && !crianca.trim() && traduzirUi("nome da criança"),
    livro === "rol" && saiu && !saida && traduzirUi("data de saída"),
    livro === "rol" && saiu && !motivo && traduzirUi("motivo da saída"),
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
      salvoReg = { ...(r ?? { id: idDemo(), organization_id: church.organizationId, church_id: church.id, livro, numero: 0, member_id: null, fato_id: null }), ...campos } as Registro;
    } else {
      const sb = createServiceBrowserClient().schema("service");
      const q = r
        ? sb.from("registros").update(campos).eq("id", r.id).select(REGISTRO_COLS).single()
        : sb.from("registros").insert({ ...campos, organization_id: church.organizationId, church_id: church.id, livro, created_by: currentPersonId ?? null }).select(REGISTRO_COLS).single();
      const { data: linha, error: e } = await q;
      if (e || !linha) { setSaving(false); setError(traduzirUi("Não deu para salvar o registro. Confira a conexão e tente de novo.")); return; }
      salvoReg = linha as Registro;
    }
    onSalvo(salvoReg);
    setSaving(false);
    avisar(!novo ? traduzirUi("Registro atualizado") : salvoReg.numero ? traduzirUi("Registro nº {numero} criado em {livro}", { numero: numeroFmt(salvoReg.numero), livro: livroNaTela(livro, traduzirUi).rotulo }) : traduzirUi("Registro criado em {livro}", { livro: livroNaTela(livro, traduzirUi).rotulo }));
    if (telaRef.current) await telaRef.current.fechar(); else onClose();
  };

  const remover = async () => {
    if (!r) return;
    setSaving(true);
    if (!demo) {
      const { error: e } = await createServiceBrowserClient().schema("service").from("registros").delete().eq("id", r.id);
      if (e) { setSaving(false); setApagar(false); setError(traduzirUi("Não deu para apagar o registro. Tente de novo.")); return; }
    }
    onSalvo(r, true);
    setSaving(false);
    avisar(traduzirUi("Registro apagado do livro"), "info");
    if (telaRef.current) await telaRef.current.fechar(); else onClose();
  };

  const titulo = novo ? (livro === "casamento" ? traduzirUi("Registrar casamento") : traduzirUi("Registrar apresentação")) : nomeDoRegistro || r.nome;
  const eyebrow = novo ? livroNaTela(livro, traduzirUi).rotulo : traduzirUi("{livro} · nº {numero}", { livro: livroNaTela(livro, traduzirUi).rotulo, numero: numeroFmt(r.numero) });
  const listaPessoas = `${fid}-pessoas`;
  const listaMembros = `${fid}-membros`;

  return (
    <FormScreen
      ref={telaRef}
      eyebrow={eyebrow}
      title={titulo}
      subtitle={!novo && r.fato_id ? traduzirUi("Veio da etapa Batismo de {nome}. A data do batismo pode ser corrigida aqui.", { nome: r.nome }) : !novo && livro === "rol" ? traduzirUi("No rol desde {data}.", { data: formatDateBR(r.data) }) : undefined}
      saveLabel={novo ? traduzirUi("Registrar") : traduzirUi("Salvar")}
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
        <FormSection title={traduzirUi("Noivos")}>
          <div className="fs-grid">
            <Campo rotulo={traduzirUi("Noivo")} obrigatorio className="half"><Entrada id={`${fid}-noivo`} list={listaMembros} value={noivo} onChange={(e) => setNoivo(e.target.value)} placeholder={traduzirUi("Nome completo")} /></Campo>
            <Campo rotulo={traduzirUi("Noiva")} obrigatorio className="half"><Entrada id={`${fid}-noiva`} list={listaMembros} value={noiva} onChange={(e) => setNoiva(e.target.value)} placeholder={traduzirUi("Nome completo")} /></Campo>
          </div>
          <div className="field-hint">{traduzirUi("Ao digitar, aparecem as pessoas da igreja. Quem não é membro pode ser escrito à mão.")}</div>
        </FormSection>
      ) : null}

      {livro === "apresentacao" ? (
        <FormSection title={traduzirUi("Criança")}>
          {kidsChildren.length ? (
            <Campo rotulo={traduzirUi("Criança do Kids")} ajuda={traduzirUi("Escolhendo a criança, nome, nascimento e responsáveis vêm do cadastro do Kids.")}><Selecao id={`${fid}-kids`} valor={childId} aoMudar={(v) => (v ? escolherCrianca(v) : setChildId(""))} vazio={traduzirUi("Não está no Kids")} opcoes={[...kidsChildren].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")).map((c) => ({ v: c.id, l: c.name }))} /></Campo>
          ) : null}
          <div className="fs-grid">
            <Campo rotulo={traduzirUi("Nome da criança")} obrigatorio><Entrada id={`${fid}-cri`} value={crianca} onChange={(e) => setCrianca(e.target.value)} placeholder={traduzirUi("Nome completo")} /></Campo>
            <Campo rotulo={traduzirUi("Nascimento")} className="half"><SeletorData id={`${fid}-nasc`} valor={nascimento ?? ""} aoMudar={setNascimento} /></Campo>
            <Campo rotulo={traduzirUi("Pais ou responsáveis")}><Entrada id={`${fid}-pais`} list={listaMembros} value={pais} onChange={(e) => setPais(e.target.value)} placeholder={traduzirUi("ex: Ana Souza e Pedro Souza")} /></Campo>
          </div>
        </FormSection>
      ) : null}

      {livro === "rol" ? (
        <FormSection title={traduzirUi("Entrada")}>
          <div className="fs-grid">
            <Campo rotulo={traduzirUi("Data de entrada")} obrigatorio className="half"><SeletorData id={`${fid}-data`} valor={data} aoMudar={setData} /></Campo>
            <Campo rotulo={traduzirUi("Como entrou")} className="half"><Selecao id={`${fid}-forma`} valor={forma} aoMudar={setForma} vazio={traduzirUi("Não informado")} opcoes={FORMAS_ENTRADA.map((f) => ({ v: f, l: rotuloDoRol(f, traduzirUi) }))} /></Campo>
          </div>
        </FormSection>
      ) : (
        <FormSection title={livro === "batismo" ? traduzirUi("Batismo") : livro === "casamento" ? traduzirUi("Cerimônia") : traduzirUi("Apresentação")}>
          <div className="fs-grid">
            <Campo rotulo={traduzirUi("Data")} obrigatorio className="half"><SeletorData id={`${fid}-data`} valor={data} aoMudar={setData} /></Campo>
            <Campo rotulo={traduzirUi("Oficiante")} className="half"><Entrada id={`${fid}-ofi`} list={listaPessoas} value={oficiante} onChange={(e) => setOficiante(e.target.value)} placeholder={traduzirUi("Quem celebrou")} /></Campo>
            <Campo rotulo={traduzirUi("Local")}><Entrada id={`${fid}-local`} value={local} onChange={(e) => setLocal(e.target.value)} placeholder={traduzirUi("ex: Templo sede")} /></Campo>
          </div>
        </FormSection>
      )}

      {livro === "casamento" ? (
        <FormSection title={traduzirUi("Testemunhas")}>
          {testemunhas.map((t, i) => (
            <div className="field" key={i}>
              <label className="field-label" htmlFor={`${fid}-tes-${i}`}>{traduzirUi("Testemunha {n}", { n: String(i + 1) })}</label>
              <input id={`${fid}-tes-${i}`} className="input" list={listaMembros} value={t} onChange={(e) => setTestemunhas((l) => l.map((x, j) => (j === i ? e.target.value : x)))} placeholder={traduzirUi("Nome completo")} />
            </div>
          ))}
          {testemunhas.length < 6 ? <Botao compacto onClick={() => setTestemunhas((l) => [...l, ""])}>{traduzirUi("Adicionar testemunha")}</Botao> : null}
        </FormSection>
      ) : null}

      {livro === "rol" ? (
        <FormSection title={traduzirUi("Saída")}>
          <Marcar className="fs-check" checked={saiu} onChange={(e) => setSaiu(e.target.checked)}>{traduzirUi("Saiu do rol")}</Marcar>
          {saiu ? (
            <div className="fs-grid">
              <Campo rotulo={traduzirUi("Data de saída")} obrigatorio className="half"><SeletorData id={`${fid}-saida`} valor={saida} aoMudar={setSaida} /></Campo>
              <Campo rotulo={traduzirUi("Motivo")} obrigatorio className="half"><Selecao id={`${fid}-motivo`} valor={motivo} aoMudar={setMotivo} vazio={traduzirUi("Escolha")} opcoes={[...new Set([...MOTIVOS_SAIDA, ...(motivo ? [motivo] : [])])].map((m) => ({ v: m, l: rotuloDoRol(m, traduzirUi) }))} /></Campo>
            </div>
          ) : <div className="field-hint">{traduzirUi("A ficha continua no app. Marcar a saída só muda o rol e a carteirinha deixa de valer.")}</div>}
        </FormSection>
      ) : null}

      <FormSection title={traduzirUi("Livro de papel")}>
        <div className="fs-grid">
          <Campo rotulo={traduzirUi("Livro")} className="half"><Entrada id={`${fid}-liv`} inputMode="numeric" value={livroFisico} onChange={(e) => setLivroFisico(e.target.value)} placeholder={traduzirUi("ex: 2")} /></Campo>
          <Campo rotulo={traduzirUi("Folha")} className="half"><Entrada id={`${fid}-fl`} inputMode="numeric" value={folha} onChange={(e) => setFolha(e.target.value)} placeholder={traduzirUi("ex: 14")} /></Campo>
          <Campo rotulo={traduzirUi("Observação")}><TextoLongo id={`${fid}-obs`} rows={3} value={obs} onChange={(e) => setObs(e.target.value)} /></Campo>
        </div>
        <div className="field-hint">{traduzirUi("Opcional. Use se a igreja também registra no livro físico.")}</div>
      </FormSection>

      {livro === "rol" && r?.member_id && !r.saida ? (
        <FormSection title={traduzirUi("Carteirinha")}>
          <Botao onClick={() => onCarteirinha(r.member_id!)}>{traduzirUi("Abrir carteirinha")}</Botao>
        </FormSection>
      ) : null}

      {!novo && (livro === "casamento" || livro === "apresentacao") ? (
        <FormSection title={traduzirUi("Apagar")}>
          {apagar ? (
            <div className="sec-apagar">
              <p className="field-hint">{traduzirUi("Apagar o registro nº {numero}? O número fica vago no livro e não volta.", { numero: numeroFmt(r.numero) })}</p>
              <div className="sec-apagar-acts">
                <Botao compacto onClick={() => setApagar(false)}>{traduzirUi("Manter registro")}</Botao>
                <Botao variante="perigo" compacto desativado={saving} onClick={remover}>{traduzirUi("Apagar registro")}</Botao>
              </div>
            </div>
          ) : <Botao compacto onClick={() => setApagar(true)}>{traduzirUi("Apagar este registro")}</Botao>}
        </FormSection>
      ) : null}
    </FormScreen>
  );
}
