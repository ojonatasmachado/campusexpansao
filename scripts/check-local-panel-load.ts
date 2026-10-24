// npx tsx scripts/check-local-panel-load.ts antes|depois
// SSR de produção, sem navegador: três papéis, aquecimento + sete amostras.
// Banco descartável, volume canônico; nunca usa credencial/instância de produção.
import { withDisposableSupabase } from "./check-local-rls";
import { createServerClient } from "@supabase/ssr";
import { spawn } from "node:child_process";
import { createServer, type Server } from "node:http";
import { mkdirSync, readFileSync, writeFileSync, openSync, closeSync } from "node:fs";
import { join, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { performance } from "node:perf_hooks";

const root = resolve(__dirname, "..");
const label = process.argv[2];
if (!label || !/^[a-z0-9-]+$/.test(label)) throw new Error("Informe um rótulo simples: antes ou depois.");
const output = join(root, "prints/q7-carga", label);
mkdirSync(output, { recursive: true });
const pause = (ms: number) => new Promise((ok) => setTimeout(ok, ms));
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
async function listen(server: Server) {
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Porta ausente");
  return `http://127.0.0.1:${address.port}`;
}
async function command(args: string[], env: NodeJS.ProcessEnv, file: string) {
  const fd = openSync(join(output, file), "w", 0o600);
  try {
    await new Promise<void>((ok, fail) => {
      const child = spawn(args[0], args.slice(1), { cwd: root, env, stdio: ["ignore", fd, fd] });
      const timer = setTimeout(() => child.kill("SIGTERM"), 600_000);
      child.once("error", fail);
      child.once("close", (code) => { clearTimeout(timer); if (code === 0) ok(); else fail(new Error(`${args[0]} falhou (${code}), veja ${file}`)); });
    });
  } finally { closeSync(fd); }
}

withDisposableSupabase(async (db) => {
  // A cópia é privada e recusa qualquer sobra do endpoint compartilhado.
  let seed = readFileSync(join(root, "scripts/seed-local-volume.ts"), "utf8");
  for (const [name, value] of [["URL", db.url], ["SERVICE", db.serviceRoleKey]]) {
    let count = 0;
    seed = seed.replace(new RegExp(`const ${name} = "[^\"]+";`, "g"), () => { count++; return `const ${name} = ${JSON.stringify(value)};`; });
    if (count !== 1) throw new Error(`Contrato do volume mudou: ${name}`);
  }
  if (seed.includes("http://127.0.0.1:54321")) throw new Error("Volume não isolado");
  const seedFile = join(db.dir, "seed-volume.ts");
  writeFileSync(seedFile, seed, { mode: 0o600 });
  await command([process.execPath, ...process.execArgv, seedFile], process.env, "volume.log");

  type Query = { path: string; start: number; end: number; bytes: number; status: number };
  let queries: Query[] = [];
  const proxy = createServer(async (req, res) => {
    const start = performance.now();
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) if (value && !["host", "connection", "content-length", "accept-encoding"].includes(key)) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
      const upstream = await fetch(db.url + req.url, { method: req.method, headers, body: chunks.length ? Buffer.concat(chunks) : undefined, signal: AbortSignal.timeout(120_000), redirect: "manual" });
      const body = Buffer.from(await upstream.arrayBuffer());
      res.statusCode = upstream.status;
      upstream.headers.forEach((value, key) => { if (!["content-length", "content-encoding", "transfer-encoding", "connection"].includes(key)) res.setHeader(key, value); });
      queries.push({ path: (req.url || "").split("?")[0], start, end: performance.now(), bytes: body.length, status: upstream.status });
      res.end(body);
    } catch { res.statusCode = 502; res.end("Proxy local indisponível"); }
  });
  const proxyUrl = await listen(proxy);
  const portFinder = createServer();
  const base = await listen(portFinder);
  await new Promise<void>((ok) => portFinder.close(() => ok()));
  const env = { ...process.env, SUPABASE_URL: proxyUrl, SUPABASE_ANON_KEY: db.anonKey, SUPABASE_SERVICE_ROLE_KEY: db.serviceRoleKey, NEXT_PUBLIC_SUPABASE_URL: db.url, NEXT_PUBLIC_SUPABASE_ANON_KEY: db.anonKey, NEXT_PUBLIC_SITE_URL: base, NEXT_TELEMETRY_DISABLED: "1" };
  let app: ReturnType<typeof spawn> | undefined;
  let fd: number | undefined;
  try {
    console.log("Volume pronto; compilando produção.");
    await command(["npm", "run", "build"], env, "build.log");
    fd = openSync(join(output, "runtime.log"), "w", 0o600);
    app = spawn("npm", ["start", "--", "--hostname", "127.0.0.1", "--port", new URL(base).port], { cwd: root, env, detached: true, stdio: ["ignore", fd, fd] });
    let ready = false;
    for (let i = 0; i < 100; i++) {
      if (app.exitCode !== null) throw new Error("Next encerrou");
      try { if ((await fetch(base + "/service/login", { signal: AbortSignal.timeout(2000) })).ok) { ready = true; break; } } catch {}
      await pause(300);
    }
    if (!ready) throw new Error("Next não ficou pronto");
    const results = [];
    for (const role of ["master", "lider", "membro"]) {
      const jar = new Map<string, string>();
      const client = createServerClient(db.url, db.anonKey, { auth: { autoRefreshToken: false }, cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: (values) => { for (const c of values) jar.set(c.name, c.value); } } });
      const login = await client.auth.signInWithPassword({ email: `${role}@teste.local`, password: "TesteLocal123" });
      if (login.error) throw new Error(`Login local falhou: ${role}`);
      const samples = [];
      let html = "";
      for (let i = 0; i < 8; i++) {
        queries = [];
        const start = performance.now();
        const response = await fetch(base + "/service", { headers: { Cookie: [...jar].map(([name, value]) => `${name}=${value}`).join("; ") }, signal: AbortSignal.timeout(120_000), redirect: "manual" });
        const headersMs = performance.now() - start;
        html = await response.text();
        const totalMs = performance.now() - start;
        if (response.status !== 200 || !html.includes("Igreja Teste Local") || /Não conseguimos abrir os dados da igreja/.test(html) || queries.some((q) => q.status >= 400)) throw new Error(`Carga de ${role} reprovou`);
        if (i) samples.push({ headersMs, totalMs, htmlBytes: Buffer.byteLength(html), htmlGzipBytes: gzipSync(html).length, queries: queries.map((q) => ({ ...q, start: q.start - start, end: q.end - start })) });
      }
      const scripts = [...new Set([...html.matchAll(/<script[^>]+src="([^\"]+)"/g)].map((m) => m[1]).filter((src) => src.startsWith("/_next/")))];
      let jsBytes = 0, jsGzipBytes = 0;
      for (const src of scripts) { const body = Buffer.from(await (await fetch(base + src)).arrayBuffer()); jsBytes += body.length; jsGzipBytes += gzipSync(body).length; }
      const result = { role, medianHeadersMs: median(samples.map((s) => s.headersMs)), medianTotalMs: median(samples.map((s) => s.totalMs)), medianHtmlBytes: median(samples.map((s) => s.htmlBytes)), medianHtmlGzipBytes: median(samples.map((s) => s.htmlGzipBytes)), jsBytes, jsGzipBytes, scriptCount: scripts.length, samples };
      results.push(result);
      console.log(JSON.stringify({ role, totalMs: result.medianTotalMs, htmlBytes: result.medianHtmlBytes, jsBytes, queries: samples[0].queries.length }));
    }
    writeFileSync(join(output, "resultado.json"), JSON.stringify({ label, measuredAt: new Date().toISOString(), mode: "production SSR, loopback proxy, 1 warmup + 7 samples, canonical volume", results }, null, 2) + "\n", { mode: 0o600 });
  } finally {
    if (app?.pid) {
      const pid = app.pid;
      try { process.kill(-pid, "SIGTERM"); } catch {}
      for (let i = 0; i < 30 && app.exitCode === null && app.signalCode === null; i++) await pause(100);
      if (app.exitCode === null && app.signalCode === null) { try { process.kill(-pid, "SIGKILL"); } catch {} }
    }
    if (fd !== undefined) closeSync(fd);
    proxy.closeAllConnections();
    await new Promise<void>((ok) => proxy.close(() => ok()));
  }
}).catch((error) => { console.error(String(error.message).replace(/eyJ[\w.-]+/g, "[token omitido]")); process.exitCode = 1; });
