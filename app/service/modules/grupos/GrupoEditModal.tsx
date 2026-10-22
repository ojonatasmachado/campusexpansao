"use client";

import { useId, useRef, useState } from "react";
import CepInput, { type CepResult } from "../../CepInput";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { useTermos } from "../../lib/vocabulario-context";
import { FormScreen, FormSection, type FormScreenHandle } from "../../painel/form/FormScreen";
import { friendlyWriteError } from "../../painel/erros";
import type { FellowshipGroupView, PersonView } from "../../painel/tipos";
import { Campo, Entrada } from "../../ui/Campo";
import { Selecao } from "../../ui/Selecao";

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
          <Campo rotulo="Nome" obrigatorio id={`${fid}-nome`}><Entrada aria-required="true" value={form.nome} onChange={set("nome")} /></Campo>
          <Campo rotulo="Líder" id={`${fid}-lider`}>
            <Selecao valor={form.lider} aoMudar={(v) => setForm((p) => ({ ...p, lider: v }))} vazio="A definir"
              opcoes={people.map((p) => ({ v: p.id, l: p.name }))} />
          </Campo>
          <Campo rotulo="Dia" id={`${fid}-dia`} className="half"><Entrada placeholder="ex: Quinta-feira" value={form.dia} onChange={set("dia")} /></Campo>
          <Campo rotulo="Horário" id={`${fid}-hora`} className="half"><Entrada placeholder="ex: 20h" value={form.hora} onChange={set("hora")} /></Campo>
          <Campo rotulo="Lugares" id={`${fid}-lot`} className="half">
            <Entrada inputMode="numeric" placeholder="sem limite" value={form.lotacao} aria-invalid={lotacaoInvalida} onChange={set("lotacao")} />
          </Campo>
        </div>
      </FormSection>

      <FormSection title="Onde acontece">
        <p className="fs-note">O endereço aparece para os membros da igreja, para quem quiser participar encontrar a casa.</p>
        <div className="fs-grid">
          <Campo rotulo="CEP" id={`${fid}-cep`} className="half">
            <CepInput id={`${fid}-cep`} value={form.cep} onBusyChange={setConsultando} onChange={(v) => { setForm((p) => ({ ...p, cep: v })); setEndereco({}); }} onResult={(r) => { if (r) setEndereco(r); }} />
          </Campo>
          <Campo rotulo="Número" id={`${fid}-num`} className="half"><Entrada value={form.numero} onChange={set("numero")} /></Campo>
          <Campo rotulo="Complemento" id={`${fid}-comp`}><Entrada placeholder="ex: casa 2, apto 31" value={form.complemento} onChange={set("complemento")} /></Campo>
        </div>
        {(endereco.street || endereco.neighborhood) && <p className="fs-note">{[endereco.street, endereco.neighborhood, endereco.city].filter(Boolean).join(" · ")}</p>}
      </FormSection>
    </FormScreen>
  );
}
