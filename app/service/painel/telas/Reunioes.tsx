"use client";

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

import { Botao, BotaoIcone } from "../../ui/Botao";
import { Acao } from "../../ui/Acao";
import { Etiqueta, Selo, tomDaClasse } from "../../ui/Selo";
import { linhaClasse } from "../../ui/Linha";
import { Campo, Entrada } from "../../ui/Campo";
import { Selecao } from "../../ui/Selecao";
import { useTexto } from "../../lib/internacional/contexto";
import type { Text } from "../../lib/internacional/mensagens";

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
  const traduzirUi = useTexto();

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
    if (!titulo.trim()) { setError(traduzirUi("Dê um título à reunião.")); return; }
    if (!church?.organizationId || !church.id) { setError(traduzirUi("Nenhuma igreja encontrada para vincular esta reunião.")); return; }
    if (!localValido) { setError(isOutro ? traduzirUi("Digite o endereço do espaço.") : traduzirUi("Selecione um espaço já cadastrado em Configurações → Espaços e Salas.")); return; }
    if (conflito) { setError(traduzirUi("A sala já tem \"{titulo}\" em {inicio} a {fim} nesse dia.", { titulo: conflito.title, inicio: String(conflito.start_time), fim: String(conflito.end_time) })); return; }
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
      setError(friendlyWriteError(meetingError?.message ?? "Não foi possível marcar a reunião.", traduzirUi));
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
    if (salaFalhou) avisar(traduzirUi("Reunião marcada, mas a sala não foi reservada. Reserve em Espaços e salas."), "warn");
    if (telaRef.current) await telaRef.current.fechar(); else onClose();
    router.refresh();
  };

  const retrato = JSON.stringify({ titulo, data, hora, fim, salaId, endereco, presentes: [...presentes].sort(), pauta });
  const [retratoInicial] = useState(retrato);
  const falta = [
    !titulo.trim() && traduzirUi("título"),
    !localValido && (isOutro ? traduzirUi("endereço do espaço") : traduzirUi("sala")),
    !!conflito && traduzirUi("outro horário (a sala está ocupada)"),
  ].filter(Boolean) as string[];

  return (
    <FormScreen
      ref={telaRef}
      eyebrow={traduzirUi("Nova reunião")}
      title={titulo.trim() || traduzirUi("Nova reunião")}
      saveLabel={traduzirUi("Marcar reunião")}
      saving={saving}
      missing={falta}
      dirty={retrato !== retratoInicial}
      error={error}
      onSave={criar}
      onClose={onClose}
    >
      <FormSection title={traduzirUi("Reunião")}>
        <Campo rotulo={traduzirUi("Título")} obrigatorio><Entrada id={`${fid}-tit`} aria-required="true" placeholder={traduzirUi("ex: Reunião de liderança")} value={titulo} onChange={(e) => setTitulo(e.target.value)} /></Campo>
      </FormSection>

      <FormSection title={traduzirUi("Quando e onde")}>
        <div className="fs-grid">
          <div className="field"><div className="field-label">{traduzirUi("Data")}</div><DatePicker value={data} onChange={setData} /></div>
          <div className="field half"><div className="field-label">{traduzirUi("Início")}</div><TimePicker value={hora} onChange={setHora} /></div>
          <div className="field half"><div className="field-label">{traduzirUi("Fim")}</div><TimePicker value={fim} onChange={setFim} /></div>
          <Campo rotulo={traduzirUi("Sala")} obrigatorio ajuda={meetingRooms.length === 0 ? traduzirUi("Nenhuma sala liberada pra reunião ainda. Cadastre em Espaços e salas.") : undefined}>
            <Selecao id={`${fid}-sala`} valor={salaId} aoMudar={setSalaId} vazio={traduzirUi("Selecione uma sala")} opcoes={[...meetingRooms.map((room) => ({ v: room.id, l: room.capacity ? traduzirUi("{sala} · {capacidade} lug.", { sala: room.name, capacidade: String(room.capacity) }) : room.name })), { v: OUTRO_LOCAL, l: traduzirUi("Outro espaço (fora da igreja)") }]} />
          </Campo>
          {isOutro ? <Campo rotulo={traduzirUi("Endereço do espaço")} obrigatorio><Entrada id={`${fid}-end`} value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder={traduzirUi("Rua, número, bairro...")} /></Campo> : null}
        </div>
        {conflito ? <div className="reserva-warn" role="status"><Icon name="alerta" size={14} /> {traduzirUi("A sala já tem \"{titulo}\" de {inicio} a {fim} nesse dia.", { titulo: conflito.title, inicio: conflito.start_time ?? "", fim: conflito.end_time ?? "" })}</div> : null}
      </FormSection>

      <FormSection title={traduzirUi("Quem participa")}>
        <div className="cand-pick" role="group" aria-label={traduzirUi("Quem participa")}>
          {people.map((person) => {
            const on = presentes.includes(person.id);
            return (
              <Acao key={person.id} className={`cand-chip ${on ? "on" : ""}`} aria-pressed={on} onClick={() => togglePessoa(person.id)}>
                <Av name={person.name} size="xs" photoUrl={person.photoUrl} /> {person.name.split(" ")[0]} {on && <Icon name="ok" size={13} />}
              </Acao>
            );
          })}
          {people.length === 0 ? <span className="fs-note">{ct(traduzirUi("Nenhum {voluntario} cadastrado."))}</span> : null}
        </div>
        {presentes.length ? <p className="fs-note">{traduzirUi("{count, plural, =1 {# pessoa} other {# pessoas}} na reunião.", { count: presentes.length })}</p> : null}
      </FormSection>

      <FormSection title={traduzirUi("Pauta")}>
        <div className="field">
          <textarea className="textarea" aria-label={traduzirUi("Pauta")} aria-describedby={`${fid}-pauta`} placeholder={traduzirUi("ex: Balanço do mês")} value={pauta} onChange={(e) => setPauta(e.target.value)} />
          <div className="field-hint" id={`${fid}-pauta`}>{traduzirUi("Um item por linha.")}</div>
        </div>
      </FormSection>
    </FormScreen>
  );
}

