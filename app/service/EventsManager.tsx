"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createServiceBrowserClient } from "./lib/supabase-browser";

type MinistryOption = {
  id: string;
  name: string;
};

type PersonOption = {
  id: string;
  name: string;
};

type ScheduleItem = {
  id: string;
  organization_id: string;
  event_id: string;
  time: string | null;
  duration_min: number | null;
  item: string;
  ministry_id: string | null;
  person_id: string | null;
  category: string | null;
  notes: string | null;
  sort_order: number;
};

type SetlistSong = {
  id: string;
  organization_id: string;
  event_id: string;
  title: string;
  song_key: string | null;
  youtube: string | null;
  chart: string | null;
  sort_order: number;
};

type EventForManager = {
  id: string;
  organizationId: string;
  churchId: string;
  name: string;
  kind: string;
  weekday: string;
  eventDate: string;
  time: string;
  slot: string;
  location: string;
  ministries: string[];
  tags: string[];
  schedule: ScheduleItem[];
  setlist: SetlistSong[];
};

type EventsManagerProps = {
  events: EventForManager[];
  ministries: MinistryOption[];
  people: PersonOption[];
  churchId?: string;
  organizationId?: string;
};

type EventForm = {
  name: string;
  kind: string;
  weekday: string;
  eventDate: string;
  time: string;
  slot: string;
  location: string;
  ministryIds: string[];
  tagsText: string;
  scheduleText: string;
  scheduleMinistryId: string;
  schedulePersonId: string;
  setlistText: string;
};

const EMPTY_FORM: EventForm = {
  name: "",
  kind: "Culto",
  weekday: "Domingo",
  eventDate: "",
  time: "10h00",
  slot: "dom_m",
  location: "Templo",
  ministryIds: [],
  tagsText: "",
  scheduleText: "09h30 | 30 | Passagem de som | louvor | Chegada da equipe\n10h15 | 25 | Momento de louvor | louvor | Repertório principal",
  scheduleMinistryId: "",
  schedulePersonId: "",
  setlistText: "Grandes Coisas | G\nBondade de Deus | D",
};

function cleanPlaceholder(value: string, placeholder: string) {
  return value === placeholder ? "" : value;
}

function friendlyWriteError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("permission") || lower.includes("row-level security") || lower.includes("rls")) {
    return "O banco bloqueou a gravação por segurança. Confirme se você está logado como master, pastor ou líder com permissão.";
  }
  if (lower.includes("violates foreign key")) {
    return "A igreja, organização, ministério, evento ou voluntário vinculado não foi encontrado.";
  }
  if (lower.includes("invalid input")) {
    return "Algum campo foi enviado em formato inválido.";
  }
  return message || "Não conseguimos salvar agora.";
}

function parseList(text: string) {
  return text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function scheduleToText(schedule: ScheduleItem[]) {
  return schedule.length
    ? schedule
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((item) => `${item.time || ""} | ${item.duration_min ?? ""} | ${item.item} | ${item.category || ""} | ${item.notes || ""}`)
        .join("\n")
    : EMPTY_FORM.scheduleText;
}

function setlistToText(setlist: SetlistSong[]) {
  return setlist.length
    ? setlist
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((song) => `${song.title} | ${song.song_key || ""}`)
        .join("\n")
    : EMPTY_FORM.setlistText;
}

function formFromEvent(event: EventForManager): EventForm {
  const firstSchedule = event.schedule[0];
  return {
    name: event.name,
    kind: cleanPlaceholder(event.kind, "Culto"),
    weekday: cleanPlaceholder(event.weekday, "Dia não informado"),
    eventDate: cleanPlaceholder(event.eventDate, "Data não informada"),
    time: cleanPlaceholder(event.time, "Horário não informado"),
    slot: cleanPlaceholder(event.slot, "slot não informado"),
    location: cleanPlaceholder(event.location, "Local não informado"),
    ministryIds: event.ministries,
    tagsText: event.tags.join(", "),
    scheduleText: scheduleToText(event.schedule),
    scheduleMinistryId: firstSchedule?.ministry_id ?? "",
    schedulePersonId: firstSchedule?.person_id ?? "",
    setlistText: setlistToText(event.setlist),
  };
}

function parseSchedule(text: string, ministryId: string, personId: string, organizationId?: string, eventId?: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [rawTime, rawDuration, rawItem, rawCategory, rawNotes] = line.split("|").map((part) => part.trim());
      const duration = Number.parseInt(rawDuration || "0", 10);
      return {
        organization_id: organizationId,
        event_id: eventId,
        time: rawTime || null,
        duration_min: Number.isFinite(duration) && duration > 0 ? duration : null,
        item: rawItem || rawTime || "Item do cronograma",
        ministry_id: ministryId || null,
        person_id: personId || null,
        category: rawCategory || null,
        notes: rawNotes || null,
        sort_order: index + 1,
      };
    });
}

