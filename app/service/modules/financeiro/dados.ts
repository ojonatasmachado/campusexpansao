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
  /* fase 2 (0080) */
  due_on: string | null;
  recurring_id: string | null;
  campaign_id: string | null;
  closing_id: string | null;
};
export type ContaFixa = {
  id: string; kind: "entrada" | "despesa"; description: string; amount_cents: number; account_id: string; category_id: string; fund_id: string;
  method: string | null; supplier_name: string | null; day_of_month: number; starts_on: string; ends_on: string | null; active: boolean;
};
export type Campanha = { id: string; name: string; description: string | null; goal_cents: number; fund_id: string | null; starts_on: string; ends_on: string | null; active: boolean };
export type Totais = {
  entradas_cents: number; despesas_cents: number; previstos_em_aberto: number;
  por_categoria: { categoria: string; tipo: "entrada" | "despesa"; total_cents: number }[];
  saldo_contas: { conta: string; saldo_cents: number }[];
  saldo_fundos: { fundo: string; saldo_cents: number }[];
};
export type Fechamento = { id: string; month: string; totals: Totais; notes: string | null; closed_at: string };
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
  /* fase 2 (0080): vazios antes da migração */
  contasFixas: ContaFixa[];
  campanhas: Campanha[];
  arrecadado: Record<string, number>;
  fechamentos: Fechamento[];
};

export const db = () => createServiceBrowserClient().schema("service");

const COLS_LANC = "id,kind,status,occurred_on,amount_cents,account_id,to_account_id,category_id,fund_id,method,description,contributor_member_id,supplier_name,attachment_path,offering_count_id,created_at,due_on,recurring_id,campaign_id,closing_id";

const porOrdem = <T extends { sort_order: number; name: string }>(a: T, b: T) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "pt-BR");

/* a API devolve no máximo 1.000 linhas por consulta: o mês inteiro vem em páginas,
   senão a lista e os totais do mês ficariam pela metade num mês cheio. Cada página
   continua do último lançamento lido (data, criação, id), não por posição: um
   lançamento feito durante a leitura não desloca as páginas (nada pula nem repete). */
const PAGINA = 1000;
async function lancamentosDoMes(s: ReturnType<typeof db>, org: string, de: string, ate: string) {
  const todos: Lancamento[] = [];
  let ultimo: Lancamento | null = null;
  for (;;) {
    let q = s.from("fin_transactions").select(COLS_LANC).eq("organization_id", org).gte("occurred_on", de).lte("occurred_on", ate);
    if (ultimo) {
      const { occurred_on: d, created_at: c, id } = ultimo;
      q = q.or(`occurred_on.lt.${d},and(occurred_on.eq.${d},created_at.lt."${c}"),and(occurred_on.eq.${d},created_at.eq."${c}",id.lt.${id})`);
    }
    const { data, error } = await q.order("occurred_on", { ascending: false }).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(PAGINA);
    if (error) return { data: null, error };
    const pagina = (data ?? []) as unknown as Lancamento[];
    todos.push(...pagina);
    if (pagina.length < PAGINA) return { data: todos, error: null };
    ultimo = pagina[pagina.length - 1];
  }
}

/** gerarPrevistos: quem lança abre o mês com os previstos das contas fixas já criados (a função não duplica) */
export function useFinanceiro(org: string | undefined, mes: string, gerarPrevistos = false) {
  const [d, setD] = useState<DadosFin>({ carregando: true, erro: "", contas: [], categorias: [], fundos: [], lancamentos: [], saldoConta: {}, saldoFundo: {}, pessoas: [], contasFixas: [], campanhas: [], arrecadado: {}, fechamentos: [] });
  const [versao, setVersao] = useState(0);
  const recarregar = useCallback(() => setVersao((v) => v + 1), []);

  useEffect(() => {
    if (!org) return;
    let vivo = true;
    (async () => {
      const s = db();
      /* conjunto inicial na primeira abertura (a função não faz nada se já existe) */
      await s.rpc("fin_preparar", { p_org: org });
      if (gerarPrevistos) await s.rpc("fin_gerar_previstos", { p_org: org, p_mes: mes });
      const { de, ate } = limitesDoMes(mes);
      const [contas, categorias, fundos, lanc, saldos, saldosF, pessoas, fixas, camps, prog, fechs] = await Promise.all([
        s.from("fin_accounts").select("id,name,kind,institution,opening_balance_cents,opening_date,active,sort_order").eq("organization_id", org),
        s.from("fin_categories").select("id,kind,name,system_code,active,sort_order").eq("organization_id", org),
        s.from("fin_funds").select("id,name,designated,is_default,active,sort_order").eq("organization_id", org),
        lancamentosDoMes(s, org, de, ate),
        s.rpc("fin_saldos", { p_org: org }),
        s.rpc("fin_saldos_fundos", { p_org: org }),
        s.rpc("fin_pessoas", { p_org: org }),
        s.from("fin_recurring").select("id,kind,description,amount_cents,account_id,category_id,fund_id,method,supplier_name,day_of_month,starts_on,ends_on,active").eq("organization_id", org).order("day_of_month"),
        s.from("fin_campaigns").select("id,name,description,goal_cents,fund_id,starts_on,ends_on,active").eq("organization_id", org).order("starts_on", { ascending: false }),
        s.rpc("fin_campanhas_progresso", { p_org: org }),
        s.from("fin_closings").select("id,month,totals,notes,closed_at").eq("organization_id", org).is("reopened_at", null).order("month", { ascending: false }),
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
        contasFixas: (fixas.data ?? []) as ContaFixa[],
        campanhas: (camps.data ?? []) as Campanha[],
        arrecadado: Object.fromEntries(((prog.data ?? []) as { campaign_id: string; arrecadado_cents: number }[]).map((r) => [r.campaign_id, Number(r.arrecadado_cents)])),
        fechamentos: (fechs.data ?? []) as Fechamento[],
      });
    })();
    return () => { vivo = false; };
  }, [org, mes, versao, gerarPrevistos]);

  return { ...d, recarregar };
}

/** abre o comprovante (link assinado de 5 minutos; o bucket é privado) */
export async function abrirComprovante(path: string): Promise<string | null> {
  const { data } = await createServiceBrowserClient().storage.from(BUCKET_FIN).createSignedUrl(path, 300);
  return data?.signedUrl ?? null;
}
