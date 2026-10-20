/* Kids no Supabase local: quem pode marcar presença e pedir retirada de uma criança.
   Cenário: Maria (membro) é responsável pela criança; Mateus (membro, sem time) não é
   responsável nem da equipe do Kids. Rode depois de scripts/seed-local-service.ts.
   Uso: npx tsx scripts/check-local-kids.ts */
import { createClient } from "@supabase/supabase-js";

const URL = "http://127.0.0.1:54321";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const SENHA = "TesteLocal123";
if (!URL.startsWith("http://127.0.0.1")) throw new Error("só roda no Supabase local");

const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } }).schema("service");

async function entrar(email: string) {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: SENHA });
  if (error) throw new Error(`${email}: ${error.message}`);
  return c.schema("service");
}

let falhas = 0;
function confere(ok: boolean, msg: string) {
  if (!ok) falhas++;
  console.log(`${ok ? "ok   " : "FALHA"} ${msg}`);
}

async function main() {
  const { data: igreja } = await admin.from("churches").select("id,organization_id").eq("name", "Igreja Teste Local").single();
  if (!igreja) throw new Error("rode antes scripts/seed-local-service.ts");
  const org = igreja.organization_id as string;
  const church = igreja.id as string;
  const { data: maria } = await admin.from("people").select("id").eq("organization_id", org).eq("name", "Maria Membro").single();
  const { data: mateus } = await admin.from("people").select("id").eq("organization_id", org).eq("name", "Mateus Membro").single();

  const criados: { tabela: string; id: string }[] = [];
  const cria = async (tabela: string, dados: Record<string, unknown>) => {
    const { data, error } = await admin.from(tabela).insert(dados).select("id").single();
    if (error) throw new Error(`${tabela}: ${error.message}`);
    criados.push({ tabela, id: data.id as string });
    return data.id as string;
  };

  try {
    const turma = await cria("kids_classes", { organization_id: org, church_id: church, name: "Turma Teste" });
    const crianca = await cria("children", { organization_id: org, church_id: church, name: "Criança Teste", class_id: turma });
    await cria("child_guardians", { organization_id: org, child_id: crianca, guardian_person_id: maria!.id });
    const evento = await cria("events", { organization_id: org, church_id: church, name: "Culto Teste Kids" });
    const sessao = await cria("kids_sessions", { organization_id: org, event_id: evento, class_id: turma, checkin_active: true });
    const presenca = await cria("kids_attendance", { organization_id: org, session_id: sessao, child_id: crianca, status: "presente", dropped_off_via: "manual" });

    const estranho = await entrar("membro2@teste.local");
    const responsavel = await entrar("membro@teste.local");

    const { data: vista } = await estranho.from("kids_attendance").select("id").eq("id", presenca);
    confere((vista ?? []).length === 0, "quem não é responsável não vê a presença da criança");

    const { data: alterou } = await estranho.from("kids_attendance").update({ status: "retirada_pendente" }).eq("id", presenca).select("id");
    confere((alterou ?? []).length === 0, "quem não é responsável não pede a retirada");
    const { data: depois } = await admin.from("kids_attendance").select("status").eq("id", presenca).single();
    confere(depois?.status === "presente", "a presença continua como estava");

    const { error: eGuard } = await estranho.from("child_guardians").insert({ organization_id: org, child_id: crianca, guardian_person_id: mateus!.id });
    confere(!!eGuard, "quem não é responsável não se cadastra como responsável da criança de outra família");

    const { error: eIns } = await estranho.from("kids_attendance").insert({ organization_id: org, session_id: sessao, child_id: crianca, status: "retirado", dropped_off_via: "manual" });
    confere(!!eIns, "quem não é responsável não cria presença da criança de outra família");

    const { data: apagou } = await estranho.from("kids_attendance").delete().eq("id", presenca).select("id");
    confere((apagou ?? []).length === 0, "quem não é responsável não apaga a presença");

    const { data: pediu, error: ePed } = await responsavel.from("kids_attendance").update({ status: "retirada_pendente" }).eq("id", presenca).select("id");
    confere(!ePed && (pediu ?? []).length === 1, "o responsável pede a retirada do próprio filho");

    /* fluxos que precisam continuar funcionando */
    const lider = await entrar("lider@teste.local");
    const { data: liderMudou, error: eLid } = await lider.from("kids_attendance").update({ status: "presente" }).eq("id", presenca).select("id");
    confere(!eLid && (liderMudou ?? []).length === 1, "a liderança altera a presença (equipe do Kids)");

    const filhoNovo = crypto.randomUUID();
    const { error: eFilho } = await responsavel.from("children").insert({ id: filhoNovo, organization_id: org, church_id: church, name: "Filho Novo Teste" });
    const { error: eVinc } = await responsavel.from("child_guardians").insert({ organization_id: org, child_id: filhoNovo, guardian_person_id: maria!.id, relationship: "responsavel", can_pickup: true, is_primary: true });
    confere(!eFilho && !eVinc, "o responsável cadastra o próprio filho e vira o primeiro responsável");
    criados.push({ tabela: "children", id: filhoNovo });

    const { data: co, error: eCo } = await responsavel.from("child_guardians").insert({ organization_id: org, child_id: filhoNovo, guardian_person_id: mateus!.id, relationship: "tio", can_pickup: true }).select("id").single();
    confere(!eCo && !!co, "o responsável adiciona um co-responsável");
    /* co-responsável sem permissão de buscar e sem ser o principal */
    await admin.from("child_guardians").update({ can_pickup: false }).eq("id", co?.id ?? "");
    const coResp = estranho; /* Mateus agora é co-responsável do filho novo */
    const { data: vinculoMaria } = await admin.from("child_guardians").select("id").eq("child_id", filhoNovo).eq("guardian_person_id", maria!.id).single();
    const { data: coTirou } = await coResp.from("child_guardians").delete().eq("id", vinculoMaria!.id).select("id");
    confere((coTirou ?? []).length === 0, "co-responsável que não é o principal não tira o principal");
    const { data: coApagou } = await coResp.from("children").delete().eq("id", filhoNovo).select("id");
    confere((coApagou ?? []).length === 0, "co-responsável que não é o principal não apaga a ficha");
    const presFilho = await cria("kids_attendance", { organization_id: org, session_id: sessao, child_id: filhoNovo, status: "presente", dropped_off_via: "manual" });
    const { data: coPediu } = await coResp.from("kids_attendance").update({ status: "retirada_pendente" }).eq("id", presFilho).select("id");
    confere((coPediu ?? []).length === 0, "quem não pode buscar não pede a retirada");
    const { data: confirmou } = await responsavel.from("kids_attendance").update({ status: "retirado", picked_up_via: "manual" }).eq("id", presFilho).select("id");
    confere((confirmou ?? []).length === 0, "o responsável não confirma a retirada sozinho (é da equipe)");
    const { data: liderConfirmou } = await lider.from("kids_attendance").update({ status: "retirado", picked_up_via: "manual", picked_up_at: new Date().toISOString() }).eq("id", presFilho).select("id");
    confere((liderConfirmou ?? []).length === 1, "a equipe confirma a retirada");

    const { data: tirou } = await responsavel.from("child_guardians").delete().eq("id", co?.id ?? "").select("id");
    confere((tirou ?? []).length === 1, "o responsável principal remove o co-responsável");

    /* outra igreja: vínculo com organization_id diferente do da criança */
    const { data: outra } = await admin.from("churches").select("organization_id").neq("organization_id", org).limit(1).maybeSingle();
    if (outra) {
      const { error: eOrg } = await lider.from("child_guardians").insert({ organization_id: outra.organization_id, child_id: crianca, guardian_person_id: maria!.id });
      confere(!!eOrg, "vínculo com igreja diferente da criança é recusado");
    }

    const { error: eDup } = await responsavel.from("kids_attendance").insert({ organization_id: org, session_id: sessao, child_id: crianca, status: "presente", dropped_off_via: "qr" });
    confere(!!eDup, "check-in repetido na mesma sessão é recusado");
  } finally {
    /* o estranho pode ter criado um vínculo ou presença, se a regra falhar */
    for (const c of criados.filter((x) => x.tabela === "children")) { await admin.from("kids_attendance").delete().eq("child_id", c.id); await admin.from("child_guardians").delete().eq("child_id", c.id); }
    for (const c of criados.reverse()) await admin.from(c.tabela).delete().eq("id", c.id);
    console.log(falhas ? `\n${falhas} falha(s)` : "\nTudo certo");
    process.exit(falhas ? 1 : 0);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