export function Reunioes({ meetings, meetingActions, ministries, people, rooms, reservations, church, setDrawer }: { meetings: MeetingView[]; meetingActions: MeetingActionView[]; ministries: MinistryView[]; people: PersonView[]; rooms: RoomView[]; reservations: ReservationView[]; church: ChurchView | undefined; setDrawer: (drawer: DrawerState) => void }) {
  const traduzirUi = useTexto();

  const ministryById = new Map(ministries.map((ministry) => [ministry.id, ministry]));
  const personById = new Map(people.map((person) => [person.id, person]));
  const scheduled = meetings.filter((meeting) => meeting.status === "agendada");
  const finished = meetings.filter((meeting) => meeting.status === "realizada");
  const [novaOpen, setNovaOpen] = useState(false);
  return (
    <div className="content wide">
      <PageHead title={traduzirUi("Reuniões")} eyebrow={traduzirUi("Liderança")} help={traduzirUi("Pauta, presença e decisões dos encontros de liderança. Cada reunião guarda a ata pra consultar depois.")} action={<Botao variante="principal" onClick={() => setNovaOpen(true)}>{traduzirUi("+ Marcar reunião")}</Botao>} />
      <div className="section-divide"><Icon name="cultos" size={15} /><span className="label">{traduzirUi("Agendadas")}</span><span className="line" /></div>
      <div className="reu-grid">
        {scheduled.map((meeting) => {
          const author = meeting.author_id ? personById.get(meeting.author_id) : null;
          return (
            <Acao className="reu-card" key={meeting.id} onClick={() => setDrawer({ kind: "meeting", id: meeting.id })}>
              <div className="reu-card-top"><div><div className="reu-date">{formatDateBR(meeting.meeting_date) || traduzirUi("Sem data")} · {meeting.time || traduzirUi("sem horário")}</div><div className="reu-title">{meeting.title}</div></div><Selo tom="ok">{traduzirUi("Agendada")}</Selo></div>
              <div className="reu-meta">{joinDot(meeting.location, traduzirUi("marcada por {nome}", { nome: author?.name.split(" ")[0] || traduzirUi("líder") }))}</div>
              <div className="reu-foot"><div className="reu-times">{meeting.ministries.map((id) => <Etiqueta key={id}>{ministryById.get(id)?.name || traduzirUi("Time")}</Etiqueta>)}</div><span className="team-stat">{traduzirUi.rich("<b>{n}</b> presentes", { n: String(meeting.attendees.length), b: (c) => <b>{c}</b> })}</span></div>
            </Acao>
          );
        })}
        {scheduled.length === 0 ? <EmptyState title={traduzirUi("Nenhuma reunião agendada")} text={traduzirUi("As reuniões de liderança e de time aparecem aqui, com pauta e presença.")} action={{ label: traduzirUi("Agendar reunião"), onClick: () => setNovaOpen(true) }} /> : null}
      </div>
      <div className="section-divide"><Icon name="relatorios" size={15} /><span className="label">{traduzirUi("Realizadas")}</span><span className="line" /></div>
      <div className="tbl">
        {finished.map((meeting) => {
          const actions = meetingActions.filter((action) => action.meeting_id === meeting.id);
          const pending = actions.filter((action) => action.status !== "feito").length;
          return (
            <Acao className={`${linhaClasse({ estilo: "tabela" })} click`} key={meeting.id} style={{ gridTemplateColumns: "130px 1.6fr 1fr 120px" }} onClick={() => setDrawer({ kind: "meeting", id: meeting.id })}>
              <div style={{ fontFamily: "var(--mono)", fontSize: "var(--fs-pn-12)", color: "var(--olive)" }}>{formatDateBR(meeting.meeting_date) || traduzirUi("sem data")}</div>
              <div><div className="cell-name">{meeting.title}</div><div className="cell-sub">{traduzirUi("{count, plural, =1 {# time} other {# times}} · {presentes} presentes", { count: meeting.ministries.length, presentes: String(meeting.attendees.length) })}</div></div>
              <div className="cell-sub">{traduzirUi("{count, plural, =1 {# responsabilidade} other {# responsabilidades}}", { count: actions.length })}</div>
              <div>{pending > 0 ? <Selo tom="pendente">{traduzirUi("{n} em aberto", { n: String(pending) })}</Selo> : <Selo tom="ok">{traduzirUi("Tudo feito")}</Selo>}</div>
            </Acao>
          );
        })}
      </div>
      {novaOpen ? <ReuniaoForm ministries={ministries} people={people} rooms={rooms} reservations={reservations} church={church} onClose={() => setNovaOpen(false)} /> : null}
    </div>
  );
}

