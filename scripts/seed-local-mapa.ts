// Uso: npx tsx scripts/seed-local-mapa.ts
//
// Dados fictícios do mapa da igreja no Supabase LOCAL, por cima de
// scripts/seed-local-service.ts ("Igreja Teste Local"): 150 pessoas em
// Gravataí e Cachoeirinha (RS), espalhadas por 75 CEPs reais, cada um numa
// rua diferente, em 51 bairros; sede, 2 congregações e 8 células com endereço
// e lotação; consentimento variado. As pessoas são inventadas; os CEPs, ruas,
// bairros e centros vêm do CNEFE 2022 (IBGE) e da BrasilAPI. Rodar de novo
// apaga e recria só o que este script criou.

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

/* CEPs reais de Gravataí (4309209) e Cachoeirinha (4303103): um por
   quadradinho urbano de ~800 m, sorteados do CNEFE 2022; rua e bairro da
   BrasilAPI. [cep, município IBGE, cidade, bairro, rua, latitude, longitude] */
type Cep = { cep: string; municipio: string; cidade: string; bairro: string; rua: string; latitude: number; longitude: number };
const CEPS: Cep[] = ([
  ["94150411", "4309209", "Gravataí", "Barnabé", "Rua Diamantina", -29.928629, -51.016356],
  ["94070220", "4309209", "Gravataí", "Bom Princípio", "Rua Tarso Dutra", -29.92842, -51.065243],
  ["94135110", "4309209", "Gravataí", "Bom Sucesso", "Rua Vista Alegre", -29.920917, -51.041346],
  ["94135220", "4309209", "Gravataí", "Bom Sucesso", "Rua Machado de Assis", -29.9174, -51.042516],
  ["94198829", "4309209", "Gravataí", "Breno Garcia", "Rua Colinas", -29.912455, -50.916195],
  ["94050220", "4309209", "Gravataí", "COHAB A", "Rua Itapiruba", -29.942826, -51.041089],
  ["94030220", "4309209", "Gravataí", "COHAB C", "Rua Fábio André Koff", -29.938121, -51.018201],
  ["94030470", "4309209", "Gravataí", "COHAB C", "Rua Roça Sales", -29.942145, -51.015083],
  ["94020220", "4309209", "Gravataí", "Castelo Branco", "Rua Anastácia Pereira", -29.93259, -50.99971],
  ["94025090", "4309209", "Gravataí", "Castelo Branco", "Rua Mariluz", -29.930188, -51.010428],
  ["94025140", "4309209", "Gravataí", "Castelo Branco", "Rua Érico Veríssimo", -29.929506, -51.006708],
  ["94065040", "4309209", "Gravataí", "Central", "Rua Espanha", -29.94778, -51.057046],
  ["94010170", "4309209", "Gravataí", "Centro", "Rua Prefeito José Linck", -29.943285, -50.991562],
  ["94010970", "4309209", "Gravataí", "Centro", "Rua Anápio Gomes 1518", -29.912223, -51.036782],
  ["94035330", "4309209", "Gravataí", "Centro", "Rua Coronel Fonseca", -29.940434, -50.998229],
  ["94065170", "4309209", "Gravataí", "Cruzeiro", "Rua São João Batista", -29.93998, -51.049916],
  ["94065346", "4309209", "Gravataí", "Cruzeiro", "Rua Assis Pinto", -29.945256, -51.052677],
  ["94015150", "4309209", "Gravataí", "Dom Feliciano", "Rua Waldemar Guido Vicentini", -29.93466, -50.990277],
  ["94015610", "4309209", "Gravataí", "Loteamento Jardim Timbaúva", "Rua Getúlio Celso Nunes", -29.923769, -50.988809],
  ["94195340", "4309209", "Gravataí", "Morada Gaúcha", "Estrada da Cavalhada", -29.951775, -50.950014],
  ["94085210", "4309209", "Gravataí", "Morada do Vale I", "Rua Cônego Marcel", -29.921418, -51.05939],
  ["94110210", "4309209", "Gravataí", "Morada do Vale I", "Rua Alberto Torres", -29.912416, -51.062431],
  ["94120260", "4309209", "Gravataí", "Morada do Vale II", "Rua Levi Prates", -29.914334, -51.055149],
  ["94050346", "4309209", "Gravataí", "Nossa Chácara", "Rua Mario C de Souza", -29.944097, -51.040489],
  ["94050360", "4309209", "Gravataí", "Nossa Chácara", "Rua Germano Borim", -29.941534, -51.039494],
  ["94198593", "4309209", "Gravataí", "Padre Réus", "Rua Telino Chagas", -29.913143, -50.925798],
  ["94198790", "4309209", "Gravataí", "Padre Réus", "Rua Doutor Artur José Soares", -29.917446, -50.909249],
  ["94110273", "4309209", "Gravataí", "Parque Ipiranga", "Rua Tramandaí", -29.905373, -51.059928],
  ["94065210", "4309209", "Gravataí", "Parque Olinda", "Rua Irineu Pacheco", -29.935958, -51.046576],
  ["94070616", "4309209", "Gravataí", "Parque da Matriz", "Rua das Gardênias", -29.948121, -51.071901],
  ["94197160", "4309209", "Gravataí", "Parque do Itatiaia", "Rua Dorival Selbach", -29.926265, -50.930391],
  ["94190060", "4309209", "Gravataí", "Parque dos Anjos", "Rua Conselheiro João Link", -29.950382, -50.973039],
  ["94199636", "4309209", "Gravataí", "Rincão da Madalena", "Rua da Paz", -29.923704, -50.969368],
  ["94020050", "4309209", "Gravataí", "Salgado Filho", "Rua Alfredo Soares Pitres", -29.937535, -51.000169],
  ["94170110", "4309209", "Gravataí", "Santa Cruz", "Rua Doutor Loureiro", -29.926236, -51.002875],
  ["94170280", "4309209", "Gravataí", "Santa Cruz", "Rua Júlio Peixoto", -29.922323, -50.994954],
  ["94040020", "4309209", "Gravataí", "São Jerônimo", "Rua Timbauva", -29.930362, -50.97009],
  ["94055420", "4309209", "Gravataí", "São Jerônimo", "Rua Pinho", -29.940684, -51.031143],
  ["94075180", "4309209", "Gravataí", "São Judas Tadeu", "Rua Félix Rodrigues", -29.939258, -51.063465],
  ["94155040", "4309209", "Gravataí", "São Vicente", "Rua Frei Henrique de Coimbra", -29.922909, -51.009804],
  ["94155220", "4309209", "Gravataí", "São Vicente", "Rua Santa Maria", -29.921275, -51.018233],
  ["94155426", "4309209", "Gravataí", "São Vicente", "Rua Amandaú", -29.918218, -51.022303],
  ["94090030", "4309209", "Gravataí", "Vera Cruz", "Rua Marília", -29.921163, -51.048074],
  ["94090370", "4309209", "Gravataí", "Vera Cruz", "Rua Lavras", -29.928893, -51.052155],
  ["94090580", "4309209", "Gravataí", "Vera Cruz", "Travessa Niterói", -29.930712, -51.061258],
  ["94935410", "4303103", "Cachoeirinha", "COHAB", "Rua Lídio Batista Soares", -29.942439, -51.097184],
  ["94967170", "4303103", "Cachoeirinha", "Chico Mendes", "Rua Tesourinha", -29.895606, -51.071742],
  ["94967380", "4303103", "Cachoeirinha", "Chácara das Rosas", "Rua Flor de Pessegueiro", -29.892671, -51.078705],
  ["94967500", "4303103", "Cachoeirinha", "Chácara das Rosas", "Rua Um", -29.894148, -51.082214],
  ["94970533", "4303103", "Cachoeirinha", "Jardim Betânia", "Rua Imperatriz", -29.886457, -51.084981],
  ["94930520", "4303103", "Cachoeirinha", "Jardim Conquista", "Rua São Jorge", -29.951873, -51.109696],
  ["94960487", "4303103", "Cachoeirinha", "Jardim do Bosque", "Rua Grandiuva", -29.923913, -51.088914],
  ["94960565", "4303103", "Cachoeirinha", "Jardim do Bosque", "Rua Timbo", -29.92818, -51.091662],
  ["94970360", "4303103", "Cachoeirinha", "Meu Rincão", "Estrada dos Caetanos", -29.876679, -51.112349],
  ["94960854", "4303103", "Cachoeirinha", "Morada do Bosque", "Rua José Amaro", -29.90148, -51.085386],
  ["94965170", "4303103", "Cachoeirinha", "Nova Cachoeirinha", "Rua Fortaleza", -29.902148, -51.073724],
  ["94965405", "4303103", "Cachoeirinha", "Parque Espírito Santo", "Rua Bento Gonçalves", -29.911045, -51.067023],
  ["94960070", "4303103", "Cachoeirinha", "Parque Granja Esperança", "Rua Anildo Morais Pereira", -29.907204, -51.077702],
  ["94960150", "4303103", "Cachoeirinha", "Parque Granja Esperança", "Rua Darci José Pacheco", -29.910969, -51.083062],
  ["94965310", "4303103", "Cachoeirinha", "Parque Marechal Rondon", "Rua Iuguslávia", -29.903714, -51.068464],
  ["94950420", "4303103", "Cachoeirinha", "Parque da Matriz", "Rua Teresópolis", -29.945544, -51.082775],
  ["94950715", "4303103", "Cachoeirinha", "Parque da Matriz", "Rua Eloi Joalmes Teixeira", -29.939543, -51.079243],
  ["94950850", "4303103", "Cachoeirinha", "Parque da Matriz", "Rua Nero Caruso", -29.947664, -51.075892],
  ["94970430", "4303103", "Cachoeirinha", "Sítio Túnel Verde", "Rua Guará", -29.888696, -51.095562],
  ["94955225", "4303103", "Cachoeirinha", "Vila Anair", "Rua Canela", -29.918277, -51.081291],
  ["94955610", "4303103", "Cachoeirinha", "Vila Anair", "Rua Ivoti", -29.913897, -51.079404],
  ["94910240", "4303103", "Cachoeirinha", "Vila Cachoeirinha", "Rua Vitória", -29.952517, -51.092962],
  ["94920570", "4303103", "Cachoeirinha", "Vila Mauá", "Rua São Francisco", -29.956384, -51.099058],
  ["94940080", "4303103", "Cachoeirinha", "Vila Monte Carlo", "Rua Ernesto Frield", -29.938056, -51.089198],
  ["94940243", "4303103", "Cachoeirinha", "Vila Princesa Izabel", "Rua Silvério Manoel da Silva", -29.932481, -51.084008],
  ["94930075", "4303103", "Cachoeirinha", "Vila Regina", "Avenida Fernando Ferrari", -29.950131, -51.103988],
  ["94920180", "4303103", "Cachoeirinha", "Vila Santo Ângelo", "Rua Doutor Epitácio Pessoa", -29.959381, -51.10647],
  ["94945260", "4303103", "Cachoeirinha", "Vila Vista Alegre", "Travessa Iraí", -29.922113, -51.077311],
  ["94945360", "4303103", "Cachoeirinha", "Vila Vista Alegre", "Travessa Liberdade", -29.931916, -51.078668],
  ["94945670", "4303103", "Cachoeirinha", "Vila Vista Alegre", "Rua Colibri", -29.921626, -51.084134],
] as [string, string, string, string, string, number, number][]).map(([cep, municipio, cidade, bairro, rua, latitude, longitude]) => ({ cep, municipio, cidade, bairro, rua, latitude, longitude }));
const MUNICIPIOS = ["4309209", "4303103"];
const MARCA = "seed-mapa";
/* bairros do seed antigo (São Paulo), para limpar quem rodou a versão anterior */
const ANTIGOS = ["Jardim Aurora", "Vila Esperança", "Centro", "Parque das Palmeiras", "Recanto Verde", "Bela Vista", "São Bento", "Nova Canaã", "Morada do Sol"];

