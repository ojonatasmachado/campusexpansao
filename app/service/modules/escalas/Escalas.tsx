"use client";

/* Módulo Escalas (4.1): vagas por culto, quem serve, confirmar, trocar e
   remover. Saiu de ServiceExactApp.tsx sem mudar comportamento; o manifesto
   está em ./manifest.ts. Os tipos de dados do painel ainda moram em
   ServiceExactApp.tsx (import só de tipo, sem ciclo em tempo de execução). */

import { limitesDaSemana } from "./semana";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { friendlyWriteError } from "../../painel/erros";
import { faltaN, plural } from "../../lib/plural";
import { baixarCsv } from "../../lib/csv";
import { useRelogioDaIgreja } from "../../lib/relogio-context";
import { formatDateBR, joinDot, todayISO } from "../../lib/date";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { Caret, Icon } from "../../lib/icons";
import { HelpDot } from "../../HelpSystem";
import { Av, Chip, MenuMais, PageHead } from "../../painel/ui";
import { ESCALA_DEFAULT, type EscalaPreset, type EscalaSettings } from "./regras";
import type { ChurchView, DrawerState, EventView, MinistryView, ModalState, PersonView, RosterAssignmentView, RouteId } from "../../ServiceExactApp";
import { useTermos } from "../../lib/vocabulario-context";
import { fraseRodizio, ultimaVezQueServiu } from "./rodizio";
import { candidatosDisponiveis, cargaDoMes, type Candidato as CandidatoBase } from "./candidatos";
import { coberturaPorTime, vagasFaltando } from "./cobertura";
import { Cobertura } from "./Cobertura";
import { GerarPeriodo } from "./GerarPeriodo";
import { EscalaExtra } from "./EscalaExtra";
import { PublicarEscala } from "./PublicarEscala";

import { Botao } from "../../ui/Botao";
import { Acao } from "../../ui/Acao";
import { Opcao } from "../../ui/Opcao";
import { Selo } from "../../ui/Selo";
import { Cartao } from "../../ui/Cartao";
import { Segmentado } from "../../ui/Segmentado";
import { Campo, Entrada } from "../../ui/Campo";
import { Selecao } from "../../ui/Selecao";
import { Vazio } from "../../ui/Estados";
type Candidato = CandidatoBase<PersonView>;

/* carga da semana corrente (segunda a domingo contendo hoje) por pessoa:
   nº de posições escaladas (status != "no") e nº de recusas ("no") : equivalente
   a cargaVol() em evolucoes/service_app/relatorios.jsx:6-16, usado pelo
   termômetro de bem-estar pra classificar sobrecarga sem depender de engajamento. */
