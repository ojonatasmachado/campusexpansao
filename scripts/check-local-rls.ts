// Uso: npx tsx scripts/check-local-rls.ts
//
// Teste de aceitação das regras de leitura do Service (RLS), no Supabase
// descartável criado automaticamente com as migrações atuais e fixtures canônicas.
// Nunca usa a instância compartilhada em 54321. O finally remove o projeto e os volumes.
// --provar-limpeza provoca uma falha depois do seed para verificar o descarte.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";

const TEST_PASSWORD = "TesteLocal123";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Filter = (q: any) => any;
export type DisposableSupabase = { url: string; anonKey: string; serviceRoleKey: string; projectId: string; dir: string };

function executar(cmd: string, args: string[], cwd: string, input?: string) {
  const r = spawnSync(cmd, args, { cwd, input, encoding: "utf8", timeout: 600_000, maxBuffer: 16 * 1024 * 1024 });
  if (r.status !== 0) {
    const detalhe = (r.stderr || r.error?.message || "sem detalhe").replace(/eyJ[\w.-]+/g, "[token omitido]").slice(-3000);
    throw new Error(`${cmd} falhou (${r.status}): ${detalhe}`);
  }
  return r.stdout;
}

/** Não aceita URL externa nem a instância compartilhada. Cria e remove seu próprio projeto. */
export async function withDisposableSupabase<T>(run: (sandbox: DisposableSupabase) => Promise<T>): Promise<T> {
  const raiz = resolve(__dirname, "..");
  const dir = mkdtempSync(join(tmpdir(), "cex-rls-"));
  const projectId = `cex-rls-${randomUUID().replaceAll("-", "").slice(0, 12)}`;
  const pasta = join(dir, "supabase");
  mkdirSync(pasta);
  let tentouIniciar = false;
  try {
    let config = readFileSync(join(raiz, "supabase/config.toml"), "utf8");
    if (!/^project_id\s*=/m.test(config)) throw new Error("Configuração sem project_id; ambiente não iniciado.");
    config = config.replace(/^project_id\s*=.*$/m, `project_id = "${projectId}"`);
    let proximaPorta = 58000 + Math.floor(Math.random() * 30) * 100;
    const portas = new Map<string, number>();
    config = config.replace(/^(\s*(?:\w*_)?port\s*=\s*)(\d+)/gm, (_, prefix: string, original: string) => {
      if (!portas.has(original)) portas.set(original, proximaPorta++);
      return `${prefix}${portas.get(original)}`;
    });
    for (const section of ["studio", "inbucket", "realtime", "analytics", "edge_runtime", "storage.vector", "storage.analytics", "storage.s3_protocol"]) {
      const start = config.indexOf(`[${section}]`);
      if (start < 0) continue;
      const next = config.indexOf("\n[", start + 1), end = next < 0 ? config.length : next;
      config = config.slice(0, start) + config.slice(start, end).replace(/^enabled\s*=\s*true/m, "enabled = false") + config.slice(end);
    }
    config = config.replace(/(\[db.seed\][\s\S]*?enabled\s*=\s*)true/, "$1false");
    writeFileSync(join(pasta, "config.toml"), config);
    mkdirSync(join(pasta, "migrations"));
    // A API precisa dos schemas vazios antes de subir. As tabelas vêm depois pelo psql.
    writeFileSync(join(pasta, "migrations/00000000000000_preparar.sql"), "create schema if not exists core; create schema if not exists service; create schema if not exists cex; create schema if not exists billing; create schema if not exists audit;\n");
    symlinkSync(join(raiz, "node_modules"), join(dir, "node_modules"), "dir");
    console.log(`Criando banco descartável: ${projectId}`);
    tentouIniciar = true;
    executar("supabase", ["start", "--workdir", dir, "--exclude", "studio,imgproxy,edge-runtime,logflare,vector,realtime,mailpit,postgres-meta", "--ignore-health-check", "--yes"], raiz);
    // O prazo curto do CLI oscila sob carga; só prossegue depois de todos os serviços necessários ficarem saudáveis.
    const containers = ["db", "auth", "rest", "kong", "storage"].map((name) => `supabase_${name}_${projectId}`);
    let saudavel = false;
    const limite = Date.now() + 120_000;
    while (Date.now() < limite) {
      const estados = executar("docker", ["inspect", "--format", "{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}", ...containers], raiz).trim().split("\n");
      if (estados.length === containers.length && estados.every((status) => status === "healthy" || status === "running")) { saudavel = true; break; }
      await new Promise((r) => setTimeout(r, 500));
    }
    if (!saudavel) throw new Error("Serviços do banco descartável não ficaram saudáveis; nenhum teste executado.");
    const state = JSON.parse(executar("supabase", ["status", "--workdir", dir, "-o", "json"], raiz));
    const url = new globalThis.URL(state.API_URL);
    if (url.hostname !== "127.0.0.1" || url.protocol !== "http:" || url.port === "54321") throw new Error("Instância não isolada; nenhum teste executado.");
    if (!state.ANON_KEY || !state.SERVICE_ROLE_KEY) throw new Error("Chaves da instância descartável ausentes.");
    const migrationsDir = join(raiz, "supabase/migrations");
    const sql = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort().map((f) => readFileSync(join(migrationsDir, f), "utf8")).join("\n\n") + "\nNOTIFY pgrst, 'reload schema';\n";
    executar("docker", ["exec", "-i", `supabase_db_${projectId}`, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"], raiz, sql);
    console.log("Migrações aplicadas no banco descartável.");
    let pronta = false;
    for (let i = 0; i < 40; i++) {
      const resposta = await fetch(`${state.API_URL}/rest/v1/churches?select=id&limit=0`, { headers: { apikey: state.SERVICE_ROLE_KEY, Authorization: `Bearer ${state.SERVICE_ROLE_KEY}`, "Accept-Profile": "service" } });
      if (resposta.ok) { pronta = true; break; }
      await new Promise((r) => setTimeout(r, 500));
    }
    if (!pronta) throw new Error("API não recarregou o schema service; nenhum teste executado.");
    // Reutiliza as fixtures canônicas, alterando só a conexão na cópia temporária.
    let seed = readFileSync(join(raiz, "scripts/seed-local-service.ts"), "utf8");
    for (const [name, value] of [["URL", state.API_URL], ["ANON", state.ANON_KEY], ["SERVICE", state.SERVICE_ROLE_KEY]] as [string, string][]) {
      let encontradas = 0;
      seed = seed.replace(new RegExp(`const ${name} = "[^"]+";`, "g"), () => { encontradas++; return `const ${name} = ${JSON.stringify(value)};`; });
      if (encontradas !== 1) throw new Error(`Fixture mudou o contrato de conexão (${name}); seed não executado.`);
    }
    if (seed.includes("http://127.0.0.1:54321")) throw new Error("Fixture ainda aponta para a instância compartilhada; seed não executado.");
    const seedPath = join(dir, "seed-local-service.ts");
    writeFileSync(seedPath, seed, { mode: 0o600 });
    executar(process.execPath, [...process.execArgv, seedPath], raiz);
    return await run({ url: state.API_URL, anonKey: state.ANON_KEY, serviceRoleKey: state.SERVICE_ROLE_KEY, projectId, dir });
  } finally {
    try {
      if (tentouIniciar) executar("supabase", ["stop", "--project-id", projectId, "--no-backup", "--yes"], raiz);
      console.log(`Banco descartado: ${projectId}`);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }
}

let URL: string, ANON: string;
let admin: SupabaseClient;

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
  /* O banco inteiro nasceu para esta execução; não limpar tabelas compartilhadas. */
  const { data: chA } = await svcA.from("churches").select("id").eq("organization_id", orgA).limit(1).single();
  const { data: cursos } = await svcA.from("courses").insert([
    { organization_id: orgA, church_id: chA!.id, name: "Curso Base (teste)", kind: "trilha" },
    { organization_id: orgA, church_id: chA!.id, name: "Curso Avançado (teste)", kind: "trilha" },
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

  expect("membro2", "Quero servir: time fechado", (await rpc(membro2, "request_to_serve", { p_ministry: louvor!.id })) === "time_fechado" ? 1 : 0, 1);
  const abertura = await svcA.from("ministries").update({ profile: { recebendoVoluntarios: true } }).in("id", [louvor!.id, recep!.id]);
  if (abertura.error) throw abertura.error;
  expect("membro2", "time aberto sem líder no app", (await rpc(membro2, "request_to_serve", { p_ministry: recep!.id })) === "sem_lider_no_app" ? 1 : 0, 1);
  const lucas = await svcA.from("people").select("id").eq("email", "lider@teste.local").single();
  if (lucas.error || !lucas.data) throw new Error("Fixture do líder ausente");
  const liderRecepcao = await svcA.from("person_ministries").insert({ organization_id: orgA, ministry_id: recep!.id, person_id: lucas.data.id, is_leader: true });
  if (liderRecepcao.error) throw liderRecepcao.error;

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
  if (failures) throw new Error(`${failures} verificações falharam`);
}

if (process.argv[1]?.endsWith("check-local-rls.ts")) {
  withDisposableSupabase(async (sandbox) => {
    if (process.argv.includes("--provar-limpeza")) throw new Error("Falha intencional para verificar descarte no finally");
    URL = sandbox.url; ANON = sandbox.anonKey;
    admin = createClient(URL, sandbox.serviceRoleKey, { auth: { persistSession: false } });
    await main();
  }).catch((e) => { console.error(e.message); process.exitCode = 1; });
}
