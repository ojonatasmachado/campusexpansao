"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createServiceBrowserClient } from "../lib/supabase-browser";

import { Botao } from "../ui/Botao";
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
        <Botao tamanho="entrada" variante="principal" onClick={() => router.refresh()}>
          Ver se já liberou
        </Botao>
      )}
      <Botao tamanho="entrada" variante="texto" onClick={sair} desativado={saindo}>
        {saindo ? "Saindo..." : "Sair desta conta"}
      </Botao>
    </div>
  );
}