export function cargaDaSemana(roster: RosterAssignmentView[], events: EventView[], hoje = todayISO()): Record<string, { escalas: number; recusas: number }> {
  const eventById = new Map(events.map((e) => [e.id, e]));
  const { inicio: inicioSemana, fim: fimSemana } = limitesDaSemana(hoje);
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
                  <Acao onClick={() => setNeedAt(position.id, -1)}>−</Acao>
                  <span>{position.need_count}</span>
                  <Acao onClick={() => setNeedAt(position.id, 1)}>+</Acao>
                </div>
                <Acao className="func-edit-x" title="Remover função" onClick={() => remove(position.id)}><Icon name="recusou" size={15} /></Acao>
              </div>
            ))}
            {positions.length === 0 && <div className="empty" style={{ padding: "8px 0" }}>Nenhuma função ainda.</div>}
          </div>
          <div className="dsec-title" style={{ marginBottom: 8 }}>Nova função</div>
          <div className="func-edit-add">
            <input className="input" placeholder="ex: Vocal, Câmera, Recepção" value={nome} onChange={(e) => setNome(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
            <div className="stepper"><Acao onClick={() => setNeed((n) => Math.max(1, n - 1))}>−</Acao><span>{need}</span><Acao onClick={() => setNeed((n) => n + 1)}>+</Acao></div>
            <Botao compacto desativado={saving} onClick={add}>+ Função</Botao>
          </div>
        </div>
        <div className="modal-foot"><Botao variante="principal" onClick={onClose}>Concluído</Botao></div>
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
            <Segmentado style={{ marginBottom: 14, flexWrap: "wrap" }}>
              {ministries.map((m) => <Opcao key={m.id} marcada={ministryId === m.id} onClick={() => setMinistryId(m.id)}>{m.name.split(" ")[0]}</Opcao>)}
            </Segmentado>
          )}
          {elenco.length === 0 && <Vazio titulo="Ninguém mais neste time ainda." />}
          {elenco.map((link) => {
            const on = delegados.includes(link.personId);
            return (
              <Opcao marcada={on} estilo="flag-row" key={link.personId} desativado={saving} onClick={() => toggle(link.personId)}>
                <span className={`flag-check${on ? " on" : ""}`}>{on ? <Icon name="ok" size={13} /> : null}</span>
                <Av name={link.personName} size="sm" />
                <div className="flag-main"><div className="flag-nome">{link.personName}</div><div className="flag-meta">{link.functions.join(" · ") || ct("{Voluntario}")}</div></div>
              </Opcao>
            );
          })}
        </div>
        <div className="modal-foot"><Botao variante="principal" onClick={onClose}>Concluído</Botao></div>
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
          <div className="modal-sub">Guarda as funções e quantidades atuais de todos os times. Crie uma para “Culto”, outra para “Reunião”, e aplique quando quiser.</div>
        </div>
        <div className="modal-body" style={{ display: "block" }}>
          <Campo rotulo="Nome da configuração"><Entrada placeholder="ex: Culto de domingo" value={nome} onChange={(e) => setNome(e.target.value)} onKeyDown={(e) => e.key === "Enter" && salvar()} /></Campo>
        </div>
        <div className="modal-foot">
          <Botao onClick={onClose}>Cancelar</Botao>
          <Botao variante="principal" desativado={saving} onClick={salvar}>Salvar</Botao>
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
  const { aindaVaiAcontecer, todayISO } = useRelogioDaIgreja();
  const { comTermos: ct } = useTermos();
  const semanaAtual = limitesDaSemana(todayISO());
  const gapsDaSemana = gaps.filter((g) => g.event.eventDate >= semanaAtual.inicio && g.event.eventDate <= semanaAtual.fim && aindaVaiAcontecer(g.event.eventDate, g.event.time) && (!scopeMinistryIds || scopeMinistryIds.includes(g.ministry.id)));

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
  /* escala do período, escala extra e publicação do rascunho */
  const [periodoOpen, setPeriodoOpen] = useState(false);
  const [extraOpen, setExtraOpen] = useState(false);
  const [publicarOpen, setPublicarOpen] = useState(false);
  const timesDoEscopo = scopeMinistryIds ? ministries.filter((m) => scopeMinistryIds.includes(m.id)) : ministries;
  const funcoesDoEscopo = new Set(timesDoEscopo.flatMap((m) => m.positions.map((p) => p.id)));
  const rascunhos = roster.filter((r) => r.rascunho && funcoesDoEscopo.has(r.position_id));

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
    return candidatosDisponiveis(candidatePool(ministry), selectedEvent, jaNoSlot, usados, escalaCfg, carga, ultimaVezQueServiu(roster, events, todayISO()));
  }

  const setModoEscala = async (modo: EscalaSettings["modo"]) => {
    if (!church?.id) return;
    await createServiceBrowserClient().schema("service").from("churches").update({ settings: { ...church.settings, escala: { ...escalaCfg, modo } } }).eq("id", church.id);
    router.refresh();
  };

  const conferirGravacao = async (consulta: PromiseLike<{ data: unknown; error: { message: string } | null }>) => {
    const { data, error } = await consulta;
    if (error) throw new Error(friendlyWriteError(error.message));
    if (!data) throw new Error("A escala mudou ou você não pode alterá-la. Atualize a tela e tente novamente.");
  };
  const confirmarAssignment = async (assignmentId: string) => {
    await conferirGravacao(createServiceBrowserClient().schema("service").from("roster_assignments").update({ status: "ok" }).eq("id", assignmentId).select("id").single());
    router.refresh();
  };
  const deixarPendenteAssignment = async (assignmentId: string) => {
    await conferirGravacao(createServiceBrowserClient().schema("service").from("roster_assignments").update({ status: "wait" }).eq("id", assignmentId).select("id").single());
    router.refresh();
  };
  const removerAssignment = async (assignmentId: string) => {
    await conferirGravacao(createServiceBrowserClient().schema("service").from("roster_assignments").delete().eq("id", assignmentId).select("id").single());
    router.refresh();
  };
  const trocarAssignment = async (assignmentId: string, novoPersonId: string) => {
    const atual = roster.find((r) => r.id === assignmentId);
    if (!atual) throw new Error("Essa vaga mudou. Atualize a tela antes de substituir.");
    await conferirGravacao(createServiceBrowserClient().schema("service").from("roster_assignments").update({ person_id: novoPersonId, status: "wait" }).eq("id", assignmentId).eq("person_id", atual.person_id).select("id").single());
    router.refresh();
  };
  const escalarPessoa = async (event: EventView, positionId: string, personId: string) => {
    await conferirGravacao(createServiceBrowserClient().schema("service").from("roster_assignments").insert({
      organization_id: event.organizationId, event_id: event.id, position_id: positionId, person_id: personId,
      status: escalaCfg.modo === "automatico" ? "ok" : "wait",
    }).select("id").single());
    router.refresh();
  };
  const recusarAssignment = async (assignment: RosterAssignmentView, ministry: MinistryView) => {
    await conferirGravacao(createServiceBrowserClient().schema("service").from("roster_assignments").update({ status: "no" }).eq("id", assignment.id).select("id").single());
    if (escalaCfg.modo === "automatico" && escalaCfg.naRecusa === "proximo" && selectedEvent) {
      const proximo = candidatosParaVaga(ministry, assignment.position_id, assignment.person_id).find((c) => c.fit !== "block");
      if (proximo) {
        await conferirGravacao(createServiceBrowserClient().schema("service").from("roster_assignments").insert({
          organization_id: selectedEvent.organizationId, event_id: selectedEvent.id, position_id: assignment.position_id, person_id: proximo.person.id, status: "ok",
        }).select("id").single());
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
    const ultimas = ultimaVezQueServiu(roster, events, todayISO());
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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- modo automático: gera a escala ao trocar de culto (consulta e grava no banco)
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

  /* líder de time ouve quais times está vendo; a gestão vê todos e não precisa do aviso */
  const perspectiveText = scopeMinistryIds
    ? (visibleMinistries.length > 1 ? `Você está vendo os ${visibleMinistries.length} times que lidera.` : `Você está vendo só o ${visibleMinistries[0]?.name ?? "seu time"}.`)
    : "";

  return (
    <div className="content wide">
      <PageHead
        title="Escalas por evento"
        eyebrow="Operação"
        subtitle={scopeMinistryIds ? perspectiveText : undefined}
        help={ct(`Monte quem serve em cada {culto}. As pessoas confirmam ou recusam direto no celular, e a vaga em aberto aparece em vermelho. Toque numa pessoa para confirmar, trocar ou remover; em Escalar para preencher a vaga. ${perspectiveText}`)}
        action={
          <>
            <Botao onClick={() => setPeriodoOpen(true)}><Icon name="agenda" size={15} /> Montar período</Botao>
            <MenuMais acoes={[
              { rotulo: "Escala extra", icone: "add", onClick: () => setExtraOpen(true) },
              { rotulo: "Delegar a gestão", icone: "membros", onClick: () => setDelegarOpen(true) },
              { rotulo: "QR do check-in", icone: "cultos", onClick: () => setCheckinEventId(selectedEvent?.id ?? null), desligada: !selectedEvent },
              { rotulo: "Baixar a escala", icone: "relatorios", onClick: baixarCSV, desligada: !selectedEvent },
            ]} />
            <Botao variante="principal" onClick={() => setPublicarOpen(true)}>Publicar e avisar{rascunhos.length ? ` (${rascunhos.length})` : ""}</Botao>
          </>
        }
      />

      <div className="esc-events">
        {events.map((event) => (
          <Acao className={`esc-event ${selectedEvent?.id === event.id ? "on" : ""}`} key={event.id} onClick={() => setEventId(event.id)}>
            <span className="esc-event-day">{joinDot(event.weekday, formatDateBR(event.eventDate))}</span>
            <span className="esc-event-name">{event.name}</span>
            <span className="esc-event-time">{joinDot(event.time, event.location)}</span>
            {(() => {
              /* v7 4.16: um resumo por culto; a cobertura por time aparece embaixo, no culto escolhido */
              const falta = vagasFaltando(coberturaPorTime(event, roster, ministries, scopeMinistryIds));
              const emRascunho = rascunhos.some((r) => r.event_id === event.id);
              return <span className={`esc-event-cob ${falta ? "falta" : "ok"}`}>{joinDot(falta ? faltaN(falta, "vaga") : "completo", emRascunho && "rascunho")}</span>;
            })()}
          </Acao>
        ))}
      </div>

      <details className="esc-gerar">
        <summary><Icon name="escalas" size={15} /> Como gerar <span className="esc-gerar-modo">{escalaCfg.modo === "manual" ? "Manual" : escalaCfg.modo === "assistido" ? "Assistida" : "Automática"}</span><Caret size={14} /></summary>
        <div className="esc-modo">
        <span className="esc-modo-lbl">Geração da escala</span>
        <Segmentado className="seg-sm">
          {(["manual", "assistido", "automatico"] as const).map((key) => (
            <Opcao key={key} marcada={escalaCfg.modo === key} onClick={() => setModoEscala(key)}>{key === "manual" ? "Manual" : key === "assistido" ? "Assistida" : "Automática"}</Opcao>
          ))}
        </Segmentado>
        <span className="esc-modo-hint">
          {escalaCfg.modo === "manual" ? "Você monta tudo na mão." : null}
          {escalaCfg.modo === "assistido" ? "O sistema sugere os nomes; você confirma cada um." : null}
          {escalaCfg.modo === "automatico" ? "O sistema gera e já confirma. Na recusa, chama o próximo apto." : null}
        </span>
        {escalaCfg.modo !== "manual" ? <Botao compacto desativado={gerando} onClick={gerarAuto}><Icon name="escalas" size={14} /> {gerando ? "Gerando…" : (escalaCfg.modo === "automatico" ? "Gerar a escala" : "Sugerir nomes")}</Botao> : null}
        <span className="tb-spacer" />
        <span className="esc-preset">
          <Icon name="escalas" size={13} />
          <Selecao valor="" vazio="Aplicar configuração…" rotulo="Aplicar configuração"
            aoMudar={(v) => { const preset = (church?.settings?.escalaPresets ?? []).find((p) => p.id === v); if (preset) aplicarPreset(preset); }}
            opcoes={(church?.settings?.escalaPresets ?? []).map((preset) => ({ v: preset.id, l: preset.nome }))} />
          <Acao className="esc-preset-save" onClick={() => setPresetSaveOpen(true)}>Salvar atual</Acao>
        </span>
        <Acao className="esc-modo-cfg" onClick={() => setRoute("config")}><Icon name="config" size={13} /> Regras</Acao>
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
                <Acao className="esc-col-edit" title="Editar funções deste time" onClick={() => setFuncEdit(ministry)}><Icon name="config" size={14} /></Acao>
                <Acao className="esc-col-tog" aria-expanded={!timesFechados.has(ministry.id)} aria-label={timesFechados.has(ministry.id) ? `Abrir ${ministry.name}` : `Recolher ${ministry.name}`} onClick={() => alternarTime(ministry.id)}>
                  <Icon name="avancar" size={15} />
                </Acao>
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
                            <Acao
                              key={assignment.id}
                              className={`esc-person ${assignment.status === "no" ? "is-no" : ""}${assignment.rascunho ? " is-draft" : ""}`}
                              title={assignment.rascunho ? "Rascunho: a pessoa ainda não foi avisada" : undefined}
                             
                              onClick={() => selectedEvent && setSlotAction({ kind: "slot", event: selectedEvent, ministry, position, assignment })}
                            >
                              <Av name={person?.name ?? "Voluntário"} size="xs" photoUrl={person?.photoUrl} />
                              <span className="esc-person-name">{person?.name.split(" ")[0] ?? "Pessoa"}</span>
                              <span className={`slot-st ${assignment.status}`} />
                            </Acao>
                          );
                        })}
                        {Array.from({ length: missing }).map((_, index) => (
                          <Acao
                            key={`missing-${position.id}-${index}`}
                            className="esc-vaga"
                           
                            onClick={() => selectedEvent && setSlotAction({ kind: "assign", event: selectedEvent, ministry, position })}
                          >
                            Escalar
                          </Acao>
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
        <Selo tom="ok">Confirmado</Selo>
        <Selo tom="pendente">Aguardando</Selo>
        <Selo tom="cuidado">Não pode</Selo>
        <Selo tom="aberto">Vaga aberta</Selo>
        {rascunhos.length > 0 && <Selo tom="rascunho">Rascunho, ainda não publicado</Selo>}
      </div>

      {gapsDaSemana.length > 0 ? (
        <Cartao style={{ marginTop: 18 }}>
          <div className="panel-head"><span className="panel-title"><Icon name="escalas" size={14} /> Pendências da semana <HelpDot text="Funções da programação futura desta semana que ainda não têm todas as vagas preenchidas." /></span><span className="panel-meta">{plural(gapsDaSemana.length, "função para conferir", "funções para conferir")}</span></div>
          <div className="panel-body flush">
            {gapsDaSemana.slice(0, 5).map((gap) => <div className="gap-row" key={`${gap.event.id}-${gap.position.id}`}><div className="gap-ic wait">!</div><div className="mini-main"><div className="mini-title">{gap.position.name} <span style={{ color: "var(--muted)", fontWeight: 400 }}>· {gap.ministry.name}</span></div><div className="mini-sub">{joinDot(gap.event.name, gap.event.time)}</div></div></div>)}
          </div>
        </Cartao>
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
          onEscalar={async (personId) => { if (!selectedEvent) throw new Error("Selecione o evento novamente."); await escalarPessoa(selectedEvent, slotAction.position.id, personId); }}
          onTrocar={trocarAssignment}
          setDrawer={setDrawer}
        />
      ) : null}
      {funcEdit ? <FuncoesEscalaModal ministry={funcEdit} onClose={() => setFuncEdit(null)} onRefresh={() => router.refresh()} /> : null}
      {delegarOpen ? <DelegarModal ministries={visibleMinistries} church={church} onClose={() => setDelegarOpen(false)} onRefresh={() => router.refresh()} /> : null}
      {periodoOpen ? (
        <GerarPeriodo
          ministries={timesDoEscopo}
          people={people}
          events={events}
          roster={roster}
          church={church}
          cfg={escalaCfg}
          onClose={() => setPeriodoOpen(false)}
          onSalvo={(id) => { setPeriodoOpen(false); if (id) setEventId(id); router.refresh(); }}
        />
      ) : null}
      {extraOpen ? <EscalaExtra ministries={timesDoEscopo} church={church} onClose={() => setExtraOpen(false)} onCriado={(id) => { setExtraOpen(false); setEventId(id); router.refresh(); }} /> : null}
      {publicarOpen ? <PublicarEscala rascunhos={rascunhos} events={events} organizationId={church?.organizationId ?? ""} onClose={() => setPublicarOpen(false)} onPublicado={() => { setPublicarOpen(false); router.refresh(); }} /> : null}
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
  onConfirmar: (assignmentId: string) => Promise<void>;
  onPendente: (assignmentId: string) => Promise<void>;
  onRecusar: (assignment: RosterAssignmentView) => Promise<void>;
  onRemover: (assignmentId: string) => Promise<void>;
  onEscalar: (personId: string) => Promise<void>;
  onTrocar: (assignmentId: string, personId: string) => Promise<void>;
  setDrawer: (drawer: DrawerState) => void;
}) {
  const { comTermos: ct } = useTermos();
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const operando = useRef(false);
  const executar = async (acao: () => Promise<void>) => {
    if (operando.current) return;
    operando.current = true; setSalvando(true); setErro("");
    try { await acao(); onClose(); }
    catch (error) { setErro(error instanceof Error ? error.message : "Não foi possível salvar. Tente novamente."); }
    finally { operando.current = false; setSalvando(false); }
  };
  const [trocando, setTrocando] = useState(false);
  const [busca, setBusca] = useState("");
  const [soDisponiveis, setSoDisponiveis] = useState(false);
  const { todayISO } = useRelogioDaIgreja();
  const assignedPerson = action.assignment ? people.find((person) => person.id === action.assignment?.person_id) : null;
  if (action.kind === "slot" && action.assignment && !trocando) {
    const assignment = action.assignment;
    return (
      <div className="modal-bg" onClick={salvando ? undefined : onClose}>
        <div className="modal" role="dialog" aria-modal="true" aria-label="Alterar escala" aria-busy={salvando} onClick={(event) => event.stopPropagation()}>
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
              <Botao variante="principal" desativado={salvando} onClick={() => executar(() => onConfirmar(assignment.id))}><Icon name="ok" size={15} /> Marcar como confirmado</Botao>
              <Botao desativado={salvando} onClick={() => setTrocando(true)}>Substituir pessoa</Botao>
              <details className="service-preparacao"><summary>Outras ações</summary>
                <div style={{ display: "grid", gap: 8 }}>
                  <Botao desativado={salvando} onClick={() => executar(() => onPendente(assignment.id))}>Voltar para aguardar confirmação</Botao>
                  <Botao desativado={salvando} onClick={() => executar(() => onRecusar(assignment))}>Marcar que recusou</Botao>
                  {assignedPerson ? <Botao desativado={salvando} onClick={() => setDrawer({ kind: "person", id: assignedPerson.id })}>{ct("Ver perfil do {voluntario}")}</Botao> : null}
                  <Botao variante="perigo" desativado={salvando} onClick={() => executar(() => onRemover(assignment.id))}>Remover da escala</Botao>
                </div>
              </details>
              {salvando && <p role="status">Salvando alteração...</p>}
              {erro && <p className="field-error" role="alert">{erro}</p>}
            </div>
          </div>
          <div className="modal-foot">
            <Botao desativado={salvando} onClick={onClose}>Fechar</Botao>
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
    m === "evento" ? ct("Já está na escala deste {culto}") : m === "ferias" ? "De férias" : m === "teto" ? (maxPorMes ? `Já serviu ${plural(maxPorMes, "vez", "vezes")} este mês, o limite` : "Chegou ao limite do mês") : m === "folga" ? "Em semana de folga" : "";
  const escolher = (c: Candidato) => {
    if (c.fit === "block") return;
    void executar(() => isSwap && action.assignment ? onTrocar(action.assignment.id, c.person.id) : onEscalar(c.person.id));
  };
  const linha = (c: Candidato) => (
    <Acao className={`cand ${c.fit === "block" ? "is-block" : ""}`} key={c.person.id} desativado={salvando || c.fit === "block"} aria-disabled={c.fit === "block" || undefined} onClick={() => escolher(c)}>
      <Av name={c.person.name} size="md" photoUrl={c.person.photoUrl} />
      <div className="cand-main">
        <div className="cand-name">{c.person.name}</div>
        {c.fit === "block" && c.motivo
          ? <div className="cand-meta cand-motivo"><Icon name="recusou" size={13} /> {motivoTexto(c.motivo)}</div>
          : <div className="cand-meta">{fraseRodizio(c.ultima, c.vezes, todayISO())}</div>}
        {c.person.tags.length > 0 ? <div className="cand-meta">{c.person.tags.join(" · ")}</div> : null}
      </div>
      {c.fit !== "block" && <span className={`cand-fit ${c.fit}`}>{c.fit === "good" ? <><Icon name="ok" size={13} /> disponível</> : <><Icon name="pendente" size={13} /> ocupado</>}</span>}
    </Acao>
  );
  return (
    <div className="modal-bg" onClick={salvando ? undefined : onClose}>
      <div className="modal wide" role="dialog" aria-modal="true" aria-label="Escolher pessoa para a escala" aria-busy={salvando} onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">{isSwap ? "Escolher substituto" : "Escalar"} · {action.position.name} · {action.ministry.name}</div>
          <div className="modal-title">{action.event.name}</div>
          <div className="modal-sub">{joinDot(action.event.weekday, action.event.time)}{joinDot(action.event.weekday, action.event.time) ? ". " : ""}Ocupado é quem marcou que não pode neste horário.</div>
          {isSwap && <p className="modal-sub">A pessoa escolhida passa a ocupar a vaga e precisa confirmar no app.</p>}
          <div className="cand-tools">
            <input className="input" type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar pelo nome" aria-label="Buscar pelo nome" />
            <Opcao marcada={soDisponiveis} estilo="chip-toggle" aria-pressed={soDisponiveis} onClick={() => setSoDisponiveis((v) => !v)}>Disponíveis</Opcao>
          </div>
        </div>
        <div className="modal-body cand-list">
          {salvando && <p role="status">Salvando alteração...</p>}
          {erro && <p className="field-error" role="alert">{erro}</p>}
          {podem.length === 0 && naoPodem.length === 0 ? <Vazio titulo={busca.trim() ? "Ninguém com esse nome neste time." : "Ninguém disponível neste time."} /> : null}
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
        <div className="modal-foot"><Botao variante="discreto" desativado={salvando} onClick={onClose}>Cancelar</Botao></div>
      </div>
    </div>
  );
}
