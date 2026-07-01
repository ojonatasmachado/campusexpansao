"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createServiceBrowserClient } from "./lib/supabase-browser";

type PeopleSeedButtonProps = {
  churchId: string;
  organizationId: string;
};

function friendlySeedError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("permission") || lower.includes("row-level security") || lower.includes("rls")) {
    return "O banco bloqueou a criação por segurança. Confirme se você está logado como master ou pastor.";
  }
  if (lower.includes("violates foreign key")) {
    return "A igreja ou organização não foi encontrada para vincular os voluntários.";
  }
  return message || "Não conseguimos criar os voluntários de teste agora.";
}

export default function PeopleSeedButton({ churchId, organizationId }: PeopleSeedButtonProps) {
  const router = useRouter();
  const supabase = createServiceBrowserClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function seedPeople() {
    setLoading(true);
    setError("");

    const suffix = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const { error: insertError } = await supabase.schema("service").from("people").insert([
      {
        organization_id: organizationId,
        church_id: churchId,
        name: `Mariana Reis Teste ${suffix}`,
        phone: "(11) 98812-4471",
        email: `mariana.teste.${Date.now()}@service.local`,
        since_year: "2024",
        status: "ativo",
        engagement: 92,
        availability: { dom_m: true, dom_n: true, qua: false },
        tags: ["louvor", "jovens"],
      },
      {
        organization_id: organizationId,
        church_id: churchId,
        name: `Paulo Tavares Teste ${suffix}`,
        phone: "(11) 99640-1182",
        email: `paulo.teste.${Date.now()}@service.local`,
        since_year: "2023",
        status: "ativo",
        engagement: 86,
        availability: { dom_m: true, dom_n: false, qua: true },
        tags: ["recepcao"],
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
      <button className="btn btn-primary" type="button" onClick={seedPeople} disabled={loading}>
        {loading ? "Criando..." : "Criar 2 voluntários de teste"}
      </button>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
