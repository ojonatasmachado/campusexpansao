"use client";

import { useContext, useState } from "react";
import { Icon } from "../lib/icons";
import { aindaVaiAcontecer, joinDot, parseISODate, somaDias, todayISO } from "../lib/date";
import { useTermos } from "../lib/vocabulario-context";
import { useDestinatario } from "../lib/destinatario";
import { conflitos, horaDeChegada } from "../lib/agenda";
import { baixarIcs } from "../lib/ics";
import { M6Row, M6St, MESES, MemberUiContext, chegadaDoTime, dataLonga } from "./comum";
import { EscalaCard } from "./Inicio";
import { TabTarefas } from "./Conversas";
import type { Board, Card, Course, CourseLesson, Ev, EventRsvp, ItemAgenda, M, MeetingLite, Ministry, P, RehearsalLite, Slot } from "./tipos";

/* data em bloquinho: "Dom 04" */
export function M6Date({ iso }: { iso: string }) {
  const d = parseISODate(iso);
  if (!d) return <span className="m6-date"><span>·</span><b>·</b></span>;
  const dia = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][d.getDay()];
  return <span className="m6-date"><span>{dia}</span><b>{String(d.getDate()).padStart(2, "0")}</b></span>;
}

/* `serve`: a pessoa está na escala confirmada deste culto (aparece uma vez, com o selo) */
export function EventoRow({ ev, serve }: { ev: Ev; serve?: string | null }) {
  const ui = useContext(MemberUiContext);
  return (
    <button type="button" className="m6-row" onClick={() => ui.abrirEvento(ev.id)}>
      <M6Date iso={ev.eventDate} />
      <span className="m6-rb">
        <span className="m6-rt">{ev.name}</span>
        <span className="m6-rs">{joinDot(ev.weekday, ev.time, ev.location)}</span>
        {serve !== undefined && serve !== null && <span className="m6-serve"><M6St k="ok" ic="ok">{joinDot("Você serve", serve)}</M6St></span>}
      </span>
      <span className="m6-chev"><Icon name="avancar" size={18} /></span>
    </button>
  );
}

