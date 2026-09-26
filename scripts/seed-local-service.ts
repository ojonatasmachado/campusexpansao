// Uso: npx tsx scripts/seed-local-service.ts
//
// Popula o Supabase LOCAL de teste (`supabase start`) com uma igreja do
// Service pronta pra testar papéis e permissões: master, líder, membros,
// times, culto, escala e visitantes. Recusa rodar fora de 127.0.0.1: nunca
// aponte pra produção.
//
// Contas de teste (só existem no banco local):
//   master@teste.local  · papel master
//   lider@teste.local   · papel lider, líder do time Louvor
//   membro@teste.local  · papel membro, serve no Louvor
//   membro2@teste.local · papel membro, não serve em time nenhum
//   outra@teste.local   · master de OUTRA igreja (testar isolamento)
// Senha de todas: TesteLocal123

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = "http://127.0.0.1:54321";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
export const TEST_PASSWORD = "TesteLocal123";

if (!URL.startsWith("http://127.0.0.1")) throw new Error("seed-local-service só roda no Supabase local");

const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

async function ensureUser(email: string, name: string): Promise<string> {
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const found = list?.users.find((u) => u.email === email);
  if (found) return found.id;
  const { data, error } = await admin.auth.admin.createUser({ email, password: TEST_PASSWORD, email_confirm: true, user_metadata: { full_name: name } });
  if (error || !data.user) throw error ?? new Error(`falhou criar ${email}`);
  return data.user.id;
}

async function signIn(email: string): Promise<SupabaseClient> {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: TEST_PASSWORD });
  if (error) throw error;
  return c;
}

async function bootstrapChurch(email: string, name: string): Promise<{ org: string; church: string }> {
  const c = await signIn(email);
  const { data: existing } = await c.schema("service").from("churches").select("id,organization_id").limit(1);
  if (existing?.length) return { org: existing[0].organization_id, church: existing[0].id };
  const { data, error } = await c.schema("core").rpc("bootstrap_church_org_v2", { p_org_name: name, p_cnpj: null, p_city: "São Paulo" });
  if (error) throw error;
  const row = (data as { organization_id: string; church_id: string }[])[0];
  return { org: row.organization_id, church: row.church_id };
}

function must<T>(r: { data: T | null; error: unknown }, what: string): T {
  if (r.error || r.data === null) throw new Error(`${what}: ${JSON.stringify(r.error)}`);
  return r.data;
}

async function main() {
  const masterId = await ensureUser("master@teste.local", "Marta Master");
  const liderId = await ensureUser("lider@teste.local", "Lucas Líder");
  const membroId = await ensureUser("membro@teste.local", "Maria Membro");
  const membro2Id = await ensureUser("membro2@teste.local", "Mateus Membro");
  await ensureUser("outra@teste.local", "Otávio Outra");

  const { org, church } = await bootstrapChurch("master@teste.local", "Igreja Teste Local");
  await bootstrapChurch("outra@teste.local", "Outra Igreja Local");

  const svc = admin.schema("service");
  const already = await svc.from("ministries").select("id").eq("organization_id", org);
  if (already.data?.length) {
    console.log("Dados de teste já existem. Para recomeçar: supabase db reset && npx tsx scripts/seed-local-service.ts");
    return;
  }

  const people = must(await svc.from("people").insert([
    { organization_id: org, church_id: church, user_id: liderId, name: "Lucas Líder", email: "lider@teste.local", phone: "(11) 90000-0001" },
    { organization_id: org, church_id: church, user_id: membroId, name: "Maria Membro", email: "membro@teste.local", phone: "(11) 90000-0002" },
    { organization_id: org, church_id: church, user_id: membro2Id, name: "Mateus Membro", email: "membro2@teste.local", phone: "(11) 90000-0003" },
    { organization_id: org, church_id: church, name: "Vera Voluntária (sem login)", phone: "(11) 90000-0004" },
  ]).select("id,name"), "people");
  const pid = (n: string) => people.find((p) => p.name.startsWith(n))!.id;

  must(await svc.from("members").insert([
    { organization_id: org, church_id: church, volunteer_id: pid("Lucas"), name: "Lucas Líder", email: "lider@teste.local", journey: [1, 1, 1, 1, 1] },
    { organization_id: org, church_id: church, volunteer_id: pid("Maria"), name: "Maria Membro", email: "membro@teste.local", journey: [1, 1, 0, 0, 1] },
    { organization_id: org, church_id: church, volunteer_id: pid("Mateus"), name: "Mateus Membro", email: "membro2@teste.local", journey: [1, 0, 0, 0, 0] },
    { organization_id: org, church_id: church, name: "Paula Privada", email: "paula@teste.local", phone: "(11) 95555-5555", journey: [1, 0, 0, 0, 0] },
  ]).select(), "seed");

  must(await admin.schema("core").from("memberships").upsert([
    { user_id: liderId, organization_id: org, role: "lider", status: "active" },
    { user_id: membroId, organization_id: org, role: "membro", status: "active" },
    { user_id: membro2Id, organization_id: org, role: "membro", status: "active" },
  ], { onConflict: "user_id,organization_id" }).select(), "seed");

  const mins = must(await svc.from("ministries").insert([
    { organization_id: org, church_id: church, name: "Louvor", icon: "louvor", app_modules: [] },
    { organization_id: org, church_id: church, name: "Recepção", icon: "recepcao", app_modules: ["visitantes"] },
  ]).select("id,name"), "ministries");
  const louvor = mins.find((m) => m.name === "Louvor")!.id;
  const recep = mins.find((m) => m.name === "Recepção")!.id;

  const pos = must(await svc.from("ministry_positions").insert([
    { organization_id: org, ministry_id: louvor, name: "Vocal", need_count: 2 },
    { organization_id: org, ministry_id: recep, name: "Recepcionista", need_count: 2 },
  ]).select("id,ministry_id"), "positions");

  must(await svc.from("person_ministries").insert([
    { organization_id: org, ministry_id: louvor, person_id: pid("Lucas"), is_leader: true },
    { organization_id: org, ministry_id: louvor, person_id: pid("Maria"), is_leader: false },
    { organization_id: org, ministry_id: recep, person_id: pid("Vera"), is_leader: false },
  ]).select(), "seed");

  const ev = must<{ id: string }>(await svc.from("events").insert({
    organization_id: org, church_id: church, name: "Culto de domingo", kind: "Culto", event_date: new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10), time: "19:00",
  }).select("id").single(), "event");

  must(await svc.from("roster_assignments").insert([
    { organization_id: org, event_id: ev.id, position_id: pos.find((p) => p.ministry_id === louvor)!.id, person_id: pid("Maria"), status: "ok" },
    { organization_id: org, event_id: ev.id, position_id: pos.find((p) => p.ministry_id === recep)!.id, person_id: pid("Vera"), status: "wait" },
  ]).select(), "seed");

  must(await svc.from("visitors").insert([
    { organization_id: org, church_id: church, name: "Victor Visitante", phone: "(11) 97777-7777", stage: "novo" },
  ]).select(), "seed");

  console.log(`Pronto. Igreja Teste Local (org ${org}). Contas em scripts/seed-local-service.ts, senha ${TEST_PASSWORD}.`);
}

if (process.argv[1]?.endsWith("seed-local-service.ts")) main().catch((e) => {
  console.error(e);
  process.exit(1);
});
