"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ProdCard, ModelA, ModelB, ModelC, ModelD, ACCENTS } from "./ProdCard";
import type { AccentKey, Modelo } from "./ProdCard";

const SHELF_CAROUSEL_THRESHOLD = 0;

type Familia = "ministrar" | "liderar";
type FiltroL1 = "tudo" | Familia | "eventos";
type Colecao = "retiro" | "conferencia";

interface Material {
  id: string;
  familia: Familia;
  estante: string;
  model: Modelo;
  etiqueta: string;
  titulo: string;
  code?: string;
  big?: string;
  bigLabel?: string;
  promessa: string;
  meta: { mensagens?: number; paginas: number; formatos: string[] };
  preco: string;
  hotmartUrl: string;
  colecoes: Colecao[];
  praQuem: string;
  conteudo: string[];
  comoUsar: string;
  faq: { q: string; a: string }[];
}

interface Estante { key: string; label: string; familia: Familia; accent: AccentKey; faixaEtaria?: string }

const INFANTIL_ESTANTES: Estante[] = [
  { key: "infantil-bercario",  label: "Berçário",  familia: "ministrar", accent: "wheat", faixaEtaria: "0-1a 11m" },
  { key: "infantil-maternal",  label: "Maternal",  familia: "ministrar", accent: "wheat", faixaEtaria: "2-5 anos" },
  { key: "infantil-primarios", label: "Primários", familia: "ministrar", accent: "wheat", faixaEtaria: "6-7 anos" },
];

const ESTANTES: Estante[] = [
  ...INFANTIL_ESTANTES,
  { key: "juniores",           label: "Juniores",             familia: "ministrar", accent: "ochre" },
  { key: "adolescentes",       label: "Adolescentes",         familia: "ministrar", accent: "clay"  },
  { key: "jovens",             label: "Jovens",               familia: "ministrar", accent: "olive" },
  { key: "igreja-toda",        label: "Igreja toda",          familia: "ministrar", accent: "pine"  },
  { key: "manuais",            label: "Manuais",              familia: "liderar",   accent: "slate" },
  { key: "criar-ministerio",   label: "Criar ministério",     familia: "liderar",   accent: "slate" },
  { key: "modelos-checklists", label: "Modelos & Checklists", familia: "liderar",   accent: "slate" },
  { key: "montar-evento",      label: "Montar evento",        familia: "liderar",   accent: "slate" },
];
const ESTANTES_MINISTRAR = ESTANTES.filter(e => e.familia === "ministrar" && !e.key.startsWith("infantil-"));
const ESTANTES_LIDERAR   = ESTANTES.filter(e => e.familia === "liderar");
const ESTANTE_MAP = Object.fromEntries(ESTANTES.map(e => [e.key, e]));

// Chip virtual "Infantil" para o L2 de ministrar
const INFANTIL_CHIP = { key: "infantil", label: "Infantil", accent: "wheat" as AccentKey };
const L2_MINISTRAR = [INFANTIL_CHIP, ...ESTANTES_MINISTRAR];

