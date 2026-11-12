"use client";

import { REPETICOES, TETO_SERIE } from "../../lib/recorrencia";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { Icon } from "../../lib/icons";
import { useRelogioDaIgreja } from "../../lib/relogio-context";
import { formatDateBR, joinDot, parseISODate, toISODate } from "../../lib/date";
import { KidsQRModal } from "../../KidsCheckin";

import { useTermos } from "../../lib/vocabulario-context";
import { EmptyState, PageHead } from "../ui";
import { DP_MESES, OUTRO_LOCAL, dpToIsoDate, findRoomConflict, parseFlexDate } from "../comum";
import { DatePicker, TimePicker } from "../campos";
import type { CalEvent, ChildView, ChurchView, DrawerState, EventView, KidsClassView, KidsSessionView, MinistryView, ModalState, ReservationView, RoomView } from "../tipos";

import { Botao } from "../../ui/Botao";
import { Acao } from "../../ui/Acao";
import { Opcao } from "../../ui/Opcao";
import { Cartao, cartaoClasse } from "../../ui/Cartao";
import { Linha } from "../../ui/Linha";
import { Etiqueta } from "../../ui/Selo";
import { Segmentado } from "../../ui/Segmentado";
import { Campo, Entrada } from "../../ui/Campo";
import { Selecao } from "../../ui/Selecao";
import { Vazio } from "../../ui/Estados";
import { Janela } from "../../ui/Janela";
import { MenuAcoes } from "../../ui/Menu";
import { useTexto } from "../../lib/internacional/contexto";
import type { Text } from "../../lib/internacional/mensagens";

/* Escalas : módulo em modules/escalas/ (4.1) */

