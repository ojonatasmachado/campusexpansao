"use client";

import { plural } from "../../lib/plural";
import { avisar } from "../../lib/avisar";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { Icon } from "../../lib/icons";
import { formatDateBR } from "../../lib/date";
import { HelpDot } from "../../HelpSystem";
import { Av } from "../ui";
import type { BoardView, CardView, ChurchView, MinistryView, ModalState, PersonView } from "../tipos";

/* permissões do Kanban por papel (equivalente ao kanbanPerm()/S.KANBAN_PERMS do
   protótipo): master/pastor administram o quadro; líder cria, comenta e move os
   próprios cards mas não apaga; voluntário não deveria nem abrir esta tela (usa o
   app mobile), então fica tudo bloqueado por padrão. */
export function kanbanPerm(role: string): { criarCard: boolean; comentar: boolean; editarBoard: boolean; moverQualquer: boolean } {
  if (role === "master" || role === "pastor") return { criarCard: true, comentar: true, editarBoard: true, moverQualquer: true };
  if (role === "lider") return { criarCard: true, comentar: true, editarBoard: false, moverQualquer: true };
  return { criarCard: false, comentar: false, editarBoard: false, moverQualquer: false };
}

export function BoardChooser({
  title,
  boards,
  church,
  onPick,
  onClose,
}: {
  title: string;
  boards: BoardView[];
  church: ChurchView | undefined;
  onPick: (boardId: string) => void;
  onClose: () => void;
}) {
  const [novo, setNovo] = useState("");
  const [saving, setSaving] = useState(false);

  const criar = async () => {
    const nome = novo.trim();
    if (!nome || !church?.organizationId || !church.id || saving) return;
    setSaving(true);
    const { data } = await createServiceBrowserClient().schema("service").from("boards").insert({
      organization_id: church.organizationId,
      church_id: church.id,
      name: nome,
      ministry_id: null,
      description: "Criado a partir de uma reunião.",
      scope: "geral",
      columns: [{ id: "todo", nome: "A fazer" }, { id: "doing", nome: "Em andamento" }, { id: "done", nome: "Concluído" }],
    }).select("id").single();
    setSaving(false);
    if (data) onPick(data.id);
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Responsabilidades</div>
          <div className="modal-title">{title}</div>
          <div className="modal-sub">Mande para um quadro que já existe ou crie um novo. As responsabilidades viram cards com o responsável marcado.</div>
        </div>
        <div className="modal-body" style={{ display: "block" }}>
          <div className="dsec-title" style={{ marginBottom: 10 }}>Quadros existentes</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {boards.length === 0 && <div className="empty" style={{ padding: "8px 0" }}>Nenhum quadro ainda, crie um abaixo.</div>}
            {boards.map((board) => (
              <button className="cand" type="button" key={board.id} onClick={() => onPick(board.id)}>
                <span className="esc-col-mark" style={{ width: 30, height: 30 }}><Icon name="quadros" size={15} /></span>
                <div className="cand-main"><div className="cand-name">{board.name}</div><div className="cand-meta">{board.scope === "geral" ? "Liderança" : "Time"}</div></div>
              </button>
            ))}
          </div>
          <div className="dsec-title" style={{ margin: "20px 0 10px" }}>Ou crie um novo</div>
          <div style={{ display: "flex", gap: 10 }}>
            <input className="input" style={{ flex: 1 }} placeholder="Nome do novo quadro" value={novo} onChange={(e) => setNovo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && criar()} />
            <button className="btn btn-pri" type="button" disabled={saving} onClick={criar}>Criar e usar</button>
          </div>
        </div>
        <div className="modal-foot"><button className="btn btn-ghost" type="button" onClick={onClose}>Cancelar</button></div>
      </div>
    </div>
  );
}

export const PRIO_COLOR: Record<string, string> = {
  alta: "var(--danger)",
  media: "var(--amber)",
  baixa: "var(--olive)",
};

export function isDoneColumn(colId: string, columns: BoardView["columns"]) {
  const col = columns.find((c) => c.id === colId);
  const label = (col?.nome ?? col?.name ?? col?.id ?? "").toLowerCase();
  return col?.id === "done" || label.includes("conclu");
}

