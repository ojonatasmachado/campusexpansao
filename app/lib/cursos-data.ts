import type { AccentKey } from "../components/ProdCard";

export type NivelKey = "fundacao" | "lideranca" | "multiplicacao";

export interface Nivel { key: NivelKey; label: string; accent: AccentKey }

export const NIVEIS: Nivel[] = [
  { key: "fundacao",      label: "Fundação",      accent: "ochre" },
  { key: "lideranca",     label: "Liderança",     accent: "clay"  },
  { key: "multiplicacao", label: "Multiplicação", accent: "olive" },
];

export interface Ementa { semana: number; titulo: string; desc: string }

export interface CursoDado {
  num: string;
  slug: string;
  nivel: NivelKey;
  title: string;
  desc: string;
  dur: string;
  promessa: string;
  praQuem: string;
  ementa: Ementa[];
  formato: string;
  mentor: string;
  mentorBio: string;
  depoimento: { texto: string; autor: string; cargo: string };
  turma: string;
}

export const CURSOS_DATA: CursoDado[] = [
  {
    num: "01", slug: "fundamentos-da-estrutura", nivel: "fundacao",
    title: "Fundamentos da Estrutura", dur: "4 semanas",
    desc: "Por que estrutura honra o agir de Deus. O alicerce de todo ministério que multiplica.",
    promessa: "Construa o alicerce que sustenta tudo que Deus quer fazer no seu ministério.",
    praQuem: "Para líderes que percebem que o ministério gira em torno de uma pessoa: e que, se Deus abençoar, o sistema vai quebrar por falta de base. Se você resolve tudo sozinho, este curso é pra você.",
    ementa: [
      { semana: 1, titulo: "O problema real", desc: "Por que a maioria dos ministérios não escala: o diagnóstico honesto da falta de estrutura." },
      { semana: 2, titulo: "Pilares da estrutura ministerial", desc: "Os quatro pilares que sustentam qualquer ministério saudável, independente de tamanho." },
      { semana: 3, titulo: "Diagnóstico do seu contexto", desc: "Mapeamento prático: o que está funcionando, o que está quebrando, onde implantar primeiro." },
      { semana: 4, titulo: "Plano dos primeiros 90 dias", desc: "Implantação com sequência. O que fazer na semana 1, no mês 1, nos primeiros 3 meses." },
    ],
    formato: "4 encontros ao vivo de 2h · mentoria em grupo por WhatsApp · materiais editáveis em Word · acesso à gravação por 12 meses.",
    mentor: "Jonatas Machado",
    mentorBio: "Fundador da CE.X. Formou mais de 2 mil líderes em igrejas locais nos últimos 6 anos. Especialista em estrutura ministerial aplicada.",
    depoimento: { texto: "Antes do curso eu não conseguia delegar porque não tinha estrutura para delegar. Depois, minha equipe cresceu sem depender de mim.", autor: "Pr. Ricardo Almeida", cargo: "Igreja Batista Renovo · São Paulo" },
    turma: "Julho 2026",
  },
  {
    num: "04", slug: "gestao-de-equipe", nivel: "fundacao",
    title: "Gestão de Equipe", dur: "5 semanas",
    desc: "Reuniões que decidem, processos que documentam, pessoas que crescem com o sistema.",
    promessa: "Transforme sua equipe em um sistema que funciona, cresce e documenta sem depender do seu humor.",
    praQuem: "Para líderes cuja equipe depende de instrução verbal constante: onde nada está documentado, as reuniões são longas sem resultado e cada voluntário novo precisa ser treinado do zero.",
    ementa: [
      { semana: 1, titulo: "Reuniões que realmente decidem", desc: "Formato de reunião que gera decisões, não relatórios. Como encurtar e tornar produtivo." },
      { semana: 2, titulo: "Documentação mínima viável", desc: "O que documentar, como documentar, onde guardar. Sistema que qualquer pessoa consegue usar." },
      { semana: 3, titulo: "Onboarding de voluntários", desc: "Processo de integração que reduz o tempo de treinamento de meses para semanas." },
      { semana: 4, titulo: "Feedback e cultura de crescimento", desc: "Como dar retorno que forma, não só corrige. Criando uma equipe que quer melhorar." },
      { semana: 5, titulo: "Indicadores que importam", desc: "O que medir para saber se a equipe está saudável. Dashboard simples de saúde ministerial." },
    ],
    formato: "5 encontros ao vivo de 2h · mentoria em grupo · templates de reunião, onboarding e feedback inclusos · acesso à gravação por 12 meses.",
    mentor: "Jonatas Machado",
    mentorBio: "Fundador da CE.X. Formou mais de 2 mil líderes em igrejas locais nos últimos 6 anos. Especialista em estrutura ministerial aplicada.",
    depoimento: { texto: "Minhas reuniões passaram de 3 horas sem conclusão para 1 hora com decisões documentadas. Mudou a cultura da equipe toda.", autor: "Pastora Ana Lima", cargo: "Igreja Presbiteriana Central · Curitiba" },
    turma: "Agosto 2026",
  },
  {
    num: "02", slug: "formacao-de-lideres", nivel: "lideranca",
    title: "Formação de Líderes", dur: "6 semanas",
    desc: "Como identificar, treinar e soltar líderes que não dependem de você pra funcionar.",
    promessa: "Forme líderes que funcionam sem você, e que formam outros líderes depois.",
    praQuem: "Para líderes que carregam tudo nas costas porque ninguém está pronto para assumir: e que precisam de um sistema de identificação e formação que funcione independente do talento pessoal.",
    ementa: [
      { semana: 1, titulo: "Identificando potencial de liderança", desc: "Como enxergar quem tem vocação antes de esperar resultado. Os sinais que a maioria ignora." },
      { semana: 2, titulo: "Desenvolvimento por fases", desc: "O processo em etapas: observe, explique, demonstre, pratique, avalie. Aplicado ao contexto ministerial." },
      { semana: 3, titulo: "Delegação que forma", desc: "A diferença entre distribuir tarefas e delegar para crescimento. Como soltar com segurança." },
      { semana: 4, titulo: "Conversas difíceis com líderes", desc: "Como dar feedback de desempenho, corrigir desvio e manter a relação pastoral." },
      { semana: 5, titulo: "Cultura de formação na equipe", desc: "Como fazer da formação um hábito, não um projeto. O sistema que se perpetua sozinho." },
      { semana: 6, titulo: "Multiplicação contínua", desc: "O líder que forma líderes que formam líderes. Construindo uma linha de multiplicação." },
    ],
    formato: "6 encontros ao vivo de 2h · mentoria semanal individual · templates de acompanhamento de líderes · acesso à gravação por 12 meses.",
    mentor: "Jonatas Machado",
    mentorBio: "Fundador da CE.X. Formou mais de 2 mil líderes em igrejas locais nos últimos 6 anos. Especialista em estrutura ministerial aplicada.",
    depoimento: { texto: "Eu tinha dois líderes de confiança quando entrei. Saí com oito, todos formados com método. O ministério de adolescentes triplicou em 18 meses.", autor: "Pr. Felipe Santos", cargo: "Igreja Batista da Graça · Brasília" },
    turma: "Julho 2026",
  },
  {
    num: "06", slug: "lideranca-e-descanso", nivel: "lideranca",
    title: "Liderança e Descanso", dur: "4 semanas",
    desc: "Como liderar sem queimar. Ritmo sustentável pra quem carrega muita responsabilidade.",
    promessa: "Lidere com mais impacto gastando menos de si mesmo. Ritmo sustentável não é fraqueza: é sabedoria.",
    praQuem: "Para líderes que estão cansados, mas não podem parar: que sentem culpa quando descansam, que confundem produtividade com fidelidade, e que sabem que se continuarem assim não vão durar.",
    ementa: [
      { semana: 1, titulo: "O diagnóstico do esgotamento ministerial", desc: "Identificar os padrões que levam ao burnout antes que seja tarde. Os sinais que a maioria ignora ou normaliza." },
      { semana: 2, titulo: "Teologia do descanso", desc: "O que a Bíblia diz sobre ritmo, limite e sustentabilidade. Por que descansar é parte da fidelidade." },
      { semana: 3, titulo: "Sistemas que sustentam o líder", desc: "Como estruturar agenda, delegação e limite de responsabilidade para não colapsar com o crescimento." },
      { semana: 4, titulo: "Ritmo sustentável na prática", desc: "Implementando rotina, limites e processos de recuperação que permitem liderar por décadas." },
    ],
    formato: "4 encontros ao vivo de 2h · momentos de reflexão individual · materiais de diagnóstico pessoal · acesso à gravação por 12 meses.",
    mentor: "Jonatas Machado",
    mentorBio: "Fundador da CE.X. Formou mais de 2 mil líderes em igrejas locais nos últimos 6 anos. Especialista em estrutura ministerial aplicada.",
    depoimento: { texto: "Estava no limite quando fiz este curso. Aprendi que liderar de dentro para fora não é slogan: é o único modelo que dura.", autor: "Pr. Marcos Oliveira", cargo: "Igreja Metodista Vida Nova · Recife" },
    turma: "Setembro 2026",
  },
  {
    num: "03", slug: "discipulado-intencional", nivel: "multiplicacao",
    title: "Discipulado Intencional", dur: "8 semanas",
    desc: "Um sistema de discipulado que nasce com data pra multiplicar, não só informar.",
    promessa: "Construa um sistema de discipulado que se multiplica: do primeiro encontro ao envio do discípulo para discipular outros.",
    praQuem: "Para líderes que fazem discipulado de forma informal e esporádica: e que precisam de um processo claro, replicável, que funcione mesmo quando eles não estão presentes.",
    ementa: [
      { semana: 1, titulo: "O que é discipulado de verdade", desc: "A diferença entre ensinar e discipular. Por que a maioria dos processos para no conhecimento." },
      { semana: 2, titulo: "Estrutura do 1 a 1", desc: "O formato de encontro que funciona: tempo, pauta, perguntas certas, acompanhamento entre sessões." },
      { semana: 3, titulo: "Selecionando quem discipular", desc: "Critérios de disponibilidade, ensinabilidade e fidelidade. Evitando o erro de discipular por simpatia." },
      { semana: 4, titulo: "As fases do discipulado", desc: "Do iniciante ao maduro: o que trabalhar em cada fase e como reconhecer quando avançar." },
      { semana: 5, titulo: "Perguntas que formam caráter", desc: "Como criar conversas que vão além do conteúdo bíblico e tocam a vida real." },
      { semana: 6, titulo: "Acompanhamento em crise", desc: "O que fazer quando o discípulo está atravessando algo difícil. Limites do líder e quando encaminhar." },
      { semana: 7, titulo: "Preparando para o envio", desc: "Como saber quando o discípulo está pronto para discipular outros. O ritual de envio." },
      { semana: 8, titulo: "Sistema e multiplicação", desc: "Construindo o processo na cultura do ministério. Do 1 a 1 ao sistema que se multiplica sozinho." },
    ],
    formato: "8 encontros ao vivo de 2h · templates de encontro mensal · guia de perguntas por fase · mentoria em grupo · acesso à gravação por 12 meses.",
    mentor: "Jonatas Machado",
    mentorBio: "Fundador da CE.X. Formou mais de 2 mil líderes em igrejas locais nos últimos 6 anos. Especialista em estrutura ministerial aplicada.",
    depoimento: { texto: "Em 10 meses passei de 2 discípulos para 14, todos usando o mesmo processo. O método funciona porque é ensinável.", autor: "Pr. Daniel Costa", cargo: "Igreja Evangélica Betel · Fortaleza" },
    turma: "Agosto 2026",
  },
  {
    num: "05", slug: "plantacao-de-igrejas", nivel: "multiplicacao",
    title: "Plantação de Igrejas", dur: "10 semanas",
    desc: "Estrutura mínima viável pra plantar com saúde e multiplicar com intenção.",
    promessa: "Plante uma igreja com estrutura suficiente para crescer sem colapsar nos primeiros 18 meses.",
    praQuem: "Para líderes com visão de plantar: que têm chamado mas não têm método, que não querem repetir os erros de quem plantou sem estrutura, e que precisam de um processo que funcione mesmo com equipe pequena.",
    ementa: [
      { semana: 1, titulo: "Diagnóstico: você está pronto?", desc: "Avaliando chamado, equipe, contexto e momento. Os critérios que separam sonho de missão viável." },
      { semana: 2, titulo: "Identidade e propósito da nova igreja", desc: "Construindo a identidade antes do primeiro culto. Por que começar aqui evita 80% dos conflitos futuros." },
      { semana: 3, titulo: "Equipe núcleo: quem leva", desc: "Selecionando, formando e comprometendo a equipe núcleo. O erro de começar com quem topou." },
      { semana: 4, titulo: "Estrutura mínima viável", desc: "O mínimo de estrutura para começar com saúde. O que não pode faltar e o que pode esperar." },
      { semana: 5, titulo: "Os primeiros cultos", desc: "Planejando, produzindo e avaliando os primeiros cultos. Como criar contexto de conversão e integração." },
      { semana: 6, titulo: "Integração de novos membros", desc: "O processo de acolhida, pertencimento e compromisso. Como transformar visitantes em membros." },
      { semana: 7, titulo: "Finanças e sustentação", desc: "Modelo financeiro para os primeiros 2 anos. Autonomia financeira e dependência saudável da igreja-mãe." },
      { semana: 8, titulo: "Formação de liderança local", desc: "Identificando e formando líderes locais desde o início. Por que isto não pode ser deixado para depois." },
      { semana: 9, titulo: "Crises dos primeiros 18 meses", desc: "Os problemas que toda planta enfrenta: conflito, desistência, crescimento repentino. Como sobreviver a cada um." },
      { semana: 10, titulo: "Visão de multiplicação", desc: "A nova igreja já pensa em plantar outra. Construindo uma cultura de expansão desde a fundação." },
    ],
    formato: "10 encontros ao vivo de 2h · mentoria individual em 3 momentos-chave · toolbox de templates (identidade, finanças, integração) · acesso à gravação por 12 meses.",
    mentor: "Jonatas Machado",
    mentorBio: "Fundador da CE.X. Formou mais de 2 mil líderes em igrejas locais nos últimos 6 anos. Especialista em estrutura ministerial aplicada.",
    depoimento: { texto: "Plantei minha primeira igreja sem método e quase desisti no nono mês. Com o curso fui plantar a segunda. Sabia o que fazer em cada etapa.", autor: "Pr. Tiago Rocha", cargo: "Igreja Cidade Nova · Goiânia" },
    turma: "Outubro 2026",
  },
];

export const CURSOS_EM_ORDEM = [...CURSOS_DATA].sort((a, b) => Number(a.num) - Number(b.num));
