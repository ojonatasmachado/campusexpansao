"use client";

import { plural } from "../../lib/plural";
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
/* Escalas : módulo em modules/escalas/ (4.1) */

export function Cultos({ events, ministries, church, kidsClasses, kidsSessions, kidsChildren, rooms, setDrawer, setModal, setCheckinEventId, setShareEventId }: { events: EventView[]; ministries: MinistryView[]; church?: ChurchView; kidsClasses: KidsClassView[]; kidsSessions: KidsSessionView[]; kidsChildren: ChildView[]; rooms: RoomView[]; setDrawer: (drawer: DrawerState) => void; setModal: (modal: ModalState) => void; setCheckinEventId: (id: string) => void; setShareEventId: (id: string) => void }) {
  const { todayISO } = useRelogioDaIgreja();
  const { comTermos: ct } = useTermos();
  const [kidsPickerEventId, setKidsPickerEventId] = useState<string | null>(null);
  const [kidsModal, setKidsModal] = useState<{ eventId: string; classId: string } | null>(null);
  /* visão de semana (lista da semana escolhida) ou de mês (calendário) */
  const [vista, setVista] = useState<"semana" | "mes">("semana");
  const [semanaOffset, setSemanaOffset] = useState(0);
  const inicioSemana = (() => { const h = parseISODate(todayISO())!; h.setDate(h.getDate() - h.getDay() + semanaOffset * 7); return h; })();
  const fimSemana = new Date(inicioSemana.getFullYear(), inicioSemana.getMonth(), inicioSemana.getDate() + 6);
  const daSemana = events.filter((e) => { const d = parseISODate(e.eventDate); return d && d >= inicioSemana && d <= fimSemana; });
  const rotuloSemana = semanaOffset === 0 ? "Esta semana" : semanaOffset === 1 ? "Próxima semana" : semanaOffset === -1 ? "Semana passada" : `${formatDateBR(toISODate(inicioSemana))} a ${formatDateBR(toISODate(fimSemana))}`;
  const meetingRooms = rooms.filter((room) => room.allows_meetings !== false);
  const localOptions = [...meetingRooms.map((room) => ({ v: room.name, l: `${room.name}${room.capacity ? ` · ${room.capacity} lug.` : ""}` })), { v: OUTRO_LOCAL, l: "Outro espaço (fora da igreja)" }];
  const tipoOptions = [
    { v: "Culto", l: "Culto" },
    { v: "Evento", l: "Evento" },
    { v: "Treinamento", l: "Treinamento" },
    { v: "Retiro", l: "Retiro" },
    ...(church?.settings?.tiposEvento ?? []).map((t) => ({ v: t, l: t })),
  ];
  return (
    <div className="content">
      <PageHead title={ct("{Cultos} e Agenda")} eyebrow="Operação" help={ct("Seus {cultos} e eventos ficam aqui. Cada um pode virar uma escala, ganhar roteiro e setlist.")} action={<Botao variante="principal" onClick={() => setModal({ eyebrow: "Criar", title: ct("Novo {culto} ou evento"), subtitle: "Agenda da igreja: o que é, quando acontece e quem serve.", saveLabel: "Criar na agenda", formFields: [{ k:"nome", label:"Nome", type:"text", req:true, ph:ct("ex: {Culto} da Manhã, Conferência de Jovens") }, { k:"tipo", label:"Tipo de evento", type:"select", half:true, options:tipoOptions }, { k:"local", label:"Local", type:"select", req:true, half:true, ph:"Selecione um espaço cadastrado", options: localOptions }, { k:"endereco", label:"Endereço do espaço", type:"text", half:true, ph:"Rua, número, bairro...", showIf:{field:"local",equals:OUTRO_LOCAL} }, { k:"data", label:"Data", type:"date", fullDate:true, req:true, half:true, hint:"Dia, mês e ano do encontro." }, { k:"hora", label:"Horário de início", type:"time", req:true, half:true }], action: { kind: "event" } })}>{ct("+ Novo {culto}")}</Botao>} />
      <div className="toolbar cultos-tb">
        <Segmentado>
          <Opcao marcada={vista === "semana"} onClick={() => setVista("semana")}>Semana</Opcao>
          <Opcao marcada={vista === "mes"} onClick={() => setVista("mes")}>Mês</Opcao>
        </Segmentado>
        {vista === "semana" && (
          <div className="cultos-nav">
            <Botao compacto aria-label="Semana anterior" onClick={() => setSemanaOffset((o) => o - 1)}><Icon name="voltar" size={14} /></Botao>
            <span className="cultos-nav-l">{rotuloSemana}</span>
            <Botao compacto aria-label="Próxima semana" onClick={() => setSemanaOffset((o) => o + 1)}><Icon name="avancar" size={14} /></Botao>
          </div>
        )}
      </div>
      {vista === "mes" ? (
        <Cartao><div className="panel-body">
          <MiniCalendar events={events.map((e) => ({ date: parseISODate(e.eventDate) ?? new Date(), label: e.name, sub: joinDot(e.time, e.location), onClick: () => setDrawer({ kind: "event", id: e.id }) }))} />
        </div></Cartao>
      ) : daSemana.length === 0 ? (
        <EmptyState title="Nada nesta semana" text={ct("Os {cultos} e eventos marcados para esta semana aparecem aqui.")} />
      ) : null}
      {vista === "semana" && <div className="grid-2">
        {daSemana.map((event) => (
          <Cartao key={event.id} style={{ position: "relative" }}>
            <Acao className={`${cartaoClasse({})} click`} style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: 0 }} onClick={() => setDrawer({ kind: "event", id: event.id })}>
              <div className="panel-head"><span className="panel-title"><Icon name="cultos" size={14} /> {event.name}</span><span className="panel-meta">{event.time}</span></div>
              <div className="panel-body"><p className="mini-sub">{joinDot(event.weekday, formatDateBR(event.eventDate), event.location)}</p><div className="divider" style={{ margin: "14px 0" }} />{event.schedule.slice(0, 4).map((item) => <Linha key={item.id} style={{ paddingInline: 0 }}><div className="mini-main"><div className="mini-title">{item.item}</div><div className="mini-sub">{item.time ?? "sem horário"} · {item.category ?? "roteiro"}</div></div></Linha>)}<div className="mini-sub">{event.ministries.map((id) => ministries.find((ministry) => ministry.id === id)?.name).filter(Boolean).join(" · ")}</div></div>
            </Acao>
            <div style={{ padding: "0 22px 16px", display: "flex", gap: 8 }}>
              <Botao compacto onClick={(e) => { e.stopPropagation(); setCheckinEventId(event.id); }}>
                <Icon name="cultos" size={13} /> Check-in QR
              </Botao>
              <Botao compacto onClick={(e) => { e.stopPropagation(); setShareEventId(event.id); }}>
                <Icon name="relatorios" size={13} /> Arte
              </Botao>
              {kidsClasses.length > 0 && (
                <div style={{ position: "relative" }}>
                  <Botao compacto onClick={(e) => { e.stopPropagation(); setKidsPickerEventId(kidsPickerEventId === event.id ? null : event.id); }}>
                    <Icon name="kids" size={13} /> Kids
                  </Botao>
                  {kidsPickerEventId === event.id && (
                    <div className="cong-menu" style={{ right: 0, left: "auto" }} onClick={(e) => e.stopPropagation()}>
                      <div className="cong-group">Abrir turma</div>
                      {kidsClasses.map((kc) => (
                        <Acao key={kc.id} className="cong-opt" onClick={() => { setKidsModal({ eventId: event.id, classId: kc.id }); setKidsPickerEventId(null); }}>
                          <span className="cong-opt-mark"><Icon name="kids" size={14} /></span>
                          <span className="cong-opt-info"><span className="cong-opt-name">{kc.name}</span></span>
                        </Acao>
                      ))}
                    </div>
                  )}
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

export const CAL_MESES_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
export const CAL_SEM = ["D", "S", "T", "Q", "Q", "S", "S"];

/* calendário mensal reaproveitável (perfil da pessoa e Espaços & Salas). */
export function MiniCalendar({ events, onAdd }: { events: CalEvent[]; onAdd?: (dateStr: string) => void }) {
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
        {CAL_SEM.map((s, i) => <span key={`h${i}`} className="cal-dow">{s}</span>)}
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
        {!selDay && <div className="cal-agenda-empty">Toque num dia para ver os compromissos.</div>}
        {selDay && selEvents.length === 0 && <div className="cal-agenda-empty">Nada em {selDay} de {CAL_MESES_FULL[month]}.</div>}
        {selEvents.map((e, i) => (
          <Acao key={i} className="cal-ev" onClick={() => e.onClick?.()}>
            <span className={`cal-ev-bar${e.tone === "amber" ? " amber" : ""}`} />
            <div className="cal-ev-main">
              <div className="cal-ev-label">{e.label}</div>
              {e.sub && <div className="cal-ev-sub">{e.sub}</div>}
            </div>
          </Acao>
        ))}
        {selDay && onAdd && <Acao className="cal-add" onClick={() => onAdd(`${selDay} ${DP_MESES[month].toLowerCase()}`)}>+ Reservar em {selDay} {DP_MESES[month].toLowerCase()}</Acao>}
      </div>
    </div>
  );
}

export const RESERVA_TONE: Record<string, "olive" | "amber"> = { reuniao: "olive", ensaio: "olive", evento: "amber", treinamento: "olive", outro: "olive" };
export const RESERVA_TIPOS = [{ v: "reuniao", l: "Reunião" }, { v: "ensaio", l: "Ensaio" }, { v: "evento", l: "Evento" }, { v: "treinamento", l: "Treinamento" }, { v: "outro", l: "Outro" }];

export function Espacos({ rooms, reservations, church, setModal, embed }: { rooms: RoomView[]; reservations: ReservationView[]; church?: ChurchView; setModal: (modal: ModalState) => void; embed?: boolean }) {
  const { comTermos: ct } = useTermos();
  const [filter, setFilter] = useState("todas");
  const [reservar, setReservar] = useState<{ salaInicial?: string; dataInicial?: string } | null>(null);
  const roomById = new Map(rooms.map((room) => [room.id, room]));
  const visibleReservations = reservations.filter((reservation) => filter === "todas" || reservation.room_id === filter);
  const openNewRoom = () => setModal({ eyebrow: "Criar", title: "Nova sala / espaço", subtitle: ct("Um espaço físico da igreja disponível para reservas. Todo {culto}, ensaio, reunião ou evento passa a escolher o local aqui, com capacidade sempre visível."), saveLabel: "Criar sala", formFields: [{ k:"nome", label:"Nome do espaço", type:"text", req:true, ph:"ex: Sala 3, Salão de festas" }, { k:"capacidade", label:"Capacidade (pessoas)", type:"text", half:true, ph:"ex: 30" }, { k:"local", label:"Onde fica", type:"text", half:true, ph:"ex: 1º andar, Anexo" }, { k:"recursos", label:"Recursos disponíveis", type:"text", ph:"Som, Projeção, Piano", hint:"Separe por vírgula." }, { k:"permiteReuniao", label:ct("Serve pra reunião/{culto}/ensaio de adultos?"), type:"toggle", value:"true", onLabel:"Sim", offLabel:"Não (ex: Berçário)" }], action: { kind: "room" } });
  const openNewReservation = () => setReservar({ salaInicial: filter !== "todas" ? filter : undefined });
  const header = embed ? (
    <div className="cfg-card-head-row">
      <div>
        <div className="cfg-card-t">Espaços & reservas</div>
        <div className="cfg-card-s">Salas da igreja e quem usa cada espaço. Reuniões, eventos, cursos e ensaios reservam aqui sem misturar agenda.</div>
      </div>
      <div className="ph-actions">
        <Botao compacto onClick={openNewRoom}>+ Nova sala</Botao>
        <Botao variante="principal" compacto onClick={openNewReservation}>+ Reservar</Botao>
      </div>
    </div>
  ) : (
    <PageHead
      title="Espaços e reservas"
      eyebrow="Operação"
      help={ct("Cadastre as salas e espaços físicos da igreja. Reuniões, ensaios e {cultos} reservam um espaço daqui pra não haver choque de agenda.")}
      action={<><Botao onClick={openNewRoom}>+ Nova sala</Botao><Botao variante="principal" onClick={openNewReservation}>+ Reservar espaço</Botao></>}
    />
  );
  const calEvents: CalEvent[] = visibleReservations.map((reservation): CalEvent | null => {
    const room = roomById.get(reservation.room_id);
    const date = parseFlexDate(reservation.reserved_date);
    return date ? {
      date,
      label: reservation.title,
      sub: `${room?.name || "Sala"} · ${reservation.start_time || "sem início"} até ${reservation.end_time || "sem fim"}`,
      tone: RESERVA_TONE[reservation.kind || "outro"] ?? "olive",
    } : null;
  }).filter((e): e is CalEvent => e !== null);
  const inner = (
    <>
      {header}
      <div className="sala-grid">
        {rooms.map((room) => {
          const count = reservations.filter((reservation) => reservation.room_id === room.id).length;
          return <Acao key={room.id} className={`sala-card ${filter === room.id ? "on" : ""}`} onClick={() => setFilter(filter === room.id ? "todas" : room.id)}><div className="sala-card-top"><span className="sala-mark"><Icon name="config" size={18} /></span><span className="sala-cap">{room.capacity ?? 0} <small>lugares</small></span></div><div className="sala-nome">{room.name}</div>{room.location ? <div className="sala-local">{room.location}</div> : null}{room.resources.length ? <div className="sala-rec">{room.resources.map((resource) => <Etiqueta key={resource}>{resource}</Etiqueta>)}</div> : null}<div className="sala-foot">{plural(count, "reserva")}{room.allows_meetings === false ? " · não serve pra reunião" : ""}</div></Acao>;
        })}
        {rooms.length === 0 ? <Vazio titulo="Nenhuma sala cadastrada ainda." /> : null}
      </div>
      <div className="esp-cal-wrap" style={{ marginTop: 20 }}>
        <div className="toolbar" style={{ marginBottom: 12 }}>
          <span className="panel-meta">Calendário de reservas{filter !== "todas" ? <> · <b style={{ color: "var(--light)" }}>{roomById.get(filter)?.name}</b></> : ""}</span>
          <div className="tb-spacer" />
          {filter !== "todas" && <Botao variante="discreto" compacto onClick={() => setFilter("todas")}>Ver salas</Botao>}
        </div>
        <MiniCalendar events={calEvents} onAdd={(dataStr) => setReservar({ salaInicial: filter !== "todas" ? filter : undefined, dataInicial: dataStr })} />
        <div className="cal-legend">
          {RESERVA_TIPOS.map((t) => <span key={t.v} className="cal-legend-i"><i className={`cal-dot ${RESERVA_TONE[t.v] === "amber" ? "amber" : ""}`} />{t.l}</span>)}
        </div>
      </div>
      {reservar && church && <ReservaModal rooms={rooms} reservations={reservations} church={church} salaInicial={reservar.salaInicial} dataInicial={reservar.dataInicial} onClose={() => setReservar(null)} />}
    </>
  );
  return embed ? inner : <div className="content wide">{inner}</div>;
}

export function ReservaModal({ rooms, reservations, church, salaInicial, dataInicial, onClose }: { rooms: RoomView[]; reservations: ReservationView[]; church: ChurchView; salaInicial?: string; dataInicial?: string; onClose: () => void }) {
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
    if (!titulo.trim()) { setError("Dê um nome ao compromisso."); return; }
    if (!salaId) { setError("Selecione uma sala."); return; }
    if (!isoDate) { setError("Escolha o dia no calendário."); return; }
    if (conflito) { setError(`Já existe "${conflito.title}" nesta sala em ${conflito.start_time} a ${conflito.end_time}.`); return; }
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
    <div className="modal-bg" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Reservar espaço</div>
          <div className="modal-title">Novo compromisso na sala</div>
          <div className="modal-sub">Não deixamos duas reservas se cruzarem no mesmo espaço e horário.</div>
        </div>
        <div className="modal-body">
          <Campo rotulo="Título"><Entrada placeholder="ex: Reunião de líderes" value={titulo} onChange={(e) => setTitulo(e.target.value)} /></Campo>
          <Campo rotulo="Sala" className="field-half">
            <Selecao valor={salaId} aoMudar={setSalaId} vazio="Selecione uma sala" opcoes={roomsForTipo.map((room) => ({ v: room.id, l: `${room.name}${room.capacity ? ` · ${room.capacity} lug.` : ""}` }))} />
          </Campo>
          <Campo rotulo="Tipo" className="field-half">
            <Selecao valor={tipo} aoMudar={(nextTipo) => { setTipo(nextTipo); const allowed = nextTipo === "reuniao" ? rooms.filter((room) => room.allows_meetings !== false) : rooms; if (!allowed.some((room) => room.id === salaId)) setSalaId(""); }} opcoes={RESERVA_TIPOS.map((t) => ({ v: t.v, l: t.l }))} />
          </Campo>
          <div className="field field-half"><label className="field-label">Dia</label><DatePicker value={data} onChange={setData} /></div>
          <div className="field field-half"><label className="field-label">Início</label><TimePicker value={inicio} onChange={setInicio} /></div>
          <div className="field field-half"><label className="field-label">Fim</label><TimePicker value={fim} onChange={setFim} /></div>
          {conflito ? <div className="reserva-warn" style={{ gridColumn: "1 / -1" }}><Icon name="alerta" size={14} /> Já existe &quot;{conflito.title}&quot; aqui em {conflito.start_time} a {conflito.end_time}.</div> : null}
          {error ? <div style={{ gridColumn: "1 / -1", fontSize: "var(--fs-pn-13)", color: "var(--danger)" }}>{error}</div> : null}
        </div>
        <div className="modal-foot">
          <Botao onClick={onClose}>Cancelar</Botao>
          <Botao variante="principal" desativado={saving || !!conflito || !salaId} onClick={salvar}>Reservar</Botao>
        </div>
      </div>
    </div>
  );
}
