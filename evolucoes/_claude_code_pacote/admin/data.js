/* ════════════════════════════════════════════════════════════════
   CE.X ADMIN · DADOS SEMEADOS
   Espelha o catálogo que está hoje no ar (campusexpansao.vercel.app).
   Materiais e Cursos são reais; Mentorias e Eventos são exemplos
   realistas para você ver o desenho da tela e depois substituir.
   ════════════════════════════════════════════════════════════════ */
(function () {
  // Paleta canônica CE.X — QUENTE, sem azul (extintos: ocre, argila, pinho, ardosia)
  const ACCENTS = {
    olive: '#7A9E3F', oliveDeep: '#4F6B26',
    clay:  '#C5805A',
    wheat: '#CBA95C',
    sand:  '#E2D6B4',
    terra: '#B5694A',
    amber: '#D6A23E',
    rust:  '#9C5A33',
    cocoa: '#6F523A',
  };

  // ── COR = ESTANTE (regra do sistema de banners) ──
  // A cor de acento NÃO é editável: é derivada da estante/nível.
  const MINISTRAR_ACCENT = {
    'Berçário':     ACCENTS.wheat,
    'Maternal':     ACCENTS.wheat,
    'Primários':    ACCENTS.wheat,
    'Juniores':     ACCENTS.sand,
    'Adolescentes': ACCENTS.clay,
    'Jovens':       ACCENTS.olive,
    'Igreja toda':  ACCENTS.terra,
  };
  const LIDERAR_ACCENT = {
    'Manuais':              ACCENTS.clay,
    'Criar ministério':     ACCENTS.terra,
    'Modelos & Checklists': ACCENTS.sand,
    'Montar evento':        ACCENTS.wheat,
  };
  const LEVEL_ACCENT = {
    'Fundação':      ACCENTS.wheat,
    'Liderança':     ACCENTS.clay,
    'Multiplicação': ACCENTS.olive,
  };
  // Estantes válidas por família (alimentam o seletor do editor)
  const SHELVES = {
    'Para ministrar': ['Berçário', 'Maternal', 'Primários', 'Juniores', 'Adolescentes', 'Jovens', 'Igreja toda'],
    'Para liderar': ['Manuais', 'Criar ministério', 'Modelos & Checklists', 'Montar evento'],
  };
  // Swatches disponíveis para escolha de acento de estante (sem picker livre)
  const PALETTE_SWATCHES = [
    { key: 'sand',  hex: ACCENTS.sand,  name: 'Areia'     },
    { key: 'wheat', hex: ACCENTS.wheat, name: 'Trigo'     },
    { key: 'amber', hex: ACCENTS.amber, name: 'Âmbar'     },
    { key: 'clay',  hex: ACCENTS.clay,  name: 'Argila'    },
    { key: 'terra', hex: ACCENTS.terra, name: 'Terracota' },
    { key: 'rust',  hex: ACCENTS.rust,  name: 'Ferrugem'  },
    { key: 'cocoa', hex: ACCENTS.cocoa, name: 'Cacau'     },
    { key: 'olive', hex: ACCENTS.olive, name: 'Oliva'     },
  ];
  // Nome legível de cada cor (mostrado no indicador travado)
  const ACCENT_NAME = {
    [ACCENTS.olive]: 'Oliva', [ACCENTS.clay]: 'Argila', [ACCENTS.wheat]: 'Trigo',
    [ACCENTS.sand]: 'Areia',  [ACCENTS.terra]: 'Terracota', [ACCENTS.amber]: 'Âmbar',
    [ACCENTS.rust]: 'Ferrugem', [ACCENTS.cocoa]: 'Cacau',
  };

  function accentFor(item) {
    if (!item) return ACCENTS.olive;
    if (item.type === 'material') return item.family === 'Para liderar' ? (LIDERAR_ACCENT[item.shelf] || ACCENTS.clay) : (MINISTRAR_ACCENT[item.shelf] || ACCENTS.olive);
    if (item.type === 'curso') return LEVEL_ACCENT[item.level] || ACCENTS.olive;
    if (item.type === 'evento') return ACCENTS.terra;
    return ACCENTS.olive; // mentoria
  }

  // Compat: mapa de estante referenciado abaixo
  const SHELF_ACCENT = new Proxy({}, { get: (_, shelf) => MINISTRAR_ACCENT[shelf] || LIDERAR_ACCENT[shelf] || ACCENTS.olive });

  let _id = 0;
  const uid = (p) => `${p}-${(++_id).toString().padStart(3, '0')}`;

  function mat(family, shelf, code, title, desc, msgs, pages, price, views, status) {
    const hasMsg = msgs != null;
    return {
      id: uid('mat'), type: 'material', family, shelf, code, title, desc,
      messages: msgs, pages, format: 'PDF', price, hotmart: `https://pay.hotmart.com/CEX${code.replace(/[^A-Z0-9]/gi, '')}`,
      accent: accentFor({ type: 'material', family, shelf }), image: null,
      // Modelo do card/banner (sistema de banners): A tipográfico · B bloco · C número · D foto
      model: hasMsg ? 'A' : 'C',
      big: hasMsg ? msgs : pages, bigLabel: hasMsg ? 'mensagens' : 'páginas',
      // Detalhamento por mensagem (preenchido pelo usuário): [{ nome, desc }]
      messageList: [],
      // Conteúdo da página de detalhe
      paraQuem: '',
      beneficios: ['Editável e pronto pra aplicar na sua igreja', 'White-label CE.X: coloque a marca do seu ministério'],
      depoimento: { texto: '', autor: '' },
      status: status || 'Publicado', views,
      buyClicks: Math.round(views * (0.04 + Math.random() * 0.05)),
    };
  }

  const materiais = [
    // ── Para ministrar ──
    mat('Para ministrar', 'Juniores', 'S-03', 'Pequenos Grandes', 'Cinco mensagens que mostram aos juniores que fé pequena move montanhas.', 5, 40, 37, 1840),
    mat('Para ministrar', 'Juniores', 'J-04', 'Deus Cuida', 'Quatro lições sobre confiança e provisão para as crianças maiores.', 4, 32, 37, 1310),
    mat('Para ministrar', 'Juniores', 'S-07', 'Missão Possível', 'Uma jornada de cinco encontros sobre coragem e chamado.', 5, 40, 47, 980),
    mat('Para ministrar', 'Juniores', 'S-11', 'Brilha!', 'Identidade e propósito para a fase júnior, em quatro mensagens.', 4, 32, 37, 1170),
    mat('Para ministrar', 'Adolescentes', 'S-12', 'Firmes', 'Seis mensagens para adolescentes que enfrentam pressão e dúvida.', 6, 48, 47, 2640, 'Rascunho'),
    mat('Para ministrar', 'Adolescentes', 'S-19', 'Raízes', 'Cinco encontros sobre fundamentar a fé antes da tempestade.', 5, 40, 47, 1520),
    mat('Para ministrar', 'Adolescentes', 'A-07', 'Entre Dois Mundos', 'Sete mensagens sobre viver a fé na escola, no celular e em casa.', 7, 56, 67, 2210),
    mat('Para ministrar', 'Adolescentes', 'S-23', 'Primeira Vez', 'Quatro mensagens para quem está começando a caminhada.', 4, 32, 37, 870),
    mat('Para ministrar', 'Adolescentes', 'A-05', 'Não Desista', 'Cinco encontros sobre perseverança quando tudo parece travar.', 5, 44, 47, 1430),
    mat('Para ministrar', 'Adolescentes', 'S-31', 'O Nome Certo', 'Seis mensagens sobre identidade em Cristo na adolescência.', 6, 48, 47, 1090),
    mat('Para ministrar', 'Adolescentes', 'A-08', 'Geração Levante', 'Oito mensagens para mobilizar uma geração de adolescentes.', 8, 64, 67, 1760),
    mat('Para ministrar', 'Jovens', 'J-06', 'Alta Performance', 'Seis encontros sobre excelência, disciplina e descanso.', 6, 52, 67, 2980),
    mat('Para ministrar', 'Jovens', 'S-21', 'Relacionamentos', 'Sete mensagens sobre afeto, limites e propósito.', 7, 60, 67, 3450),
    mat('Para ministrar', 'Jovens', 'S-26', 'Vocação', 'Seis encontros para o jovem descobrir onde Deus o coloca.', 6, 52, 67, 2670),
    mat('Para ministrar', 'Jovens', 'J-05', 'Resilientes', 'Cinco mensagens sobre se reerguer com fé madura.', 5, 44, 47, 1380),
    mat('Para ministrar', 'Jovens', 'S-34', 'Primeiros Passos', 'Quatro encontros para o novo convertido jovem.', 4, 36, 47, 1020),
    mat('Para ministrar', 'Igreja toda', 'S-40', 'Família do Jeito Certo', 'Oito mensagens sobre estrutura familiar à luz da Escritura.', 8, 72, 97, 2240),
    mat('Para ministrar', 'Igreja toda', 'S-48', 'Generosidade', 'Cinco encontros sobre dar com alegria e propósito.', 5, 44, 67, 1660),
    mat('Para ministrar', 'Igreja toda', 'I-04', 'Ano Novo Vida Nova', 'Quatro mensagens para abrir o ano com direção.', 4, 36, 47, 1910),
    mat('Para ministrar', 'Igreja toda', 'S-54', 'Sal e Luz', 'Seis encontros sobre influência cristã no mundo.', 6, 52, 67, 1480),
    // ── Para liderar ──
    mat('Para liderar', 'Manuais', 'M-01', 'Manual do Líder de Célula', 'Oitenta páginas para estruturar e conduzir uma célula saudável.', null, 80, 97, 3120),
    mat('Para liderar', 'Manuais', 'M-04', 'Manual do Liderinho', 'Formação do líder mirim, passo a passo.', null, 72, 97, 1240),
    mat('Para liderar', 'Manuais', 'M-06', 'Manual de Discipulado', 'Um sistema de discipulado pronto para aplicar.', null, 56, 67, 2480),
    mat('Para liderar', 'Manuais', 'M-09', 'Manual de Pastoral', 'Oitenta e oito páginas sobre cuidado e governo pastoral.', null, 88, 97, 1670),
    mat('Para liderar', 'Criar ministério', 'M-12', 'Montando um Ministério de Adolescentes', 'Do zero ao primeiro encontro, com estrutura replicável.', null, 64, 97, 1890),
    mat('Para liderar', 'Criar ministério', 'C-90', 'Como Estruturar um Grupo de Células', 'Noventa dias para sair de uma célula a uma rede.', null, 48, 67, 2050),
    mat('Para liderar', 'Criar ministério', 'M-17', 'Lançando um Ministério de Missões', 'Estrutura mínima viável para mobilizar missões locais.', null, 60, 97, 940),
    mat('Para liderar', 'Modelos & Checklists', 'CK-05', 'Checklist do Culto Especial', 'Cinco checklists para nunca esquecer um detalhe.', null, 12, 37, 1330),
    mat('Para liderar', 'Modelos & Checklists', 'M-22', 'Carta de Compromisso', 'Modelo editável de aliança ministerial.', null, 8, 27, 760),
    mat('Para liderar', 'Modelos & Checklists', 'K-30', 'Kit de Onboarding', 'Trinta dias para integrar um novo voluntário.', null, 20, 47, 1450),
    mat('Para liderar', 'Modelos & Checklists', 'M-26', 'Relatório de Saúde da Igreja', 'Dezesseis páginas de diagnóstico estrutural.', null, 16, 37, 880),
    mat('Para liderar', 'Montar evento', 'M-30', 'Retiro de Adolescentes', 'Noventa páginas para planejar um retiro do começo ao fim.', null, 90, 147, 1240),
    mat('Para liderar', 'Montar evento', 'E-07', 'Conferência de Liderança', 'Sete módulos para montar uma conferência marcante.', null, 80, 127, 980),
    mat('Para liderar', 'Montar evento', 'M-38', 'Culto de Natal', 'Roteiro completo e editável para o culto de Natal.', null, 60, 97, 1620),
  ];

  // ── CURSOS (ao vivo, trilha por nível, lista de espera) ──
  const LEVEL = {
    'Fundação':      ACCENTS.wheat,
    'Liderança':     ACCENTS.clay,
    'Multiplicação': ACCENTS.olive,
  };
  function curso(level, etapa, title, desc, weeks, mentor, waitlist, views, status) {
    return {
      id: uid('cur'), type: 'curso', level, etapa, totalEtapas: 6, title, desc,
      weeks, mentoria: true, aoVivo: true, mentor, accent: accentFor({ type: 'curso', level }),
      image: null, status: status || 'Publicado', views, waitlist,
      paraQuem: '',
      depoimento: { texto: '', autor: '' },
      ementa: [
        'Diagnóstico: onde sua estrutura trava hoje',
        'O princípio bíblico por trás do sistema',
        'A ferramenta aplicada na sua realidade',
        'Plano de implementação para a próxima semana',
      ],
      proximaTurma: 'Próxima turma: Agosto/2026',
    };
  }
  const cursos = [
    curso('Fundação', 1, 'Fundamentos da Estrutura', 'Por que estrutura honra o agir de Deus. O alicerce de todo ministério que multiplica.', 4, 'Pr. Ricardo Almeida', 84, 1920),
    curso('Fundação', 4, 'Gestão de Equipe', 'Reuniões que decidem, processos que documentam, pessoas que crescem com o sistema.', 5, 'Pr. Ricardo Almeida', 47, 1110),
    curso('Liderança', 2, 'Formação de Líderes', 'Como identificar, treinar e soltar líderes que não dependem de você pra funcionar.', 6, 'Pra. Helena Dias', 132, 2480),
    curso('Liderança', 6, 'Liderança e Descanso', 'Como liderar sem queimar. Ritmo sustentável pra quem carrega muita responsabilidade.', 4, 'Pra. Helena Dias', 61, 1340),
    curso('Multiplicação', 3, 'Discipulado Intencional', 'Um sistema de discipulado que nasce com data pra multiplicar, não só informar.', 8, 'Pr. Daniel Moraes', 98, 2010, 'Rascunho'),
    curso('Multiplicação', 5, 'Plantação de Igrejas', 'Estrutura mínima viável pra plantar com saúde e multiplicar com intenção.', 10, 'Pr. Daniel Moraes', 73, 1560),
  ];

  // ── MENTORIAS (exemplos realistas para você editar) ──
  function mentoria(title, desc, formato, vagas, mentor, views, status) {
    return {
      id: uid('men'), type: 'mentoria', title, desc, formato, vagas, mentor,
      accent: ACCENTS.olive, image: null, status: status || 'Publicado', views,
      waitlist: Math.round(views * 0.06), cadencia: 'Encontros quinzenais · 90 min',
    };
  }
  const mentorias = [
    mentoria('Mentoria de Plantadores', 'Acompanhamento de seis meses para quem está plantando uma igreja agora.', 'Grupo · 8 vagas', 8, 'Pr. Ricardo Almeida', 640),
    mentoria('Mentoria 1:1 de Liderança', 'Sessões individuais para líderes em transição de cargo.', 'Individual · 90 min', 1, 'Pra. Helena Dias', 410, 'Rascunho'),
  ];

  // ── EVENTOS / RETIROS (exemplos realistas) ──
  function evento(title, desc, data, local, vagas, views, status) {
    return {
      id: uid('evt'), type: 'evento', title, desc, data, local, vagas,
      accent: ACCENTS.oliveDeep, image: null, status: status || 'Publicado', views,
      inscritos: Math.round(vagas * (0.4 + Math.random() * 0.4)),
      hotmart: 'https://pay.hotmart.com/CEXEVENTO',
    };
  }
  const eventos = [
    evento('Retiro de Líderes 2026', 'Três dias de imersão em estrutura ministerial e descanso.', '14 a 16 de Agosto · 2026', 'Serra da Cantareira · SP', 120, 1480),
    evento('Conferência Expansão', 'Um dia sobre multiplicação saudável para equipes inteiras.', '05 de Outubro · 2026', 'Online + presencial', 400, 2210, 'Rascunho'),
  ];

  // ── MÉTRICAS GLOBAIS (dados de exemplo realistas, últimos 30 dias) ──
  const series30 = [];
  let base = 280;
  for (let i = 29; i >= 0; i--) {
    const weekend = (i % 7 === 0 || i % 7 === 6) ? 1.25 : 1;
    base = Math.max(180, base + (Math.random() * 80 - 36));
    series30.push(Math.round(base * weekend));
  }
  const totalVisitas = series30.reduce((a, b) => a + b, 0);

  const metrics = {
    series30,
    kpis: {
      visitas: totalVisitas,
      visitasDelta: 18.4,
      cliquesComprar: 1842,
      cliquesDelta: 12.1,
      listaEspera: 305,
      listaDelta: 31.7,
      capturas: 2410,
      capturasDelta: -4.2,
    },
    funil: [
      { label: 'Visitas ao site', value: totalVisitas },
      { label: 'Abriu um material', value: Math.round(totalVisitas * 0.46) },
      { label: 'Clicou em comprar', value: 1842 },
      { label: 'Compra concluída', value: 612 },
    ],
    origem: [
      { label: 'Instagram', value: 58, color: ACCENTS.olive },
      { label: 'Direto', value: 19, color: ACCENTS.wheat },
      { label: 'Google', value: 13, color: ACCENTS.clay },
      { label: 'YouTube', value: 10, color: ACCENTS.oliveDeep },
    ],
  };

  window.CEX_DATA = { ACCENTS, ACCENT_NAME, SHELVES, accentFor, materiais, cursos, mentorias, eventos, metrics };
  window.CEX_accentFor = accentFor;
})();
