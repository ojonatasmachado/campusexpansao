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

import { Botao } from "../../ui/Botao";
import { Campo, TextoLongo } from "../../ui/Campo";
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

  /* ids já publicados nesta janela: se um lote falhar, tentar de novo segue do ponto em que parou */
  const [feitos, setFeitos] = useState<Set<string>>(new Set());
  /* conta só o que ainda está na lista (a lista pode mudar com a janela aberta) */
  const feitosNaLista = rascunhos.filter((r) => feitos.has(r.id)).length;
  const parcial = feitosNaLista > 0 && feitosNaLista < rascunhos.length;

  const avisarEquipe = async (ids: Set<string>) => {
    const sb = createServiceBrowserClient().schema("service");
    const quem = [...new Set(rascunhos.filter((r) => ids.has(r.id)).map((r) => r.person_id))];
    if (!quem.length) return 0;
    /* o aviso vai para o membro ligado a cada pessoa escalada */
    const { data: membros } = await sb.from("members").select("id").in("volunteer_id", quem);
    const alvo = (membros ?? []).map((m) => m.id as string);
    const corpo = msg.trim() || ct(datas.length > 1 ? `Sua escala de ${formatDateBR(datas[0])} a ${formatDateBR(datas[datas.length - 1])} saiu. Confirme no app.` : "Sua escala saiu. Confirme no app.");
    notifyPush(organizationId, alvo, "Escala publicada", corpo, "escala");
    return quem.length;
  };

  const publicar = async () => {
    if (!rascunhos.length) { onClose(); return; }
    setSalvando(true);
    setErro("");
    const sb = createServiceBrowserClient().schema("service");
    const feitosAgora = new Set(feitos);
    const faltam = rascunhos.map((r) => r.id).filter((id) => !feitosAgora.has(id));
    for (let i = 0; i < faltam.length; i += 300) {
      const lote = faltam.slice(i, i + 300);
      const { error } = await sb.from("roster_assignments").update({ rascunho: false }).in("id", lote);
      if (error) {
        setFeitos(feitosAgora);
        setSalvando(false);
        setErro(feitosAgora.size
          ? `${friendlyWriteError(error.message)} ${plural(feitosAgora.size, "escalação já saiu", "escalações já saíram")} e ${plural(rascunhos.length - feitosAgora.size, "continua", "continuam")} em rascunho. Tente de novo para publicar o resto.`
          : friendlyWriteError(error.message));
        return;
      }
      lote.forEach((id) => feitosAgora.add(id));
    }
    setFeitos(feitosAgora);
    await avisarEquipe(feitosAgora);
    avisar(`Escala publicada para ${plural(pessoas.length, "pessoa")}.`);
    onPublicado();
  };

  /* fechar no meio: o que já saiu vale, então quem está nele é avisado e a tela atrás se atualiza */
  const fechar = async () => {
    if (!parcial) { onClose(); return; }
    setSalvando(true);
    const n = await avisarEquipe(feitos);
    avisar(`Parte da escala publicada (${plural(feitos.size, "escalação", "escalações")}, ${plural(n, "pessoa avisada", "pessoas avisadas")}). O resto continua em rascunho.`, "warn");
    onPublicado();
  };

  return (
    <div className="modal-bg" onClick={salvando ? undefined : () => { void fechar(); }}>
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
            <Campo rotulo="Recado na notificação (opcional)" id="pub-esc-msg">
              <TextoLongo value={msg} maxLength={160} onChange={(e) => setMsg(e.target.value)} placeholder="Ex.: Confira suas datas até domingo." />
            </Campo>
            {erro && <div className="fs-error" role="alert">{erro}</div>}
          </div>
        )}
        <div className="modal-foot">
          <Botao onClick={() => { void fechar(); }} desativado={salvando}>{parcial ? "Fechar" : rascunhos.length ? "Cancelar" : "Fechar"}</Botao>
          {rascunhos.length > 0 && <Botao variante="principal" onClick={publicar} desativado={salvando}>{salvando ? "Publicando…" : parcial ? "Tentar de novo" : "Publicar e avisar"}</Botao>}
        </div>
      </div>
    </div>
  );
}