const MATERIAIS: Material[] = [
  // ── ADOLESCENTES (7 itens → carrossel) ─────────────────────────────────
  {
    id: "firmes", familia: "ministrar", estante: "adolescentes", model: "B",
    etiqueta: "Adolescentes", titulo: "Firmes", code: "S-12",
    promessa: "Seis mensagens que ancora adolescentes no fundamento da fé.",
    meta: { mensagens: 6, paginas: 48, formatos: ["PDF", "Editável", "Slides"] },
    preco: "R$ 47", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para o líder que trabalha com adolescentes que vivem cercados de dúvidas e pressão cultural: e precisam saber em quem crer, não só o que crer.",
    conteudo: ["Mensagem 1: Quem é Jesus de verdade?", "Mensagem 2: A Bíblia como âncora", "Mensagem 3: Quando a fé parece fraca", "Mensagem 4: A comunidade que sustenta", "Mensagem 5: Fé na adversidade", "Mensagem 6: Firmes e inabaláveis"],
    comoUsar: "Cada mensagem vem em Word editável com roteiro expandido, perguntas para small groups e sugestão de atividade prática.",
    faq: [{ q: "Dá pra editar o conteúdo?", a: "Sim. Arquivo Word aberto, sem senha, pronto para adaptar." }, { q: "Funciona para grupos pequenos?", a: "Séries funcionam de 5 a 500 pessoas. O formato é flexível." }],
  },
  {
    id: "raizes", familia: "ministrar", estante: "adolescentes", model: "A",
    etiqueta: "Adolescentes", titulo: "Raízes", code: "S-19",
    promessa: "Cinco mensagens sobre identidade cristã para quem ainda está descobrindo quem é.",
    meta: { mensagens: 5, paginas: 40, formatos: ["PDF", "Editável"] },
    preco: "R$ 47", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para líderes que percebem adolescentes construindo identidade a partir de comparação e redes sociais: e precisando de uma base mais profunda.",
    conteudo: ["Mensagem 1: Quem eu sou sem o que dizem de mim?", "Mensagem 2: Criado à imagem de Deus", "Mensagem 3: A mentira da performance", "Mensagem 4: Pertencer sem precisar provar", "Mensagem 5: Plantado, frutificando"],
    comoUsar: "Material em Word com roteiro, aplicação prática e perguntas de grupo. Adapte o contexto cultural em menos de 30 minutos.",
    faq: [{ q: "Tem slides prontos?", a: "Não neste pacote: o Word tem indicações visuais para criar os seus." }, { q: "Pode usar em retiro?", a: "Sim. Funciona muito bem em formato intensivo." }],
  },
  {
    id: "entre-dois-mundos", familia: "ministrar", estante: "adolescentes", model: "C",
    etiqueta: "Adolescentes", titulo: "Entre Dois Mundos", big: "07", bigLabel: "mensagens",
    promessa: "Sete mensagens sobre viver a fé no cotidiano de quem não se encaixa em lugar nenhum.",
    meta: { mensagens: 7, paginas: 56, formatos: ["PDF", "Editável", "Slides"] },
    preco: "R$ 67", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para líderes com adolescentes que sentem a tensão entre o mundo cristão e o secular: e vivem essa tensão com ansiedade.",
    conteudo: ["Mensagem 1: Estrangeiros aqui", "Mensagem 2: Fé que não envergonha", "Mensagem 3: Amigos que não crêem", "Mensagem 4: Escola e fé", "Mensagem 5: Redes sociais e o mundo que construímos", "Mensagem 6: Sendo luz sem apagar ninguém", "Mensagem 7: A cidadania que não passa"],
    comoUsar: "Roteiro expandido com pontes culturais específicas para cada contexto: escola, redes sociais, família.",
    faq: [{ q: "É muito teológico?", a: "Não. Linguagem acessível, testada em grupos de 14 a 17 anos." }, { q: "Posso dividir em módulos menores?", a: "Sim. Cada mensagem é independente." }],
  },
  {
    id: "primeira-vez", familia: "ministrar", estante: "adolescentes", model: "A",
    etiqueta: "Adolescentes", titulo: "Primeira Vez", code: "S-23",
    promessa: "Quatro mensagens de abertura de ano que colocam adolescentes na direção certa desde o início.",
    meta: { mensagens: 4, paginas: 32, formatos: ["PDF", "Editável"] },
    preco: "R$ 37", hotmartUrl: "https://pay.hotmart.com/", colecoes: ["retiro"],
    praQuem: "Para líderes que querem começar o ano ministerial com intenção: estabelecendo expectativas e apontando a direção.",
    conteudo: ["Mensagem 1: Por que estamos aqui?", "Mensagem 2: O tipo de pessoa que queremos ser", "Mensagem 3: O que Deus quer fazer neste ano", "Mensagem 4: Começa agora"],
    comoUsar: "Ideal para o primeiro mês. Funciona igualmente como abertura de retiro de início de ano.",
    faq: [{ q: "Funciona para abertura de retiro?", a: "Sim. Desenhada para funcionar tanto em cultos semanais quanto em formato de retiro de 2 dias." }],
  },
  {
    id: "nao-desista", familia: "ministrar", estante: "adolescentes", model: "C",
    etiqueta: "Adolescentes", titulo: "Não Desista", big: "05", bigLabel: "mensagens",
    promessa: "Cinco mensagens sobre perseverança para adolescentes que estão pensando em desistir.",
    meta: { mensagens: 5, paginas: 44, formatos: ["PDF", "Editável"] },
    preco: "R$ 47", hotmartUrl: "https://pay.hotmart.com/", colecoes: ["retiro"],
    praQuem: "Para líderes que percebem cansaço, afastamento ou apatia espiritual nos adolescentes.",
    conteudo: ["Mensagem 1: É normal se sentir assim?", "Mensagem 2: Elias também quis desistir", "Mensagem 3: A coragem de ficar", "Mensagem 4: Onde buscar força", "Mensagem 5: A promessa que sustenta"],
    comoUsar: "Série densa. Recomendamos small groups de acompanhamento paralelos às mensagens.",
    faq: [{ q: "É muito pesado?", a: "Honesta sem ser desesperançosa. Parte da realidade, termina na promessa." }],
  },
  {
    id: "o-nome-certo", familia: "ministrar", estante: "adolescentes", model: "A",
    etiqueta: "Adolescentes", titulo: "O Nome Certo", code: "S-31",
    promessa: "Seis mensagens sobre chamado e identidade para quem ainda está tentando descobrir quem é.",
    meta: { mensagens: 6, paginas: 48, formatos: ["PDF", "Editável", "Slides"] },
    preco: "R$ 47", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para líderes que querem abordar chamado sem romantizar: mostrando que vocação começa no ordinário, não no excepcional.",
    conteudo: ["Mensagem 1: Deus sabe o seu nome", "Mensagem 2: Antes da competência, o chamado", "Mensagem 3: O que você faz com o que tem", "Mensagem 4: Chamado no cotidiano", "Mensagem 5: Pequeno e fiel", "Mensagem 6: O próximo passo"],
    comoUsar: "Série de 6 semanas com progressão clara. Cada mensagem inclui um 'Próximo passo' concreto para a semana.",
    faq: [{ q: "Funciona para jovens também?", a: "Sim. A linguagem alcança de 14 a 25 anos sem adaptação." }],
  },
  {
    id: "geracao-levante", familia: "ministrar", estante: "adolescentes", model: "D",
    etiqueta: "Adolescentes", titulo: "Geração Levante",
    promessa: "Oito mensagens sobre missão e propósito: para adolescentes que querem que sua vida importe.",
    meta: { mensagens: 8, paginas: 64, formatos: ["PDF", "Editável", "Slides"] },
    preco: "R$ 67", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para líderes com adolescentes com potencial de liderança: e que querem direcionar essa energia para algo que dure.",
    conteudo: ["Mensagem 1: Uma geração com propósito", "Mensagem 2: O que o mundo precisa", "Mensagem 3: O papel da sua geração", "Mensagem 4: Missão começa aqui", "Mensagem 5: Servir como forma de vida", "Mensagem 6: Liderança que cuida", "Mensagem 7: O custo de ser diferente", "Mensagem 8: Levanta"],
    comoUsar: "Série longa para uso semestral ou como âncora de um programa de formação de líderes juniores.",
    faq: [{ q: "Posso usar como formação de liderança?", a: "Sim. Vem com perguntas de mentoria que funcionam como base para 1 a 1." }],
  },

  // ── JUNIORES (4 itens → grid) ──────────────────────────────────────────
  {
    id: "pequenos-grandes", familia: "ministrar", estante: "juniores", model: "A",
    etiqueta: "Juniores", titulo: "Pequenos Grandes", code: "S-03",
    promessa: "Cinco lições sobre crianças da Bíblia usadas por Deus: mesmo sendo pequenas.",
    meta: { mensagens: 5, paginas: 40, formatos: ["PDF", "Editável"] },
    preco: "R$ 37", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para líderes de ministério infantil que querem inspirar crianças de 7 a 12 anos a perceber que Deus usa quem está disposto.",
    conteudo: ["Lição 1: Davi: pequeno, mas escolhido", "Lição 2: A menina serva de Naamã", "Lição 3: O menino com os cinco pães", "Lição 4: Timóteo: jovem, mas fiel", "Lição 5: Você também conta"],
    comoUsar: "Roteiro com linguagem adaptada para crianças, dinâmica sugerida por lição e verso para memorizar. 40 a 50 minutos por encontro.",
    faq: [{ q: "Qual faixa etária?", a: "7 a 12 anos. A linguagem escala bem para esse intervalo." }, { q: "Tem atividades?", a: "Sim. Cada lição inclui uma dinâmica prática e o verso da semana." }],
  },
  {
    id: "deus-cuida", familia: "ministrar", estante: "juniores", model: "C",
    etiqueta: "Juniores", titulo: "Deus Cuida", big: "04", bigLabel: "lições",
    promessa: "Quatro encontros sobre confiança e ansiedade para crianças que também sentem medo.",
    meta: { mensagens: 4, paginas: 32, formatos: ["PDF", "Editável"] },
    preco: "R$ 37", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para líderes que percebem ansiedade e medo em crianças: e querem falar essa realidade de forma gentil, com base bíblica sólida.",
    conteudo: ["Lição 1: É normal ter medo?", "Lição 2: Deus vê você", "Lição 3: Confiar mesmo sem entender", "Lição 4: Paz que guarda"],
    comoUsar: "Série leve e afetiva. Inclui dinâmica de oração adaptada para crianças.",
    faq: [{ q: "Funciona para crianças em situações difíceis?", a: "Sim. A linguagem é gentil e não trivializa a dor." }],
  },
  {
    id: "missao-possivel", familia: "ministrar", estante: "juniores", model: "B",
    etiqueta: "Juniores", titulo: "Missão Possível", code: "S-07",
    promessa: "Cinco encontros sobre crianças missionárias: porque a missão começa antes da viagem.",
    meta: { mensagens: 5, paginas: 40, formatos: ["PDF", "Editável"] },
    preco: "R$ 47", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para líderes que querem formar crianças com visão missionária: não só para o futuro, mas para a vida que têm agora.",
    conteudo: ["Lição 1: O que é missão?", "Lição 2: Missionário começa em casa", "Lição 3: Na escola também dá", "Lição 4: Orar é parte da missão", "Lição 5: Pronto, vá"],
    comoUsar: "Série com linguagem de aventura. Inclui 'Missão da semana': tarefa prática entre os encontros.",
    faq: [{ q: "Tem material de apoio para os pais?", a: "Sim. Cada lição inclui um cartão resumo para os pais." }],
  },
  {
    id: "brilha", familia: "ministrar", estante: "juniores", model: "A",
    etiqueta: "Juniores", titulo: "Brilha!", code: "S-11",
    promessa: "Quatro lições sobre ser luz na escola: para crianças que não sabem como viver a fé no dia a dia.",
    meta: { mensagens: 4, paginas: 32, formatos: ["PDF", "Editável"] },
    preco: "R$ 37", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para líderes que querem equipar crianças para viver a fé fora da igreja: na escola, em casa, na vizinhança.",
    conteudo: ["Lição 1: O que significa ser luz?", "Lição 2: Brilhar na sala de aula", "Lição 3: Amizade que reflete", "Lição 4: Sua vida já é testemunho"],
    comoUsar: "Série curta e prática. Ideal para mês missionário ou como introdução ao tema missão.",
    faq: [{ q: "Funciona como série isolada?", a: "Sim. Também é uma boa introdução para a série Missão Possível." }],
  },

  // ── JOVENS (5 itens → grid) ────────────────────────────────────────────
  {
    id: "alta-performance", familia: "ministrar", estante: "jovens", model: "C",
    etiqueta: "Jovens", titulo: "Alta Performance", big: "06", bigLabel: "mensagens",
    promessa: "Seis mensagens sobre excelência com propósito: para jovens que querem crescer sem perder a alma.",
    meta: { mensagens: 6, paginas: 52, formatos: ["PDF", "Editável", "Slides"] },
    preco: "R$ 67", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para líderes com jovens universitários e profissionais sob pressão de performance: que precisam recalibrar o que é sucesso.",
    conteudo: ["Mensagem 1: Excelência não é perfeccionismo", "Mensagem 2: Para quem você trabalha?", "Mensagem 3: Descanso não é preguiça", "Mensagem 4: O que você está construindo?", "Mensagem 5: Ambição a serviço do reino", "Mensagem 6: A vida plena"],
    comoUsar: "Série para jovens adultos. Inclui perguntas para grupos de discussão e leituras complementares por mensagem.",
    faq: [{ q: "Funciona para universitários?", a: "Sim. Desenhado especificamente para a fase de escolhas de carreira e identidade." }],
  },
  {
    id: "relacionamentos", familia: "ministrar", estante: "jovens", model: "B",
    etiqueta: "Jovens", titulo: "Relacionamentos", code: "S-21",
    promessa: "Sete mensagens sobre amor, namoro e pureza: com honestidade, sem religiosidade vazia.",
    meta: { mensagens: 7, paginas: 60, formatos: ["PDF", "Editável"] },
    preco: "R$ 67", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para líderes que querem abordar relacionamentos de forma bíblica e culturalmente relevante: sem romantismo vazio nem moralismo.",
    conteudo: ["Mensagem 1: Deus inventou o amor", "Mensagem 2: O que você está buscando?", "Mensagem 3: Pureza como projeto, não regra", "Mensagem 4: Amizade é base", "Mensagem 5: Quando o coração engana", "Mensagem 6: Conflito e perdão", "Mensagem 7: Relacionamentos que glorificam"],
    comoUsar: "Série sensível que exige ambiente de confiança. Recomendamos small groups por gênero para aprofundar.",
    faq: [{ q: "Aborda sexualidade?", a: "De forma madura e bíblica. Foco em formação de caráter e visão de mundo." }],
  },
  {
    id: "vocacao", familia: "ministrar", estante: "jovens", model: "A",
    etiqueta: "Jovens", titulo: "Vocação", code: "S-26",
    promessa: "Seis mensagens sobre chamado e carreira: para jovens que querem integrar fé e trabalho.",
    meta: { mensagens: 6, paginas: 52, formatos: ["PDF", "Editável", "Slides"] },
    preco: "R$ 67", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para líderes que acompanham jovens em transição: terminando faculdade, entrando no mercado ou questionando o sentido do que fazem.",
    conteudo: ["Mensagem 1: Todo trabalho é ministério?", "Mensagem 2: Chamado não é cargo", "Mensagem 3: Como escolher?", "Mensagem 4: Fiel no processo", "Mensagem 5: Trabalho e descanso", "Mensagem 6: Onde você planta"],
    comoUsar: "Série com leituras complementares e perguntas de mentoria. Ideal para grupos de jovens adultos em transição de vida.",
    faq: [{ q: "Posso adaptar para faculdade?", a: "Sim. Vem com versões adaptadas para contexto universitário." }],
  },
  {
    id: "resilientes", familia: "ministrar", estante: "jovens", model: "C",
    etiqueta: "Jovens", titulo: "Resilientes", big: "05", bigLabel: "mensagens",
    promessa: "Cinco mensagens sobre fé em tempo de crise: quando o mundo desmorona e Deus parece silencioso.",
    meta: { mensagens: 5, paginas: 44, formatos: ["PDF", "Editável"] },
    preco: "R$ 47", hotmartUrl: "https://pay.hotmart.com/", colecoes: ["retiro"],
    praQuem: "Para líderes com jovens desiludidos, cansados ou distantes após períodos difíceis: que precisam de uma série que fale a realidade sem falsas promessas.",
    conteudo: ["Mensagem 1: Está tudo bem não estar bem", "Mensagem 2: Fé que sobrevive à dúvida", "Mensagem 3: Lamentação é oração", "Mensagem 4: A presença no vale", "Mensagem 5: Depois da tempestade"],
    comoUsar: "Funciona muito bem em retiro com momentos de oração e partilha após cada mensagem.",
    faq: [{ q: "É muito pesado para jovens?", a: "Honesta, mas não desesperançosa. Começa na realidade e termina na promessa." }],
  },
  {
    id: "primeiros-passos", familia: "ministrar", estante: "jovens", model: "A",
    etiqueta: "Jovens", titulo: "Primeiros Passos", code: "S-34",
    promessa: "Quatro mensagens de discipulado para novos convertidos que precisam entender o que acabou de acontecer.",
    meta: { mensagens: 4, paginas: 36, formatos: ["PDF", "Editável"] },
    preco: "R$ 47", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para líderes que acolhem novos convertidos e precisam de material simples e claro para os primeiros meses de fé.",
    conteudo: ["Mensagem 1: O que aconteceu comigo?", "Mensagem 2: Como ler a Bíblia", "Mensagem 3: Por que me batizar?", "Mensagem 4: Uma vida diferente"],
    comoUsar: "Funciona como série de culto ou material de acompanhamento 1 a 1. Zero pressuposto de conhecimento bíblico.",
    faq: [{ q: "Funciona para quem não tem base bíblica?", a: "Sim. Foi desenhado exatamente para isso." }],
  },

  // ── IGREJA TODA (4 itens → grid) ──────────────────────────────────────
  {
    id: "familia-do-jeito-certo", familia: "ministrar", estante: "igreja-toda", model: "B",
    etiqueta: "Igreja toda", titulo: "Família do Jeito Certo", code: "S-40",
    promessa: "Oito mensagens sobre família bíblica: para pregar com a congregação inteira sem simplificar a realidade.",
    meta: { mensagens: 8, paginas: 72, formatos: ["PDF", "Editável", "Slides"] },
    preco: "R$ 97", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para pastores e pregadores que querem abordar família de forma bíblica e pastoral: honrando diferentes configurações sem perder o fundamento.",
    conteudo: ["Mensagem 1: Família é ideia de Deus", "Mensagem 2: O lar como escola", "Mensagem 3: Matrimônio e aliança", "Mensagem 4: Filhos e autoridade", "Mensagem 5: Famílias feridas, Deus que cura", "Mensagem 6: Família monoparental, coração inteiro", "Mensagem 7: A família da fé", "Mensagem 8: O que queremos passar para a próxima geração"],
    comoUsar: "Cada mensagem inclui variação de aplicação para diferentes configurações familiares.",
    faq: [{ q: "Aborda divórcio e recasamento?", a: "Sim, na mensagem 5: de forma pastoral, sem condenação." }],
  },
  {
    id: "generosidade", familia: "ministrar", estante: "igreja-toda", model: "A",
    etiqueta: "Igreja toda", titulo: "Generosidade", code: "S-48",
    promessa: "Cinco mensagens sobre oferta e mordomia que transformam a forma como a congregação vê o dinheiro.",
    meta: { mensagens: 5, paginas: 44, formatos: ["PDF", "Editável"] },
    preco: "R$ 67", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para pastores que evitam pregar sobre dinheiro: e precisam de uma série que aborde o tema sem manipulação.",
    conteudo: ["Mensagem 1: Por que a Bíblia fala tanto de dinheiro?", "Mensagem 2: Mordomia: tudo é de Deus", "Mensagem 3: Dízimo como ato de fé", "Mensagem 4: Oferta além do dízimo", "Mensagem 5: O coração que dá"],
    comoUsar: "Série para momentos estratégicos: campanhas, início de ano, planejamento financeiro da igreja.",
    faq: [{ q: "Pode gerar rejeição?", a: "Este material foi construído para disarmar a resistência antes de tratar o tema." }],
  },
  {
    id: "ano-novo-vida-nova", familia: "ministrar", estante: "igreja-toda", model: "C",
    etiqueta: "Igreja toda", titulo: "Ano Novo Vida Nova", big: "04", bigLabel: "mensagens",
    promessa: "Quatro mensagens de virada de ano que ancoram esperança sem romantizar o que vem por aí.",
    meta: { mensagens: 4, paginas: 36, formatos: ["PDF", "Editável"] },
    preco: "R$ 47", hotmartUrl: "https://pay.hotmart.com/", colecoes: ["retiro"],
    praQuem: "Para pastores e líderes que precisam de conteúdo de transição de ano: com realismo e fé.",
    conteudo: ["Mensagem 1: Antes de olhar pra frente", "Mensagem 2: Tudo novo e tudo the same?", "Mensagem 3: A fidelidade que garante o próximo passo", "Mensagem 4: Que ano você quer ter?"],
    comoUsar: "Funciona para cultos de final de ano, retiro de virada ou primeiras semanas de janeiro.",
    faq: [{ q: "Pode ser usada em dezembro ou janeiro?", a: "Sim. Funciona para encerramento de dezembro ou abertura de janeiro." }],
  },
  {
    id: "sal-e-luz", familia: "ministrar", estante: "igreja-toda", model: "A",
    etiqueta: "Igreja toda", titulo: "Sal e Luz", code: "S-54",
    promessa: "Seis mensagens sobre missão cotidiana: para mobilizar a congregação sem sair da rotina.",
    meta: { mensagens: 6, paginas: 52, formatos: ["PDF", "Editável", "Slides"] },
    preco: "R$ 67", hotmartUrl: "https://pay.hotmart.com/", colecoes: ["conferencia"],
    praQuem: "Para pastores que querem mobilizar a congregação inteira para missão: sem romantismo, com foco no cotidiano.",
    conteudo: ["Mensagem 1: Missão é para todo crente", "Mensagem 2: Sal: presença que preserva", "Mensagem 3: Luz: vida que ilumina", "Mensagem 4: No mercado de trabalho", "Mensagem 5: Na vizinhança", "Mensagem 6: A igreja que vai"],
    comoUsar: "Ideal para campanhas missionárias ou conferências congregacionais. Vem com versão de conferência de 2 dias.",
    faq: [{ q: "Funciona como série de conferência?", a: "Sim. Vem com versão em formato de conferência de 2 dias." }],
  },

  // ── MANUAIS (4 itens → grid) ──────────────────────────────────────────
  {
    id: "manual-celula", familia: "liderar", estante: "manuais", model: "C",
    etiqueta: "Manual", titulo: "Manual do Líder de Célula", big: "80", bigLabel: "páginas",
    promessa: "Guia completo para quem lidera pequenos grupos: do primeiro encontro ao discipulado contínuo.",
    meta: { paginas: 80, formatos: ["PDF", "Editável"] },
    preco: "R$ 97", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para coordenadores de células que precisam de material de formação para seus líderes: que cubra prática, teologia e pastoreio em um único documento.",
    conteudo: ["Parte 1: O que é uma célula saudável", "Parte 2: O papel do líder", "Parte 3: Como conduzir o primeiro encontro", "Parte 4: Discipulado na célula", "Parte 5: Quando a célula emperra", "Parte 6: Multiplicação", "Apêndice: Modelos de encontro e checklists"],
    comoUsar: "Manual de referência + guia de formação. Pode ser usado como treinamento de líderes (8 encontros de 1h30) ou como consulta individual.",
    faq: [{ q: "Para qual denominação?", a: "Transdenominacional. Adaptável a qualquer modelo de célula." }],
  },
  {
    id: "manual-adolescentes", familia: "liderar", estante: "manuais", model: "A",
    etiqueta: "Manual", titulo: "Manual do Liderinho", code: "M-04",
    promessa: "Guia prático para líderes de adolescentes: linguagem, relacionamento, formação e pastoreio.",
    meta: { paginas: 72, formatos: ["PDF", "Editável"] },
    preco: "R$ 97", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para coordenadores que precisam formar seus líderes de adolescentes: em especial os que nunca lideraram antes.",
    conteudo: ["Parte 1: Quem é o adolescente de hoje", "Parte 2: O líder como referência", "Parte 3: Como se relacionar sem perder a autoridade", "Parte 4: Pastoreio: quando vai além da reunião", "Parte 5: Crises e situações difíceis", "Parte 6: Formação contínua do líder"],
    comoUsar: "Manual de formação. Ideal para o processo de certificação de voluntários.",
    faq: [{ q: "Funciona para líderes jovens (18-22 anos)?", a: "Sim. Escrito para líderes com pouca diferença de idade dos liderados." }],
  },
  {
    id: "manual-discipulado", familia: "liderar", estante: "manuais", model: "C",
    etiqueta: "Manual", titulo: "Manual de Discipulado", big: "56", bigLabel: "páginas",
    promessa: "Processo completo de discipulado individual: do primeiro contato ao envio para liderar outros.",
    meta: { paginas: 56, formatos: ["PDF", "Editável"] },
    preco: "R$ 67", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para líderes que fazem 1 a 1 mas não têm metodologia: e precisam de um processo claro do primeiro encontro ao envio.",
    conteudo: ["Parte 1: O que é discipulado (e o que não é)", "Parte 2: Estrutura do 1 a 1", "Parte 3: Perguntas certas na hora certa", "Parte 4: Acompanhamento de crise", "Parte 5: Quando o discípulo está pronto", "Apêndice: 12 templates de encontros"],
    comoUsar: "Manual de referência para discipuladores. Inclui 12 templates de encontros mensais já estruturados.",
    faq: [{ q: "Preciso de experiência prévia?", a: "Não. O manual guia o discipulador desde o começo, incluindo erros comuns para evitar." }],
  },
  {
    id: "manual-pastoral", familia: "liderar", estante: "manuais", model: "B",
    etiqueta: "Manual", titulo: "Manual de Pastoral", code: "M-09",
    promessa: "Cuidado e aconselhamento básico para líderes que pastoreiam sem ser pastores.",
    meta: { paginas: 88, formatos: ["PDF", "Editável"] },
    preco: "R$ 97", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para líderes que se veem diante de situações de aconselhamento: crise, luto, conflito: sem saber como agir.",
    conteudo: ["Parte 1: O papel do líder no cuidado pastoral", "Parte 2: Escuta ativa e limites", "Parte 3: Crise e intervenção básica", "Parte 4: Luto e perdas", "Parte 5: Saúde mental e fé", "Parte 6: Quando encaminhar para um profissional", "Apêndice: Rede de apoio"],
    comoUsar: "Manual de referência. Não substitui formação profissional: orienta o líder sobre quando e como agir.",
    faq: [{ q: "Substitui formação em aconselhamento?", a: "Não. É um guia prático para situações cotidianas: ensina a ouvir bem e saber quando encaminhar." }],
  },

  // ── CRIAR MINISTÉRIO (3 itens → grid) ───────────────────────────────
  {
    id: "montar-min-adolescentes", familia: "liderar", estante: "criar-ministerio", model: "A",
    etiqueta: "Criar ministério", titulo: "Montando um Ministério de Adolescentes", code: "M-12",
    promessa: "Do zero ao sistema: como estruturar um ministério de adolescentes que funciona sem depender de uma pessoa.",
    meta: { paginas: 64, formatos: ["PDF", "Editável"] },
    preco: "R$ 97", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para líderes começando do zero: ou que têm um ministério que depende completamente de uma pessoa.",
    conteudo: ["Módulo 1: Diagnóstico: onde você está", "Módulo 2: Visão e propósito", "Módulo 3: Estrutura e cargos", "Módulo 4: Recrutamento de voluntários", "Módulo 5: Calendário e programação", "Módulo 6: Integração com a igreja", "Módulo 7: Sistema de acompanhamento", "Módulo 8: Como crescer sem perder a saúde"],
    comoUsar: "Guia de implantação em 8 módulos. Recomendamos trabalhar um módulo por semana com a equipe.",
    faq: [{ q: "E se já tenho um ministério?", a: "O Módulo 1 (Diagnóstico) identifica o que está sólido e o que falta. Você implementa só o que precisar." }],
  },
  {
    id: "estruturar-celulas", familia: "liderar", estante: "criar-ministerio", model: "C",
    etiqueta: "Criar ministério", titulo: "Como Estruturar um Grupo de Células", big: "90", bigLabel: "dias",
    promessa: "Modelo prático para implantar ou reorganizar células: sem precisar reinventar o que já funciona.",
    meta: { paginas: 48, formatos: ["PDF", "Editável"] },
    preco: "R$ 67", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para pastores e coordenadores que querem implementar células mas não sabem por onde começar: ou que já têm células sem sistema.",
    conteudo: ["Parte 1: Por que células (e por que não funcionam na maioria das igrejas)", "Parte 2: Modelos de célula", "Parte 3: Implantando as primeiras células", "Parte 4: Formando líderes em escala", "Parte 5: Supervisão e cuidado", "Parte 6: Manutenção do sistema"],
    comoUsar: "Inclui cronograma de 90 dias para implantação inicial e versão para igrejas de menos de 100 pessoas.",
    faq: [{ q: "Funciona para igrejas pequenas?", a: "Sim. O guia inclui versão adaptada para igrejas de menos de 100 pessoas." }],
  },
  {
    id: "lancar-missoes", familia: "liderar", estante: "criar-ministerio", model: "B",
    etiqueta: "Criar ministério", titulo: "Lançando um Ministério de Missões", code: "M-17",
    promessa: "Passo a passo para criar um ministério de missões que vai além do evento anual de coleta.",
    meta: { paginas: 60, formatos: ["PDF", "Editável"] },
    preco: "R$ 97", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para líderes que querem levar a igreja de ações pontuais de missão para um ministério estruturado e contínuo.",
    conteudo: ["Parte 1: O que é um ministério de missões", "Parte 2: Missão local, regional e global", "Parte 3: Orçamento e sustentação", "Parte 4: Mobilização da congregação", "Parte 5: Parceria com organizações missionárias", "Parte 6: Medindo impacto"],
    comoUsar: "Inclui templates de orçamento e carta de compromisso missionário.",
    faq: [{ q: "Para igrejas que nunca tiveram missões?", a: "Sim. Começa do zero e escala progressivamente." }],
  },

  // ── MODELOS & CHECKLISTS (4 itens → grid) ───────────────────────────
  {
    id: "checklist-culto", familia: "liderar", estante: "modelos-checklists", model: "C",
    etiqueta: "Checklist", titulo: "Checklist do Culto Especial", big: "05", bigLabel: "checklists",
    promessa: "Tudo que não pode falhar: produção, som, comunicação e hospitalidade em um único documento.",
    meta: { paginas: 12, formatos: ["PDF", "Editável"] },
    preco: "R$ 37", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para líderes de produção que querem eliminar o improviso em eventos especiais: Natal, Páscoa, aniversário da igreja.",
    conteudo: ["Checklist de 30 dias antes", "Checklist de 7 dias antes", "Checklist de véspera", "Checklist no dia", "Checklist pós-evento", "Modelo de briefing de equipe"],
    comoUsar: "Documento Word editável. Adapte os itens para a realidade da sua estrutura.",
    faq: [{ q: "Funciona para qualquer tamanho?", a: "Sim. Os checklists têm itens opcionais marcados: remova o que não se aplica." }],
  },
  {
    id: "carta-compromisso", familia: "liderar", estante: "modelos-checklists", model: "A",
    etiqueta: "Modelo", titulo: "Carta de Compromisso", code: "M-22",
    promessa: "Carta de compromisso para voluntários e líderes: clara, pastoral e sem juridiquês.",
    meta: { paginas: 8, formatos: ["PDF", "Editável"] },
    preco: "R$ 27", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para coordenadores que querem formalizar o compromisso de voluntários sem criar uma burocracia fria.",
    conteudo: ["Modelo para líderes de célula", "Modelo para voluntários de ministério", "Modelo para equipe de produção", "Cláusulas de conduta e saída", "Guia de como usar a carta na prática"],
    comoUsar: "Edite os campos em Word e adapte para cada ministério. Vem com guia de apresentação.",
    faq: [{ q: "Tem valor legal?", a: "Não. É um instrumento pastoral de alinhamento de expectativas, não um contrato." }],
  },
  {
    id: "onboarding-voluntario", familia: "liderar", estante: "modelos-checklists", model: "C",
    etiqueta: "Kit", titulo: "Kit de Onboarding", big: "30", bigLabel: "dias",
    promessa: "Primeiros passos para novos voluntários: do recrutamento à primeira tarefa, sem deixar ninguém perdido.",
    meta: { paginas: 20, formatos: ["PDF", "Editável"] },
    preco: "R$ 47", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para líderes que recebem novos voluntários e os veem sumindo após poucas semanas: porque ninguém os integrou de verdade.",
    conteudo: ["Guia de boas-vindas (personalizável)", "Folha de perfil e dons", "Checklist da primeira semana", "Formulário de expectativas", "Plano de acompanhamento dos primeiros 30 dias", "Modelo de conversa de feedback"],
    comoUsar: "Personalize o guia de boas-vindas com a identidade do seu ministério e siga o checklist cronologicamente.",
    faq: [{ q: "Funciona para todos os ministérios?", a: "Sim. O kit é genérico e adaptável. Vem com orientação de como personalizar por ministério." }],
  },
  {
    id: "relatorio-saude", familia: "liderar", estante: "modelos-checklists", model: "B",
    etiqueta: "Relatório", titulo: "Relatório de Saúde da Igreja", code: "M-26",
    promessa: "Diagnóstico mensal em uma página: para o pastor ter clareza sobre o que está crescendo e o que está regredindo.",
    meta: { paginas: 16, formatos: ["PDF", "Editável"] },
    preco: "R$ 37", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para pastores que tomam decisões de intuição e querem começar a tomar de dados: sem sistema sofisticado.",
    conteudo: ["Relatório de presença e novos visitantes", "Relatório de discipulado e células", "Relatório financeiro simplificado", "Painel de saúde espiritual da equipe", "Guia de como coletar os dados", "Template de reunião mensal baseada no relatório"],
    comoUsar: "Preencha mensalmente. Leva menos de 1 hora e gera clareza imediata sobre prioridades.",
    faq: [{ q: "Precisa de software especial?", a: "Não. É uma planilha e um documento Word. Funciona com o que você já tem." }],
  },

  // ── INFANTIL ──────────────────────────────────────────────────────────────
  {
    id: "primeiros-sons", familia: "ministrar", estante: "infantil-bercario", model: "A",
    etiqueta: "Berçário", titulo: "Primeiros Sons da Fé", code: "I-01",
    promessa: "Quatro encontros sensoriais sobre quem é Deus para bebês de 0 a 1 ano e 11 meses.",
    meta: { mensagens: 4, paginas: 28, formatos: ["PDF", "Editável"] },
    preco: "R$ 37", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para líderes e voluntários do berçário que querem ir além do cuidado básico e criar momentos intencionais de fé.",
    conteudo: ["Encontro 1: Deus fez tudo o que você toca", "Encontro 2: Deus ouve a sua voz", "Encontro 3: Deus te vê", "Encontro 4: Deus cuida de você"],
    comoUsar: "Roteiro com atividades sensoriais (toque, som, visão) adaptadas para bebês. Inclui orientações para os pais levarem para casa.",
    faq: [{ q: "Como trabalhar com bebês?", a: "O material usa estímulos sensoriais simples: tecidos, sons, contato. Guia explica cada dinâmica." }],
  },
  {
    id: "arca-noe", familia: "ministrar", estante: "infantil-maternal", model: "C",
    etiqueta: "Maternal", titulo: "Arca do Noé", big: "06", bigLabel: "encontros",
    promessa: "Seis encontros sobre cuidado, obediência e promessa de Deus para crianças de 2 a 5 anos.",
    meta: { mensagens: 6, paginas: 40, formatos: ["PDF", "Editável", "Slides"] },
    preco: "R$ 39", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para líderes do maternal que querem histórias bíblicas adaptadas com linguagem simples, dinâmicas e reforço visual.",
    conteudo: ["Encontro 1: Noé ouviu Deus", "Encontro 2: Os animais de dois em dois", "Encontro 3: A chuva e a arca", "Encontro 4: Esperando em Deus", "Encontro 5: O arco-íris", "Encontro 6: Deus sempre cumpre o que promete"],
    comoUsar: "Cada encontro tem história ilustrada, dinâmica para fazer em grupo e verso simples para memorizar com gestos.",
    faq: [{ q: "Tem ilustrações?", a: "Sim. Vem com folhas ilustradas em PDF para imprimir." }],
  },
  {
    id: "deus-cuida-de-mim", familia: "ministrar", estante: "infantil-maternal", model: "B",
    etiqueta: "Maternal", titulo: "Deus Cuida de Mim", code: "I-03",
    promessa: "Cinco encontros sobre provisão e cuidado de Deus para crianças de 2 a 5 anos que sentem medo.",
    meta: { mensagens: 5, paginas: 36, formatos: ["PDF", "Editável"] },
    preco: "R$ 39", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para líderes que percebem crianças do maternal com insegurança ou medo: e querem oferecer base emocional e espiritual.",
    conteudo: ["Encontro 1: Deus me conhece", "Encontro 2: Deus cuida dos passarinhos e de mim", "Encontro 3: Posso falar com Deus", "Encontro 4: Deus está aqui mesmo que eu não veja", "Encontro 5: Eu não preciso ter medo"],
    comoUsar: "Dinâmicas com música, movimento e repetição: ideal para a fase de aprendizado do maternal.",
    faq: [{ q: "Funciona para crianças com ansiedade de separação?", a: "Sim. O material trabalha segurança e presença de Deus de forma lúdica e afetiva." }],
  },
  {
    id: "herois-pequenos", familia: "ministrar", estante: "infantil-primarios", model: "A",
    etiqueta: "Primários", titulo: "Heróis Pequenos", code: "I-04",
    promessa: "Seis lições sobre personagens bíblicos pequenos usados por Deus: para crianças de 6 a 7 anos.",
    meta: { mensagens: 6, paginas: 44, formatos: ["PDF", "Editável"] },
    preco: "R$ 41", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para líderes que querem mostrar para crianças de 6 e 7 anos que Deus usa qualquer um: independente do tamanho ou da idade.",
    conteudo: ["Lição 1: Davi e o gigante", "Lição 2: A menina que curou Naamã", "Lição 3: O menino com o peixe e o pão", "Lição 4: Rute: fiel até o fim", "Lição 5: Timóteo: jovem e fiel", "Lição 6: Você também é usado por Deus"],
    comoUsar: "Roteiro com história, pergunta de aplicação e missão da semana. Inclui cartão de memória com o verso.",
    faq: [{ q: "Tem atividades para fazer?", a: "Sim. Cada lição tem missão da semana e dinâmica em grupo." }],
  },
  {
    id: "primeiras-verdades", familia: "ministrar", estante: "infantil-primarios", model: "C",
    etiqueta: "Primários", titulo: "Primeiras Verdades", big: "08", bigLabel: "lições",
    promessa: "Oito lições sobre os fundamentos da fé para crianças de 6 a 7 anos aprenderem e guardarem.",
    meta: { mensagens: 8, paginas: 52, formatos: ["PDF", "Editável"] },
    preco: "R$ 43", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para líderes que querem trabalhar catequese básica com os primários: Deus, Bíblia, Jesus, oração, salvação: de forma simples e memorável.",
    conteudo: ["Lição 1: Quem é Deus?", "Lição 2: A Bíblia é verdade", "Lição 3: Como Deus fez o mundo", "Lição 4: Por que Jesus veio?", "Lição 5: Jesus morreu e ressuscitou", "Lição 6: O que é ser cristão?", "Lição 7: Como conversar com Deus", "Lição 8: A vida que Deus quer pra mim"],
    comoUsar: "Cada lição tem pergunta e resposta para memorizar, história, dinâmica e oração final. Funciona como base de formação.",
    faq: [{ q: "Pode ser usado como catequese?", a: "Sim. Estruturado para formação básica, não só para culto semanal." }],
  },

  // ── MONTAR EVENTO (3 itens → grid) ─────────────────────────────────
  {
    id: "retiro-adolescentes", familia: "liderar", estante: "montar-evento", model: "A",
    etiqueta: "Montar evento", titulo: "Retiro de Adolescentes", code: "M-30",
    promessa: "Guia completo de produção: do briefing ao pós-retiro, sem improvisação logística.",
    meta: { paginas: 90, formatos: ["PDF", "Editável"] },
    preco: "R$ 147", hotmartUrl: "https://pay.hotmart.com/", colecoes: ["retiro"],
    praQuem: "Para coordenadores de retiro que carregam o evento nas costas: e precisam de um sistema que distribua a carga.",
    conteudo: ["Módulo 1: Propósito e tema", "Módulo 2: Orçamento e viabilidade", "Módulo 3: Local, translado e hospedagem", "Módulo 4: Programação e grade horária", "Módulo 5: Equipe e divisão de funções", "Módulo 6: Comunicação e inscrições", "Módulo 7: Logística no dia", "Módulo 8: Pastoreio durante o retiro", "Módulo 9: Pós-retiro"],
    comoUsar: "9 módulos + checklists cronológicos de 60, 30, 15, 7 e 1 dia antes. Inclui carta de autorização para menores.",
    faq: [{ q: "Funciona para retiros de 1 dia?", a: "Sim. Os módulos são adaptáveis: inclui versão compacta para day retreat." }],
  },
  {
    id: "conferencia-lideranca", familia: "liderar", estante: "montar-evento", model: "C",
    etiqueta: "Montar evento", titulo: "Conferência de Liderança", big: "07", bigLabel: "módulos",
    promessa: "Do briefing ao pós-evento: como produzir uma conferência que move pessoas e não só enche auditório.",
    meta: { paginas: 80, formatos: ["PDF", "Editável"] },
    preco: "R$ 127", hotmartUrl: "https://pay.hotmart.com/", colecoes: ["conferencia"],
    praQuem: "Para líderes que organizam conferências de formação: e querem um evento que gere transformação real.",
    conteudo: ["Módulo 1: Propósito da conferência", "Módulo 2: Curadoria de conteúdo e speakers", "Módulo 3: Produção e infraestrutura", "Módulo 4: Comunicação e vendas de ingresso", "Módulo 5: Experiência do participante", "Módulo 6: Transmissão e registro", "Módulo 7: Pós-conferência e follow-up"],
    comoUsar: "7 módulos + checklists cronológicos. Inclui template de contrato de speaker e guia de curadoria de conteúdo.",
    faq: [{ q: "Para conferências grandes ou pequenas?", a: "Escala de 50 a 2000 participantes. Os módulos têm variações para cada escala." }],
  },
  {
    id: "culto-natal", familia: "liderar", estante: "montar-evento", model: "B",
    etiqueta: "Montar evento", titulo: "Culto de Natal", code: "M-38",
    promessa: "Roteiro e checklist completo para o culto mais importante do ano: sem improvisar no Natal.",
    meta: { paginas: 60, formatos: ["PDF", "Editável"] },
    preco: "R$ 97", hotmartUrl: "https://pay.hotmart.com/", colecoes: ["conferencia"],
    praQuem: "Para pastores e coordenadores que querem que o Natal seja o melhor evento do ano: para membros e para visitantes.",
    conteudo: ["Módulo 1: O Natal como porta de entrada", "Módulo 2: Roteiro do culto", "Módulo 3: Produção e decoração", "Módulo 4: Música e adoração", "Módulo 5: Comunicação e convite", "Módulo 6: Acolhimento de visitantes", "Módulo 7: Pós-Natal: como integrar quem chegou"],
    comoUsar: "Roteiro de culto editável + checklist de produção + guia de acolhimento. Comece em outubro.",
    faq: [{ q: "Funciona para igrejas pequenas?", a: "Sim. Inclui versão simplificada para igrejas de menos de 100 pessoas." }],
  },
];

