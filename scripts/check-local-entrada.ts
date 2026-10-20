/* Entrada na igreja pelo link ou código (0071), no Supabase local.
   Refaz os passos da rota app/api/service/entrada (achar o código, criar a
   conta pelo cadastro normal, abrir o pedido) e confere a regra da igreja, a
   aprovação, a recusa, a conta em duas igrejas e o isolamento entre elas.
   Rode depois de scripts/seed-local-service.ts. Uso: npx tsx scripts/check-local-entrada.ts */
import { createClient } from "@supabase/supabase-js";
import { findEntryLink } from "../app/lib/service-entrada";

const URL = "http://127.0.0.1:54321";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const SENHA = "TesteLocal123";
if (!URL.startsWith("http://127.0.0.1")) throw new Error("só roda no Supabase local");

const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } }) as unknown as Parameters<typeof findEntryLink>[0];

async function entrar(email: string, senha = SENHA) {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: senha });
  if (error) throw new Error(`${email}: ${error.message}`);
  return c;
}

let falhas = 0;
function confere(ok: boolean, msg: string) {
  if (!ok) falhas++;
  console.log(`${ok ? "ok   " : "FALHA"} ${msg}`);
}

/* o que a rota faz depois de achar o código: cadastro normal + pedido */
async function pedirEntrada(codigo: string, email: string, nome: string) {
  const link = await findEntryLink(admin, codigo);
  if (!link) return { estado: "codigo_invalido" as const };
  const anon = createClient(URL, ANON, { auth: { persistSession: false } });
  let { data, error } = await anon.auth.signUp({ email, password: SENHA, options: { data: { full_name: nome } } });
  if (error && /already|registered|exists/i.test(error.message)) ({ data, error } = await anon.auth.signInWithPassword({ email, password: SENHA }) as never);
  if (error || !data.user) throw new Error(`conta ${email}: ${error?.message}`);
  const { data: vinc } = await admin.schema("core").from("memberships").select("status").eq("user_id", data.user.id).eq("organization_id", link.organizationId).maybeSingle();
  if (vinc?.status === "active") return { estado: "membro" as const, userId: data.user.id, org: link.organizationId };
  await admin.schema("service").from("entry_requests").insert({ organization_id: link.organizationId, church_id: link.churchId, user_id: data.user.id, name: nome, email, auto: link.rule === "direto" });
  return { estado: link.rule === "direto" ? "direto" as const : "pendente" as const, userId: data.user.id, org: link.organizationId };
}

const sufixo = Date.now().toString(36);
const emails = [`novo-a-${sufixo}@teste.local`, `novo-b-${sufixo}@teste.local`, `recusado-${sufixo}@teste.local`];

