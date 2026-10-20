// Uso: npx tsx scripts/check-local-oracao.ts
//
// Teste de aceitação do Mural de oração (0076) no Supabase LOCAL, com as
// contas de scripts/seed-local-service.ts. Recusa rodar fora de 127.0.0.1.
//   membro   (A) pede: mural com nome, mural anônimo e só a intercessão
//   membro2  (B) lê o mural, ora, tenta ler e escrever direto na tabela
//   lider    (C) líder de outro time: não cuida da intercessão
//   master   (M) cuida: lista com nomes e modera
//   outra    (O) outra igreja: não vê nada
// Apaga o que criou no fim.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = "http://127.0.0.1:54321";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const SENHA = "TesteLocal123";
if (!URL.startsWith("http://127.0.0.1")) throw new Error("só roda no Supabase local");

const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

async function entrar(email: string): Promise<SupabaseClient> {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: SENHA });
  if (error) throw new Error(`${email}: ${error.message}`);
  return c;
}

let falhas = 0;
function confere(ok: boolean, msg: string) {
  console.log(`${ok ? "ok   " : "FALHA"} ${msg}`);
  if (!ok) falhas++;
}

type Linha = { id: string; author: string | null; is_mine: boolean; prayed_count: number | null; i_prayed: boolean; hidden: boolean; audience: string; answered_at: string | null; testimony: string | null } & Record<string, unknown>;

