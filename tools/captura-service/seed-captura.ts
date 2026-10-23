// Seed aditivo de captura local. Sem reset ou restauração de dados de outras frentes.
import { TERMO_MAPA_VERSAO } from "../../app/service/lib/termo-mapa";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const URL = process.env.CAPTURA_SUPABASE_URL || "http://127.0.0.1:54321";
const ANON = process.env.CAPTURA_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE = process.env.CAPTURA_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const TEST_PASSWORD = "TesteLocal123";
const TODAY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

const destino = new globalThis.URL(URL);
if (destino.protocol !== "http:" || destino.hostname !== "127.0.0.1") throw new Error("seed-captura só roda no Supabase local");

const DIR = dirname(fileURLToPath(import.meta.url));
const STATE_DIR = process.env.CAPTURA_STATE_DIR || DIR;
mkdirSync(STATE_DIR, { recursive: true });
const STATE_FILE = join(STATE_DIR, "seed-captura-estado.json");
const SKIP_FILE = join(STATE_DIR, "seed-captura-pulados.md");

const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
type Row = Record<string, unknown>;
type State = { snapshot?: Record<string, Row[]>; snapshotSkipped?: string[]; authUsersCreated?: string[]; seededAt?: string };

const loadState = (): State => (existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, "utf8")) : {});
const saveState = (s: State) => writeFileSync(STATE_FILE, JSON.stringify(s, null, 1));

const skipped: string[] = [];
const skip = (what: string, why: unknown) => {
  const msg = typeof why === "string" ? why : JSON.stringify(why);
  skipped.push(`- **${what}**: ${msg}`);
  console.log(`  pulado: ${what} (${msg.slice(0, 120)})`);
};
async function step(what: string, fn: () => Promise<void>) {
  try { await fn(); } catch (e) { skip(what, (e as Error).message ?? String(e)); }
}

// ── datas e ids ──────────────────────────────────────────────────────────────
function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const weekdayOf = (iso: string) => WEEKDAY_SHORT[new Date(`${iso}T12:00:00Z`).getUTCDay()];
const stamp = (days: number, hour: number, min = 0) =>
  `${addDays(TODAY, days)}T${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}:00-03:00`;