async function main() {
  const master = await entrar("master@teste.local");
  const outra = await entrar("outra@teste.local");
  const { data: igA } = await admin.schema("service").from("churches").select("organization_id").eq("name", "Igreja Teste Local").single();
  const orgA = igA!.organization_id as string;
  const { data: mOutra } = await admin.schema("core").from("memberships").select("organization_id").eq("user_id", (await outra.auth.getUser()).data.user!.id).neq("organization_id", orgA).limit(1).single();
  const orgB = mOutra!.organization_id as string;

  try {
    const cfgA = (await master.schema("service").rpc("entrada_config", { p_org: orgA })).data as { code: string; rule: string } | null;
    const cfgB = (await outra.schema("service").rpc("entrada_config", { p_org: orgB })).data as { code: string } | null;
    confere(!!cfgA?.code && !!cfgB?.code, "cada igreja tem o seu código");
    confere((await outra.schema("service").rpc("entrada_config", { p_org: orgA })).data === null, "a gestão de outra igreja não vê o código da igreja A");

    confere((await pedirEntrada("ZZZZ-ZZZZ", emails[0], "Pessoa Teste")).estado === "codigo_invalido", "código inexistente é recusado antes de criar conta");
    confere((await pedirEntrada("abc", emails[0], "Pessoa Teste")).estado === "codigo_invalido", "código malformado é recusado");
    const { data: semConta } = await admin.schema("core").from("users").select("id").eq("email", emails[0]).maybeSingle();
    confere(!semConta, "nenhuma conta foi criada com código inválido");

    /* regra "aprovar": pedido pendente até a gestão decidir */
    await master.schema("service").rpc("entrada_regra", { p_org: orgA, p_rule: "aprovar" });
    const p1 = await pedirEntrada(cfgA!.code.toLowerCase().replace(/(.{4})/, "$1-"), emails[0], "Ana Nova Teste");
    confere(p1.estado === "pendente", "código digitado em minúsculas e com hífen vale");
    const novaA = await entrar(emails[0]);
    const { count: antes } = await novaA.schema("service").from("people").select("id", { count: "exact", head: true }).eq("organization_id", orgA);
    confere((antes ?? 0) === 0, "antes da aprovação, a pessoa não lê nada da igreja");
    const pedidosB = (await outra.schema("service").rpc("entrada_pedidos", { p_org: orgA })).data as unknown[] | null;
    confere(!pedidosB || pedidosB.length === 0, "a gestão de outra igreja não vê os pedidos da igreja A");
    const { data: req1 } = await admin.schema("service").from("entry_requests").select("id").eq("user_id", p1.userId!).eq("organization_id", orgA).single();
    const naoPode = (await outra.schema("service").rpc("entrada_aprovar", { p_req: req1!.id })).data;
    confere(naoPode === "nao_pode", "a gestão de outra igreja não aprova pedido da igreja A");
    const ok1 = (await master.schema("service").rpc("entrada_aprovar", { p_req: req1!.id })).data;
    confere(ok1 === "ok", "a gestão aprova o pedido");
    const { data: mem1 } = await admin.schema("core").from("memberships").select("status,role").eq("user_id", p1.userId!).eq("organization_id", orgA).single();
    confere(mem1?.status === "active" && mem1?.role === "membro", "aprovado vira membro base ativo");
    const { data: ficha1 } = await admin.schema("service").from("people").select("id").eq("user_id", p1.userId!).eq("organization_id", orgA);
    confere((ficha1 ?? []).length === 1, "aprovado ganha exatamente uma ficha na igreja");
    confere((await master.schema("service").rpc("entrada_aprovar", { p_req: req1!.id })).data === "ja_decidido", "aprovar de novo não duplica");
    confere((await pedirEntrada(cfgA!.code, emails[0], "Ana Nova Teste")).estado === "membro", "quem já é membro não abre outro pedido");

    /* a mesma conta pede entrada na igreja B: dois vínculos, cada um na sua igreja */
    const p2 = await pedirEntrada(cfgB!.code, emails[0], "Ana Nova Teste");
    confere(p2.estado === "pendente" && p2.org === orgB, "conta existente pede entrada em outra igreja");
    const { data: req2 } = await admin.schema("service").from("entry_requests").select("id").eq("user_id", p1.userId!).eq("organization_id", orgB).single();
    confere((await outra.schema("service").rpc("entrada_aprovar", { p_req: req2!.id })).data === "ok", "a gestão da igreja B aprova");
    const { data: vincs } = await admin.schema("core").from("memberships").select("organization_id,status").eq("user_id", p1.userId!);
    confere((vincs ?? []).filter((v) => v.status === "active").length === 2, "a conta fica ativa nas duas igrejas");
    const { data: fichas } = await admin.schema("service").from("people").select("organization_id").eq("user_id", p1.userId!);
    confere(new Set((fichas ?? []).map((f) => f.organization_id)).size === 2 && (fichas ?? []).length === 2, "uma ficha em cada igreja, sem misturar");

    /* recusa */
    const p3 = await pedirEntrada(cfgA!.code, emails[2], "Rui Recusado Teste");
    const { data: req3 } = await admin.schema("service").from("entry_requests").select("id").eq("user_id", p3.userId!).single();
    confere((await master.schema("service").rpc("entrada_recusar", { p_req: req3!.id })).data === "ok", "a gestão recusa o pedido");
    const { data: mem3 } = await admin.schema("core").from("memberships").select("status").eq("user_id", p3.userId!).eq("organization_id", orgA).maybeSingle();
    confere(!mem3 || mem3.status !== "active", "recusado não vira membro");

    /* regra "direto": ativa no primeiro login, pela própria pessoa */
    await master.schema("service").rpc("entrada_regra", { p_org: orgA, p_rule: "direto" });
    const p4 = await pedirEntrada(cfgA!.code, emails[1], "Bia Direta Teste");
    confere(p4.estado === "direto", "com a regra direto, o pedido sai automático");
    const novaB = await entrar(emails[1]);
    await novaB.schema("service").rpc("entrada_minha");
    const { data: mem4 } = await admin.schema("core").from("memberships").select("status").eq("user_id", p4.userId!).eq("organization_id", orgA).maybeSingle();
    confere(mem4?.status === "active", "entra direto no primeiro login");

    /* código trocado: o antigo deixa de valer */
    const novo = (await master.schema("service").rpc("entrada_novo_codigo", { p_org: orgA })).data as string;
    confere(!!novo && novo !== cfgA!.code, "a gestão gera um código novo");
    confere((await findEntryLink(admin, cfgA!.code)) === null, "o código antigo deixa de valer");
    confere((await findEntryLink(admin, novo))?.organizationId === orgA, "o código novo leva à igreja certa");
  } finally {
    await master.schema("service").rpc("entrada_regra", { p_org: orgA, p_rule: "aprovar" });
    const { data: lista } = await admin.auth.admin.listUsers({ perPage: 1000 });
    for (const u of lista?.users ?? []) if (u.email && emails.includes(u.email)) {
      await admin.schema("service").from("people").delete().eq("user_id", u.id);
      await admin.schema("core").from("memberships").delete().eq("user_id", u.id);
      await admin.auth.admin.deleteUser(u.id);
    }
    console.log(falhas ? `\n${falhas} falha(s)` : "\nTudo certo");
    process.exit(falhas ? 1 : 0);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