export function Cultos({ events, ministries, church, kidsClasses, kidsSessions, kidsChildren, rooms, setDrawer, setModal, setCheckinEventId, setShareEventId }: { events: EventView[]; ministries: MinistryView[]; church?: ChurchView; kidsClasses: KidsClassView[]; kidsSessions: KidsSessionView[]; kidsChildren: ChildView[]; rooms: RoomView[]; setDrawer: (drawer: DrawerState) => void; setModal: (modal: ModalState) => void; setCheckinEventId: (id: string) => void; setShareEventId: (id: string) => void }) {
  const traduzirUi = useTexto();

  const { todayISO } = useRelogioDaIgreja();
  const { comTermos: ct } = useTermos();
  const [kidsModal, setKidsModal] = useState<{ eventId: string; classId: string } | null>(null);
  /* visão de semana (lista da semana escolhida) ou de mês (calendário) */
  const [vista, setVista] = useState<"semana" | "mes">("semana");
  const [semanaOffset, setSemanaOffset] = useState(0);
  const inicioSemana = (() => { const h = parseISODate(todayISO())!; h.setDate(h.getDate() - h.getDay() + semanaOffset * 7); return h; })();
  const fimSemana = new Date(inicioSemana.getFullYear(), inicioSemana.getMonth(), inicioSemana.getDate() + 6);
  const daSemana = events.filter((e) => { const d = parseISODate(e.eventDate); return d && d >= inicioSemana && d <= fimSemana; });
  const rotuloSemana = semanaOffset === 0 ? traduzirUi("Esta semana") : semanaOffset === 1 ? traduzirUi("Próxima semana") : semanaOffset === -1 ? traduzirUi("Semana passada") : traduzirUi("{inicio} a {fim}", { inicio: formatDateBR(toISODate(inicioSemana)), fim: formatDateBR(toISODate(fimSemana)) });
  const meetingRooms = rooms.filter((room) => room.allows_meetings !== false);
  const localOptions = [...meetingRooms.map((room) => ({ v: room.name, l: room.capacity ? traduzirUi("{sala} · {capacidade} lug.", { sala: room.name, capacidade: String(room.capacity) }) : room.name })), { v: OUTRO_LOCAL, l: traduzirUi("Outro espaço (fora da igreja)") }];
  const tipoOptions = [
    { v: "Culto", l: traduzirUi("Culto") },
    { v: "Evento", l: traduzirUi("Evento") },
    { v: "Treinamento", l: traduzirUi("Treinamento") },
    { v: "Retiro", l: traduzirUi("Retiro") },
    ...(church?.settings?.tiposEvento ?? []).map((t) => ({ v: t, l: t })),
  ];
  return (
    <div className="content">
      <PageHead title={ct(traduzirUi("{Cultos} e Agenda"))} eyebrow={traduzirUi("Operação")} help={ct(traduzirUi("Seus {cultos} e eventos ficam aqui. Cada um pode virar uma escala, ganhar roteiro e setlist."))} action={<Botao variante="principal" onClick={() => setModal({ eyebrow: traduzirUi("Criar"), title: ct(traduzirUi("Novo {culto} ou evento")), subtitle: traduzirUi("Agenda da igreja: o que é, quando acontece e quem serve."), saveLabel: traduzirUi("Criar na agenda"), formFields: [{ k:"nome", label:traduzirUi("Nome"), type:"text", req:true, ph:ct(traduzirUi("ex: {Culto} da Manhã, Conferência de Jovens")) }, { k:"tipo", label:traduzirUi("Tipo de evento"), type:"select", half:true, options:tipoOptions }, { k:"local", label:traduzirUi("Local"), type:"select", req:true, half:true, ph:traduzirUi("Selecione um espaço cadastrado"), options: localOptions }, { k:"endereco", label:traduzirUi("Endereço do espaço"), type:"text", half:true, ph:traduzirUi("Rua, número, bairro..."), showIf:{field:"local",equals:OUTRO_LOCAL} }, { k:"data", label:traduzirUi("Data"), type:"date", fullDate:true, req:true, half:true, hint:traduzirUi("Dia, mês e ano do encontro.") }, { k:"hora", label:traduzirUi("Horário de início"), type:"time", req:true, half:true }, { k:"repete", label:traduzirUi("Repete"), type:"select", value:"nao", options: REPETICOES.map((r) => ({ v: r.id, l: r.rotulo })) }, { k:"ate", label:traduzirUi("Repete até"), type:"date", fullDate:true, half:true, showIf:{ field:"repete", notEquals:"nao" }, hint:traduzirUi("Cria até {teto} encontros de uma vez. Dá para repetir mais depois.", { teto: String(TETO_SERIE) }) }], action: { kind: "event" } })}>{ct(traduzirUi("+ Novo {culto}"))}</Botao>} />
      <div className="toolbar cultos-tb">
        <Segmentado>
          <Opcao marcada={vista === "semana"} onClick={() => setVista("semana")}>{traduzirUi("Semana")}</Opcao>
          <Opcao marcada={vista === "mes"} onClick={() => setVista("mes")}>{traduzirUi("Mês")}</Opcao>
        </Segmentado>
        {vista === "semana" && (
          <div className="cultos-nav">
            <Botao compacto aria-label={traduzirUi("Semana anterior")} onClick={() => setSemanaOffset((o) => o - 1)}><Icon name="voltar" size={14} /></Botao>
            <span className="cultos-nav-l">{rotuloSemana}</span>
            <Botao compacto aria-label={traduzirUi("Próxima semana")} onClick={() => setSemanaOffset((o) => o + 1)}><Icon name="avancar" size={14} /></Botao>
          </div>
        )}
      </div>
      {vista === "mes" ? (
        <Cartao><div className="panel-body">
          <MiniCalendar events={events.map((e) => ({ date: parseISODate(e.eventDate) ?? new Date(), label: e.name, sub: joinDot(e.time, e.location), onClick: () => setDrawer({ kind: "event", id: e.id }) }))} />
        </div></Cartao>
      ) : daSemana.length === 0 ? (
        <EmptyState title={traduzirUi("Nada nesta semana")} text={ct(traduzirUi("Os {cultos} e eventos marcados para esta semana aparecem aqui."))} />
      ) : null}
      {vista === "semana" && <div className="grid-2">
        {daSemana.map((event) => (
          <Cartao key={event.id} style={{ position: "relative" }}>
            <Acao className={`${cartaoClasse({})} click`} style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: 0 }} onClick={() => setDrawer({ kind: "event", id: event.id })}>
              <div className="panel-head"><span className="panel-title"><Icon name="cultos" size={14} /> {event.name}</span><span className="panel-meta">{event.time}</span></div>
              <div className="panel-body"><p className="mini-sub">{joinDot(event.weekday, formatDateBR(event.eventDate), event.location)}</p><div className="divider" style={{ margin: "14px 0" }} />{event.schedule.slice(0, 4).map((item) => <Linha key={item.id} style={{ paddingInline: 0 }}><div className="mini-main"><div className="mini-title">{item.item}</div><div className="mini-sub">{item.time ?? traduzirUi("sem horário")} · {item.category ?? traduzirUi("roteiro")}</div></div></Linha>)}<div className="mini-sub">{event.ministries.map((id) => ministries.find((ministry) => ministry.id === id)?.name).filter(Boolean).join(" · ")}</div></div>
            </Acao>
            <div style={{ padding: "0 22px 16px", display: "flex", gap: 8 }}>
              <Botao compacto onClick={(e) => { e.stopPropagation(); setCheckinEventId(event.id); }}>
                <Icon name="cultos" size={13} /> {traduzirUi("Check-in QR")}
              </Botao>
              <Botao compacto onClick={(e) => { e.stopPropagation(); setShareEventId(event.id); }}>
                <Icon name="relatorios" size={13} /> {traduzirUi("Arte")}
              </Botao>
              {kidsClasses.length > 0 && (
                <div onClick={(e) => e.stopPropagation()}>
                  <MenuAcoes compacto rotulo={traduzirUi("Abrir turma Kids")} gatilho={<><Icon name="kids" size={13} /> {traduzirUi("Kids")}</>}
                    itens={kidsClasses.map((kc) => ({ rotulo: kc.name, icone: "kids", onClick: () => setKidsModal({ eventId: event.id, classId: kc.id }) }))} />
                </div>
              )}
            </div>
          </Cartao>
        ))}
      </div>}
      {kidsModal && church && (() => {
        const event = events.find((e) => e.id === kidsModal.eventId);
        const kidsClass = kidsClasses.find((kc) => kc.id === kidsModal.classId);
        if (!event || !kidsClass) return null;
        const session = kidsSessions.find((s) => s.event_id === event.id && s.class_id === kidsClass.id) ?? null;
        return (
          <KidsQRModal
            event={{ id: event.id, organizationId: church.organizationId, name: event.name, weekday: event.weekday, eventDate: event.eventDate, time: event.time }}
            kidsClass={{ id: kidsClass.id, name: kidsClass.name }}
            session={session}
            kidsChildren={kidsChildren}
            onClose={() => setKidsModal(null)}
          />
        );
      })()}
    </div>
  );
}