const T: Record<string, number> = {};
let tcount = 0;
function uid(table: string, n: number): string {
  if (!(table in T)) T[table] = ++tcount;
  return `ca9e${T[table].toString(16).padStart(2, "0")}00-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

// ── auth e igreja (mesmo padrão do seed original) ────────────────────────────
async function ensureUser(email: string, name: string): Promise<{ id: string; created: boolean }> {
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const found = list?.users.find((u) => u.email === email);
  if (found) return { id: found.id, created: false };
  const { data, error } = await admin.auth.admin.createUser({ email, password: TEST_PASSWORD, email_confirm: true, user_metadata: { full_name: name } });
  if (error || !data.user) throw error ?? new Error(`falhou criar ${email}`);
  return { id: data.user.id, created: true };
}

async function signIn(email: string): Promise<SupabaseClient> {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: TEST_PASSWORD });
  if (error) throw error;
  return c;
}

async function churchOf(email: string): Promise<{ org: string; church: string }> {
  const c = await signIn(email);
  const { data } = await c.schema("service").from("churches").select("id,organization_id").limit(1);
  if (!data?.length) throw new Error("Igreja Teste Local não existe: rode antes npx tsx scripts/seed-local-service.ts");
  return { org: data[0].organization_id, church: data[0].id };
}

// ── snapshot / restauração ───────────────────────────────────────────────────
// ordem: pais antes dos filhos (a restauração apaga na ordem inversa)
const SNAP: { s: "core" | "service"; t: string; keys?: string[] }[] = [
  { s: "core", t: "memberships" },
  ...["churches", "church_identity", "people", "members", "ministries", "ministry_positions", "person_ministries", "rooms", "events",
    "roster_assignments", "event_attendance", "event_schedule_items", "visitors", "visitor_notes", "decisions", "kids_classes", "children",
    "child_guardians", "kids_events", "kids_sessions", "kids_attendance", "kids_event_enrollments", "announcements", "announcement_reads",
    "announcement_responses", "wall_posts", "chats", "chat_members", "messages", "prayer_requests", "courses", "course_modules",
    "course_lessons", "enrollments", "lesson_attendance", "fellowship_groups", "reservations", "meetings", "meeting_actions", "rehearsals",
    "setlist_songs", "pesquisas", "pesquisas_perguntas", "pesquisas_respostas", "pesquisas_respostas_perguntas", "baptism_classes",
    "baptism_candidates", "serve_requests", "journey_change_requests", "person_grants", "member_invites", "requirements", "boards",
    "cards", "card_comments", "cycles", "history_entries", "timeline_events", "bible_marks", "tags", "enquetes", "perguntas", "respostas",
    "respostas_perguntas", "enquete_visto", "push_subscriptions", "ministerial_titles", "church_links", "church_page_posts"].map((t) => ({ s: "service" as const, t })),
];
const KEYS: Record<string, string[]> = {
  church_identity: ["church_id"],
  person_ministries: ["person_id", "ministry_id"],
  chat_members: ["chat_id", "member_id"],
};
const keyOf = (t: string, r: Row) => (KEYS[t] ?? ["id"]).map((k) => String(r[k])).join("|");
const orgClient = (s: string) => admin.schema(s as "service");

async function fetchAll(s: string, t: string, org: string): Promise<Row[]> {
  const out: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await orgClient(s).from(t).select("*").eq("organization_id", org).range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as Row[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

async function takeSnapshot(org: string): Promise<State> {
  const snapshot: Record<string, Row[]> = {};
  const snapshotSkipped: string[] = [];
  for (const { s, t } of SNAP) {
    try {
      const rows = await fetchAll(s, t, org);
      if (rows.length && !(KEYS[t] ?? ["id"]).every((k) => k in rows[0])) { snapshotSkipped.push(`${s}.${t}`); continue; }
      snapshot[`${s}.${t}`] = rows;
    } catch { snapshotSkipped.push(`${s}.${t}`); }
  }
  return { snapshot, snapshotSkipped };
}

async function status(org: string) {
  const state = loadState();
  if (!state.snapshot) { console.log("Seed de captura: NÃO aplicado (sem snapshot)."); return; }
  console.log(`Seed de captura aplicado em ${state.seededAt ?? "?"}. Snapshot: ${Object.keys(state.snapshot).length} tabelas.`);
  const rows: string[] = [];
  for (const { s, t } of SNAP) {
    const snap = state.snapshot[`${s}.${t}`];
    if (!snap) continue;
    let cur: Row[];
    try { cur = await fetchAll(s, t, org); } catch { continue; }
    const known = new Set(snap.map((r) => keyOf(t, r)));
    const added = cur.filter((r) => !known.has(keyOf(t, r))).length;
    if (added || cur.length !== snap.length) rows.push(`  ${s}.${t}: ${snap.length} -> ${cur.length} (+${added} novas)`);
  }
  console.log(rows.length ? "Diferenças em relação ao estado inicial:\n" + rows.join("\n") : "Igual ao estado inicial.");
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  console.log(`novo@teste.local: ${list?.users.some((u) => u.email === "novo@teste.local") ? "existe" : "não existe"}`);
  if (existsSync(SKIP_FILE)) console.log("Itens pulados: ver tools/captura-service/seed-captura-pulados.md");
}

// ── dados ────────────────────────────────────────────────────────────────────
const NOMES: [string, string][] = [
  ["Ana Beatriz Souza", "1992-10-06"], ["Bruno Cavalcanti", "1988-10-09"], ["Cláudia Fonseca", "1954-01-22"], ["Davi Nascimento", "2003-03-14"],
  ["Eduarda Müller", "1997-05-30"], ["Fábio Albuquerque", "1981-07-08"], ["Gabriela Tavares", "1999-11-19"], ["Heitor Magalhães", "2006-02-03"],
  ["Isabela Conceição", "1990-08-25"], ["João Pedro Araújo", "1985-12-02"], ["Kátia Rodrigues", "1958-04-17"], ["Leandro Siqueira", "1976-09-21"],
  ["Márcia Pinheiro", "1962-06-11"], ["Natália Gonçalves", "2001-01-09"], ["Otávio Brandão", "1994-03-27"], ["Patrícia Vasconcelos", "1983-12-24"],
  ["Rafael Menezes", "1995-07-15"], ["Sônia Albuquerque", "1949-02-28"], ["Tiago Carvalho", "1987-05-05"], ["Úrsula Teixeira", "1998-09-02"],
  ["Vinícius Moreira", "2004-11-11"], ["Yasmin Barbosa", "1991-06-29"], ["Zélia Rocha", "1969-08-13"], ["Renata Ferreira", "1979-04-04"],
];
const SEM_TEL = new Set([3, 8, 13, 17, 21]);
const SEM_EMAIL = new Set([5, 11, 19]);
const slug = (n: string) => n.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "");
const BAIRROS = ["Vila Nova", "Jardim das Flores", "Centro", "Bela Vista", "Santa Cecília", "Vila Mariana"];
const RENATA = 23; // líder da Recepção

async function seed(org: string, church: string) {
  const svc = admin.schema("service");
  const up = async (t: string, rows: Row[], onConflict = "id") => {
    if (!rows.length) return;
    const { error } = await svc.from(t).upsert(rows, { onConflict });
    if (error) throw new Error(`${t}: ${error.message}`);
  };
  const base = { organization_id: org };
  const baseC = { organization_id: org, church_id: church };

  // contas
  const novo = await ensureUser("novo@teste.local", "Nina Novata");
  if (!novo.created) await admin.auth.admin.updateUserById(novo.id, { password: TEST_PASSWORD, email_confirm: true });
  const state = loadState();
  if (novo.created) state.authUsersCreated = [...new Set([...(state.authUsersCreated ?? []), "novo@teste.local"])];
  saveState(state);

  // pessoas existentes
  const { data: pplAll } = await svc.from("people").select("id,name,email,user_id").eq("organization_id", org);
  const ppl = (pplAll ?? []).filter((p) => !p.id.startsWith("ca9e"));
  const find = (frag: string) => (ppl ?? []).find((p) => (p.email ?? "").includes(frag) || p.name.startsWith(frag));
  const masterUser = await ensureUser("master@teste.local", "Marta Master");
  const lucas = find("lider@")!, maria = find("membro@")!, mateus = find("membro2@")!, vera = find("Vera")!, marta = find("master@") || ppl.find((p) => p.user_id === masterUser.id);
  if (marta) { marta.name = "Marta Master"; marta.email = "master@teste.local"; await svc.from("people").update({ name: marta.name, email: marta.email }).eq("id", marta.id); }
  if (!lucas || !maria || !mateus || !vera || !marta) throw new Error("Pessoas do seed original não encontradas");
  const { data: mem } = await svc.from("members").select("id,volunteer_id,email").eq("organization_id", org);
  const memberOf = (personId: string) => mem?.find((m) => m.volunteer_id === personId)?.id as string;
  const mariaM = memberOf(maria.id), lucasM = memberOf(lucas.id), mateusM = memberOf(mateus.id);

  // fichas completas para quem já existia (senão o app deles abriria no primeiro acesso)
  const aceite = { map_consent_at: new Date().toISOString(), map_consent_terms: TERMO_MAPA_VERSAO, map_consent_source: "app" };
  const ficha = { postal_code: "01310100", street: "Avenida Paulista", city: "São Paulo", state: "SP", neighborhood: "Bela Vista" };
  for (const [p, birth, phone] of [[maria, null, "(11) 90000-0002"], [mateus, "1996-09-18", "(11) 90000-0003"], [lucas, "1984-02-20", "(11) 90000-0001"], [marta, "1980-06-15", "(11) 90000-0100"]] as const) {
    if (!p) continue;
    let m = mem?.find((x) => x.volunteer_id === p.id || (p.email && x.email === p.email));
    if (!m) {
      const criada = await svc.from("members").insert({ ...baseC, volunteer_id: p.id, name: p.name, email: p.email }).select("id,volunteer_id,email").single();
      if (criada.error || !criada.data) throw new Error("Não foi possível criar a ficha recorrente da captura");
      m = criada.data;
    }
    const { data: cur } = await svc.from("members").select("birth,phone").eq("id", m.id).single();
    await svc.from("members").update({ ...ficha, ...aceite, name: p.name, volunteer_id: p.id, birth: cur?.birth || birth, phone: cur?.phone || phone }).eq("id", m.id);
  }

  // 24 pessoas (+ ficha de membro cada)
  const P = NOMES.map((_, i) => uid("people", i + 1));
  const M = NOMES.map((_, i) => uid("members", i + 1));
  await up("people", NOMES.map(([name], i) => ({
    id: P[i], ...baseC, user_id: null, name,
    phone: SEM_TEL.has(i) ? null : `(11) 9${8000 + i * 37}-${String(1000 + i * 91).slice(-4)}`,
    email: SEM_EMAIL.has(i) ? null : `${slug(name)}@captura.teste`,
    since_year: String(2012 + (i % 13)), status: i === 7 ? "ferias" : i === 14 ? "pausa" : "ativo", engagement: 40 + ((i * 17) % 55), tags: ["captura"],
  })));
  await up("members", NOMES.map(([name, birth], i) => ({
    id: M[i], ...baseC, ...aceite, volunteer_id: P[i], group_id: null, title_id: null, name,
    phone: SEM_TEL.has(i) ? null : `(11) 9${8000 + i * 37}-${String(1000 + i * 91).slice(-4)}`,
    email: SEM_EMAIL.has(i) ? null : `${slug(name)}@captura.teste`,
    birth, since_year: String(2012 + (i % 13)), situation: "membro", first_contact: addDays(TODAY, -400 - i * 23),
    neighborhood: BAIRROS[i % BAIRROS.length], family: null,
    journey: [1, i % 2, i % 3 === 0 ? 1 : 0, i % 4 === 0 ? 1 : 0, i % 5 === 0 ? 1 : 0],
    postal_code: "01310100", street: "Rua das Palmeiras", city: "São Paulo", state: "SP",
  })));

  // conta nova: ficha incompleta (sem telefone, aniversário e CEP => app abre no primeiro acesso)
  const novoP = uid("people", 100), novoM = uid("members", 100);
  await up("people", [{ id: novoP, ...baseC, user_id: novo.id, name: "Nina Novata", phone: null, email: "novo@teste.local", since_year: null, status: "ativo", engagement: 0, tags: ["captura"] }]);
  await up("members", [{
    id: novoM, ...baseC, volunteer_id: novoP, group_id: null, title_id: null, name: "Nina Novata", phone: null, email: "novo@teste.local",
    birth: null, since_year: null, situation: "membro", first_contact: null, neighborhood: null, family: null, journey: [0, 0, 0, 0, 0],
    postal_code: null, street: null, city: null, state: null,
  }]);
  const { error: msErr } = await admin.schema("core").from("memberships").upsert(
    [{ user_id: novo.id, organization_id: org, role: "membro", status: "active" }], { onConflict: "user_id,organization_id" });
  if (msErr) throw new Error(`memberships: ${msErr.message}`);

  // times
  const { data: mins } = await svc.from("ministries").select("id,name").eq("organization_id", org);
  const louvor = mins!.find((m) => m.name === "Louvor")!.id, recep = mins!.find((m) => m.name === "Recepção")!.id;
  const kids = uid("ministries", 1), midia = uid("ministries", 2);
  await up("ministries", [
    { id: kids, ...baseC, name: "Kids", icon: "kids", description: "Cuidado e ensino das crianças nos cultos", app_modules: [] },
    { id: midia, ...baseC, name: "Mídia", icon: "midia", description: "Projeção, som e transmissão", app_modules: [] },
  ]);
  await svc.from("ministries").update({ profile: { recebendoVoluntarios: true } }).eq("organization_id", org);
  const MIN: Record<string, string> = { Louvor: louvor, "Recepção": recep, Kids: kids, "Mídia": midia };
  const POS_DEF: [string, string, number][] = [
    ["Louvor", "Violão", 1], ["Louvor", "Bateria", 1], ["Louvor", "Teclado", 1],
    ["Recepção", "Porta", 2], ["Recepção", "Café", 1],
    ["Kids", "Professor", 2], ["Kids", "Auxiliar", 2],
    ["Mídia", "Projeção", 1], ["Mídia", "Som", 1], ["Mídia", "Transmissão", 1],
  ];
  await up("ministry_positions", POS_DEF.map(([m, name, need], i) => ({ id: uid("ministry_positions", i + 1), ...base, ministry_id: MIN[m], name, need_count: need, sort_order: 10 + i })));
  const { data: pos } = await svc.from("ministry_positions").select("id,ministry_id,name").eq("organization_id", org);
  const posId = (m: string, n: string) => pos!.find((p) => p.ministry_id === MIN[m] && p.name === n)!.id as string;
  // garante need_count nos cargos do seed original (Vocal 2, Recepcionista 2) sem alterar
  const TEAM: [string, string, boolean][] = [
    ["Louvor", P[0], false], ["Louvor", P[1], false], ["Louvor", P[2], false], ["Louvor", P[3], false],
    ["Recepção", P[RENATA], true], ["Recepção", P[5], false], ["Recepção", P[6], false], ["Recepção", P[7], false],
    ["Kids", P[8], true], ["Kids", P[9], false], ["Kids", P[10], false],
    ["Mídia", P[11], true], ["Mídia", P[12], false], ["Mídia", P[13], false],
  ];
  await up("person_ministries", TEAM.map(([m, p, lead]) => ({ ...base, ministry_id: MIN[m], person_id: p, is_leader: lead, functions: [] })), "person_id,ministry_id");

  // salas e espaços
  const R = { templo: uid("rooms", 1), reun: uid("rooms", 2), k1: uid("rooms", 3), k2: uid("rooms", 4), k3: uid("rooms", 5) };
  await up("rooms", [
    { id: R.templo, ...baseC, name: "Templo", capacity: 300, location: "Prédio principal", resources: ["Som", "Projetor"], allows_meetings: false },
    { id: R.reun, ...baseC, name: "Sala de Reuniões", capacity: 20, location: "Térreo", resources: ["TV"], allows_meetings: true },
    { id: R.k1, ...baseC, name: "Sala Kids Berçário", capacity: 12, location: "Térreo", resources: [], allows_meetings: false },
    { id: R.k2, ...baseC, name: "Sala Kids Maternal", capacity: 16, location: "Térreo", resources: [], allows_meetings: false },
    { id: R.k3, ...baseC, name: "Sala Kids Primários", capacity: 20, location: "1º andar", resources: [], allows_meetings: false },
  ]);

  // eventos
  const EV: [string, string, string, string, string, string | null][] = [
    ["Culto de quarta", "Culto", addDays(TODAY, -5), "20:00", "Templo", "qua"],
    ["Culto de domingo", "Culto", addDays(TODAY, -1), "19:00", "Templo", "dom_n"],
    ["Culto de quarta", "Culto", addDays(TODAY, 2), "20:00", "Templo", "qua"],
    ["Culto de domingo", "Culto", addDays(TODAY, 6), "19:00", "Templo", "dom_n"],
    ["Culto de quarta", "Culto", addDays(TODAY, 9), "20:00", "Templo", "qua"],
    ["Conferência de Jovens", "Evento", addDays(TODAY, 12), "18:00", "Templo", null],
  ];
  const encontroAgora = new Date(Date.now() + 15 * 60_000);
  EV[2][2] = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(encontroAgora);
  EV[2][3] = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(encontroAgora);
  for (const ev of EV) if (ev[1] === "Culto") ev[0] = `Culto de ${new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "UTC" }).format(new Date(`${ev[2]}T12:00:00Z`))}`;
  const E = EV.map((_, i) => uid("events", i + 1));
  await up("events", EV.map(([name, kind, date, time, loc, slot], i) => ({
    id: E[i], ...baseC, name, kind, weekday: weekdayOf(date), event_date: date, time, slot, location: loc, room_id: R.templo, ministries: [], tags: [],
  })));
  await step("reservas dos eventos", () => up("reservations", EV.map(([name, , date, time], i) => ({
    id: uid("reservations", i + 1), ...base, room_id: R.templo, title: name, kind: "Culto", reserved_date: date, start_time: time,
    end_time: `${String(Number(time.slice(0, 2)) + 2).padStart(2, "0")}:00`, source_type: "event", source_id: E[i],
  }))));

  // escalas: ok = confirmado, wait = pendente, no = recusado
  type A = [number, string, string, string, "ok" | "wait" | "no"];
  const A_: A[] = [
    [0, "Louvor", "Vocal", P[0], "ok"], [0, "Recepção", "Porta", P[5], "ok"],
    [1, "Louvor", "Vocal", lucas.id, "ok"], [1, "Louvor", "Violão", P[1], "ok"], [1, "Mídia", "Som", P[12], "ok"], [1, "Kids", "Professor", P[9], "ok"],
    [2, "Louvor", "Vocal", maria.id, "wait"], [2, "Louvor", "Violão", P[1], "ok"], [2, "Recepção", "Porta", P[6], "wait"], [2, "Mídia", "Projeção", P[13], "no"],
    [3, "Louvor", "Vocal", maria.id, "wait"], [3, "Louvor", "Vocal", P[0], "wait"], [3, "Louvor", "Bateria", P[2], "ok"], [3, "Louvor", "Teclado", P[3], "no"],
    [3, "Recepção", "Porta", P[RENATA], "ok"], [3, "Recepção", "Café", P[7], "wait"], [3, "Kids", "Professor", P[9], "ok"], [3, "Kids", "Auxiliar", P[10], "wait"],
    [3, "Mídia", "Som", P[12], "ok"],
    [4, "Louvor", "Vocal", lucas.id, "ok"], [4, "Mídia", "Transmissão", P[11], "ok"],
    [5, "Louvor", "Vocal", P[0], "wait"], [5, "Recepção", "Porta", P[5], "ok"],
  ];
  await up("roster_assignments", A_.map(([e, m, n, person, status], i) => ({
    id: uid("roster_assignments", i + 1), ...base, event_id: E[e], position_id: posId(m, n), person_id: person, status, rascunho: i === 11,
  })));

  await up("events", [{ id: uid("events", 90), ...baseC, name: "Encontro anterior da captura", kind: "Culto", event_date: addDays(TODAY, -35), time: "19:00" }]);
  await up("event_attendance", [{ id: uid("event_attendance", 90), ...base, event_id: uid("events", 90), person_id: P[17], checked_in_at: stamp(-35, 19) }]);

  // visitantes (etapas: novo, contato, integrando)
  await up("visitors", [
    { id: uid("visitors", 1), ...baseC, name: "Camila Duarte", phone: "(11) 96666-1001", stage: "novo", visited_on: addDays(TODAY, -1), responsible_id: vera.id, due: addDays(TODAY, 1), due_status: "soon", reply_status: "sem_resposta", origin: "Convite de amigo" },
    { id: uid("visitors", 2), ...baseC, name: "Rodrigo Nunes", phone: "(11) 96666-1002", stage: "contato", visited_on: addDays(TODAY, -9), responsible_id: vera.id, due: addDays(TODAY, -2), due_status: "late", reply_status: "respondeu", origin: "Redes sociais" },
    { id: uid("visitors", 3), ...baseC, name: "Luana Esteves", phone: "(11) 96666-1003", stage: "integrando", visited_on: addDays(TODAY, -30), responsible_id: P[RENATA], due: addDays(TODAY, 5), due_status: "ok", reply_status: "respondeu", origin: "Passou na frente da igreja" },
  ].map((v) => ({ ...v, member_id: null })));

  // kids: turmas + 2 filhos da Maria
  const KC = [uid("kids_classes", 1), uid("kids_classes", 2), uid("kids_classes", 3)];
  await step("turmas e crianças", async () => {
    await up("kids_classes", [
      { id: KC[0], ...baseC, name: "Berçário", min_age_months: 0, max_age_months: 23, room_id: R.k1, capacity: 12, accent: "wheat" },
      { id: KC[1], ...baseC, name: "Maternal", min_age_months: 24, max_age_months: 59, room_id: R.k2, capacity: 16, accent: "wheat" },
      { id: KC[2], ...baseC, name: "Primários", min_age_months: 60, max_age_months: 95, room_id: R.k3, capacity: 20, accent: "clay" },
    ]);
    const kid = (n: number, name: string, birth: string, cls: string, gender: string) => ({
      id: uid("children", n), ...baseC, class_id: cls, name, birth, photo_url: null, allergies: n === 1 ? "Amendoim" : null, notes: null, gender,
      emergency_contact_name: "Marcos Membro", emergency_contact_phone: "(11) 98888-0002", image_authorized: true,
      dietary_restrictions: null, health_insurance: null, medication: null,
    });
    await up("children", [kid(1, "Davi Membro", "2022-03-10", KC[1], "menino"), kid(2, "Alice Membro", "2025-01-15", KC[0], "menina")]);
    await up("child_guardians", [1, 2].map((n) => ({ id: uid("child_guardians", n), ...base, child_id: uid("children", n), guardian_person_id: maria.id, relationship: "responsavel", can_pickup: true, is_primary: true })));
  });

  // mural: 3 publicações, Maria leu só a primeira
  const AN = [1, 2, 3].map((n) => uid("announcements", n));
  await up("announcements", [
    { id: AN[0], ...baseC, title: "Novo horário do culto de quarta", audience: "Todos", body: "A partir deste mês o culto de quarta começa às 20h. Venha com a família.", author: "Liderança", when_label: "há 4 dias", kind: "aviso", created_at: stamp(-4, 10), updated_at: stamp(-4, 10) },
    { id: AN[1], ...baseC, title: "Conferência de Jovens", audience: "Todos", highlight_until: stamp(10, 23), video_url: "https://www.youtube.com/watch?v=jNQXAC9IVRw", body: "Encontro especial da igreja. Inscrições abertas na recepção.", author: "Liderança", when_label: "ontem", kind: "evento", created_at: stamp(-1, 9), updated_at: stamp(-1, 9) },
    { id: AN[2], ...baseC, title: "Campanha de alimentos", audience: "Todos", body: "Traga 1 kg de alimento não perecível até o fim do mês.", author: "Liderança", when_label: "hoje", kind: "acao", created_at: stamp(0, 8), updated_at: stamp(0, 8) },
  ]);
  await up("announcement_reads", [{ id: uid("announcement_reads", 1), ...base, announcement_id: AN[0], person_id: maria.id, read_at: stamp(-3, 20) }]);

  // conversas e oração
  const CH = [uid("chats", 1), uid("chats", 2)];
  await step("conversas", async () => {
    await up("chats", [
      { id: CH[0], ...baseC, kind: "time", ministry_id: louvor, name: "Louvor", created_at: stamp(-20, 9), updated_at: stamp(-1, 21) },
      { id: CH[1], ...baseC, kind: "dm", ministry_id: null, name: null, created_at: stamp(-6, 9), updated_at: stamp(-2, 18) },
    ]);
    await up("chat_members", [[CH[0], lucasM], [CH[0], mariaM], [CH[0], mateusM], [CH[1], lucasM], [CH[1], mariaM]].map(([c, m]) => ({ ...base, chat_id: c, member_id: m })), "chat_id,member_id");
    await up("messages", [
      { id: uid("messages", 1), ...base, chat_id: CH[0], sender_id: lucasM, body: "Pessoal, ensaio na quinta às 19h30. Quem confirma?", created_at: stamp(-3, 20, 10) },
      { id: uid("messages", 2), ...base, chat_id: CH[0], sender_id: mariaM, body: "Confirmo! Levo a letra impressa.", created_at: stamp(-3, 20, 25) },
      { id: uid("messages", 3), ...base, chat_id: CH[0], sender_id: mateusM, body: "Eu chego um pouco depois, mas chego.", created_at: stamp(-1, 21) },
      { id: uid("messages", 4), ...base, chat_id: CH[1], sender_id: lucasM, body: "Oi Maria, tudo bem? Você consegue cobrir o vocal no domingo?", created_at: stamp(-2, 17, 40) },
      { id: uid("messages", 5), ...base, chat_id: CH[1], sender_id: mariaM, body: "Consigo sim! Já confirmei na escala.", created_at: stamp(-2, 18) },
    ]);
  });
  await step("pedido de oração", () => up("prayer_requests", [{
    id: uid("prayer_requests", 1), ...baseC, member_id: mariaM, kind: "oracao", body: "Peço oração pela saúde da minha mãe e por sabedoria nas decisões da família.",
    status: "aberto", is_private: false, created_at: stamp(-2, 12), updated_at: stamp(-2, 12),
  }]));

  // curso: 4 aulas, Maria matriculada, 1 concluída
  await step("curso", async () => {
    const C = uid("courses", 1), MOD = uid("course_modules", 1);
    await up("courses", [{
      id: C, ...baseC, name: "Fundamentos da Fé", kind: "trilha", level: "Fundação", color: "wheat", category: "Discipulado", modalidade: "remoto", published: true,
      description: "Quatro aulas para quem está começando a caminhada.",
    }]);
    await up("course_modules", [{ id: MOD, ...base, course_id: C, name: "Primeiros passos", sort_order: 1 }]);
    const L = [["Quem é Jesus", "video", "12 min"], ["Lendo a Bíblia", "texto", "8 min"], ["Oração e jejum", "texto", "10 min"], ["Encontro presencial", "presencial", "90 min"]];
    await up("course_lessons", L.map(([name, kind, duration], i) => ({
      id: uid("course_lessons", i + 1), ...base, module_id: MOD, name, kind, duration, sort_order: i + 1, link: null, conteudo: kind === "texto" ? "Conteúdo de exemplo da aula." : null,
    })));
    await up("enrollments", [{ id: uid("enrollments", 1), ...base, course_id: C, member_id: mariaM, done_count: 1, status: "cursando" }]);
    await up("lesson_attendance", [{ id: uid("lesson_attendance", 1), ...base, course_id: C, lesson_id: uid("course_lessons", 1), member_id: mariaM, checked_in_at: stamp(-3, 19), via: "manual" }]);
  });

  // grupo, reunião, ensaio, reserva da reunião
  await step("grupo de comunhão", () => up("fellowship_groups", [{
    id: uid("fellowship_groups", 1), ...baseC, name: "GC Vila Nova", leader_person_id: P[RENATA], weekday: "Quinta", time: "20:00", neighborhood: "Vila Nova",
  }]));
  await step("vínculo de grupo nos membros", async () => {
    for (const i of [0, 1, 2, 3]) await svc.from("members").update({ group_id: uid("fellowship_groups", 1) }).eq("id", M[i]);
  });
  await step("reunião", async () => {
    const d = addDays(TODAY, 3);
    await up("meetings", [{
      id: uid("meetings", 1), ...baseC, title: "Reunião de liderança", meeting_date: d, time: "19:30", location: "Sala de Reuniões", author_id: lucas.id, status: "agendada",
      ministries: [], attendees: [], agenda: [{ t: "Escalas do mês" }, { t: "Conferência de Jovens" }], minutes: null,
    }]);
    await up("reservations", [{
      id: uid("reservations", 50), ...base, room_id: R.reun, title: "Reunião de liderança", kind: "Reunião", reserved_date: d, start_time: "19:30", end_time: "21:00",
      source_type: "meeting", source_id: uid("meetings", 1),
    }]);
  });
  await step("ensaio", () => up("rehearsals", [{
    id: uid("rehearsals", 1), ...baseC, ministry_id: louvor, title: "Ensaio geral do Louvor", kind: "Ensaio", rehearsal_date: addDays(TODAY, 4), time: "19:30", location: "Templo",
    room_id: R.templo, recurrence: null, audience: "Louvor", attendees: [], repertoire: [], attachments: [], notes: null,
  }]));

  // pesquisa aberta
  await step("pesquisa", async () => {
    const Q = uid("pesquisas", 1);
    await up("pesquisas", [{
      id: Q, ...base, nome: "Como foi sua semana na igreja?", status: "ativa", segmentacao_modo: "todos", segmentacao_valores: [], disparo_modo: "livre",
      ativo_como_livre: true, intervalo_dias: 30, recorrente_por_escala: false, emitida_em: stamp(-1, 9),
    }]);
    await up("pesquisas_perguntas", [
      { id: uid("pesquisas_perguntas", 1), pesquisa_id: Q, ordem: 1, tipo: "nota", texto: "Como você avalia o culto de domingo?", obrigatoria: true, escala: 5, opcoes: [] },
      { id: uid("pesquisas_perguntas", 2), pesquisa_id: Q, ordem: 2, tipo: "texto", texto: "Quer deixar uma sugestão?", obrigatoria: false, escala: 5, opcoes: [] },
    ]);
  });

  // batismo agendado
  await step("batismo", async () => {
    const B = uid("baptism_classes", 1);
    await up("baptism_classes", [{
      id: B, ...baseC, label: "Batismo de outubro", baptism_date: addDays(TODAY, 20), location: "Templo", status: "agendada", pastor: "Pr. Samuel", notes: null, open_enrollment: false, room_id: R.templo,
    }]);
    await up("baptism_candidates", [14, 15].map((i, n) => ({ id: uid("baptism_candidates", n + 1), class_id: B, ...base, member_id: M[i], decision_id: null })));
  });

  state.seededAt = `${TODAY} (rodado em ${new Date().toISOString()})`;
  saveState(state);
  console.log(`Seed de captura aplicado na Igreja Teste Local (org ${org}). Contas: master/lider/membro/membro2/novo@teste.local, senha ${TEST_PASSWORD}.`);
}

async function main() {
  const args = new Set(process.argv.slice(2));
  if (["--restaurar", "--resetar"].some((a) => args.has(a))) throw new Error("Restauração destrutiva não é suportada; use banco descartável.");
  const { org, church } = await churchOf("master@teste.local");

  if (args.has("--status")) return status(org);


  // snapshot do estado inicial, uma vez só (antes da primeira escrita)
  const state = loadState();
  if (!state.snapshot) {
    const snap = await takeSnapshot(org);
    saveState({ ...state, ...snap });
    console.log(`Snapshot inicial: ${Object.keys(snap.snapshot!).length} tabelas (${snap.snapshotSkipped!.length} sem snapshot).`);
  }
  await seed(org, church);

  const header = "# Itens pulados pelo seed de captura\n\nTabelas/colunas que não existem ou falharam (gerado por seed-captura.ts).\n\n";
  if (skipped.length) writeFileSync(SKIP_FILE, header + skipped.join("\n") + "\n");
  else writeFileSync(SKIP_FILE, header + "Nenhum item pulado na última execução.\n\nObservações fixas:\n- Não existe tabela de notificações no schema service: o sino do app é calculado de mural, escalas e pedidos. Push (push_subscriptions) não é semeado.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
