// Uso: npx tsx scripts/seed-local-mapa.ts
//
// Dados fictícios do mapa da igreja no Supabase LOCAL, por cima de
// scripts/seed-local-service.ts ("Igreja Teste Local"): 150 pessoas
// concentradas em 3 regiões de São Paulo, 2 congregações, 8 células com
// endereço e lotação, centros de CEP (como se viessem do CNEFE) e consentimento
// variado. Rodar de novo apaga e recria só o que este script criou.

import { createClient } from "@supabase/supabase-js";

const URL = "http://127.0.0.1:54321";
const SERVICE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
if (!URL.startsWith("http://127.0.0.1")) throw new Error("seed-local-mapa só roda no Supabase local");
const db = createClient(URL, SERVICE, { auth: { persistSession: false } }).schema("service");

/* gerador fixo: mesma saída a cada execução */
let semente = 42;
const rnd = () => { semente = (semente * 16807) % 2147483647; return (semente - 1) / 2147483646; };
const escolher = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];

const NOMES = ["Ana", "Bruno", "Carla", "Daniel", "Elisa", "Felipe", "Gabriela", "Hugo", "Isabela", "João", "Karina", "Leonardo", "Mariana", "Nicolas", "Olívia", "Paulo", "Quésia", "Rafael", "Sara", "Tiago", "Úrsula", "Vitor", "Wesley", "Yasmin", "Zacarias", "Débora", "Elias", "Noemi", "Otávio", "Priscila"];
const SOBRENOMES = ["Ribeiro", "Menezes", "Lins", "Prado", "Couto", "Rios", "Matos", "Duarte", "Freitas", "Amaral", "Siqueira", "Torres", "Brandão", "Nunes", "Teles", "Moraes", "Pacheco", "Lacerda"];

/* regiões fictícias: centro aproximado e quantas pessoas */
const REGIOES = [
  { bairro: "Jardim Aurora", lat: -23.528, lng: -46.598, n: 41, prefixo: "02511" },
  { bairro: "Vila Esperança", lat: -23.547, lng: -46.588, n: 38, prefixo: "03041" },
  { bairro: "Centro", lat: -23.550, lng: -46.634, n: 22, prefixo: "01011" },
  { bairro: "Parque das Palmeiras", lat: -23.571, lng: -46.600, n: 21, prefixo: "04101" },
  { bairro: "Recanto Verde", lat: -23.580, lng: -46.640, n: 9, prefixo: "04011" },
  { bairro: "Bela Vista", lat: -23.523, lng: -46.640, n: 6, prefixo: "01321" },
  { bairro: "São Bento", lat: -23.552, lng: -46.680, n: 5, prefixo: "05011" },
  { bairro: "Nova Canaã", lat: -23.590, lng: -46.680, n: 4, prefixo: "05611" },
  { bairro: "Morada do Sol", lat: -23.515, lng: -46.670, n: 4, prefixo: "05021" },
];
const MARCA = "seed-mapa";
/* moradores fictícios por bairro: 3 lacunas evidentes (Bela Vista, São Bento, Nova Canaã) */
const MORADORES: Record<string, number> = { "Jardim Aurora": 18400, "Vila Esperança": 26300, "Centro": 24100, "Parque das Palmeiras": 17400, "Recanto Verde": 8700, "Bela Vista": 31200, "São Bento": 28600, "Nova Canaã": 27900, "Morada do Sol": 9800 };