/* nomes do calendário vêm do catálogo; as iniciais são uma frase só porque letras iguais
   em pt-BR (S, Q) não são iguais em outros idiomas */
export const calMesesFull = (t: Text) => [t("Janeiro"), t("Fevereiro"), t("Março"), t("Abril"), t("Maio"), t("Junho"), t("Julho"), t("Agosto"), t("Setembro"), t("Outubro"), t("Novembro"), t("Dezembro")];
export const calSem = (t: Text) => t("D S T Q Q S S").split(" ");
/* abreviações só para exibir; o valor entregue ao onAdd continua de DP_MESES */
const calMesesCurtos = (t: Text) => t("jan fev mar abr mai jun jul ago set out nov dez").split(" ");

/* calendário mensal reaproveitável (perfil da pessoa e Espaços & Salas). */
export function MiniCalendar({ events, onAdd }: { events: CalEvent[]; onAdd?: (dateStr: string) => void }) {
  const traduzirUi = useTexto();
  const CAL_MESES_FULL = calMesesFull(traduzirUi);

  const { todayISO } = useRelogioDaIgreja();
  const initial = events[0]?.date ?? parseISODate(todayISO())!;
  const [year, setYear] = useState(initial.getFullYear());
  const [month, setMonth] = useState(initial.getMonth());
  const [selDay, setSelDay] = useState<number | null>(null);

  const changeMonth = (delta: number) => {
    let m = month + delta, y = year;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setMonth(m); setYear(y); setSelDay(null);
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = new Date(year, month, 1).getDay();
  const byDay = new Map<number, CalEvent[]>();
  events.forEach((e) => {
    if (e.date.getFullYear() === year && e.date.getMonth() === month) {
      const d = e.date.getDate();
      byDay.set(d, [...(byDay.get(d) ?? []), e]);
    }
  });
  const cells: Array<number | null> = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const selEvents = selDay ? byDay.get(selDay) ?? [] : [];

  return (
    <div className="cal">
      <div className="cal-head">
        <Acao className="cal-nav" onClick={() => changeMonth(-1)}>‹</Acao>
        <span className="cal-title">{CAL_MESES_FULL[month]} {year}</span>
        <Acao className="cal-nav" onClick={() => changeMonth(1)}>›</Acao>
      </div>
      <div className="cal-grid">
        {calSem(traduzirUi).map((s, i) => <span key={`h${i}`} className="cal-dow">{s}</span>)}
        {cells.map((d, i) => {
          if (!d) return <span key={`e${i}`} className="cal-cell empty" />;
          const has = byDay.get(d);
          return (
            <Acao key={`d${d}`} className={`cal-cell${has ? " has" : ""}${selDay === d ? " sel" : ""}`} onClick={() => setSelDay(d)}>
              <span className="cal-num">{d}</span>
              {has && <span className="cal-dots">{has.slice(0, 3).map((e, k) => <i key={k} className={`cal-dot${e.tone === "amber" ? " amber" : ""}`} />)}</span>}
            </Acao>
          );
        })}
      </div>
      <div className="cal-agenda">
        {!selDay && <div className="cal-agenda-empty">{traduzirUi("Toque num dia para ver os compromissos.")}</div>}
        {selDay && selEvents.length === 0 && <div className="cal-agenda-empty">{traduzirUi("Nada em {dia} de {mes}.", { dia: String(selDay), mes: CAL_MESES_FULL[month] })}</div>}
        {selEvents.map((e, i) => (
          <Acao key={i} className="cal-ev" onClick={() => e.onClick?.()}>
            <span className={`cal-ev-bar${e.tone === "amber" ? " amber" : ""}`} />
            <div className="cal-ev-main">
              <div className="cal-ev-label">{e.label}</div>
              {e.sub && <div className="cal-ev-sub">{e.sub}</div>}
            </div>
          </Acao>
        ))}
        {selDay && onAdd && <Acao className="cal-add" onClick={() => onAdd(`${selDay} ${DP_MESES[month].toLowerCase()}`)}>{traduzirUi("+ Reservar em {dia} {mes}", { dia: String(selDay), mes: calMesesCurtos(traduzirUi)[month] })}</Acao>}
      </div>
    </div>
  );
}

export const RESERVA_TONE: Record<string, "olive" | "amber"> = { reuniao: "olive", ensaio: "olive", evento: "amber", treinamento: "olive", outro: "olive" };
export const reservaTipos = (t: Text) => [{ v: "reuniao", l: t("Reunião") }, { v: "ensaio", l: t("Ensaio") }, { v: "evento", l: t("Evento") }, { v: "treinamento", l: t("Treinamento") }, { v: "outro", l: t("Outro") }];

export function Espacos({ rooms, reservations, church, setModal, embed }: { rooms: RoomView[]; reservations: ReservationView[]; church?: ChurchView; setModal: (modal: ModalState) => void; embed?: boolean }) {
  const traduzirUi = useTexto();

  const { comTermos: ct } = useTermos();
  const [filter, setFilter] = useState("todas");
  const [reservar, setReservar] = useState<{ salaInicial?: string; dataInicial?: string } | null>(null);
  const roomById = new Map(rooms.map((room) => [room.id, room]));
  const visibleReservations = reservations.filter((reservation) => filter === "todas" || reservation.room_id === filter);
  const openNewRoom = () => setModal({ eyebrow: traduzirUi("Criar"), title: traduzirUi("Nova sala / espaço"), subtitle: ct(traduzirUi("Um espaço físico da igreja disponível para reservas. Todo {culto}, ensaio, reunião ou evento passa a escolher o local aqui, com capacidade sempre visível.")), saveLabel: traduzirUi("Criar sala"), formFields: [{ k:"nome", label:traduzirUi("Nome do espaço"), type:"text", req:true, ph:traduzirUi("ex: Sala 3, Salão de festas") }, { k:"capacidade", label:traduzirUi("Capacidade (pessoas)"), type:"text", half:true, ph:traduzirUi("ex: 30") }, { k:"local", label:traduzirUi("Onde fica"), type:"text", half:true, ph:traduzirUi("ex: 1º andar, Anexo") }, { k:"recursos", label:traduzirUi("Recursos disponíveis"), type:"text", ph:traduzirUi("Som, Projeção, Piano"), hint:traduzirUi("Separe por vírgula.") }, { k:"permiteReuniao", label:ct(traduzirUi("Serve pra reunião/{culto}/ensaio de adultos?")), type:"toggle", value:"true", onLabel:traduzirUi("Sim"), offLabel:traduzirUi("Não (ex: Berçário)") }], action: { kind: "room" } });
  const openNewReservation = () => setReservar({ salaInicial: filter !== "todas" ? filter : undefined });
  const header = embed ? (
    <div className="cfg-card-head-row">
      <div>
        <div className="cfg-card-t">{traduzirUi("Espaços & reservas")}</div>
        <div className="cfg-card-s">{traduzirUi("Salas da igreja e quem usa cada espaço. Reuniões, eventos, cursos e ensaios reservam aqui sem misturar agenda.")}</div>
      </div>
      <div className="ph-actions">
        <Botao compacto onClick={openNewRoom}>{traduzirUi("+ Nova sala")}</Botao>
        <Botao variante="principal" compacto onClick={openNewReservation}>{traduzirUi("+ Reservar")}</Botao>
      </div>
    </div>
  ) : (
    <PageHead
      title={traduzirUi("Espaços e reservas")}
      eyebrow={traduzirUi("Operação")}
      help={ct(traduzirUi("Cadastre as salas e espaços físicos da igreja. Reuniões, ensaios e {cultos} reservam um espaço daqui pra não haver choque de agenda."))}
      action={<><Botao onClick={openNewRoom}>{traduzirUi("+ Nova sala")}</Botao><Botao variante="principal" onClick={openNewReservation}>{traduzirUi("+ Reservar espaço")}</Botao></>}
    />
  );
  const calEvents: CalEvent[] = visibleReservations.map((reservation): CalEvent | null => {
    const room = roomById.get(reservation.room_id);
    const date = parseFlexDate(reservation.reserved_date);
    return date ? {
      date,
      label: reservation.title,
      sub: traduzirUi("{sala} · {inicio} até {fim}", { sala: room?.name || traduzirUi("Sala"), inicio: reservation.start_time || traduzirUi("sem início"), fim: reservation.end_time || traduzirUi("sem fim") }),
      tone: RESERVA_TONE[reservation.kind || "outro"] ?? "olive",
    } : null;
  }).filter((e): e is CalEvent => e !== null);
  const inner = (
    <>
      {header}
      <div className="sala-grid">
        {rooms.map((room) => {
          const count = reservations.filter((reservation) => reservation.room_id === room.id).length;
          return <Acao key={room.id} className={`sala-card ${filter === room.id ? "on" : ""}`} onClick={() => setFilter(filter === room.id ? "todas" : room.id)}><div className="sala-card-top"><span className="sala-mark"><Icon name="config" size={18} /></span><span className="sala-cap">{room.capacity == null ? traduzirUi("Capacidade desconhecida") : traduzirUi.rich("{capacidade} <small>lugares</small>", { capacidade: String(room.capacity), small: (c) => <small>{c}</small> })}</span></div><div className="sala-nome">{room.name}</div>{room.location ? <div className="sala-local">{room.location}</div> : null}{room.resources.length ? <div className="sala-rec">{room.resources.map((resource) => <Etiqueta key={resource}>{resource}</Etiqueta>)}</div> : null}<div className="sala-foot">{traduzirUi("{count, plural, =1 {# reserva} other {# reservas}}", { count })}{room.allows_meetings === false ? traduzirUi(" · não serve pra reunião") : ""}</div></Acao>;
        })}
        {rooms.length === 0 ? <Vazio titulo={traduzirUi("Nenhuma sala cadastrada ainda.")} /> : null}
      </div>
      <div className="esp-cal-wrap" style={{ marginTop: 20 }}>
        <div className="toolbar" style={{ marginBottom: 12 }}>
          <span className="panel-meta">{filter !== "todas" ? traduzirUi.rich("Calendário de reservas · <b>{sala}</b>", { sala: roomById.get(filter)?.name ?? "", b: (c) => <b style={{ color: "var(--light)" }}>{c}</b> }) : traduzirUi("Calendário de reservas")}</span>
          <div className="tb-spacer" />
          {filter !== "todas" && <Botao variante="discreto" compacto onClick={() => setFilter("todas")}>{traduzirUi("Ver salas")}</Botao>}
        </div>
        <MiniCalendar events={calEvents} onAdd={(dataStr) => setReservar({ salaInicial: filter !== "todas" ? filter : undefined, dataInicial: dataStr })} />
        <div className="cal-legend">
          {reservaTipos(traduzirUi).map((t) => <span key={t.v} className="cal-legend-i"><i className={`cal-dot ${RESERVA_TONE[t.v] === "amber" ? "amber" : ""}`} />{t.l}</span>)}
        </div>
      </div>
      {reservar && church && <ReservaModal rooms={rooms} reservations={reservations} church={church} salaInicial={reservar.salaInicial} dataInicial={reservar.dataInicial} onClose={() => setReservar(null)} />}
    </>
  );
  return embed ? inner : <div className="content wide">{inner}</div>;
}

export function ReservaModal({ rooms, reservations, church, salaInicial, dataInicial, onClose }: { rooms: RoomView[]; reservations: ReservationView[]; church: ChurchView; salaInicial?: string; dataInicial?: string; onClose: () => void }) {
  const traduzirUi = useTexto();

  const router = useRouter();
  const [tipo, setTipo] = useState("reuniao");
  const [salaId, setSalaId] = useState(salaInicial || rooms.filter((room) => room.allows_meetings !== false)[0]?.id || "");
  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState(dataInicial || "");
  const [inicio, setInicio] = useState("19h00");
  const [fim, setFim] = useState("21h00");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isoDate = data ? dpToIsoDate(data) : null;
  const conflito = salaId && isoDate ? findRoomConflict(reservations, salaId, isoDate, inicio, fim) : null;
  const roomsForTipo = tipo === "reuniao" ? rooms.filter((room) => room.allows_meetings !== false) : rooms;

  const salvar = async () => {
    if (!titulo.trim()) { setError(traduzirUi("Dê um nome ao compromisso.")); return; }
    if (!salaId) { setError(traduzirUi("Selecione uma sala.")); return; }
    if (!isoDate) { setError(traduzirUi("Escolha o dia no calendário.")); return; }
    if (conflito) { setError(traduzirUi("Já existe \"{titulo}\" nesta sala em {inicio} a {fim}.", { titulo: conflito.title, inicio: String(conflito.start_time), fim: String(conflito.end_time) })); return; }
    setSaving(true);
    setError("");
    await createServiceBrowserClient().schema("service").from("reservations").insert({
      organization_id: church.organizationId,
      room_id: salaId,
      title: titulo.trim(),
      kind: tipo,
      reserved_date: isoDate,
      start_time: inicio,
      end_time: fim,
    });
    router.refresh();
    onClose();
  };

  return (
    <Janela larga sobretitulo={traduzirUi("Reservar espaço")} titulo={traduzirUi("Novo compromisso na sala")} texto={traduzirUi("Não deixamos duas reservas se cruzarem no mesmo espaço e horário.")} aoFechar={onClose} ocupada={saving}
      rodape={<>
        <Botao onClick={onClose}>{traduzirUi("Cancelar")}</Botao>
        <Botao variante="principal" desativado={saving || !!conflito || !salaId} onClick={salvar}>{traduzirUi("Reservar")}</Botao>
      </>}>
      <Campo rotulo={traduzirUi("Título")}><Entrada placeholder={traduzirUi("ex: Reunião de líderes")} value={titulo} onChange={(e) => setTitulo(e.target.value)} /></Campo>
      <Campo rotulo={traduzirUi("Sala")} className="field-half">
        <Selecao valor={salaId} aoMudar={setSalaId} vazio={traduzirUi("Selecione uma sala")} opcoes={roomsForTipo.map((room) => ({ v: room.id, l: room.capacity ? traduzirUi("{sala} · {capacidade} lug.", { sala: room.name, capacidade: String(room.capacity) }) : room.name }))} />
      </Campo>
      <Campo rotulo={traduzirUi("Tipo")} className="field-half">
        <Selecao valor={tipo} aoMudar={(nextTipo) => { setTipo(nextTipo); const allowed = nextTipo === "reuniao" ? rooms.filter((room) => room.allows_meetings !== false) : rooms; if (!allowed.some((room) => room.id === salaId)) setSalaId(""); }} opcoes={reservaTipos(traduzirUi).map((t) => ({ v: t.v, l: t.l }))} />
      </Campo>
      <div className="field field-half"><label className="field-label">{traduzirUi("Dia")}</label><DatePicker value={data} onChange={setData} /></div>
      <div className="field field-half"><label className="field-label">{traduzirUi("Início")}</label><TimePicker value={inicio} onChange={setInicio} /></div>
      <div className="field field-half"><label className="field-label">{traduzirUi("Fim")}</label><TimePicker value={fim} onChange={setFim} /></div>
      {conflito ? <div className="reserva-warn" style={{ gridColumn: "1 / -1" }}><Icon name="alerta" size={14} /> {traduzirUi("Já existe \"{titulo}\" aqui em {inicio} a {fim}.", { titulo: conflito.title, inicio: conflito.start_time ?? "", fim: conflito.end_time ?? "" })}</div> : null}
      {error ? <div style={{ gridColumn: "1 / -1", fontSize: "var(--fs-pn-13)", color: "var(--danger)" }}>{error}</div> : null}
    </Janela>
  );
}
