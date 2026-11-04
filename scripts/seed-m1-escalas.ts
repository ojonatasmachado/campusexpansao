// Seed adicional para M1: cria 4 escalas pendentes para membro@teste.local
// Uso: npx tsx scripts/seed-m1-escalas.ts
import { createClient } from "@supabase/supabase-js";

const URL = "http://127.0.0.1:54321";
const SERVICE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

if (!URL.startsWith("http://127.0.0.1")) throw new Error("só roda no Supabase local");

const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
const svc = admin.schema("service");

async function main() {
  // Buscar org e church da igreja teste
  const { data: churches } = await svc.from("churches").select("id,organization_id").limit(1);
  if (!churches?.length) throw new Error("nenhuma igreja encontrada; rode seed-local-service.ts primeiro");
  const { organization_id: org, id: church } = churches[0];

  // Buscar pessoa Maria Membro pelo email (mais confiável que nome)
  const { data: people } = await svc.from("people").select("id,name,email").eq("organization_id", org).eq("email", "membro@teste.local");
  const maria = people?.[0];
  if (!maria) throw new Error("Maria Membro não encontrada");

  // Buscar ministério Louvor e posição Vocal
  const { data: mins } = await svc.from("ministries").select("id,name").eq("organization_id", org);
  const louvor = mins?.find(m => m.name === "Louvor");
  if (!louvor) throw new Error("Ministério Louvor não encontrado");

  const { data: positions } = await svc.from("ministry_positions").select("id,ministry_id").eq("organization_id", org);
  const vocalPos = positions?.find(p => p.ministry_id === louvor.id);
  if (!vocalPos) throw new Error("Posição Vocal não encontrada");

  // Verificar quantas escalas wait já existem para Maria
  const { data: existing } = await svc.from("roster_assignments").select("id").eq("person_id", maria.id).eq("status", "wait");
  if ((existing?.length ?? 0) >= 4) {
    console.log(`Maria já tem ${existing!.length} escalas pendentes. Nada a fazer.`);
    return;
  }

  // Criar eventos futuros com escalas pendentes para Maria até completar 4
  const needed = 4 - (existing?.length ?? 0);
  const hoje = new Date();
  const inserts = [];
  for (let i = 1; i <= needed; i++) {
    const d = new Date(hoje.getTime() + i * 7 * 864e5);
    const diaCulto = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
    const nomeDia = ["domingo","segunda","terça","quarta","quinta","sexta","sábado"][d.getDay()];

    const { data: ev, error } = await svc.from("events").insert({
      organization_id: org, church_id: church,
      name: `Culto de ${nomeDia} (+${i}sem)`,
      kind: "Culto", event_date: diaCulto, time: "19:00",
    }).select("id").single();
    if (error || !ev) throw new Error(`evento ${i}: ${JSON.stringify(error)}`);

    inserts.push({
      organization_id: org, event_id: ev.id,
      position_id: vocalPos.id, person_id: maria.id,
      status: "wait",
    });
  }

  const { error } = await svc.from("roster_assignments").insert(inserts);
  if (error) throw new Error(`insert escalas: ${JSON.stringify(error)}`);

  console.log(`Pronto: ${inserts.length} escalas pendentes criadas para ${maria.name} (total: ${(existing?.length ?? 0) + inserts.length})`);
}

main().catch(e => { console.error(e); process.exit(1); });