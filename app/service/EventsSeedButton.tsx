"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createServiceBrowserClient } from "./lib/supabase-browser";

type EventsSeedButtonProps = {
  churchId: string;
  organizationId: string;
  ministryId?: string | null;
  personId?: string | null;
};

function friendlySeedError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("permission") || lower.includes("row-level security") || lower.includes("rls")) {
    return "O banco bloqueou a criação por segurança. Confirme se você está logado como master ou pastor.";
  }
  if (lower.includes("violates foreign key")) {
    return "A igreja, organização, ministério ou voluntário vinculado não foi encontrado.";
  }
  return message || "Não conseguimos criar o evento de teste agora.";
}

export default function EventsSeedButton({ churchId, organizationId, ministryId, personId }: EventsSeedButtonProps) {
  const router = useRouter();
  const supabase = createServiceBrowserClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function seedEvents() {
    setLoading(true);
    setError("");

    const marker = Date.now();
    const { data: event, error: eventError } = await supabase
      .schema("service")
      .from("events")
      .insert({
        organization_id: organizationId,
        church_id: churchId,
        name: `Culto Teste ${marker}`,
        kind: "Culto",
        weekday: "Domingo",
        event_date: new Date().toISOString().slice(0, 10),
        time: "10h00",
        slot: "dom_m",
        location: "Templo",
        ministries: ministryId ? [ministryId] : [],
        tags: [],
      })
      .select("id")
      .single();

    if (eventError || !event) {
      setLoading(false);
      setError(friendlySeedError(eventError?.message || ""));
      return;
    }

    const { error: scheduleError } = await supabase.schema("service").from("event_schedule_items").insert([
      {
        organization_id: organizationId,
        event_id: event.id,
        time: "09h30",
        duration_min: 30,
        item: "Passagem de som",
        ministry_id: ministryId || null,
        person_id: personId || null,
        category: "louvor",
        notes: "Chegada da equipe e alinhamento inicial.",
        sort_order: 1,
      },
      {
        organization_id: organizationId,
        event_id: event.id,
        time: "10h15",
        duration_min: 30,
        item: "Momento de louvor",
        ministry_id: ministryId || null,
        person_id: personId || null,
        category: "louvor",
        notes: "Repertório principal do culto.",
        sort_order: 2,
      },
    ]);

    if (scheduleError) {
      setLoading(false);
      setError(friendlySeedError(scheduleError.message));
      return;
    }

    const { error: setlistError } = await supabase.schema("service").from("setlist_songs").insert([
      {
        organization_id: organizationId,
        event_id: event.id,
        title: "Grandes Coisas",
        song_key: "G",
        youtube: "",
        chart: "",
        sort_order: 1,
      },
      {
        organization_id: organizationId,
        event_id: event.id,
        title: "Bondade de Deus",
        song_key: "D",
        youtube: "",
        chart: "",
        sort_order: 2,
      },
    ]);

    setLoading(false);

    if (setlistError) {
      setError(friendlySeedError(setlistError.message));
      return;
    }

    router.refresh();
  }

  return (
    <div style={{ display: "grid", justifyItems: "center", gap: 12 }}>
      <button className="btn btn-primary" type="button" onClick={seedEvents} disabled={loading}>
        {loading ? "Criando..." : "Criar evento de teste"}
      </button>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
