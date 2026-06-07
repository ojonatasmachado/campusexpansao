"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Nav from "../components/Nav";
import Footer from "../components/Footer";

// ─── CONSTANTE NETFLIX (altere aqui para mudar o threshold) ─────────────────
const SHELF_CAROUSEL_THRESHOLD = 6;

// ─── TIPOS ──────────────────────────────────────────────────────────────────
type Familia = "ministrar" | "liderar";
type FiltroL1 = "tudo" | Familia | "eventos";
type Colecao = "retiro" | "conferencia";

interface Material {
  id: string;
  familia: Familia;
  estante: string;
  etiqueta: string;
  titulo: string;
  promessa: string;
  capa: string;
  meta: { mensagens?: number; paginas: number; formatos: string[] };
  preco: string;
  hotmartUrl: string;
  colecoes: Colecao[];
  praQuem: string;
  conteudo: string[];
  comoUsar: string;
  faq: { q: string; a: string }[];
}

// ─── ESTANTES ───────────────────────────────────────────────────────────────
const ESTANTES_MINISTRAR = [
  { key: "juniores",    label: "Juniores" },
  { key: "adolescentes", label: "Adolescentes" },
  { key: "jovens",      label: "Jovens" },
  { key: "igreja-toda", label: "Igreja toda" },
];
const ESTANTES_LIDERAR = [
  { key: "manuais",            label: "Manuais" },
  { key: "criar-ministerio",   label: "Criar ministério" },
  { key: "modelos-checklists", label: "Modelos & Checklists" },
  { key: "montar-evento",      label: "Montar evento" },
];

// ─── GRADIENTES POR ESTANTE ──────────────────────────────────────────────────
const G: Record<string, string> = {
  juniores:           "linear-gradient(135deg,#7A9E3F 0%,#4F6B26 100%)",
  adolescentes:       "linear-gradient(135deg,#181B16 0%,#4F6B26 100%)",
  jovens:             "linear-gradient(135deg,#1F221C 0%,#2E3327 100%)",
  "igreja-toda":      "linear-gradient(135deg,#4F6B26 0%,#0E110D 100%)",
  manuais:            "linear-gradient(135deg,#25291F 0%,#181B16 100%)",
  "criar-ministerio": "linear-gradient(135deg,#1F221C 0%,#3A4E20 100%)",
  "modelos-checklists":"linear-gradient(135deg,#181B16 0%,#25291F 100%)",
  "montar-evento":    "linear-gradient(135deg,#4F6B26 0%,#181B16 100%)",
};

