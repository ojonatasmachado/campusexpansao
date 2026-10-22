// Uso: npx tsx scripts/seed-local-volume.ts   (depois de seed-local-service.ts)
//
// Enche a "Igreja Teste Local" do Supabase LOCAL com volume de igreja real
// pra testar usabilidade com dado de verdade: ~300 pessoas com a {Caminhada}
// em estágios diferentes (cada passo com data), nomes longos, 6 times com
// funções, cultos das próximas 4 semanas com escala, {Grupos}, visitantes,
// crianças com responsáveis, pedidos de oração e avisos. Recusa rodar fora de
// 127.0.0.1. Rodar de novo não duplica: sai se já houver volume.

import { createClient } from "@supabase/supabase-js";

const URL = "http://127.0.0.1:54321";
const SERVICE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
if (!URL.startsWith("http://127.0.0.1")) throw new Error("seed-local-volume só roda no Supabase local");

const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
const svc = admin.schema("service");

/* sorteio repetível: o mesmo banco sai sempre igual */
let semente = 42;
const rnd = () => ((semente = (semente * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = <T,>(xs: T[]): T => xs[Math.floor(rnd() * xs.length)];
const chance = (p: number) => rnd() < p;

const NOMES_F = ["Ana", "Maria", "Juliana", "Fernanda", "Beatriz", "Larissa", "Camila", "Patrícia", "Aline", "Bruna", "Raquel", "Débora", "Ester", "Priscila", "Tatiane", "Vitória", "Isabela", "Maria Eduarda", "Ana Clara", "Jéssica"];
const NOMES_M = ["João", "Pedro", "Lucas", "Mateus", "Gabriel", "Rafael", "Daniel", "Thiago", "Bruno", "André", "Felipe", "Samuel", "Davi", "Josué", "Caleb", "Marcos", "Paulo", "João Pedro", "Carlos Eduardo", "Luiz Fernando"];
const SOBRENOMES = ["Silva", "Santos", "Oliveira", "Souza", "Lima", "Pereira", "Costa", "Ferreira", "Almeida", "Nascimento", "Carvalho", "Ribeiro", "Gomes", "Martins", "Araújo", "Rocha", "Barbosa", "Cavalcanti", "Albuquerque", "Vasconcelos"];
const LONGOS = ["Maria Aparecida dos Santos Albuquerque de Vasconcelos", "Francisco de Assis Cavalcanti Nascimento Filho", "Ana Beatriz Fernandes de Oliveira e Souza Rocha", "José Wellington Bezerra da Costa Júnior Neto"];
const BAIRROS = ["Vila Mariana", "Jardim das Flores", "Centro", "Parque São Lucas", "Vila Esperança", "Jardim Botânico", "Conjunto Habitacional Presidente Juscelino Kubitschek", "Moema"];
const OCASIOES = ["Culto de domingo", "Culto de jovens", "Conferência de família", "Batismo nas águas"];

const hoje = new Date();
const dia = (offset: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(hoje.getTime() + offset * 864e5));
const br = (iso: string) => iso.split("-").reverse().join("/");
const chave = (iso: string) => Number(iso.replaceAll("-", ""));

function nomePessoa(i: number): { nome: string; sex: "masculino" | "feminino" } {
  if (i % 75 === 7) return { nome: LONGOS[(i / 75) | 0 % LONGOS.length] ?? LONGOS[0], sex: i % 2 ? "masculino" : "feminino" };
  const sex = chance(0.55) ? "feminino" : "masculino";
  const n = pick(sex === "feminino" ? NOMES_F : NOMES_M);
  return { nome: `${n} ${pick(SOBRENOMES)}${chance(0.4) ? " " + pick(SOBRENOMES) : ""}`, sex };
}

async function ins<T = { id: string }>(tabela: string, linhas: object[], cols = "id"): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < linhas.length; i += 200) {
    const { data, error } = await svc.from(tabela).insert(linhas.slice(i, i + 200)).select(cols);
    if (error) throw new Error(`${tabela}: ${error.message}`);
    out.push(...(data as T[]));
  }
  return out;
}

async function main() {
  const { data: ig } = await svc.from("churches").select("id,organization_id").eq("name", "Igreja Teste Local").single();
  if (!ig) throw new Error("Rode antes: npx tsx scripts/seed-local-service.ts");
  const org = ig.organization_id as string, church = ig.id as string;
  const { count } = await svc.from("members").select("id", { count: "exact", head: true }).eq("organization_id", org).like("email", "pessoa%@teste.local");
  if (count) return console.log(`Já tem volume (${count} pessoas deste seed). Pra recomeçar: supabase db reset e os dois seeds.`);

  /* {Grupos} */
  const grupos = await ins("fellowship_groups", BAIRROS.map((b, i) => ({
    organization_id: org, church_id: church, name: `${["Família", "Jovens", "Casais", "Mulheres"][i % 4]} ${b}`,
    weekday: ["terça", "quarta", "quinta", "sexta"][i % 4], time: "20:00", neighborhood: b, city: "São Paulo", state: "SP", country: "BR", capacity: 15,
  })));

  /* 300 pessoas; a Caminhada (decisão, batismo, curso, {Grupo}, servindo) avança em ordem, cada passo com data */
  const membros: object[] = [];
  const caminhos: number[][] = [];
  for (let i = 0; i < 300; i++) {
    const { nome, sex } = nomePessoa(i);
    const nivel = Math.min(5, Math.floor(rnd() * 6.5));
    const journey = [0, 1, 2, 3, 4].map((k) => (k < nivel ? 1 : 0));
    caminhos.push(journey);
    membros.push({
      organization_id: org, church_id: church, name: nome, sex,
      email: `pessoa${i + 1}@teste.local`, phone: `(11) 9${String(8000_0000 + i * 137).slice(0, 4)}-${String(1000 + i).slice(-4)}`,
      birth: `${String(1 + (i % 28)).padStart(2, "0")}/${String(1 + (i % 12)).padStart(2, "0")}/${1950 + (i % 60)}`,
      since_year: String(2005 + (i % 21)), situation: nivel >= 2 ? "membro" : "novo", neighborhood: pick(BAIRROS),
      marital_status: pick(["solteiro", "casado", "casado", "uniao_estavel", "viuvo"]), journey,
      group_id: journey[3] ? pick(grupos).id : null, city: "São Paulo", state: "SP", country: "BR",
    });
  }
  const ms = await ins<{ id: string; name: string }>("members", membros, "id,name");

  const fatos: object[] = [];
  const tipos = ["decisao", "batismo", "curso", "grupo", "time"];
  const titulos = ["Decisão", "Batismo", "Concluiu o curso de membros", "Entrou num {Grupo}", "Começou a servir"];
  ms.forEach((m, i) => {
    let d = -900 + Math.floor(rnd() * 400);
    caminhos[i].forEach((feito, k) => {
      if (!feito) return;
      d += 20 + Math.floor(rnd() * 120);
      const iso = dia(Math.min(d, -1));
      fatos.push({ organization_id: org, member_id: m.id, event_type: tipos[k], title: titulos[k], body: k === 0 ? pick(OCASIOES) : null, sort_key: chave(iso), when_label: br(iso) });
    });
  });
  await ins("timeline_events", fatos);

  /* quem serve (último passo) vira voluntário com cadastro em people */
  const servem = ms.filter((_, i) => caminhos[i][4]);
  const people = await ins<{ id: string; name: string }>("people", servem.map((m, i) => ({
    organization_id: org, church_id: church, name: m.name, email: `pessoa-v${i}@teste.local`, status: pick(["ativo", "ativo", "ativo", "pausa", "ferias"]),
  })), "id,name");
  for (let i = 0; i < servem.length; i += 100) {
    await Promise.all(servem.slice(i, i + 100).map((m, j) => svc.from("members").update({ volunteer_id: people[i + j].id }).eq("id", m.id)));
  }

  /* 6 times com funções; Louvor e Recepção já existem no seed base */
  const TIMES: [string, string, string[]][] = [
    ["Mídia e Transmissão ao Vivo", "midia", ["Câmera", "Projeção", "Mesa de som"]],
    ["Kids", "kids", ["Professor", "Auxiliar", "Recepção kids"]],
    ["Intercessão", "oracao", ["Intercessor"]],
    ["Diaconia e Ação Social", "diaconia", ["Diácono", "Cozinha"]],
    ["Estacionamento", "recepcao", ["Orientador"]],
    ["Teatro e Dança", "louvor", ["Ator", "Bailarino"]],
  ];
  const mins = await ins<{ id: string; name: string }>("ministries", TIMES.map(([name, icon]) => ({ organization_id: org, church_id: church, name, icon, app_modules: [] })), "id,name");
  const posLinhas = mins.flatMap((m, k) => TIMES[k][2].map((p, s) => ({ organization_id: org, ministry_id: m.id, name: p, need_count: 1 + (s % 3), sort_order: s })));
  const pos = await ins<{ id: string; ministry_id: string }>("ministry_positions", posLinhas, "id,ministry_id");
  const vinculos: object[] = [];
  people.forEach((p, i) => {
    const m = mins[i % mins.length];
    vinculos.push({ organization_id: org, ministry_id: m.id, person_id: p.id, is_leader: i < mins.length });
    if (chance(0.25)) vinculos.push({ organization_id: org, ministry_id: mins[(i + 2) % mins.length].id, person_id: p.id, is_leader: false });
  });
  await ins("person_ministries", vinculos, "person_id");

  /* cultos de domingo e quarta nas próximas 4 semanas, com escala cheia */
  const eventos: object[] = [];
  for (let d = 0; d < 28; d++) {
    const iso = dia(d), wd = new Date(`${iso}T12:00:00`).getDay();
    if (wd === 0) eventos.push({ organization_id: org, church_id: church, name: "Culto de domingo", kind: "Culto", event_date: iso, time: "18:00", location: "Templo principal" });
    if (wd === 0) eventos.push({ organization_id: org, church_id: church, name: "Culto da manhã", kind: "Culto", event_date: iso, time: "09:30", location: "Templo principal" });
    if (wd === 3) eventos.push({ organization_id: org, church_id: church, name: "Culto de ensino e oração", kind: "Culto", event_date: iso, time: "20:00", location: "Salão 2" });
  }
  eventos.push({ organization_id: org, church_id: church, name: "Conferência de Jovens: Geração que Permanece", kind: "Evento", event_date: dia(18), time: "19:30", location: "Ginásio municipal" });
  const evs = await ins("events", eventos);
  const porTime = new Map<string, string[]>();
  vinculos.forEach((v) => { const x = v as { ministry_id: string; person_id: string }; porTime.set(x.ministry_id, [...(porTime.get(x.ministry_id) ?? []), x.person_id]); });
  const escala: object[] = [];
  evs.forEach((e) => pos.forEach((p) => {
    const gente = porTime.get(p.ministry_id) ?? [];
    if (gente.length && chance(0.8)) escala.push({ organization_id: org, event_id: e.id, position_id: p.id, person_id: pick(gente), status: pick(["ok", "ok", "wait", "wait", "no"]) });
  }));
  await ins("roster_assignments", escala);

  /* a Maria (membro@teste.local) entra em várias escalas pra ver o próprio app cheio */
  const { data: maria } = await svc.from("people").select("id").eq("organization_id", org).eq("email", "membro@teste.local").single();
  if (maria) {
    await ins("person_ministries", [{ organization_id: org, ministry_id: mins[0].id, person_id: maria.id, is_leader: false }], "person_id");
    const p0 = pos.find((p) => p.ministry_id === mins[0].id)!;
    await ins("roster_assignments", evs.slice(0, 5).map((e, i) => ({ organization_id: org, event_id: e.id, position_id: p0.id, person_id: maria.id, status: i % 2 ? "ok" : "wait" })));
  }

  /* visitantes em todas as etapas */
  await ins("visitors", Array.from({ length: 40 }, (_, i) => {
    const { nome } = nomePessoa(1000 + i);
    return { organization_id: org, church_id: church, name: nome, phone: `(11) 97${String(100000 + i * 911).slice(0, 3)}-${String(2000 + i)}`, stage: pick(["novo", "novo", "contato", "integrando"]), visited_on: br(dia(-Math.floor(rnd() * 60))), origin: pick(["culto", "qr", "link", "amigo"]), due_status: pick(["soon", "ok", "late"]) };
  }));

  /* crianças com responsável principal (o responsável é voluntário em people) */
  const turmas = await ins("kids_classes", [["Berçário", 0, 23], ["Maternal", 24, 71], ["Primários", 72, 95], ["Juniores", 96, 143]].map(([name, a, b]) => ({ organization_id: org, church_id: church, name, min_age_months: a, max_age_months: b, capacity: 20 })));
  const criancas = await ins("children", Array.from({ length: 45 }, (_, i) => {
    const idade = 1 + (i % 11);
    return { organization_id: org, church_id: church, class_id: turmas[Math.min(3, Math.floor(idade / 3))].id, name: `${pick([...NOMES_F, ...NOMES_M])} ${pick(SOBRENOMES)}`, birth: `${new Date().getFullYear() - idade}-0${1 + (i % 9)}-1${i % 9}`, gender: pick(["menino", "menina"]), allergies: chance(0.15) ? "Amendoim e lactose" : null, image_authorized: chance(0.8) };
  }));
  await ins("child_guardians", criancas.map((c, i) => ({ organization_id: org, child_id: c.id, guardian_person_id: people[i % people.length].id, relationship: pick(["mãe", "pai", "avó"]), can_pickup: true, is_primary: true })));

  /* oração e avisos */
  const PEDIDOS = ["Pela saúde da minha mãe, que faz cirurgia na próxima semana.", "Por uma porta de emprego, estou há quatro meses procurando.", "Gratidão pela cura do meu filho!", "Pela restauração do meu casamento.", "Pelas provas da faculdade."];
  await ins("prayer_requests", Array.from({ length: 25 }, (_, i) => ({ organization_id: org, church_id: church, member_id: ms[i * 7].id, kind: "oracao", body: pick(PEDIDOS), status: pick(["aberto", "aberto", "em_contato", "resolvido"]), audience: pick(["intercessao", "mural"]), category: pick(["saude", "familia", "trabalho", "espiritual", "gratidao"]), moderation: "ativo", is_private: false, anonymous: chance(0.2) })));
  await ins("announcements", [
    { title: "Inscrições abertas para a Conferência de Jovens", body: "Garanta sua vaga até sexta. Vagas limitadas.", kind: "evento" },
    { title: "Campanha do agasalho", body: "Traga roupas e cobertores em bom estado até o fim do mês.", kind: "acao" },
    { title: "Novo horário do culto da manhã", body: "A partir do próximo domingo, começamos às 9h30.", kind: "aviso" },
    { title: "Batismo nas águas: entrevista com os candidatos", body: "Quem fez a decisão e quer se batizar, fale com a secretaria depois do culto.", kind: "aviso" },
    { title: "Mutirão de limpeza do templo no sábado de manhã, com café da manhã para todos os voluntários que participarem", body: "Das 8h às 12h.", kind: "acao" },
  ].map((a) => ({ ...a, organization_id: org, church_id: church, status: "publicado", audience: "todos" })));

  console.log(`Pronto: ${ms.length} pessoas, ${people.length} voluntários, ${evs.length} cultos/eventos, ${escala.length} escalas, 40 visitantes, ${criancas.length} crianças.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
