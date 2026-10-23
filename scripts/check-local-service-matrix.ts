// npx tsx scripts/check-local-service-matrix.ts
// Sessões reais, API/Storage locais e banco descartável. Nunca usa 54321.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { closeSync, mkdirSync, openSync, writeFileSync } from "node:fs";
import { createServer, type AddressInfo } from "node:net";
import { resolve, join } from "node:path";
import { withDisposableSupabase, type DisposableSupabase } from "./check-local-rls";

type Actor = { papel: string; user: string; person: string; member: string; org: string; church: string; admin: boolean; lead: boolean; team?: string; extra?: boolean; finWrite?: boolean; db: SupabaseClient; cookies: Map<string, string> };
type Row = { papel: string; caso: string; esperado: boolean; observado: boolean; passou: boolean; detalhe?: string };
const rows: Row[] = [];
const saida = resolve(process.env.MATRIZ_SAIDA || `prints/q3-matriz-${new Date().toISOString().replaceAll(":", "-")}`);
const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));
mkdirSync(saida, { recursive: true });

function must<T>(r: { data: T; error: { code?: string; message?: string } | null }, etapa: string): NonNullable<T> {
  if (r.error || r.data === null) throw new Error(`${etapa}: ${r.error?.code || "resposta ausente"}`);
  return r.data as NonNullable<T>;
}
function check(papel: string, caso: string, esperado: boolean, observado: boolean, detalhe?: string) {
  const passou = esperado === observado;
  rows.push({ papel, caso, esperado, observado, passou, ...(detalhe ? { detalhe } : {}) });
  console.log(`${passou ? "ok" : "FALHA"} ${papel}: ${caso}${detalhe ? ` (${detalhe})` : ""}`);
}

async function startApp(s: DisposableSupabase) {
  const dono = spawnSync("lsof", ["-t", resolve(".next/dev/lock")], { encoding: "utf8" });
  if (dono.status === 0 && dono.stdout.trim()) throw new Error("Outro Next usa este worktree; nenhum servidor foi iniciado.");
  const socket = createServer();
  await new Promise<void>((ok, erro) => { socket.once("error", erro); socket.listen(0, "127.0.0.1", ok); });
  const port = (socket.address() as AddressInfo).port;
  await new Promise<void>((ok, erro) => socket.close((e) => e ? erro(e) : ok()));
  const base = `http://127.0.0.1:${port}`;
  const log = openSync(join(saida, "runtime.log"), "a", 0o600);
  const app = spawn("npm", ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", String(port)], {
    detached: true, stdio: ["ignore", log, log], env: { ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: s.url, NEXT_PUBLIC_SUPABASE_ANON_KEY: s.anonKey,
      SUPABASE_URL: s.url, SUPABASE_ANON_KEY: s.anonKey, SUPABASE_SERVICE_ROLE_KEY: s.serviceRoleKey,
      NEXT_PUBLIC_SITE_URL: base, NEXT_PUBLIC_VAPID_PUBLIC_KEY: "", VAPID_PRIVATE_KEY: "", VAPID_SUBJECT: "",
    },
  });
  let erro: Error | undefined;
  app.on("error", (e) => { erro = e; });
  const stop = async () => {
    const signal = (sig: NodeJS.Signals) => { try { if (app.pid) process.kill(-app.pid, sig); } catch { /* já encerrado */ } };
    signal("SIGTERM");
    for (let i = 0; i < 30 && app.exitCode === null && app.signalCode === null; i++) await pausa(100);
    if (app.exitCode === null && app.signalCode === null) signal("SIGKILL");
    closeSync(log);
  };
  try {
    for (let i = 0; i < 120; i++) {
      if (erro || app.exitCode !== null) throw erro || new Error("Next encerrou antes dos testes HTTP");
      try { if ((await fetch(`${base}/service/login`, { signal: AbortSignal.timeout(2000) })).ok) return { base, stop }; } catch { /* compilando */ }
      await pausa(500);
    }
    throw new Error("Next não ficou pronto");
  } catch (e) { await stop(); throw e; }
}