// ─── DADOS ──────────────────────────────────────────────────────────────────
const MATERIAIS: Material[] = [
  // ── ADOLESCENTES (7 itens → carrossel) ──────────────────────────────────
  {
    id: "firmes", familia: "ministrar", estante: "adolescentes",
    etiqueta: "Adolescentes", titulo: "Firmes",
    promessa: "Seis mensagens que ancora adolescentes no fundamento da fé.",
    capa: G["adolescentes"],
    meta: { mensagens: 6, paginas: 48, formatos: ["PDF", "Editável", "Slides"] },
    preco: "R$ 47", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para o líder que trabalha com adolescentes que vivem cercados de dúvidas e pressão cultural — e precisam saber em quem crer, não só o que crer.",
    conteudo: ["Mensagem 1 — Quem é Jesus de verdade?", "Mensagem 2 — A Bíblia como âncora", "Mensagem 3 — Quando a fé parece fraca", "Mensagem 4 — A comunidade que sustenta", "Mensagem 5 — Fé na adversidade", "Mensagem 6 — Firmes e inabaláveis"],
    comoUsar: "Cada mensagem vem em Word editável com roteiro expandido, perguntas para small groups e sugestão de atividade prática. Adapte a linguagem do seu pregador em minutos.",
    faq: [{ q: "Dá pra editar o conteúdo?", a: "Sim. Arquivo Word aberto, sem senha, pronto para adaptar." }, { q: "Funciona para grupos pequenos?", a: "Séries funcionam de 5 a 500 pessoas. O formato é flexível." }],
  },
  {
    id: "raizes", familia: "ministrar", estante: "adolescentes",
    etiqueta: "Adolescentes", titulo: "Raízes",
    promessa: "Cinco mensagens sobre identidade cristã para quem ainda está descobrindo quem é.",
    capa: "linear-gradient(135deg,#2E3327 0%,#4F6B26 100%)",
    meta: { mensagens: 5, paginas: 40, formatos: ["PDF", "Editável"] },
    preco: "R$ 47", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para líderes que percebem que seus adolescentes constroem identidade a partir de comparação, redes sociais e aprovação dos outros — e precisam de uma base mais profunda.",
    conteudo: ["Mensagem 1 — Quem eu sou sem o que dizem de mim?", "Mensagem 2 — Criado à imagem de Deus", "Mensagem 3 — A mentira da performance", "Mensagem 4 — Pertencer sem precisar provar", "Mensagem 5 — Plantado, frutificando"],
    comoUsar: "Material em Word com roteiro, aplicação prática e perguntas de grupo. Adapte o contexto cultural em menos de 30 minutos.",
    faq: [{ q: "Tem slides prontos?", a: "Não neste pacote. O arquivo Word tem indicações visuais para criar seus próprios slides." }, { q: "Posso usar em retiro?", a: "Sim. A série funciona bem em formato intensivo de retiro." }],
  },
  {
    id: "entre-dois-mundos", familia: "ministrar", estante: "adolescentes",
    etiqueta: "Adolescentes", titulo: "Entre Dois Mundos",
    promessa: "Sete mensagens sobre viver a fé no cotidiano de quem não se encaixa em lugar nenhum.",
    capa: "linear-gradient(135deg,#0E110D 0%,#2E3327 100%)",
    meta: { mensagens: 7, paginas: 56, formatos: ["PDF", "Editável", "Slides"] },
    preco: "R$ 67", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para líderes que trabalham com adolescentes que sentem que não pertencem nem ao mundo cristão nem ao secular — e vivem essa tensão com ansiedade.",
    conteudo: ["Mensagem 1 — Estrangeiros aqui", "Mensagem 2 — Fé que não envergonha", "Mensagem 3 — Amigos que não crêem", "Mensagem 4 — Escola e fé", "Mensagem 5 — Redes sociais e o mundo que construímos", "Mensagem 6 — Sendo luz sem apagar ninguém", "Mensagem 7 — A cidadania que não passa"],
    comoUsar: "Roteiro expandido com pontes culturais específicas para cada contexto — escola, redes sociais, família. Material mais longo para séries de médio prazo.",
    faq: [{ q: "É muito teológico para adolescentes?", a: "Não. A linguagem é acessível e os exemplos são cotidianos. Testado em grupos de 14 a 17 anos." }, { q: "Posso dividir em módulos menores?", a: "Sim. Cada mensagem é independente e pode ser pregada fora de ordem." }],
  },
  {
    id: "primeira-vez", familia: "ministrar", estante: "adolescentes",
    etiqueta: "Adolescentes", titulo: "Primeira Vez",
    promessa: "Quatro mensagens de abertura de ano que colocam adolescentes na direção certa desde o início.",
    capa: "linear-gradient(135deg,#3A4E20 0%,#1F221C 100%)",
    meta: { mensagens: 4, paginas: 32, formatos: ["PDF", "Editável"] },
    preco: "R$ 37", hotmartUrl: "https://pay.hotmart.com/", colecoes: ["retiro"],
    praQuem: "Para líderes que querem começar o ano ministerial com intenção — estabelecendo expectativas, criando cultura de grupo e apontando a direção para os próximos meses.",
    conteudo: ["Mensagem 1 — Por que estamos aqui?", "Mensagem 2 — O tipo de pessoa que queremos ser", "Mensagem 3 — O que Deus quer fazer neste ano", "Mensagem 4 — Começa agora"],
    comoUsar: "Ideal para o primeiro mês de atividades. Funciona igualmente como abertura de retiro de início de ano.",
    faq: [{ q: "Funciona para abertura de retiro?", a: "Sim. A série foi desenhada para funcionar tanto em cultos semanais quanto em formato de retiro de 2 dias." }],
  },
  {
    id: "nao-desista", familia: "ministrar", estante: "adolescentes",
    etiqueta: "Adolescentes", titulo: "Não Desista",
    promessa: "Cinco mensagens sobre perseverança para adolescentes que estão pensando em desistir — da fé, dos sonhos, do grupo.",
    capa: "linear-gradient(135deg,#181B16 0%,#3A4E20 100%)",
    meta: { mensagens: 5, paginas: 44, formatos: ["PDF", "Editável"] },
    preco: "R$ 47", hotmartUrl: "https://pay.hotmart.com/", colecoes: ["retiro"],
    praQuem: "Para líderes que percebem cansaço, afastamento ou apatia espiritual nos adolescentes — e precisam de uma série que fale essa realidade sem fingir que está tudo bem.",
    conteudo: ["Mensagem 1 — É normal se sentir assim?", "Mensagem 2 — Elias também quis desistir", "Mensagem 3 — A coragem de ficar", "Mensagem 4 — Onde buscar força", "Mensagem 5 — A promessa que sustenta"],
    comoUsar: "Série densa para ser usada com cuidado. Recomendamos small groups de acompanhamento paralelos às mensagens.",
    faq: [{ q: "É muito pesado para adolescentes?", a: "A linguagem é cuidadosa — honesta sem ser desesperançosa. Parte da realidade, termina na promessa." }],
  },
  {
    id: "o-nome-certo", familia: "ministrar", estante: "adolescentes",
    etiqueta: "Adolescentes", titulo: "O Nome Certo",
    promessa: "Seis mensagens sobre chamado e identidade para quem ainda está tentando descobrir quem é.",
    capa: "linear-gradient(135deg,#25291F 0%,#4F6B26 100%)",
    meta: { mensagens: 6, paginas: 48, formatos: ["PDF", "Editável", "Slides"] },
    preco: "R$ 47", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para líderes que querem abordar chamado sem romantizar — mostrando que vocação começa no ordinário, não no excepcional.",
    conteudo: ["Mensagem 1 — Deus sabe o seu nome", "Mensagem 2 — Antes da competência, o chamado", "Mensagem 3 — O que você faz com o que tem", "Mensagem 4 — Chamado no cotidiano", "Mensagem 5 — Pequeno e fiel", "Mensagem 6 — O próximo passo"],
    comoUsar: "Série de 6 semanas com progressão clara. Cada mensagem inclui \"Próximo passo\" concreto para a semana seguinte.",
    faq: [{ q: "Funciona para jovens também?", a: "Sim. Apesar de desenhada para adolescentes, a linguagem funciona para jovens de 18 a 25 anos também." }],
  },
  {
    id: "geracao-levante", familia: "ministrar", estante: "adolescentes",
    etiqueta: "Adolescentes", titulo: "Geração Levante",
    promessa: "Oito mensagens sobre missão e propósito — para adolescentes que querem que sua vida importe.",
    capa: "linear-gradient(135deg,#4F6B26 0%,#1F221C 100%)",
    meta: { mensagens: 8, paginas: 64, formatos: ["PDF", "Editável", "Slides"] },
    preco: "R$ 67", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para líderes que trabalham com adolescentes com potencial de liderança — e querem direcionar essa energia para algo que dure.",
    conteudo: ["Mensagem 1 — Uma geração com propósito", "Mensagem 2 — O que o mundo precisa", "Mensagem 3 — O papel da sua geração", "Mensagem 4 — Missão começa aqui", "Mensagem 5 — Servir como forma de vida", "Mensagem 6 — Liderança que cuida", "Mensagem 7 — O custo de ser diferente", "Mensagem 8 — Levanta"],
    comoUsar: "Série longa para uso em semestres ou como âncora de um programa de formação de líderes juniores.",
    faq: [{ q: "Posso usar como formação de liderança?", a: "Sim. Vem com perguntas de mentoria que funcionam como base para 1 a 1 com líderes em formação." }],
  },

  // ── JUNIORES (4 itens → grid) ────────────────────────────────────────────
  {
    id: "pequenos-grandes", familia: "ministrar", estante: "juniores",
    etiqueta: "Juniores", titulo: "Pequenos Grandes",
    promessa: "Cinco lições sobre crianças da Bíblia que foram usadas por Deus — mesmo sendo pequenas.",
    capa: G["juniores"],
    meta: { mensagens: 5, paginas: 40, formatos: ["PDF", "Editável"] },
    preco: "R$ 37", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para líderes de ministério infantil que querem inspirar crianças de 7 a 12 anos a perceber que Deus usa quem está disposto — independente da idade.",
    conteudo: ["Lição 1 — Davi: pequeno, mas escolhido", "Lição 2 — A menina serva de Naamã", "Lição 3 — O menino com os cinco pães", "Lição 4 — Timóteo: jovem, mas fiel", "Lição 5 — Você também conta"],
    comoUsar: "Roteiro com linguagem adaptada para crianças, dinâmica sugerida por lição e verso para memorizar. Formato de 40 a 50 minutos por encontro.",
    faq: [{ q: "Qual faixa etária?", a: "7 a 12 anos. A linguagem escala bem para esse intervalo." }, { q: "Tem atividades?", a: "Sim. Cada lição inclui uma dinâmica prática e o verso da semana." }],
  },
  {
    id: "deus-cuida", familia: "ministrar", estante: "juniores",
    etiqueta: "Juniores", titulo: "Deus Cuida",
    promessa: "Quatro encontros sobre confiança e ansiedade para crianças que também sentem medo.",
    capa: "linear-gradient(135deg,#94B85C 0%,#4F6B26 100%)",
    meta: { mensagens: 4, paginas: 32, formatos: ["PDF", "Editável"] },
    preco: "R$ 37", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para líderes que percebem ansiedade e medo em crianças — e querem falar essa realidade de forma gentil, com base bíblica sólida.",
    conteudo: ["Lição 1 — É normal ter medo?", "Lição 2 — Deus vê você", "Lição 3 — Confiar mesmo sem entender", "Lição 4 — Paz que guarda"],
    comoUsar: "Série leve e afetiva. Inclui dinâmica de oração adaptada para crianças e arte para imprimir.",
    faq: [{ q: "Funciona para crianças que passam por situações difíceis?", a: "Sim. A linguagem é gentil e não trivializa a dor — aponta para o cuidado de Deus sem minimizar o sentimento." }],
  },
  {
    id: "missao-possivel", familia: "ministrar", estante: "juniores",
    etiqueta: "Juniores", titulo: "Missão Possível",
    promessa: "Cinco encontros sobre crianças missionárias — porque a missão começa antes da viagem.",
    capa: "linear-gradient(135deg,#7A9E3F 0%,#2E3327 100%)",
    meta: { mensagens: 5, paginas: 40, formatos: ["PDF", "Editável"] },
    preco: "R$ 47", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para líderes que querem formar crianças com visão missionária — não só para o futuro, mas para a vida que têm agora.",
    conteudo: ["Lição 1 — O que é missão?", "Lição 2 — Missionário começa em casa", "Lição 3 — Na escola também dá", "Lição 4 — Orar é parte da missão", "Lição 5 — Pronto, vá"],
    comoUsar: "Série com linguagem de aventura e missão. Inclui \"Missão da semana\" — uma tarefa prática para a criança completar antes do próximo encontro.",
    faq: [{ q: "Tem material de apoio para os pais?", a: "Sim. Cada lição inclui um cartão resumo para os pais saberem o que trabalhar em casa." }],
  },
  {
    id: "brilha", familia: "ministrar", estante: "juniores",
    etiqueta: "Juniores", titulo: "Brilha!",
    promessa: "Quatro lições sobre ser luz na escola — para crianças que não sabem como viver a fé no dia a dia.",
    capa: "linear-gradient(135deg,#94B85C 0%,#7A9E3F 100%)",
    meta: { mensagens: 4, paginas: 32, formatos: ["PDF", "Editável"] },
    preco: "R$ 37", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para líderes que querem equipar crianças para viver a fé fora da igreja — na escola, em casa, na vizinhança.",
    conteudo: ["Lição 1 — O que significa ser luz?", "Lição 2 — Brilhar na sala de aula", "Lição 3 — Amizade que reflete", "Lição 4 — Sua vida já é testemunho"],
    comoUsar: "Série curta e prática. Ideal para mês missionário ou como introdução ao tema missão.",
    faq: [{ q: "Funciona como série isolada?", a: "Sim. Também é uma boa introdução para a série Missão Possível." }],
  },

  // ── JOVENS (5 itens → grid) ──────────────────────────────────────────────
  {
    id: "alta-performance", familia: "ministrar", estante: "jovens",
    etiqueta: "Jovens", titulo: "Alta Performance",
    promessa: "Seis mensagens sobre excelência com propósito — para jovens que querem crescer sem perder a alma.",
    capa: G["jovens"],
    meta: { mensagens: 6, paginas: 52, formatos: ["PDF", "Editável", "Slides"] },
    preco: "R$ 67", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para líderes que trabalham com jovens universitários e profissionais que vivem sob pressão de performance — e precisam recalibrar o que é sucesso.",
    conteudo: ["Mensagem 1 — Excelência não é perfeccionismo", "Mensagem 2 — Para quem você trabalha?", "Mensagem 3 — Descanso não é preguiça", "Mensagem 4 — O que você está construindo?", "Mensagem 5 — Ambição a serviço do reino", "Mensagem 6 — A vida plena"],
    comoUsar: "Série para jovens adultos. Inclui perguntas para grupos de discussão e leituras complementares por mensagem.",
    faq: [{ q: "Funciona para universitários?", a: "Sim. O conteúdo foi desenhado especificamente para quem está em fase de escolhas de carreira e identidade." }],
  },
  {
    id: "relacionamentos", familia: "ministrar", estante: "jovens",
    etiqueta: "Jovens", titulo: "Relacionamentos",
    promessa: "Sete mensagens sobre amor, namoro e pureza — com honestidade, sem religiosidade vazia.",
    capa: "linear-gradient(135deg,#2E3327 0%,#1F221C 100%)",
    meta: { mensagens: 7, paginas: 60, formatos: ["PDF", "Editável"] },
    preco: "R$ 67", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para líderes que querem abordar relacionamentos de forma bíblica e culturalmente relevante — sem romantismo vazio nem moralismo desnecessário.",
    conteudo: ["Mensagem 1 — Deus inventou o amor", "Mensagem 2 — O que você está buscando?", "Mensagem 3 — Pureza como projeto, não regra", "Mensagem 4 — Amizade é base", "Mensagem 5 — Quando o coração engana", "Mensagem 6 — Conflito e perdão", "Mensagem 7 — Relacionamentos que glorificam"],
    comoUsar: "Série sensível que exige ambiente de confiança. Recomendamos preparar small groups por gênero para aprofundar.",
    faq: [{ q: "Aborda sexualidade?", a: "De forma madura e bíblica. O foco é formação de caráter e visão de mundo, não só regras de comportamento." }],
  },
  {
    id: "vocacao", familia: "ministrar", estante: "jovens",
    etiqueta: "Jovens", titulo: "Vocação",
    promessa: "Seis mensagens sobre chamado e carreira — para jovens que querem integrar fé e trabalho.",
    capa: "linear-gradient(135deg,#1F221C 0%,#4F6B26 100%)",
    meta: { mensagens: 6, paginas: 52, formatos: ["PDF", "Editável", "Slides"] },
    preco: "R$ 67", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para líderes que acompanham jovens em transição — terminando faculdade, entrando no mercado de trabalho ou questionando se o que fazem tem sentido.",
    conteudo: ["Mensagem 1 — Todo trabalho é ministério?", "Mensagem 2 — Chamado não é cargo", "Mensagem 3 — Como escolher?", "Mensagem 4 — Fiel no processo", "Mensagem 5 — Trabalho e descanso", "Mensagem 6 — Onde você planta"],
    comoUsar: "Série com leituras complementares e perguntas de mentoria para 1 a 1. Ideal para grupos de jovens adultos em transição de vida.",
    faq: [{ q: "Posso adaptar para faculdade?", a: "Sim. Vem com versões adaptadas das perguntas para contexto universitário e pós-graduação." }],
  },
  {
    id: "resilientes", familia: "ministrar", estante: "jovens",
    etiqueta: "Jovens", titulo: "Resilientes",
    promessa: "Cinco mensagens sobre fé em tempo de crise — quando o mundo desmorona e Deus parece silencioso.",
    capa: "linear-gradient(135deg,#25291F 0%,#2E3327 100%)",
    meta: { mensagens: 5, paginas: 44, formatos: ["PDF", "Editável"] },
    preco: "R$ 47", hotmartUrl: "https://pay.hotmart.com/", colecoes: ["retiro"],
    praQuem: "Para líderes que percebem jovens desiludidos, cansados ou distantes após períodos difíceis — e precisam de uma série que fale a realidade sem falsas promessas.",
    conteudo: ["Mensagem 1 — Está tudo bem não estar bem", "Mensagem 2 — Fé que sobrevive à dúvida", "Mensagem 3 — Lamentação é oração", "Mensagem 4 — A presença no vale", "Mensagem 5 — Depois da tempestade"],
    comoUsar: "Série densa. Funciona muito bem em formato de retiro com momentos de oração e partilha após cada mensagem.",
    faq: [{ q: "É muito pesado para jovens?", a: "A linguagem é honesta, mas não desesperançosa. Começa na realidade e termina na promessa." }],
  },
  {
    id: "primeiros-passos", familia: "ministrar", estante: "jovens",
    etiqueta: "Jovens", titulo: "Primeiros Passos",
    promessa: "Quatro mensagens de discipulado para novos convertidos que precisam entender o que acabou de acontecer.",
    capa: "linear-gradient(135deg,#3A4E20 0%,#25291F 100%)",
    meta: { mensagens: 4, paginas: 36, formatos: ["PDF", "Editável"] },
    preco: "R$ 47", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para líderes que acolhem novos convertidos e precisam de material simples, claro e não intimidador para os primeiros meses de fé.",
    conteudo: ["Mensagem 1 — O que aconteceu comigo?", "Mensagem 2 — Como ler a Bíblia", "Mensagem 3 — Por que me batizar?", "Mensagem 4 — Uma vida diferente"],
    comoUsar: "Funciona como série de culto ou como material de acompanhamento 1 a 1. Linguagem simples, sem jargão religioso.",
    faq: [{ q: "Funciona para quem não tem base bíblica?", a: "Sim. Foi desenhado exatamente para isso. Zero pressuposto de conhecimento prévio." }],
  },

  // ── IGREJA TODA (4 itens → grid) ─────────────────────────────────────────
  {
    id: "familia-do-jeito-certo", familia: "ministrar", estante: "igreja-toda",
    etiqueta: "Igreja toda", titulo: "Família do Jeito Certo",
    promessa: "Oito mensagens sobre família bíblica — para pregar com a congregação inteira sem simplificar a realidade.",
    capa: G["igreja-toda"],
    meta: { mensagens: 8, paginas: 72, formatos: ["PDF", "Editável", "Slides"] },
    preco: "R$ 97", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para pastores e pregadores que querem abordar família de forma bíblica e pastoral — honrando diferentes configurações familiares sem perder o fundamento.",
    conteudo: ["Mensagem 1 — Família é ideia de Deus", "Mensagem 2 — O lar como escola", "Mensagem 3 — Matrimônio e aliança", "Mensagem 4 — Filhos e autoridade", "Mensagem 5 — Famílias feridas, Deus que cura", "Mensagem 6 — Família monoparental, coração inteiro", "Mensagem 7 — A família da fé", "Mensagem 8 — O que queremos passar para a próxima geração"],
    comoUsar: "Série pensada para cultos dominicais. Cada mensagem inclui variação de aplicação para famílias diferentes (casados, solteiros, pais solo).",
    faq: [{ q: "Aborda divórcio e recasamento?", a: "Sim, na mensagem 5 e de forma pastoral — sem condenação, com cuidado bíblico." }],
  },
  {
    id: "generosidade", familia: "ministrar", estante: "igreja-toda",
    etiqueta: "Igreja toda", titulo: "Generosidade",
    promessa: "Cinco mensagens sobre oferta e mordomia que transformam a forma como a congregação vê o dinheiro.",
    capa: "linear-gradient(135deg,#3A4E20 0%,#0E110D 100%)",
    meta: { mensagens: 5, paginas: 44, formatos: ["PDF", "Editável"] },
    preco: "R$ 67", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para pastores que evitam pregar sobre dinheiro — e precisam de uma série que aborde o tema sem manipulação, com base bíblica sólida e aplicação prática.",
    conteudo: ["Mensagem 1 — Por que a Bíblia fala tanto de dinheiro?", "Mensagem 2 — Mordomia: tudo é de Deus", "Mensagem 3 — Dízimo como ato de fé", "Mensagem 4 — Oferta além do dízimo", "Mensagem 5 — O coração que dá"],
    comoUsar: "Série para momentos estratégicos (campanhas, início de ano, planejamento financeiro da igreja). Inclui variação para contexto de oferta de obra.",
    faq: [{ q: "Pode gerar rejeição na congregação?", a: "Toda série sobre dinheiro tem esse risco. Este material foi construído para disarmar a resistência antes de tratar o tema." }],
  },
  {
    id: "ano-novo-vida-nova", familia: "ministrar", estante: "igreja-toda",
    etiqueta: "Igreja toda", titulo: "Ano Novo Vida Nova",
    promessa: "Quatro mensagens de virada de ano que ancoram esperança sem romantizar o que vem por aí.",
    capa: "linear-gradient(135deg,#4F6B26 0%,#25291F 100%)",
    meta: { mensagens: 4, paginas: 36, formatos: ["PDF", "Editável"] },
    preco: "R$ 47", hotmartUrl: "https://pay.hotmart.com/", colecoes: ["retiro"],
    praQuem: "Para pastores e líderes que precisam de conteúdo de transição de ano — que celebre o que Deus fez e projete o que está por vir, com realismo e fé.",
    conteudo: ["Mensagem 1 — Antes de olhar pra frente", "Mensagem 2 — Tudo novo e tudo the same?", "Mensagem 3 — A fidelidade que garante o próximo passo", "Mensagem 4 — Que ano você quer ter?"],
    comoUsar: "Série de dezembro ou janeiro. Funciona para cultos de final de ano, retiro de virada ou primeiras semanas do ano.",
    faq: [{ q: "Pode ser usada em dezembro ou janeiro?", a: "Sim. A série funciona tanto para encerramento de dezembro quanto para abertura de janeiro." }],
  },
  {
    id: "sal-e-luz", familia: "ministrar", estante: "igreja-toda",
    etiqueta: "Igreja toda", titulo: "Sal e Luz",
    promessa: "Seis mensagens sobre missão cotidiana — para uma congregação que quer impactar sua cidade sem sair da rotina.",
    capa: "linear-gradient(135deg,#2E3327 0%,#4F6B26 100%)",
    meta: { mensagens: 6, paginas: 52, formatos: ["PDF", "Editável", "Slides"] },
    preco: "R$ 67", hotmartUrl: "https://pay.hotmart.com/", colecoes: ["conferencia"],
    praQuem: "Para pastores que querem mobilizar a congregação inteira para missão — sem romantismo, com foco no cotidiano de cada membro no bairro, no trabalho, na família.",
    conteudo: ["Mensagem 1 — Missão é para todo crente", "Mensagem 2 — Sal: presença que preserva", "Mensagem 3 — Luz: vida que ilumina", "Mensagem 4 — No mercado de trabalho", "Mensagem 5 — Na vizinhança", "Mensagem 6 — A igreja que vai"],
    comoUsar: "Série de impacto para todo o corpo. Ideal para campanhas missionárias ou conferências congregacionais.",
    faq: [{ q: "Funciona como série de conferência?", a: "Sim. Vem com versão em formato de conferência de 2 dias (manhã e tarde)." }],
  },

  // ── MANUAIS (4 itens → grid) ─────────────────────────────────────────────
  {
    id: "manual-celula", familia: "liderar", estante: "manuais",
    etiqueta: "Manual", titulo: "Manual do Líder de Célula",
    promessa: "Guia completo para quem lidera pequenos grupos — do primeiro encontro ao discipulado contínuo.",
    capa: G["manuais"],
    meta: { paginas: 80, formatos: ["PDF", "Editável"] },
    preco: "R$ 97", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para coordenadores de células que precisam de um material de formação para seus líderes — que cubra prática, teologia e pastoreio em um único documento.",
    conteudo: ["Parte 1 — O que é uma célula saudável", "Parte 2 — O papel do líder (não é ser pastor)", "Parte 3 — Como conduzir o primeiro encontro", "Parte 4 — Discipulado na célula", "Parte 5 — Quando a célula emperra", "Parte 6 — Multiplicação", "Apêndice — Modelos de encontro e checklists"],
    comoUsar: "Manual de referência + guia de formação. Pode ser usado como material de treinamento de líderes (8 encontros de 1h30) ou como consulta individual.",
    faq: [{ q: "Para qual denominação?", a: "O manual é transdenominacional. Adaptável a qualquer modelo de célula (G12, células puras, comunidades)." }],
  },
  {
    id: "manual-adolescentes", familia: "liderar", estante: "manuais",
    etiqueta: "Manual", titulo: "Manual do Liderinho",
    promessa: "Guia prático para líderes de adolescentes — linguagem, relacionamento, formação e pastoreio.",
    capa: "linear-gradient(135deg,#1F221C 0%,#25291F 100%)",
    meta: { paginas: 72, formatos: ["PDF", "Editável"] },
    preco: "R$ 97", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para coordenadores de ministério jovem e de adolescentes que precisam formar seus líderes — em especial os que nunca lideraram antes.",
    conteudo: ["Parte 1 — Quem é o adolescente de hoje", "Parte 2 — O líder como referência", "Parte 3 — Como se relacionar sem perder a autoridade", "Parte 4 — Pastoreio: quando vai além da reunião", "Parte 5 — Crises e situações difíceis", "Parte 6 — Formação contínua do líder"],
    comoUsar: "Manual de formação de líderes de adolescentes. Ideal para o processo de certificação de voluntários.",
    faq: [{ q: "Funciona para líderes jovens (18-22 anos)?", a: "Sim. Foi escrito pensando em líderes que têm pouca diferença de idade dos liderados." }],
  },
  {
    id: "manual-discipulado", familia: "liderar", estante: "manuais",
    etiqueta: "Manual", titulo: "Manual de Discipulado",
    promessa: "Processo completo de discipulado individual — do primeiro contato ao envio para liderar outros.",
    capa: "linear-gradient(135deg,#25291F 0%,#181B16 100%)",
    meta: { paginas: 56, formatos: ["PDF", "Editável"] },
    preco: "R$ 67", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para líderes que fazem 1 a 1 mas não têm metodologia — e precisam de um processo claro do primeiro encontro ao envio.",
    conteudo: ["Parte 1 — O que é discipulado (e o que não é)", "Parte 2 — Estrutura do 1 a 1", "Parte 3 — Perguntas certas na hora certa", "Parte 4 — Acompanhamento de crise", "Parte 5 — Quando o discípulo está pronto para discipular", "Apêndice — Templates de perguntas e guia de encontros"],
    comoUsar: "Manual de referência para discipuladores. Inclui 12 templates de encontros mensais já estruturados.",
    faq: [{ q: "Preciso de experiência prévia para usar?", a: "Não. O manual guia o discipulador desde o começo, incluindo erros comuns para evitar." }],
  },
  {
    id: "manual-pastoral", familia: "liderar", estante: "manuais",
    etiqueta: "Manual", titulo: "Manual de Pastoral",
    promessa: "Cuidado e aconselhamento básico para líderes que pastoreiam sem ser pastores.",
    capa: "linear-gradient(135deg,#181B16 0%,#2E3327 100%)",
    meta: { paginas: 88, formatos: ["PDF", "Editável"] },
    preco: "R$ 97", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para líderes e voluntários que se veem diante de situações de aconselhamento — crise, luto, conflito, questões de saúde mental — sem saber como agir.",
    conteudo: ["Parte 1 — O papel do líder no cuidado pastoral", "Parte 2 — Escuta ativa e limites", "Parte 3 — Crise e intervenção básica", "Parte 4 — Luto e perdas", "Parte 5 — Saúde mental e fé", "Parte 6 — Quando encaminhar para um profissional", "Apêndice — Recursos e rede de apoio"],
    comoUsar: "Manual de referência. Não substitui acompanhamento profissional — orienta o líder sobre quando e como agir.",
    faq: [{ q: "Substitui formação em aconselhamento?", a: "Não. É um guia prático para situações cotidianas — ensina a ouvir bem e saber quando encaminhar." }],
  },

  // ── CRIAR MINISTÉRIO (3 itens → grid) ────────────────────────────────────
  {
    id: "montar-min-adolescentes", familia: "liderar", estante: "criar-ministerio",
    etiqueta: "Criar ministério", titulo: "Montando um Ministério de Adolescentes",
    promessa: "Do zero ao sistema: como estruturar um ministério de adolescentes que funciona sem depender de uma pessoa.",
    capa: G["criar-ministerio"],
    meta: { paginas: 64, formatos: ["PDF", "Editável"] },
    preco: "R$ 97", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para líderes que estão começando um ministério de adolescentes do zero — ou que têm um que depende completamente de uma pessoa para funcionar.",
    conteudo: ["Módulo 1 — Diagnóstico: onde você está", "Módulo 2 — Visão e propósito do ministério", "Módulo 3 — Estrutura e cargos", "Módulo 4 — Recrutamento e formação de voluntários", "Módulo 5 — Calendário e programação", "Módulo 6 — Integração com a igreja", "Módulo 7 — Sistema de acompanhamento", "Módulo 8 — Como crescer sem perder a saúde"],
    comoUsar: "Guia de implantação em 8 módulos. Recomendamos trabalhar um módulo por semana com a equipe de liderança.",
    faq: [{ q: "E se eu já tenho um ministério funcionando?", a: "O Módulo 1 (Diagnóstico) identifica o que está sólido e o que precisa de estrutura. Você só implementa o que falta." }],
  },
  {
    id: "estruturar-celulas", familia: "liderar", estante: "criar-ministerio",
    etiqueta: "Criar ministério", titulo: "Como Estruturar um Grupo de Células",
    promessa: "Modelo prático para implantar ou reorganizar células — sem precisar reinventar o que já funciona.",
    capa: "linear-gradient(135deg,#2E3327 0%,#3A4E20 100%)",
    meta: { paginas: 48, formatos: ["PDF", "Editável"] },
    preco: "R$ 67", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para pastores e coordenadores que querem implementar células mas não sabem por onde começar — ou que já têm células mas sem sistema.",
    conteudo: ["Parte 1 — Por que células (e por que não funcionam na maioria das igrejas)", "Parte 2 — Modelos de célula", "Parte 3 — Implantando as primeiras células", "Parte 4 — Formando líderes em escala", "Parte 5 — Supervisão e cuidado", "Parte 6 — Manutenção do sistema"],
    comoUsar: "Guia de implantação prático, sem romantismo. Inclui cronograma de 90 dias para implantação inicial.",
    faq: [{ q: "Funciona para igrejas pequenas?", a: "Sim. O guia inclui versão adaptada para igrejas de menos de 100 pessoas." }],
  },
  {
    id: "lancar-missoes", familia: "liderar", estante: "criar-ministerio",
    etiqueta: "Criar ministério", titulo: "Lançando um Ministério de Missões",
    promessa: "Passo a passo para criar um ministério de missões que vai além do evento anual de coleta.",
    capa: "linear-gradient(135deg,#1F221C 0%,#4F6B26 100%)",
    meta: { paginas: 60, formatos: ["PDF", "Editável"] },
    preco: "R$ 97", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para líderes que querem levar a igreja de ações pontuais de missão para um ministério estruturado e contínuo.",
    conteudo: ["Parte 1 — O que é um ministério de missões", "Parte 2 — Missão local, regional e global", "Parte 3 — Orçamento e sustentação de missionários", "Parte 4 — Mobilização da congregação", "Parte 5 — Parceria com organizações missionárias", "Parte 6 — Medindo impacto"],
    comoUsar: "Guia de estratégia missionária para igrejas locais. Inclui templates de orçamento e carta de compromisso missionário.",
    faq: [{ q: "Para igrejas que nunca tiveram missões?", a: "Sim. Começa do zero e escala progressivamente — sem pressão de montar tudo de uma vez." }],
  },

  // ── MODELOS & CHECKLISTS (4 itens → grid) ────────────────────────────────
  {
    id: "checklist-culto", familia: "liderar", estante: "modelos-checklists",
    etiqueta: "Checklist", titulo: "Checklist do Culto Especial",
    promessa: "Tudo que não pode falhar — produção, som, comunicação e hospitalidade em um único documento.",
    capa: G["modelos-checklists"],
    meta: { paginas: 12, formatos: ["PDF", "Editável"] },
    preco: "R$ 37", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para líderes de produção e coordenadores de culto que querem eliminar o improviso em eventos especiais — Natal, Páscoa, aniversário da igreja.",
    conteudo: ["Checklist de 30 dias antes", "Checklist de 7 dias antes", "Checklist de véspera", "Checklist no dia", "Checklist pós-evento", "Modelo de briefing de equipe"],
    comoUsar: "Documento Word editável. Adapte os itens para a realidade da sua estrutura e salve como template recorrente.",
    faq: [{ q: "Funciona para qualquer tamanho de iglesia?", a: "Sim. Os checklists têm itens opcionais marcados — remova o que não se aplica à sua realidade." }],
  },
  {
    id: "carta-compromisso", familia: "liderar", estante: "modelos-checklists",
    etiqueta: "Modelo", titulo: "Modelo de Carta de Compromisso",
    promessa: "Carta de compromisso para voluntários e líderes — clara, pastoral e sem juridiquês.",
    capa: "linear-gradient(135deg,#25291F 0%,#1F221C 100%)",
    meta: { paginas: 8, formatos: ["PDF", "Editável"] },
    preco: "R$ 27", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para coordenadores que querem formalizar o compromisso de voluntários sem criar uma burocracia fria — estabelecendo expectativas claras com amor.",
    conteudo: ["Modelo para líderes de célula", "Modelo para voluntários de ministério", "Modelo para equipe de produção", "Cláusulas de conduta e saída", "Guia de como usar a carta na prática"],
    comoUsar: "Edite os campos em Word e adapte para cada ministério. Vem com guia de como apresentar a carta na conversa de onboarding.",
    faq: [{ q: "Tem valor legal?", a: "Não tem valor jurídico — não é contrato. É um instrumento pastoral de alinhamento de expectativas." }],
  },
  {
    id: "onboarding-voluntario", familia: "liderar", estante: "modelos-checklists",
    etiqueta: "Kit", titulo: "Kit de Onboarding do Voluntário",
    promessa: "Primeiros passos para novos voluntários — do recrutamento à primeira tarefa, sem deixar ninguém perdido.",
    capa: "linear-gradient(135deg,#1F221C 0%,#25291F 100%)",
    meta: { paginas: 20, formatos: ["PDF", "Editável"] },
    preco: "R$ 47", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para líderes que recebem novos voluntários e veem eles sumindo depois de poucas semanas — porque ninguém os integrou de verdade.",
    conteudo: ["Guia de boas-vindas (personalizável)", "Folha de perfil e dons do voluntário", "Checklist de onboarding da primeira semana", "Formulário de expectativas", "Plano de acompanhamento dos primeiros 30 dias", "Modelo de conversa de feedback"],
    comoUsar: "Kit completo. Personalize o guia de boas-vindas com a identidade do seu ministério e siga o checklist cronologicamente.",
    faq: [{ q: "Funciona para todos os ministérios?", a: "Sim. O kit é genérico e adaptável. Vem com orientação de como personalizar por ministério." }],
  },
  {
    id: "relatorio-saude", familia: "liderar", estante: "modelos-checklists",
    etiqueta: "Relatório", titulo: "Relatório de Saúde da Igreja",
    promessa: "Diagnóstico mensal em uma página — para o pastor ter clareza sobre o que está crescendo e o que está regredindo.",
    capa: "linear-gradient(135deg,#181B16 0%,#1F221C 100%)",
    meta: { paginas: 16, formatos: ["PDF", "Editável"] },
    preco: "R$ 37", hotmartUrl: "https://pay.hotmart.com/", colecoes: [],
    praQuem: "Para pastores que tomam decisões de intuição e querem começar a tomar de dados — sem precisar de um sistema sofisticado.",
    conteudo: ["Relatório de presença e novos visitantes", "Relatório de discipulado e células", "Relatório financeiro simplificado", "Painel de saúde espiritual da equipe", "Guia de como coletar os dados", "Template de reunião mensal de liderança baseada no relatório"],
    comoUsar: "Preencha mensalmente. Leva menos de 1 hora para completar e gera clareza imediata sobre prioridades.",
    faq: [{ q: "Precisa de software especial?", a: "Não. É uma planilha e um documento Word. Funciona com o que você já tem." }],
  },

  // ── MONTAR EVENTO (3 itens → grid) ────────────────────────────────────────
  {
    id: "retiro-adolescentes", familia: "liderar", estante: "montar-evento",
    etiqueta: "Montar evento", titulo: "Retiro de Adolescentes",
    promessa: "Guia completo de produção — do briefing ao pós-retiro, para um evento que transforma e não vira um pesadelo logístico.",
    capa: G["montar-evento"],
    meta: { paginas: 90, formatos: ["PDF", "Editável"] },
    preco: "R$ 147", hotmartUrl: "https://pay.hotmart.com/", colecoes: ["retiro"],
    praQuem: "Para coordenadores de retiro que carregam o evento nas costas — e precisam de um sistema que distribua a carga, reduza o improviso e garanta que o espiritual não se perca no logístico.",
    conteudo: ["Módulo 1 — Propósito e tema do retiro", "Módulo 2 — Orçamento e viabilidade", "Módulo 3 — Local, translado e hospedagem", "Módulo 4 — Programação e grade horária", "Módulo 5 — Equipe e divisão de funções", "Módulo 6 — Comunicação e inscrições", "Módulo 7 — Logística no dia", "Módulo 8 — Pastoreio e cuidado durante o retiro", "Módulo 9 — Pós-retiro: como integrar o que aconteceu"],
    comoUsar: "Guia de 9 módulos + checklists cronológicos de 60, 30, 15, 7 e 1 dia antes. Inclui modelo de formulário de inscrição e carta de autorização para menores.",
    faq: [{ q: "Funciona para retiros de 1 dia?", a: "Sim. Os módulos são adaptáveis. O guia inclui versão compacta para day retreat." }, { q: "Precisa de equipe grande?", a: "Tem versão mínima para equipes de 3 a 5 pessoas." }],
  },
  {
    id: "conferencia-lideranca", familia: "liderar", estante: "montar-evento",
    etiqueta: "Montar evento", titulo: "Conferência de Liderança",
    promessa: "Do briefing ao pós-evento — como produzir uma conferência de liderança que move pessoas e não só enche auditório.",
    capa: "linear-gradient(135deg,#25291F 0%,#4F6B26 100%)",
    meta: { paginas: 80, formatos: ["PDF", "Editável"] },
    preco: "R$ 127", hotmartUrl: "https://pay.hotmart.com/", colecoes: ["conferencia"],
    praQuem: "Para líderes que organizam conferências e eventos de formação — e querem um evento que gere transformação real, não só audiência.",
    conteudo: ["Módulo 1 — Propósito da conferência", "Módulo 2 — Curadoria de conteúdo e speakers", "Módulo 3 — Produção e infraestrutura", "Módulo 4 — Comunicação e vendas de ingresso", "Módulo 5 — Experiência do participante", "Módulo 6 — Transmissão e registro", "Módulo 7 — Pós-conferência e follow-up"],
    comoUsar: "Guia de 7 módulos + checklists cronológicos. Inclui template de contrato de speaker e guia de curadoria de conteúdo.",
    faq: [{ q: "Para conferências grandes ou pequenas?", a: "Escala de 50 a 2000 participantes. Os módulos têm variações para cada escala." }],
  },
  {
    id: "culto-natal", familia: "liderar", estante: "montar-evento",
    etiqueta: "Montar evento", titulo: "Culto de Natal",
    promessa: "Roteiro e checklist completo para o culto mais importante do ano — sem improvisar no Natal.",
    capa: "linear-gradient(135deg,#4F6B26 0%,#25291F 100%)",
    meta: { paginas: 60, formatos: ["PDF", "Editável"] },
    preco: "R$ 97", hotmartUrl: "https://pay.hotmart.com/", colecoes: ["conferencia"],
    praQuem: "Para pastores e coordenadores de culto que querem que o Natal seja o melhor evento do ano — para membros e para os visitantes que só aparecem nesse dia.",
    conteudo: ["Módulo 1 — O Natal como porta de entrada", "Módulo 2 — Roteiro do culto", "Módulo 3 — Produção e decoração", "Módulo 4 — Música e adoração", "Módulo 5 — Comunicação e convite", "Módulo 6 — Acolhimento de visitantes", "Módulo 7 — Pós-Natal: como integrar quem chegou"],
    comoUsar: "Guia completo com roteiro de culto editável, checklist de produção e guia de acolhimento. Comece a usar em outubro para não correr em dezembro.",
    faq: [{ q: "Funciona para igrejas pequenas?", a: "Sim. O guia inclui versão simplificada para igrejas de menos de 100 pessoas." }, { q: "Tem roteiro de pregação?", a: "Não — o roteiro é de produção e estrutura. O conteúdo da pregação fica a critério do pastor." }],
  },
];