export function Ensaios({ rehearsals, ministries, rooms, setDrawer, setModal }: { rehearsals: RehearsalView[]; ministries: MinistryView[]; rooms: RoomView[]; setDrawer: (drawer: DrawerState) => void; setModal: (modal: ModalState) => void }) {
  const traduzirUi = useTexto();

  const ministryById = new Map(ministries.map((ministry) => [ministry.id, ministry]));
  const localOptions = [...rooms.filter((room) => room.allows_meetings !== false).map((room) => ({ v: room.name, l: room.capacity ? traduzirUi("{sala} · {capacidade} lug.", { sala: room.name, capacidade: String(room.capacity) }) : room.name })), { v: OUTRO_LOCAL, l: traduzirUi("Outro espaço (fora da igreja)") }];
  return (
    <div className="content wide">
      <PageHead title={traduzirUi("Ensaios")} eyebrow={traduzirUi("Liderança")} help={traduzirUi("Ensaios de louvor, teatro, dança... com participantes e repertório ou materiais anexados.")} action={<Botao variante="principal" onClick={() => setModal({ eyebrow: traduzirUi("Criar"), title: traduzirUi("Novo ensaio"), subtitle: traduzirUi("Louvor, teatro, dança… Escolha quem participa e defina o repertório."), saveLabel: traduzirUi("Criar ensaio"), formFields: [{ k:"titulo", label:traduzirUi("Nome do ensaio"), type:"text", req:true, ph:traduzirUi("ex: Ensaio do Louvor, Peça de Natal") }, { k:"tipo", label:traduzirUi("Tipo de ensaio"), type:"select", half:true, options:[{v:"louvor",l:traduzirUi("Louvor / música")},{v:"teatro",l:traduzirUi("Teatro")},{v:"danca",l:traduzirUi("Dança")},{v:"coreografia",l:traduzirUi("Coreografia")},{v:"geral",l:traduzirUi("Geral")},{v:"outro",l:traduzirUi("Outro")}] }, { k:"time", label:traduzirUi("Ministério"), type:"text", half:true, ph:traduzirUi("ex: Louvor") }, { k:"data", label:traduzirUi("Dia"), type:"date", half:true }, { k:"hora", label:traduzirUi("Horário"), type:"time", half:true }, { k:"local", label:traduzirUi("Local"), type:"select", req:true, half:true, ph:traduzirUi("Selecione um espaço cadastrado"), options: localOptions }, { k:"endereco", label:traduzirUi("Endereço do espaço"), type:"text", half:true, ph:traduzirUi("Rua, número, bairro..."), showIf:{field:"local",equals:OUTRO_LOCAL} }, { k:"recorrencia", label:traduzirUi("Recorrência"), type:"select", half:true, options:[{v:"semanal",l:traduzirUi("Semanal")},{v:"quinzenal",l:traduzirUi("Quinzenal")},{v:"mensal",l:traduzirUi("Mensal")},{v:"eventual",l:traduzirUi("Eventual")}] }, { k:"obs", label:traduzirUi("Observação"), type:"area", ph:traduzirUi("Detalhes do ensaio") }], action: { kind: "rehearsal" } })}>{traduzirUi("+ Novo ensaio")}</Botao>} />
      <div className="reu-grid">
        {rehearsals.map((rehearsal) => {
          const ministry = rehearsal.ministry_id ? ministryById.get(rehearsal.ministry_id) : null;
          return (
            <Acao className="ens-card" key={rehearsal.id} onClick={() => setDrawer({ kind: "rehearsal", id: rehearsal.id })}>
              <div className="ens-top"><span className="ens-rec">{rehearsal.recurrence || traduzirUi("eventual")}</span><span className="ens-pub">{rehearsal.kind || traduzirUi("Ensaio")}</span></div>
              <div className="ens-title">{rehearsal.title}</div>
              <div className="ens-when">{formatDateBR(rehearsal.rehearsal_date) || traduzirUi("sem data")} · {rehearsal.time || traduzirUi("sem horário")} · {rehearsal.location || traduzirUi("sem local")}</div>
              <div className="ens-team"><span className="ens-team-ic"><Icon name="times" size={15} /></span>{traduzirUi("{time} · {n} pessoas", { time: ministry?.name || traduzirUi("Vários times"), n: String(rehearsal.attendees.length) })}</div>
              {rehearsal.repertoire.length ? <div className="ens-obs"><Icon name="cultos" size={13} /> {traduzirUi("{count, plural, =1 {{n} item(ns) no repertório} other {{n} item(ns) no repertório}}", { count: rehearsal.repertoire.length, n: String(rehearsal.repertoire.length) })}</div> : null}
              {rehearsal.notes ? <div className="ens-obs">{rehearsal.notes}</div> : null}
            </Acao>
          );
        })}
        {rehearsals.length === 0 ? <EmptyState title={traduzirUi("Nenhum ensaio ainda")} text={traduzirUi("Os ensaios aparecem aqui com participantes, repertório e materiais.")} /> : null}
      </div>
    </div>
  );
}

