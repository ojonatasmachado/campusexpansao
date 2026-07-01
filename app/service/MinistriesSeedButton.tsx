"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createServiceBrowserClient } from "./lib/supabase-browser";

type MinistriesSeedButtonProps = {
  churchId: string;
  organizationId: string;
  personId?: string | null;
};

function friendlySeedError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("permission") || lower.includes("row-level security") || lower.includes("rls")) {
    return "O banco bloqueou a criação por segurança. Confirme se você está logado como master ou pastor.";
  }
  if (lower.includes("violates foreign key")) {
    return "A igreja, organização ou voluntário vinculado não foi encontrado.";
  }
  return message || "Não conseguimos criar os ministérios de teste agora.";
}

export default function MinistriesSeedButton({ churchId, organizationId, personId }: MinistriesSeedButtonProps) {
  const router = useRouter();
  const supabase = createServiceBrowserClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function seedMinistries() {
    setLoading(true);
    setError("");

    const marker = Date.now();
    const { data: ministry, error: ministryError } = await supabase
      .schema("service")
      .from("ministries")
      .insert({
        organization_id: organizationId,
        church_id: churchId,
        name: `Louvor Teste ${marker}`,
        icon: "◆",
        description: "Banda, vocal e técnica de palco para os cultos.",
        profile: {
          proposito: "Conduzir a igreja em adoração com simplicidade e excelência.",
          aberto: true,
        },
      })
      .select("id")
      .single();

    if (ministryError || !ministry) {
      setLoading(false);
      setError(friendlySeedError(ministryError?.message || ""));
      return;
    }

    const { error: positionsError } = await supabase.schema("service").from("ministry_positions").insert([
      {
        organization_id: organizationId,
        ministry_id: ministry.id,
        name: "Vocal",
        need_count: 2,
        sort_order: 1,
      },
      {
        organization_id: organizationId,
        ministry_id: ministry.id,
        name: "Violão",
        need_count: 1,
        sort_order: 2,
      },
    ]);

    if (positionsError) {
      setLoading(false);
      setError(friendlySeedError(positionsError.message));
      return;
    }

    if (personId) {
      const { error: linkError } = await supabase.schema("service").from("person_ministries").insert({
        organization_id: organizationId,
        person_id: personId,
        ministry_id: ministry.id,
        is_leader: true,
        functions: ["Vocal"],
      });

      if (linkError) {
        setLoading(false);
        setError(friendlySeedError(linkError.message));
        return;
      }
    }

    setLoading(false);
    router.refresh();
  }

  return (
    <div style={{ display: "grid", justifyItems: "center", gap: 12 }}>
      <button className="btn btn-primary" type="button" onClick={seedMinistries} disabled={loading}>
        {loading ? "Criando..." : "Criar ministério de teste"}
      </button>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
