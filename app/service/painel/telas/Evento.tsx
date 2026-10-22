"use client";

import { avisar } from "../../lib/avisar";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { Icon } from "../../lib/icons";
import { formatDateBR, joinDot } from "../../lib/date";

import { useTermos } from "../../lib/vocabulario-context";
import { Av } from "../ui";
import { friendlyWriteError } from "../erros";
import { type CoberturaTime } from "../../modules/escalas/cobertura";
import { Cobertura } from "../../modules/escalas/Cobertura";
import { ROUTES } from "../comum";
import { DrawerSection, DrawerShell, TimePicker } from "../campos";
import type { CronoStep, DrawerState, EventRsvpView, EventView, MinistryView, PersonView, RosterAssignmentView } from "../tipos";

import { Botao, BotaoIcone } from "../../ui/Botao";
import { Acao } from "../../ui/Acao";
import { Opcao } from "../../ui/Opcao";
import { Linha } from "../../ui/Linha";
import { Segmentado } from "../../ui/Segmentado";
import { Campo, Entrada, TextoLongo, Marcar } from "../../ui/Campo";
import { Selecao } from "../../ui/Selecao";
export function EventDrawer({
  event,
  ministries,
  people,
  roster,
  rsvps = [],
  cobertura = [],
  onAbrirVagas,
  onClose,
  setDrawer,
  setRoute,
  setShareEventId,
}: {
  event: EventView;
  ministries: MinistryView[];
  people: PersonView[];
  roster: RosterAssignmentView[];
  rsvps?: EventRsvpView[];
  cobertura?: CoberturaTime[];
  onAbrirVagas?: (timeId: string) => void;
  onClose: () => void;
  setDrawer: (drawer: DrawerState) => void;
  setRoute: (route: keyof typeof ROUTES) => void;
  setShareEventId: (id: string) => void;
}) {
  const { comTermos: ct } = useTermos();
  const router = useRouter();
  const [tab, setTab] = useState<"crono" | "posicoes" | "membro">("crono");
  const eventRoster = roster.filter((assignment) => assignment.event_id === event.id);
  const eventMinistries = event.ministries.length ? ministries.filter((ministry) => event.ministries.includes(ministry.id)) : ministries;

  return (
    <DrawerShell onClose={onClose} wide>
      <div className="drawer-head">
        <BotaoIcone className="drawer-close" rotulo="Fechar" onClick={onClose}>✕</BotaoIcone>
        <div className="ph-eyebrow" style={{ marginBottom: 8 }}>{joinDot(event.weekday, formatDateBR(event.eventDate))}</div>
        <div className="profile-name">{event.name}</div>
        <div className="profile-role">{joinDot(event.time, event.location, event.kind)}</div>
        <Cobertura itens={cobertura} onAbrir={onAbrirVagas} />
        <Segmentado style={{ marginTop: 14 }}>
          <Opcao marcada={tab === "crono"} onClick={() => setTab("crono")}>Cronograma</Opcao>
          <Opcao marcada={tab === "posicoes"} onClick={() => setTab("posicoes")}>Posições</Opcao>
          <Opcao marcada={tab === "membro"} onClick={() => setTab("membro")}>Para o membro</Opcao>
        </Segmentado>
      </div>
      <div className="drawer-body">
        {tab === "membro" ? (
          <EventoParaMembro event={event} rsvps={rsvps} people={people} onSaved={() => router.refresh()} />
        ) : tab === "crono" ? (
          <>
            <DrawerSection title={ct("Roteiro do {culto} · etapa por etapa")}>
              <CronogramaEditor event={event} ministries={eventMinistries} onRefresh={() => router.refresh()} />
            </DrawerSection>
            <DrawerSection title="Setlist">
              {event.setlist.length ? event.setlist.map((song) => <Linha key={song.id}><div className="mini-main"><div className="mini-title">{song.title}</div>{song.song_key ? <div className="mini-sub">Tom: {song.song_key}</div> : null}</div></Linha>) : <p className="mini-sub">Nenhuma música cadastrada.</p>}
            </DrawerSection>
          </>
        ) : (
          <>
            {eventMinistries.map((ministry) => (
              <DrawerSection title={ministry.name} key={ministry.id}>
                {(ministry.positions.length ? ministry.positions : [{ id: `${ministry.id}-geral`, ministry_id: ministry.id, name: "Equipe", need_count: 1, sort_order: 0 }]).map((position) => {
                  const assignments = eventRoster.filter((assignment) => assignment.position_id === position.id);
                  const valid = assignments.filter((assignment) => assignment.status !== "no").length;
                  const missing = Math.max(0, Math.max(1, position.need_count) - valid);
                  return (
                    <div key={position.id} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                        <span className="esc-fn" style={{ fontSize: "var(--fs-pn-13)" }}>{position.name}</span>
                        <span className="panel-meta">{valid}/{Math.max(1, position.need_count)}</span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                        {assignments.map((assignment) => {
                          const person = people.find((candidate) => candidate.id === assignment.person_id);
                          return (
                            <Acao key={assignment.id} className="slot" style={{ margin: 0, width: "auto" }} onClick={() => person && setDrawer({ kind: "person", id: person.id })}>
                              <Av name={person?.name ?? "Voluntário"} size="xs" photoUrl={person?.photoUrl} />
                              <span className="slot-name" style={{ maxWidth: 120 }}>{person?.name.split(" ")[0] ?? "Pessoa"}</span>
                              <span className={`slot-st ${assignment.status}`} />
                            </Acao>
                          );
                        })}
                        {Array.from({ length: missing }).map((_, index) => (
                          <Acao key={`${position.id}-missing-${index}`} className="slot-empty" style={{ width: "auto", padding: "7px 14px" }} onClick={() => { onClose(); setRoute("escalas"); }}>+ vaga</Acao>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </DrawerSection>
            ))}
          </>
        )}
        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <Botao variante="principal" style={{ flex: 1, justifyContent: "center" }} onClick={() => { onClose(); setRoute("escalas"); }}>Editar escala</Botao>
          <Botao style={{ flex: 1, justifyContent: "center" }} onClick={() => setShareEventId(event.id)}><Icon name="comunicacao" size={15} /> Setup da celebração</Botao>
        </div>
      </div>
    </DrawerShell>
  );
}

/* v7 4.5: o que o evento pede a quem vê no app (só aviso, confirmar presença
   ou inscrição), valor e instruções. O app não recebe pagamento: mostra o
   valor e as instruções escritas aqui. */
export const PEDE_OPCOES: { v: "aviso" | "presenca" | "inscricao"; t: string; s: string }[] = [
  { v: "aviso", t: "Só aviso", s: "Aparece na agenda, sem pedir nada" },
  { v: "presenca", t: "Confirmar presença", s: "A pessoa toca em \"Vou\"" },
  { v: "inscricao", t: "Inscrição", s: "A pessoa se inscreve pelo app" },
];
export function EventoParaMembro({ event, rsvps, people, onSaved }: { event: EventView; rsvps: EventRsvpView[]; people: PersonView[]; onSaved: () => void }) {
  const [pede, setPede] = useState<"aviso" | "presenca" | "inscricao">(event.pede ?? "aviso");
  const [valor, setValor] = useState(event.valor ?? "");
  const [instrucoes, setInstrucoes] = useState(event.instrucoes ?? "");
  const [salvando, setSalvando] = useState(false);
  const mudou = pede !== (event.pede ?? "aviso") || valor !== (event.valor ?? "") || instrucoes !== (event.instrucoes ?? "");
  const salvar = async () => {
    setSalvando(true);
    const { error } = await createServiceBrowserClient().schema("service").from("events")
      .update({ pede, valor: valor.trim() || null, instrucoes: instrucoes.trim() || null }).eq("id", event.id);
    setSalvando(false);
    if (error) { avisar(friendlyWriteError(error.message), "warn"); return; }
    avisar("Salvo", "ok");
    onSaved();
  };
  const nomes = rsvps.map((r) => people.find((p) => p.id === r.person_id)?.name).filter(Boolean) as string[];
  return (
    <>
      <DrawerSection title="O que este evento pede">
        <div style={{ display: "grid", gap: 8 }}>
          {PEDE_OPCOES.map((o) => (
            <Marcar key={o.v} tipo="radio" className={`pede-opt${pede === o.v ? " on" : ""}`} name={`pede-${event.id}`} checked={pede === o.v} onChange={() => setPede(o.v)}>
              <b style={{ fontSize: "var(--fs-pn-14)" }}>{o.t}</b><br /><span className="mini-sub">{o.s}</span>
            </Marcar>
          ))}
        </div>
      </DrawerSection>
      <DrawerSection title="Valor e instruções">
        <Campo rotulo="Valor (opcional)"><Entrada value={valor} onChange={(e) => setValor(e.target.value)} placeholder="ex: R$ 50 por pessoa" /></Campo>
        <Campo rotulo="Instruções para quem vai"><TextoLongo rows={4} value={instrucoes} onChange={(e) => setInstrucoes(e.target.value)} placeholder="Chave PIX, prazo, com quem falar..." /></Campo>
        <p className="mini-sub">O app mostra o valor e estas instruções. O pagamento não passa pelo app.</p>
      </DrawerSection>
      {pede !== "aviso" && (
        <DrawerSection title={pede === "inscricao" ? "Inscritos" : "Confirmaram presença"}>
          {nomes.length ? nomes.map((n) => <Linha key={n}><div className="mini-main"><div className="mini-title">{n}</div></div></Linha>) : <p className="mini-sub">Ninguém ainda.</p>}
        </DrawerSection>
      )}
      <div style={{ display: "flex", marginTop: 16 }}>
        <Botao variante="principal" desativado={!mudou || salvando} onClick={salvar}>{salvando ? "Salvando..." : "Salvar"}</Botao>
      </div>
    </>
  );
}

export function parseHoraMin(h: string | null): number {
  const m = String(h || "").match(/(\d{1,2})[h:](\d{0,2})/);
  return m ? (+m[1]) * 60 + (+(m[2] || 0)) : 19 * 60;
}
export function minToHora(min: number): string {
  min = ((min % 1440) + 1440) % 1440;
  return String(Math.floor(min / 60)).padStart(2, "0") + "h" + String(min % 60).padStart(2, "0");
}
export function fmtDuracaoMin(min: number): string {
  const h = Math.floor(min / 60), m = min % 60;
  return (h ? h + "h" : "") + (m || !h ? String(m).padStart(h ? 2 : 1, "0") + "min" : "");
}

export function CronogramaEditor({ event, ministries, onRefresh }: { event: EventView; ministries: MinistryView[]; onRefresh: () => void }) {
  const { comTermos: ct } = useTermos();
  const [steps, setSteps] = useState<CronoStep[]>(event.schedule);
  const [horaInicio, setHoraInicio] = useState(event.time);
  const client = () => createServiceBrowserClient().schema("service");

  const leaderOf = (ministryId: string | null) => {
    if (!ministryId) return null;
    return ministries.find((m) => m.id === ministryId)?.people.find((p) => p.isLeader) ?? null;
  };
  const leaderName = (ministryId: string | null) => leaderOf(ministryId)?.personName ?? "a definir";

  const recalc = (list: CronoStep[], anchor: string) => {
    let acc = parseHoraMin(anchor);
    return list.map((s) => {
      const time = minToHora(acc);
      acc += s.duration_min || 0;
      return { ...s, time };
    });
  };

  const commit = async (list: CronoStep[]) => {
    const recalced = recalc(list, horaInicio);
    setSteps(recalced);
    await Promise.all(recalced.map((s) => client().from("event_schedule_items").update({ time: s.time }).eq("id", s.id)));
    onRefresh();
  };

  const setHora = async (v: string) => {
    setHoraInicio(v);
    await client().from("events").update({ time: v }).eq("id", event.id);
    const recalced = recalc(steps, v);
    setSteps(recalced);
    await Promise.all(recalced.map((s) => client().from("event_schedule_items").update({ time: s.time }).eq("id", s.id)));
    onRefresh();
  };

  const addStep = async () => {
    const { data } = await client().from("event_schedule_items").insert({
      organization_id: event.organizationId, event_id: event.id, item: "", duration_min: 15, sort_order: steps.length,
    }).select().single();
    if (data) await commit([...steps, data as CronoStep]);
  };

  const removeStep = async (id: string) => {
    await client().from("event_schedule_items").delete().eq("id", id);
    await commit(steps.filter((s) => s.id !== id));
  };

  const moveStep = async (index: number, delta: number) => {
    const j = index + delta;
    if (j < 0 || j >= steps.length) return;
    const next = [...steps];
    [next[index], next[j]] = [next[j], next[index]];
    await Promise.all([
      client().from("event_schedule_items").update({ sort_order: index }).eq("id", next[index].id),
      client().from("event_schedule_items").update({ sort_order: j }).eq("id", next[j].id),
    ]);
    await commit(next);
  };

  const patch = (id: string, fields: Partial<CronoStep>) => setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...fields } : s)));
  const commitField = async (id: string, fields: Record<string, unknown>) => {
    await client().from("event_schedule_items").update(fields).eq("id", id);
    onRefresh();
  };
  const setDuracao = async (id: string, dur: number) => {
    await commit(steps.map((s) => (s.id === id ? { ...s, duration_min: dur } : s)));
    await client().from("event_schedule_items").update({ duration_min: dur }).eq("id", id);
  };
  const setMinistryId = async (id: string, ministryId: string) => {
    const leader = leaderOf(ministryId || null);
    const fields = { ministry_id: ministryId || null, person_id: leader?.personId ?? null };
    patch(id, fields);
    await commitField(id, fields);
  };

  const totalGeral = steps.reduce((sum, s) => sum + (s.duration_min || 0), 0);
  const fimCulto = minToHora(parseHoraMin(horaInicio) + totalGeral);

  return (
    <div className="crono">
      <div className="crono-anchor">
        <div className="crono-anchor-f">
          <label>{ct("Início do {culto}")}</label>
          <TimePicker value={horaInicio} onChange={setHora} />
        </div>
        <div className="crono-anchor-note">As etapas seguem em sequência somando as durações. Você só informa quanto dura cada uma. Término previsto: <b>{fimCulto}</b>.</div>
      </div>
      {steps.length === 0 && <div className="crono-empty">{ct("Sem cronograma ainda. Monte o roteiro do {culto}, etapa por etapa, a duração e o time responsável. O horário é calculado sozinho.")}</div>}
      <div className="crono-list">
        {steps.map((s, i) => (
          <div className="crono-step" key={s.id}>
            <div className="crono-rail">
              <div className="crono-hora">{s.time ?? minToHora(parseHoraMin(horaInicio))}</div>
              <div className="crono-dot" />
              {i < steps.length - 1 && <div className="crono-line" />}
            </div>
            <div className="crono-body">
              <div className="crono-row1">
                <input className="crono-item-in" placeholder={ct("Etapa do {culto} (ex: Momento de louvor)")} value={s.item} onChange={(e) => patch(s.id, { item: e.target.value })} onBlur={(e) => commitField(s.id, { item: e.target.value })} />
                <div className="crono-actions">
                  <Acao className="crono-mini" title="Subir" onClick={() => moveStep(i, -1)} desativado={i === 0}>↑</Acao>
                  <Acao className="crono-mini" title="Descer" onClick={() => moveStep(i, 1)} desativado={i === steps.length - 1}>↓</Acao>
                  <BotaoIcone className="crono-mini danger" title="Remover" rotulo="Remover" onClick={() => removeStep(s.id)}>✕</BotaoIcone>
                </div>
              </div>
              <div className="crono-fields">
                <div className="crono-f crono-f-dur">
                  <label>Duração</label>
                  <div className="crono-dur"><input type="number" min={0} step={5} value={s.duration_min ?? 0} onChange={(e) => setDuracao(s.id, +e.target.value)} /><span>min</span></div>
                </div>
                <div className="crono-f">
                  <label>Time (opcional)</label>
                  <Selecao rotulo="Time (opcional)" valor={s.ministry_id ?? ""} aoMudar={(v) => setMinistryId(s.id, v)} vazio="Sem time" opcoes={ministries.map((m) => ({ v: m.id, l: m.name }))} />
                </div>
                {s.ministry_id && (
                  <div className="crono-f crono-f-full">
                    <label>Responsável (líder do time)</label>
                    <div className="crono-resp-ro">{leaderName(s.ministry_id)}</div>
                  </div>
                )}
              </div>
              <input className="crono-obs" placeholder="Observação (opcional)" value={s.notes ?? ""} onChange={(e) => patch(s.id, { notes: e.target.value })} onBlur={(e) => commitField(s.id, { notes: e.target.value })} />
            </div>
          </div>
        ))}
      </div>
      <Botao compacto className="crono-add" onClick={addStep}>+ Adicionar etapa</Botao>
      {steps.length > 0 && (
        <div className="crono-totais">
          <div className="crono-tot-geral"><span>{ct("Duração total do {culto}")}</span><b>{fmtDuracaoMin(totalGeral)}</b></div>
        </div>
      )}
    </div>
  );
}
