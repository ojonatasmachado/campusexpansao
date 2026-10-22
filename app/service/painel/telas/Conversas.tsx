"use client";

import { useRelogioDaIgreja } from "../../lib/relogio-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { notifyPush } from "../../lib/notify-push";
import { Icon } from "../../lib/icons";
import { Av, EmptyState, PageHead } from "../ui";
import type { ChatMemberView, ChatView, ChurchView, MemberView, MessageView, MinistryView } from "../tipos";

import { Botao } from "../../ui/Botao";
import { Acao } from "../../ui/Acao";
import { Opcao } from "../../ui/Opcao";
import { Segmentado } from "../../ui/Segmentado";
export function NovaConversaModal({
  members,
  church,
  currentPersonId,
  initialSelectedMemberIds,
  onClose,
  onCreated,
}: {
  members: MemberView[];
  church: ChurchView | undefined;
  currentPersonId: string | null;
  initialSelectedMemberIds?: string[];
  onClose: () => void;
  onCreated: (chatId: string) => void;
}) {
  const router = useRouter();
  const [tipo, setTipo] = useState<"dm" | "grupo">("dm");
  const [nome, setNome] = useState("");
  const [sel, setSel] = useState<string[]>(initialSelectedMemberIds ?? []);
  const [primeiraMsg, setPrimeiraMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const eu = members.find((m) => m.volunteerId === currentPersonId)?.id ?? null;
  const candidatos = members.filter((m) => m.id !== eu);
  const isGrupo = tipo === "grupo" || sel.length > 1;

  const tog = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const criar = async () => {
    if (sel.length === 0) { setError("Escolha pelo menos uma pessoa."); return; }
    if (!church?.organizationId || !church.id) { setError("Nenhuma igreja encontrada para vincular esta conversa."); return; }
    setSaving(true);
    setError("");
    const supabase = createServiceBrowserClient();
    const { data: chatRow, error: chatError } = await supabase.schema("service").from("chats").insert({
      organization_id: church.organizationId,
      church_id: church.id,
      kind: isGrupo ? "grupo" : "dm",
      name: isGrupo ? (nome.trim() || "Novo grupo") : null,
    }).select("id").single();
    if (chatError || !chatRow) {
      setSaving(false);
      setError(chatError?.message ?? "Não foi possível criar a conversa.");
      return;
    }
    const participantIds = [...new Set([...(eu ? [eu] : []), ...sel])];
    await supabase.schema("service").from("chat_members").insert(
      participantIds.map((memberId) => ({ organization_id: church.organizationId, chat_id: chatRow.id, member_id: memberId })),
    );
    if (primeiraMsg.trim()) {
      await supabase.schema("service").from("messages").insert({
        organization_id: church.organizationId,
        chat_id: chatRow.id,
        sender_id: eu,
        body: primeiraMsg.trim(),
      });
      const senderName = members.find((m) => m.id === eu)?.name ?? "Alguém";
      notifyPush(church.organizationId, sel.filter((id) => id !== eu), senderName, primeiraMsg.trim(), "mensagens");
    }
    router.refresh();
    onCreated(chatRow.id);
    onClose();
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Nova conversa</div>
          <div className="modal-title">Chamar para conversar</div>
          <div className="modal-sub">Fale com alguém em particular ou crie um grupo com parte da equipe.</div>
        </div>
        <div className="modal-body" style={{ display: "block" }}>
          <div className="field">
            <label className="field-label">Tipo</label>
            <Segmentado>
              <Opcao marcada={tipo === "dm"} onClick={() => setTipo("dm")}>Individual</Opcao>
              <Opcao marcada={tipo === "grupo"} onClick={() => setTipo("grupo")}>Em grupo</Opcao>
            </Segmentado>
          </div>
          {isGrupo && (
            <div className="field">
              <label className="field-label">Nome do grupo</label>
              <input className="input" value={nome} placeholder="ex: Apoio do domingo" onChange={(e) => setNome(e.target.value)} />
            </div>
          )}
          <div className="field">
            <label className="field-label">Quem participa</label>
            <div className="cand-pick">
              {candidatos.map((m) => {
                const on = sel.includes(m.id);
                return (
                  <Acao key={m.id} className={`cand-chip ${on ? "on" : ""}`} onClick={() => tog(m.id)}>
                    <Av name={m.name} size="xs" /> {m.name.split(" ")[0]} {on && <Icon name="ok" size={13} />}
                  </Acao>
                );
              })}
              {candidatos.length === 0 && <span style={{ fontSize: "var(--fs-pn-13)", color: "var(--muted)" }}>Nenhum membro disponível.</span>}
            </div>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="field-label">Primeira mensagem (opcional)</label>
            <textarea className="textarea" value={primeiraMsg} placeholder="..." onChange={(e) => setPrimeiraMsg(e.target.value)} />
          </div>
          {error && <div style={{ marginTop: 10, fontSize: "var(--fs-pn-13)", color: "var(--danger)" }}>{error}</div>}
        </div>
        <div className="modal-foot">
          <Botao onClick={onClose}>Cancelar</Botao>
          <Botao variante="principal" desativado={saving} onClick={criar}>{saving ? "Criando…" : "Iniciar conversa"}</Botao>
        </div>
      </div>
    </div>
  );
}

export function Conversas({
  chats,
  chatMembers,
  messages,
  ministries,
  members,
  church,
  currentPersonId,
  scopeMinistryIds,
  pendingChatMemberId,
  onConsumePendingChatMember,
}: {
  chats: ChatView[];
  chatMembers: ChatMemberView[];
  messages: MessageView[];
  ministries: MinistryView[];
  members: MemberView[];
  church: ChurchView | undefined;
  currentPersonId: string | null;
  scopeMinistryIds: string[] | null;
  pendingChatMemberId?: string | null;
  onConsumePendingChatMember?: () => void;
}) {
  const router = useRouter();
  const { fuso } = useRelogioDaIgreja();
  const [selected, setSelected] = useState<string | null>(null);
  const [nova, setNova] = useState(false);
  const [texto, setTexto] = useState("");
  const [sending, setSending] = useState(false);
  const ministryById = new Map(ministries.map((ministry) => [ministry.id, ministry]));
  const memberById = new Map(members.map((member) => [member.id, member]));

  /* privacidade: só quem de fato participa vê a conversa, sem exceção de papel
     (inclusive Direção) : equivalente a S.chatsDaView() em
     evolucoes/service_app/data-chat.js:65-70. */
  const currentMember = members.find((member) => member.volunteerId === currentPersonId) ?? null;
  const visibleChats = currentMember
    ? chats.filter((c) => chatMembers.some((cm) => cm.chat_id === c.id && cm.member_id === currentMember.id))
    : [];

  /* "Enviar mensagem" num drawer de pessoa/membro cai aqui já mirando alguém:
     reaproveita a DM existente com essa pessoa se houver, senão abre "Nova conversa"
     pré-selecionada, em vez de sempre criar uma conversa duplicada. */
  useEffect(() => {
    if (!pendingChatMemberId || !currentMember) return;
    const existingDm = chats.find((c) => (
      c.kind === "dm"
      && chatMembers.some((cm) => cm.chat_id === c.id && cm.member_id === pendingChatMemberId)
      && chatMembers.some((cm) => cm.chat_id === c.id && cm.member_id === currentMember.id)
    ));
    if (existingDm) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pedido de conversa vindo de outra tela: abre a existente uma vez e consome o pedido
      setSelected(existingDm.id);
      onConsumePendingChatMember?.();
    } else {
      setNova(true);
    }
  }, [pendingChatMemberId, currentMember, chats, chatMembers, onConsumePendingChatMember]);

  const chat = visibleChats.find((item) => item.id === selected) ?? visibleChats[0] ?? null;
  const selectedMessages = chat ? messages.filter((message) => message.chat_id === chat.id) : [];
  const chatCount = (chatId: string) => chatMembers.filter((member) => member.chat_id === chatId).length;
  const chatName = (item: ChatView) => item.name || (item.ministry_id ? ministryById.get(item.ministry_id)?.name : null) || "Conversa";
  const perspectiveText = scopeMinistryIds
    ? `Canal do ${ministries.find((m) => m.id === scopeMinistryIds[0])?.name ?? "seu time"}, grupos e mensagens diretas da sua equipe. Conversas são privadas: só os envolvidos veem.`
    : "Só as conversas das quais você participa aparecem aqui. Conversas são privadas: só os envolvidos veem.";

  const enviar = async () => {
    if (!texto.trim() || !chat || sending || !currentMember) return;
    setSending(true);
    await createServiceBrowserClient().schema("service").from("messages").insert({
      organization_id: church?.organizationId,
      chat_id: chat.id,
      sender_id: currentMember.id,
      body: texto.trim(),
    });
    if (church?.organizationId) {
      const recipients = chatMembers.filter((cm) => cm.chat_id === chat.id && cm.member_id !== currentMember.id).map((cm) => cm.member_id);
      notifyPush(church.organizationId, recipients, currentMember.name, texto.trim(), "mensagens");
    }
    setTexto("");
    router.refresh();
    setSending(false);
  };

  return (
    <div className="content wide">
      <PageHead title="Conversas" eyebrow="Operação" help={`Um chat simples com seu time e sua liderança, dentro do mesmo app. ${perspectiveText}`} action={<Botao variante="principal" onClick={() => setNova(true)}>+ Nova conversa</Botao>} />
      <div className="chat-layout">
        <div className="chat-list">{visibleChats.map((item) => <Acao className={`chat-row ${chat?.id === item.id ? "on" : ""}`} key={item.id} onClick={() => setSelected(item.id)}><span className="chat-row-ic"><Icon name={item.kind === "time" ? "times" : "membros"} size={16} /></span><span className="chat-row-main"><span className="chat-row-top"><b>{chatName(item)}</b><small>agora</small></span><span className="chat-row-prev">{messages.find((message) => message.chat_id === item.id)?.body || "Canal de alinhamento"}</span></span><span className="chat-row-count">{chatCount(item.id)}</span></Acao>)}{visibleChats.length === 0 && <div className="empty" style={{ margin: 8 }}>Nenhuma conversa ainda.</div>}</div>
        {chat ? <div className="chat-main"><div className="chat-head"><span className="chat-head-ic"><Icon name={chat?.kind === "time" ? "times" : "membros"} size={16} /></span><div><div className="chat-head-name">{chat ? chatName(chat) : "Nenhuma conversa"}</div><div className="chat-head-sub">{chat?.kind === "time" ? "Canal do time" : "Grupo"} · {chat ? chatCount(chat.id) : 0} pessoas</div></div></div><div className="chat-thread"><div className="chat-msgs">{selectedMessages.map((message) => { const sender = message.sender_id ? memberById.get(message.sender_id) : null; const isMine = currentMember && message.sender_id === currentMember.id; return <div className={`chat-msg${isMine ? " me" : ""}`} key={message.id}>{sender ? <Av name={sender.name} size="xs" /> : null}<div className="chat-bubble-wrap"><div className="chat-bubble">{message.body}</div><div className="chat-when">{new Date(message.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: fuso })}</div></div></div>; })}{chat && selectedMessages.length === 0 ? <div className="empty">Nenhuma mensagem nesta conversa.</div> : null}</div><div className="chat-compose"><input className="input" placeholder="Escreva uma mensagem..." value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => e.key === "Enter" && enviar()} disabled={!chat} /><Botao variante="principal" compacto desativado={!chat || sending || !texto.trim()} onClick={enviar}>Enviar</Botao></div></div></div> : <div className="chat-main chat-empty"><EmptyState title="Escolha uma conversa" text="Toque numa conversa da lista para ler e responder, ou comece uma nova." /></div>}
      </div>
      {nova && (
        <NovaConversaModal
          members={members}
          church={church}
          currentPersonId={currentPersonId}
          initialSelectedMemberIds={pendingChatMemberId ? [pendingChatMemberId] : undefined}
          onClose={() => { setNova(false); onConsumePendingChatMember?.(); }}
          onCreated={(id) => { setSelected(id); onConsumePendingChatMember?.(); }}
        />
      )}
    </div>
  );
}
