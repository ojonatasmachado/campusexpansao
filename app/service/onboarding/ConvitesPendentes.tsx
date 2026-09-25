"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createServiceBrowserClient } from "../lib/supabase-browser";

/* Conta que já existia e foi convidada por uma igreja entra como 'invited':
   a pessoa confirma aqui antes de fazer parte (core.accept_membership, 0043). */
export default function ConvitesPendentes({ invites }: { invites: { organizationId: string; churchName: string }[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const aceitar = async (organizationId: string) => {
    setLoadingId(organizationId);
    setError("");
    const { data, error: rpcError } = await createServiceBrowserClient()
      .schema("core")
      .rpc("accept_membership", { p_org: organizationId });
    setLoadingId(null);
    if (rpcError || !data) {
      setError("Não foi possível aceitar agora. Tente de novo.");
      return;
    }
    router.push("/service");
    router.refresh();
  };

  const recusar = async (organizationId: string) => {
    setLoadingId(organizationId);
    setError("");
    const { error: rpcError } = await createServiceBrowserClient()
      .schema("core")
      .rpc("decline_membership", { p_org: organizationId });
    setLoadingId(null);
    if (rpcError) {
      setError("Não foi possível recusar agora. Tente de novo.");
      return;
    }
    router.refresh();
  };

  return (
    <div style={{ display: "grid", gap: 12, marginTop: 24 }}>
      {invites.map((inv) => (
        <div key={inv.organizationId} className="banner banner-soft" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <strong style={{ color: "var(--cream)" }}>{inv.churchName}</strong>
          <span style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost" type="button" disabled={loadingId !== null} onClick={() => recusar(inv.organizationId)}>
              Recusar
            </button>
            <button className="btn btn-primary" type="button" disabled={loadingId !== null} onClick={() => aceitar(inv.organizationId)}>
              {loadingId === inv.organizationId ? "Aguarde..." : "Aceitar convite →"}
            </button>
          </span>
        </div>
      ))}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
