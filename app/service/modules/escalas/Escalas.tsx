"use client";

/* Módulo Escalas (4.1): vagas por culto, quem serve, confirmar, trocar e
   remover. Saiu de ServiceExactApp.tsx sem mudar comportamento; o manifesto
   está em ./manifest.ts. Os tipos de dados do painel ainda moram em
   ServiceExactApp.tsx (import só de tipo, sem ciclo em tempo de execução). */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { plural } from "../../lib/plural";
import { baixarCsv } from "../../lib/csv";
import { formatDateBR, joinDot, toISODate } from "../../lib/date";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { Caret, Icon } from "../../lib/icons";
import { HelpDot } from "../../HelpSystem";
import { Av, Chip, PageHead } from "../../painel/ui";
import { ESCALA_DEFAULT, type EscalaPreset, type EscalaSettings } from "./regras";
import type { ChurchView, DrawerState, EventView, MinistryView, ModalState, PersonView, RosterAssignmentView, RouteId } from "../../ServiceExactApp";
import { useTermos } from "../../lib/vocabulario-context";
import { compararRodizio, fraseRodizio, ultimaVezQueServiu } from "./rodizio";
import { coberturaPorTime, vagasFaltando } from "./cobertura";
import { Cobertura } from "./Cobertura";

/* candidato apto a uma posição, com motivo de bloqueio : equivalente a
   candidatos() em evolucoes/service_app/escalas.jsx:12-30. Diferença de fidelidade
   consciente: no protótipo "férias" é uma flag solta além do status; no banco real
   ferias É um valor do enum people.status, então "considerarFerias" aqui vira o
   toggle que decide se quem está com status='ferias' entra ou não no pool. */
/* motivo do bloqueio em código; o texto legível sai na janela (v7 4.14) */
type Motivo = "evento" | "ferias" | "teto";
type Candidato = { person: PersonView; fit: "good" | "busy" | "block"; motivo: Motivo | null; vezes: number; ultima?: string };

/* v7 4.14: dentro de cada grupo, a ordem é a do rodízio (menos vezes no mês,
   depois quem serviu há mais tempo), não mais o engajamento */
function candidatosDisponiveis(
  pool: PersonView[],
  event: EventView,
  jaNoSlot: Set<string>,
  usadosNoEvento: Set<string>,
  cfg: EscalaSettings,
  cargaPorPessoa: Record<string, number>,
  ultimaVez: Record<string, string> = {},
): Candidato[] {
  return pool
    .filter((p) => p.status !== "pausa" && !jaNoSlot.has(p.id))
    .map((p) => {
      let motivo: Motivo | null = null;
      if (usadosNoEvento.has(p.id)) motivo = "evento";
      else if (p.status === "ferias" && cfg.considerarFerias) motivo = "ferias";
      else if (cfg.maxPorMes && (cargaPorPessoa[p.id] ?? 0) >= cfg.maxPorMes) motivo = "teto";
      /* disponibilidade ausente (nunca configurada) conta como disponível : só
         vira "busy" quando a pessoa marcou explicitamente que não pode nesse
         horário, senão todo voluntário novo aparecia "ocupado" sem nunca ter
         recusado nada. */
      const fit: Candidato["fit"] = motivo ? "block" : (p.availability[event.slot] === false ? "busy" : "good");
      return { person: p, fit, motivo, vezes: cargaPorPessoa[p.id] ?? 0, ultima: ultimaVez[p.id] };
    })
    .sort((a, b) => {
      const rank = (x: Candidato) => (x.fit === "good" ? 0 : x.fit === "busy" ? 1 : 2);
      return rank(a) === rank(b) ? compararRodizio(a, b) || a.person.name.localeCompare(b.person.name) : rank(a) - rank(b);
    });
}

/* nº de eventos distintos, no mesmo mês do evento-alvo, em que a pessoa já está
   escalada (status != recusou) : usado pelo teto "máximo de vezes por mês". */
function cargaDoMes(roster: RosterAssignmentView[], events: EventView[], targetEvent: EventView): Record<string, number> {
  const eventById = new Map(events.map((e) => [e.id, e]));
  const targetMonth = targetEvent.eventDate.slice(0, 7);
  const seen = new Set<string>();
  const counts: Record<string, number> = {};
  roster.forEach((assignment) => {
    if (assignment.status === "no") return;
    const ev = eventById.get(assignment.event_id);
    if (!ev || ev.eventDate.slice(0, 7) !== targetMonth) return;
    const key = `${assignment.person_id}:${assignment.event_id}`;
    if (seen.has(key)) return;
    seen.add(key);
    counts[assignment.person_id] = (counts[assignment.person_id] ?? 0) + 1;
  });
  return counts;
}

/* carga da semana corrente (segunda a domingo contendo hoje) por pessoa:
   nº de posições escaladas (status != "no") e nº de recusas ("no") : equivalente
   a cargaVol() em evolucoes/service_app/relatorios.jsx:6-16, usado pelo
   termômetro de bem-estar pra classificar sobrecarga sem depender de engajamento. */
