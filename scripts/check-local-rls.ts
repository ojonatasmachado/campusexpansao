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

  // liderança enxerga a igreja inteira
  for (const [who, c] of [["master", master], ["lider", lider]] as const) {
    expect(who, "members (congregação)", await count(c, "members", inA), 4);
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
