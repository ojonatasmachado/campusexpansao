// Uso: npx tsx scripts/seed-local-service.ts && npx tsx scripts/seed-local-mapa.ts && npx tsx scripts/check-local-mapa.ts
//
// Regras do mapa da igreja no Supabase LOCAL (PLANO.md, seção 4):
// - master vê tudo; membro comum não vê o mapa da liderança;
// - quem recebe o mapa com uma área só recebe pontos de dentro dela;
// - "só números" não recebe ponto nenhum;
// - sem aceite do termo, o ponto vem sem nome (e some onde há menos de 3);
// - nenhuma função devolve endereço, menos a da emergência, que grava quem abriu;
// - outra igreja não enxerga nada desta.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { TEST_PASSWORD } from "./seed-local-service";

const URL = "http://127.0.0.1:54321";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
if (!URL.startsWith("http://127.0.0.1")) throw new Error("check-local-mapa só roda no Supabase local");
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } }).schema("service");

async function as(email: string): Promise<SupabaseClient> {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: TEST_PASSWORD });
  if (error) throw error;
  return c;
}

let falhas = 0;
function confere(o_que: string, ok: boolean, detalhe = "") {
  console.log(`${ok ? "ok   " : "FALHA"} ${o_que}${detalhe ? ` (${detalhe})` : ""}`);
  if (!ok) falhas++;
}