export function isCardAtrasado(card: CardView, columns: BoardView["columns"]) {
  if (!card.due || isDoneColumn(card.column_id, columns)) return false;
  try { return new Date(card.due) < new Date(); } catch { return false; }
}

export function KbCard({
  card,
  peopleById,
  atrasado,
  parado,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  card: CardView;
  peopleById: Map<string, PersonView>;
  atrasado: boolean;
  parado: boolean;
  onOpen: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  return (
    <div
      className={`kb-card${atrasado ? " atrasado" : ""}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
    >
      <div className="kb-card-top">
        <span className={`prio-dot prio-${card.priority ?? "media"}`} style={{ background: PRIO_COLOR[card.priority ?? "media"] }} />
        {card.source_type && card.source_type !== "manual" && (
          <span className="kb-origem"><Icon name="cultos" size={11} /> {card.source_type}</span>
        )}
        {parado && !atrasado && <span className="kb-parado">parado</span>}
      </div>
      <div className="kb-card-title">{card.title}</div>
      <div className="kb-card-foot">
        {card.due && <span className={`kb-prazo${atrasado ? " late" : ""}`}>{formatDateBR(card.due)}</span>}
        <div className="av-stack">
          {card.assignees.slice(0, 3).map((id) => {
            const p = peopleById.get(id);
            return p ? <Av key={id} name={p.name} size="xs" photoUrl={p.photoUrl} /> : null;
          })}
        </div>
      </div>
    </div>
  );
}

export function CardDrawer({
  card: initCard,
  board,
  columns,
  people,
  ministries,
  church,
  perm,
  currentPersonId,
  onClose,
  onMoveParent,
  onRefresh,
}: {
  card: CardView;
  board: BoardView;
  columns: { id: string; name: string }[];
  people: PersonView[];
  ministries: MinistryView[];
  church: ChurchView | undefined;
  perm: { criarCard: boolean; comentar: boolean; editarBoard: boolean; moverQualquer: boolean };
  currentPersonId: string | null;
  onClose: () => void;
  onMoveParent: (cardId: string, colId: string) => void;
  onRefresh: () => void;
}) {
  const boardMinistry = ministries.find((m) => m.id === board.ministry_id);
  const candidatos = board.ministry_id
    ? people.filter((p) => boardMinistry?.people.some((link) => link.personId === p.id))
    : people;
  const [lc, setLc] = useState(initCard);
  const [comments, setComments] = useState<{ id: string; author: string; body: string; created_at: string }[]>([]);
  const [commentText, setCommentText] = useState("");
  const canMove = perm.moverQualquer || (currentPersonId != null && lc.assignees.includes(currentPersonId));

  useEffect(() => {
    createServiceBrowserClient()
      .schema("service")
      .from("card_comments")
      .select("*")
      .eq("card_id", initCard.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => { if (data) setComments(data as typeof comments); });
  }, [initCard.id]);

  const mutate = async (updates: Partial<Pick<CardView, "column_id" | "priority" | "assignees">>) => {
    setLc((prev) => ({ ...prev, ...updates }));
    await createServiceBrowserClient().schema("service").from("cards").update(updates).eq("id", lc.id);
    onRefresh();
  };

  const addComment = async () => {
    if (!commentText.trim()) return;
    const body = commentText.trim();
    setCommentText("");
    const { data } = await createServiceBrowserClient()
      .schema("service")
      .from("card_comments")
      .insert({ organization_id: church?.organizationId ?? "", card_id: lc.id, author: "Equipe", body })
      .select()
      .single();
    if (data) setComments((prev) => [...prev, data as (typeof comments)[0]]);
  };

  const deleteCard = async () => {
    await createServiceBrowserClient().schema("service").from("cards").delete().eq("id", lc.id);
    onRefresh();
    onClose();
  };

  return (
    <>
      <div className="drawer-bg" onClick={onClose} />
      <div className="drawer drawer-wide">
        <div className="drawer-head">
          <button className="drawer-close" type="button" aria-label="Fechar" onClick={onClose}>✕</button>
          <div className="ph-eyebrow" style={{ marginBottom: 8 }}>{board.name}</div>
          <div className="profile-name" style={{ fontSize: "var(--fs-pn-20)" }}>{lc.title}</div>
        </div>
        <div className="drawer-body">
          {lc.description && <p style={{ fontSize: "var(--fs-pn-14)", color: "var(--light)", lineHeight: 1.6, marginBottom: 12 }}>{lc.description}</p>}

          <div className="dsec" style={{ marginTop: 8 }}>
            <div className="dsec-title">Situação</div>
            <div className="kb-move">
              {columns.map((col) => (
                <button key={col.id} type="button" className={`seg-chip${lc.column_id === col.id ? " on" : ""}`}
                  onClick={() => {
                    if (col.id === lc.column_id) return;
                    if (!canMove) { avisar("Você só move cards onde é responsável.", "warn"); return; }
                    mutate({ column_id: col.id }); onMoveParent(lc.id, col.id);
                  }}>
                  {col.name}
                </button>
              ))}
            </div>
            <dl className="kv" style={{ marginTop: 14 }}>
              <dt>Prazo</dt>
              <dd>{lc.due ? formatDateBR(lc.due) : <span style={{ color: "var(--muted)" }}>sem prazo</span>}</dd>
              <dt>Prioridade</dt>
              <dd>
                <div className="seg seg-sm" style={{ display: "inline-flex" }}>
                  {(["alta", "media", "baixa"] as const).map((p) => (
                    <button key={p} type="button" className={lc.priority === p ? "on" : ""} onClick={() => mutate({ priority: p })}>
                      {p === "alta" ? "Alta" : p === "media" ? "Média" : "Baixa"}
                    </button>
                  ))}
                </div>
              </dd>
            </dl>
          </div>

          <div className="dsec">
            <div className="dsec-title">Responsáveis</div>
            <div className="cand-pick">
              {candidatos.slice(0, 12).map((p) => {
                const on = lc.assignees.includes(p.id);
                return (
                  <button key={p.id} type="button" className={`cand-chip${on ? " on" : ""}`}
                    onClick={() => mutate({ assignees: on ? lc.assignees.filter((x) => x !== p.id) : [...lc.assignees, p.id] })}>
                    <Av name={p.name} size="xs" photoUrl={p.photoUrl} /> {p.name.split(" ")[0]} {on && <Icon name="ok" size={13} />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="dsec">
            <div className="dsec-title">Comentários · {comments.length}</div>
            <div className="kb-comments">
              {comments.map((cm) => (
                <div className="kb-coment" key={cm.id}>
                  <Av name={cm.author || "?"} size="sm" />
                  <div className="kb-coment-body">
                    <div className="kb-coment-top">
                      <b>{cm.author || "Equipe"}</b>
                      <span>{new Date(cm.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <div className="kb-coment-txt">{cm.body}</div>
                  </div>
                </div>
              ))}
              {comments.length === 0 && <div style={{ fontSize: "var(--fs-pn-13)", color: "var(--muted)" }}>Nenhum comentário ainda.</div>}
            </div>
            {perm.comentar ? (
              <div className="kb-coment-add">
                <input className="input" placeholder="Escreva um comentário..." value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addComment()} />
                <button className="btn btn-sec btn-sm" type="button" onClick={addComment}>Enviar</button>
              </div>
            ) : null}
          </div>

          {perm.editarBoard ? <button className="btn btn-ghost btn-sm" type="button" style={{ marginTop: 8 }} onClick={deleteCard}>Excluir card</button> : null}
        </div>
      </div>
    </>
  );
}

export function NovoCard({
  board,
  colId,
  people,
  ministries,
  church,
  onClose,
  onRefresh,
}: {
  board: BoardView;
  colId: string;
  people: PersonView[];
  ministries: MinistryView[];
  church: ChurchView;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const boardMinistry = ministries.find((m) => m.id === board.ministry_id);
  const candidatos = board.ministry_id
    ? people.filter((p) => boardMinistry?.people.some((link) => link.personId === p.id))
    : people;
  const [titulo, setTitulo] = useState("");
  const [desc, setDesc] = useState("");
  const [due, setDue] = useState("");
  const [prio, setPrio] = useState<"alta" | "media" | "baixa">("media");
  const [resp, setResp] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const criar = async () => {
    if (!titulo.trim()) return;
    setSaving(true);
    await createServiceBrowserClient().schema("service").from("cards").insert({
      organization_id: church.organizationId,
      board_id: board.id,
      column_id: colId,
      title: titulo.trim(),
      description: desc.trim() || null,
      due: due || null,
      priority: prio,
      assignees: resp,
      source_type: "manual",
    });
    onRefresh();
    onClose();
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">{board.name}</div>
          <div className="modal-title">Novo card</div>
        </div>
        <div className="modal-body">
          <div className="field"><label className="field-label">Título</label><input className="input" autoFocus value={titulo} placeholder="O que precisa ser feito" onChange={(e) => setTitulo(e.target.value)} /></div>
          <div className="field"><label className="field-label">Descrição</label><textarea className="textarea" value={desc} placeholder="Detalhes (opcional)" onChange={(e) => setDesc(e.target.value)} /></div>
          <div className="field field-half"><label className="field-label">Prazo</label><input className="input" type="date" value={due} onChange={(e) => setDue(e.target.value)} /></div>
          <div className="field field-half"><label className="field-label">Prioridade</label>
            <div className="seg seg-sm">
              {(["alta", "media", "baixa"] as const).map((p) => (
                <button key={p} type="button" className={prio === p ? "on" : ""} onClick={() => setPrio(p)}>
                  {p === "alta" ? "Alta" : p === "media" ? "Média" : "Baixa"}
                </button>
              ))}
            </div>
          </div>
          <div className="field"><label className="field-label">Responsáveis</label>
            <div className="cand-pick">
              {candidatos.slice(0, 12).map((p) => {
                const on = resp.includes(p.id);
                return (
                  <button key={p.id} type="button" className={`cand-chip${on ? " on" : ""}`}
                    onClick={() => setResp(on ? resp.filter((x) => x !== p.id) : [...resp, p.id])}>
                    <Av name={p.name} size="xs" photoUrl={p.photoUrl} /> {p.name.split(" ")[0]} {on && <Icon name="ok" size={13} />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-sec" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn btn-pri" type="button" disabled={saving} onClick={criar}>Adicionar card</button>
        </div>
      </div>
    </div>
  );
}

export function QuadroAberto({
  board,
  boardCards,
  people,
  peopleById,
  ministries,
  church,
  currentRole,
  currentPersonId,
  onBack,
  onMoveCard,
  onRefresh,
}: {
  board: BoardView;
  boardCards: CardView[];
  people: PersonView[];
  peopleById: Map<string, PersonView>;
  ministries: MinistryView[];
  church: ChurchView | undefined;
  currentRole: "master" | "pastor" | "lider" | "membro";
  currentPersonId: string | null;
  onBack: () => void;
  onMoveCard: (cardId: string, colId: string) => void;
  onRefresh: () => void;
}) {
  const perm = kanbanPerm(currentRole);
  const [openCard, setOpenCard] = useState<CardView | null>(null);
  const [novoCol, setNovoCol] = useState<string | null>(null);
  const [drag, setDrag] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [fPrio, setFPrio] = useState("todas");
  const [fEstado, setFEstado] = useState("todos");

  const columns = board.columns.length
    ? board.columns.map((c) => ({ id: c.id, name: c.nome ?? c.name ?? c.id }))
    : [{ id: "todo", name: "A fazer" }, { id: "doing", name: "Em andamento" }, { id: "done", name: "Concluído" }];

  const isAtrasado = (c: CardView) => isCardAtrasado(c, board.columns);
  const isParado = (c: CardView) => (c.moved_days_ago ?? 0) > 7;

  const match = (c: CardView) => {
    if (q && !c.title.toLowerCase().includes(q.toLowerCase())) return false;
    if (fPrio !== "todas" && c.priority !== fPrio) return false;
    if (fEstado === "atrasados" && !isAtrasado(c)) return false;
    if (fEstado === "parados" && !isParado(c)) return false;
    if (fEstado === "meus" && !(currentPersonId && c.assignees.includes(currentPersonId))) return false;
    return true;
  };

  const atrasados = boardCards.filter(isAtrasado).length;
  const parados = boardCards.filter(isParado).length;

  return (
    <div className="content wide">
      <div className="ph">
        <div>
          <button className="back-link" type="button" onClick={onBack}>← Quadros</button>
          <h1 className="ph-title" style={{ marginTop: 8 }}>{board.name} <HelpDot text="Um quadro de tarefas com colunas (A fazer, Em andamento, Concluído). Arraste o cartão pra mudar o status." /></h1>
          <p className="ph-sub">{board.description || "Quadro de tarefas da operação."}</p>
        </div>
      </div>

      <div className="toolbar">
        <div className="tb-search">
          <span className="si">⌕</span>
          <input placeholder="Buscar card..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="seg">
          {([["todos", "Todos"], ["meus", "Meus"], ["atrasados", `Atrasados${atrasados ? ` ${atrasados}` : ""}`], ["parados", `Parados${parados ? ` ${parados}` : ""}`]] as [string, string][]).map(([k, l]) => (
            <button key={k} type="button" className={fEstado === k ? "on" : ""} onClick={() => setFEstado(k)}>{l}</button>
          ))}
        </div>
        <div className="seg">
          {([["todas", "Prioridade"], ["alta", "Alta"], ["media", "Média"], ["baixa", "Baixa"]] as [string, string][]).map(([k, l]) => (
            <button key={k} type="button" className={fPrio === k ? "on" : ""} onClick={() => setFPrio(k)}>{l}</button>
          ))}
        </div>
      </div>

      <div className="kb-board">
        {columns.map((col) => {
          const colCards = boardCards.filter((c) => c.column_id === col.id && match(c));
          return (
            <div key={col.id} className={`kb-col${drag ? " drop" : ""}`}
              onDragOver={(e) => { if (drag) e.preventDefault(); }}
              onDrop={() => {
                if (!drag) return;
                const dragged = boardCards.find((c) => c.id === drag);
                if (!perm.moverQualquer && !(dragged && currentPersonId && dragged.assignees.includes(currentPersonId))) {
                  avisar("Você só move cards onde é responsável.", "warn");
                  setDrag(null);
                  return;
                }
                onMoveCard(drag, col.id);
                setDrag(null);
              }}>
              <div className="kb-col-head">
                <span className="kb-col-name">{col.name}</span>
                <span className="kb-col-count">{colCards.length}</span>
              </div>
              <div className="kb-col-body">
                {colCards.map((c) => (
                  <KbCard key={c.id} card={c} peopleById={peopleById}
                    atrasado={isAtrasado(c)} parado={isParado(c)}
                    onOpen={() => setOpenCard(c)}
                    onDragStart={() => setDrag(c.id)}
                    onDragEnd={() => setDrag(null)} />
                ))}
                {perm.criarCard ? <button className="kb-add" type="button" onClick={() => setNovoCol(col.id)}>+ Card</button> : null}
              </div>
            </div>
          );
        })}
      </div>

      {openCard && (
        <CardDrawer
          card={openCard}
          board={board}
          columns={columns}
          people={people}
          ministries={ministries}
          church={church}
          perm={perm}
          currentPersonId={currentPersonId}
          onClose={() => setOpenCard(null)}
          onMoveParent={(cardId, colId) => { onMoveCard(cardId, colId); setOpenCard((prev) => prev ? { ...prev, column_id: colId } : null); }}
          onRefresh={onRefresh}
        />
      )}
      {novoCol && church && perm.criarCard && (
        <NovoCard board={board} colId={novoCol} people={people} ministries={ministries} church={church} onClose={() => setNovoCol(null)} onRefresh={onRefresh} />
      )}
    </div>
  );
}

export function Quadros({
  boards,
  cards,
  ministries,
  people,
  church,
  currentRole,
  currentPersonId,
  scopeMinistryIds,
  setModal,
}: {
  boards: BoardView[];
  cards: CardView[];
  ministries: MinistryView[];
  people: PersonView[];
  church: ChurchView | undefined;
  currentRole: "master" | "pastor" | "lider" | "membro";
  currentPersonId: string | null;
  scopeMinistryIds: string[] | null;
  setModal: (modal: ModalState) => void;
}) {
  const router = useRouter();
  const [boardId, setBoardId] = useState<string | null>(null);
  const [localCards, setLocalCards] = useState<CardView[]>(cards);

  /* chegou lista nova do servidor: a local recomeça dela */
  const [cardsAnteriores, setCardsAnteriores] = useState(cards);
  if (cardsAnteriores !== cards) { setCardsAnteriores(cards); setLocalCards(cards); }

  const ministryById = new Map(ministries.map((m) => [m.id, m]));
  const peopleById = new Map(people.map((p) => [p.id, p]));

  /* líder (real ou pré-visualizando) só vê os quadros do próprio time; quadros
     "gerais" (sem time dono) são só da Direção : equivalente a kanban.jsx:44. */
  const visibleBoards = scopeMinistryIds
    ? boards.filter((board) => board.ministry_id && scopeMinistryIds.includes(board.ministry_id))
    : boards;

  const moverCard = async (cardId: string, colId: string) => {
    setLocalCards((prev) => prev.map((c) => c.id === cardId ? { ...c, column_id: colId } : c));
    await createServiceBrowserClient().schema("service").from("cards").update({ column_id: colId }).eq("id", cardId);
    router.refresh();
  };

  const selected = visibleBoards.find((b) => b.id === boardId);

  if (selected) {
    return (
      <QuadroAberto
        board={selected}
        boardCards={localCards.filter((c) => c.board_id === selected.id)}
        people={people}
        peopleById={peopleById}
        ministries={ministries}
        church={church}
        currentRole={currentRole}
        currentPersonId={currentPersonId}
        onBack={() => setBoardId(null)}
        onMoveCard={moverCard}
        onRefresh={() => router.refresh()}
      />
    );
  }

  return (
    <div className="content wide">
      <div className="ph">
        <div>
          <div className="ph-eyebrow">Operação</div>
          <h1 className="ph-title">Quadros de <em>tarefas</em> <HelpDot text="Um quadro de tarefas por time: o que fazer, quem é responsável e o prazo. A Direção vê os quadros de todos os times." /></h1>
          {scopeMinistryIds ? <p className="ph-sub">Os quadros do {ministries.find((m) => m.id === scopeMinistryIds[0])?.name ?? "seu time"}.</p> : null}
        </div>
        <div className="ph-actions">
          <button className="btn btn-pri" type="button" onClick={() => setModal({ eyebrow: "Criar", title: "Novo quadro", subtitle: "Um quadro de tarefas para organizar o trabalho de um time ou da liderança.", saveLabel: "Criar quadro", formFields: [{ k:"nome", label:"Nome do quadro", type:"text", req:true, ph:"ex: Louvor · Julho" }, { k:"time", label:"Time dono", type:"text", half:true, ph:"ex: Louvor (ou deixe em branco para geral)" }, { k:"desc", label:"Descrição", type:"text", half:true, ph:"Para que serve" }], action: { kind: "board" } })}>+ Novo quadro</button>
        </div>
      </div>
      <div className="kb-explain">
        <span className="kb-explain-ic"><Icon name="reunioes" size={18} /></span>
        <div>
          <div className="kb-explain-t">De onde vêm os cards</div>
          <div className="kb-explain-s">Toda responsabilidade definida numa reunião pode virar um card aqui, com responsável e prazo já preenchidos.</div>
        </div>
      </div>
      <div className="bd-grid">
        {visibleBoards.map((board) => {
          const ministry = board.ministry_id ? ministryById.get(board.ministry_id) : null;
          const boardCards = localCards.filter((c) => c.board_id === board.id);
          const doneCol = board.columns.find((col) => (col.nome ?? col.name ?? col.id).toLowerCase().includes("conclu") || col.id === "done");
          const feitos = doneCol ? boardCards.filter((c) => c.column_id === doneCol.id).length : 0;
          const pct = boardCards.length ? Math.round((feitos / boardCards.length) * 100) : 0;
          const atrasados = boardCards.filter((c) => isCardAtrasado(c, board.columns)).length;
          return (
            <button className="bd-card" key={board.id} type="button" onClick={() => setBoardId(board.id)}>
              <div className="bd-card-top">
                <div className="bd-mark"><Icon name="times" size={18} /></div>
                {atrasados > 0 && <span className="chip chip-no">{plural(atrasados, "atrasado")}</span>}
              </div>
              <div className="bd-name">{board.name}</div>
              <div className="bd-desc">{board.description || ministry?.description || "Quadro da operação."}</div>
              <div className="bd-foot">
                <span className="team-stat"><b>{boardCards.length}</b> cards · <b>{feitos}</b> feitos</span>
              </div>
              <div className="bar" style={{ marginTop: 10 }}>
                <div className="bar-fill" style={{ width: `${pct}%` }} />
              </div>
            </button>
          );
        })}
        {visibleBoards.length === 0 && <div className="empty">Nenhum quadro criado ainda.</div>}
      </div>
    </div>
  );
}
