// Uso: npx tsx scripts/check-local-rls.ts
//
// Teste de aceitação das regras de leitura do Service (RLS), no Supabase
// LOCAL populado por scripts/seed-local-service.ts. Entra com cada conta de
// teste e confere quantas linhas ela enxerga em cada tabela sensível.
// Recusa rodar fora de 127.0.0.1.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { TEST_PASSWORD } from "./seed-local-service";

/* filtro de consulta do supabase-js: o tipo real depende da tabela, aqui só
   encadeamos .eq(), então um tipo solto basta */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Filter = (q: any) => any;

const URL = "http://127.0.0.1:54321";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
if (!URL.startsWith("http://127.0.0.1")) throw new Error("check-local-rls só roda no Supabase local");

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

async function as(email: string): Promise<SupabaseClient> {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: TEST_PASSWORD });
  if (error) throw error;
  return c;
}

async function count(c: SupabaseClient, table: string, filter?: Filter): Promise<number> {
  let q = c.schema("service").from(table).select("*", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count: n, error } = await q;
  if (error) return -1;
  return n ?? 0;
}

let failures = 0;
function expect(who: string, what: string, got: number, want: number | ((n: number) => boolean)) {
  const ok = typeof want === "function" ? want(got) : got === want;
  if (!ok) failures++;
  console.log(`${ok ? "ok   " : "FALHA"} ${who.padEnd(8)} ${what.padEnd(34)} ${got}${ok ? "" : `  (esperado ${typeof want === "function" ? "outra regra" : want})`}`);
}