const cepDe = (cidade: string, bairro: string, i = 0) => {
  const xs = CEPS.filter((c) => c.cidade === cidade && c.bairro === bairro);
  if (!xs.length) throw new Error(`sem CEP em ${bairro}, ${cidade}`);
  return xs[i % xs.length];
};
const UF = "RS";

async function main() {
  const { data: igreja } = await db.from("churches").select("id, organization_id").eq("name", "Igreja Teste Local").single();
  if (!igreja) throw new Error("Rode antes: npx tsx scripts/seed-local-service.ts");
  const org = igreja.organization_id as string;

  /* limpa o que este script criou (inclusive a versão antiga, em São Paulo) */
  await db.from("members").delete().eq("organization_id", org).eq("first_contact", MARCA);
  await db.from("fellowship_groups").delete().eq("organization_id", org).like("name", "Célula %");
  await db.from("churches").delete().eq("organization_id", org).like("name", "Congregação %");
  await db.from("cep_centros").delete().eq("fonte", MARCA);
  /* pelo município (tem índice): com o Censo inteiro carregado, só a fonte varre a tabela toda */
  await db.from("ibge_setores").delete().in("municipio_ibge", ["3550308", ...MUNICIPIOS]).eq("fonte", MARCA);
  await db.from("ibge_bairros").delete().eq("municipio_ibge", "3550308").in("nome", ANTIGOS);
  /* pontos fictícios antigos: osm_id com o nome da categoria (os reais são numéricos) */
  for (const cat of ["escolas", "saude", "onibus", "igrejas"]) await db.from("map_osm_cache").delete().eq("municipio_ibge", "3550308").like("dados->0->>osm_id", `node/${cat}%`);

  /* centros de CEP: os reais do CNEFE ficam; quem não carregou o IBGE ganha estes,
     com um trecho de rua sorteado pelo número do CEP (G5) */
  const trecho = (cep: string) => ({ eixo_angulo: ((Number(cep) % 180) * Math.PI) / 180, eixo_meia_m: 50 + (Number(cep) % 91) });
  const { error: e1 } = await db.from("cep_centros").upsert(
    CEPS.map((c) => ({ cep: c.cep, municipio_ibge: c.municipio, latitude: c.latitude, longitude: c.longitude, enderecos: 40, fonte: MARCA, ...trecho(c.cep) })),
    { onConflict: "cep", ignoreDuplicates: true },
  );
  if (e1) throw e1;

  /* sede em Gravataí, congregações em Cachoeirinha e na Morada do Vale */
  const sede = cepDe("Gravataí", "Centro");
  await db.from("churches").update({ postal_code: sede.cep, address: `${sede.rua}, 100`, neighborhood: sede.bairro, city: sede.cidade, state: UF }).eq("id", igreja.id);
  const cong1 = cepDe("Cachoeirinha", "Parque da Matriz");
  const cong2 = cepDe("Gravataí", "Morada do Vale I");
  const { error: e2 } = await db.from("churches").insert([
    { organization_id: org, name: "Congregação Cachoeirinha", is_headquarters: false, postal_code: cong1.cep, address: `${cong1.rua}, 820`, neighborhood: cong1.bairro, city: cong1.cidade, state: UF },
    { organization_id: org, name: "Congregação Morada do Vale", is_headquarters: false, postal_code: cong2.cep, address: `${cong2.rua}, 55`, neighborhood: cong2.bairro, city: cong2.cidade, state: UF },
  ]);
  if (e2) throw e2;

  /* líderes de célula: pessoas do seed base */
  const { data: pessoas } = await db.from("people").select("id, name").eq("organization_id", org);
  const lider = (n: string) => pessoas?.find((p) => (p.name as string).startsWith(n))?.id ?? null;
  const celulas = [
    { name: "Célula Centro", cep: cepDe("Gravataí", "Centro", 1), dia: "Quinta-feira", hora: "19h", lider: lider("Marta"), cap: 20 },
    { name: "Célula São Vicente", cep: cepDe("Gravataí", "São Vicente"), dia: "Terça-feira", hora: "19h30", lider: lider("Maria"), cap: 12 },
    { name: "Célula Castelo Branco", cep: cepDe("Gravataí", "Castelo Branco"), dia: "Sábado", hora: "17h", lider: lider("Marta"), cap: 15 },
    { name: "Célula Morada do Vale", cep: cepDe("Gravataí", "Morada do Vale I", 1), dia: "Quarta-feira", hora: "20h", lider: lider("Lucas"), cap: 15 },
    { name: "Célula Parque dos Anjos", cep: cepDe("Gravataí", "Parque dos Anjos"), dia: "Sexta-feira", hora: "20h", lider: lider("Mateus"), cap: 10 },
    { name: "Célula Vista Alegre", cep: cepDe("Cachoeirinha", "Vila Vista Alegre"), dia: "Quinta-feira", hora: "20h", lider: lider("Lucas"), cap: 12 },
    { name: "Célula Granja Esperança", cep: cepDe("Cachoeirinha", "Parque Granja Esperança"), dia: "Terça-feira", hora: "20h", lider: lider("Maria"), cap: 12 },
    { name: "Célula Jardim do Bosque", cep: cepDe("Cachoeirinha", "Jardim do Bosque"), dia: "Segunda-feira", hora: "20h", lider: lider("Lucas"), cap: 10 },
  ];
  const { data: grupos, error: e3 } = await db.from("fellowship_groups").insert(celulas.map((c, i) => ({
    organization_id: org, church_id: igreja.id, name: c.name, weekday: c.dia, time: c.hora, leader_person_id: c.lider,
    postal_code: c.cep.cep, street: c.cep.rua, street_number: String(100 + i * 37), neighborhood: c.cep.bairro, city: c.cep.cidade, state: UF, capacity: c.cap,
  }))).select("id, name");
  if (e3) throw e3;
  /* célula mais perto (em linha reta) de cada CEP */
  const km = (a: Cep, b: Cep) => Math.hypot((a.latitude - b.latitude) * 111, (a.longitude - b.longitude) * 96);
  const celulaPerto = (c: Cep) => {
    const melhor = celulas.map((g) => ({ g, d: km(c, g.cep) })).sort((x, y) => x.d - y.d)[0];
    return melhor.d < 2.5 ? (grupos ?? []).find((g) => g.name === melhor.g.name)?.id ?? null : null;
  };

  /* 150 pessoas: cada CEP ganha um peso sorteado, para ter bairros mais cheios
     e outros com pouca gente, sem amontoar tudo num lugar só */
  const pesos = CEPS.map(() => 0.3 + Math.pow(rnd(), 2) * 4);
  const total = pesos.reduce((s, p) => s + p, 0);
  const sortearCep = () => { let x = rnd() * total; for (let i = 0; i < CEPS.length; i++) { x -= pesos[i]; if (x <= 0) return CEPS[i]; } return CEPS[CEPS.length - 1]; };
  const linhas = [];
  for (let i = 0; i < 150; i++) {
    const c = sortearCep();
    const nome = `${escolher(NOMES)} ${escolher(SOBRENOMES)}`;
    const consentiu = rnd() < 0.65;
    const anos = 2018 + Math.floor(rnd() * 8);
    const grupo = celulaPerto(c);
    linhas.push({
      organization_id: org, church_id: igreja.id, name: nome, first_contact: MARCA,
      situation: rnd() < 0.15 ? "novo" : "membro", postal_code: c.cep, street: c.rua, street_number: String(10 + Math.floor(rnd() * 1900)),
      neighborhood: c.bairro, city: c.cidade, state: UF, country: "Brasil",
      group_id: grupo && rnd() < 0.7 ? grupo : null,
      since_year: String(anos),
      created_at: new Date(Date.UTC(anos, Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 27))).toISOString(),
      map_consent_at: consentiu ? new Date().toISOString() : null,
      map_consent_declined_at: !consentiu && rnd() < 0.5 ? new Date().toISOString() : null,
      map_consent_source: consentiu ? "app" : null,
      map_consent_terms: consentiu ? "2026-10-21" : null,
    });
  }
  const { error: e4 } = await db.from("members").insert(linhas);
  if (e4) throw e4;

  /* membros do seed base também ganham CEP (Maria com nome no mapa) */
  const maria = cepDe("Gravataí", "São Vicente", 1);
  const lucas = cepDe("Cachoeirinha", "Vila Vista Alegre", 1);
  await db.from("members").update({ postal_code: maria.cep, street: maria.rua, street_number: "214", neighborhood: maria.bairro, city: maria.cidade, state: UF, map_consent_at: new Date().toISOString(), map_consent_source: "app", map_consent_terms: "2026-10-21" }).eq("organization_id", org).eq("email", "membro@teste.local");
  await db.from("members").update({ postal_code: lucas.cep, street: lucas.rua, street_number: "77", neighborhood: lucas.bairro, city: lucas.cidade, state: UF }).eq("organization_id", org).eq("email", "lider@teste.local");

  /* IBGE: com o Censo 2022 carregado (setores reais das duas cidades), não inventa
     nada. Sem ele, cria um setor fictício de ~1 km em volta de cada bairro do seed. */
  const { count: reais } = await db.from("ibge_setores").select("codigo", { count: "exact", head: true }).in("municipio_ibge", MUNICIPIOS).neq("fonte", MARCA);
  if (!reais) {
    const bairros = [...new Map(CEPS.map((c) => [`${c.municipio}|${c.bairro}`, c])).values()];
    const setores = bairros.map((c, i) => {
      const h = 0.0045, x0 = c.longitude - h, y0 = c.latitude - h;
      return {
        codigo: `${c.municipio}${String(i + 1).padStart(4, "0")}9000`, municipio_ibge: c.municipio, bairro_codigo: null,
        moradores: Math.round(2500 + rnd() * 6000), area_km2: 1,
        geom: `SRID=4326;MULTIPOLYGON(((${x0} ${y0},${x0 + 2 * h} ${y0},${x0 + 2 * h} ${y0 + 2 * h},${x0} ${y0 + 2 * h},${x0} ${y0})))`, fonte: MARCA,
      };
    });
    const { error: e5 } = await db.from("ibge_setores").insert(setores);
    if (e5) throw e5;
  }

  /* pontos do OpenStreetMap fictícios (o job mensal grava neste formato), perto dos CEPs */
  const poi = (municipio: string, cat: string, n: number) => CEPS.filter((c) => c.municipio === municipio).slice(0, n).map((c, k) => ({
    osm_id: `node/${MARCA}-${cat}${k}`, nome: cat === "onibus" ? "" : `${{ escolas: "Escola", saude: "Posto de saúde", igrejas: "Igreja" }[cat] ?? "Ponto"} ${c.bairro}`,
    lat: c.latitude + (rnd() - 0.5) * 0.006, lng: c.longitude + (rnd() - 0.5) * 0.006,
  }));
  const cache = MUNICIPIOS.flatMap((m) => ["escolas", "saude", "onibus", "igrejas"].map((categoria) => ({ municipio_ibge: m, categoria, dados: poi(m, categoria, categoria === "onibus" ? 14 : 6), atualizado_em: new Date().toISOString() })));
  const { error: e7 } = await db.from("map_osm_cache").upsert(cache);
  if (e7) throw e7;

  /* lugares da igreja de exemplo (Marcar lugar); recria pelos nomes */
  const lugares = [
    { nome: "Casa de apoio Morada do Vale", categoria: "igreja_casa", c: cepDe("Gravataí", "Morada do Vale II"), observacao: "Recebe doações às quartas." },
    { nome: "Mutirão do Parque dos Anjos", categoria: "igreja_acao", c: cepDe("Gravataí", "Parque dos Anjos"), observacao: "Ação de 2025, voltar no próximo semestre." },
    { nome: "Escola parceira São Vicente", categoria: "igreja_parceiro", c: cepDe("Gravataí", "São Vicente", 2), observacao: null },
    { nome: "Encontro de jovens na praça", categoria: "igreja_encontro", c: cepDe("Cachoeirinha", "Parque da Matriz", 1), observacao: "Sábados à tarde, quando não chove." },
    { nome: "Casa da Dona Lúcia", categoria: "igreja_casa", c: cepDe("Cachoeirinha", "Vila Anair"), observacao: null },
  ];
  await db.from("map_points").delete().eq("organization_id", org).in("nome", lugares.map((l) => l.nome));
  const { error: e8 } = await db.from("map_points").insert(lugares.map((l) => ({
    organization_id: org, nome: l.nome, categoria: l.categoria, origem: "manual",
    latitude: l.c.latitude + (rnd() - 0.5) * 0.002, longitude: l.c.longitude + (rnd() - 0.5) * 0.002,
    endereco: `${l.c.rua}, ${l.c.bairro}, ${l.c.cidade}`, observacao: l.observacao,
  })));
  if (e8) throw e8;

  const nBairros = new Set(CEPS.map((c) => `${c.cidade}|${c.bairro}`)).size;
  console.log(`Mapa: ${linhas.length} pessoas em ${CEPS.length} CEPs (${nBairros} bairros de Gravataí e Cachoeirinha), ${grupos?.length ?? 0} células, 2 congregações.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