async function run(s: DisposableSupabase) {
  const admin = createClient(s.url, s.serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const svc = admin.schema("service");
  const churches = must(await svc.from("churches").select("id,organization_id,name,city"), "igrejas");
  const a = churches.find((c) => c.name === "Igreja Teste Local")!;
  const b = churches.find((c) => c.name === "Outra Igreja Local")!;
  if (!a || !b) throw new Error("Fixtures canônicas ausentes");
  const ministries = must(await svc.from("ministries").select("id,name").eq("organization_id", a.organization_id), "times");
  const louvor = ministries.find((m) => m.name === "Louvor")!.id;
  const recepcao = ministries.find((m) => m.name === "Recepção")!.id;
  const actors: Actor[] = [];
  async function actor(papel: string, email: string, role: string, cfg: { church?: typeof a; novo?: boolean; team?: string; extra?: boolean; finWrite?: boolean } = {}) {
    const igreja = cfg.church || a;
    if (cfg.novo) {
      const created = await admin.auth.admin.createUser({ email, password: "TesteLocal123", email_confirm: true, user_metadata: { full_name: `Q3 ${papel}` } });
      if (created.error) throw new Error(`Criar sessão: ${created.error.code}`);
    }
    const cookies = new Map<string, string>();
    const db = createServerClient(s.url, s.anonKey, { auth: { autoRefreshToken: false }, cookies: {
      getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
      setAll: (values) => { for (const c of values) cookies.set(c.name, c.value); },
    } });
    const response = await db.auth.signInWithPassword({ email, password: "TesteLocal123" });
    if (response.error) throw new Error(`Login: ${response.error.code}`);
    const login = response.data;
    if (!login.user) throw new Error("Login sem usuário");
    const user = login.user.id;
    must(await admin.schema("core").from("memberships").upsert({ user_id: user, organization_id: igreja.organization_id, role, status: "active" }, { onConflict: "user_id,organization_id" }).select("id"), "papel");
    let person = must(await svc.from("people").select("id").eq("user_id", user).eq("organization_id", igreja.organization_id), "pessoa")[0];
    if (!person) person = must(await svc.from("people").insert({ user_id: user, organization_id: igreja.organization_id, church_id: igreja.id, name: `Q3 ${papel}`, email }).select("id").single(), "nova pessoa");
    let member = must(await svc.from("members").select("id").eq("volunteer_id", person.id), "ficha")[0];
    if (!member) member = must(await svc.from("members").insert({ organization_id: igreja.organization_id, church_id: igreja.id, volunteer_id: person.id, name: `Q3 ${papel}`, email }).select("id").single(), "nova ficha");
    if (cfg.team) must(await svc.from("person_ministries").upsert({ organization_id: igreja.organization_id, person_id: person.id, ministry_id: cfg.team, is_leader: role === "lider" }, { onConflict: "person_id,ministry_id" }).select("person_id"), "vínculo time");
    if (cfg.extra || cfg.finWrite) must(await svc.from("person_grants").insert([
      ...(cfg.extra ? [{ organization_id: igreja.organization_id, person_id: person.id, grant_code: "visitantes" }] : []),
      { organization_id: igreja.organization_id, person_id: person.id, grant_code: cfg.finWrite ? "financeiro.lancar" : "financeiro.ver" },
    ]).select("id"), "acesso extra");
    const actor: Actor = { papel, user, person: person.id, member: member.id, org: igreja.organization_id, church: igreja.id, admin: ["owner", "master", "pastor"].includes(role), lead: ["owner", "master", "pastor", "lider"].includes(role), team: cfg.team, extra: cfg.extra, finWrite: cfg.finWrite, db, cookies };
    actors.push(actor);
    return actor;
  }
  await actor("owner", "master@teste.local", "owner");
  await actor("master", "q3-master@teste.local", "master", { novo: true });
  await actor("pastor", "q3-pastor@teste.local", "pastor", { novo: true });
  await actor("lider-louvor", "lider@teste.local", "lider", { team: louvor });
  await actor("lider-recepcao", "q3-lider@teste.local", "lider", { novo: true, team: recepcao });
  await actor("voluntario", "membro@teste.local", "membro", { team: louvor });
  await actor("voluntario-recepcao", "q3-vol@teste.local", "membro", { novo: true, team: recepcao });
  await actor("membro", "membro2@teste.local", "membro");
  await actor("extra-leitura", "q3-extra@teste.local", "membro", { novo: true, extra: true });
  await actor("extra-lancamento", "q3-fin@teste.local", "membro", { novo: true, finWrite: true });
  await actor("outra-igreja", "outra@teste.local", "master", { church: b });

  const visits = must(await svc.from("visitors").insert([a, b].map((c) => ({ organization_id: c.organization_id, church_id: c.id, name: "Q3 visitante" }))).select("id,organization_id,name"), "visitantes");
  const accounts = must(await svc.from("fin_accounts").insert([a, b].map((c) => ({ organization_id: c.organization_id, name: "Q3 Caixa", kind: "caixa" }))).select("id,organization_id"), "contas");
  const positions = must(await svc.from("ministry_positions").select("id,ministry_id").eq("organization_id", a.organization_id), "funções");
  const roster = must(await svc.from("roster_assignments").select("id,position_id,status").eq("organization_id", a.organization_id), "escalas");
  const marker = Buffer.from("Q3: fixture de arquivo, sem dados reais.\n");
  for (const c of [a, b]) {
    const r = await admin.storage.from("service-finance").upload(`${c.organization_id}/q3-original.txt`, marker, { contentType: "text/plain" });
    if (r.error) throw new Error("Preparar arquivo privado falhou");
  }
  for (const x of actors) must(await svc.from("push_subscriptions").insert({ organization_id: x.org, person_id: x.person, endpoint: `https://push.invalid/q3/${x.user}`, p256dh: "fixture", auth_key: "fixture" }).select("id"), "inscrição de teste");

  for (const x of actors) {
    const foreign = x.org === a.organization_id ? b : a;
    const visit = visits.find((v) => v.organization_id === x.org)!;
    const foreignVisit = visits.find((v) => v.organization_id === foreign.organization_id)!;
    const db = x.db.schema("service");
    async function read(table: string, id: string, esperado: boolean, caso: string) {
      const r = await db.from(table).select("id").eq("id", id);
      if (r.error) throw new Error(`Leitura ${table}: ${r.error.code}`);
      check(x.papel, caso, esperado, r.data.length > 0);
    }
    await read("churches", x.church, true, "ler igreja própria");
    await read("churches", foreign.id, false, "não ler igreja alheia");
    await read("visitors", visit.id, x.lead || !!x.extra || x.team === recepcao, "ler visitantes pelo papel/liberação/módulo");
    await read("visitors", foreignVisit.id, false, "não ler visitante de outra igreja");
    const created = randomUUID();
    const insert = await db.from("visitors").insert({ id: created, organization_id: x.org, church_id: x.church, name: "Q3 criado" });
    if (insert.error && insert.error.code !== "42501") throw new Error(`Inserção inválida: ${insert.error.code}`);
    const persisted = must(await svc.from("visitors").select("id").eq("id", created), "provar insert");
    check(x.papel, "criar visitante e persistir", x.lead, !insert.error && persisted.length === 1, insert.error?.code);
    const changed = await db.from("visitors").update({ name: "Q3 alterado" }).eq("id", visit.id);
    if (changed.error && changed.error.code !== "42501") throw new Error(`Update inválido: ${changed.error.code}`);
    const actual = must(await svc.from("visitors").select("name").eq("id", visit.id).single(), "provar update");
    check(x.papel, "alterar visitante e persistir", x.lead, actual.name === "Q3 alterado");
    must(await svc.from("visitors").update({ name: "Q3 visitante" }).eq("id", visit.id).select("id"), "restaurar fixture");
    const foreignInsert = await db.from("visitors").insert({ organization_id: foreign.organization_id, church_id: foreign.id, name: "Q3 invasão" });
    check(x.papel, "não inserir em outra igreja", true, foreignInsert.error?.code === "42501");
    await db.from("visitors").update({ name: "Q3 invasão" }).eq("id", foreignVisit.id);
    check(x.papel, "não alterar visitante de outra igreja", true, must(await svc.from("visitors").select("name").eq("id", foreignVisit.id).single(), "provar isolamento").name === "Q3 visitante");
    const city = `Q3 ${x.papel}`;
    await db.from("churches").update({ city }).eq("id", x.church);
    check(x.papel, "configuração exige administrador/pastor", x.admin, must(await svc.from("churches").select("city").eq("id", x.church).single(), "provar config").city === city);
    must(await svc.from("churches").update({ city: "São Paulo" }).eq("id", x.church).select("id"), "restaurar cidade");
    if (x.org === a.organization_id) for (const r of roster) {
      const team = positions.find((p) => p.id === r.position_id)!.ministry_id;
      await read("roster_assignments", r.id, x.lead || x.team === team, `escala do time ${team === louvor ? "Louvor" : "Recepção"}`);
    }
    const account = accounts.find((c) => c.organization_id === x.org)!;
    await read("fin_accounts", account.id, x.admin || !!x.extra || !!x.finWrite, "financeiro: leitura por liberação explícita");
    await read("fin_accounts", accounts.find((c) => c.organization_id === foreign.organization_id)!.id, false, "financeiro: igreja alheia oculta");
    const finId = randomUUID();
    const fin = await db.from("fin_accounts").insert({ id: finId, organization_id: x.org, name: "Q3 inserção", kind: "caixa" });
    if (fin.error && fin.error.code !== "42501") throw new Error(`Conta inválida: ${fin.error.code}`);
    check(x.papel, "financeiro: gravar exige lançar", x.admin || !!x.finWrite, !fin.error && must(await svc.from("fin_accounts").select("id").eq("id", finId), "provar conta").length === 1, fin.error?.code);

    const prefs = await db.rpc("set_my_notifications", { p_off: ["mural"] });
    check(x.papel, "notificação: preferências próprias persistem", true, !prefs.error && prefs.data === "ok" && must(await svc.from("people").select("notif_off").eq("id", x.person).single(), "preferências").notif_off.includes("mural"));
    const invalid = await db.rpc("set_my_notifications", { p_off: ["categoria-inválida"] });
    check(x.papel, "notificação: categoria inválida recusada", true, !invalid.error && invalid.data === "invalido");
    must(await svc.from("people").update({ notif_off: [] }).eq("id", x.person).select("id"), "restaurar preferências");
    const ownSub = must(await svc.from("push_subscriptions").select("id").eq("endpoint", `https://push.invalid/q3/${x.user}`).single(), "inscrição própria");
    await read("push_subscriptions", ownSub.id, true, "push: ler só a inscrição própria");
    const directUpdate = await db.from("push_subscriptions").update({ p256dh: "forjado" }).eq("id", ownSub.id);
    check(x.papel, "push: atualização direta exige servidor", true, directUpdate.error?.code === "42501" && must(await svc.from("push_subscriptions").select("p256dh").eq("id", ownSub.id).single(), "provar chave preservada").p256dh === "fixture");
    const directDelete = await db.from("push_subscriptions").delete().eq("id", ownSub.id);
    check(x.papel, "push: remoção direta exige servidor", true, directDelete.error?.code === "42501" && must(await svc.from("push_subscriptions").select("id").eq("id", ownSub.id), "provar inscrição preservada").length === 1);
    const peer = actors.find((p) => p.user !== x.user && p.org === x.org) || actors[0];
    const peerSub = must(await svc.from("push_subscriptions").select("id").eq("endpoint", `https://push.invalid/q3/${peer.user}`).single(), "inscrição alheia");
    await read("push_subscriptions", peerSub.id, false, "push: inscrição alheia oculta até de liderança");
    const directId = randomUUID();
    const direct = await db.from("push_subscriptions").insert({ id: directId, organization_id: x.org, person_id: peer.person, endpoint: `https://push.invalid/direta/${directId}`, p256dh: "fixture", auth_key: "fixture" });
    check(x.papel, "push: inscrição alheia não pode ser forjada direto", true, direct.error?.code === "42501");
    must(await svc.from("push_subscriptions").delete().eq("id", directId).select("id"), "remover tentativa de teste");
    const queue = await db.from("push_queue").select("id");
    if (queue.error) throw new Error(`Fila: ${queue.error.code}`);
    check(x.papel, "push: fila só do servidor", true, queue.data.length === 0);
    const enqueue = await db.from("push_queue").insert({ organization_id: x.org, person_id: x.person, categoria: "mural", title: "Q3", body: "fixture", send_after: new Date(Date.now() + 86400000).toISOString() });
    check(x.papel, "push: cliente não pode enfileirar", true, enqueue.error?.code === "42501");

    for (const [folder, allowed] of [["logo", x.admin], ["mural", x.lead], ["kids", true]] as const) {
      const path = `${x.org}/${folder}/q3-${randomUUID()}.txt`;
      const upload = await x.db.storage.from("service-media").upload(path, marker, { contentType: "text/plain" });
      if (upload.error && !["400", "403"].includes(String(upload.error.statusCode))) throw new Error(`Storage indisponível: ${upload.error.statusCode}`);
      const exists = await admin.storage.from("service-media").download(path);
      check(x.papel, `upload ${folder}: permissão e persistência`, allowed, !upload.error && !exists.error && await exists.data.text() === marker.toString());
    }
    const foreignUpload = await x.db.storage.from("service-media").upload(`${foreign.organization_id}/kids/q3-${randomUUID()}.txt`, marker, { contentType: "text/plain" });
    check(x.papel, "upload: pasta de outra igreja bloqueada", true, !!foreignUpload.error && ["400", "403"].includes(String(foreignUpload.error.statusCode)));
    for (const [org, allowed] of [[x.org, x.admin || !!x.extra || !!x.finWrite], [foreign.organization_id, false]] as const) {
      const download = await x.db.storage.from("service-finance").download(`${org}/q3-original.txt`);
      if (download.error && !["400", "403", "404"].includes(String(download.error.statusCode))) throw new Error(`Download indisponível: ${download.error.statusCode}`);
      check(x.papel, `arquivo privado ${org === x.org ? "próprio" : "outra igreja"}`, allowed, !download.error && await download.data.text() === marker.toString());
    }
    const privateUpload = await x.db.storage.from("service-finance").upload(`${x.org}/q3-write-${x.user}.txt`, marker, { contentType: "text/plain" });
    if (privateUpload.error && !["400", "403"].includes(String(privateUpload.error.statusCode))) throw new Error("Storage privado indisponível");
    check(x.papel, "arquivo privado: upload exige lançar", x.admin || !!x.finWrite, !privateUpload.error);
    const deletePath = `${x.org}/q3-delete-${x.user}.txt`;
    const prepared = await admin.storage.from("service-finance").upload(deletePath, marker, { contentType: "text/plain" });
    if (prepared.error) throw new Error("Preparar remoção de arquivo falhou");
    await x.db.storage.from("service-finance").remove([deletePath]);
    const afterDelete = await admin.storage.from("service-finance").download(deletePath);
    if (afterDelete.error && !["400", "404"].includes(String(afterDelete.error.statusCode))) throw new Error("Verificar remoção de arquivo falhou");
    check(x.papel, "arquivo privado: remoção exige lançar", x.admin || !!x.finWrite, !!afterDelete.error);
  }

  const app = await startApp(s);
  try {
    async function post(path: string, body: unknown, x?: Actor) {
      return fetch(`${app.base}/api/service/push/${path}`, { method: "POST", headers: { "Content-Type": "application/json", ...(x ? { Cookie: [...x.cookies].map(([k, v]) => `${k}=${v}`).join("; ") } : {}) }, body: JSON.stringify(body), signal: AbortSignal.timeout(120000) });
    }
    for (const path of ["subscribe", "unsubscribe", "notify"]) check("anônimo", `HTTP ${path}: exige login`, true, (await post(path, {})).status === 401);
    for (const x of actors) {
      const foreign = x.org === a.organization_id ? b : a;
      const endpoint = `https://push.invalid/http/${x.user}`;
      const subscribe = await post("subscribe", { organizationId: x.org, endpoint, keys: { p256dh: "fixture", auth: "fixture" }, personId: actors.find((p) => p.org === foreign.organization_id)!.person }, x);
      const persisted = must(await svc.from("push_subscriptions").select("person_id,organization_id").eq("endpoint", endpoint), "provar HTTP");
      check(x.papel, "HTTP subscribe: ignora personId forjado e usa sessão", true, subscribe.status === 200 && persisted.length === 1 && persisted[0].person_id === x.person && persisted[0].organization_id === x.org, `HTTP ${subscribe.status}`);
      const renewed = await post("subscribe", { organizationId: x.org, endpoint, keys: { p256dh: "fixture-nova", auth: "fixture-nova" } }, x);
      check(x.papel, "HTTP subscribe: renova a própria inscrição", true, renewed.status === 200 && must(await svc.from("push_subscriptions").select("p256dh").eq("endpoint", endpoint).single(), "provar renovação").p256dh === "fixture-nova");
      const forbidden = await post("subscribe", { organizationId: foreign.organization_id, endpoint: `${endpoint}/foreign`, keys: { p256dh: "fixture", auth: "fixture" } }, x);
      check(x.papel, "HTTP subscribe: outra igreja recusada", true, forbidden.status === 404);
      const note = await post("notify", { organizationId: x.org, recipientMemberIds: [x.member], title: `Q3 ${x.user}`, body: "Fixture de resumo. Não enviar push real.", categoria: "mural" }, x);
      const pending = must(await svc.from("push_queue").select("person_id,organization_id").eq("title", `Q3 ${x.user}`), "provar fila HTTP");
      check(x.papel, "HTTP notify: mural próprio enfileirado, sem envio externo", true, note.status === 200 && pending.length === 1 && pending[0].person_id === x.person && pending[0].organization_id === x.org, `HTTP ${note.status}`);
      const foreignNote = await post("notify", { organizationId: foreign.organization_id, recipientMemberIds: [x.member], title: "Q3 invasão", body: "fixture", categoria: "mural" }, x);
      check(x.papel, "HTTP notify: organização alheia recusada", true, foreignNote.status === 403);
      const other = actors.find((p) => p.org === foreign.organization_id)!;
      const foreignRecipient = await post("notify", { organizationId: x.org, recipientMemberIds: [other.member], title: `Q3 destinatário ${x.user}`, body: "fixture", categoria: "mural" }, x);
      check(x.papel, "HTTP notify: destinatário alheio nunca enfileira", true, [200, 400, 403].includes(foreignRecipient.status) && must(await svc.from("push_queue").select("id").eq("title", `Q3 destinatário ${x.user}`), "provar destinatário").length === 0);
      const foreignEndpoint = `https://push.invalid/q3/${other.user}`;
      const hijack = await post("subscribe", { organizationId: x.org, endpoint: foreignEndpoint, keys: { p256dh: "fixture", auth: "fixture" } }, x);
      const subscription = must(await svc.from("push_subscriptions").select("person_id,organization_id").eq("endpoint", foreignEndpoint).single(), "provar dono da inscrição");
      check(x.papel, "HTTP subscribe: não tomar endpoint de outra pessoa/igreja", true, [403, 409].includes(hijack.status) && subscription.person_id === other.person && subscription.organization_id === other.org, `HTTP ${hijack.status}`);
      // Se a verificação detectar a falha, não contamine os casos seguintes.
      must(await svc.from("push_subscriptions").update({ person_id: other.person, organization_id: other.org }).eq("endpoint", foreignEndpoint).select("id"), "restaurar inscrição");
      await post("unsubscribe", { endpoint: foreignEndpoint }, x);
      check(x.papel, "HTTP unsubscribe: preserva inscrição alheia", true, must(await svc.from("push_subscriptions").select("person_id").eq("endpoint", foreignEndpoint), "provar inscrição alheia").some((p) => p.person_id === other.person));
      const unsub = await post("unsubscribe", { endpoint }, x);
      check(x.papel, "HTTP unsubscribe: remove inscrição própria", true, unsub.status === 200 && must(await svc.from("push_subscriptions").select("id").eq("endpoint", endpoint), "provar remoção").length === 0);
      must(await admin.schema("core").from("memberships").update({ status: "suspended" }).eq("user_id", x.user).eq("organization_id", x.org).select("id"), "suspender fixture");
      const suspended = await post("subscribe", { organizationId: x.org, endpoint: `${endpoint}/suspenso`, keys: { p256dh: "fixture", auth: "fixture" } }, x);
      check(x.papel, "HTTP subscribe: vínculo suspenso não inscreve", true, [403, 404].includes(suspended.status) && must(await svc.from("push_subscriptions").select("id").eq("endpoint", `${endpoint}/suspenso`), "provar suspensão").length === 0, `HTTP ${suspended.status}`);
      const suspendedRead = await x.db.schema("service").from("churches").select("id").eq("id", x.church);
      check(x.papel, "vínculo suspenso: igreja oculta", true, !suspendedRead.error && suspendedRead.data.length === 0);
      const suspendedFinance = await x.db.schema("service").rpc("fin_can", { p_org: x.org, p_write: false });
      check(x.papel, "vínculo suspenso: liberação financeira inativa", true, !suspendedFinance.error && suspendedFinance.data === false);
      const suspendedFile = await x.db.storage.from("service-finance").download(`${x.org}/q3-original.txt`);
      check(x.papel, "vínculo suspenso: arquivo privado bloqueado", true, !!suspendedFile.error && ["400", "403", "404"].includes(String(suspendedFile.error.statusCode)));
      must(await admin.schema("core").from("memberships").update({ status: "active" }).eq("user_id", x.user).eq("organization_id", x.org).select("id"), "reativar fixture");
      if (x.extra || x.finWrite) {
        const grant = x.finWrite ? "financeiro.lancar" : "financeiro.ver";
        must(await svc.from("person_grants").delete().eq("person_id", x.person).eq("grant_code", grant).select("id"), "revogar liberação fixture");
        const revoked = await x.db.storage.from("service-finance").download(`${x.org}/q3-original.txt`);
        check(x.papel, "liberação revogada: arquivo privado bloqueado", true, !!revoked.error && ["400", "403", "404"].includes(String(revoked.error.statusCode)));
        must(await svc.from("person_grants").insert({ organization_id: x.org, person_id: x.person, grant_code: grant }).select("id"), "restaurar liberação fixture");
      }
      must(await admin.schema("core").from("product_access").update({ active: false }).eq("organization_id", x.org).eq("product_code", "service").select("id"), "suspender produto fixture");
      const expired = await post("subscribe", { organizationId: x.org, endpoint: `${endpoint}/sem-produto`, keys: { p256dh: "fixture", auth: "fixture" } }, x);
      check(x.papel, "produto inativo: não inscreve push", true, [403, 404].includes(expired.status) && must(await svc.from("push_subscriptions").select("id").eq("endpoint", `${endpoint}/sem-produto`), "provar produto inativo").length === 0);
      const expiredFinance = await x.db.schema("service").rpc("fin_can", { p_org: x.org, p_write: false });
      check(x.papel, "produto inativo: liberação financeira inativa", true, !expiredFinance.error && expiredFinance.data === false);
      const expiredFile = await x.db.storage.from("service-finance").download(`${x.org}/q3-original.txt`);
      check(x.papel, "produto inativo: arquivo privado bloqueado", true, !!expiredFile.error && ["400", "403", "404"].includes(String(expiredFile.error.statusCode)));
      must(await admin.schema("core").from("product_access").update({ active: true }).eq("organization_id", x.org).eq("product_code", "service").select("id"), "reativar produto fixture");
    }
    const contenders = [actors[0], actors.find((p) => p.org === b.organization_id)!];
    const endpoint = `https://push.invalid/concorrente/${randomUUID()}`;
    const replies = await Promise.all(contenders.map((x) => post("subscribe", { organizationId: x.org, endpoint, keys: { p256dh: x.papel, auth: "fixture" } }, x)));
    const winner = contenders[replies.findIndex((r) => r.status === 200)];
    const subscription = must(await svc.from("push_subscriptions").select("person_id,organization_id,p256dh").eq("endpoint", endpoint).single(), "provar inscrição concorrente");
    check("concorrência", "HTTP subscribe: duas igrejas não compartilham o dono do endpoint", true,
      replies.filter((r) => r.status === 200).length === 1 && replies.filter((r) => r.status === 409).length === 1 && !!winner && subscription.person_id === winner.person && subscription.organization_id === winner.org && subscription.p256dh === winner.papel);
  } finally { await app.stop(); }
}

let erro: string | null = null;
withDisposableSupabase(run).catch((e) => { erro = String(e.message).replace(/eyJ[\w.-]+/g, "[token omitido]"); }).finally(() => {
  const falhas = rows.filter((r) => !r.passou).length;
  const result = { executadoEm: new Date().toISOString(), casos: rows.length, falhas, erro, sucesso: !erro && falhas === 0, rows };
  writeFileSync(join(saida, "resultado.json"), JSON.stringify(result, null, 2) + "\n", { mode: 0o600 });
  writeFileSync(join(saida, "MATRIZ.md"), ["# Matriz autenticada local", "", `Casos: ${rows.length}. Falhas: ${falhas}. Erro de execução: ${erro || "nenhum"}.`, "", "| Papel | Caso | Esperado | Observado | Passou |", "|---|---|---|---|---|", ...rows.map((r) => `| ${r.papel} | ${r.caso} | ${r.esperado} | ${r.observado} | ${r.passou} |`)].join("\n") + "\n");
  console.log(JSON.stringify({ casos: rows.length, falhas, erro, saida }));
  process.exitCode = result.sucesso ? 0 : 1;
});