async function main() {
  const { data: churches } = await admin.schema("service").from("churches").select("organization_id,name");
  const orgA = churches!.find((c) => c.name === "Igreja Teste Local")!.organization_id;
  const inA: Filter = (q) => q.eq("organization_id", orgA);

  const master = await as("master@teste.local");
  const lider = await as("lider@teste.local");
  const membro = await as("membro@teste.local");
  const membro2 = await as("membro2@teste.local");
  const outra = await as("outra@teste.local");

  // liderança enxerga a igreja inteira (total real, pra não quebrar quando
  // um teste manual cadastra alguém)
  const { count: totalMembers } = await admin.schema("service").from("members").select("*", { count: "exact", head: true }).eq("organization_id", orgA);
  for (const [who, c] of [["master", master], ["lider", lider]] as const) {
    expect(who, "members (congregação)", await count(c, "members", inA), totalMembers ?? 0);
    expect(who, "people", await count(c, "people", inA), (n) => n >= 4);
    expect(who, "visitors", await count(c, "visitors", inA), 1);
  }

  // membro que serve no Louvor: só o que é dele e do time dele
  expect("membro", "members (só a própria ficha)", await count(membro, "members", inA), 1);
  expect("membro", "people (ele + colegas de time)", await count(membro, "people", inA), 2);
  expect("membro", "visitors", await count(membro, "visitors", inA), 0);
  expect("membro", "decisions", await count(membro, "decisions", inA), 0);
  expect("membro", "roster (só do time dele)", await count(membro, "roster_assignments", inA), 1);
  expect("membro", "person_ministries (time dele)", await count(membro, "person_ministries", inA), 2);
  expect("membro", "events (agenda é aberta)", await count(membro, "events", inA), 1);
  expect("membro", "ministries (lista de times é aberta)", await count(membro, "ministries", inA), 2);

  // membro sem time nenhum
  expect("membro2", "members (só a própria ficha)", await count(membro2, "members", inA), 1);
  expect("membro2", "people (só ele)", await count(membro2, "people", inA), 1);
  expect("membro2", "roster", await count(membro2, "roster_assignments", inA), 0);
  expect("membro2", "visitors", await count(membro2, "visitors", inA), 0);

  // liberação manual 'visitantes' abre a leitura de visitantes
  const { data: mateus } = await admin.schema("service").from("people").select("id").eq("email", "membro2@teste.local").single();
  await admin.schema("service").from("person_grants").insert({ organization_id: orgA, person_id: mateus!.id, grant_code: "visitantes" });
  expect("membro2", "visitors com liberação manual", await count(membro2, "visitors", inA), 1);
  expect("membro2", "members com liberação de visitantes", await count(membro2, "members", inA), 1);
  await admin.schema("service").from("person_grants").delete().eq("person_id", mateus!.id).eq("grant_code", "visitantes");
  expect("membro2", "visitors depois de tirar a liberação", await count(membro2, "visitors", inA), 0);

  // time com módulo 'visitantes' (Recepção) também abre
  const { data: recep } = await admin.schema("service").from("ministries").select("id").eq("organization_id", orgA).eq("name", "Recepção").single();
  await admin.schema("service").from("person_ministries").insert({ organization_id: orgA, ministry_id: recep!.id, person_id: mateus!.id });
  expect("membro2", "visitors estando na Recepção", await count(membro2, "visitors", inA), 1);
  await admin.schema("service").from("person_ministries").delete().eq("ministry_id", recep!.id).eq("person_id", mateus!.id);

  // escrita: membro só mexe no contato da própria ficha, nunca na jornada
  // nem na ficha de outra pessoa
  const { data: fichas } = await admin.schema("service").from("members").select("id,email,journey").eq("organization_id", orgA);
  const minha = fichas!.find((f) => f.email === "membro@teste.local")!;
  const alheia = fichas!.find((f) => f.email === "paula@teste.local")!;
  await membro.schema("service").from("members").update({ journey: [1, 1, 1, 1, 1] }).eq("id", minha.id);
  const { data: depois } = await admin.schema("service").from("members").select("journey").eq("id", minha.id).single();
  expect("membro", "não altera a própria jornada", JSON.stringify(depois!.journey) === JSON.stringify(minha.journey) ? 1 : 0, 1);
  const { data: okAlheia } = await membro.schema("service").rpc("update_my_member_contact", { p_member: alheia.id, p_phone: "(11) 90000-9999" });
  expect("membro", "não edita ficha de outra pessoa", okAlheia === false ? 1 : 0, 1);
  const { data: okMinha } = await membro.schema("service").rpc("update_my_member_contact", { p_member: minha.id, p_neighborhood: "Bairro Teste" });
  expect("membro", "edita o contato da própria ficha", okMinha === true ? 1 : 0, 1);

  // Fase 4: ações do membro passam pelos requisitos da igreja (0046)
  const svcA = admin.schema("service");
  /* começa limpo: testes manuais no navegador podem ter deixado requisitos e pedidos */
  await svcA.from("serve_requests").delete().eq("organization_id", orgA);
  await svcA.from("requirements").delete().eq("organization_id", orgA);
  const { data: chA } = await svcA.from("churches").select("id").eq("organization_id", orgA).limit(1).single();
  const { data: cursos } = await svcA.from("courses").insert([
    { organization_id: orgA, church_id: chA!.id, name: "Curso Base (teste)", kind: "trilha", prereqs: [] },
    { organization_id: orgA, church_id: chA!.id, name: "Curso Avançado (teste)", kind: "trilha", prereqs: [] },
  ]).select("id,name");
  const base = cursos!.find((c) => c.name.startsWith("Curso Base"))!.id;
  const avancado = cursos!.find((c) => c.name.startsWith("Curso Avançado"))!.id;
  const { data: louvor } = await svcA.from("ministries").select("id").eq("organization_id", orgA).eq("name", "Louvor").single();
  await svcA.from("requirements").insert([
    { organization_id: orgA, target_kind: "course", target_id: avancado, req_kind: "course", req_ref: base },
    { organization_id: orgA, target_kind: "serve", target_id: null, req_kind: "journey", req_ref: "batismo" },
    { organization_id: orgA, target_kind: "ministry", target_id: recep!.id, req_kind: "course", req_ref: base },
  ]);
  const rpc = async (c: SupabaseClient, fn: string, args: Record<string, unknown>) => (await c.schema("service").rpc(fn, args)).data as string;

  expect("membro2", "inscreve no curso sem requisito", (await rpc(membro2, "enroll_me", { p_course: base })) === "ok" ? 1 : 0, 1);
  expect("membro2", "bloqueado no curso com requisito", (await rpc(membro2, "enroll_me", { p_course: avancado })) === "faltam_requisitos" ? 1 : 0, 1);
  const { data: faltas } = await membro2.schema("service").rpc("my_missing_requirements");
  expect("membro2", "app sabe o que falta (cadeados)", (faltas as unknown[] | null)?.length ?? 0, (n) => n >= 3);
  expect("membro2", "Quero servir barrado (sem batismo)", (await rpc(membro2, "request_to_serve", { p_ministry: louvor!.id })) === "faltam_requisitos" ? 1 : 0, 1);
  expect("membro", "Quero servir: já serve no Louvor", (await rpc(membro, "request_to_serve", { p_ministry: louvor!.id })) === "ja_serve" ? 1 : 0, 1);
  expect("membro", "Recepção barrada (falta o curso)", (await rpc(membro, "request_to_serve", { p_ministry: recep!.id })) === "faltam_requisitos" ? 1 : 0, 1);

  // Maria conclui o curso base: aí pode pedir a Recepção, e o líder aprova
  const { data: maria } = await svcA.from("members").select("id").eq("email", "membro@teste.local").single();
  await svcA.from("enrollments").insert({ organization_id: orgA, course_id: base, member_id: maria!.id, status: "concluido" });
  expect("membro", "Recepção liberada após o curso", (await rpc(membro, "request_to_serve", { p_ministry: recep!.id })) === "ok" ? 1 : 0, 1);
  const { data: pedido } = await svcA.from("serve_requests").select("id").eq("member_id", maria!.id).eq("ministry_id", recep!.id).eq("status", "pendente").single();
  expect("membro", "não aprova o próprio pedido", (await rpc(membro, "review_serve_request", { p_request: pedido!.id, p_approve: true })) === "sem_permissao" ? 1 : 0, 1);
  expect("lider", "aprova o pedido", (await rpc(lider, "review_serve_request", { p_request: pedido!.id, p_approve: true })) === "ok" ? 1 : 0, 1);
  expect("membro", "agora vê visitantes (entrou na Recepção)", await count(membro, "visitors", inA), 1);

  // limpa o que o teste criou
  const { data: mariaPessoa } = await svcA.from("people").select("id").eq("email", "membro@teste.local").single();
  await svcA.from("person_ministries").delete().eq("ministry_id", recep!.id).eq("person_id", mariaPessoa!.id);
  await svcA.from("serve_requests").delete().eq("organization_id", orgA);
  await svcA.from("requirements").delete().eq("organization_id", orgA);
  await svcA.from("courses").delete().in("id", [base, avancado]);

  // toda tabela sensível precisa responder sem erro pra cada papel (pega
  // recursão de RLS, como a que houve entre chats e chat_members)
  const sensiveis = ["people", "members", "person_ministries", "roster_assignments", "event_attendance", "visitors", "visitor_notes", "decisions", "baptism_candidates", "enrollments", "lesson_attendance", "timeline_events", "journey_change_requests", "prayer_requests", "announcement_reads", "push_subscriptions", "meetings", "meeting_actions", "rehearsals", "boards", "cards", "card_comments", "chats", "chat_members", "messages", "children", "child_guardians", "kids_attendance", "kids_event_enrollments", "person_grants", "requirements", "serve_requests"];
  for (const [who, c] of [["master", master], ["lider", lider], ["membro", membro], ["membro2", membro2]] as const) {
    const quebradas: string[] = [];
    for (const t of sensiveis) if ((await count(c, t)) === -1) quebradas.push(t);
    expect(who, `lê todas as tabelas sem erro${quebradas.length ? ` (${quebradas.join(", ")})` : ""}`, quebradas.length, 0);
  }

  // outra igreja não vê nada da igreja A
  for (const t of ["members", "people", "visitors", "events", "ministries"]) {
    expect("outra", `${t} da igreja A`, await count(outra, t, inA), 0);
  }

  console.log(failures ? `\n${failures} verificação(ões) falharam.` : "\nTodas as verificações passaram.");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
