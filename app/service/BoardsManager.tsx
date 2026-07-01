"use client";

import { useEffect, useMemo, useState } from "react";
import { createServiceBrowserClient } from "./lib/supabase-browser";

type MinistryOption = { id: string; name: string };
type PersonOption = { id: string; name: string };

type Board = {
  id: string;
  name: string;
  scope: "time" | "geral";
  ministry_id: string | null;
  description: string | null;
  columns: Array<{ id: string; nome: string }>;
};

type CardItem = {
  id: string;
  board_id: string;
  column_id: string;
  title: string;
  description: string | null;
  assignees: string[];
  due: string | null;
  priority: "alta" | "media" | "baixa";
};

type BoardsManagerProps = {
  ministries: MinistryOption[];
  people: PersonOption[];
  churchId?: string;
  organizationId?: string;
};

const DEFAULT_COLUMNS = [
  { id: "todo", nome: "A fazer" },
  { id: "doing", nome: "Em andamento" },
  { id: "done", nome: "Feito" },
];

function friendlyError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("permission") || lower.includes("row-level security") || lower.includes("rls")) return "O banco bloqueou a gravação por segurança.";
  if (lower.includes("violates foreign key")) return "Quadro, igreja, organização, ministério ou pessoa não encontrado.";
  return message || "Não conseguimos salvar o kanban agora.";
}