export function AgendaV6({ initialCardId, seg, setSeg, person, member, members, ministries, events, roster, cards, boards, isRecep, isKids, onResponderEscala, onStartChat, onAddCardComment, onSaveAvailability, aulas, meetings, rehearsals, rsvps }: {
  initialCardId?: string | null;
  onSaveAvailability?: (availability: Record<string, boolean>) => Promise<boolean>;
  aulas: { aula: CourseLesson; curso: Course }[];
  meetings: MeetingLite[]; rehearsals: RehearsalLite[]; rsvps: EventRsvp[];
  seg: "minha" | "igreja"; setSeg: (s: "minha" | "igreja") => void;
  person: P; member: M | null; members: M[]; ministries: Ministry[]; events: Ev[]; roster: Slot[]; cards: Card[]; boards: Board[];
  isRecep: boolean; isKids: boolean;
  onResponderEscala?: (id: string, status: Slot["status"]) => Promise<boolean>;
  onStartChat?: (selfMemberId: string, targetMemberId: string, firstMessage: string) => Promise<string | null>;
  onAddCardComment?: (cardId: string, author: string, body: string) => void;
}) {
  const { comTermos: ct } = useTermos();
  const ui = useContext(MemberUiContext);
  const serve = ministries.some((m) => m.people.some((mp) => mp.personId === person.id));
  const meusTimes = new Set(ministries.filter((m) => m.people.some((mp) => mp.personId === person.id)).map((m) => m.id));
  /* tarefas abertas (v7 4.6): seção só com tarefa aberta; no dia do prazo, também na lista por data */
  const tarefasAbertas = cards.filter((c) => c.assignees.includes(person.id) && c.column_id !== "done");
  const atual = seg;
  const hoje = todayISO();
  const evById = new Map(events.map((e) => [e.id, e]));
  const meus = roster
    .filter((r) => r.person_id === person.id && (evById.get(r.event_id)?.eventDate ?? "") >= hoje)
    .sort((a, b) => (evById.get(a.event_id)?.eventDate ?? "").localeCompare(evById.get(b.event_id)?.eventDate ?? ""));
  const pend = meus.filter((r) => r.status === "wait");
  const outras = meus.filter((r) => r.status !== "wait");
  const ministryOf = (slot: Slot) => ministries.find((m) => m.positions?.some((p) => p.id === slot.position_id)) ?? ministries.find((m) => m.people.some((mp) => mp.personId === person.id));
  /* avisar falta: mesmo destinatário em cadeia da troca (v7 2.4), pelo time
     da próxima escala ou, sem escala, pelo primeiro time da pessoa. Sem ninguém, sem o botão */
  const timeFalta = (meus[0] ? ministryOf(meus[0]) : undefined) ?? ministries.find((m) => m.people.some((mp) => mp.personId === person.id));
  const destFalta = useDestinatario("troca", timeFalta?.id ?? null);
  const avisarFalta = async () => {
    if (!member || !destFalta || !onStartChat) return;
    const id = await onStartChat(member.id, destFalta.member_id, ct("Oi! Queria avisar que vou faltar num dos próximos {cultos}. Posso te contar qual?"));
    if (id) ui.go("mensagens", null, { chatId: id });
  };

  /* Minha agenda: tudo que envolve a pessoa */
  const itens: ItemAgenda[] = [];
  for (const slot of outras) {
    const ev = evById.get(slot.event_id);
    if (!ev) continue;
    const min = ministryOf(slot);
    const funcao = min?.positions?.find((p) => p.id === slot.position_id)?.name;
    const chegar = slot.status === "ok" ? horaDeChegada(ev.time, chegadaDoTime(min)) : null;
    itens.push({
      id: `s-${slot.id}`, data: ev.eventDate, hora: ev.time, tipo: "Serve", titulo: ev.name,
      sub: joinDot(min?.name, funcao, chegar && `chegar ${chegar}`),
      selo: slot.status === "ok" ? <M6St k="ok" ic="ok">Confirmado</M6St> : <M6St k="warn" ic="recusou">Você não pode</M6St>,
      abrir: () => ui.abrirEvento(ev.id),
    });
  }
  const servindo = new Set(meus.map((r) => r.event_id));
  for (const r of rsvps) {
    const ev = evById.get(r.event_id);
    if (!ev || servindo.has(ev.id) || !aindaVaiAcontecer(ev.eventDate, ev.time)) continue;
    itens.push({
      id: `e-${ev.id}`, data: ev.eventDate, hora: ev.time, tipo: ev.kind === "Culto" ? "Culto" : "Evento", titulo: ev.name, sub: ev.location,
      selo: <M6St k="ok" ic="ok">{r.kind === "inscricao" ? "Inscrito" : "Você vai"}</M6St>,
      abrir: () => ui.abrirEvento(ev.id),
    });
  }
  for (const e of rehearsals) {
    if (!e.rehearsal_date || e.rehearsal_date < hoje) continue;
    if (!(e.ministry_id && meusTimes.has(e.ministry_id)) && !e.attendees?.includes(person.id)) continue;
    itens.push({ id: `r-${e.id}`, data: e.rehearsal_date, hora: e.time, tipo: "Ensaio", titulo: e.title, sub: joinDot(ministries.find((m) => m.id === e.ministry_id)?.name, e.location) });
  }
  for (const m of meetings) {
    if (!m.meeting_date || m.meeting_date < hoje || m.status === "realizada") continue;
    if (!m.ministries?.some((id) => meusTimes.has(id)) && !m.attendees?.includes(person.id)) continue;
    itens.push({ id: `m-${m.id}`, data: m.meeting_date, hora: m.time, tipo: "Reunião", titulo: m.title, sub: m.location ?? undefined });
  }
  for (const { aula, curso } of aulas) {
    itens.push({ id: `a-${aula.id}`, data: aula.lesson_date!, hora: aula.lesson_time, tipo: "Aula", titulo: aula.name, sub: joinDot(curso.name, aula.location) });
  }
  for (const t of tarefasAbertas) {
    const d = (t.due ?? "").slice(0, 10);
    if (d < hoje) continue;
    itens.push({ id: `t-${t.id}`, data: d, tipo: "Tarefa", titulo: t.title, sub: boards.find((b) => b.id === t.board_id)?.name });
  }
  itens.sort((a, b) => `${a.data} ${a.hora || "99"}`.localeCompare(`${b.data} ${b.hora || "99"}`));
  const emConflito = conflitos(itens.filter((i) => i.tipo !== "Tarefa").map((i) => ({ id: i.id, data: i.data, hora: i.hora })));
  const dias = [...new Set(itens.map((i) => i.data))];
  const amanha = somaDias(hoje, 1);
  const nomeDia = (d: string) => (d === hoje ? `Hoje · ${dataLonga(d)}` : d === amanha ? `Amanhã · ${dataLonga(d)}` : dataLonga(d));

  /* Igreja: programação pública, por semana */
  const futuros = events.filter((e) => aindaVaiAcontecer(e.eventDate, e.time)).sort((a, b) => (a.eventDate + a.time).localeCompare(b.eventDate + b.time));
  const semanaDe = (iso: string) => {
    const d = parseISODate(iso);
    if (!d) return "Sem data";
    const h = parseISODate(hoje)!;
    const dias = Math.floor((d.getTime() - h.getTime()) / 86400000);
    if (dias < 7 - h.getDay()) return "Esta semana";
    if (dias < 14 - h.getDay()) return "Próxima semana";
    return `${MESES[d.getMonth()].charAt(0).toUpperCase()}${MESES[d.getMonth()].slice(1)}`;
  };
  const grupos = [...new Set(futuros.map((e) => semanaDe(e.eventDate)))];

  return (
    <>
      <div className="m6-segwrap">
        <div className="ts-seg two m6-seg" role="radiogroup" aria-label="O que ver">
          {([["minha", "Minha agenda"], ["igreja", "Igreja"]] as const).map(([v, l]) => (
            <button key={v} type="button" role="radio" aria-checked={atual === v} className={atual === v ? "on" : ""} onClick={() => setSeg(v)}>{l}</button>
          ))}
        </div>
      </div>
      {atual === "minha" ? (
        <>
          {pend.length > 0 && (
            <div className="m6-sec">
              <div className="m6-lbl">Escala a confirmar · {pend.length}</div>
              {pend.map((slot) => {
                const ev = evById.get(slot.event_id);
                return ev ? <EscalaCard key={slot.id} slot={slot} ev={ev} ministry={ministryOf(slot)} person={person} member={member} members={members} onResponderEscala={onResponderEscala} onStartChat={onStartChat} /> : null;
              })}
            </div>
          )}
          {dias.map((d) => (
            <div className="m6-sec" key={d}>
              <div className="m6-lbl">{nomeDia(d)}</div>
              <div className="m6-list">
                {itens.filter((i) => i.data === d).map((i) => {
                  const corpo = (
                    <>
                      <span className="m6-ag-h">{i.hora || ""}</span>
                      <span className="m6-rb">
                        <span className="m6-rt">{i.titulo}</span>
                        <span className="m6-rs">{joinDot(i.tipo, i.sub)}</span>
                        {(i.selo || emConflito.has(i.id)) && (
                          <span className="m6-selos">
                            {i.selo}
                            {emConflito.has(i.id) && <M6St k="warn" ic="alerta">Conflito de horário</M6St>}
                          </span>
                        )}
                      </span>
                    </>
                  );
                  return i.abrir ? (
                    <button type="button" className="m6-row" key={i.id} onClick={i.abrir}>{corpo}<span className="m6-chev"><Icon name="avancar" size={18} /></span></button>
                  ) : (
                    <div className="m6-row" key={i.id}>{corpo}</div>
                  );
                })}
              </div>
            </div>
          ))}
          {itens.length === 0 && pend.length === 0 && (
            <div className="m6-sec">
              <div className="m6-card">
                <div className="m6-ct">Nada marcado para você</div>
                <div className="m6-meta">{ct("Quando você for escalado ou se inscrever em algo, aparece aqui por dia.")}</div>
                <div className="m6-btns"><button className="m6-btn sec" type="button" onClick={() => setSeg("igreja")}>{ct("Ver os {cultos} e eventos")}</button></div>
              </div>
            </div>
          )}
          {serve && meus.length === 0 && (itens.length > 0 || pend.length > 0) && <div className="m6-pad m6-meta">{ct("Você não está na escala dos próximos {cultos}.")}</div>}
          {tarefasAbertas.length > 0 && (
            <div className="m6-sec m6-legacy">
              <TabTarefas key={initialCardId ?? "tarefas"} initialCardId={initialCardId} person={person} cards={cards} boards={boards} onAddCardComment={onAddCardComment} />
            </div>
          )}
          {(isRecep || isKids) && (
            <div className="m6-sec">
              <div className="m6-lbl">No seu time</div>
              <div className="m6-list">
                {isRecep && <M6Row ic="visitante" t="Visitantes" s="Cadastrar e acompanhar quem chegou" onClick={() => ui.go("agenda", "visitantes")} />}
                {isKids && <M6Row ic="kids" t="Sala do Kids" s="Check-in, presença e retirada" onClick={() => ui.go("agenda", "kids-sala")} />}
              </div>
            </div>
          )}
          {serve && (
            <div className="m6-sec">
              <div className="m6-lbl">Quando posso servir</div>
              {onSaveAvailability ? <Disponibilidade person={person} onSave={onSaveAvailability} /> : null}
              {member && destFalta && onStartChat && <div className="m6-pad"><button className="m6-btn sec full" type="button" onClick={avisarFalta}>Avisar que vou faltar</button></div>}
            </div>
          )}
        </>
      ) : (
        futuros.length > 0 ? grupos.map((g) => (
          <div className="m6-sec" key={g}>
            <div className="m6-lbl">{g}</div>
            <div className="m6-list">{futuros.filter((e) => semanaDe(e.eventDate) === g).map((ev) => <EventoRow key={ev.id} ev={ev} />)}</div>
          </div>
        )) : (
          <div className="m6-sec"><div className="m6-card"><div className="m6-ct">Agenda vazia</div><div className="m6-meta">{ct("Os {cultos} e eventos da igreja aparecem aqui assim que forem marcados.")}</div></div></div>
        )
      )}
    </>
  );
}