// ─── COMPONENTES INTERNOS ────────────────────────────────────────────────────

function ProdCard({ material, onClick }: { material: Material; onClick: () => void }) {
  const metaStr = [
    material.meta.mensagens ? `${material.meta.mensagens} mensagens` : null,
    `${material.meta.paginas} páginas`,
    material.meta.formatos[0],
  ].filter(Boolean).join(" · ");

  return (
    <div className="prod-card" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}>
      <div className="prod-card-capa" style={{ background: material.capa }}>
        <span className="prod-card-etiqueta">{material.etiqueta}</span>
        <span className="prod-card-preco-badge">{material.preco}</span>
      </div>
      <div className="prod-card-body">
        <div className="prod-card-titulo">{material.titulo}</div>
        <div className="prod-card-meta">{metaStr}</div>
        <div className="prod-card-ver">Ver material</div>
      </div>
    </div>
  );
}

function ShelfCarousel({ materiais, onCardClick }: { materiais: Material[]; onCardClick: (m: Material) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: "left" | "right") => {
    trackRef.current?.scrollBy({ left: dir === "left" ? -250 : 250, behavior: "smooth" });
  };
  return (
    <div className="loja-shelf-carousel">
      <div className="loja-carousel-track" ref={trackRef}>
        {materiais.map((m) => <ProdCard key={m.id} material={m} onClick={() => onCardClick(m)} />)}
      </div>
      <div className="loja-carousel-arrows">
        <button className="loja-carousel-arrow" onClick={() => scroll("left")} aria-label="Anterior">←</button>
        <button className="loja-carousel-arrow" onClick={() => scroll("right")} aria-label="Próximo">→</button>
      </div>
    </div>
  );
}

