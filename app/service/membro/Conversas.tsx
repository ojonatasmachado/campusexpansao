"use client";

import { useEffect, useRef, useState } from "react";
import { createServiceBrowserClient } from "../lib/supabase-browser";
import { Caret } from "../lib/icons";
import { useRelogioDaIgreja } from "../lib/relogio-context";
import { joinDot } from "../lib/date";
import { Av } from "./comum";
import type { Board, Card, Chat, ChatMember, M, Message, Ministry, P } from "./tipos";

// ── aba: Inicio ───────────────────────────────────────────────────────────────

// ── aba: Tarefas ──────────────────────────────────────────────────────────────

export function TabTarefas({ person, cards, boards, onAddCardComment, initialCardId }: { initialCardId?: string | null; person: P; cards: Card[]; boards: Board[]; onAddCardComment?: (cardId: string, author: string, body: string) => void }) {
  const [open, setOpen] = useState<string | null>(initialCardId && cards.some((c) => c.id === initialCardId && c.assignees.includes(person.id)) ? initialCardId : null);
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [savedComments, setSavedComments] = useState<Record<string, { author: string; body: string }[]>>({});
  const [localCards, setLocalCards] = useState<Card[]>(cards);

  /* chegou lista nova do servidor: a local recomeça dela */
  const [cardsAnteriores, setCardsAnteriores] = useState(cards);
  if (cardsAnteriores !== cards) { setCardsAnteriores(cards); setLocalCards(cards); }

  const myCards = localCards.filter((c) => c.assignees.includes(person.id));
  const pending = myCards.filter((c) => c.column_id !== "done");
  const done = myCards.filter((c) => c.column_id === "done");

  const loadComments = (cardId: string) => {
    createServiceBrowserClient()
      .schema("service")
      .from("card_comments")
      .select("author,body")
      .eq("card_id", cardId)
      .order("created_at", { ascending: true })
      .then(({ data }) => { if (data) setSavedComments((p) => ({ ...p, [cardId]: data as { author: string; body: string }[] })); });
  };

  const toggleOpen = (cardId: string) => {
    const next = open === cardId ? null : cardId;
    setOpen(next);
    if (next) loadComments(next);
  };

  const moveCard = (cardId: string, colId: string) => {
    setLocalCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, column_id: colId } : c)));
    createServiceBrowserClient().schema("service").from("cards").update({ column_id: colId }).eq("id", cardId);
  };

  const addComment = (cardId: string) => {
    const t = commentTexts[cardId]?.trim();
    if (!t) return;
    setCommentTexts((p) => ({ ...p, [cardId]: "" }));
    const author = person.name.split(" ")[0];
    setSavedComments((p) => ({ ...p, [cardId]: [...(p[cardId] ?? []), { author, body: t }] }));
    onAddCardComment?.(cardId, author, t);
  };

  const targetRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!initialCardId || !targetRef.current) return;
    let active = true;
    createServiceBrowserClient().schema("service").from("card_comments").select("author,body").eq("card_id", initialCardId).order("created_at", { ascending: true }).then(({ data }) => { if (active && data) setSavedComments((p) => ({ ...p, [initialCardId]: data as { author: string; body: string }[] })); });
    targetRef.current?.scrollIntoView({ block: "start" });
    targetRef.current?.focus({ preventScroll: true });
    return () => { active = false; };
  }, [initialCardId]);

  const cardEl = (c: Card) => {
    const board = boards.find((b) => b.id === c.board_id);
    const isOpen = open === c.id;
    const isLate = c.moved_days_ago !== null && c.moved_days_ago > 7;
    return (
      <div className={`m-task ${isLate ? "late" : ""}`} key={c.id}>
        <button ref={c.id === initialCardId ? targetRef : undefined} type="button" aria-expanded={isOpen} className="m-task-head" onClick={() => toggleOpen(c.id)}>
          <span className={`prio-dot prio-${c.priority ?? "media"}`} aria-hidden="true" />
          <div className="m-task-main">
            <div className="m-task-title">{c.title}</div>
            <div className="m-task-meta">{joinDot(board?.name ?? "Quadro", `Prioridade ${PRIORIDADE[c.priority ?? "media"] ?? "média"}`)}</div>
          </div>
          <span className="m-task-caret"><Caret open={isOpen} /></span>
        </button>
        {isOpen && (
          <div className="m-task-body">
            {c.description && <div className="m-task-desc">{c.description}</div>}
            {board && (
              <div className="m-task-cols">
                {board.columns.map((col) => (
                  <button key={col.id} type="button" className={`seg-chip ${c.column_id === col.id ? "on" : ""}`} onClick={() => moveCard(c.id, col.id)}>
                    {col.nome ?? col.name ?? col.id}
                  </button>
                ))}
              </div>
            )}
            <div className="m-task-comments">
              {(savedComments[c.id] ?? []).map((cm, i) => (
                <div className="m-task-cm" key={i}>
                  <b>{cm.author}</b>
                  <div>{cm.body}</div>
                </div>
              ))}
              <div className="m-task-cm-add">
                <input
                  className="input"
                  placeholder="Comentar..."
                  value={commentTexts[c.id] ?? ""}
                  onChange={(e) => setCommentTexts((p) => ({ ...p, [c.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && addComment(c.id)}
                />
                <button
                  className="m-btn m-btn-ok"
                  style={{ padding: "8px 14px" }}
                  onClick={() => addComment(c.id)}
                >
                  Enviar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="m-section-t">Tarefas com você · {pending.length} {pending.length === 1 ? "aberta" : "abertas"}</div>
      <div style={{ fontSize: "var(--fs-app-13)", color: "var(--muted)", lineHeight: 1.5, marginBottom: 14 }}>
        O que a liderança deixou no quadro para você. Atualize e comente.
      </div>
      {pending.map(cardEl)}
      {done.length > 0 && (
        <>
          <div className="m-section-t" style={{ marginTop: 22 }}>Concluídas · {done.length}</div>
          {done.map(cardEl)}
        </>
      )}
    </>
  );
}

// ── aba: Conversas ────────────────────────────────────────────────────────────

/* v7 4.15: mensagens de outros depois da última leitura (0060). Sem a coluna
   (antes da migração), nada conta como não lido. */
export function naoLidasPorConversa(chatMembers: ChatMember[], messages: Message[], memberId: string | null | undefined, lidasAgora: Record<string, string>): Map<string, number> {
  const out = new Map<string, number>();
  if (!memberId) return out;
  for (const cm of chatMembers) {
    if (cm.member_id !== memberId || !cm.last_read_at) continue;
    const desde = lidasAgora[cm.chat_id] && lidasAgora[cm.chat_id] > cm.last_read_at ? lidasAgora[cm.chat_id] : cm.last_read_at;
    const n = messages.filter((m) => m.chat_id === cm.chat_id && m.sender_id !== memberId && m.created_at > desde).length;
    if (n) out.set(cm.chat_id, n);
  }
  return out;
}

export function TabConversas({
  member, chats, chatMembers, messages, members, ministries, people = [], onSendMessage, onStartChat, openChatId, startNew, onChatOpen, naoLidas, onLida,
}: {
  people?: P[];
  /* não lidas por conversa e o aviso de que a pessoa abriu uma (v7 4.15) */
  naoLidas?: Map<string, number>;
  onLida?: (chatId: string) => void;
  /* abre direto nesta conversa (ex.: depois de "Pedir troca") */
  openChatId?: string | null;
  /* abre já na escolha de com quem falar ("Nova mensagem → Falar com um líder") */
  startNew?: boolean;
  /* avisa a casca quando entra ou sai de uma conversa (título e voltar) */
  onChatOpen?: (name: string | null) => void;
  member: M | null;
  chats: Chat[];
  chatMembers: ChatMember[];
  messages: Message[];
  members: M[];
  ministries: Ministry[];
  onSendMessage?: (chatId: string, senderId: string, body: string) => void;
  onStartChat?: (selfMemberId: string, targetMemberId: string, firstMessage: string) => Promise<string | null>;
}) {
  const { quandoMensagem } = useRelogioDaIgreja();
  const [selId, setSelIdRaw] = useState<string | null>(openChatId ?? null);
  const [texto, setTexto] = useState("");
  const [novo, setNovo] = useState(!!startNew);
  const [novoMsg, setNovoMsg] = useState("");
  const [starting, setStarting] = useState(false);

  const myChats = member
    ? chats.filter((c) =>
        chatMembers.some((cm) => cm.chat_id === c.id && cm.member_id === member.id),
      )
    : [];

  /* conversa a dois: nome e foto da outra pessoa; canal e grupo: o nome dado */
  const outro = (c: Chat) => {
    if (c.kind !== "dm") return null;
    const outros = chatMembers.filter((cm) => cm.chat_id === c.id && cm.member_id !== member?.id);
    if (outros.length !== 1) return null;
    return members.find((m) => m.id === outros[0].member_id) ?? null;
  };
  const nomeDa = (c: Chat) => outro(c)?.name ?? c.name ?? "Conversa";
  const fotoDa = (c: Chat) => {
    const o = outro(c);
    return o?.volunteerId ? people.find((p) => p.id === o.volunteerId)?.photoUrl ?? null : null;
  };
  const ultimaDe = (id: string) => {
    let last: Message | undefined;
    for (const m of messages) if (m.chat_id === id && (!last || m.created_at > last.created_at)) last = m;
    return last;
  };

  const chat = myChats.find((c) => c.id === selId);
  const setSelId = (id: string | null) => {
    setSelIdRaw(id);
    const c = id ? myChats.find((x) => x.id === id) : undefined;
    onChatOpen?.(c ? nomeDa(c) : id ? "Conversa" : null);
    if (id) onLida?.(id);
  };
  /* aberta direto (depois de "Pedir troca" ou de um aviso): já conta como lida */
  useEffect(() => { if (openChatId) onLida?.(openChatId); }, [openChatId]); // eslint-disable-line react-hooks/exhaustive-deps

  const souLider = member
    ? ministries.some((min) => min.people.some((p) => p.personId === member.volunteerId && p.isLeader))
    : false;

  const candidatos = member
    ? (souLider
        ? members.filter((m) => m.id !== member.id)
        : (() => {
            const liderIds = new Set<string>();
            ministries.forEach((min) => {
              const lider = min.people.find((p) => p.isLeader);
              const liderMember = lider ? members.find((m) => m.volunteerId === lider.personId) : undefined;
              if (liderMember && liderMember.id !== member.id) liderIds.add(liderMember.id);
            });
            return members.filter((m) => liderIds.has(m.id));
          })())
    : [];

  const nomeTimeDoLider = (targetId: string) => {
    const min = ministries.find((m) => {
      const lider = m.people.find((p) => p.isLeader);
      const liderMember = lider ? members.find((mm) => mm.volunteerId === lider.personId) : undefined;
      return liderMember?.id === targetId;
    });
    return min ? `Líder · ${min.name}` : "";
  };

  const enviar = () => {
    if (!texto.trim() || !chat || !member) return;
    onSendMessage?.(chat.id, member.id, texto.trim());
    setTexto("");
  };

  const abrir = async (targetMemberId: string) => {
    if (!member || starting) return;
    setStarting(true);
    const id = await onStartChat?.(member.id, targetMemberId, novoMsg);
    setStarting(false);
    setNovo(false);
    setNovoMsg("");
    if (id) setSelId(id);
  };

  if (chat) {
    const chatMsgs = messages.filter((m) => m.chat_id === chat.id);
    return (
      <div className="m-chat">
        {!onChatOpen && (
          <button className="m-chat-back" onClick={() => setSelId(null)}>
            ← {chat.name ?? "Conversa"}
          </button>
        )}
        <div className="chat-thread">
          <div className="chat-msgs" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14 }}>
            {chatMsgs.length === 0 && (
              <div style={{ fontSize: "var(--fs-app-13)", color: "var(--muted)" }}>Nenhuma mensagem ainda.</div>
            )}
            {chatMsgs.map((msg) => {
              const sender = members.find((m) => m.id === msg.sender_id);
              const isMine = member && msg.sender_id === member.id;
              return (
                <div key={msg.id} style={{ alignSelf: isMine ? "flex-end" : "flex-start", maxWidth: "80%" }}>
                  {!isMine && sender && (
                    <div
                      style={{
                        fontSize: "var(--fs-app-13)",
                        color: "var(--muted)",
                        marginBottom: 3,
                      }}
                    >
                      {sender.name.split(" ")[0]}
                    </div>
                  )}
                  <div
                    className="chat-bubble"
                    style={isMine ? { background: "var(--olive-dim)", borderColor: "var(--olive-line)" } : undefined}
                  >
                    {msg.body}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="chat-compose">
            <input
              className="input"
              placeholder="Escreva uma mensagem..."
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && enviar()}
            />
            <button className="btn btn-pri btn-sm" type="button" disabled={!texto.trim()} onClick={enviar}>Enviar</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="m-section-t">Conversas</div>

      {novo && (
        <div className="m-card" style={{ marginBottom: 14 }}>
          <div className="m-section-t" style={{ marginTop: 0 }}>{souLider ? "Falar com alguém do time" : "Falar com um líder"}</div>
          <input
            className="input"
            placeholder="Primeira mensagem (opcional)"
            value={novoMsg}
            onChange={(e) => setNovoMsg(e.target.value)}
            style={{ marginBottom: 10 }}
          />
          {candidatos.map((m) => (
            <button className="m-conv" key={m.id} onClick={() => abrir(m.id)} disabled={starting}>
              <span className="m-conv-ic">→</span>
              <div className="m-conv-main">
                <div className="m-conv-name">{m.name}</div>
                <div className="m-conv-prev">{nomeTimeDoLider(m.id)}</div>
              </div>
            </button>
          ))}
          {candidatos.length === 0 && (
            <div style={{ fontSize: "var(--fs-app-13)", color: "var(--muted)" }}>Nenhum líder disponível ainda.</div>
          )}
        </div>
      )}

      {myChats.length === 0 && (
        <div className="m-card">
          <div style={{ fontSize: "var(--fs-app-15)", color: "var(--muted)" }}>Nenhuma conversa ainda. Toque em Nova mensagem para falar com um líder.</div>
        </div>
      )}
      {[...myChats].sort((a, b) => (ultimaDe(b.id)?.created_at ?? "").localeCompare(ultimaDe(a.id)?.created_at ?? "")).map((c) => {
        const last = ultimaDe(c.id);
        const n = naoLidas?.get(c.id) ?? 0;
        const nome = nomeDa(c);
        const autor = last && !outro(c) ? members.find((m) => m.id === last.sender_id)?.name.split(" ")[0] : undefined;
        const quem = !last ? "" : last.sender_id === member?.id ? "Você: " : autor ? `${autor}: ` : "";
        return (
          <button className={`m-conv${n ? " unread" : ""}`} key={c.id} type="button" onClick={() => setSelId(c.id)}
            aria-label={n ? `${nome}, ${n === 1 ? "1 mensagem não lida" : `${n} mensagens não lidas`}` : undefined}>
            <Av name={nome} photoUrl={fotoDa(c)} />
            <div className="m-conv-main">
              <div className="m-conv-name">{nome}</div>
              <div className="m-conv-prev">{last ? `${quem}${last.body}` : "Nenhuma mensagem ainda"}</div>
            </div>
            <div className="m-conv-side">
              {last && <span className="m-conv-when">{quandoMensagem(last.created_at)}</span>}
              {n > 0 && <span className="m6-count" aria-hidden="true">{n}</span>}
            </div>
          </button>
        );
      })}
    </>
  );
}
export const PRIORIDADE: Record<string, string> = { alta: "alta", media: "média", baixa: "baixa" };
