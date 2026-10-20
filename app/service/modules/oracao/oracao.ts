/* Dados do Mural de oração (0076). Tudo passa pelas funções do banco:
   o membro nunca lê a tabela inteira (prayer_wall esconde o nome do
   anônimo e não devolve member_id) e quem cuida usa prayer_admin_list.
   No /service/demo (sem banco) os mesmos contratos rodam em memória. */

import { useCallback, useEffect, useState } from "react";
import { createServiceBrowserClient } from "../../lib/supabase-browser";

export type Categoria = "saude" | "familia" | "trabalho" | "espiritual" | "gratidao" | "outro";
export type Publico = "intercessao" | "mural";
export type Moderacao = "ativo" | "oculto" | "arquivado";

export const CATEGORIAS: { id: Categoria; rotulo: string }[] = [
  { id: "saude", rotulo: "Saúde" },
  { id: "familia", rotulo: "Família" },
  { id: "trabalho", rotulo: "Trabalho" },
  { id: "espiritual", rotulo: "Vida com Deus" },
  { id: "gratidao", rotulo: "Gratidão" },
  { id: "outro", rotulo: "Outro" },
];
export const rotuloCategoria = (c: string) => CATEGORIAS.find((x) => x.id === c)?.rotulo ?? "Outro";

/* como o membro vê (service.prayer_wall) */
export type PedidoMural = {
  id: string;
  body: string;
  category: Categoria;
  author: string | null;
  is_mine: boolean;
  audience: Publico;
  anonymous: boolean;
  hidden: boolean;
  prayed_count: number | null;
  i_prayed: boolean;
  answered_at: string | null;
  testimony: string | null;
  created_at: string;
};

/* como quem cuida vê (service.prayer_admin_list) */
export type PedidoPainel = {
  id: string;
  church_id: string;
  member_id: string | null;
  author: string | null;
  body: string;
  category: Categoria;
  audience: Publico;
  anonymous: boolean;
  moderation: Moderacao;
  prayed_count: number;
  answered_at: string | null;
  testimony: string | null;
  created_at: string;
  moderated_at: string | null;
};

export const LIMITE_PEDIDO = 1000;
export const LIMITE_TESTEMUNHO = 500;

const ehDemo = (org?: string | null) => !org || org === "org-demo";
const sb = () => createServiceBrowserClient().schema("service");

// ── demo em memória ───────────────────────────────────────────────────────────
type Linha = PedidoPainel & { orei: Set<string> };
const EU = "m1";
let demo: Linha[] | null = null;
const ouvintes = new Set<() => void>();
const avisarDemo = () => ouvintes.forEach((f) => f());

function semente(): Linha[] {
  const pior = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("dados") === "pior";
  const h = (dias: number) => new Date(Date.now() - dias * 86400000).toISOString();
  const l = (id: string, member: string, author: string, body: string, x: Partial<Linha> = {}): Linha => ({
    id, church_id: "ch-1", member_id: member, author, body, category: "outro", audience: "mural", anonymous: false,
    moderation: "ativo", prayed_count: 0, answered_at: null, testimony: null, created_at: h(1), moderated_at: null, orei: new Set(), ...x,
  });
  if (pior) {
    const longo = "Peço oração pela cirurgia da minha mãe, Maria Aparecida, marcada para a próxima quinta-feira no Hospital das Clínicas de São Paulo. Os médicos disseram que é delicada e que a recuperação pode levar meses. Também peço pela nossa família, que está cansada e com medo, e pelos irmãos que vão revezar nas visitas.";
    return [
      l("pr-1", "m2", "Francisco de Assis Gonçalves Bittencourt Júnior", longo, { category: "saude", created_at: h(0) }),
      l("pr-2", EU, "Maria Aparecida dos Santos Albuquerque Nascimento", "Pelo emprego novo. ".repeat(20).trim(), { category: "trabalho", orei: new Set(["m2"]), created_at: h(2) }),
      l("pr-3", "m3", "Jô", "Obrigado.", { category: "gratidao", answered_at: h(1), testimony: "Deus respondeu de um jeito que ninguém esperava. ".repeat(9).trim(), created_at: h(9) }),
      l("pr-4", "m4", "Thaís Nguyễn", "supercalifragilisticexpialidocious_sem_espaco_nenhum_para_quebrar_a_linha_do_cartao", { anonymous: true, created_at: h(3) }),
      l("pr-5", EU, "Maria Aparecida dos Santos Albuquerque Nascimento", "Só a intercessão lê este.", { audience: "intercessao", created_at: h(4) }),
    ];
  }
  return [
    l("pr-1", "m2", "Bruno Costa", "Pela saúde do meu pai, que começa o tratamento na semana que vem.", { category: "saude", orei: new Set(["m3"]), created_at: h(0) }),
    l("pr-2", "m3", "Carla Santos", "Peço oração pela minha família, estamos passando por um tempo difícil.", { category: "familia", anonymous: true, created_at: h(1) }),
    l("pr-3", EU, "Ana Lima", "Pela entrevista de emprego na sexta.", { category: "trabalho", orei: new Set(["m2", "m3", "m4"]), created_at: h(2) }),
    l("pr-4", "m4", "Diego Ferreira", "Pela viagem missionária do grupo de jovens.", { category: "espiritual", answered_at: h(1), testimony: "Voltamos todos bem e com muitas histórias para contar. Obrigado por orarem!", created_at: h(12) }),
  ];
}
const linhasDemo = () => (demo ??= semente());

