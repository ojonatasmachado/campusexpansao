"use client";

/* Publicar e avisar: o rascunho (escala montada pelo período) passa a valer.
   Quem foi escalado vê no app e recebe uma notificação da categoria Escala. */

import { useState } from "react";
import { plural } from "../../lib/plural";
import { avisar } from "../../lib/avisar";
import { formatDateBR } from "../../lib/date";
import { notifyPush } from "../../lib/notify-push";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { friendlyWriteError } from "../../painel/erros";
import { useTermos } from "../../lib/vocabulario-context";
import type { EventView, RosterAssignmentView } from "../../ServiceExactApp";

export function PublicarEscala({ rascunhos, events, organizationId, onClose, onPublicado }: {
  rascunhos: RosterAssignmentView[];
  events: EventView[];
  organizationId: string;
  onClose: () => void;
  onPublicado: () => void;
}) {
  const { comTermos: ct } = useTermos();
  const [msg, setMsg] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const eventosIds = new Set(rascunhos.map((r) => r.event_id));
  const datas = events.filter((e) => eventosIds.has(e.id)).map((e) => e.eventDate).filter(Boolean).sort();
  const pessoas = [...new Set(rascunhos.map((r) => r.person_id))];

  const publicar = async () => {
    if (!rascunhos.length) { onClose(); return; }
    setSalvando(true);
    setErro("");
    const sb = createServiceBrowserClient().schema("service");
    const ids = rascunhos.map((r) => r.id);
    for (let i = 0; i < ids.length; i += 300) {
      const { error } = await sb.from("roster_assignments").update({ rascunho: false }).in("id", ids.slice(i, i + 300));
      if (error) { setSalvando(false); setErro(friendlyWriteError(error.message)); return; }
    }
    /* o aviso vai para o membro ligado a cada pessoa escalada */
    const { data: membros } = await sb.from("members").select("id").in("volunteer_id", pessoas);
    const alvo = (membros ?? []).map((m) => m.id as string);
    const corpo = msg.trim() || ct(datas.length > 1 ? `Sua escala de ${formatDateBR(datas[0])} a ${formatDateBR(datas[datas.length - 1])} saiu. Confirme no app.` : "Sua escala saiu. Confirme no app.");
    notifyPush(organizationId, alvo, "Escala publicada", corpo, "escala");
    avisar(`Escala publicada para ${plural(pessoas.length, "pessoa")}.`);
    onPublicado();
  };

  return (
    <div className="modal-bg" onClick={salvando ? undefined : onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="pub-esc-t" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Publicar</div>
          <div className="modal-title" id="pub-esc-t">Publicar e avisar</div>
          <div className="modal-sub">
            {rascunhos.length
              ? ct(`${plural(rascunhos.length, "escalação", "escalações")} em rascunho, ${plural(eventosIds.size, "{culto}", "{cultos}")}${datas.length ? ` de ${formatDateBR(datas[0])} a ${formatDateBR(datas[datas.length - 1])}` : ""}. ${plural(pessoas.length, "pessoa recebe", "pessoas recebem")} a escala no app e uma notificação.`)
              : "Nada em rascunho. A escala que você monta culto a culto já aparece para a equipe."}
          </div>
        </div>
        {rascunhos.length > 0 && (
          <div className="modal-body" style={{ display: "block" }}>
            <div className="field">
              <label className="field-label" htmlFor="pub-esc-msg">Recado na notificação (opcional)</label>
              <textarea id="pub-esc-msg" className="textarea" value={msg} maxLength={160} onChange={(e) => setMsg(e.target.value)} placeholder="Ex.: Confira suas datas até domingo." />
            </div>
            {erro && <div className="fs-error" role="alert">{erro}</div>}
          </div>
        )}
        <div className="modal-foot">
          <button className="btn btn-sec" type="button" onClick={onClose} disabled={salvando}>{rascunhos.length ? "Cancelar" : "Fechar"}</button>
          {rascunhos.length > 0 && <button className="btn btn-pri" type="button" onClick={publicar} disabled={salvando}>{salvando ? "Publicando…" : "Publicar e avisar"}</button>}
        </div>
      </div>
    </div>
  );
}