async function main() {
  const { data: igreja } = await admin.from("churches").select("organization_id").eq("name", "Igreja Teste Local").single();
  const org = igreja!.organization_id as string;

  /* área de teste para o líder: Setor Leste (Jardim Aurora + Vila Esperança) */
  const master = (await as("master@teste.local")).schema("service");
  await admin.from("map_access").delete().eq("organization_id", org);
  await admin.from("map_areas").delete().eq("organization_id", org);
  const { data: areaId, error: eArea } = await master.rpc("mapa_salvar_area", { p_org: org, p_id: null, p_nome: "Setor Leste", p_tipo: "setor", p_cor: "olive", p_responsavel: null, p_bairros: ["3550308001", "3550308002"], p_geojson: null });
  confere("master cria área juntando bairros", !eArea && !!areaId, eArea?.message);

  /* master */
  const { data: mPessoas, error: e1 } = await master.rpc("mapa_pessoas", { p_org: org });
  const pessoasM = (mPessoas ?? []) as { nome: string | null; anonimo: boolean; latitude: number }[];
  confere("master recebe pontos", !e1 && pessoasM.length > 50, `${pessoasM.length}`);
  confere("ponto sem aceite vem sem nome", pessoasM.filter((p) => p.anonimo).every((p) => p.nome === null));
  confere("coordenada arredondada (3 casas)", pessoasM.every((p) => Math.abs(p.latitude * 1000 - Math.round(p.latitude * 1000)) < 1e-6));
  confere("nenhum campo de endereço sai em mapa_pessoas", pessoasM.every((p) => !("street" in p) && !("rua" in p) && !("street_number" in p)));
  const { data: tot } = await master.rpc("mapa_totais", { p_org: org });
  const t = (tot as { com_ponto: number; com_nome: number }[])[0];
  confere("anônimos isolados somem do mapa e ficam só nos números", pessoasM.length < t.com_ponto, `${pessoasM.length} pontos de ${t.com_ponto}`);

  /* membro comum: sem mapa da liderança */
  const membro = (await as("membro2@teste.local")).schema("service");
  const { data: aM } = await membro.rpc("mapa_acesso", { p_org: org });
  confere("membro comum não tem o mapa", (aM as { pode: boolean }[])[0]?.pode === false);
  const { error: eMembro } = await membro.rpc("mapa_pessoas", { p_org: org });
  confere("membro comum não recebe pontos", !!eMembro);
  const { data: locais, error: eLocais } = await membro.rpc("mapa_locais_publicos", { p_org: org });
  confere("membro vê igrejas e células (Onde)", !eLocais && ((locais ?? []) as unknown[]).length >= 3);

  /* líder com o Setor Leste */
  const { data: lider } = await admin.from("people").select("id").eq("organization_id", org).eq("email", "lider@teste.local").single();
  await admin.from("map_access").insert({ person_id: lider!.id, organization_id: org, escopo: "area", area_id: areaId, detalhe: "pessoas", pode_mesa: true, pode_csv: false, pode_editar: false });
  const liderDb = (await as("lider@teste.local")).schema("service");
  const { data: lPessoas, error: e2 } = await liderDb.rpc("mapa_pessoas", { p_org: org });
  const pessoasL = (lPessoas ?? []) as { latitude: number; longitude: number }[];
  const dentro = pessoasL.every((p) => p.latitude > -23.56 && p.latitude < -23.515 && p.longitude > -46.61 && p.longitude < -46.575);
  confere("líder com área só recebe pontos de dentro dela", !e2 && pessoasL.length > 0 && pessoasL.length < pessoasM.length && dentro, `${pessoasL.length}`);
  const { error: eCsv } = await liderDb.rpc("mapa_registrar_csv", { p_org: org, p_partes: ["pessoas"], p_regioes: [], p_linhas: 1 });
  confere("líder sem liberação de CSV não registra download", !!eCsv);
  const { error: eArea2 } = await liderDb.rpc("mapa_salvar_area", { p_org: org, p_id: null, p_nome: "X", p_tipo: "setor", p_cor: "olive", p_responsavel: null, p_bairros: ["3550308003"], p_geojson: null });
  confere("líder sem liberação de edição não cria área", !!eArea2);
  const { error: eEmerg } = await liderDb.rpc("mapa_emergencias", { p_org: org });
  confere("líder não coordena emergência", !!eEmerg);

  /* só números */
  await admin.from("map_access").update({ detalhe: "numeros" }).eq("person_id", lider!.id);
  const { data: lNum } = await liderDb.rpc("mapa_pessoas", { p_org: org });
  confere("'só números' não recebe ponto", ((lNum ?? []) as unknown[]).length === 0);
  const { data: lReg, error: eReg } = await liderDb.rpc("mapa_regioes", { p_org: org, p_nivel: "bairro" });
  confere("'só números' recebe as regiões da área", !eReg && ((lReg ?? []) as unknown[]).length > 0 && ((lReg ?? []) as unknown[]).length < 9, `${((lReg ?? []) as unknown[]).length}`);

  /* outra igreja */
  const outra = (await as("outra@teste.local")).schema("service");
  const { error: eOutra } = await outra.rpc("mapa_pessoas", { p_org: org });
  confere("outra igreja não vê os pontos desta", !!eOutra);
  const { error: eOutraL } = await outra.rpc("mapa_locais_publicos", { p_org: org });
  confere("outra igreja não vê os locais desta", !!eOutraL);

  /* emergência: endereço com registro */
  const { data: emId, error: eAbrir } = await master.rpc("mapa_emergencia_abrir", { p_org: org, p_titulo: "Teste", p_geojson: { type: "Polygon", coordinates: [[[-46.61, -23.54], [-46.585, -23.54], [-46.585, -23.515], [-46.61, -23.515], [-46.61, -23.54]]] } });
  confere("master abre emergência", !eAbrir && !!emId, eAbrir?.message);
  const { data: fams } = await master.rpc("mapa_emergencia_familias", { p_id: emId });
  const f = ((fams ?? []) as { contato_member_id: string }[])[0];
  confere("emergência lista famílias da área", !!f);
  if (f) {
    const { data: end, error: eEnd } = await master.rpc("mapa_revelar_endereco", { p_id: emId, p_member_id: f.contato_member_id });
    confere("quem coordena abre o endereço", !eEnd && ((end ?? []) as unknown[]).length === 1);
    const { data: aberturas } = await master.rpc("mapa_emergencia_aberturas", { p_id: emId });
    confere("a abertura fica registrada", ((aberturas ?? []) as unknown[]).length >= 1);
    await master.rpc("mapa_emergencia_encerrar", { p_id: emId });
    const { error: eFechada } = await master.rpc("mapa_revelar_endereco", { p_id: emId, p_member_id: f.contato_member_id });
    confere("emergência encerrada não abre mais endereço", !!eFechada);
  }

  /* consentimento pelo próprio membro */
  const maria = (await as("membro@teste.local")).schema("service");
  const { data: fichaMaria } = await admin.from("members").select("id").eq("organization_id", org).eq("email", "membro@teste.local").single();
  const { error: eCons } = await maria.rpc("mapa_consentimento", { p_member_id: fichaMaria!.id, p_aceita: false, p_origem: "perfil", p_termo: "2026-10-21" });
  const { data: depois } = await admin.from("members").select("map_consent_at, map_consent_declined_at").eq("id", fichaMaria!.id).single();
  confere("membro desliga o nome no mapa pelo Perfil", !eCons && depois?.map_consent_at === null && !!depois?.map_consent_declined_at);
  const { error: eOutroMembro } = await membro.rpc("mapa_consentimento", { p_member_id: fichaMaria!.id, p_aceita: true, p_origem: "perfil", p_termo: "2026-10-21" });
  confere("ninguém muda o aceite de outra pessoa", !!eOutroMembro);
  await maria.rpc("mapa_consentimento", { p_member_id: fichaMaria!.id, p_aceita: true, p_origem: "perfil", p_termo: "2026-10-21" });

  /* revisão de 2026-10-21 */
  const { data: alvo } = await admin.from("members").select("id, map_consent_at").eq("organization_id", org).is("map_consent_at", null).limit(1).single();
  await master.from("members").update({ map_consent_at: new Date().toISOString() }).eq("id", alvo!.id);
  const { data: alvoDepois } = await admin.from("members").select("map_consent_at").eq("id", alvo!.id).single();
  confere("liderança não grava aceite pela ficha", alvoDepois?.map_consent_at === null);

  const { data: pequena } = await master.rpc("mapa_area_previa", { p_org: org, p_bairros: [], p_geojson: { type: "Polygon", coordinates: [[[-46.598, -23.528], [-46.5975, -23.528], [-46.5975, -23.5275], [-46.598, -23.5275], [-46.598, -23.528]]] } });
  confere("prévia de área minúscula não conta pessoas", ((pequena ?? []) as { pessoas: number }[])[0]?.pessoas === -1);

  const { data: regs } = await master.rpc("mapa_regioes", { p_org: org, p_nivel: "bairro" });
  confere("região com 1 ou 2 pessoas não mostra '1 a cada'", ((regs ?? []) as { pessoas: number; um_a_cada: number | null }[]).every((r) => r.pessoas !== -1 || r.um_a_cada === null));

  const { error: eRota } = await master.from("map_routes").insert({ organization_id: org, nome: "Teste", objetivo: "oracao", paradas: [] });
  confere("master salva rota", !eRota, eRota?.message);
  /* líder com uma área e permissão de editar: não lê rota alheia nem redesenha o próprio recorte */
  await admin.from("map_access").upsert({ person_id: lider!.id, organization_id: org, escopo: "area", area_id: areaId, detalhe: "pessoas", pode_mesa: true, pode_csv: false, pode_editar: true });
  const { data: rotasLider } = await liderDb.from("map_routes").select("id").eq("organization_id", org);
  confere("líder com área não lê rota de outra pessoa", ((rotasLider ?? []) as unknown[]).length === 0);
  const { error: eAreaLider } = await liderDb.rpc("mapa_salvar_area", { p_org: org, p_id: null, p_nome: "Y", p_tipo: "setor", p_cor: "olive", p_responsavel: null, p_bairros: ["3550308003"], p_geojson: null });
  confere("líder com área não cria nem aumenta áreas", !!eAreaLider);
  await admin.from("map_routes").delete().eq("organization_id", org);

  const { error: eGrande } = await master.rpc("mapa_emergencia_abrir", { p_org: org, p_titulo: "Cidade", p_geojson: { type: "Polygon", coordinates: [[[-46.8, -23.7], [-46.4, -23.7], [-46.4, -23.4], [-46.8, -23.4], [-46.8, -23.7]]] } });
  confere("emergência do tamanho da cidade é recusada", !!eGrande);

  await admin.from("map_access").delete().eq("organization_id", org);
  console.log(falhas ? `\n${falhas} falha(s).` : "\nTudo certo.");
  process.exit(falhas ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
