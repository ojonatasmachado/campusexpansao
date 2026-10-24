"use client";

import { useId, useRef, useState } from "react";
import { createServiceBrowserClient } from "../../../lib/supabase-browser";
import CepInput from "../../../CepInput";
import { FormScreen, FormSection, type FormScreenHandle } from "../../form/FormScreen";
import { friendlyWriteError } from "../../erros";
import type { ChurchView, MinistryView, TagView } from "../../tipos";
import { Linha } from "../../../ui/Linha";
import { Campo, Entrada } from "../../../ui/Campo";

export function CongregacaoEditModal({
  churchRow, ministries, tags, onClose, onRefresh,
}: {
  churchRow: ChurchView;
  ministries: MinistryView[];
  tags: TagView[];
  onClose: () => void;
  onRefresh: () => void;
}) {
  const churchMinistries = ministries.filter((m) => m.churchId === churchRow.id);
  const churchTags = tags.filter((t) => t.churchId === churchRow.id);
  const [form, setForm] = useState({
    nome: churchRow.nome,
    cidade: churchRow.cidade ?? "",
    doc: churchRow.doc ?? "",
    fundada: churchRow.foundedYear ?? "",
    endereco: churchRow.address ?? "",
    cep: churchRow.postalCode ?? "",
    email: churchRow.email ?? "",
    tel: churchRow.phone ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const telaRef = useRef<FormScreenHandle>(null);
  const fid = useId();
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const salvar = async () => {
    if (!form.nome.trim()) return;
    setSaving(true);
    setError("");
    const { error: erro } = await createServiceBrowserClient()
      .schema("service")
      .from("churches")
      .update({
        name: form.nome.trim(),
        city: form.cidade.trim() || null,
        doc: form.doc.trim() || null,
        founded_year: form.fundada.trim() || null,
        address: form.endereco.trim() || null,
        postal_code: form.cep.trim() || null,
        email: form.email.trim() || null,
        phone: form.tel.trim() || null,
      })
      .eq("id", churchRow.id);
    if (erro) { setSaving(false); setError(friendlyWriteError(erro.message)); return; }
    if (telaRef.current) await telaRef.current.fechar(); else onClose();
    onRefresh();
  };

  const retrato = JSON.stringify(form);
  const [retratoInicial] = useState(retrato);

  return (
    <FormScreen
      ref={telaRef}
      eyebrow={churchRow.matriz ? "Matriz · rede" : "Congregação"}
      title={form.nome.trim() || churchRow.nome}
      saveLabel="Salvar"
      saving={saving}
      missing={form.nome.trim() ? [] : ["nome"]}
      dirty={retrato !== retratoInicial}
      error={error}
      onSave={salvar}
      onClose={onClose}
    >
      <FormSection title="Congregação">
        <div className="fs-grid">
          <Campo rotulo="Nome" obrigatorio><Entrada id={`${fid}-nome`} aria-required="true" value={form.nome} onChange={set("nome")} /></Campo>
          <Campo rotulo="Cidade ou bairro"><Entrada id={`${fid}-cid`} value={form.cidade} onChange={set("cidade")} /></Campo>
          <Campo rotulo="CNPJ" className="half"><Entrada id={`${fid}-doc`} autoCapitalize="characters" value={form.doc} onChange={set("doc")} /></Campo>
          <Campo rotulo="Ano de fundação" className="half"><Entrada id={`${fid}-ano`} inputMode="numeric" value={form.fundada} onChange={set("fundada")} /></Campo>
        </div>
      </FormSection>

      <FormSection title="Endereço e contato">
        <div className="fs-grid">
          <Campo rotulo="Endereço"><Entrada id={`${fid}-end`} autoComplete="street-address" value={form.endereco} onChange={set("endereco")} /></Campo>
          <div className="field half"><label className="field-label" htmlFor={`${fid}-cep`}>CEP</label>{/* consulta o CEP: põe a congregação no mapa da igreja */}<CepInput id={`${fid}-cep`} value={form.cep} onChange={(v) => setForm((p) => ({ ...p, cep: v }))} onResult={() => {}} /></div>
          <Campo rotulo="Telefone" className="half"><Entrada id={`${fid}-tel`} type="tel" autoComplete="tel" value={form.tel} onChange={set("tel")} /></Campo>
          <Campo rotulo="E-mail"><Entrada id={`${fid}-mail`} type="email" autoComplete="email" value={form.email} onChange={set("email")} /></Campo>
        </div>
      </FormSection>

      <FormSection title="Times desta congregação">
        {churchMinistries.map((m) => {
          const leader = m.people.find((p) => p.isLeader);
          return (
            <Linha estilo="config" key={m.id}>
              <div className="cfg-row-main">
                <div className="cfg-row-t">{m.name}</div>
                <div className="cfg-row-s">{leader ? `líder ${leader.personName}` : "sem líder definido"}</div>
              </div>
            </Linha>
          );
        })}
        {churchMinistries.length === 0 && <p className="fs-note">Nenhum time cadastrado nesta congregação.</p>}
      </FormSection>

      <FormSection title="Etiquetas">
        <div className="cell-tags" style={{ gap: 8 }}>
          {churchTags.map((t) => <span key={t.id} className="papel-tag">{t.name}</span>)}
        </div>
        {churchTags.length === 0 && <p className="fs-note">Nenhuma etiqueta cadastrada nesta congregação.</p>}
      </FormSection>
    </FormScreen>
  );
}
