"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createServiceBrowserClient } from "../lib/supabase-browser";

/* Espera do pedido feito pelo link da igreja (0071): "Ver de novo" relê o
   pedido (se a gestão já liberou, o /service abre o app) e "Sair" troca de
   conta. Markup nas classes .login-*. */
export default function PedidoEmEspera({ recusado = false }: { recusado?: boolean }) {
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);
  const sair = async () => {
    setSaindo(true);
    await createServiceBrowserClient().auth.signOut();
    router.push("/service/login");
    router.refresh();
  };
  return (
    <div className="login-form">
      {!recusado && (
        <button className="login-btn" type="button" onClick={() => router.refresh()}>
          Ver se já liberou
        </button>
      )}
      <button className="login-link" type="button" onClick={sair} disabled={saindo}>
        {saindo ? "Saindo..." : "Sair desta conta"}
      </button>
    </div>
  );
}