function parseSetlist(text: string, organizationId?: string, eventId?: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [rawTitle, rawKey, rawYoutube, rawChart] = line.split("|").map((part) => part.trim());
      return {
        organization_id: organizationId,
        event_id: eventId,
        title: rawTitle || "Música sem título",
        song_key: rawKey || null,
        youtube: rawYoutube || "",
        chart: rawChart || "",
        sort_order: index + 1,
      };
    });
}

export default function EventsManager({ events, ministries, people, churchId, organizationId }: EventsManagerProps) {
  const router = useRouter();
  const supabase = createServiceBrowserClient();
  const [form, setForm] = useState<EventForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function setField<K extends keyof EventForm>(key: K, value: EventForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleMinistry(ministryId: string) {
    setForm((current) => ({
      ...current,
      ministryIds: current.ministryIds.includes(ministryId)
        ? current.ministryIds.filter((id) => id !== ministryId)
        : [...current.ministryIds, ministryId],
    }));
  }

  function validateForm() {
    if (!form.name.trim()) return "Digite o nome do evento.";
    if (form.eventDate.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(form.eventDate.trim())) {
      return "A data deve estar no formato AAAA-MM-DD, por exemplo 2026-07-05.";
    }
    return "";
  }

  function eventPayload() {
    return {
      name: form.name.trim(),
      kind: form.kind.trim() || "Culto",
      weekday: form.weekday.trim() || null,
      event_date: form.eventDate.trim() || null,
      time: form.time.trim() || null,
      slot: form.slot.trim() || null,
      location: form.location.trim() || null,
      ministries: form.ministryIds,
      tags: parseList(form.tagsText),
      updated_at: new Date().toISOString(),
    };
  }

  async function replaceSchedule(eventId: string) {
    const { error: deleteError } = await supabase.schema("service").from("event_schedule_items").delete().eq("event_id", eventId);
    if (deleteError) return deleteError;

    const schedule = parseSchedule(form.scheduleText, form.scheduleMinistryId, form.schedulePersonId, organizationId, eventId);
    if (schedule.length === 0) return null;

    const { error: insertError } = await supabase.schema("service").from("event_schedule_items").insert(schedule);
    return insertError;
  }

  async function replaceSetlist(eventId: string) {
    const { error: deleteError } = await supabase.schema("service").from("setlist_songs").delete().eq("event_id", eventId);
    if (deleteError) return deleteError;

    const setlist = parseSetlist(form.setlistText, organizationId, eventId);
    if (setlist.length === 0) return null;

    const { error: insertError } = await supabase.schema("service").from("setlist_songs").insert(setlist);
    return insertError;
  }

  async function saveEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const validation = validateForm();
    if (validation) {
      setError(validation);
      return;
    }

    if (!editingId && (!churchId || !organizationId)) {
      setError("Nenhuma igreja encontrada para vincular o evento.");
      return;
    }

    setLoading(true);
    const eventResult = editingId
      ? await supabase.schema("service").from("events").update(eventPayload()).eq("id", editingId).select("id").single()
      : await supabase
          .schema("service")
          .from("events")
          .insert({
            organization_id: organizationId,
            church_id: churchId,
            ...eventPayload(),
          })
          .select("id")
          .single();

    if (eventResult.error || !eventResult.data) {
      setLoading(false);
      setError(friendlyWriteError(eventResult.error?.message || ""));
      return;
    }

    const scheduleError = await replaceSchedule(eventResult.data.id);
    if (scheduleError) {
      setLoading(false);
      setError(friendlyWriteError(scheduleError.message));
      return;
    }

    const setlistError = await replaceSetlist(eventResult.data.id);
    setLoading(false);
    if (setlistError) {
      setError(friendlyWriteError(setlistError.message));
      return;
    }

    setForm(EMPTY_FORM);
    setEditingId("");
    router.refresh();
  }

  function editEvent(event: EventForManager) {
    setError("");
    setEditingId(event.id);
    setForm(formFromEvent(event));
  }

  async function deleteEvent(event: EventForManager) {
    setError("");
    const confirmed = window.confirm(`Excluir ${event.name}? O cronograma e o repertório deste evento também serão removidos.`);
    if (!confirmed) return;

    setLoading(true);
    const { error: deleteError } = await supabase.schema("service").from("events").delete().eq("id", event.id);
    setLoading(false);

    if (deleteError) {
      setError(friendlyWriteError(deleteError.message));
      return;
    }

    if (editingId === event.id) {
      setEditingId("");
      setForm(EMPTY_FORM);
    }
    router.refresh();
  }

  return (
    <div style={{ display: "grid", gap: 18, marginTop: 24 }}>
      <form className="card" onSubmit={saveEvent}>
        <div className="card-body" style={{ display: "grid", gap: 14 }}>
          <p className="eyebrow" style={{ color: "var(--wheat)" }}>
            ◆ {editingId ? "EDITAR EVENTO" : "CRIAR EVENTO"}
          </p>
          <label className="field">
            <span className="field-label req">Nome</span>
            <input className="input" value={form.name} onChange={(event) => setField("name", event.target.value)} placeholder="Culto de domingo" />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            <label className="field">
              <span className="field-label">Tipo</span>
              <input className="input" value={form.kind} onChange={(event) => setField("kind", event.target.value)} placeholder="Culto" />
            </label>
            <label className="field">
              <span className="field-label">Dia da semana</span>
              <input className="input" value={form.weekday} onChange={(event) => setField("weekday", event.target.value)} placeholder="Domingo" />
            </label>
            <label className="field">
              <span className="field-label">Data</span>
              <input className="input" value={form.eventDate} onChange={(event) => setField("eventDate", event.target.value)} placeholder="2026-07-05" />
            </label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            <label className="field">
              <span className="field-label">Horário</span>
              <input className="input" value={form.time} onChange={(event) => setField("time", event.target.value)} placeholder="10h00" />
            </label>
            <label className="field">
              <span className="field-label">Slot</span>
              <input className="input" value={form.slot} onChange={(event) => setField("slot", event.target.value)} placeholder="dom_m" />
            </label>
            <label className="field">
              <span className="field-label">Local</span>
              <input className="input" value={form.location} onChange={(event) => setField("location", event.target.value)} placeholder="Templo" />
            </label>
          </div>
          <div className="card" style={{ padding: 14 }}>
            <p className="field-label">Ministérios envolvidos</p>
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              {ministries.length === 0 ? (
                <p className="t-small" style={{ color: "var(--muted)", margin: 0 }}>
                  Cadastre ministérios antes de vincular times ao evento.
                </p>
              ) : (
                ministries.map((ministry) => (
                  <label className="service-check-row" key={ministry.id}>
                    <input type="checkbox" checked={form.ministryIds.includes(ministry.id)} onChange={() => toggleMinistry(ministry.id)} />
                    {ministry.name}
                  </label>
                ))
              )}
            </div>
          </div>
          <label className="field">
            <span className="field-label">Tags</span>
            <input className="input" value={form.tagsText} onChange={(event) => setField("tagsText", event.target.value)} placeholder="jovens, santa ceia" />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <label className="field">
              <span className="field-label">Ministério do cronograma</span>
              <select className="select" value={form.scheduleMinistryId} onChange={(event) => setField("scheduleMinistryId", event.target.value)}>
                <option value="">Sem ministério</option>
                {ministries.map((ministry) => (
                  <option value={ministry.id} key={ministry.id}>
                    {ministry.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Responsável do cronograma</span>
              <select className="select" value={form.schedulePersonId} onChange={(event) => setField("schedulePersonId", event.target.value)}>
                <option value="">Sem responsável</option>
                {people.map((person) => (
                  <option value={person.id} key={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            <span className="field-label">Cronograma</span>
            <textarea
              className="textarea"
              rows={4}
              value={form.scheduleText}
              onChange={(event) => setField("scheduleText", event.target.value)}
              placeholder={"09h30 | 30 | Passagem de som | louvor | Chegada da equipe"}
            />
            <span className="field-hint">Use: horário | minutos | item | categoria | observação</span>
          </label>
          <label className="field">
            <span className="field-label">Repertório</span>
            <textarea
              className="textarea"
              rows={3}
              value={form.setlistText}
              onChange={(event) => setField("setlistText", event.target.value)}
              placeholder={"Grandes Coisas | G\nBondade de Deus | D"}
            />
            <span className="field-hint">Use: música | tom. Uma música por linha.</span>
          </label>
          {error && <p className="field-error">{error}</p>}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "Salvando..." : editingId ? "Salvar evento" : "Criar evento"}
            </button>
            {editingId && (
              <button className="btn btn-secondary" type="button" onClick={() => { setEditingId(""); setForm(EMPTY_FORM); }} disabled={loading}>
                Cancelar
              </button>
            )}
          </div>
        </div>
      </form>

      <div style={{ display: "grid", gap: 12 }}>
        {events.map((event) => (
          <div className="card" key={event.id}>
            <div className="card-body" style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <p className="eyebrow" style={{ color: "var(--wheat)" }}>
                  ◆ {event.kind}
                </p>
                <strong className="t-body-lg" style={{ color: "var(--cream)" }}>
                  {event.name}
                </strong>
                <p className="t-small" style={{ color: "var(--muted)", marginTop: 6 }}>
                  {event.weekday} · {event.eventDate} · {event.time}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn btn-secondary btn-sm" type="button" onClick={() => editEvent(event)} disabled={loading}>
                  Editar
                </button>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => deleteEvent(event)} disabled={loading}>
                  Excluir
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
