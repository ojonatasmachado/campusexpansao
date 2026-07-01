"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createServiceBrowserClient } from "./lib/supabase-browser";

type MembersSeedButtonProps = {
  churchId: string;
  organizationId: string;
  volunteerId?: string | null;
};

function friendlySeedError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("permission") || lower.includes("row-level security") || lower.includes("rls")) {
    return "O banco bloqueou a criação por segurança. Confirme se você está logado como master ou pastor.";
  }
  if (lower.includes("violates foreign key")) {
    return "A igreja, organização ou voluntário vinculado não foi encontrado.";
  }
  return message || "Não conseguimos criar os membros de teste agora.";
}

export default function MembersSeedButton({ churchId, organizationId, volunteerId }: MembersSeedButtonProps) {
  const router = useRouter();
  const supabase = createServiceBrowserClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function seedMembers() {
    setLoading(true);
    setError("");

    const marker = Date.now();
    const { error: insertError } = await supabase.schema("service").from("members").insert([
      {
        organization_id: organizationId,
        church_id: churchId,
        volunteer_id: volunteerId || null,
        name: `Bianca Melo Teste ${marker}`,
        phone: "(11) 98778-1102",
        email: `bianca.membro.${marker}@service.local`,
        birth: "08 ago",
        since_year: "2025",
        situation: "novo",
        first_contact: "2026-07",
        neighborhood: "Centro",
        family: "Melo",
        journey: [1, 0, 0, 1, volunteerId ? 1 : 0],
      },
      {
        organization_id: organizationId,
        church_id: churchId,
        volunteer_id: null,
        name: `Roberto Dias Teste ${marker}`,
        phone: "(11) 99334-8821",
        email: `roberto.membro.${marker}@service.local`,
        birth: "05 abr",
        since_year: "2024",
        situation: "membro",
        first_contact: "2024-01",
        neighborhood: "Vila Aurora",
        family: "Dias",
        journey: [1, 1, 1, 0, 0],
      },
    ]);

    setLoading(false);

    if (insertError) {
      setError(friendlySeedError(insertError.message));
      return;
    }

    router.refresh();
  }

  return (
    <div style={{ display: "grid", justifyItems: "center", gap: 12 }}>
      <button className="btn btn-primary" type="button" onClick={seedMembers} disabled={loading}>
        {loading ? "Criando..." : "Criar 2 membros de teste"}
      </button>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