/* Detalhe do evento numa folha (v7 4.5): uma área de ação só, conforme o que o
   evento pede (só aviso, confirmar presença, inscrição); valor e instruções da
   igreja; quem serve vê "Serve · função · chegar HH:MM"; Compartilhar e
   Adicionar ao calendário. */
export function SheetEvento({ ev, slot, ministry, rsvp, onRespond, paginaUrl, churchName }: {
  ev: Ev; slot?: Slot; ministry?: Ministry; rsvp: EventRsvp["kind"] | null;
  onRespond?: (eventId: string, vai: boolean) => Promise<boolean>;
  paginaUrl?: string | null; churchName?: string;
}) {
  const ui = useContext(MemberUiContext);
  const [resp, setResp] = useState<EventRsvp["kind"] | null>(rsvp);
  const [enviando, setEnviando] = useState(false);
  const pede = ev.pede ?? "aviso";
  const funcao = slot ? ministry?.positions?.find((p) => p.id === slot.position_id)?.name : undefined;
  const chegar = slot ? horaDeChegada(ev.time, chegadaDoTime(ministry)) : null;
  const responder = async (vai: boolean) => {
    if (!onRespond) return;
    setEnviando(true);
    const ok = await onRespond(ev.id, vai);
    setEnviando(false);
    if (!ok) return;
    setResp(vai ? (pede === "inscricao" ? "inscricao" : "presenca") : null);
    ui.toast(vai ? (pede === "inscricao" ? "Inscrição feita" : "Presença confirmada") : (pede === "inscricao" ? "Inscrição cancelada" : "Presença desfeita"));
  };
  const link = paginaUrl && typeof window !== "undefined" ? `${window.location.origin}${paginaUrl}` : "";
  const texto = [ev.name, joinDot(dataLonga(ev.eventDate) || ev.weekday, ev.time), ev.location, churchName, link].filter(Boolean).join("\n");
  const compartilhar = async () => {
    const nav = navigator as Navigator & { share?: (d: { title?: string; text?: string }) => Promise<void> };
    if (nav.share) { try { await nav.share({ title: ev.name, text: texto }); return; } catch { return; } }
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener");
  };
  const calendario = () => baixarIcs({ id: ev.id, titulo: ev.name, data: ev.eventDate, hora: ev.time, local: ev.location, descricao: churchName ?? null });
  const servindo = slot && slot.status !== "no";
  return (
    <div>
      <div className="m6-kick">{ev.kind && ev.kind !== "Culto" ? ev.kind : "Na igreja"}</div>
      <h2 className="m6-sh">{ev.name}</h2>
      <ul className="m6-facts">
        <li><Icon name="agenda" size={20} /><span>{joinDot(dataLonga(ev.eventDate) || ev.weekday, ev.time)}</span></li>
        {ev.location && <li><Icon name="mapapin" size={20} /><span>{ev.location}</span></li>}
        {servindo && <li><Icon name="times" size={20} /><span>{joinDot("Serve", funcao ?? ministry?.name, chegar && `chegar ${chegar}`)}</span></li>}
      </ul>
      {(ev.valor || ev.instrucoes) && (
        <div className="m6-card m6-ev-info">
          {ev.valor && <div className="m6-ct">{ev.valor}</div>}
          {ev.instrucoes && <p className="m6-txt" style={{ whiteSpace: "pre-wrap" }}>{ev.instrucoes}</p>}
          <div className="m6-meta">O pagamento não passa pelo app.</div>
        </div>
      )}
      {pede !== "aviso" && !servindo && onRespond && (
        resp ? (
          <div className="m6-after">
            <M6St k="ok" ic="ok">{resp === "inscricao" ? "Você está inscrito" : "Presença confirmada"}</M6St>
            <button type="button" className="m6-link" disabled={enviando} onClick={() => responder(false)}>{pede === "inscricao" ? "Cancelar inscrição" : "Desfazer"}</button>
          </div>
        ) : (
          <div className="m6-btns"><button className="m6-btn pri" type="button" disabled={enviando} onClick={() => responder(true)}>{enviando ? "Enviando..." : pede === "inscricao" ? "Fazer inscrição" : "Vou"}</button></div>
        )
      )}
      <div className="m6-btns">
        <button className="m6-btn sec" type="button" onClick={compartilhar}><Icon name="compartilhar" size={20} />Compartilhar</button>
        <button className="m6-btn sec" type="button" onClick={calendario}><Icon name="agenda" size={20} />Adicionar ao calendário</button>
      </div>
    </div>
  );
}

