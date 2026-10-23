// Uso: npx tsx tools/captura-service/isolado.ts --so=jornadas --ap=celular
// App, banco, sessões e fixtures próprios. Os prints sobrevivem ao descarte.
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { closeSync, mkdirSync, openSync } from "node:fs";
import { createServer, type AddressInfo } from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { withDisposableSupabase } from "../../scripts/check-local-rls";

const DIR = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(DIR, "..", "..");
const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function portaLivre() {
  const server = createServer();
  await new Promise<void>((ok, falha) => { server.once("error", falha); server.listen(0, "127.0.0.1", ok); });
  const port = (server.address() as AddressInfo).port;
  await new Promise<void>((ok, falha) => server.close((e) => e ? falha(e) : ok()));
  return port;
}

async function parar(app: ChildProcess) {
  if (!app.pid) return;
  const sinal = (signal: NodeJS.Signals) => {
    try { if (process.platform === "win32") app.kill(signal); else process.kill(-app.pid!, signal); } catch { /* já encerrou */ }
  };
  sinal("SIGTERM");
  for (let i = 0; i < 30 && app.exitCode === null && app.signalCode === null; i++) await pausa(100);
  if (app.exitCode === null && app.signalCode === null) sinal("SIGKILL");
}

async function capturar(env: NodeJS.ProcessEnv, args: string[]) {
  return new Promise<number>((ok, falha) => {
    const child = spawn(process.execPath, [join(DIR, "capturar.mjs"), ...args], { cwd: RAIZ, env, stdio: "inherit" });
    const limite = setTimeout(() => { child.kill("SIGTERM"); falha(new Error("Captura excedeu uma hora")); }, 3_600_000);
    child.once("error", (e) => { clearTimeout(limite); falha(e); });
    child.once("close", (code) => { clearTimeout(limite); ok(code ?? 1); });
  });
}

async function main() {
  if (process.argv.includes("--ajuda")) { console.log("npx tsx tools/captura-service/isolado.ts [--so=jornadas] [--ap=celular|desktop] [--j=M10]"); return 0; }
  const dono = spawnSync("lsof", ["-t", join(RAIZ, ".next/dev/lock")], { encoding: "utf8" });
  if (dono.status === 0 && dono.stdout.trim()) throw new Error("Já existe um servidor Next neste worktree. Encerre a execução anterior antes de iniciar outra captura.");
  return withDisposableSupabase(async (sandbox) => {
    const base = `http://127.0.0.1:${await portaLivre()}`;
    const data = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const saida = resolve(process.env.CAPTURA_SAIDA || join(RAIZ, "prints", `service-${data}-${sandbox.projectId}`));
    mkdirSync(saida, { recursive: true });
    const cronSecret = randomUUID();
    const env = {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: sandbox.url, NEXT_PUBLIC_SUPABASE_ANON_KEY: sandbox.anonKey,
      SUPABASE_URL: sandbox.url, SUPABASE_ANON_KEY: sandbox.anonKey, SUPABASE_SERVICE_ROLE_KEY: sandbox.serviceRoleKey,
      NEXT_PUBLIC_SITE_URL: base, CRON_SECRET: cronSecret,
      CAPTURA_BASE_URL: base, CAPTURA_SUPABASE_URL: sandbox.url,
      CAPTURA_ANON_KEY: sandbox.anonKey, CAPTURA_SERVICE_ROLE_KEY: sandbox.serviceRoleKey,
      CAPTURA_SAIDA: saida, CAPTURA_AUTH_DIR: join(sandbox.dir, "auth-captura"),
      CAPTURA_STATE_DIR: join(sandbox.dir, "fixtures-captura"), CAPTURA_DESCARTAVEL: sandbox.projectId,
      CAPTURA_CRON_SECRET: cronSecret,
    };
    const log = openSync(join(saida, "runtime.log"), "a", 0o600);
    let app: ChildProcess | null = null;
    try {
      const seed = spawnSync(process.execPath, [...process.execArgv, join(DIR, "seed-captura.ts")], { cwd: RAIZ, env, stdio: ["ignore", log, log], timeout: 120_000 });
      if (seed.status !== 0) throw new Error(`Seed de captura falhou; veja ${join(saida, "runtime.log")}`);
      app = spawn(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", new URL(base).port], { cwd: RAIZ, env, detached: process.platform !== "win32", stdio: ["ignore", log, log] });
      let erro: Error | null = null;
      app.once("error", (e) => { erro = e; });
      let pronto = false;
      for (let i = 0; i < 120; i++) {
        if (erro || app.exitCode !== null) throw erro || new Error("App encerrou antes da captura");
        try {
          const r = await fetch(`${base}/service/login`, { signal: AbortSignal.timeout(2000) });
          if (r.ok) { pronto = true; break; }
        } catch { /* servidor ainda compilando */ }
        await pausa(500);
      }
      if (!pronto) throw new Error("App local não ficou pronto para capturar");
      console.log(`Captura isolada: ${saida}`);
      return await capturar(env, process.argv.slice(2));
    } finally {
      if (app) await parar(app);
      closeSync(log);
    }
  });
}

main().then((code) => { process.exitCode = code; }).catch((e) => { console.error(e.message); process.exitCode = 1; });
