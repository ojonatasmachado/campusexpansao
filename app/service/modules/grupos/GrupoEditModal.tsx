"use client";

import { useId, useRef, useState } from "react";
import CepInput, { type CepResult } from "../../CepInput";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { useTermos } from "../../lib/vocabulario-context";
import { FormScreen, FormSection, type FormScreenHandle } from "../../painel/form/FormScreen";
import { friendlyWriteError } from "../../painel/erros";
import type { FellowshipGroupView, PersonView } from "../../painel/tipos";

/* Editar um grupo (célula, GC, PG): dia, horário, líder, local e lotação.
   O local é público para os membros da igreja ("Onde", mapa da igreja,
   etapa 2): endereço completo da casa que recebe. O ponto no mapa vem do CEP
   pelo trigger de endereço (0088); a consulta do CEP aqui enche o cache. */
export function GrupoEditModal({ grupo, people, onClose, onRefresh }: { grupo: FellowshipGroupView; people: PersonView[]; onClose: () => void; onRefresh: () => void }) {
  const { comTermos: ct } = useTermos();
  const fid = useId();
  const telaRef = useRef<FormScreenHandle>(null);
  const [form, setForm] = useState({
    nome: grupo.name,
    lider: grupo.leader_person_id ?? "",
    dia: grupo.weekday ?? "",
    hora: grupo.time ?? "",
    cep: grupo.postal_code ?? "",
    numero: grupo.street_number ?? "",
    complemento: grupo.complement ?? "",
    lotacao: grupo.capacity ? String(grupo.capacity) : "",
  });
  const [endereco, setEndereco] = useState<CepResult>({ street: grupo.street, neighborhood: grupo.neighborhood, city: grupo.city });
  const [consultando, setConsultando] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const lotacaoInvalida = form.lotacao.trim() !== "" && !(/^\d+$/.test(form.lotacao.trim()) && Number(form.lotacao) >= 1 && Number(form.lotacao) <= 500);
  const cepDigitos = form.cep.replace(/\D/g, "");
  const cepInvalido = cepDigitos !== "" && cepDigitos.length !== 8;

  const salvar = async () => {
    if (!form.nome.trim() || lotacaoInvalida || cepInvalido || consultando) return;
    setSaving(true);
    setError("");
    const cepMudou = cepDigitos !== (grupo.postal_code ?? "").replace(/\D/g, "");
    const { error: erro } = await createServiceBrowserClient().schema("service").from("fellowship_groups").update({
      name: form.nome.trim(),
      leader_person_id: form.lider || null,
      weekday: form.dia.trim() || null,
      time: form.hora.trim() || null,
      postal_code: cepDigitos || null,
      /* rua e bairro vêm do CEP; com CEP novo, o trigger refaz a partir da consulta */
      street: cepMudou ? null : grupo.street ?? null,
      neighborhood: cepMudou ? (endereco.neighborhood ?? null) : grupo.neighborhood ?? null,
      city: cepMudou ? null : grupo.city ?? null,
      street_number: form.numero.trim() || null,
      complement: form.complemento.trim() || null,
      capacity: form.lotacao.trim() ? Number(form.lotacao) : null,
    }).eq("id", grupo.id);
    if (erro) { setSaving(false); setError(friendlyWriteError(erro.message)); return; }
    if (telaRef.current) await telaRef.current.fechar(); else onClose();
    onRefresh();
  };

  const retrato = JSON.stringify(form);
  const [retratoInicial] = useState(retrato);
  const faltando = [
    ...(form.nome.trim() ? [] : ["nome"]),
    ...(cepInvalido ? ["CEP com 8 números"] : []),
    ...(lotacaoInvalida ? ["lotação entre 1 e 500"] : []),
  ];

  return (
    <FormScreen
      ref={telaRef}
      eyebrow={ct("{Grupo}")}
      title={form.nome.trim() || grupo.name}
      saveLabel="Salvar"
      saving={saving || consultando}
      missing={faltando}
      dirty={retrato !== retratoInicial}
      error={error}
      onSave={salvar}
      onClose={onClose}
    >
      <FormSection title="Encontro">
        <div className="fs-grid">
          <div className="field"><label className="field-label req" htmlFor={`${fid}-nome`}>Nome</label><input id={`${fid}-nome`} className="input" aria-required="true" value={form.nome} onChange={set("nome")} /></div>
          <div className="field">
            <label className="field-label" htmlFor={`${fid}-lider`}>Líder</label>
            <select id={`${fid}-lider`} className="input" value={form.lider} onChange={set("lider")}>
              <option value="">A definir</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="field half"><label className="field-label" htmlFor={`${fid}-dia`}>Dia</label><input id={`${fid}-dia`} className="input" placeholder="ex: Quinta-feira" value={form.dia} onChange={set("dia")} /></div>
          <div className="field half"><label className="field-label" htmlFor={`${fid}-hora`}>Horário</label><input id={`${fid}-hora`} className="input" placeholder="ex: 20h" value={form.hora} onChange={set("hora")} /></div>
          <div className="field half">
            <label className="field-label" htmlFor={`${fid}-lot`}>Lugares</label>
            <input id={`${fid}-lot`} className="input" inputMode="numeric" placeholder="sem limite" value={form.lotacao} aria-invalid={lotacaoInvalida} onChange={set("lotacao")} />
          </div>
        </div>
      </FormSection>

      <FormSection title="Onde acontece">
        <p className="fs-note">O endereço aparece para os membros da igreja, para quem quiser participar encontrar a casa.</p>
        <div className="fs-grid">
          <div className="field half">
            <label className="field-label" htmlFor={`${fid}-cep`}>CEP</label>
            <CepInput id={`${fid}-cep`} value={form.cep} onBusyChange={setConsultando} onChange={(v) => { setForm((p) => ({ ...p, cep: v })); setEndereco({}); }} onResult={(r) => { if (r) setEndereco(r); }} />
          </div>
          <div className="field half"><label className="field-label" htmlFor={`${fid}-num`}>Número</label><input id={`${fid}-num`} className="input" value={form.numero} onChange={set("numero")} /></div>
          <div className="field"><label className="field-label" htmlFor={`${fid}-comp`}>Complemento</label><input id={`${fid}-comp`} className="input" placeholder="ex: casa 2, apto 31" value={form.complemento} onChange={set("complemento")} /></div>
        </div>
        {(endereco.street || endereco.neighborhood) && <p className="fs-note">{[endereco.street, endereco.neighborhood, endereco.city].filter(Boolean).join(" · ")}</p>}
      </FormSection>
    </FormScreen>
  );
}