// ── Mensagens (S20) ───────────────────────────────────────────────────────────
export function RespostaEvento({ id, inicial, onRespond }: { id: string; inicial: "vou" | "nao" | null; onRespond: (id: string, r: "vou" | "nao" | null) => Promise<boolean> }) {
  const ui = useContext(MemberUiContext);
  const [r, setR] = useState(inicial);
  const set = async (v: "vou" | "nao" | null) => {
    const antes = r;
    setR(v);
    const ok = await onRespond(id, v);
    if (!ok) setR(antes);
    else if (v) ui.toast(`Resposta enviada · ${v === "vou" ? "Vou" : "Não vou"}`);
  };
  if (r) {
    return (
      <div className="m6-after">
        <M6St k={r === "vou" ? "ok" : "neutral"} ic={r === "vou" ? "ok" : "recusou"}>{r === "vou" ? "Você vai" : "Você não vai"}</M6St>
        <button type="button" className="m6-link" onClick={() => set(null)}>Mudar resposta</button>
      </div>
    );
  }
  return (
    <div className="m6-btns">
      <button className="m6-btn pri" type="button" onClick={() => set("vou")}>Vou</button>
      <button className="m6-btn sec" type="button" onClick={() => set("nao")}>Não vou</button>
    </div>
  );
}