async function main() {
  const [A, B, C, M, O] = await Promise.all(["membro", "membro2", "lider", "master", "outra"].map((n) => entrar(`${n}@teste.local`)));
  const { data: igreja } = await M.schema("service").from("churches").select("organization_id").limit(1).single();
  const org = igreja!.organization_id as string;
  const { data: igrejaO } = await O.schema("service").from("churches").select("organization_id").limit(1).single();
  const orgO = igrejaO!.organization_id as string;
  const sa = A.schema("service"), sb = B.schema("service"), sc = C.schema("service"), sm = M.schema("service"), so = O.schema("service");

  const criar = async (body: string, audience: string, anonymous: boolean) => {
    const { data, error } = await sa.rpc("prayer_create", { p_org: org, p_body: body, p_audience: audience, p_anonymous: anonymous, p_category: "familia" });
    if (error) throw new Error(`prayer_create: ${error.message}`);
    return data as string;
  };
  const comNome = await criar("[teste] pedido com nome", "mural", false);
  const anonimo = await criar("[teste] pedido anônimo", "mural", true);
  const privado = await criar("[teste] pedido só para a intercessão", "intercessao", false);
  const criados = [comNome, anonimo, privado];

  try {
    // ── B, membro comum ──
    const { data: muralB } = await sb.rpc("prayer_wall", { p_org: org });
    const vB = (muralB ?? []) as Linha[];
    const idsB = new Set(vB.map((r) => r.id));
    confere(idsB.has(comNome) && idsB.has(anonimo), "B vê os dois pedidos do mural");
    confere(!idsB.has(privado), "B não vê o pedido só da intercessão");
    confere(vB.find((r) => r.id === anonimo)?.author === null, "anônimo: B não recebe o nome");
    confere(!!vB.find((r) => r.id === comNome)?.author, "com nome: B recebe o nome");
    confere(vB.every((r) => !("member_id" in r)), "mural não devolve member_id");
    confere(vB.filter((r) => !r.is_mine).every((r) => r.prayed_count === null), "B não vê contagem de orei dos outros");
    const { data: diretoB } = await sb.from("prayer_requests").select("id,member_id").in("id", criados);
    confere((diretoB ?? []).length === 0, "B não lê a tabela direto");
    const { error: insB } = await sb.from("prayer_requests").insert({ organization_id: org, church_id: (await sm.from("churches").select("id").limit(1).single()).data!.id, body: "x" });
    confere(!!insB, "B não insere direto na tabela");
    const { data: updB } = await sb.from("prayer_requests").update({ moderation: "oculto" }).eq("id", comNome).select("id");
    confere((updB ?? []).length === 0, "B não modera direto");
    const { data: orou } = await sb.rpc("prayer_pray", { p_id: anonimo });
    confere(orou === true, "B ora pelo anônimo");
    const { data: orouPriv } = await sb.rpc("prayer_pray", { p_id: privado });
    confere(orouPriv === false, "B não consegue orar (marcar) no privado");
    const { error: insPrayed } = await sb.from("prayer_prayed").insert({ prayer_id: comNome, member_id: "00000000-0000-0000-0000-000000000000", organization_id: org });
    confere(!!insPrayed, "B não grava orei direto na tabela");
    const { data: respB } = await sb.rpc("prayer_answer", { p_id: comNome, p_answered: true, p_testimony: "x" });
    confere(respB === false, "B não marca como respondido o pedido de A");
    const { data: tirarB } = await sb.rpc("prayer_withdraw", { p_id: comNome });
    confere(tirarB === false, "B não tira do mural o pedido de A");
    const { data: listaB } = await sb.rpc("prayer_admin_list", { p_org: org });
    confere((listaB ?? []).length === 0, "B não usa a lista do painel");

    // ── A, quem pediu ──
    const { data: muralA } = await sa.rpc("prayer_wall", { p_org: org });
    const vA = (muralA ?? []) as Linha[];
    confere(criados.every((id) => vA.some((r) => r.id === id && r.is_mine)), "A vê os três pedidos como seus");
    confere(vA.find((r) => r.id === anonimo)?.prayed_count === 1, "A vê que 1 pessoa orou");
    const { data: resp } = await sa.rpc("prayer_answer", { p_id: comNome, p_answered: true, p_testimony: "Deus respondeu." });
    confere(resp === true, "A marca como respondido com testemunho");

    // ── C, líder de outro time ──
    const { data: diretoC } = await sc.from("prayer_requests").select("id").in("id", criados);
    confere((diretoC ?? []).length === 0, "líder de outro time não lê a tabela");
    const { data: listaC } = await sc.rpc("prayer_admin_list", { p_org: org });
    confere((listaC ?? []).length === 0, "líder de outro time não usa a lista do painel");
    const { data: muralC } = await sc.rpc("prayer_wall", { p_org: org });
    confere(((muralC ?? []) as Linha[]).find((r) => r.id === anonimo)?.author === null, "líder de outro time não vê o nome do anônimo");

    // ── M, quem cuida ──
    const { data: listaM } = await sm.rpc("prayer_admin_list", { p_org: org });
    const lM = (listaM ?? []) as Linha[];
    confere(criados.every((id) => lM.some((r) => r.id === id)), "master vê os três, inclusive o privado");
    confere(!!lM.find((r) => r.id === anonimo)?.author, "master vê o nome do anônimo");
    confere(lM.find((r) => r.id === comNome)?.testimony === "Deus respondeu.", "master vê o testemunho");
    const { data: mod } = await sm.rpc("prayer_moderate", { p_id: comNome, p_state: "oculto" });
    confere(mod === true, "master oculta um pedido");
    const { data: muralB2 } = await sb.rpc("prayer_wall", { p_org: org });
    confere(!((muralB2 ?? []) as Linha[]).some((r) => r.id === comNome), "oculto sai do mural de B");
    const { data: muralA2 } = await sa.rpc("prayer_wall", { p_org: org });
    confere(((muralA2 ?? []) as Linha[]).find((r) => r.id === comNome)?.hidden === true, "A ainda vê o seu, marcado como oculto");
    const { data: desfazA } = await sa.rpc("prayer_withdraw", { p_id: comNome, p_on: false });
    confere(desfazA === false, "A não desfaz a moderação da intercessão");

    // ── O, outra igreja ──
    const { data: muralO } = await so.rpc("prayer_wall", { p_org: org });
    confere((muralO ?? []).length === 0, "outra igreja não vê o mural");
    const { data: muralOo } = await so.rpc("prayer_wall", { p_org: orgO });
    confere(!((muralOo ?? []) as Linha[]).some((r) => criados.includes(r.id)), "outra igreja não vê os pedidos nem no próprio mural");
    const { data: listaO } = await so.rpc("prayer_admin_list", { p_org: org });
    confere((listaO ?? []).length === 0, "outra igreja não usa a lista do painel");
    const { data: orouO } = await so.rpc("prayer_pray", { p_id: anonimo });
    confere(orouO === false, "outra igreja não ora (marca) no pedido");
    const { data: modO } = await so.rpc("prayer_moderate", { p_id: anonimo, p_state: "arquivado" });
    confere(modO === false, "outra igreja não modera");
  } finally {
    await admin.schema("service").from("prayer_requests").delete().in("id", criados);
  }
  console.log(falhas ? `\n${falhas} falha(s)` : "\nTudo certo");
  process.exit(falhas ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
