"use client";

import { plural } from "../../lib/plural";
import { avisar } from "../../lib/avisar";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { Icon } from "../../lib/icons";
import { formatDateBR, joinDot } from "../../lib/date";

import { useTermos } from "../../lib/vocabulario-context";
import { Av, EmptyState, PageHead } from "../ui";
import { FormScreen, FormSection, type FormScreenHandle } from "../form/FormScreen";
import { friendlyWriteError } from "../erros";
import { OUTRO_LOCAL, ROUTES, dpToIsoDate, findRoomConflict } from "../comum";
import { DatePicker, DrawerSection, DrawerShell, TimePicker } from "../campos";
import { BoardChooser } from "./Quadros";
import type { BoardView, CardView, ChurchView, DrawerState, MeetingActionView, MeetingView, MinistryView, ModalState, PersonView, RehearsalView, ReservationView, RoomView } from "../tipos";

export function ReuniaoForm({
  ministries,
  people,
  rooms,
  reservations,
  church,
  onClose,
}: {
  ministries: MinistryView[];
  people: PersonView[];
  rooms: RoomView[];
  reservations: ReservationView[];
  church: ChurchView | undefined;
  onClose: () => void;
}) {
  const { comTermos: ct } = useTermos();
  const router = useRouter();
  const meetingRooms = rooms.filter((room) => room.allows_meetings !== false);
  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("20h00");
  const [fim, setFim] = useState("21h30");
  const [salaId, setSalaId] = useState(meetingRooms[0]?.id ?? "");
  const [endereco, setEndereco] = useState("");
  const [presentes, setPresentes] = useState<string[]>([]);
  const [pauta, setPauta] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const telaRef = useRef<FormScreenHandle>(null);
  const fid = useId();

  const isOutro = salaId === OUTRO_LOCAL;
  const isoDate = data ? dpToIsoDate(data) : null;
  const conflito = !isOutro && salaId && isoDate ? findRoomConflict(reservations, salaId, isoDate, hora, fim) : null;
  const salaEscolhida = rooms.find((r) => r.id === salaId);
  const localValido = isOutro ? !!endereco.trim() : !!salaEscolhida;

  const togglePessoa = (id: string) => setPresentes((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const criar = async () => {
    if (!titulo.trim()) { setError("Dê um título à reunião."); return; }
    if (!church?.organizationId || !church.id) { setError("Nenhuma igreja encontrada para vincular esta reunião."); return; }
    if (!localValido) { setError(isOutro ? "Digite o endereço do espaço." : "Selecione um espaço já cadastrado em Configurações → Espaços e Salas."); return; }
    if (conflito) { setError(`A sala já tem "${conflito.title}" em ${conflito.start_time} a ${conflito.end_time} nesse dia.`); return; }
    setSaving(true);
    setError("");
    const supabase = createServiceBrowserClient();
    const meetingMinistries = ministries.filter((m) => m.people.some((link) => presentes.includes(link.personId))).map((m) => m.id);
    const { data: meetingRow, error: meetingError } = await supabase.schema("service").from("meetings").insert({
      organization_id: church.organizationId,
      church_id: church.id,
      title: titulo.trim(),
      meeting_date: data || null,
      time: hora,
      location: isOutro ? endereco.trim() : salaEscolhida!.name,
      ministries: meetingMinistries,
      attendees: presentes,
      agenda: pauta.split("\n").map((s) => s.trim()).filter(Boolean),
      status: "agendada",
    }).select("id").single();
    if (meetingError || !meetingRow) {
      setSaving(false);
      setError(friendlyWriteError(meetingError?.message ?? "Não foi possível marcar a reunião."));
      return;
    }
    let salaFalhou = false;
    if (!isOutro && salaId && isoDate) {
      const { error: resError } = await supabase.schema("service").from("reservations").insert({
        organization_id: church.organizationId,
        room_id: salaId,
        title: titulo.trim(),
        kind: "reuniao",
        reserved_date: isoDate,
        start_time: hora,
        end_time: fim,
        source_type: "reuniao",
        source_id: meetingRow.id,
      });
      salaFalhou = !!resError;
    }
    /* a reunião já foi marcada: fecha mesmo se a reserva da sala falhar, avisando */
    if (salaFalhou) avisar("Reunião marcada, mas a sala não foi reservada. Reserve em Espaços e salas.", "warn");
    if (telaRef.current) await telaRef.current.fechar(); else onClose();
    router.refresh();
  };

  const retrato = JSON.stringify({ titulo, data, hora, fim, salaId, endereco, presentes: [...presentes].sort(), pauta });
  const [retratoInicial] = useState(retrato);
  const falta = [
    !titulo.trim() && "título",
    !localValido && (isOutro ? "endereço do espaço" : "sala"),
    !!conflito && "outro horário (a sala está ocupada)",
  ].filter(Boolean) as string[];

  return (
    <FormScreen
      ref={telaRef}
      eyebrow="Nova reunião"
      title={titulo.trim() || "Nova reunião"}
      saveLabel="Marcar reunião"
      saving={saving}
      missing={falta}
      dirty={retrato !== retratoInicial}
      error={error}
      onSave={criar}
      onClose={onClose}
    >
      <FormSection title="Reunião">
        <div className="field"><label className="field-label req" htmlFor={`${fid}-tit`}>Título</label><input id={`${fid}-tit`} className="input" aria-required="true" placeholder="ex: Reunião de liderança" value={titulo} onChange={(e) => setTitulo(e.target.value)} /></div>
      </FormSection>

      <FormSection title="Quando e onde">
        <div className="fs-grid">
          <div className="field"><div className="field-label">Data</div><DatePicker value={data} onChange={setData} /></div>
          <div className="field half"><div className="field-label">Início</div><TimePicker value={hora} onChange={setHora} /></div>
          <div className="field half"><div className="field-label">Fim</div><TimePicker value={fim} onChange={setFim} /></div>
          <div className="field">
            <label className="field-label req" htmlFor={`${fid}-sala`}>Sala</label>
            <select id={`${fid}-sala`} className="select" aria-required="true" value={salaId} onChange={(e) => setSalaId(e.target.value)}>
              <option value="">Selecione uma sala</option>
              {meetingRooms.map((room) => <option key={room.id} value={room.id}>{room.name}{room.capacity ? ` · ${room.capacity} lug.` : ""}</option>)}
              <option value={OUTRO_LOCAL}>Outro espaço (fora da igreja)</option>
            </select>
            {meetingRooms.length === 0 ? <div className="field-hint">Nenhuma sala liberada pra reunião ainda. Cadastre em Espaços e salas.</div> : null}
          </div>
          {isOutro ? <div className="field"><label className="field-label req" htmlFor={`${fid}-end`}>Endereço do espaço</label><input id={`${fid}-end`} className="input" value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua, número, bairro..." /></div> : null}
        </div>
        {conflito ? <div className="reserva-warn" role="status"><Icon name="alerta" size={14} /> A sala já tem &quot;{conflito.title}&quot; de {conflito.start_time} a {conflito.end_time} nesse dia.</div> : null}
      </FormSection>

      <FormSection title="Quem participa">
        <div className="cand-pick" role="group" aria-label="Quem participa">
          {people.map((person) => {
            const on = presentes.includes(person.id);
            return (
              <button key={person.id} type="button" className={`cand-chip ${on ? "on" : ""}`} aria-pressed={on} onClick={() => togglePessoa(person.id)}>
                <Av name={person.name} size="xs" photoUrl={person.photoUrl} /> {person.name.split(" ")[0]} {on && <Icon name="ok" size={13} />}
              </button>
            );
          })}
          {people.length === 0 ? <span className="fs-note">{ct("Nenhum {voluntario} cadastrado.")}</span> : null}
        </div>
        {presentes.length ? <p className="fs-note">{plural(presentes.length, "pessoa")} na reunião.</p> : null}
      </FormSection>

      <FormSection title="Pauta">
        <div className="field">
          <textarea className="textarea" aria-label="Pauta" aria-describedby={`${fid}-pauta`} placeholder="ex: Balanço do mês" value={pauta} onChange={(e) => setPauta(e.target.value)} />
          <div className="field-hint" id={`${fid}-pauta`}>Um item por linha.</div>
        </div>
      </FormSection>
    </FormScreen>
  );
}

export function Reunioes({ meetings, meetingActions, ministries, people, rooms, reservations, church, setDrawer }: { meetings: MeetingView[]; meetingActions: MeetingActionView[]; ministries: MinistryView[]; people: PersonView[]; rooms: RoomView[]; reservations: ReservationView[]; church: ChurchView | undefined; setDrawer: (drawer: DrawerState) => void }) {
  const ministryById = new Map(ministries.map((ministry) => [ministry.id, ministry]));
  const personById = new Map(people.map((person) => [person.id, person]));
  const scheduled = meetings.filter((meeting) => meeting.status === "agendada");
  const finished = meetings.filter((meeting) => meeting.status === "realizada");
  const [novaOpen, setNovaOpen] = useState(false);
  return (
    <div className="content wide">
      <PageHead title="Reuniões" eyebrow="Liderança" help="Pauta, presença e decisões dos encontros de liderança. Cada reunião guarda a ata pra consultar depois." action={<button className="btn btn-pri" type="button" onClick={() => setNovaOpen(true)}>+ Marcar reunião</button>} />
      <div className="section-divide"><Icon name="cultos" size={15} /><span className="label">Agendadas</span><span className="line" /></div>
      <div className="reu-grid">
        {scheduled.map((meeting) => {
          const author = meeting.author_id ? personById.get(meeting.author_id) : null;
          return (
            <button className="reu-card" type="button" key={meeting.id} onClick={() => setDrawer({ kind: "meeting", id: meeting.id })}>
              <div className="reu-card-top"><div><div className="reu-date">{formatDateBR(meeting.meeting_date) || "Sem data"} · {meeting.time || "sem horário"}</div><div className="reu-title">{meeting.title}</div></div><span className="chip chip-ok">Agendada</span></div>
              <div className="reu-meta">{joinDot(meeting.location, `marcada por ${author?.name.split(" ")[0] || "líder"}`)}</div>
              <div className="reu-foot"><div className="reu-times">{meeting.ministries.map((id) => <span className="tag" key={id}>{ministryById.get(id)?.name || "Time"}</span>)}</div><span className="team-stat"><b>{meeting.attendees.length}</b> presentes</span></div>
            </button>
          );
        })}
        {scheduled.length === 0 ? <EmptyState title="Nenhuma reunião agendada" text="As reuniões de liderança e de time aparecem aqui, com pauta e presença." action={{ label: "Agendar reunião", onClick: () => setNovaOpen(true) }} /> : null}
      </div>
      <div className="section-divide"><Icon name="relatorios" size={15} /><span className="label">Realizadas</span><span className="line" /></div>
      <div className="tbl">
        {finished.map((meeting) => {
          const actions = meetingActions.filter((action) => action.meeting_id === meeting.id);
          const pending = actions.filter((action) => action.status !== "feito").length;
          return (
            <button className="tr click" type="button" key={meeting.id} style={{ gridTemplateColumns: "130px 1.6fr 1fr 120px" }} onClick={() => setDrawer({ kind: "meeting", id: meeting.id })}>
              <div style={{ fontFamily: "var(--mono)", fontSize: "var(--fs-pn-12)", color: "var(--olive)" }}>{formatDateBR(meeting.meeting_date) || "sem data"}</div>
              <div><div className="cell-name">{meeting.title}</div><div className="cell-sub">{plural(meeting.ministries.length, "time")} · {meeting.attendees.length} presentes</div></div>
              <div className="cell-sub">{plural(actions.length, "responsabilidade")}</div>
              <div>{pending > 0 ? <span className="chip chip-wait">{pending} em aberto</span> : <span className="chip chip-ok">Tudo feito</span>}</div>
            </button>
          );
        })}
      </div>
      {novaOpen ? <ReuniaoForm ministries={ministries} people={people} rooms={rooms} reservations={reservations} church={church} onClose={() => setNovaOpen(false)} /> : null}
    </div>
  );
}

export function Ensaios({ rehearsals, ministries, rooms, setDrawer, setModal }: { rehearsals: RehearsalView[]; ministries: MinistryView[]; rooms: RoomView[]; setDrawer: (drawer: DrawerState) => void; setModal: (modal: ModalState) => void }) {
  const ministryById = new Map(ministries.map((ministry) => [ministry.id, ministry]));
  const localOptions = [...rooms.filter((room) => room.allows_meetings !== false).map((room) => ({ v: room.name, l: `${room.name}${room.capacity ? ` · ${room.capacity} lug.` : ""}` })), { v: OUTRO_LOCAL, l: "Outro espaço (fora da igreja)" }];
  return (
    <div className="content wide">
      <PageHead title="Ensaios" eyebrow="Liderança" help="Ensaios de louvor, teatro, dança... com participantes e repertório ou materiais anexados." action={<button className="btn btn-pri" type="button" onClick={() => setModal({ eyebrow: "Criar", title: "Novo ensaio", subtitle: "Louvor, teatro, dança… Escolha quem participa e defina o repertório.", saveLabel: "Criar ensaio", formFields: [{ k:"titulo", label:"Nome do ensaio", type:"text", req:true, ph:"ex: Ensaio do Louvor, Peça de Natal" }, { k:"tipo", label:"Tipo de ensaio", type:"select", half:true, options:[{v:"louvor",l:"Louvor / música"},{v:"teatro",l:"Teatro"},{v:"danca",l:"Dança"},{v:"coreografia",l:"Coreografia"},{v:"geral",l:"Geral"},{v:"outro",l:"Outro"}] }, { k:"time", label:"Ministério", type:"text", half:true, ph:"ex: Louvor" }, { k:"data", label:"Dia", type:"date", half:true }, { k:"hora", label:"Horário", type:"time", half:true }, { k:"local", label:"Local", type:"select", req:true, half:true, ph:"Selecione um espaço cadastrado", options: localOptions }, { k:"endereco", label:"Endereço do espaço", type:"text", half:true, ph:"Rua, número, bairro...", showIf:{field:"local",equals:OUTRO_LOCAL} }, { k:"recorrencia", label:"Recorrência", type:"select", half:true, options:[{v:"semanal",l:"Semanal"},{v:"quinzenal",l:"Quinzenal"},{v:"mensal",l:"Mensal"},{v:"eventual",l:"Eventual"}] }, { k:"obs", label:"Observação", type:"area", ph:"Detalhes do ensaio" }], action: { kind: "rehearsal" } })}>+ Novo ensaio</button>} />
      <div className="reu-grid">
        {rehearsals.map((rehearsal) => {
          const ministry = rehearsal.ministry_id ? ministryById.get(rehearsal.ministry_id) : null;
          return (
            <button className="ens-card" type="button" key={rehearsal.id} onClick={() => setDrawer({ kind: "rehearsal", id: rehearsal.id })}>
              <div className="ens-top"><span className="ens-rec">{rehearsal.recurrence || "eventual"}</span><span className="ens-pub">{rehearsal.kind || "Ensaio"}</span></div>
              <div className="ens-title">{rehearsal.title}</div>
              <div className="ens-when">{formatDateBR(rehearsal.rehearsal_date) || "sem data"} · {rehearsal.time || "sem horário"} · {rehearsal.location || "sem local"}</div>
              <div className="ens-team"><span className="ens-team-ic"><Icon name="times" size={15} /></span>{ministry?.name || "Vários times"} · {rehearsal.attendees.length} pessoas</div>
              {rehearsal.repertoire.length ? <div className="ens-obs"><Icon name="cultos" size={13} /> {rehearsal.repertoire.length} item(ns) no repertório</div> : null}
              {rehearsal.notes ? <div className="ens-obs">{rehearsal.notes}</div> : null}
            </button>
          );
        })}
        {rehearsals.length === 0 ? <EmptyState title="Nenhum ensaio ainda" text="Os ensaios aparecem aqui com participantes, repertório e materiais." /> : null}
      </div>
    </div>
  );
}

export const CARD_COLUMN_STATUS: Record<string, { label: string; cls: string }> = {
  todo: { label: "A fazer", cls: "chip-wait" },
  doing: { label: "Em andamento", cls: "chip-wait" },
  done: { label: "Concluído", cls: "chip-ok" },
};

export function ReuniaoDrawer({
  meeting,
  actions,
  ministries,
  people,
  boards,
  cards,
  church,
  onClose,
  setRoute,
}: {
  meeting: MeetingView;
  actions: MeetingActionView[];
  ministries: MinistryView[];
  people: PersonView[];
  boards: BoardView[];
  cards: CardView[];
  church: ChurchView | undefined;
  onClose: () => void;
  setRoute: (route: keyof typeof ROUTES) => void;
}) {
  const router = useRouter();
  const ministryById = new Map(ministries.map((m) => [m.id, m]));
  const personById = new Map(people.map((p) => [p.id, p]));
  const [ata, setAta] = useState(meeting.minutes ?? "");
  const [saving, setSaving] = useState(false);
  const [novaDescricao, setNovaDescricao] = useState("");
  const [novoResponsavel, setNovoResponsavel] = useState("");
  const [chooser, setChooser] = useState<{ scope: "all" | string } | null>(null);
  /* a pauta é gravada como lista de textos; registros antigos (ou importados) podem vir como { t } ou { title } */
  const pauta = (Array.isArray(meeting.agenda) ? meeting.agenda : [])
    .map((item) => (typeof item === "string" ? item : item && typeof item === "object" ? String((item as { t?: unknown; title?: unknown; text?: unknown }).t ?? (item as { title?: unknown }).title ?? (item as { text?: unknown }).text ?? "") : ""))
    .map((s) => s.trim())
    .filter(Boolean);

  const cardFor = (actionId: string) => cards.find((c) => c.source_type === "meeting_action" && c.source_id === actionId);
  const pendentes = actions.filter((a) => !cardFor(a.id));

  const salvarAta = async () => {
    setSaving(true);
    const wasAgendada = meeting.status === "agendada";
    await createServiceBrowserClient()
      .schema("service")
      .from("meetings")
      .update({ minutes: ata, status: wasAgendada ? "realizada" : meeting.status })
      .eq("id", meeting.id);
    setSaving(false);
    router.refresh();
    if (wasAgendada && pendentes.length > 0) setChooser({ scope: "all" });
  };

  const addAcao = async () => {
    if (!novaDescricao.trim() || !church?.organizationId) return;
    await createServiceBrowserClient().schema("service").from("meeting_actions").insert({
      organization_id: church.organizationId,
      meeting_id: meeting.id,
      description: novaDescricao.trim(),
      assignee_id: novoResponsavel || null,
      status: "pendente",
    });
    setNovaDescricao("");
    setNovoResponsavel("");
    router.refresh();
  };

  const enviarParaBoard = async (actionId: string, boardId: string) => {
    if (!church?.organizationId) return;
    const action = actions.find((a) => a.id === actionId);
    if (!action) return;
    await createServiceBrowserClient().schema("service").from("cards").insert({
      organization_id: church.organizationId,
      board_id: boardId,
      column_id: "todo",
      title: action.description,
      assignees: action.assignee_id ? [action.assignee_id] : [],
      priority: "media",
      source_type: "meeting_action",
      source_id: action.id,
    });
  };

  const onPickBoard = async (boardId: string) => {
    if (!chooser) return;
    if (chooser.scope === "all") {
      await Promise.all(pendentes.map((a) => enviarParaBoard(a.id, boardId)));
    } else {
      await enviarParaBoard(chooser.scope, boardId);
    }
    setChooser(null);
    router.refresh();
  };

  return (
    <>
    <DrawerShell onClose={onClose}>
      <div className="drawer-head">
        <button className="drawer-close" type="button" aria-label="Fechar" onClick={onClose}>✕</button>
        <div className="ph-eyebrow" style={{ marginBottom: 8 }}>{meeting.status === "agendada" ? "Reunião agendada" : "Reunião realizada"}</div>
        <div className="profile-name">{meeting.title}</div>
        <div className="profile-role">{formatDateBR(meeting.meeting_date) || "sem data"} · {meeting.time || ""} · {meeting.location || "sem local"}</div>
      </div>
      <div className="drawer-body">
        <DrawerSection title="Times e presentes">
          <div className="cell-tags" style={{ marginBottom: 12 }}>
            {meeting.ministries.map((id) => <span key={id} className="tag">{ministryById.get(id)?.name || "Time"}</span>)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {meeting.attendees.map((pid) => {
              const p = personById.get(pid);
              return p ? (
                <div className="cand" key={pid}>
                  <Av name={p.name} size="sm" photoUrl={p.photoUrl} />
                  <div className="cand-main"><div className="cand-name">{p.name}</div><div className="cand-meta">{p.tags.join(" · ") || "Participante"}</div></div>
                </div>
              ) : null;
            })}
            {meeting.attendees.length === 0 && <div style={{ fontSize: "var(--fs-pn-13)", color: "var(--muted)" }}>Nenhum presente registrado.</div>}
          </div>
        </DrawerSection>

        {pauta.length > 0 && (
          <DrawerSection title="Pauta">
            <div className="step-stack">
              {pauta.map((item, i) => (
                <div className="step-do" key={i}>
                  <span className="step-ic">{String(i + 1).padStart(2, "0")}</span> {item}
                </div>
              ))}
            </div>
          </DrawerSection>
        )}

        <DrawerSection title="Ata · o que foi discutido">
          <textarea
            className="textarea"
            style={{ minHeight: 90 }}
            placeholder="Registre as decisões e os pontos principais da reunião..."
            value={ata}
            onChange={(e) => setAta(e.target.value)}
          />
        </DrawerSection>

        <DrawerSection title="Responsabilidades · anote durante a reunião">
          <div className="reu-quadro-note" style={{ marginBottom: 12 }}>Cada responsabilidade vira um <b>card no quadro</b>. O andamento é acompanhado lá.</div>
          {actions.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              {actions.map((action) => {
                const assignee = action.assignee_id ? personById.get(action.assignee_id) : null;
                const card = cardFor(action.id);
                const cardStatus = card ? (CARD_COLUMN_STATUS[card.column_id] ?? CARD_COLUMN_STATUS.todo) : null;
                return (
                  <div className="acao-row" key={action.id}>
                    <div className="acao-main">
                      <div className="acao-o">{action.description}</div>
                      <div className="acao-quem">{assignee?.name.split(" ")[0] ?? "a definir"}</div>
                    </div>
                    <div className="acao-side">
                      {card && cardStatus ? (
                        <>
                          <span className={`chip ${cardStatus.cls}`}>{cardStatus.label}</span>
                          <button className="btn btn-ghost btn-sm" type="button" onClick={() => { onClose(); setRoute("quadros"); }}>Ver no quadro</button>
                        </>
                      ) : (
                        <>
                          <span className="acao-semquadro">fora do quadro</span>
                          <button className="btn btn-ghost btn-sm" type="button" onClick={() => setChooser({ scope: action.id })}>Para o quadro</button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="acao-add">
            <input className="input" placeholder="O que ficou combinado (ex: Revisar escala de julho)" value={novaDescricao} onChange={(e) => setNovaDescricao(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addAcao()} />
            <select className="select acao-add-quem" value={novoResponsavel} onChange={(e) => setNovoResponsavel(e.target.value)}>
              <option value="">Responsável…</option>
              {meeting.attendees.map((pid) => { const p = personById.get(pid); return p ? <option key={pid} value={pid}>{p.name}</option> : null; })}
            </select>
            <button className="btn btn-sec btn-sm" type="button" onClick={addAcao}>+ Anotar</button>
          </div>
          {pendentes.length > 0 && (
            <button className="btn btn-ghost btn-sm" type="button" style={{ marginTop: 10 }} onClick={() => setChooser({ scope: "all" })}>Todas ao quadro</button>
          )}
        </DrawerSection>

        <button
          className="btn btn-pri"
          style={{ width: "100%", justifyContent: "center", marginTop: 20 }}
          type="button"
          disabled={saving}
          onClick={salvarAta}
        >
          {saving ? "Salvando..." : meeting.status === "agendada" ? "Salvar ata e marcar realizada" : "Salvar ata"}
        </button>
      </div>
    </DrawerShell>
    {chooser ? (
      <BoardChooser
        title={chooser.scope === "all" ? "Onde colocar as responsabilidades?" : "Mandar para qual quadro?"}
        boards={boards}
        church={church}
        onPick={onPickBoard}
        onClose={() => setChooser(null)}
      />
    ) : null}
    </>
  );
}

export function EnsaioDrawer({
  rehearsal,
  ministries,
  people,
  onClose,
}: {
  rehearsal: RehearsalView;
  ministries: MinistryView[];
  people: PersonView[];
  onClose: () => void;
}) {
  const ministryById = new Map(ministries.map((m) => [m.id, m]));
  const personById = new Map(people.map((p) => [p.id, p]));
  const ministry = rehearsal.ministry_id ? ministryById.get(rehearsal.ministry_id) : undefined;
  type SongItem = { titulo: string; tom?: string; youtube?: string; cifra?: string };
  type AttachItem = { tipo: string; nome: string; url?: string };
  const repertoire = (rehearsal.repertoire as SongItem[]) ?? [];
  const attachments = (rehearsal.attachments as AttachItem[]) ?? [];

  return (
    <DrawerShell onClose={onClose}>
      <div className="drawer-head">
        <button className="drawer-close" type="button" aria-label="Fechar" onClick={onClose}>✕</button>
        <div className="ph-eyebrow" style={{ marginBottom: 8 }}>{rehearsal.kind || "Ensaio"} · {rehearsal.recurrence || "eventual"}</div>
        <div className="profile-name">{rehearsal.title}</div>
        <div className="profile-role">{formatDateBR(rehearsal.rehearsal_date) || "sem data"} · {rehearsal.time || ""} · {rehearsal.location || "sem local"}{rehearsal.audience ? " · " + rehearsal.audience : ""}</div>
      </div>
      <div className="drawer-body">
        {ministry && (
          <DrawerSection title="Time">
            <div className="cell-tags"><span className="tag lead">{ministry.name}</span></div>
          </DrawerSection>
        )}

        {rehearsal.attendees.length > 0 && (
          <DrawerSection title={`Quem participa · ${rehearsal.attendees.length}`}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {rehearsal.attendees.map((pid) => {
                const p = personById.get(pid);
                return p ? (
                  <div className="cand" key={pid}>
                    <Av name={p.name} size="sm" photoUrl={p.photoUrl} />
                    <div className="cand-main"><div className="cand-name">{p.name}</div><div className="cand-meta">{p.tags.join(" · ") || "Participante"}</div></div>
                  </div>
                ) : null;
              })}
            </div>
          </DrawerSection>
        )}

        {repertoire.length > 0 && (
          <DrawerSection title={`Repertório · ${repertoire.length}`}>
            <div className="setlist-list">
              {repertoire.map((song, i) => (
                <div className="setlist-row" key={i}>
                  <span className="setlist-n">{String(i + 1).padStart(2, "0")}</span>
                  <span className="setlist-titulo">{song.titulo}</span>
                  {song.tom && <span className="setlist-tom">{song.tom}</span>}
                  {song.youtube && <a className="setlist-link" href={song.youtube} target="_blank" rel="noreferrer">vídeo</a>}
                  {song.cifra && <a className="setlist-link" href={song.cifra} target="_blank" rel="noreferrer">cifra</a>}
                </div>
              ))}
            </div>
          </DrawerSection>
        )}

        {attachments.length > 0 && (
          <DrawerSection title="Materiais">
            <div className="anx-list">
              {attachments.map((a, i) => (
                a.url
                  ? <a className="anx-item" key={i} href={a.url} target="_blank" rel="noreferrer"><span className="anx-tag">{a.tipo}</span><span className="anx-nome">{a.nome}</span></a>
                  : <div className="anx-item" key={i}><span className="anx-tag">{a.tipo}</span><span className="anx-nome">{a.nome}</span></div>
              ))}
            </div>
          </DrawerSection>
        )}

        {rehearsal.notes && (
          <DrawerSection title="Observação">
            <p style={{ fontSize: "var(--fs-pn-14)", color: "var(--muted)", lineHeight: 1.6 }}>{rehearsal.notes}</p>
          </DrawerSection>
        )}
      </div>
    </DrawerShell>
  );
}