/* "Quando posso servir": uma chave por culto que se repete (S19) */
export const DISPONIBILIDADE: { key: string; nome: string }[] = [
  { key: "dom_m", nome: "Domingo de manhã" },
  { key: "dom_n", nome: "Domingo à noite" },
  { key: "qua", nome: "Quarta à noite" },
];
export function Disponibilidade({ person, onSave }: { person: P; onSave: (a: Record<string, boolean>) => Promise<boolean> }) {
  const [disp, setDisp] = useState<Record<string, boolean>>(() => {
    const atual = person.availability ?? {};
    return Object.fromEntries(DISPONIBILIDADE.map((d) => [d.key, atual[d.key] ?? true]));
  });
  const trocar = async (key: string) => {
    const novo = { ...disp, [key]: !disp[key] };
    setDisp(novo);
    if (!(await onSave(novo))) setDisp(disp);
  };
  return (
    <div className="m6-list">
      {DISPONIBILIDADE.map((d) => (
        <div className="m6-row" key={d.key}>
          <span className="m6-rb">
            <span className="m6-rt">{d.nome}</span>
            <span className="m6-rs">{disp[d.key] ? "O líder pode escalar você" : "O líder não vai escalar você"}</span>
          </span>
          <button type="button" role="switch" aria-checked={disp[d.key]} aria-label={d.nome} className={`m6-tg${disp[d.key] ? " on" : ""}`} onClick={() => trocar(d.key)} />
        </div>
      ))}
    </div>
  );
}