export function cargaDaSemana(roster: RosterAssignmentView[], events: EventView[]): Record<string, { escalas: number; recusas: number }> {
  const eventById = new Map(events.map((e) => [e.id, e]));
  const hoje = new Date();
  const offsetSegunda = hoje.getDay() === 0 ? 6 : hoje.getDay() - 1;
  const segunda = new Date(hoje);
  segunda.setDate(hoje.getDate() - offsetSegunda);
  const domingo = new Date(segunda);
  domingo.setDate(segunda.getDate() + 6);
  const toIso = toISODate;
  const inicioSemana = toIso(segunda);
  const fimSemana = toIso(domingo);
  const counts: Record<string, { escalas: number; recusas: number }> = {};
  roster.forEach((assignment) => {
    const ev = eventById.get(assignment.event_id);
    if (!ev || ev.eventDate < inicioSemana || ev.eventDate > fimSemana) return;
    const atual = counts[assignment.person_id] ?? { escalas: 0, recusas: 0 };
    if (assignment.status === "no") atual.recusas += 1;
    else atual.escalas += 1;
    counts[assignment.person_id] = atual;
  });
  return counts;
}

function FuncoesEscalaModal({
  ministry,
  onClose,
  onRefresh,
}: {
  ministry: MinistryView;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [positions, setPositions] = useState(ministry.positions);
  const [nome, setNome] = useState("");
  const [need, setNeed] = useState(1);
  const [saving, setSaving] = useState(false);

  const setNeedAt = async (id: string, delta: number) => {
    const current = positions.find((p) => p.id === id);
    if (!current) return;
    const next = Math.max(1, current.need_count + delta);
    setPositions((prev) => prev.map((p) => (p.id === id ? { ...p, need_count: next } : p)));
    await createServiceBrowserClient().schema("service").from("ministry_positions").update({ need_count: next }).eq("id", id);
    onRefresh();
  };
  const rename = (id: string, name: string) => setPositions((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  const commitRename = async (id: string, name: string) => {
    await createServiceBrowserClient().schema("service").from("ministry_positions").update({ name }).eq("id", id);
    onRefresh();
  };
  const remove = async (id: string) => {
    setPositions((prev) => prev.filter((p) => p.id !== id));
    await createServiceBrowserClient().schema("service").from("ministry_positions").delete().eq("id", id);
    onRefresh();
  };
  const add = async () => {
    const n = nome.trim();
    if (!n) return;
    setSaving(true);
    const { data } = await createServiceBrowserClient()
      .schema("service")
      .from("ministry_positions")
      .insert({ organization_id: ministry.organizationId, ministry_id: ministry.id, name: n, need_count: Math.max(1, need), sort_order: positions.length })
      .select()
      .single();
    if (data) setPositions((prev) => [...prev, data as MinistryView["positions"][number]]);
    setNome("");
    setNeed(1);
    setSaving(false);
    onRefresh();
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Funções · {ministry.name}</div>
          <div className="modal-title">Quem o time precisa</div>
          <div className="modal-sub">Adicione, renomeie ou remova funções e diga quantas pessoas cada uma precisa. Vale para todos os eventos deste time.</div>
        </div>
        <div className="modal-body" style={{ display: "block" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            {positions.map((position) => (
              <div className="func-edit-row" key={position.id}>
                <input className="input" value={position.name} onChange={(e) => rename(position.id, e.target.value)} onBlur={(e) => commitRename(position.id, e.target.value)} />
                <div className="stepper">
                  <button type="button" onClick={() => setNeedAt(position.id, -1)}>−</button>
                  <span>{position.need_count}</span>
                  <button type="button" onClick={() => setNeedAt(position.id, 1)}>+</button>
                </div>
                <button className="func-edit-x" type="button" title="Remover função" onClick={() => remove(position.id)}><Icon name="recusou" size={15} /></button>
              </div>
            ))}
            {positions.length === 0 && <div className="empty" style={{ padding: "8px 0" }}>Nenhuma função ainda.</div>}
          </div>
          <div className="dsec-title" style={{ marginBottom: 8 }}>Nova função</div>
          <div className="func-edit-add">
            <input className="input" placeholder="ex: Vocal, Câmera, Recepção" value={nome} onChange={(e) => setNome(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
            <div className="stepper"><button type="button" onClick={() => setNeed((n) => Math.max(1, n - 1))}>−</button><span>{need}</span><button type="button" onClick={() => setNeed((n) => n + 1)}>+</button></div>
            <button className="btn btn-sec btn-sm" type="button" disabled={saving} onClick={add}>+ Função</button>
          </div>
        </div>
        <div className="modal-foot"><button className="btn btn-pri" type="button" onClick={onClose}>Concluído</button></div>
      </div>
    </div>
  );
}

function DelegarModal({
  ministries,
  church,
  onClose,
  onRefresh,
}: {
  ministries: MinistryView[];
  church: ChurchView | undefined;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const { comTermos: ct } = useTermos();
  const [ministryId, setMinistryId] = useState(ministries[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const ministry = ministries.find((m) => m.id === ministryId);
  const delegados: string[] = (church?.settings?.escalaDelegados ?? {})[ministryId] ?? [];
  const elenco = (ministry?.people ?? []).filter((link) => !link.isLeader);

  const toggle = async (personId: string) => {
    if (!church?.id || !ministryId) return;
    setSaving(true);
    const atual: Record<string, string[]> = { ...(church.settings?.escalaDelegados ?? {}) };
    const lista = atual[ministryId] ?? [];
    atual[ministryId] = lista.includes(personId) ? lista.filter((id) => id !== personId) : [...lista, personId];
    await createServiceBrowserClient().schema("service").from("churches").update({ settings: { ...church.settings, escalaDelegados: atual } }).eq("id", church.id);
    setSaving(false);
    onRefresh();
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Delegar gestão da escala</div>
          <div className="modal-title">Quem mais pode montar a escala</div>
          <div className="modal-sub">As pessoas escolhidas passam a ver e gerir a escala deste time, como você.</div>
        </div>
        <div className="modal-body" style={{ display: "block" }}>
          {ministries.length > 1 && (
            <div className="seg" style={{ marginBottom: 14, flexWrap: "wrap" }}>
              {ministries.map((m) => <button key={m.id} type="button" className={ministryId === m.id ? "on" : ""} onClick={() => setMinistryId(m.id)}>{m.name.split(" ")[0]}</button>)}
            </div>
          )}
          {elenco.length === 0 && <div className="empty">Ninguém mais neste time ainda.</div>}
          {elenco.map((link) => {
            const on = delegados.includes(link.personId);
            return (
              <button type="button" className={`flag-row${on ? " on" : ""}`} key={link.personId} disabled={saving} onClick={() => toggle(link.personId)}>
                <span className={`flag-check${on ? " on" : ""}`}>{on ? <Icon name="ok" size={13} /> : null}</span>
                <Av name={link.personName} size="sm" />
                <div className="flag-main"><div className="flag-nome">{link.personName}</div><div className="flag-meta">{link.functions.join(" · ") || ct("{Voluntario}")}</div></div>
              </button>
            );
          })}
        </div>
        <div className="modal-foot"><button className="btn btn-pri" type="button" onClick={onClose}>Concluído</button></div>
      </div>
    </div>
  );
}

function PresetSaveModal({
  ministries,
  church,
  onClose,
  onRefresh,
}: {
  ministries: MinistryView[];
  church: ChurchView | undefined;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [nome, setNome] = useState("");
  const [saving, setSaving] = useState(false);
  const salvar = async () => {
    const n = nome.trim();
    if (!n || !church?.id) return;
    setSaving(true);
    const posicoes: EscalaPreset["posicoes"] = {};
    ministries.forEach((ministry) => { posicoes[ministry.id] = ministry.positions.map((p) => ({ name: p.name, need_count: p.need_count })); });
    const preset: EscalaPreset = { id: `preset_${Date.now()}`, nome: n, posicoes };
    const presets = [...(church.settings?.escalaPresets ?? []), preset];
    await createServiceBrowserClient().schema("service").from("churches").update({ settings: { ...church.settings, escalaPresets: presets } }).eq("id", church.id);
    setSaving(false);
    onRefresh();
    onClose();
  };
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Configuração padrão</div>
          <div className="modal-title">Salvar como…</div>
          <div className="modal-sub">Guarda as funções e quantidades atuais de todos os times. Crie uma para "Culto", outra para "Reunião", e aplique quando quiser.</div>
        </div>
        <div className="modal-body" style={{ display: "block" }}>
          <div className="field"><label className="field-label">Nome da configuração</label><input className="input" placeholder="ex: Culto de domingo" value={nome} onChange={(e) => setNome(e.target.value)} onKeyDown={(e) => e.key === "Enter" && salvar()} /></div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-sec" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn btn-pri" type="button" disabled={saving} onClick={salvar}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

export function Escalas({
  foco,
  gaps,
  roster,
  people,
  ministries,
  events,
  church,
  scopeMinistryIds,
  setDrawer,
  setModal,
  setRoute,
  setCheckinEventId,
  onNotifyLeaderRecusa,
}: {
  gaps: Array<{ event: EventView; ministry: MinistryView; position: { id: string; name: string } }>;
  roster: RosterAssignmentView[];
  people: PersonView[];
  ministries: MinistryView[];
  events: EventView[];
  church: ChurchView | undefined;
  scopeMinistryIds: string[] | null;
  setDrawer: (drawer: DrawerState) => void;
  setModal: (modal: ModalState) => void;
  setRoute: (route: RouteId) => void;
  setCheckinEventId: (id: string | null) => void;
  onNotifyLeaderRecusa: (leaderPersonId: string, volunteerPersonId: string, texto: string) => void;
  /* v7 4.16: veio da cobertura (Início, detalhe do culto): abre neste culto e rola até o time */
  foco?: { eventId: string; timeId?: string } | null;
}) {
  const { comTermos: ct } = useTermos();
  const [eventId, setEventId] = useState(foco?.eventId ?? events[0]?.id ?? "");
  useEffect(() => {
    if (!foco?.timeId) return;
    const el = document.getElementById(`esc-col-${foco.timeId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    el?.focus({ preventScroll: true });
  }, [foco?.timeId]);
  const router = useRouter();
  const escalaCfg: EscalaSettings = { ...ESCALA_DEFAULT, ...(church?.settings?.escala ?? {}) };
  const [slotAction, setSlotAction] = useState<{
    kind: "slot" | "assign" | "swap";
    event: EventView;
    ministry: MinistryView;
    position: { id: string; name: string; need_count: number };
    assignment?: RosterAssignmentView;
  } | null>(null);
  const [funcEdit, setFuncEdit] = useState<MinistryView | null>(null);
  /* no celular os times ficam empilhados e cada um recolhe (service-v6.css) */
  const [timesFechados, setTimesFechados] = useState<Set<string>>(() => new Set());
  const alternarTime = (id: string) => setTimesFechados((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const [delegarOpen, setDelegarOpen] = useState(false);
  const [presetSaveOpen, setPresetSaveOpen] = useState(false);
  const [gerando, setGerando] = useState(false);

  const selectedEvent = events.find((event) => event.id === eventId) ?? events[0] ?? null;
  const eventRoster = selectedEvent ? roster.filter((assignment) => assignment.event_id === selectedEvent.id) : [];
  const occupiedPeople = new Set(eventRoster.filter((assignment) => assignment.status !== "no").map((assignment) => assignment.person_id));
  const misteriosDoEvento = selectedEvent?.ministries.length
    ? ministries.filter((ministry) => selectedEvent.ministries.includes(ministry.id))
    : ministries;
  /* líder real (ou master/pastor pré-visualizando como líder) só vê os times do escopo;
     equivalente a view.papel/timesVis em evolucoes/service_app/escalas.jsx:384. */
  const visibleMinistries = scopeMinistryIds
    ? misteriosDoEvento.filter((ministry) => scopeMinistryIds.includes(ministry.id))
    : misteriosDoEvento;
  const confirmed = eventRoster.filter((assignment) => assignment.status === "ok").length;
  const totalSlots = visibleMinistries.reduce((sum, ministry) => sum + ministry.positions.reduce((total, position) => total + Math.max(1, position.need_count), 0), 0);
  const openSlots = Math.max(0, totalSlots - eventRoster.filter((assignment) => assignment.status !== "no").length);

  function assignmentsFor(positionId: string) {
    return eventRoster.filter((assignment) => assignment.position_id === positionId);
  }

  function positionsOf(ministry: MinistryView) {
    return ministry.positions.length ? ministry.positions : [{ id: `${ministry.id}-geral`, ministry_id: ministry.id, name: "Equipe", need_count: 1 }];
  }

  function candidatePool(ministry: MinistryView): PersonView[] {
    const linked = ministry.people
      .map((link) => people.find((person) => person.id === link.personId))
      .filter(Boolean) as PersonView[];
    return linked.length ? linked : people;
  }

  function candidatosParaVaga(ministry: MinistryView, positionId: string, excluirPersonId?: string): Candidato[] {
    if (!selectedEvent) return [];
    const jaNoSlot = new Set(assignmentsFor(positionId).map((a) => a.person_id));
    const usados = new Set([...occupiedPeople].filter((id) => id !== excluirPersonId));
    const carga = cargaDoMes(roster, events, selectedEvent);
    return candidatosDisponiveis(candidatePool(ministry), selectedEvent, jaNoSlot, usados, escalaCfg, carga, ultimaVezQueServiu(roster, events));
  }

  const setModoEscala = async (modo: EscalaSettings["modo"]) => {
    if (!church?.id) return;
    await createServiceBrowserClient().schema("service").from("churches").update({ settings: { ...church.settings, escala: { ...escalaCfg, modo } } }).eq("id", church.id);
    router.refresh();
  };

  const confirmarAssignment = async (assignmentId: string) => {
    await createServiceBrowserClient().schema("service").from("roster_assignments").update({ status: "ok" }).eq("id", assignmentId);
    router.refresh();
  };
  const deixarPendenteAssignment = async (assignmentId: string) => {
    await createServiceBrowserClient().schema("service").from("roster_assignments").update({ status: "wait" }).eq("id", assignmentId);
    router.refresh();
  };
  const removerAssignment = async (assignmentId: string) => {
    await createServiceBrowserClient().schema("service").from("roster_assignments").delete().eq("id", assignmentId);
    router.refresh();
  };
  const trocarAssignment = async (assignmentId: string, novoPersonId: string) => {
    await createServiceBrowserClient().schema("service").from("roster_assignments").update({ person_id: novoPersonId, status: "wait" }).eq("id", assignmentId);
    router.refresh();
  };
  const escalarPessoa = async (event: EventView, positionId: string, personId: string) => {
    await createServiceBrowserClient().schema("service").from("roster_assignments").insert({
      organization_id: event.organizationId, event_id: event.id, position_id: positionId, person_id: personId,
      status: escalaCfg.modo === "automatico" ? "ok" : "wait",
    });
    router.refresh();
  };
  const recusarAssignment = async (assignment: RosterAssignmentView, ministry: MinistryView) => {
    await createServiceBrowserClient().schema("service").from("roster_assignments").update({ status: "no" }).eq("id", assignment.id);
    if (escalaCfg.modo === "automatico" && escalaCfg.naRecusa === "proximo" && selectedEvent) {
      const proximo = candidatosParaVaga(ministry, assignment.position_id, assignment.person_id).find((c) => c.fit !== "block");
      if (proximo) {
        await createServiceBrowserClient().schema("service").from("roster_assignments").insert({
          organization_id: selectedEvent.organizationId, event_id: selectedEvent.id, position_id: assignment.position_id, person_id: proximo.person.id, status: "ok",
        });
      }
    }
    if (escalaCfg.naRecusa === "avisar") {
      const lider = ministry.people.find((p) => p.isLeader);
      const voluntario = people.find((p) => p.id === assignment.person_id);
      const posicao = positionsOf(ministry).find((pos) => pos.id === assignment.position_id);
      if (lider && voluntario) {
        onNotifyLeaderRecusa(lider.personId, assignment.person_id, `${voluntario.name} recusou a escala de ${posicao?.name ?? ministry.name} em ${selectedEvent?.name ?? "um evento"}${selectedEvent?.eventDate ? ` · ${formatDateBR(selectedEvent.eventDate)}` : ""} · vaga em aberto.`);
      }
    }
    router.refresh();
  };

  const gerarAuto = async () => {
    if (!selectedEvent || gerando) return;
    setGerando(true);
    const carga = cargaDoMes(roster, events, selectedEvent);
    const ultimas = ultimaVezQueServiu(roster, events);
    const usados = new Set(occupiedPeople);
    const inserts: Array<{ organization_id: string; event_id: string; position_id: string; person_id: string; status: "ok" | "wait" }> = [];
    visibleMinistries.forEach((ministry) => {
      positionsOf(ministry).forEach((position) => {
        const assignments = assignmentsFor(position.id);
        let missing = Math.max(0, Math.max(1, position.need_count) - assignments.filter((a) => a.status !== "no").length);
        if (!missing) return;
        const jaNoSlot = new Set(assignments.map((a) => a.person_id));
        const candidatos = candidatosDisponiveis(candidatePool(ministry), selectedEvent, jaNoSlot, usados, escalaCfg, carga, ultimas);
        for (const candidato of candidatos) {
          if (!missing) break;
          if (candidato.fit === "block") continue;
          inserts.push({ organization_id: selectedEvent.organizationId, event_id: selectedEvent.id, position_id: position.id, person_id: candidato.person.id, status: escalaCfg.modo === "automatico" ? "ok" : "wait" });
          usados.add(candidato.person.id);
          carga[candidato.person.id] = (carga[candidato.person.id] ?? 0) + 1;
          missing--;
        }
      });
    });
    if (inserts.length) {
      await createServiceBrowserClient().schema("service").from("roster_assignments").insert(inserts);
      router.refresh();
    }
    setGerando(false);
  };

  useEffect(() => {
    if (escalaCfg.modo === "automatico" && selectedEvent) {
      gerarAuto();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEvent?.id, escalaCfg.modo]);

  const baixarCSV = () => {
    if (!selectedEvent) return;
    const rows: string[][] = [["Time", "Função", "Pessoas"]];
    visibleMinistries.forEach((ministry) => {
      positionsOf(ministry).forEach((position) => {
        const nomes = assignmentsFor(position.id).map((a) => `${people.find((p) => p.id === a.person_id)?.name ?? "?"} (${a.status})`).join(" / ");
        rows.push([ministry.name, position.name, nomes]);
      });
    });
    baixarCsv(`escala-${selectedEvent.id}.csv`, rows);
  };

  const aplicarPreset = async (preset: EscalaPreset) => {
    const ops: PromiseLike<unknown>[] = [];
    Object.entries(preset.posicoes).forEach(([ministryId, posicoes]) => {
      const ministry = ministries.find((m) => m.id === ministryId);
      if (!ministry) return;
      posicoes.forEach(({ name, need_count }) => {
        const existing = ministry.positions.find((p) => p.name === name);
        const client = createServiceBrowserClient().schema("service").from("ministry_positions");
        ops.push(existing
          ? client.update({ need_count }).eq("id", existing.id)
          : client.insert({ organization_id: ministry.organizationId, ministry_id: ministryId, name, need_count, sort_order: ministry.positions.length }));
      });
    });
    await Promise.all(ops);
    router.refresh();
  };

  /* texto de perspectiva por papel, equivalente a evolucoes/service_app/escalas.jsx:384 */
  const perspectiveText = scopeMinistryIds
    ? (visibleMinistries.length > 1 ? `Você está vendo os ${visibleMinistries.length} times que lidera.` : `Você está vendo só o ${visibleMinistries[0]?.name ?? "seu time"}.`)
    : "A Direção vê todos os times.";

  return (
    <div className="content wide">
      <PageHead
        title="Escalas por evento"
        eyebrow="Operação"
        subtitle={ct(`Escolha o {culto} e veja as vagas de cada time. ${perspectiveText} Toque numa pessoa para confirmar, trocar ou remover; em Escalar para preencher a vaga.`)}
        help={ct("Monte quem serve em cada {culto}. As pessoas confirmam ou recusam direto no celular, e a vaga em aberto aparece em vermelho.")}
        action={
          <>
            <button className="btn btn-sec" type="button" onClick={() => setDelegarOpen(true)}><Icon name="membros" size={15} /> Delegar</button>
            <button className="btn btn-sec" type="button" onClick={() => setCheckinEventId(selectedEvent?.id ?? null)} disabled={!selectedEvent}><Icon name="cultos" size={15} /> QR Check-in</button>
            <button className="btn btn-sec" type="button" onClick={baixarCSV} disabled={!selectedEvent}><Icon name="relatorios" size={15} /> Baixar</button>
            <button className="btn btn-pri" type="button" onClick={() => setModal({ eyebrow: "Publicar", title: "Publicar e avisar", subtitle: "A equipe recebe a escala pelo app e pelas notificações configuradas.", saveLabel: "Publicar e avisar →", formFields: [{ k:"msg", label:"Mensagem (opcional)", type:"area", ph:"Recado que vai junto com a escala..." }] })}>Publicar & avisar →</button>
          </>
        }
      />

      <div className="esc-events">
        {events.map((event) => (
          <button className={`esc-event ${selectedEvent?.id === event.id ? "on" : ""}`} key={event.id} type="button" onClick={() => setEventId(event.id)}>
            <span className="esc-event-day">{joinDot(event.weekday, formatDateBR(event.eventDate))}</span>
            <span className="esc-event-name">{event.name}</span>
            <span className="esc-event-time">{joinDot(event.time, event.location)}</span>
            {(() => {
              /* v7 4.16: um resumo por culto; a cobertura por time aparece embaixo, no culto escolhido */
              const falta = vagasFaltando(coberturaPorTime(event, roster, ministries, scopeMinistryIds));
              return <span className={`esc-event-cob ${falta ? "falta" : "ok"}`}>{falta ? `faltam ${plural(falta, "vaga")}` : "completo"}</span>;
            })()}
          </button>
        ))}
      </div>

      <details className="esc-gerar">
        <summary><Icon name="escalas" size={15} /> Como gerar <span className="esc-gerar-modo">{escalaCfg.modo === "manual" ? "Manual" : escalaCfg.modo === "assistido" ? "Assistida" : "Automática"}</span><Caret size={14} /></summary>
        <div className="esc-modo">
        <span className="esc-modo-lbl">Geração da escala</span>
        <div className="seg seg-sm">
          {(["manual", "assistido", "automatico"] as const).map((key) => (
            <button key={key} className={escalaCfg.modo === key ? "on" : ""} type="button" onClick={() => setModoEscala(key)}>{key === "manual" ? "Manual" : key === "assistido" ? "Assistida" : "Automática"}</button>
          ))}
        </div>
        <span className="esc-modo-hint">
          {escalaCfg.modo === "manual" ? "Você monta tudo na mão." : null}
          {escalaCfg.modo === "assistido" ? "O sistema sugere os nomes; você confirma cada um." : null}
          {escalaCfg.modo === "automatico" ? "O sistema gera e já confirma. Na recusa, chama o próximo apto." : null}
        </span>
        {escalaCfg.modo !== "manual" ? <button className="btn btn-sec btn-sm" type="button" disabled={gerando} onClick={gerarAuto}><Icon name="escalas" size={14} /> {gerando ? "Gerando…" : (escalaCfg.modo === "automatico" ? "Gerar a escala" : "Sugerir nomes")}</button> : null}
        <span className="tb-spacer" />
        <span className="esc-preset">
          <Icon name="escalas" size={13} />
          <select className="esc-preset-sel" value="" onChange={(e) => { const preset = (church?.settings?.escalaPresets ?? []).find((p) => p.id === e.target.value); if (preset) aplicarPreset(preset); }}>
            <option value="">Aplicar configuração…</option>
            {(church?.settings?.escalaPresets ?? []).map((preset) => <option key={preset.id} value={preset.id}>{preset.nome}</option>)}
          </select>
          <button className="esc-preset-save" type="button" onClick={() => setPresetSaveOpen(true)}>Salvar atual</button>
        </span>
        <button className="esc-modo-cfg" type="button" onClick={() => setRoute("config")}><Icon name="config" size={13} /> Regras</button>
      </div>

      </details>
      <div className="toolbar" style={{ marginTop: 4 }}>
        <span className="panel-meta">{selectedEvent ? <><b style={{ color: "var(--light)" }}>{selectedEvent.name}</b>{joinDot(selectedEvent.weekday, selectedEvent.time) ? ` · ${joinDot(selectedEvent.weekday, selectedEvent.time)}` : ""}</> : "Selecione um evento"}</span>
        <div className="tb-spacer" />
        <span className="panel-meta" style={{ marginRight: 14 }}><span style={{ color: "var(--olive-soft)" }}>{confirmed}</span> confirmados</span>
        {openSlots > 0 ? <span className="panel-meta"><span style={{ color: "var(--amber)" }}>{openSlots}</span> vagas</span> : null}
      </div>
      {selectedEvent && (
        <Cobertura
          itens={coberturaPorTime(selectedEvent, roster, ministries, scopeMinistryIds)}
          onAbrir={(timeId) => {
            setTimesFechados((prev) => { const n = new Set(prev); n.delete(timeId); return n; });
            const el = document.getElementById(`esc-col-${timeId}`);
            el?.scrollIntoView({ behavior: "smooth", block: "start" });
            el?.focus({ preventScroll: true });
          }}
        />
      )}

      <div className="esc-cols">
        {visibleMinistries.map((ministry) => {
          const ministryPositions = positionsOf(ministry);
          const ministryNeed = ministryPositions.reduce((sum, position) => sum + Math.max(1, position.need_count), 0);
          /* um número por time: vagas preenchidas (confirmado ou aguardando) sobre o total */
          const ministryFilled = ministryPositions.reduce((sum, position) => sum + Math.min(Math.max(1, position.need_count), assignmentsFor(position.id).filter((assignment) => assignment.status !== "no").length), 0);
          return (
            <div className={`esc-col${timesFechados.has(ministry.id) ? " closed" : ""}`} key={ministry.id} id={`esc-col-${ministry.id}`} tabIndex={-1}>
              <div className="esc-col-head">
                <span className="esc-col-mark"><Icon name="times" size={17} /></span>
                <div className="esc-col-info">
                  <div className="esc-col-tname">{ministry.name}</div>
                  <div className="esc-col-tmeta">{ministryFilled >= ministryNeed ? `Completo · ${plural(ministryNeed, "vaga")}` : `${ministryFilled} de ${plural(ministryNeed, "vaga")}`}</div>
                </div>
                <button className="esc-col-edit" title="Editar funções deste time" type="button" onClick={() => setFuncEdit(ministry)}><Icon name="config" size={14} /></button>
                <button className="esc-col-tog" type="button" aria-expanded={!timesFechados.has(ministry.id)} aria-label={timesFechados.has(ministry.id) ? `Abrir ${ministry.name}` : `Recolher ${ministry.name}`} onClick={() => alternarTime(ministry.id)}>
                  <Icon name="avancar" size={15} />
                </button>
              </div>
              <div className="esc-col-body">
                {ministryPositions.map((position) => {
                  const assignments = assignmentsFor(position.id);
                  const validAssignments = assignments.filter((assignment) => assignment.status !== "no");
                  const missing = Math.max(0, Math.max(1, position.need_count) - validAssignments.length);
                  return (
                    <div className="esc-fnblock" key={position.id}>
                      <div className="esc-fnblock-head">
                        <span className="esc-fnblock-name">{position.name}</span>
                        <span className={`esc-fnblock-need ${missing > 0 ? "gap" : ""}`}>{validAssignments.length}/{Math.max(1, position.need_count)}</span>
                      </div>
                      <div className="esc-fnblock-slots">
                        {assignments.map((assignment) => {
                          const person = people.find((candidate) => candidate.id === assignment.person_id);
                          return (
                            <button
                              key={assignment.id}
                              className={`esc-person ${assignment.status === "no" ? "is-no" : ""}`}
                              type="button"
                              onClick={() => selectedEvent && setSlotAction({ kind: "slot", event: selectedEvent, ministry, position, assignment })}
                            >
                              <Av name={person?.name ?? "Voluntário"} size="xs" photoUrl={person?.photoUrl} />
                              <span className="esc-person-name">{person?.name.split(" ")[0] ?? "Pessoa"}</span>
                              <span className={`slot-st ${assignment.status}`} />
                            </button>
                          );
                        })}
                        {Array.from({ length: missing }).map((_, index) => (
                          <button
                            key={`missing-${position.id}-${index}`}
                            className="esc-vaga"
                            type="button"
                            onClick={() => selectedEvent && setSlotAction({ kind: "assign", event: selectedEvent, ministry, position })}
                          >
                            Escalar
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {visibleMinistries.length === 0 ? <div className="empty" style={{ flex: 1 }}>Nenhum time neste evento.</div> : null}
      </div>

      <div className="st-legend">
        <span className="chip chip-ok">Confirmado</span>
        <span className="chip chip-wait">Aguardando</span>
        <span className="chip chip-no">Não pode</span>
        <span className="chip chip-open">Vaga aberta</span>
      </div>

      {gaps.length > 0 ? (
        <div className="panel" style={{ marginTop: 18 }}>
          <div className="panel-head"><span className="panel-title"><Icon name="escalas" size={14} /> Pendências da semana <HelpDot label="Como calculamos" text="Vagas da escala desta semana que ainda não têm ninguém confirmado." /></span><span className="panel-meta">{gaps.length} vagas</span></div>
          <div className="panel-body flush">
            {gaps.slice(0, 5).map((gap) => <div className="gap-row" key={`${gap.event.id}-${gap.position.id}`}><div className="gap-ic wait">!</div><div className="mini-main"><div className="mini-title">{gap.position.name} <span style={{ color: "var(--muted)", fontWeight: 400 }}>· {gap.ministry.name}</span></div><div className="mini-sub">{joinDot(gap.event.name, gap.event.time)}</div></div></div>)}
          </div>
        </div>
      ) : null}

      {slotAction ? (
        <RosterActionModal
          action={slotAction}
          candidatos={candidatosParaVaga(slotAction.ministry, slotAction.position.id, slotAction.assignment?.person_id)}
          maxPorMes={escalaCfg.maxPorMes}
          people={people}
          onClose={() => setSlotAction(null)}
          onConfirmar={confirmarAssignment}
          onPendente={deixarPendenteAssignment}
          onRecusar={(assignment) => recusarAssignment(assignment, slotAction.ministry)}
          onRemover={removerAssignment}
          onEscalar={(personId) => selectedEvent && escalarPessoa(selectedEvent, slotAction.position.id, personId)}
          onTrocar={trocarAssignment}
          setDrawer={setDrawer}
        />
      ) : null}
      {funcEdit ? <FuncoesEscalaModal ministry={funcEdit} onClose={() => setFuncEdit(null)} onRefresh={() => router.refresh()} /> : null}
      {delegarOpen ? <DelegarModal ministries={visibleMinistries} church={church} onClose={() => setDelegarOpen(false)} onRefresh={() => router.refresh()} /> : null}
      {presetSaveOpen ? <PresetSaveModal ministries={visibleMinistries} church={church} onClose={() => setPresetSaveOpen(false)} onRefresh={() => router.refresh()} /> : null}
    </div>
  );
}

function RosterActionModal({
  action,
  candidatos,
  maxPorMes,
  people,
  onClose,
  onConfirmar,
  onPendente,
  onRecusar,
  onRemover,
  onEscalar,
  onTrocar,
  setDrawer,
}: {
  action: {
    kind: "slot" | "assign" | "swap";
    event: EventView;
    ministry: MinistryView;
    position: { id: string; name: string; need_count: number };
    assignment?: RosterAssignmentView;
  };
  candidatos: Candidato[];
  maxPorMes?: number | null;
  people: PersonView[];
  onClose: () => void;
  onConfirmar: (assignmentId: string) => void;
  onPendente: (assignmentId: string) => void;
  onRecusar: (assignment: RosterAssignmentView) => void;
  onRemover: (assignmentId: string) => void;
  onEscalar: (personId: string) => void;
  onTrocar: (assignmentId: string, personId: string) => void;
  setDrawer: (drawer: DrawerState) => void;
}) {
  const { comTermos: ct } = useTermos();
  const [trocando, setTrocando] = useState(false);
  const [busca, setBusca] = useState("");
  const [soDisponiveis, setSoDisponiveis] = useState(false);
  const assignedPerson = action.assignment ? people.find((person) => person.id === action.assignment?.person_id) : null;
  if (action.kind === "slot" && action.assignment && !trocando) {
    const assignment = action.assignment;
    return (
      <div className="modal-bg" onClick={onClose}>
        <div className="modal" onClick={(event) => event.stopPropagation()}>
          <div className="modal-head">
            <div className="modal-eyebrow">{joinDot(action.position.name, action.ministry.name, action.event.weekday)}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
              <Av name={assignedPerson?.name ?? "Voluntário"} size="lg" photoUrl={assignedPerson?.photoUrl} />
              <div>
                <div className="modal-title">{assignedPerson?.name ?? ct("{Voluntario}")}</div>
                <div style={{ marginTop: 7 }}><Chip status={assignment.status} /></div>
              </div>
            </div>
          </div>
          <div className="modal-body">
            <div style={{ display: "grid", gap: 8 }}>
              <button className="btn btn-pri" style={{ justifyContent: "center" }} type="button" onClick={() => { onConfirmar(assignment.id); onClose(); }}><Icon name="ok" size={15} /> Marcar como confirmado</button>
              <button className="btn btn-sec" style={{ justifyContent: "center" }} type="button" onClick={() => { onPendente(assignment.id); onClose(); }}>Deixar pendente (reenviar convite)</button>
              <button className="btn btn-sec" style={{ justifyContent: "center" }} type="button" onClick={() => { onRecusar(assignment); onClose(); }}>Marcar que recusou</button>
              <button className="btn btn-sec" style={{ justifyContent: "center" }} type="button" onClick={() => setTrocando(true)}>⇄ Pedir troca / substituir</button>
              {assignedPerson ? <button className="btn btn-sec" style={{ justifyContent: "center" }} type="button" onClick={() => setDrawer({ kind: "person", id: assignedPerson.id })}>{ct("Ver perfil do {voluntario}")}</button> : null}
              <button className="btn btn-danger" style={{ justifyContent: "center" }} type="button" onClick={() => { onRemover(assignment.id); onClose(); }}>Remover da escala</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isSwap = trocando || action.kind === "swap";
  /* v7 4.14: busca, filtro "Disponíveis", sugeridos pelo rodízio e quem não
     pode agrupado com o motivo em texto */
  const sem = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const achados = candidatos.filter((c) => !busca.trim() || sem(c.person.name).includes(sem(busca.trim())));
  const podem = achados.filter((c) => c.fit !== "block" && (!soDisponiveis || c.fit === "good"));
  const sugeridos = busca.trim() ? [] : podem.filter((c) => c.fit === "good").slice(0, 3);
  const demais = podem.filter((c) => !sugeridos.includes(c));
  const naoPodem = soDisponiveis ? [] : achados.filter((c) => c.fit === "block");
  const motivoTexto = (m: Candidato["motivo"]) =>
    m === "evento" ? ct("Já está na escala deste {culto}") : m === "ferias" ? "De férias" : m === "teto" ? (maxPorMes ? `Já serviu ${plural(maxPorMes, "vez", "vezes")} este mês, o limite` : "Chegou ao limite do mês") : "";
  const escolher = (c: Candidato) => {
    if (c.fit === "block") return;
    if (isSwap && action.assignment) onTrocar(action.assignment.id, c.person.id);
    else onEscalar(c.person.id);
    onClose();
  };
  const linha = (c: Candidato) => (
    <button className={`cand ${c.fit === "block" ? "is-block" : ""}`} type="button" key={c.person.id} aria-disabled={c.fit === "block" || undefined} onClick={() => escolher(c)}>
      <Av name={c.person.name} size="md" photoUrl={c.person.photoUrl} />
      <div className="cand-main">
        <div className="cand-name">{c.person.name}</div>
        {c.fit === "block" && c.motivo
          ? <div className="cand-meta cand-motivo"><Icon name="recusou" size={13} /> {motivoTexto(c.motivo)}</div>
          : <div className="cand-meta">{fraseRodizio(c.ultima, c.vezes)}</div>}
        {c.person.tags.length > 0 ? <div className="cand-meta">{c.person.tags.join(" · ")}</div> : null}
      </div>
      {c.fit !== "block" && <span className={`cand-fit ${c.fit}`}>{c.fit === "good" ? <><Icon name="ok" size={13} /> disponível</> : <><Icon name="pendente" size={13} /> ocupado</>}</span>}
    </button>
  );
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal wide" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">{isSwap ? "Pedir troca" : "Escalar"} · {action.position.name} · {action.ministry.name}</div>
          <div className="modal-title">{action.event.name}</div>
          <div className="modal-sub">{joinDot(action.event.weekday, action.event.time)}{joinDot(action.event.weekday, action.event.time) ? ". " : ""}Ocupado é quem marcou que não pode neste horário.</div>
          <div className="cand-tools">
            <input className="input" type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar pelo nome" aria-label="Buscar pelo nome" />
            <button type="button" className={`chip-toggle${soDisponiveis ? " on" : ""}`} aria-pressed={soDisponiveis} onClick={() => setSoDisponiveis((v) => !v)}>Disponíveis</button>
          </div>
        </div>
        <div className="modal-body cand-list">
          {podem.length === 0 && naoPodem.length === 0 ? <div className="empty">{busca.trim() ? "Ninguém com esse nome neste time." : "Ninguém disponível neste time."}</div> : null}
          {sugeridos.length > 0 && (
            <>
              <div className="cand-grp">Sugeridos pelo rodízio</div>
              <div className="cand-grp-sub">Quem serviu menos vezes no mês e há mais tempo.</div>
              {sugeridos.map(linha)}
            </>
          )}
          {demais.length > 0 && (
            <>
              {sugeridos.length > 0 && <div className="cand-grp">Outras pessoas do time</div>}
              {demais.map(linha)}
            </>
          )}
          {naoPodem.length > 0 && (
            <>
              <div className="cand-grp">Não podem nesta vaga</div>
              {naoPodem.map(linha)}
            </>
          )}
        </div>
        <div className="modal-foot"><button className="btn btn-ghost" type="button" onClick={onClose}>Cancelar</button></div>
      </div>
    </div>
  );
}
