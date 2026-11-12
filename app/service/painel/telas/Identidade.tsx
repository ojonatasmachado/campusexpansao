"use client";

import { avisar } from "../../lib/avisar";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { uploadServiceImage, imageExtension } from "../../lib/upload-image";
import { Icon } from "../../lib/icons";

import { useTermos } from "../../lib/vocabulario-context";
import { PageHead } from "../ui";
import { FormScreen, FormSection, type FormScreenHandle } from "../form/FormScreen";
import { friendlyWriteError } from "../erros";
import type { ChurchIdentityView, ChurchView, CycleView, HistoryEntryView, ModalState } from "../tipos";

import { Botao } from "../../ui/Botao";
import { Acao } from "../../ui/Acao";
import { Campo, Entrada, TextoLongo } from "../../ui/Campo";
import { Vazio } from "../../ui/Estados";
import { useTexto } from "../../lib/internacional/contexto";

export function ValoresEditModal({ church, identity, onClose, onRefresh }: {
  church: ChurchView | undefined;
  identity?: ChurchIdentityView | null;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const traduzirUi = useTexto();

  const [rows, setRows] = useState<Array<{ title: string; texto: string }>>(
    () => (identity?.values ?? []).map((v) => ({ title: v.title, texto: v.texto ?? "" })),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const telaRef = useRef<FormScreenHandle>(null);
  const fid = useId();

  const setRow = (i: number, patch: Partial<{ title: string; texto: string }>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () => setRows((prev) => [...prev, { title: "", texto: "" }]);
  const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));

  const salvar = async () => {
    if (!church?.id) { setError(traduzirUi("Nenhuma igreja encontrada para salvar os valores.")); return; }
    setSaving(true);
    setError("");
    const cleaned = rows.map((r) => ({ title: r.title.trim(), texto: r.texto.trim() })).filter((r) => r.title);
    const { error: erro } = await createServiceBrowserClient()
      .schema("service")
      .from("church_identity")
      .upsert({
        church_id: church.id,
        organization_id: church.organizationId,
        values: cleaned,
        updated_at: new Date().toISOString(),
      });
    if (erro) { setSaving(false); setError(friendlyWriteError(erro.message, traduzirUi)); return; }
    if (telaRef.current) await telaRef.current.fechar(); else onClose();
    onRefresh();
  };

  const retrato = JSON.stringify(rows);
  const [retratoInicial] = useState(retrato);
  const semNome = rows.some((r) => !r.title.trim() && r.texto.trim());

  return (
    <FormScreen
      ref={telaRef}
      eyebrow={traduzirUi("Identidade")}
      title={traduzirUi("Valores da igreja")}
      subtitle={traduzirUi("Cada valor tem um nome e uma frase do que ele significa na prática.")}
      saveLabel={traduzirUi("Salvar")}
      saving={saving}
      missing={semNome ? ["nome de cada valor"] : []}
      dirty={retrato !== retratoInicial}
      error={error}
      onSave={salvar}
      onClose={onClose}
    >
      {rows.map((r, i) => (
        <FormSection key={i} title={r.title.trim() || traduzirUi("Valor {n}", { n: String(i + 1) })}>
          <Campo rotulo={traduzirUi("Nome")} obrigatorio><Entrada id={`${fid}-v${i}`} value={r.title} onChange={(e) => setRow(i, { title: e.target.value })} placeholder={traduzirUi("ex: Acolhimento")} /></Campo>
          <Campo rotulo={traduzirUi("O que significa")}><TextoLongo id={`${fid}-d${i}`} value={r.texto} onChange={(e) => setRow(i, { texto: e.target.value })} placeholder={traduzirUi("O que esse valor significa na prática")} /></Campo>
          <Botao compacto onClick={() => removeRow(i)}>{traduzirUi("Remover valor")}</Botao>
        </FormSection>
      ))}
      {rows.length === 0 && <p className="fs-note">{traduzirUi("Nenhum valor cadastrado ainda.")}</p>}
      <Botao onClick={addRow}>{traduzirUi("Adicionar valor")}</Botao>
    </FormScreen>
  );
}

export function Identidade({ church, identity, cycle, setModal }: { church?: ChurchView; identity?: ChurchIdentityView | null; cycle?: CycleView; setModal: (modal: ModalState) => void }) {
  const traduzirUi = useTexto();

  const router = useRouter();
  const values = identity?.values ?? [];
  const [editingValores, setEditingValores] = useState(false);
  return (
    <div className="content wide">
      <PageHead
        title={traduzirUi("Identidade e propósito")}
        eyebrow={traduzirUi("Nossa igreja")}
        help={traduzirUi("Visão, valores e o chamado da igreja. Aparece pro membro no app e na página da igreja da igreja.")}
        action={<Botao onClick={() => setModal({ eyebrow: traduzirUi("Editar"), title: traduzirUi("Identidade da Igreja"), subtitle: traduzirUi("Atualize propósito, missão e visão da Igreja. Para os valores, use \"Editar valores\" abaixo."), saveLabel: traduzirUi("Salvar"), formFields: [{ k:"proposito", label:traduzirUi("Propósito"), type:"area", ph:identity?.purpose ?? traduzirUi("Por que a Igreja existe...") }, { k:"missao", label:traduzirUi("Missão"), type:"area", ph:identity?.mission ?? traduzirUi("A missão da Igreja...") }, { k:"visao", label:traduzirUi("Visão"), type:"area", ph:identity?.vision ?? traduzirUi("A visão da Igreja...") }, { k:"versiculo", label:traduzirUi("Versículo"), type:"text", ph:identity?.verse ?? traduzirUi("ex: Mateus 28:19") }], action: { kind: "identity" } })}>{traduzirUi("Editar")}</Botao>}
      />
      <div className="section-divide">
        <span className="num">01</span><span className="label">{traduzirUi("Missão & propósito")}</span><span className="line" />
      </div>
      {identity?.mission ? (
        <div className="ident-hero">
          <div className="ident-hero-label">{traduzirUi("Declaração de missão")}</div>
          <div className="ident-hero-text">{identity.mission}</div>
          {identity?.verse && <div className="ident-verse">§ {identity.verse}</div>}
        </div>
      ) : null}
      {(identity?.purpose || identity?.vision) ? (
        <div className="ident-grid">
          {identity?.purpose ? (
            <div className="ident-card">
              <div className="ident-card-ic"><Icon name="identidade" size={18} /></div>
              <div className="ident-card-t">{traduzirUi("Propósito")}</div>
              <div className="ident-card-x">{identity.purpose}</div>
            </div>
          ) : null}
          {identity?.vision ? (
            <div className="ident-card">
              <div className="ident-card-ic"><Icon name="painel" size={18} /></div>
              <div className="ident-card-t">{traduzirUi("Visão")}</div>
              <div className="ident-card-x">{identity.vision}</div>
            </div>
          ) : null}
        </div>
      ) : null}
      {!identity?.mission && !identity?.purpose && !identity?.vision ? (
        <Vazio titulo={traduzirUi("Nenhuma missão, propósito ou visão cadastrado ainda.")} />
      ) : null}
      <div className="section-divide" style={{ marginTop: 28 }}>
        <span className="num">02</span><span className="label">{traduzirUi("Valores")}</span><span className="line" />
        <Botao variante="texto" onClick={() => setEditingValores(true)}>{traduzirUi("Editar valores")}</Botao>
      </div>
      {values.length > 0 ? (
        <div className="val-grid">
          {values.map((v, i) => (
            <div className="val-card" key={v.title + i}>
              <div className="val-ic"><Icon name={["membros", "identidade", "decisoes"][i % 3]} size={14} /></div>
              <div className="val-t">{v.title}</div>
              {v.texto ? <div className="val-x">{v.texto}</div> : null}
            </div>
          ))}
        </div>
      ) : (
        <Vazio titulo={traduzirUi("Nenhum valor cadastrado ainda.")} />
      )}
      {editingValores && <ValoresEditModal church={church} identity={identity} onClose={() => setEditingValores(false)} onRefresh={() => router.refresh()} />}
      <div className="section-divide" style={{ marginTop: 28 }}>
        <span className="num">03</span><span className="label">{traduzirUi("Tema do ciclo atual")}</span><span className="line" />
        {cycle ? <Botao variante="texto" onClick={() => setModal({ eyebrow: traduzirUi("Editar"), title: traduzirUi("Ciclo {ano}", { ano: cycle.year }), subtitle: traduzirUi("A visão do ano que todos enxergam."), saveLabel: traduzirUi("Salvar"), formFields: [{ k:"ano", label:traduzirUi("Ano / período"), type:"text", half:true, req:true, ph:cycle.year }, { k:"tema", label:traduzirUi("Tema"), type:"text", half:true, req:true, ph:cycle.theme }, { k:"versiculo", label:traduzirUi("Versículo"), type:"text", ph:cycle.verse ?? traduzirUi("ex: Salmos 1:3") }, { k:"desc", label:traduzirUi("Descrição"), type:"area", ph:cycle.body ?? traduzirUi("O que esse tema significa para a Igreja...") }, { k:"objetivos", label:traduzirUi("Objetivos (separados por vírgula)"), type:"text", ph:cycle.objectives.map((o) => o.title).join(", ") }], action: { kind: "cycle", id: cycle.id } })}>{traduzirUi("Editar ciclo")}</Botao> : null}
      </div>
      {cycle ? (
        <div className="ciclo">
          <div className="ciclo-banner">
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(150deg, var(--olive-deep), #2d3d18)" }} />
            <span className="ciclo-banner-tag">{cycle.year}</span>
          </div>
          <div className="ciclo-body">
            <div className="ciclo-tema">{cycle.theme}</div>
            {cycle.verse && <div className="ciclo-verse">§ {cycle.verse}</div>}
            {cycle.body && <div className="ciclo-text">{cycle.body}</div>}
            {cycle.objectives.length > 0 && (
              <div className="ciclo-obj" style={{ marginTop: 22 }}>
                <div className="ciclo-obj-t">{traduzirUi("Objetivos do ciclo")}</div>
                {cycle.objectives.map((obj, i) => (
                  <div className="ciclo-obj-row" key={obj.title}><span className="ciclo-obj-n">0{i + 1}</span>{obj.title}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <Vazio titulo={traduzirUi("Nenhum ciclo cadastrado ainda.")} />
      )}
      <div style={{ marginTop: 16 }}>
        <Botao compacto onClick={() => setModal({ eyebrow: traduzirUi("Criar"), title: traduzirUi("Novo ciclo anual"), subtitle: traduzirUi("O tema que guia a Igreja neste período."), saveLabel: traduzirUi("Criar ciclo"), formFields: [{ k:"ano", label:traduzirUi("Ano / período"), type:"text", half:true, req:true, ph:traduzirUi("ex: 2026 · 1º semestre") }, { k:"tema", label:traduzirUi("Tema"), type:"text", half:true, req:true, ph:traduzirUi("ex: Raízes profundas") }, { k:"versiculo", label:traduzirUi("Versículo"), type:"text", ph:traduzirUi("ex: Salmos 1:3") }, { k:"desc", label:traduzirUi("Descrição"), type:"area", ph:traduzirUi("O que esse tema significa para a Igreja...") }, { k:"objetivos", label:traduzirUi("Objetivos (separados por vírgula)"), type:"text", ph:traduzirUi("ex: Leitura bíblica diária, Multiplicar GCs") }], action: { kind: "cycle" } })}>{traduzirUi("+ Novo ciclo")}</Botao>
      </div>
    </div>
  );
}

export function Historia({ church, historyEntries, setModal }: { church?: ChurchView; historyEntries: HistoryEntryView[]; setModal: (modal: ModalState) => void }) {
  const traduzirUi = useTexto();

  const { comTermos: ct } = useTermos();
  const router = useRouter();
  const capitulos = [...historyEntries].sort((a, b) => a.sort_order - b.sort_order);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const trocarFoto = async (capituloId: string, file: File | undefined) => {
    if (!file || !church) return;
    setUploadingId(capituloId);
    try {
      const path = `${church.organizationId}/history/${capituloId}.${imageExtension(file)}`;
      const url = await uploadServiceImage(createServiceBrowserClient(), file, path);
      await createServiceBrowserClient().schema("service").from("history_entries").update({ photo_url: url }).eq("id", capituloId);
      router.refresh();
    } catch {
      avisar(traduzirUi("Não foi possível enviar a foto agora."), "warn");
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <div className="content wide">
      <PageHead
        title={traduzirUi("Nossa história")}
        eyebrow={traduzirUi("Nossa igreja")}
        help={ct(traduzirUi("Os marcos da {caminhada} da igreja, em linha do tempo. Cada capítulo pode ter ano, foto e um link."))}
        action={<Botao variante="principal" onClick={() => setModal({ eyebrow: traduzirUi("Criar"), title: traduzirUi("Novo capítulo"), subtitle: traduzirUi("Registre um momento importante da história da Igreja."), saveLabel: traduzirUi("Adicionar capítulo"), formFields: [{ k:"ano", label:traduzirUi("Ano"), type:"text", half:true, ph:traduzirUi("ex: 2023") }, { k:"titulo", label:traduzirUi("Título"), type:"text", half:true, ph:traduzirUi("ex: Fundação da Igreja") }, { k:"desc", label:traduzirUi("História"), type:"area", ph:traduzirUi("Conte esse momento...") }, { k:"link", label:traduzirUi("Link (opcional)"), type:"text", ph:"https://…", hint:traduzirUi("Vídeo, matéria ou álbum de fotos.") }], action: { kind: "historyEntry" } })}>{traduzirUi("+ Adicionar capítulo")}</Botao>}
      />
      {capitulos.length === 0 && <Vazio titulo={traduzirUi("Ainda não há capítulos. Adicione o primeiro.")} />}
      <div className="hist">
        {capitulos.map((capitulo, i) => (
          <div key={capitulo.id} className={`hist-item ${i % 2 === 1 ? "rev" : ""}`}>
            <div className="hist-photo">
              {capitulo.photo_url ? (
                <img className="hist-photo-img" src={capitulo.photo_url} alt={capitulo.title} />
              ) : (
                <div style={{ position: "absolute", inset: 0, background: i % 2 === 1 ? "linear-gradient(150deg, var(--olive-deep), #243012)" : "linear-gradient(150deg, #7a6526, #3d3415)" }} />
              )}
              <span className="hist-year">{capitulo.year || "-"}</span>
              <Acao
                className="hist-photo-tog"
                desativado={uploadingId === capitulo.id}
                onClick={() => fileRefs.current[capitulo.id]?.click()}
              >
                {uploadingId === capitulo.id ? traduzirUi("Enviando...") : capitulo.photo_url ? traduzirUi("Trocar foto") : traduzirUi("+ Foto")}
              </Acao>
              <input
                ref={(el) => { fileRefs.current[capitulo.id] = el; }}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => { void trocarFoto(capitulo.id, e.target.files?.[0]); e.target.value = ""; }}
              />
            </div>
            <div className="hist-text">
              <div className="hist-t">{capitulo.title}</div>
              <div className="hist-x">{capitulo.body}</div>
              <div className="hist-foot">
                {capitulo.link ? <a className="hist-link" href={capitulo.link} target="_blank" rel="noreferrer">{traduzirUi("Ver mais →")}</a> : null}
                <Acao className="hist-edit" onClick={() => setModal({ eyebrow: traduzirUi("Editar"), title: traduzirUi("Capítulo de {ano}", { ano: capitulo.year ?? capitulo.title }), subtitle: traduzirUi("Edite este capítulo da história da Igreja."), saveLabel: traduzirUi("Salvar"), formFields: [{ k:"ano", label:traduzirUi("Ano"), type:"text", half:true, ph:capitulo.year ?? traduzirUi("ex: 2023") }, { k:"titulo", label:traduzirUi("Título"), type:"text", half:true, ph:capitulo.title }, { k:"desc", label:traduzirUi("História"), type:"area", ph:capitulo.body ?? traduzirUi("Conte esse momento...") }, { k:"link", label:traduzirUi("Link (opcional)"), type:"text", ph:capitulo.link ?? "https://…", hint:traduzirUi("Vídeo, matéria ou álbum de fotos.") }], action: { kind: "historyEntry", id: capitulo.id } })}>{traduzirUi("Editar")}</Acao>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SimpleModule({ title, subtitle, empty, setModal }: { title: string; subtitle: string; empty: string; setModal: (modal: ModalState) => void }) {
  const traduzirUi = useTexto();

  return (
    <div className="content">
      <PageHead title={title} eyebrow="Service" help={subtitle} action={<Botao variante="principal" onClick={() => setModal({ eyebrow: traduzirUi("Criar"), title: traduzirUi("Criar {item}", { item: title.toLowerCase() }), subtitle, formFields: [{ k:"nome", label:traduzirUi("Nome"), type:"text", req:true, ph:traduzirUi("Nome") }, { k:"responsavel", label:traduzirUi("Responsável"), type:"text", ph:traduzirUi("Responsável") }, { k:"obs", label:traduzirUi("Observações"), type:"area", ph:traduzirUi("Observações...") }] })}>{traduzirUi("+ Criar")}</Botao>} />
      <div className="empty"><div className="empty-mark">0</div><h3 className="empty-title">{empty}</h3><p className="empty-desc">{traduzirUi("Este módulo está pronto para receber os registros do banco.")}</p></div>
    </div>
  );
}
