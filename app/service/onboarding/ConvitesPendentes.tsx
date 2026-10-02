"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createServiceBrowserClient } from "../lib/supabase-browser";

/* Conta que já existia e foi convidada por uma igreja entra como 'invited':
   a pessoa confirma aqui antes de fazer parte (core.accept_membership, 0043).
   Lógica igual à anterior; markup nas classes .login-* (service-v5.css). */
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
    <div className="login-form">
      {invites.map((inv) => (
        <div key={inv.organizationId} className="login-invite">
          <b>{inv.churchName}</b>
          <span className="login-invite-actions">
            <button className="btn btn-sec btn-sm" type="button" disabled={loadingId !== null} onClick={() => recusar(inv.organizationId)}>
              Recusar
            </button>
            <button className="btn btn-pri btn-sm" type="button" disabled={loadingId !== null} onClick={() => aceitar(inv.organizationId)}>
              {loadingId === inv.organizationId ? "Aguarde..." : "Aceitar convite"}
            </button>
          </span>
        </div>
      ))}
      {error && (
        <div className="login-alert" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
