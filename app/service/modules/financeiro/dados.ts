"use client";

/* Leitura do financeiro direto do banco (0073), só quando a tela abre: o
   carregamento geral do painel não traz nada daqui, então quem não tem acesso
   nunca recebe um centavo de dado financeiro no navegador (e a RLS barra de
   qualquer jeito). */

import { useCallback, useEffect, useState } from "react";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { limitesDoMes } from "./dinheiro";

export const BUCKET_FIN = "service-finance";

export type Conta = { id: string; name: string; kind: "caixa" | "banco"; institution: string | null; opening_balance_cents: number; opening_date: string | null; active: boolean; sort_order: number };
export type Categoria = { id: string; kind: "entrada" | "despesa"; name: string; system_code: string | null; active: boolean; sort_order: number };
export type Fundo = { id: string; name: string; designated: boolean; is_default: boolean; active: boolean; sort_order: number };
export type Lancamento = {
  id: string;
  kind: "entrada" | "despesa" | "transferencia";
  status: "realizado" | "previsto";
  occurred_on: string;
  amount_cents: number;
  account_id: string;
  to_account_id: string | null;
  category_id: string | null;
  fund_id: string | null;
  method: string | null;
  description: string;
  contributor_member_id: string | null;
  supplier_name: string | null;
  attachment_path: string | null;
  offering_count_id: string | null;
  created_at: string;
};
export type PessoaFin = { id: string; name: string; eu: boolean };

export type DadosFin = {
  carregando: boolean;
  erro: string;
  contas: Conta[];
  categorias: Categoria[];
  fundos: Fundo[];
  lancamentos: Lancamento[];
  saldoConta: Record<string, number>;
  saldoFundo: Record<string, number>;
  pessoas: PessoaFin[];
};

export const db = () => createServiceBrowserClient().schema("service");

const COLS_LANC = "id,kind,status,occurred_on,amount_cents,account_id,to_account_id,category_id,fund_id,method,description,contributor_member_id,supplier_name,attachment_path,offering_count_id,created_at";

const porOrdem = <T extends { sort_order: number; name: string }>(a: T, b: T) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "pt-BR");

export function useFinanceiro(org: string | undefined, mes: string) {
  const [d, setD] = useState<DadosFin>({ carregando: true, erro: "", contas: [], categorias: [], fundos: [], lancamentos: [], saldoConta: {}, saldoFundo: {}, pessoas: [] });
  const [versao, setVersao] = useState(0);
  const recarregar = useCallback(() => setVersao((v) => v + 1), []);

  useEffect(() => {
    if (!org) return;
    let vivo = true;
    (async () => {
      const s = db();
      /* conjunto inicial na primeira abertura (a função não faz nada se já existe) */
      await s.rpc("fin_preparar", { p_org: org });
      const { de, ate } = limitesDoMes(mes);
      const [contas, categorias, fundos, lanc, saldos, saldosF, pessoas] = await Promise.all([
        s.from("fin_accounts").select("id,name,kind,institution,opening_balance_cents,opening_date,active,sort_order").eq("organization_id", org),
        s.from("fin_categories").select("id,kind,name,system_code,active,sort_order").eq("organization_id", org),
        s.from("fin_funds").select("id,name,designated,is_default,active,sort_order").eq("organization_id", org),
        s.from("fin_transactions").select(COLS_LANC).eq("organization_id", org).gte("occurred_on", de).lte("occurred_on", ate)
          .order("occurred_on", { ascending: false }).order("created_at", { ascending: false }).limit(2000),
        s.rpc("fin_saldos", { p_org: org }),
        s.rpc("fin_saldos_fundos", { p_org: org }),
        s.rpc("fin_pessoas", { p_org: org }),
      ]);
      if (!vivo) return;
      const erro = [contas, categorias, fundos, lanc].find((r) => r.error)?.error;
      setD({
        carregando: false,
        erro: erro ? "Não foi possível abrir o financeiro. Recarregue a página." : "",
        contas: ((contas.data ?? []) as Conta[]).sort(porOrdem),
        categorias: ((categorias.data ?? []) as Categoria[]).sort(porOrdem),
        fundos: ((fundos.data ?? []) as Fundo[]).sort(porOrdem),
        lancamentos: (lanc.data ?? []) as Lancamento[],
        saldoConta: Object.fromEntries(((saldos.data ?? []) as { account_id: string; saldo_cents: number }[]).map((r) => [r.account_id, Number(r.saldo_cents)])),
        saldoFundo: Object.fromEntries(((saldosF.data ?? []) as { fund_id: string; saldo_cents: number }[]).map((r) => [r.fund_id, Number(r.saldo_cents)])),
        pessoas: (pessoas.data ?? []) as PessoaFin[],
      });
    })();
    return () => { vivo = false; };
  }, [org, mes, versao]);

  return { ...d, recarregar };
}

/** abre o comprovante (link assinado de 5 minutos; o bucket é privado) */
export async function abrirComprovante(path: string): Promise<string | null> {
  const { data } = await createServiceBrowserClient().storage.from(BUCKET_FIN).createSignedUrl(path, 300);
  return data?.signedUrl ?? null;
}
