"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useServiceAccess } from "../../AccessContext";
import { createServiceBrowserClient } from "../../lib/supabase-browser";

export type EstadoCarga = "carregando" | "erro" | "pronto";
export type Ficha = { id: string; name: string; phone: string | null; email: string | null };
export type Pedido = { id: string; name: string; email: string; phone: string | null; created_at: string; parecidos: Ficha[] };
type Carga = { org: string | null; estado: EstadoCarga; pedidos: Pedido[] };

function lerPedidos(org: string) {
  return Promise.resolve(createServiceBrowserClient().schema("service").rpc("entrada_pedidos", { p_org: org }));
}

/* Uma carga no Início; a linha e a folha recebem esta mesma lista. Não consulta
   para outros papéis. O escopo e a geração impedem respostas antigas de voltar. */
export function usePedidosConta(gestao: boolean) {
  const { organizationId } = useServiceAccess();
  const [carga, setCarga] = useState<Carga>({ org: null, estado: "carregando", pedidos: [] });
  const atual = useRef(0);
  const emAndamento = useRef<{ org: string; consulta: ReturnType<typeof lerPedidos> } | null>(null);
  const carregar = useCallback(() => {
    const geracao = ++atual.current;
    if (!gestao || !organizationId) return;
    setCarga({ org: organizationId, estado: "carregando", pedidos: [] });
    const falhou = () => {
      if (geracao === atual.current) setCarga({ org: organizationId, estado: "erro", pedidos: [] });
    };
    // O efeito duplo do Strict Mode reutiliza a consulta pendente, sem cache global.
    if (!emAndamento.current || emAndamento.current.org !== organizationId) {
      emAndamento.current = { org: organizationId, consulta: lerPedidos(organizationId) };
    }
    const consulta = emAndamento.current.consulta;
    void consulta.then(({ data, error }) => {
      if (geracao !== atual.current) return;
      if (error) { falhou(); return; }
      setCarga({ org: organizationId, estado: "pronto", pedidos: (data ?? []) as Pedido[] });
    }, falhou).finally(() => {
      if (emAndamento.current?.consulta === consulta) emAndamento.current = null;
    });
  }, [gestao, organizationId]);

  useEffect(() => {
    const geracao = atual;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga externa iniciada ao entrar no escopo da gestão
    carregar();
    return () => { geracao.current++; };
  }, [carregar]);

  const remover = useCallback((id: string) => {
    setCarga((anterior) => ({ ...anterior, pedidos: anterior.pedidos.filter((p) => p.id !== id) }));
  }, []);
  const noEscopo = gestao && carga.org === organizationId;
  return {
    pedidos: noEscopo ? carga.pedidos : [],
    estado: !gestao ? "pronto" as const : noEscopo ? carga.estado : "carregando" as const,
    carregar,
    remover,
  };
}

export type PedidosConta = ReturnType<typeof usePedidosConta>;
