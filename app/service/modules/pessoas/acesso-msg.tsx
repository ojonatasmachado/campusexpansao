"use client";

/* Mensagem de acesso ao app (convite pelo WhatsApp). Saiu de ServiceExactApp.tsx
   na 4.1: o Mural abre a janela de edição, Pessoas usa o texto no convite. */

import { useState } from "react";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import type { ChurchView } from "../../ServiceExactApp";

import { Botao } from "../../ui/Botao";
import { Campo, TextoLongo } from "../../ui/Campo";
/* mensagem que abre pronta no WhatsApp do líder quando ele manda o acesso ao
   app pra um membro novo, guardada em service.churches.settings.acessoMsgCfg
   (mesmo jsonb de sempre). Placeholders trocados na hora do envio, ver
   openMemberInviteWhatsapp: {nome} {igreja} {link} ({email}/{senha} de templates antigos). */
export type AcessoMsgCfg = { mensagem: string };
export const ACESSO_MSG_DEFAULT: AcessoMsgCfg = {
  mensagem: "Parabéns, {nome}! Que alegria ter você na {igreja}.\n\nSeu acesso ao app da igreja já está pronto. É só abrir este link, colocar seu e-mail, criar uma senha e o seu CEP:\n{link}\n\nO link é só seu e vale por 7 dias. Qualquer dúvida, é só chamar por aqui.",
};

export function AcessoMsgModal({ church, cfg, onClose, onRefresh }: { church: ChurchView; cfg: AcessoMsgCfg; onClose: () => void; onRefresh: () => void }) {
  const [mensagem, setMensagem] = useState(cfg.mensagem);
  const [saving, setSaving] = useState(false);

  const salvar = async () => {
    setSaving(true);
    const next: AcessoMsgCfg = { mensagem };
    await createServiceBrowserClient().schema("service").from("churches").update({ settings: { ...church.settings, acessoMsgCfg: next } }).eq("id", church.id);
    onRefresh();
    onClose();
  };

  const restaurar = () => setMensagem(ACESSO_MSG_DEFAULT.mensagem);

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Membros</div>
          <div className="modal-title">Mensagem de boas-vindas pelo WhatsApp</div>
          <div className="modal-sub">É o texto que abre pronto no WhatsApp quando você manda o acesso ao app pra um membro novo. Edite à vontade: o padrão é de felicitação, com o passo a passo de como entrar.</div>
        </div>
        <div className="modal-body" style={{ display: "block" }}>
          <Campo rotulo="Mensagem" ajuda={<>Use {"{nome}"}, {"{igreja}"} e {"{link}"}: preenchemos automaticamente na hora de enviar. O link é um convite só da pessoa, onde ela informa o e-mail, cria a senha e coloca o CEP. Nenhuma senha vai na mensagem.</>}>
            <TextoLongo rows={8} value={mensagem} onChange={(e) => setMensagem(e.target.value)} />
          </Campo>
          <Botao variante="discreto" compacto onClick={restaurar}>Restaurar mensagem padrão</Botao>
        </div>
        <div className="modal-foot">
          <Botao onClick={onClose}>Cancelar</Botao>
          <Botao variante="principal" desativado={saving} onClick={salvar}>Salvar</Botao>
        </div>
      </div>
    </div>
  );
}