function Shelf({ estanteKey, label, materiais, onCardClick }: {
  estanteKey: string; label: string; materiais: Material[]; onCardClick: (m: Material) => void;
}) {
  if (materiais.length === 0) return null;
  const isCarousel = materiais.length > SHELF_CAROUSEL_THRESHOLD;
  return (
    <div className="loja-shelf">
      <div className="loja-shelf-head">
        <span className="loja-shelf-name">{label}</span>
        <span className="loja-shelf-count">{materiais.length} {materiais.length === 1 ? "material" : "materiais"}</span>
        {isCarousel && <span className="loja-shelf-ver">Ver todos</span>}
      </div>
      {isCarousel ? (
        <ShelfCarousel materiais={materiais} onCardClick={onCardClick} />
      ) : (
        <div className="loja-shelf-grid">
          {materiais.map((m) => <ProdCard key={m.id} material={m} onClick={() => onCardClick(m)} />)}
        </div>
      )}
    </div>
  );
}

// ─── MODAL DE DETALHE ────────────────────────────────────────────────────────
function Modal({ material, onClose }: { material: Material; onClose: () => void }) {
  const relacionados = MATERIAIS.filter(
    (m) => m.estante === material.estante && m.id !== material.id
  ).slice(0, 3);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKey);
    };
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
          <span className="loja-modal-breadcrumb">
            Loja → {material.etiqueta}
          </span>
          <button className="loja-modal-close" onClick={onClose}>Fechar ×</button>
        </div>

        <div className="loja-detail">
          {/* HERO */}
          <div className="loja-detail-hero">
            <div className="loja-detail-capa" style={{ background: material.capa }} />
            <div>
              <div className="loja-detail-meta-row">
                <span className="loja-detail-etiqueta">{material.etiqueta}</span>
                {material.colecoes.length > 0 && (
                  <span className="loja-detail-etiqueta" style={{ borderColor: "var(--border-2)", background: "var(--card)", color: "var(--muted)" }}>
                    {material.colecoes.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(", ")}
                  </span>
                )}
              </div>
              <div className="loja-detail-titulo">{material.titulo}</div>
              <p className="loja-detail-promessa">{material.promessa}</p>
            </div>
          </div>

          {/* PRA QUEM É */}
          <div className="loja-detail-sec">
            <div className="loja-detail-sec-label">— Pra quem é</div>
            <p className="loja-detail-text">{material.praQuem}</p>
          </div>

          {/* CONTEÚDO */}
          <div className="loja-detail-sec">
            <div className="loja-detail-sec-label">— O que vem dentro · {metaStr}</div>
            <ul className="loja-detail-list">
              {material.conteudo.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </div>

          {/* FORMATOS */}
          <div className="loja-detail-sec">
            <div className="loja-detail-sec-label">— Como usar</div>
            <p className="loja-detail-text">{material.comoUsar}</p>
            <div className="loja-detail-formatos">
              {material.meta.formatos.map((f) => (
                <span key={f} className="loja-detail-formato">{f}</span>
              ))}
            </div>
          </div>

          {/* PREÇO + CTA */}
          <div className="loja-detail-sec">
            <div className="loja-detail-preco-block">
              <div>
                <div className="loja-detail-preco-val">{material.preco}</div>
                <div className="loja-detail-preco-desc">Compra única · Acesso vitalício</div>
              </div>
              <div className="loja-detail-preco-info" />
              <a href={material.hotmartUrl} target="_blank" rel="noopener noreferrer"
                className="btn btn-primary btn-lg btn-arrow">Comprar</a>
            </div>
          </div>

          {/* RELACIONADOS */}
          {relacionados.length > 0 && (
            <div className="loja-detail-sec">
              <div className="loja-detail-sec-label">— Da mesma estante</div>
              <div className="loja-relacionados">
                {relacionados.map((m) => (
                  <ProdCard key={m.id} material={m} onClick={() => { onClose(); setTimeout(() => {}, 0); }} />
                ))}
              </div>
            </div>
          )}

          {/* FAQ */}
          <div className="loja-detail-sec">
            <div className="loja-detail-sec-label">— Perguntas frequentes</div>
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

// ─── PÁGINA PRINCIPAL ────────────────────────────────────────────────────────
export default function Loja() {
  const [filtroL1, setFiltroL1] = useState<FiltroL1>("tudo");
  const [estanteAtiva, setEstanteAtiva] = useState<string | null>(null);
  const [materialAberto, setMaterialAberto] = useState<Material | null>(null);

  const handleL1 = useCallback((f: FiltroL1) => {
    setFiltroL1(f);
    setEstanteAtiva(null);
  }, []);

  const handleL2 = useCallback((estante: string) => {
    setEstanteAtiva((prev) => (prev === estante ? null : estante));
  }, []);

  // Quais estantes mostrar, filtradas
  const estantesParaExibir = (familia: Familia) => {
    const lista = familia === "ministrar" ? ESTANTES_MINISTRAR : ESTANTES_LIDERAR;
    return lista.filter((e) => !estanteAtiva || e.key === estanteAtiva);
  };

  const materiaisDaEstante = (estante: string) =>
    MATERIAIS.filter((m) => m.estante === estante);

  // Eventos: materiais com colecoes, agrupados
  const materiaisEventos = MATERIAIS.filter((m) => m.colecoes.length > 0);
  const eventosGrupos: Record<string, Material[]> = {};
  materiaisEventos.forEach((m) => {
    m.colecoes.forEach((c) => {
      if (!eventosGrupos[c]) eventosGrupos[c] = [];
      eventosGrupos[c].push(m);
    });
  });
  const eventosLabels: Record<Colecao, string> = { retiro: "Retiro", conferencia: "Conferência" };

  const l2Options =
    filtroL1 === "ministrar" ? ESTANTES_MINISTRAR :
    filtroL1 === "liderar"   ? ESTANTES_LIDERAR   : null;

  return (
    <div className="pg">
      <Nav />

      {/* HERO */}
      <div className="loja-hero pg-wrap">
        <div className="loja-hero-tag">◆ Materiais editáveis</div>
        <h1 className="loja-hero-title">
          Para <em>ministrar.</em><br />Para <em>liderar.</em>
        </h1>
        <p className="loja-hero-desc">
          Séries prontas e ferramentas de gestão — compra única, editável, pronto pra usar no seu contexto.
        </p>
      </div>

      {/* FILTROS */}
      <div className="loja-filter-bar">
        <div className="pg-wrap">
          <div className="loja-filter-l1">
            {(["tudo", "ministrar", "liderar", "eventos"] as FiltroL1[]).map((f) => {
              const labels: Record<FiltroL1, string> = { tudo: "Tudo", ministrar: "Para ministrar", liderar: "Para liderar", eventos: "Eventos" };
              return (
                <button key={f}
                  className={`loja-filter-btn${filtroL1 === f ? " ativo" : ""}${filtroL1 !== f && filtroL1 !== "tudo" && f === filtroL1 ? " ativo-pai" : ""}`}
                  onClick={() => handleL1(f)}>
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
                  onClick={() => handleL2(e.key)}>
                  {e.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CONTEÚDO */}
      <div className="pg-wrap pg-section">

        {/* EVENTOS */}
        {filtroL1 === "eventos" && (
          <div>
            {(Object.entries(eventosGrupos) as [Colecao, Material[]][]).map(([colecao, mats]) => (
              <div key={colecao} className="loja-eventos-grupo">
                <div className="loja-eventos-label">{eventosLabels[colecao]}</div>
                <div className="loja-shelf-grid">
                  {mats.map((m) => <ProdCard key={m.id} material={m} onClick={() => setMaterialAberto(m)} />)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PARA MINISTRAR */}
        {(filtroL1 === "tudo" || filtroL1 === "ministrar") && (
          <div className="loja-familia">
            {filtroL1 === "tudo" && (
              <div className="loja-familia-head">
                <span className="loja-familia-eyebrow">◆</span>
                <div className="loja-familia-title">Para <em>ministrar</em></div>
              </div>
            )}
            {estantesParaExibir("ministrar").map((e) => (
              <Shelf key={e.key} estanteKey={e.key} label={e.label}
                materiais={materiaisDaEstante(e.key)}
                onCardClick={setMaterialAberto} />
            ))}
          </div>
        )}

        {/* PARA LIDERAR */}
        {(filtroL1 === "tudo" || filtroL1 === "liderar") && (
          <div className="loja-familia">
            {filtroL1 === "tudo" && (
              <div className="loja-familia-head">
                <span className="loja-familia-eyebrow">◆</span>
                <div className="loja-familia-title">Para <em>liderar</em></div>
              </div>
            )}
            {estantesParaExibir("liderar").map((e) => (
              <Shelf key={e.key} estanteKey={e.key} label={e.label}
                materiais={materiaisDaEstante(e.key)}
                onCardClick={setMaterialAberto} />
            ))}
          </div>
        )}
      </div>

      {/* MODAL */}
      {materialAberto && (
        <Modal material={materialAberto} onClose={() => setMaterialAberto(null)} />
      )}

      <Footer minimal />
    </div>
  );
}