// ─── SHELF CAROUSEL ───────────────────────────────────────────────────────────
function ShelfCarousel({ materiais, accentKey, onCardClick }: { materiais: Material[]; accentKey: AccentKey; onCardClick: (m: Material) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: "left" | "right") => {
    trackRef.current?.scrollBy({ left: dir === "left" ? -350 : 350, behavior: "smooth" });
  };
  return (
    <div className="loja-shelf-carousel">
      <div className="loja-carousel-track" ref={trackRef}>
        {materiais.map((m) => <ProdCard key={m.id} material={m} accentKey={accentKey} onClick={() => onCardClick(m)} />)}
      </div>
      <div className="loja-carousel-arrows">
        <button className="loja-carousel-arrow" onClick={() => scroll("left")} aria-label="Anterior">←</button>
        <button className="loja-carousel-arrow" onClick={() => scroll("right")} aria-label="Próximo">→</button>
      </div>
    </div>
  );
}

// ─── SHELF ────────────────────────────────────────────────────────────────────
function Shelf({ estante, materiais, onCardClick, onVerTodos }: {
  estante: Estante;
  materiais: Material[];
  onCardClick: (m: Material) => void;
  onVerTodos: (e: Estante) => void;
}) {
  if (materiais.length === 0) return null;
  const accent = ACCENTS[estante.accent];
  const isCarousel = materiais.length > SHELF_CAROUSEL_THRESHOLD;
  return (
    <div className="loja-shelf">
      <div className="loja-shelf-head">
        <span className="loja-shelf-name" style={{ color: accent.base }}>
          {estante.faixaEtaria ? `◆ ${estante.label.toUpperCase()}` : estante.label}
        </span>
        {estante.faixaEtaria && (
          <span className="loja-shelf-count">· {estante.faixaEtaria}</span>
        )}
        <span className="loja-shelf-count">{materiais.length} {materiais.length === 1 ? "material" : "materiais"}</span>
        {isCarousel && (
          <button className="loja-shelf-ver" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }} onClick={() => onVerTodos(estante)}>
            Ver todos
          </button>
        )}
      </div>
      {isCarousel ? (
        <ShelfCarousel materiais={materiais} accentKey={estante.accent} onCardClick={onCardClick} />
      ) : (
        <div className="loja-shelf-grid">
          {materiais.map((m) => <ProdCard key={m.id} material={m} accentKey={estante.accent} onClick={() => onCardClick(m)} />)}
        </div>
      )}
    </div>
  );
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
function Modal({ material, onClose }: { material: Material; onClose: () => void }) {
  const estante = ESTANTE_MAP[material.estante];
  const accentKey = estante?.accent || "olive";
  const accent = ACCENTS[accentKey];

  const relacionados = MATERIAIS.filter(
    (m) => m.estante === material.estante && m.id !== material.id
  ).slice(0, 3);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", handleKey); };
  }, [onClose]);

  const metaStr = [
    material.meta.mensagens ? `${material.meta.mensagens} mensagens` : null,
    `${material.meta.paginas} páginas`,
  ].filter(Boolean).join(" · ");

  return (
    <div className="loja-modal">
      <div className="loja-modal-backdrop" onClick={onClose} />
      <div className="loja-modal-inner">
        <div className="loja-modal-bar">
          <span className="loja-modal-breadcrumb">Materiais → {material.etiqueta}</span>
          <button className="loja-modal-close" onClick={onClose}>Fechar ×</button>
        </div>
        <div className="loja-detail">
          <div className="loja-detail-hero">
            <div className="loja-detail-capa"
              style={{ "--cex-accent": accent.base, "--cex-accent-deep": accent.deep } as React.CSSProperties}>
              {material.model === "A" && <ModelA etiqueta={material.etiqueta} titulo={material.titulo} code={material.code} />}
              {material.model === "B" && <ModelB etiqueta={material.etiqueta} titulo={material.titulo} code={material.code} />}
              {material.model === "C" && <ModelC etiqueta={material.etiqueta} titulo={material.titulo} big={material.big} bigLabel={material.bigLabel} />}
              {material.model === "D" && <ModelD etiqueta={material.etiqueta} titulo={material.titulo} />}
            </div>
            <div>
              <div className="loja-detail-meta-row">
                <span className="loja-detail-etiqueta" style={{ color: accent.base, background: `${accent.base}18`, borderColor: `${accent.base}44` }}>{material.etiqueta}</span>
                {material.colecoes.length > 0 && (
                  <span className="loja-detail-etiqueta" style={{ color: "var(--muted)", background: "var(--card)", borderColor: "var(--border-2)" }}>
                    {material.colecoes.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(", ")}
                  </span>
                )}
              </div>
              <div className="loja-detail-titulo">{material.titulo}</div>
              <p className="loja-detail-promessa">{material.promessa}</p>
            </div>
          </div>

          <div className="loja-detail-sec">
            <div className="loja-detail-sec-label">◆ Pra quem é</div>
            <p className="loja-detail-text">{material.praQuem}</p>
          </div>

          <div className="loja-detail-sec">
            <div className="loja-detail-sec-label">◆ O que vem dentro · {metaStr}</div>
            <ul className="loja-detail-list">
              {material.conteudo.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </div>

          <div className="loja-detail-sec">
            <div className="loja-detail-sec-label">◆ Como usar</div>
            <p className="loja-detail-text">{material.comoUsar}</p>
            <div className="loja-detail-formatos">
              {material.meta.formatos.map((f) => (
                <span key={f} className="loja-detail-formato" style={{ color: accent.base, borderColor: `${accent.base}44` }}>{f}</span>
              ))}
            </div>
          </div>

          <div className="loja-detail-sec">
            <div className="loja-detail-preco-block">
              <div>
                <div className="loja-detail-preco-val" style={{ color: accent.base }}>{material.preco}</div>
                <div className="loja-detail-preco-desc">Compra única · Acesso vitalício</div>
              </div>
              <div className="loja-detail-preco-info" />
              <a href={material.hotmartUrl} target="_blank" rel="noopener noreferrer"
                style={{ background: accent.base, color: "#0E110D", borderColor: accent.base } as React.CSSProperties}
                className="btn btn-lg btn-arrow">Comprar</a>
            </div>
          </div>

          {relacionados.length > 0 && (
            <div className="loja-detail-sec">
              <div className="loja-detail-sec-label">◆ Da mesma estante</div>
              <div className="loja-relacionados">
                {relacionados.map((m) => (
                  <ProdCard key={m.id} material={m} accentKey={accentKey} onClick={() => {}} />
                ))}
              </div>
            </div>
          )}

          <div className="loja-detail-sec">
            <div className="loja-detail-sec-label">◆ Perguntas frequentes</div>
            {material.faq.map((item, i) => (
              <div key={i} className="loja-detail-faq-item">
                <div className="loja-detail-faq-q">{item.q}</div>
                <div className="loja-detail-faq-a">{item.a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SHELF MODAL ─────────────────────────────────────────────────────────────
function ShelfModal({ estante, materiais, onCardClick, onClose }: {
  estante: Estante;
  materiais: Material[];
  onCardClick: (m: Material) => void;
  onClose: () => void;
}) {
  const accent = ACCENTS[estante.accent];

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", handleKey); };
  }, [onClose]);

  return (
    <div className="loja-modal">
      <div className="loja-modal-backdrop" onClick={onClose} />
      <div className="loja-modal-inner">
        <div className="loja-modal-bar">
          <span className="loja-modal-breadcrumb">Materiais → {estante.label}</span>
          <button className="loja-modal-close" onClick={onClose}>Fechar ×</button>
        </div>
        <div className="loja-detail">
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: accent.base, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>◆ Estante</div>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--white)" }}>{estante.label}</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>{materiais.length} materiais disponíveis</div>
          </div>
          <div className="loja-shelf-grid">
            {materiais.map((m) => (
              <ProdCard key={m.id} material={m} accentKey={estante.accent} onClick={() => onCardClick(m)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function MateriaisContent({ showHero = true, showCrossLink = true }: { showHero?: boolean; showCrossLink?: boolean }) {
  const [filtroL1, setFiltroL1] = useState<FiltroL1>("tudo");
  const [estanteAtiva, setEstanteAtiva] = useState<string | null>(null);
  const [faixaInfantil, setFaixaInfantil] = useState<string | null>(null);
  const [materialAberto, setMaterialAberto] = useState<Material | null>(null);
  const [estanteAberta, setEstanteAberta] = useState<Estante | null>(null);

  const handleL1 = useCallback((f: FiltroL1) => { setFiltroL1(f); setEstanteAtiva(null); setFaixaInfantil(null); }, []);
  const handleL2 = useCallback((k: string) => { setEstanteAtiva((prev) => (prev === k ? null : k)); setFaixaInfantil(null); }, []);
  const handleFaixa = useCallback((k: string) => { setFaixaInfantil((prev) => (prev === k ? null : k)); }, []);

  const estantesVisiveis = (lista: Estante[]) => lista.filter((e) => !estanteAtiva || e.key === estanteAtiva);
  const infantilVisiveis = () => estanteAtiva === "infantil" || !estanteAtiva
    ? INFANTIL_ESTANTES.filter(e => !faixaInfantil || e.key === faixaInfantil)
    : [];
  const materiaisDe = (estante: string) => MATERIAIS.filter((m) => m.estante === estante);
  const totalInfantil = INFANTIL_ESTANTES.reduce((sum, e) => sum + materiaisDe(e.key).length, 0);

  const eventosGrupos: Record<string, Material[]> = {};
  MATERIAIS.forEach((m) => m.colecoes.forEach((c) => {
    if (!eventosGrupos[c]) eventosGrupos[c] = [];
    eventosGrupos[c].push(m);
  }));
  const eventosLabels: Record<string, string> = { retiro: "Retiro", conferencia: "Conferência" };

  const l2Options = filtroL1 === "ministrar" ? L2_MINISTRAR : filtroL1 === "liderar" ? ESTANTES_LIDERAR : null;
  const showFaixaInfantil = filtroL1 === "ministrar" && estanteAtiva === "infantil";

  return (
    <>
      {showHero && (
        <div className="loja-hero pg-wrap">
          <div className="loja-hero-tag">◆ Materiais editáveis</div>
          <h1 className="loja-hero-title">
            Para <em>ministrar.</em><br />Para <em>liderar.</em>
          </h1>
          <p className="loja-hero-desc">
            Séries prontas e ferramentas de gestão: compra única, editável, pronto pra usar no seu contexto.
          </p>
        </div>
      )}

      <div className="loja-filter-bar">
        <div className="pg-wrap">
          <div className="loja-filter-l1">
            {(["tudo", "ministrar", "liderar", "eventos"] as FiltroL1[]).map((f) => {
              const labels: Record<FiltroL1, string> = { tudo: "Tudo", ministrar: "Para ministrar", liderar: "Para liderar", eventos: "Eventos" };
              return (
                <button key={f} className={`loja-filter-btn${filtroL1 === f ? " ativo" : ""}`} onClick={() => handleL1(f)}>
                  {labels[f]}
                </button>
              );
            })}
          </div>
          {l2Options && (
            <div className="loja-filter-l2">
              {l2Options.map((e) => (
                <button key={e.key}
                  className={`loja-filter-btn${estanteAtiva === e.key ? " ativo" : ""}`}
                  style={{ "--cex-accent": ACCENTS[e.accent].base } as React.CSSProperties}
                  onClick={() => handleL2(e.key)}>
                  {e.label}
                </button>
              ))}
            </div>
          )}
          {showFaixaInfantil && (
            <div className="loja-filter-l2">
              <button className={`loja-filter-btn${!faixaInfantil ? " ativo" : ""}`} onClick={() => setFaixaInfantil(null)}>Todas</button>
              {INFANTIL_ESTANTES.map((e) => (
                <button key={e.key}
                  className={`loja-filter-btn${faixaInfantil === e.key ? " ativo" : ""}`}
                  style={{ "--cex-accent": ACCENTS[e.accent].base } as React.CSSProperties}
                  onClick={() => handleFaixa(e.key)}>
                  {e.label} <span style={{ color: "var(--subtle)", marginLeft: 4 }}>{e.faixaEtaria}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="pg-wrap pg-section">
        {filtroL1 === "eventos" && (
          <div>
            {Object.entries(eventosGrupos).map(([colecao, mats]) => (
              <div key={colecao} className="loja-eventos-grupo">
                <div className="loja-eventos-label">{eventosLabels[colecao] ?? colecao}</div>
                <div className="loja-shelf-grid">
                  {mats.map((m) => {
                    const e = ESTANTE_MAP[m.estante];
                    return <ProdCard key={m.id} material={m} accentKey={e?.accent || "olive"} onClick={() => setMaterialAberto(m)} />;
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {(filtroL1 === "tudo" || filtroL1 === "ministrar") && (
          <>
            {/* INFANTIL — aparece antes dos demais públicos */}
            {infantilVisiveis().length > 0 && (
              <div className="loja-familia">
                {filtroL1 === "tudo" && (
                  <div className="loja-familia-head">
                    <span className="loja-familia-eyebrow" style={{ color: ACCENTS.wheat.base }}>◆ Infantil</span>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--subtle)" }}>{totalInfantil} materiais</span>
                  </div>
                )}
                {infantilVisiveis().map((e) => (
                  <Shelf key={e.key} estante={e} materiais={materiaisDe(e.key)} onCardClick={setMaterialAberto} onVerTodos={setEstanteAberta} />
                ))}
              </div>
            )}

            {/* DEMAIS PÚBLICOS (Juniores, Adolescentes, Jovens, Igreja toda) */}
            {(!estanteAtiva || estanteAtiva !== "infantil") && (
              <div className="loja-familia">
                {filtroL1 === "tudo" && (
                  <div className="loja-familia-head">
                    <span className="loja-familia-eyebrow">◆</span>
                    <div className="loja-familia-title">Para <em>ministrar</em></div>
                  </div>
                )}
                {estantesVisiveis(ESTANTES_MINISTRAR).map((e) => (
                  <Shelf key={e.key} estante={e} materiais={materiaisDe(e.key)} onCardClick={setMaterialAberto} onVerTodos={setEstanteAberta} />
                ))}
              </div>
            )}
          </>
        )}

        {(filtroL1 === "tudo" || filtroL1 === "liderar") && (
          <div className="loja-familia">
            {filtroL1 === "tudo" && (
              <div className="loja-familia-head">
                <span className="loja-familia-eyebrow">◆</span>
                <div className="loja-familia-title">Para <em>liderar</em></div>
              </div>
            )}
            {estantesVisiveis(ESTANTES_LIDERAR).map((e) => (
              <Shelf key={e.key} estante={e} materiais={materiaisDe(e.key)} onCardClick={setMaterialAberto} onVerTodos={setEstanteAberta} />
            ))}
          </div>
        )}
      </div>

      {showCrossLink && (
        <div className="pg-wrap" style={{ paddingBottom: 64 }}>
          <div style={{
            background: "var(--graphite)",
            border: "0.5px solid var(--border-2)",
            borderRadius: "var(--r-lg)",
            padding: "32px 40px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 24,
            flexWrap: "wrap",
          }}>
            <div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--olive)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>◆ Quer ir além do material pronto?</div>
              <p style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--white)" }}>
                Precisa de formação ao vivo, não só de material pronto?
              </p>
            </div>
            <a href="/cursos" className="btn btn-primary btn-arrow">Conheça os cursos</a>
          </div>
        </div>
      )}

      {estanteAberta && (
        <ShelfModal
          estante={estanteAberta}
          materiais={materiaisDe(estanteAberta.key)}
          onCardClick={(m) => { setEstanteAberta(null); setMaterialAberto(m); }}
          onClose={() => setEstanteAberta(null)}
        />
      )}

      {materialAberto && (
        <Modal material={materialAberto} onClose={() => setMaterialAberto(null)} />
      )}
    </>
  );
}