export const cardColumnStatus = (t: Text): Record<string, { label: string; cls: string }> => ({
  todo: { label: t("A fazer"), cls: "chip-wait" },
  doing: { label: t("Em andamento"), cls: "chip-wait" },
  done: { label: t("Concluído"), cls: "chip-ok" },
});

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
  const traduzirUi = useTexto();

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
        <BotaoIcone className="drawer-close" rotulo={traduzirUi("Fechar")} onClick={onClose}>✕</BotaoIcone>
        <div className="ph-eyebrow" style={{ marginBottom: 8 }}>{meeting.status === "agendada" ? traduzirUi("Reunião agendada") : traduzirUi("Reunião realizada")}</div>
        <div className="profile-name">{meeting.title}</div>
        <div className="profile-role">{formatDateBR(meeting.meeting_date) || traduzirUi("sem data")} · {meeting.time || ""} · {meeting.location || traduzirUi("sem local")}</div>
      </div>
      <div className="drawer-body">
        <DrawerSection title={traduzirUi("Times e presentes")}>
          <div className="cell-tags" style={{ marginBottom: 12 }}>
            {meeting.ministries.map((id) => <Etiqueta key={id}>{ministryById.get(id)?.name || traduzirUi("Time")}</Etiqueta>)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {meeting.attendees.map((pid) => {
              const p = personById.get(pid);
              return p ? (
                <div className="cand" key={pid}>
                  <Av name={p.name} size="sm" photoUrl={p.photoUrl} />
                  <div className="cand-main"><div className="cand-name">{p.name}</div><div className="cand-meta">{p.tags.join(" · ") || traduzirUi("Participante")}</div></div>
                </div>
              ) : null;
            })}
            {meeting.attendees.length === 0 && <div style={{ fontSize: "var(--fs-pn-13)", color: "var(--muted)" }}>{traduzirUi("Nenhum presente registrado.")}</div>}
          </div>
        </DrawerSection>

        {pauta.length > 0 && (
          <DrawerSection title={traduzirUi("Pauta")}>
            <div className="step-stack">
              {pauta.map((item, i) => (
                <div className="step-do" key={i}>
                  <span className="step-ic">{String(i + 1).padStart(2, "0")}</span> {item}
                </div>
              ))}
            </div>
          </DrawerSection>
        )}

        <DrawerSection title={traduzirUi("Ata · o que foi discutido")}>
          <textarea
            className="textarea"
            style={{ minHeight: 90 }}
            placeholder={traduzirUi("Registre as decisões e os pontos principais da reunião...")}
            value={ata}
            onChange={(e) => setAta(e.target.value)}
          />
        </DrawerSection>

        <DrawerSection title={traduzirUi("Responsabilidades · anote durante a reunião")}>
          <div className="reu-quadro-note" style={{ marginBottom: 12 }}>{traduzirUi.rich("Cada responsabilidade vira um <b>card no quadro</b>. O andamento é acompanhado lá.", { b: (c) => <b>{c}</b> })}</div>
          {actions.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              {actions.map((action) => {
                const assignee = action.assignee_id ? personById.get(action.assignee_id) : null;
                const card = cardFor(action.id);
                const CARD_COLUMN_STATUS = cardColumnStatus(traduzirUi);
                const cardStatus = card ? (CARD_COLUMN_STATUS[card.column_id] ?? CARD_COLUMN_STATUS.todo) : null;
                return (
                  <div className="acao-row" key={action.id}>
                    <div className="acao-main">
                      <div className="acao-o">{action.description}</div>
                      <div className="acao-quem">{assignee?.name.split(" ")[0] ?? traduzirUi("a definir")}</div>
                    </div>
                    <div className="acao-side">
                      {card && cardStatus ? (
                        <>
                          <Selo tom={tomDaClasse(cardStatus.cls)}>{cardStatus.label}</Selo>
                          <Botao variante="discreto" compacto onClick={() => { onClose(); setRoute("quadros"); }}>{traduzirUi("Ver no quadro")}</Botao>
                        </>
                      ) : (
                        <>
                          <span className="acao-semquadro">{traduzirUi("fora do quadro")}</span>
                          <Botao variante="discreto" compacto onClick={() => setChooser({ scope: action.id })}>{traduzirUi("Para o quadro")}</Botao>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="acao-add">
            <input className="input" placeholder={traduzirUi("O que ficou combinado (ex: Revisar escala de julho)")} value={novaDescricao} onChange={(e) => setNovaDescricao(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addAcao()} />
            <Selecao className="acao-add-quem" rotulo={traduzirUi("Responsável")} valor={novoResponsavel} aoMudar={setNovoResponsavel} vazio={traduzirUi("Responsável…")} opcoes={meeting.attendees.flatMap((pid) => { const p = personById.get(pid); return p ? [{ v: pid, l: p.name }] : []; })} />
            <Botao compacto onClick={addAcao}>{traduzirUi("+ Anotar")}</Botao>
          </div>
          {pendentes.length > 0 && (
            <Botao variante="discreto" compacto style={{ marginTop: 10 }} onClick={() => setChooser({ scope: "all" })}>{traduzirUi("Todas ao quadro")}</Botao>
          )}
        </DrawerSection>

        <Botao
          variante="principal"
          style={{ width: "100%", justifyContent: "center", marginTop: 20 }}
          desativado={saving}
          onClick={salvarAta}
        >
          {saving ? traduzirUi("Salvando...") : meeting.status === "agendada" ? traduzirUi("Salvar ata e marcar realizada") : traduzirUi("Salvar ata")}
        </Botao>
      </div>
    </DrawerShell>
    {chooser ? (
      <BoardChooser
        title={chooser.scope === "all" ? traduzirUi("Onde colocar as responsabilidades?") : traduzirUi("Mandar para qual quadro?")}
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
  const traduzirUi = useTexto();

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
        <BotaoIcone className="drawer-close" rotulo={traduzirUi("Fechar")} onClick={onClose}>✕</BotaoIcone>
        <div className="ph-eyebrow" style={{ marginBottom: 8 }}>{rehearsal.kind || traduzirUi("Ensaio")} · {rehearsal.recurrence || traduzirUi("eventual")}</div>
        <div className="profile-name">{rehearsal.title}</div>
        <div className="profile-role">{formatDateBR(rehearsal.rehearsal_date) || traduzirUi("sem data")} · {rehearsal.time || ""} · {rehearsal.location || traduzirUi("sem local")}{rehearsal.audience ? " · " + rehearsal.audience : ""}</div>
      </div>
      <div className="drawer-body">
        {ministry && (
          <DrawerSection title={traduzirUi("Time")}>
            <div className="cell-tags"><Etiqueta destaque>{ministry.name}</Etiqueta></div>
          </DrawerSection>
        )}

        {rehearsal.attendees.length > 0 && (
          <DrawerSection title={traduzirUi("Quem participa · {n}", { n: String(rehearsal.attendees.length) })}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {rehearsal.attendees.map((pid) => {
                const p = personById.get(pid);
                return p ? (
                  <div className="cand" key={pid}>
                    <Av name={p.name} size="sm" photoUrl={p.photoUrl} />
                    <div className="cand-main"><div className="cand-name">{p.name}</div><div className="cand-meta">{p.tags.join(" · ") || traduzirUi("Participante")}</div></div>
                  </div>
                ) : null;
              })}
            </div>
          </DrawerSection>
        )}

        {repertoire.length > 0 && (
          <DrawerSection title={traduzirUi("Repertório · {n}", { n: String(repertoire.length) })}>
            <div className="setlist-list">
              {repertoire.map((song, i) => (
                <div className="setlist-row" key={i}>
                  <span className="setlist-n">{String(i + 1).padStart(2, "0")}</span>
                  <span className="setlist-titulo">{song.titulo}</span>
                  {song.tom && <span className="setlist-tom">{song.tom}</span>}
                  {song.youtube && <a className="setlist-link" href={song.youtube} target="_blank" rel="noreferrer">{traduzirUi("vídeo")}</a>}
                  {song.cifra && <a className="setlist-link" href={song.cifra} target="_blank" rel="noreferrer">{traduzirUi("cifra")}</a>}
                </div>
              ))}
            </div>
          </DrawerSection>
        )}

        {attachments.length > 0 && (
          <DrawerSection title={traduzirUi("Materiais")}>
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
          <DrawerSection title={traduzirUi("Observação")}>
            <p style={{ fontSize: "var(--fs-pn-14)", color: "var(--muted)", lineHeight: 1.6 }}>{rehearsal.notes}</p>
          </DrawerSection>
        )}
      </div>
    </DrawerShell>
  );
}
