"use client";

/* Escala extra: um evento avulso (vigília, batismo, conferência) criado aqui
   mesmo, que já abre na escala para preencher as vagas. Entra na agenda como
   qualquer evento. */

import { useId, useRef, useState } from "react";
import { FormScreen, FormSection, type FormScreenHandle } from "../../painel/form/FormScreen";
import { useRelogioDaIgreja } from "../../lib/relogio-context";
import { joinDot, parseISODate } from "../../lib/date";
import { plural } from "../../lib/plural";
import { avisar } from "../../lib/avisar";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { friendlyWriteError } from "../../painel/erros";
import { useTermos } from "../../lib/vocabulario-context";
import type { ChurchView, MinistryView } from "../../ServiceExactApp";

import { Opcao } from "../../ui/Opcao";
import { Campo, Entrada, Marcar } from "../../ui/Campo";
import { SeletorData, SeletorHora } from "../../ui/Data";
const MODELOS = ["Vigília", "Batismo", "Santa Ceia", "Conferência", "Culto especial"];
const DIA_CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function EscalaExtra({ ministries, church, onClose, onCriado }: {
  ministries: MinistryView[];
  church: ChurchView | undefined;
  onClose: () => void;
  onCriado: (eventId: string) => void;
}) {
  const { todayISO } = useRelogioDaIgreja();
  const { comTermos: ct } = useTermos();
  const fid = useId();
  const telaRef = useRef<FormScreenHandle>(null);
  const [nome, setNome] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [local, setLocal] = useState(church?.address || "");
  const comFuncoes = ministries.filter((m) => m.positions.length > 0);
  const [times, setTimes] = useState<Set<string>>(() => new Set(comFuncoes.map((m) => m.id)));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const falta = [!nome.trim() && "o nome", !data && "o dia", times.size === 0 && "um time"].filter(Boolean) as string[];
  const passado = !!data && data < todayISO();

  const criar = async () => {
    if (falta.length || salvando) return;
    if (!church?.id) { setErro("Nenhuma igreja encontrada para criar o evento."); return; }
    setSalvando(true);
    setErro("");
    const { data: row, error } = await createServiceBrowserClient().schema("service").from("events").insert({
      organization_id: church.organizationId, church_id: church.id, name: nome.trim(), kind: "Evento",
      event_date: data, weekday: DIA_CURTO[parseISODate(data)?.getDay() ?? 0], time: hora || null,
      location: local.trim() || church.nome || null,
      /* todos os times escolhidos = lista vazia (o evento vale para todos) */
      ministries: times.size === comFuncoes.length ? [] : [...times],
    }).select("id").single();
    if (error || !row) { setSalvando(false); setErro(friendlyWriteError(error?.message ?? "")); return; }
    avisar(`${nome.trim()} criado. Agora preencha a escala.`);
    if (telaRef.current) await telaRef.current.fechar();
    onCriado(row.id as string);
  };

  return (
    <FormScreen
      ref={telaRef}
      eyebrow="Escalas"
      title="Escala extra"
      subtitle={ct("Para um evento fora dos {cultos} de sempre. Ele entra na agenda e a escala abre em seguida.")}
      saveLabel="Criar e escalar"
      saving={salvando}
      missing={falta}
      dirty={!!(nome || data || hora)}
      error={erro}
      onSave={criar}
      onClose={onClose}
    >
      <FormSection title="Evento">
        <div className="fs-grid">
          <div className="field">
            <label className="field-label req" htmlFor={`${fid}-nome`}>Nome</label>
            <input id={`${fid}-nome`} className="input" value={nome} maxLength={80} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Vigília de oração" />
            <div className="fs-chips" role="group" aria-label="Sugestões de nome" style={{ marginTop: 8 }}>
              {MODELOS.map((m) => <Opcao key={m} marcada={nome === m} estilo="seg-chip" aria-pressed={nome === m} onClick={() => setNome(m)}>{m}</Opcao>)}
            </div>
          </div>
          <Campo rotulo="Dia" obrigatorio id={`${fid}-dia`} className="half" ajuda={passado ? "Essa data já passou." : undefined}>
            <SeletorData valor={data} aoMudar={setData} />
          </Campo>
          <Campo rotulo="Horário" id={`${fid}-hora`} className="half">
            <SeletorHora valor={hora} aoMudar={setHora} />
          </Campo>
          <Campo rotulo="Local" id={`${fid}-local`}>
            <Entrada value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Ex.: Templo, salão ou endereço" />
          </Campo>
        </div>
      </FormSection>
      <FormSection title="Times que servem">
        {comFuncoes.length === 0 ? (
          <p className="fs-note">Nenhum time com funções ainda. Cadastre as funções em Times.</p>
        ) : (
          <div className="per-lista">
            {comFuncoes.map((m) => (
              <Marcar className="fs-check" key={m.id} checked={times.has(m.id)} onChange={() => setTimes((atual) => { const n = new Set(atual); if (n.has(m.id)) n.delete(m.id); else n.add(m.id); return n; })}>
                <span className="per-check-txt">
                  <span className="per-check-t">{m.name}</span>
                  <span className="per-check-s">{joinDot(plural(m.positions.reduce((s, p) => s + Math.max(1, p.need_count), 0), "vaga"), m.positions.map((p) => p.name).join(", "))}</span>
                </span>
              </Marcar>
            ))}
          </div>
        )}
      </FormSection>
    </FormScreen>
  );
}
