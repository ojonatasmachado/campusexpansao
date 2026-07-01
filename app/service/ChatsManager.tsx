"use client";

import { useEffect, useMemo, useState } from "react";
import { createServiceBrowserClient } from "./lib/supabase-browser";

type MinistryOption = { id: string; name: string };
type MemberOption = { id: string; name: string };

type Chat = {
  id: string;
  kind: "time" | "grupo" | "dm";
  ministry_id: string | null;
  name: string | null;
};

type ChatMember = {
  chat_id: string;
  member_id: string;
};

type Message = {
  id: string;
  chat_id: string;
  sender_id: string | null;
  body: string;
  created_at: string;
};

type ChatsManagerProps = {
  ministries: MinistryOption[];
  members: MemberOption[];
  churchId?: string;
  organizationId?: string;
};

function friendlyError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("permission") || lower.includes("row-level security") || lower.includes("rls")) return "O banco bloqueou a gravação por segurança.";
  if (lower.includes("violates foreign key")) return "Chat, membro, igreja, organização ou ministério não encontrado.";
  if (lower.includes("duplicate key")) return "Esse membro já está no chat.";
  return message || "Não conseguimos salvar as conversas agora.";
}

export default function ChatsManager({ ministries, members, churchId, organizationId }: ChatsManagerProps) {
  const supabase = createServiceBrowserClient();
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatMembers, setChatMembers] = useState<ChatMember[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatId, setChatId] = useState("");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Chat["kind"]>("grupo");
  const [ministryId, setMinistryId] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [senderId, setSenderId] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const ministryNames = useMemo(() => new Map(ministries.map((item) => [item.id, item.name])), [ministries]);
  const memberNames = useMemo(() => new Map(members.map((item) => [item.id, item.name])), [members]);

  async function loadData() {
    setLoading(true);
    setError("");
    const { data: chatData, error: chatError } = await supabase
      .schema("service")
      .from("chats")
      .select("id,kind,ministry_id,name")
      .order("created_at", { ascending: false });
    if (chatError) {
      setLoading(false);
      setError(friendlyError(chatError.message));
      return;
    }
    const { data: memberData, error: memberError } = await supabase.schema("service").from("chat_members").select("chat_id,member_id");
    if (memberError) {
      setLoading(false);
      setError(friendlyError(memberError.message));
      return;
    }
    const { data: messageData, error: messageError } = await supabase
      .schema("service")
      .from("messages")
      .select("id,chat_id,sender_id,body,created_at")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (messageError) {
      setError(friendlyError(messageError.message));
      return;
    }
    setChats((chatData ?? []) as Chat[]);
    setChatMembers((memberData ?? []) as ChatMember[]);
    setMessages((messageData ?? []) as Message[]);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleMember(memberId: string) {
    setMemberIds((current) => current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId]);
  }

  async function saveChat(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!organizationId || !churchId) {
      setError("Nenhuma igreja encontrada para vincular o chat.");
      return;
    }
    if (!name.trim()) {
      setError("Digite o nome do chat.");
      return;
    }
    setLoading(true);
    const chatPayload = {
      kind,
      ministry_id: ministryId || null,
      name: name.trim(),
      updated_at: new Date().toISOString(),
    };
    const result = chatId
      ? await supabase.schema("service").from("chats").update(chatPayload).eq("id", chatId).select("id").single()
      : await supabase.schema("service").from("chats").insert({ organization_id: organizationId, church_id: churchId, ...chatPayload }).select("id").single();
    if (result.error || !result.data) {
      setLoading(false);
      setError(friendlyError(result.error?.message || ""));
      return;
    }
    const savedChatId = result.data.id;
    const { error: deleteMembersError } = await supabase.schema("service").from("chat_members").delete().eq("chat_id", savedChatId);
    if (deleteMembersError) {
      setLoading(false);
      setError(friendlyError(deleteMembersError.message));
      return;
    }
    if (memberIds.length) {
      const { error: insertMembersError } = await supabase.schema("service").from("chat_members").insert(
        memberIds.map((memberId) => ({ organization_id: organizationId, chat_id: savedChatId, member_id: memberId })),
      );
      if (insertMembersError) {
        setLoading(false);
        setError(friendlyError(insertMembersError.message));
        return;
      }
    }
    setLoading(false);
    setChatId(savedChatId);
    await loadData();
  }

  function editChat(chat: Chat) {
    setChatId(chat.id);
    setName(chat.name ?? "");
    setKind(chat.kind);
    setMinistryId(chat.ministry_id ?? "");
    setMemberIds(chatMembers.filter((member) => member.chat_id === chat.id).map((member) => member.member_id));
  }

  async function deleteChat(chat: Chat) {
    setError("");
    if (!window.confirm(`Excluir chat ${chat.name ?? "sem nome"}?`)) return;
    setLoading(true);
    const { error: deleteError } = await supabase.schema("service").from("chats").delete().eq("id", chat.id);
    setLoading(false);
    if (deleteError) {
      setError(friendlyError(deleteError.message));
      return;
    }
    if (chatId === chat.id) setChatId("");
    await loadData();
  }

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!organizationId) {
      setError("Nenhuma organização encontrada para vincular a mensagem.");
      return;
    }
    if (!chatId) {
      setError("Escolha um chat.");
      return;
    }
    if (!body.trim()) {
      setError("Digite a mensagem.");
      return;
    }
    setLoading(true);
    const { error: messageError } = await supabase.schema("service").from("messages").insert({
      organization_id: organizationId,
      chat_id: chatId,
      sender_id: senderId || null,
      body: body.trim(),
    });
    setLoading(false);
    if (messageError) {
      setError(friendlyError(messageError.message));
      return;
    }
    setBody("");
    await loadData();
  }

  return (
    <div style={{ display: "grid", gap: 18, marginTop: 24 }}>
      <form className="card" onSubmit={saveChat}>
        <div className="card-body" style={{ display: "grid", gap: 14 }}>
          <p className="eyebrow" style={{ color: "var(--wheat)" }}>◆ CHAT</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <label className="field"><span className="field-label req">Nome</span><input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Equipe do culto" /></label>
            <label className="field"><span className="field-label">Tipo</span><select className="select" value={kind} onChange={(event) => setKind(event.target.value as Chat["kind"])}><option value="grupo">grupo</option><option value="time">time</option><option value="dm">dm</option></select></label>
            <label className="field"><span className="field-label">Ministério</span><select className="select" value={ministryId} onChange={(event) => setMinistryId(event.target.value)}><option value="">Sem ministério</option>{ministries.map((ministry) => <option value={ministry.id} key={ministry.id}>{ministry.name}</option>)}</select></label>
          </div>
          <div className="card" style={{ padding: 14 }}>
            <p className="field-label">Membros do chat</p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
              {members.map((member) => <label className="service-check-row" key={member.id}><input type="checkbox" checked={memberIds.includes(member.id)} onChange={() => toggleMember(member.id)} />{member.name}</label>)}
            </div>
          </div>
          {error && <p className="field-error">{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? "Salvando..." : chatId ? "Salvar chat" : "Criar chat"}</button>
        </div>
      </form>

      <form className="card" onSubmit={sendMessage}>
        <div className="card-body" style={{ display: "grid", gap: 14 }}>
          <p className="eyebrow" style={{ color: "var(--wheat)" }}>◆ MENSAGEM</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <label className="field"><span className="field-label req">Chat</span><select className="select" value={chatId} onChange={(event) => setChatId(event.target.value)}><option value="">Escolha</option>{chats.map((chat) => <option value={chat.id} key={chat.id}>{chat.name ?? "sem nome"}</option>)}</select></label>
            <label className="field"><span className="field-label">Remetente</span><select className="select" value={senderId} onChange={(event) => setSenderId(event.target.value)}><option value="">Sem remetente</option>{members.map((member) => <option value={member.id} key={member.id}>{member.name}</option>)}</select></label>
          </div>
          <label className="field"><span className="field-label req">Texto</span><textarea className="textarea" rows={3} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Alinhamento da semana." /></label>
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? "Enviando..." : "Enviar mensagem"}</button>
        </div>
      </form>

      <div style={{ display: "grid", gap: 12 }}>
        {chats.map((chat) => {
          const membersInChat = chatMembers.filter((item) => item.chat_id === chat.id).map((item) => memberNames.get(item.member_id) ?? "membro");
          const latest = messages.find((message) => message.chat_id === chat.id);
          return (
            <div className="card" key={chat.id}>
              <div className="card-body" style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <p className="eyebrow" style={{ color: "var(--wheat)" }}>◆ {chat.kind}</p>
                  <strong className="t-body-lg" style={{ color: "var(--cream)" }}>{chat.name ?? "sem nome"}</strong>
                  <p className="t-small" style={{ color: "var(--muted)", marginTop: 6 }}>{ministryNames.get(chat.ministry_id ?? "") ?? "sem ministério"} · {membersInChat.length ? membersInChat.join(" · ") : "sem membros"}</p>
                  <p className="t-small" style={{ color: "var(--muted)", marginTop: 6 }}>{latest ? `${memberNames.get(latest.sender_id ?? "") ?? "sem remetente"}: ${latest.body}` : "sem mensagens"}</p>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="btn btn-secondary btn-sm" type="button" onClick={() => editChat(chat)} disabled={loading}>Editar</button>
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => deleteChat(chat)} disabled={loading}>Excluir</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