function paraMural(r: Linha): PedidoMural {
  const meu = r.member_id === EU;
  return {
    id: r.id, body: r.body, category: r.category, author: r.anonymous ? null : r.author, is_mine: meu, audience: r.audience,
    anonymous: r.anonymous, hidden: r.moderation !== "ativo", prayed_count: meu ? r.orei.size : null, i_prayed: r.orei.has(EU),
    answered_at: r.answered_at, testimony: r.testimony, created_at: r.created_at,
  };
}

// ── leitura ──────────────────────────────────────────────────────────────────
function useCarregar<T>(org: string | null | undefined, rpc: string, demoLer: () => T[]) {
  const [dados, setDados] = useState<T[] | null>(null);
  const [erro, setErro] = useState(false);
  const recarregar = useCallback(async () => {
    if (ehDemo(org)) { setDados(demoLer()); return; }
    const { data, error } = await sb().rpc(rpc, { p_org: org });
    if (error) { setErro(true); return; }
    setErro(false);
    setDados((data ?? []) as T[]);
    // demoLer muda a cada render; o que importa é a igreja e a função
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org, rpc]);
  useEffect(() => {
    let vivo = true;
    queueMicrotask(() => { if (vivo) void recarregar(); });
    if (!ehDemo(org)) return () => { vivo = false; };
    const f = () => { void recarregar(); };
    ouvintes.add(f);
    return () => { vivo = false; ouvintes.delete(f); };
  }, [org, recarregar]);
  return { dados, erro, recarregar };
}

export function useMuralOracao(org?: string | null) {
  return useCarregar<PedidoMural>(org, "prayer_wall", () =>
    linhasDemo().filter((r) => (r.member_id === EU && r.moderation !== "arquivado") || (r.audience === "mural" && r.moderation === "ativo")).map(paraMural));
}

export function usePedidosPainel(org?: string | null) {
  return useCarregar<PedidoPainel>(org, "prayer_admin_list", () => linhasDemo().map((r) => ({ ...r, prayed_count: r.orei.size })));
}

// ── escrita ──────────────────────────────────────────────────────────────────
/* devolve o id do pedido, ou a mensagem para a pessoa */
export async function pedirOracao(org: string | null | undefined, p: { body: string; audience: Publico; anonymous: boolean; category: Categoria }): Promise<{ id?: string; erro?: string }> {
  if (ehDemo(org)) {
    const id = `pr-${Date.now()}`;
    linhasDemo().unshift({ id, church_id: "ch-1", member_id: EU, author: "Ana Lima", body: p.body.trim(), category: p.category, audience: p.audience, anonymous: p.anonymous,
      moderation: "ativo", prayed_count: 0, answered_at: null, testimony: null, created_at: new Date().toISOString(), moderated_at: null, orei: new Set() });
    avisarDemo();
    return { id };
  }
  const { data, error } = await sb().rpc("prayer_create", { p_org: org, p_body: p.body, p_audience: p.audience, p_anonymous: p.anonymous, p_category: p.category });
  if (error) {
    if (/limite_diario/.test(error.message)) return { erro: "Você já fez muitos pedidos hoje. Amanhã dá para pedir de novo." };
    return { erro: "Não foi possível enviar agora. Tente de novo." };
  }
  return { id: data as string };
}

async function chamar(org: string | null | undefined, rpc: string, args: Record<string, unknown>, demoFaz: () => void): Promise<boolean> {
  if (ehDemo(org)) { demoFaz(); avisarDemo(); return true; }
  const { data, error } = await sb().rpc(rpc, args);
  return !error && data === true;
}
const achar = (id: string) => linhasDemo().find((r) => r.id === id);

export const orar = (org: string | null | undefined, id: string, on: boolean) =>
  chamar(org, "prayer_pray", { p_id: id, p_on: on }, () => { const r = achar(id); if (r) { if (on) r.orei.add(EU); else r.orei.delete(EU); } });

export const marcarRespondido = (org: string | null | undefined, id: string, respondido: boolean, testemunho?: string) =>
  chamar(org, "prayer_answer", { p_id: id, p_answered: respondido, p_testimony: testemunho ?? null }, () => {
    const r = achar(id);
    if (r) { r.answered_at = respondido ? (r.answered_at ?? new Date().toISOString()) : null; r.testimony = respondido ? (testemunho?.trim() || null) : null; }
  });

export const tirarDoMural = (org: string | null | undefined, id: string, on: boolean) =>
  chamar(org, "prayer_withdraw", { p_id: id, p_on: on }, () => { const r = achar(id); if (r) r.moderation = on ? "arquivado" : "ativo"; });

export const moderar = (org: string | null | undefined, id: string, estado: Moderacao) =>
  chamar(org, "prayer_moderate", { p_id: id, p_state: estado }, () => { const r = achar(id); if (r) { r.moderation = estado; r.moderated_at = new Date().toISOString(); } });