async function main() {
  const { data: igreja } = await db.from("churches").select("id, organization_id").eq("name", "Igreja Teste Local").single();
  if (!igreja) throw new Error("Rode antes: npx tsx scripts/seed-local-service.ts");
  const org = igreja.organization_id as string;

  /* limpa o que este script criou */
  await db.from("members").delete().eq("organization_id", org).eq("first_contact", MARCA);
  await db.from("fellowship_groups").delete().eq("organization_id", org).like("name", "Célula %");
  await db.from("churches").delete().eq("organization_id", org).like("name", "Congregação %");
  await db.from("cep_centros").delete().eq("fonte", MARCA);

  /* centros de CEP: 6 CEPs por região, espalhados em ~600 m */
  const ceps: { cep: string; bairro: string; latitude: number; longitude: number }[] = [];
  for (const r of REGIOES) {
    for (let i = 0; i < 6; i++) {
      ceps.push({ cep: `${r.prefixo}${String(100 + i * 7).padStart(3, "0")}`, bairro: r.bairro, latitude: r.lat + (rnd() - 0.5) * 0.012, longitude: r.lng + (rnd() - 0.5) * 0.012 });
    }
  }
  const { error: e1 } = await db.from("cep_centros").upsert(ceps.map((c) => ({ cep: c.cep, municipio_ibge: "3550308", latitude: c.latitude, longitude: c.longitude, enderecos: 40, fonte: MARCA })));
  if (e1) throw e1;
  const cepsDe = (bairro: string) => ceps.filter((c) => c.bairro === bairro);

  /* sede e congregações */
  const sedeCep = cepsDe("Centro")[0];
  await db.from("churches").update({ postal_code: sedeCep.cep, address: "Rua da Matriz, 100", neighborhood: "Centro", city: "São Paulo", state: "SP" }).eq("id", igreja.id);
  const { error: e2 } = await db.from("churches").insert([
    { organization_id: org, name: "Congregação Vila Esperança", is_headquarters: false, postal_code: cepsDe("Vila Esperança")[1].cep, address: "Av. Esperança, 820", neighborhood: "Vila Esperança", city: "São Paulo" },
    { organization_id: org, name: "Congregação Parque das Palmeiras", is_headquarters: false, postal_code: cepsDe("Parque das Palmeiras")[2].cep, address: "Rua das Palmeiras, 55", neighborhood: "Parque das Palmeiras", city: "São Paulo" },
  ]);
  if (e2) throw e2;

  /* líderes de célula: pessoas do seed base */
  const { data: pessoas } = await db.from("people").select("id, name").eq("organization_id", org);
  const lider = (n: string) => pessoas?.find((p) => (p.name as string).startsWith(n))?.id ?? null;
  const celulas = [
    { name: "Célula Aurora 1", bairro: "Jardim Aurora", dia: "Quinta-feira", hora: "20h", lider: lider("Lucas"), cap: 15 },
    { name: "Célula Aurora 2", bairro: "Jardim Aurora", dia: "Terça-feira", hora: "19h30", lider: lider("Maria"), cap: 12 },
    { name: "Célula Aurora 3", bairro: "Jardim Aurora", dia: "Sábado", hora: "17h", lider: lider("Marta"), cap: 15 },
    { name: "Célula Esperança 1", bairro: "Vila Esperança", dia: "Quarta-feira", hora: "20h", lider: lider("Lucas"), cap: 15 },
    { name: "Célula Esperança 2", bairro: "Vila Esperança", dia: "Sexta-feira", hora: "20h", lider: lider("Mateus"), cap: 10 },
    { name: "Célula Centro", bairro: "Centro", dia: "Quinta-feira", hora: "19h", lider: lider("Marta"), cap: 20 },
    { name: "Célula Palmeiras", bairro: "Parque das Palmeiras", dia: "Terça-feira", hora: "20h", lider: lider("Maria"), cap: 12 },
    { name: "Célula Recanto", bairro: "Recanto Verde", dia: "Segunda-feira", hora: "20h", lider: lider("Lucas"), cap: 10 },
  ];
  const { data: grupos, error: e3 } = await db.from("fellowship_groups").insert(celulas.map((c, i) => ({
    organization_id: org, church_id: igreja.id, name: c.name, weekday: c.dia, time: c.hora, leader_person_id: c.lider,
    postal_code: cepsDe(c.bairro)[3 + (i % 3)].cep, street_number: String(100 + i * 37), neighborhood: c.bairro, city: "São Paulo", capacity: c.cap,
  }))).select("id, name");
  if (e3) throw e3;
  const grupoDo = (bairro: string) => (grupos ?? []).filter((g) => celulas.find((c) => c.name === g.name)?.bairro === bairro);

  /* 150 pessoas; regiões sem célula ficam sem grupo ("descobertos") */
  const linhas = [];
  for (const r of REGIOES) {
    const gs = grupoDo(r.bairro);
    for (let i = 0; i < r.n; i++) {
      const nome = `${escolher(NOMES)} ${escolher(SOBRENOMES)}`;
      const cep = escolher(cepsDe(r.bairro)).cep;
      const consentiu = rnd() < 0.65;
      const anos = 2018 + Math.floor(rnd() * 8);
      linhas.push({
        organization_id: org, church_id: igreja.id, name: nome, first_contact: MARCA,
        situation: rnd() < 0.15 ? "novo" : "membro", postal_code: cep, neighborhood: r.bairro, city: "São Paulo", state: "SP", country: "Brasil",
        group_id: gs.length && rnd() < 0.7 ? escolher(gs).id : null,
        since_year: String(anos),
        created_at: new Date(Date.UTC(anos, Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 27))).toISOString(),
        map_consent_at: consentiu ? new Date().toISOString() : null,
        map_consent_declined_at: !consentiu && rnd() < 0.5 ? new Date().toISOString() : null,
        map_consent_source: consentiu ? "app" : null,
        map_consent_terms: consentiu ? "2026-10-21" : null,
      });
    }
  }
  const { error: e4 } = await db.from("members").insert(linhas);
  if (e4) throw e4;

  /* membros do seed base também ganham CEP (Maria no Jardim Aurora, com nome no mapa) */
  await db.from("members").update({ postal_code: cepsDe("Jardim Aurora")[0].cep, map_consent_at: new Date().toISOString(), map_consent_source: "app", map_consent_terms: "2026-10-21" }).eq("organization_id", org).eq("email", "membro@teste.local");
  await db.from("members").update({ postal_code: cepsDe("Vila Esperança")[0].cep }).eq("organization_id", org).eq("email", "lider@teste.local");

  /* IBGE fictício: cada bairro é um quadrado de ~2,4 km dividido em 4 setores */
  await db.from("ibge_setores").delete().eq("fonte", MARCA);
  const setores = [];
  for (const [i, r] of REGIOES.entries()) {
    const h = 0.011;
    for (let q = 0; q < 4; q++) {
      const x0 = r.lng - h + (q % 2) * h, y0 = r.lat - h + Math.floor(q / 2) * h;
      setores.push({
        codigo: `3550308${String(i + 1).padStart(4, "0")}${q}000`, municipio_ibge: "3550308", bairro_codigo: `3550308${String(i + 1).padStart(3, "0")}`,
        moradores: Math.round(MORADORES[r.bairro] / 4 * (0.8 + rnd() * 0.4)), area_km2: 1.5,
        geom: `SRID=4326;MULTIPOLYGON(((${x0} ${y0},${x0 + h} ${y0},${x0 + h} ${y0 + h},${x0} ${y0 + h},${x0} ${y0})))`, fonte: MARCA,
      });
    }
  }
  const { error: e5 } = await db.from("ibge_setores").insert(setores);
  if (e5) throw e5;
  const nomes = Object.fromEntries(REGIOES.map((r, i) => [`3550308${String(i + 1).padStart(3, "0")}`, r.bairro]));
  const { error: e6 } = await db.rpc("mapa_montar_bairros", { p_municipio: "3550308", p_nomes: nomes });
  if (e6) throw e6;

  /* pontos do OpenStreetMap fictícios (o job mensal grava neste formato) */
  const poi = (cat: string, n: number) => REGIOES.flatMap((r, i) => Array.from({ length: n }, (_, k) => ({ osm_id: `node/${cat}${i}${k}`, nome: cat === "onibus" ? "" : `${{ escolas: "Escola", saude: "Posto de saúde", igrejas: "Igreja" }[cat] ?? "Ponto"} ${r.bairro} ${k + 1}`, lat: r.lat + (rnd() - 0.5) * 0.018, lng: r.lng + (rnd() - 0.5) * 0.018 })));
  const { error: e7 } = await db.from("map_osm_cache").upsert(["escolas", "saude", "onibus", "igrejas"].map((categoria) => ({ municipio_ibge: "3550308", categoria, dados: poi(categoria, categoria === "onibus" ? 3 : 2), atualizado_em: new Date().toISOString() })));
  if (e7) throw e7;

  console.log(`Mapa: ${linhas.length} pessoas, ${grupos?.length ?? 0} células, 2 congregações, ${ceps.length} centros de CEP.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