export default function BoardsManager({ ministries, people, churchId, organizationId }: BoardsManagerProps) {
  const supabase = createServiceBrowserClient();
  const [boards, setBoards] = useState<Board[]>([]);
  const [cards, setCards] = useState<CardItem[]>([]);
  const [boardId, setBoardId] = useState("");
  const [boardName, setBoardName] = useState("");
  const [scope, setScope] = useState<"time" | "geral">("time");
  const [ministryId, setMinistryId] = useState("");
  const [description, setDescription] = useState("");
  const [cardId, setCardId] = useState("");
  const [cardTitle, setCardTitle] = useState("");
  const [cardDescription, setCardDescription] = useState("");
  const [columnId, setColumnId] = useState("todo");
  const [assigneeId, setAssigneeId] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState<CardItem["priority"]>("media");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const ministryNames = useMemo(() => new Map(ministries.map((item) => [item.id, item.name])), [ministries]);
  const personNames = useMemo(() => new Map(people.map((item) => [item.id, item.name])), [people]);
  const selectedBoard = boards.find((board) => board.id === boardId);
  const boardOptions = selectedBoard?.columns?.length ? selectedBoard.columns : DEFAULT_COLUMNS;

  async function loadData() {
    setLoading(true);
    setError("");
    const { data: boardData, error: boardError } = await supabase
      .schema("service")
      .from("boards")
      .select("id,name,scope,ministry_id,description,columns")
      .order("created_at", { ascending: false });
    if (boardError) {
      setLoading(false);
      setError(friendlyError(boardError.message));
      return;
    }
    const { data: cardData, error: cardError } = await supabase
      .schema("service")
      .from("cards")
      .select("id,board_id,column_id,title,description,assignees,due,priority")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (cardError) {
      setError(friendlyError(cardError.message));
      return;
    }
    setBoards((boardData ?? []) as Board[]);
    setCards((cardData ?? []) as CardItem[]);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveBoard(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!organizationId || !churchId) {
      setError("Nenhuma igreja encontrada para vincular o quadro.");
      return;
    }
    if (!boardName.trim()) {
      setError("Digite o nome do quadro.");
      return;
    }
    setLoading(true);
    const payload = {
      name: boardName.trim(),
      scope,
      ministry_id: ministryId || null,
      description: description.trim() || null,
      columns: DEFAULT_COLUMNS,
      updated_at: new Date().toISOString(),
    };
    const result = boardId
      ? await supabase.schema("service").from("boards").update(payload).eq("id", boardId)
      : await supabase.schema("service").from("boards").insert({ organization_id: organizationId, church_id: churchId, ...payload });
    setLoading(false);
    if (result.error) {
      setError(friendlyError(result.error.message));
      return;
    }
    setBoardName("");
    setScope("time");
    setMinistryId("");
    setDescription("");
    await loadData();
  }

  function editBoard(board: Board) {
    setBoardId(board.id);
    setBoardName(board.name);
    setScope(board.scope);
    setMinistryId(board.ministry_id ?? "");
    setDescription(board.description ?? "");
  }

  async function deleteBoard(board: Board) {
    setError("");
    if (!window.confirm(`Excluir quadro ${board.name}? Os cards também serão removidos.`)) return;
    setLoading(true);
    const { error: deleteError } = await supabase.schema("service").from("boards").delete().eq("id", board.id);
    setLoading(false);
    if (deleteError) {
      setError(friendlyError(deleteError.message));
      return;
    }
    if (boardId === board.id) setBoardId("");
    await loadData();
  }

  async function saveCard(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!organizationId) {
      setError("Nenhuma organização encontrada para vincular o card.");
      return;
    }
    if (!boardId) {
      setError("Escolha um quadro.");
      return;
    }
    if (!cardTitle.trim()) {
      setError("Digite o título do card.");
      return;
    }
    setLoading(true);
    const payload = {
      board_id: boardId,
      column_id: columnId,
      title: cardTitle.trim(),
      description: cardDescription.trim() || null,
      assignees: assigneeId ? [assigneeId] : [],
      due: due.trim() || null,
      priority,
      updated_at: new Date().toISOString(),
    };
    const result = cardId
      ? await supabase.schema("service").from("cards").update(payload).eq("id", cardId)
      : await supabase.schema("service").from("cards").insert({ organization_id: organizationId, ...payload });
    setLoading(false);
    if (result.error) {
      setError(friendlyError(result.error.message));
      return;
    }
    setCardId("");
    setCardTitle("");
    setCardDescription("");
    setAssigneeId("");
    setDue("");
    setPriority("media");
    await loadData();
  }

  function editCard(card: CardItem) {
    setCardId(card.id);
    setBoardId(card.board_id);
    setColumnId(card.column_id);
    setCardTitle(card.title);
    setCardDescription(card.description ?? "");
    setAssigneeId(card.assignees[0] ?? "");
    setDue(card.due ?? "");
    setPriority(card.priority);
  }

  async function deleteCard(card: CardItem) {
    setError("");
    if (!window.confirm(`Excluir card ${card.title}?`)) return;
    setLoading(true);
    const { error: deleteError } = await supabase.schema("service").from("cards").delete().eq("id", card.id);
    setLoading(false);
    if (deleteError) {
      setError(friendlyError(deleteError.message));
      return;
    }
    await loadData();
  }

  return (
    <div style={{ display: "grid", gap: 18, marginTop: 24 }}>
      <form className="card" onSubmit={saveBoard}>
        <div className="card-body" style={{ display: "grid", gap: 14 }}>
          <p className="eyebrow" style={{ color: "var(--wheat)" }}>◆ QUADRO</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <label className="field"><span className="field-label req">Nome</span><input className="input" value={boardName} onChange={(event) => setBoardName(event.target.value)} placeholder="Planejamento do culto" /></label>
            <label className="field"><span className="field-label">Escopo</span><select className="select" value={scope} onChange={(event) => setScope(event.target.value as Board["scope"])}><option value="time">time</option><option value="geral">geral</option></select></label>
            <label className="field"><span className="field-label">Ministério</span><select className="select" value={ministryId} onChange={(event) => setMinistryId(event.target.value)}><option value="">Sem ministério</option>{ministries.map((ministry) => <option value={ministry.id} key={ministry.id}>{ministry.name}</option>)}</select></label>
          </div>
          <label className="field"><span className="field-label">Descrição</span><input className="input" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Tarefas da semana" /></label>
          {error && <p className="field-error">{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? "Salvando..." : boardId ? "Salvar quadro" : "Criar quadro"}</button>
        </div>
      </form>

      <form className="card" onSubmit={saveCard}>
        <div className="card-body" style={{ display: "grid", gap: 14 }}>
          <p className="eyebrow" style={{ color: "var(--wheat)" }}>◆ CARD</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <label className="field"><span className="field-label req">Quadro</span><select className="select" value={boardId} onChange={(event) => setBoardId(event.target.value)}><option value="">Escolha</option>{boards.map((board) => <option value={board.id} key={board.id}>{board.name}</option>)}</select></label>
            <label className="field"><span className="field-label req">Título</span><input className="input" value={cardTitle} onChange={(event) => setCardTitle(event.target.value)} placeholder="Confirmar equipe" /></label>
            <label className="field"><span className="field-label">Coluna</span><select className="select" value={columnId} onChange={(event) => setColumnId(event.target.value)}>{boardOptions.map((column) => <option value={column.id} key={column.id}>{column.nome}</option>)}</select></label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <label className="field"><span className="field-label">Responsável</span><select className="select" value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}><option value="">Sem responsável</option>{people.map((person) => <option value={person.id} key={person.id}>{person.name}</option>)}</select></label>
            <label className="field"><span className="field-label">Prazo</span><input className="input" value={due} onChange={(event) => setDue(event.target.value)} placeholder="2026-07-10" /></label>
            <label className="field"><span className="field-label">Prioridade</span><select className="select" value={priority} onChange={(event) => setPriority(event.target.value as CardItem["priority"])}><option value="alta">alta</option><option value="media">média</option><option value="baixa">baixa</option></select></label>
          </div>
          <label className="field"><span className="field-label">Descrição</span><input className="input" value={cardDescription} onChange={(event) => setCardDescription(event.target.value)} placeholder="Alinhar detalhes com a equipe." /></label>
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? "Salvando..." : cardId ? "Salvar card" : "Criar card"}</button>
        </div>
      </form>

      <div style={{ display: "grid", gap: 12 }}>
        {boards.map((board) => (
          <div className="card" key={board.id}>
            <div className="card-body">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <p className="eyebrow" style={{ color: "var(--wheat)" }}>◆ {board.scope}</p>
                  <strong className="t-body-lg" style={{ color: "var(--cream)" }}>{board.name}</strong>
                  <p className="t-small" style={{ color: "var(--muted)", marginTop: 6 }}>{ministryNames.get(board.ministry_id ?? "") ?? "sem ministério"} · {board.description ?? "sem descrição"}</p>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="btn btn-secondary btn-sm" type="button" onClick={() => editBoard(board)} disabled={loading}>Editar</button>
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => deleteBoard(board)} disabled={loading}>Excluir</button>
                </div>
              </div>
              <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                {cards.filter((card) => card.board_id === board.id).map((card) => (
                  <div className="card card-cream" key={card.id}>
                    <div className="card-body" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <strong style={{ color: "var(--ink)" }}>{card.title}</strong>
                        <p className="t-small" style={{ color: "var(--subtle)", marginTop: 6 }}>{card.column_id} · {card.priority} · {personNames.get(card.assignees[0] ?? "") ?? "sem responsável"}</p>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn btn-secondary btn-sm" type="button" onClick={() => editCard(card)} disabled={loading}>Editar</button>
                        <button className="btn btn-ghost btn-sm" type="button" onClick={() => deleteCard(card)} disabled={loading}>Excluir</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
