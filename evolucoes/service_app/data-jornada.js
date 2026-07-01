/* ════════════════════════════════════════════════════════════════
   CE.X SERVICE · NÚCLEO DA JORNADA + MÓDULOS NOVOS
   Estende window.SVC (definido em data.js) com:
   · TIPOS_EVENTO  — catálogo de eventos historizados da vida da pessoa
   · TIMELINE      — linha do tempo por pessoa (membro/voluntário)
   · DECISOES      — entradas de quem aceitou/reconciliou com Jesus
   · BATISMOS      — turmas de batismo
   · CURSOS        — trilhas, conteúdo no app e presenciais
   · MATRICULAS    — progresso de cada pessoa nos cursos
   · PEDIDOS       — oração / falar com líder (vindos do app do membro)
   · PAPEIS_V2     — 4 níveis: Master, Pastor, Líder, Voluntário
   Carregado DEPOIS de data.js.
   ════════════════════════════════════════════════════════════════ */
(function () {
  const S = window.SVC;

  /* ── CATÁLOGO DE EVENTOS DA JORNADA ──────────────────────────────
     Cada tipo: marca (◆/◇/→), rótulo, e classe de cor (olive/amber/clay/neutro).
     A cor é só semiótica — segue a regra: oliva = marco espiritual. */
  const TIPOS_EVENTO = {
    decisao:       { ic: '◆', label: 'Decisão por Jesus',     tom: 'olive',  marco: true },
    reconciliacao: { ic: '◇', label: 'Reconciliação',          tom: 'olive',  marco: true },
    acompanha:     { ic: '→', label: 'Acompanhamento 1-a-1',   tom: 'neutro', marco: false },
    batismo:       { ic: '◆', label: 'Batismo nas águas',      tom: 'olive',  marco: true },
    curso:         { ic: '◇', label: 'Curso concluído',        tom: 'wheat',  marco: false },
    integracao:    { ic: '◆', label: 'Membresia oficial',      tom: 'olive',  marco: true },
    time:          { ic: '→', label: 'Começou a servir',       tom: 'clay',   marco: true },
    lider:         { ic: '◆', label: 'Tornou-se líder',        tom: 'olive',  marco: true },
    transferencia: { ic: '→', label: 'Transferência',          tom: 'neutro', marco: false },
    visita:        { ic: '◇', label: 'Primeira visita',        tom: 'neutro', marco: false },
    nota:          { ic: '·', label: 'Anotação pastoral',      tom: 'neutro', marco: false },
  };

  /* ── LINHA DO TEMPO POR PESSOA ───────────────────────────────────
     Chave = id do MEMBRO (m1..m28). Eventos em ordem cronológica.
     data no formato curto exibível; ord = chave de ordenação. */
  const E = (ord, when, tipo, titulo, desc, por) => ({ ord, when, tipo, titulo, desc, por });

  const TIMELINE = {
    /* Mariana Reis — membro fundadora, líder do louvor */
    m1: [
      E(20210301, 'mar 2021', 'visita',    'Primeira visita',          'Veio convidada por uma amiga ao culto da manhã.', 'Recepção'),
      E(20210418, 'abr 2021', 'decisao',   'Aceitou Jesus',            'Resposta ao apelo no culto de Páscoa.', 'Pr. Daniel'),
      E(20210509, 'mai 2021', 'acompanha', 'Início do discipulado',    'Discipulado 1-a-1 com a líder de integração.', 'Renata Lopes'),
      E(20210815, 'ago 2021', 'batismo',   'Batismo nas águas',        'Batizada no batismo de inverno, turma 02/2021.', 'Pr. Daniel'),
      E(20211003, 'out 2021', 'curso',     'Fundamentos da Fé',        'Trilha de fundamentos concluída — 8 módulos.', 'Ensino'),
      E(20211107, 'nov 2021', 'integracao','Tornou-se membro',         'Membresia oficial após classe de novos membros.', 'Secretaria'),
      E(20220206, 'fev 2022', 'time',      'Entrou no Louvor',         'Começou a servir como vocal no time de Louvor.', 'Mariana Reis'),
      E(20230410, 'abr 2023', 'lider',     'Assumiu a liderança',      'Tornou-se líder do ministério de Louvor & Adoração.', 'Pr. Daniel'),
    ],
    /* Camila Souza — congregando, jornada incompleta (sem GC marcado) */
    m8: [
      E(20240210, 'fev 2024', 'visita',    'Primeira visita',          'Chegou pelo Instagram, culto da noite.', 'Recepção'),
      E(20240317, 'mar 2024', 'decisao',   'Aceitou Jesus',            'Decisão no culto de domingo à noite.', 'Pr. Marcos'),
      E(20240421, 'abr 2024', 'acompanha', 'Acompanhamento iniciado',  'Em discipulado com a equipe de acolhida.', 'Beatriz Nunes'),
      E(20240908, 'set 2024', 'batismo',   'Batismo nas águas',        'Turma 03/2024.', 'Pr. Daniel'),
      E(20250118, 'jan 2025', 'curso',     'Novos Convertidos',        'Trilha inicial concluída.', 'Ensino'),
      E(20250302, 'mar 2025', 'time',      'Entrou na Recepção',       'Começou a servir na acolhida de visitantes.', 'Paulo Tavares'),
    ],
    /* Fernanda Dias — congregando, faltou Fundamentos */
    m12: [
      E(20240511, 'mai 2024', 'visita',    'Primeira visita',          'Veio com a família ao Kids.', 'Recepção'),
      E(20240609, 'jun 2024', 'reconciliacao','Reconciliação',         'Voltou para os caminhos da fé.', 'Pr. Marcos'),
      E(20240714, 'jul 2024', 'acompanha', 'Discipulado 1-a-1',        'Acompanhamento semanal.', 'Renata Lopes'),
      E(20241110, 'nov 2024', 'batismo',   'Batismo nas águas',        'Turma 04/2024.', 'Pr. Daniel'),
      E(20250205, 'fev 2025', 'time',      'Entrou no Kids',           'Auxiliar no maternal.', 'Renata Lopes'),
    ],
    /* Otávio Ramos — congregando, sem batismo ainda */
    m20: [
      E(20240803, 'ago 2024', 'visita',    'Primeira visita',          'Indicado por um membro do GC Jardim Sul.', 'Recepção'),
      E(20240901, 'set 2024', 'decisao',   'Aceitou Jesus',            'Decisão no GC, confirmada no culto.', 'Sérgio Almeida'),
      E(20241015, 'out 2024', 'acompanha', 'Acompanhamento iniciado',  'Discipulado pelo líder do GC.', 'Sérgio Almeida'),
      E(20250120, 'jan 2025', 'curso',     'Novos Convertidos',        'Trilha inicial concluída.', 'Ensino'),
    ],
    /* Bianca Melo — nova, só decisão + GC */
    m21: [
      E(20250412, 'abr 2025', 'visita',    'Primeira visita',          'Conheceu pela campanha de Páscoa.', 'Recepção'),
      E(20250503, 'mai 2025', 'decisao',   'Aceitou Jesus',            'Primeira decisão, encaminhada para discipulado.', 'Pr. Marcos'),
      E(20250518, 'mai 2025', 'acompanha', 'Acompanhamento iniciado',  'Entrou no GC Centro.', 'Cleusa Moraes'),
    ],
    /* Daniela Prado — recém-chegada, só decisão */
    m25: [
      E(20250607, 'jun 2025', 'visita',    'Primeira visita',          'Veio com uma amiga ao culto da manhã.', 'Recepção'),
      E(20250615, 'jun 2025', 'decisao',   'Aceitou Jesus',            'Decisão recente — aguardando contato.', 'Pr. Marcos'),
    ],
    /* Roberto Dias — membro antigo, parou de servir */
    m18: [
      E(20210220, 'fev 2021', 'decisao',   'Aceitou Jesus',            'Decisão registrada.', 'Pr. Daniel'),
      E(20210710, 'jul 2021', 'batismo',   'Batismo nas águas',        'Turma 02/2021.', 'Pr. Daniel'),
      E(20211009, 'out 2021', 'curso',     'Fundamentos da Fé',        'Trilha concluída.', 'Ensino'),
      E(20211204, 'dez 2021', 'integracao','Tornou-se membro',         'Membresia oficial.', 'Secretaria'),
    ],
  };

  /* ── DECISÕES / CONVERSÕES ───────────────────────────────────────
     Entrada de quem aceitou Jesus ou se reconciliou. Vira pessoa no sistema.
     status: novo (a contatar) / acompanhando / encaminhado (virou membro) */
  const DECISOES = [
    { id: 'd1', nome: 'Daniela Prado',   tel: '(11) 98990-3344', quando: '15 jun', tipo: 'decisao',       culto: 'Culto da Manhã',  resp: 'p8',  status: 'novo',         membroId: 'm25', idade: 27, obs: 'Veio com uma amiga. Demonstrou abertura, pediu Bíblia.' },
    { id: 'd2', nome: 'Marcelo Tobias',  tel: '(11) 97712-5540', quando: '15 jun', tipo: 'decisao',       culto: 'Culto da Noite',  resp: 'p2',  status: 'novo',         membroId: null,  idade: 34, obs: 'Primeira vez na igreja. Passa por um momento difícil.' },
    { id: 'd3', nome: 'Sabrina Lopes',   tel: '(11) 98445-9921', quando: '08 jun', tipo: 'reconciliacao', culto: 'Culto da Noite',  resp: 'p14', status: 'acompanhando', membroId: null,  idade: 41, obs: 'Membro afastado há 3 anos, voltou e se reconciliou.' },
    { id: 'd4', nome: 'Bianca Melo',     tel: '(11) 98778-1102', quando: '03 mai', tipo: 'decisao',       culto: 'Campanha Páscoa', resp: 'p14', status: 'encaminhado',  membroId: 'm21', idade: 19, obs: 'Já entrou no GC Centro. Em discipulado.' },
    { id: 'd5', nome: 'Wesley Antunes',  tel: '(11) 96621-3308', quando: '01 jun', tipo: 'decisao',       culto: 'Culto de Oração', resp: 'p7',  status: 'acompanhando', membroId: null,  idade: 23, obs: 'Decisão no culto de quarta. Contato iniciado.' },
    { id: 'd6', nome: 'Patrícia Reis',   tel: '(11) 98112-7745', quando: '25 mai', tipo: 'decisao',       culto: 'Culto da Manhã',  resp: 'p3',  status: 'acompanhando', membroId: null,  idade: 38, obs: 'Veio pela filha que serve no Kids.' },
    { id: 'd7', nome: 'Otávio Ramos',    tel: '(11) 97009-4412', quando: '01 set', tipo: 'decisao',       culto: 'GC Jardim Sul',   resp: 'p7',  status: 'encaminhado',  membroId: 'm20', idade: 29, obs: 'Decisão no GC, já é congregando.' },
  ];

  /* ── BATISMOS ────────────────────────────────────────────────────
     Turmas com data, local, status e candidatos (ids de membro/decisão).
     status: aberta (inscrições) / preparacao (curso pré-batismo) / agendada / concluida */
  const BATISMOS = [
    { id: 'b1', turma: 'Turma 02/2025', data: '13 jul 2025', local: 'Templo · batistério', status: 'preparacao',
      candidatos: ['m20', 'd5', 'd3'], pastor: 'Pr. Daniel', obs: 'Curso pré-batismo às quartas, 19h.', curso: 'Quartas · 19h · sala 3', inscricoesAbertas: false },
    { id: 'b2', turma: 'Turma 03/2025', data: '21 set 2025', local: 'Templo · batistério', status: 'aberta',
      candidatos: ['m21'], pastor: 'Pr. Daniel', obs: 'Inscrições abertas até 31 ago.', curso: 'Inicia 27 ago · quartas 19h', inscricoesAbertas: true },
    { id: 'b3', turma: 'Turma 01/2025', data: '23 mar 2025', local: 'Templo · batistério', status: 'concluida',
      candidatos: ['m8', 'm12'], pastor: 'Pr. Daniel', obs: '12 batizados. Certificados entregues.' },
    { id: 'b4', turma: 'Turma 04/2024', data: '10 nov 2024', local: 'Templo · batistério', status: 'concluida',
      candidatos: ['m12'], pastor: 'Pr. Daniel', obs: '9 batizados.' },
  ];

  /* ── CURSOS & TRILHAS ────────────────────────────────────────────
     tipo: trilha (módulos sequenciais) / conteudo (consumo no app) / presencial (turma+data)
     modulos[].aulas[] = { nome, dur, tipo: video|texto|presencial } */
  const CURSOS = [
    { id: 'cs1', nome: 'Novos Convertidos', tipo: 'trilha', nivel: 'Entrada', cor: 'olive',
      desc: 'Os primeiros passos de quem acabou de aceitar Jesus. Base para o discipulado.',
      capa: 'Trilha inicial · 5 módulos',
      modulos: [
        { id: 'm-a', nome: 'Uma nova vida', aulas: [ { nome: 'O que aconteceu comigo?', dur: '8 min', tipo: 'video' }, { nome: 'Segurança da salvação', dur: '6 min', tipo: 'texto' } ] },
        { id: 'm-b', nome: 'Falando com Deus', aulas: [ { nome: 'Como orar', dur: '7 min', tipo: 'video' }, { nome: 'Lendo a Bíblia', dur: '9 min', tipo: 'video' } ] },
        { id: 'm-c', nome: 'A família da fé',  aulas: [ { nome: 'Por que a igreja?', dur: '6 min', tipo: 'video' }, { nome: 'Batismo: o próximo passo', dur: '5 min', tipo: 'texto' } ] },
        { id: 'm-d', nome: 'Vivendo a fé',     aulas: [ { nome: 'Hábitos do discípulo', dur: '8 min', tipo: 'video' } ] },
        { id: 'm-e', nome: 'Próximos passos',  aulas: [ { nome: 'Entrar num GC', dur: '4 min', tipo: 'texto' }, { nome: 'Encontro de encerramento', dur: 'presencial', tipo: 'presencial' } ] },
      ],
      matriculados: 18, concluintes: 11 },
    { id: 'cs2', nome: 'Fundamentos da Fé', tipo: 'trilha', nivel: 'Discipulado', cor: 'wheat',
      desc: 'As doutrinas essenciais da fé cristã. Pré-requisito para a membresia.',
      capa: 'Trilha · 8 módulos',
      modulos: [
        { id: 'f-1', nome: 'A Bíblia',        aulas: [ { nome: 'A Palavra de Deus', dur: '10 min', tipo: 'video' } ] },
        { id: 'f-2', nome: 'Deus Trindade',   aulas: [ { nome: 'Pai, Filho e Espírito', dur: '12 min', tipo: 'video' } ] },
        { id: 'f-3', nome: 'Salvação',        aulas: [ { nome: 'Graça e fé', dur: '9 min', tipo: 'video' } ] },
        { id: 'f-4', nome: 'Espírito Santo',  aulas: [ { nome: 'Quem é o Espírito', dur: '11 min', tipo: 'video' } ] },
        { id: 'f-5', nome: 'A Igreja',        aulas: [ { nome: 'Corpo de Cristo', dur: '8 min', tipo: 'texto' } ] },
        { id: 'f-6', nome: 'Vida cristã',     aulas: [ { nome: 'Santidade prática', dur: '9 min', tipo: 'video' } ] },
        { id: 'f-7', nome: 'Missão',          aulas: [ { nome: 'O chamado de todos', dur: '7 min', tipo: 'video' } ] },
        { id: 'f-8', nome: 'Mordomia',        aulas: [ { nome: 'Tempo, talento e bens', dur: '8 min', tipo: 'texto' } ] },
      ],
      matriculados: 24, concluintes: 16 },
    { id: 'cs3', nome: 'Escola de Líderes', tipo: 'presencial', nivel: 'Liderança', cor: 'clay',
      desc: 'Formação presencial para quem vai liderar GCs e ministérios. Turmas semestrais.',
      capa: 'Presencial · sáb 9h',
      turma: 'Turma 2025.2', encontros: 12, proximo: 'sáb 28 jun · 9h',
      modulos: [
        { id: 'l-1', nome: 'Caráter do líder',  aulas: [ { nome: 'Encontro 1 — Identidade', dur: 'presencial', tipo: 'presencial' } ] },
        { id: 'l-2', nome: 'Liderança de GC',   aulas: [ { nome: 'Encontro 2 — Multiplicação', dur: 'presencial', tipo: 'presencial' } ] },
        { id: 'l-3', nome: 'Cuidado pastoral',  aulas: [ { nome: 'Encontro 3 — Aconselhar', dur: 'presencial', tipo: 'presencial' } ] },
      ],
      matriculados: 14, concluintes: 0 },
    { id: 'cs4', nome: 'Casamento Blindado', tipo: 'conteudo', nivel: 'Família',  cor: 'olive',
      desc: 'Série em vídeo para casais. Pode ser feito no app, no seu ritmo.',
      capa: 'Conteúdo · 6 vídeos',
      modulos: [
        { id: 'k-1', nome: 'Aliança',     aulas: [ { nome: 'O pacto do casamento', dur: '14 min', tipo: 'video' } ] },
        { id: 'k-2', nome: 'Comunicação', aulas: [ { nome: 'Falar e ouvir', dur: '16 min', tipo: 'video' } ] },
        { id: 'k-3', nome: 'Conflitos',   aulas: [ { nome: 'Brigar bem', dur: '13 min', tipo: 'video' } ] },
      ],
      matriculados: 31, concluintes: 22 },
  ];

  /* ── GRUPOS DE CURSOS (trilhas de formação) + pré-requisitos ─────
     grupo: categoria do curso · preReqs: cursos exigidos para se inscrever */
  const CURSO_GRUPOS = [
    { id: 'entrada',    nome: 'Primeiros Passos', desc: 'Para quem acabou de chegar ou decidir.' },
    { id: 'discipulado',nome: 'Discipulado',      desc: 'Aprofundamento na fé e na membresia.' },
    { id: 'familia',    nome: 'Família',          desc: 'Casamento, filhos e relacionamentos.' },
    { id: 'lideranca',  nome: 'Liderança',        desc: 'Formação de quem vai liderar.' },
  ];
  const _cursoMeta = {
    cs1: { grupo: 'entrada',     preReqs: [] },
    cs2: { grupo: 'discipulado', preReqs: ['cs1'] },
    cs3: { grupo: 'lideranca',   preReqs: ['cs2'] },
    cs4: { grupo: 'familia',     preReqs: [] },
  };
  CURSOS.forEach((c) => { const m = _cursoMeta[c.id] || {}; c.grupo = m.grupo || 'entrada'; c.preReqs = m.preReqs || []; });

  /* garante um id estável em cada aula (o check-in de aula por QR usa aula:<curso>:<aula>) */
  CURSOS.forEach((c) => (c.modulos || []).forEach((mo) => (mo.aulas || []).forEach((a, i) => { if (!a.id) a.id = mo.id + '-a' + (i + 1); })));

  /* ── MATRÍCULAS · progresso por pessoa ───────────────────────────
     chave = cursoId; cada item: { pid (membro), feitas (nº aulas), total, status } */
  const totalAulas = (c) => c.modulos.reduce((n, m) => n + m.aulas.length, 0);
  const MATRICULAS = {
    cs1: [
      { mid: 'm25', feitas: 2, status: 'cursando' },
      { mid: 'm21', feitas: 6, status: 'cursando' },
      { mid: 'm20', feitas: 8, status: 'concluido' },
      { mid: 'm8',  feitas: 8, status: 'concluido' },
    ],
    cs2: [
      { mid: 'm12', feitas: 3, status: 'cursando' },
      { mid: 'm8',  feitas: 8, status: 'concluido' },
      { mid: 'm1',  feitas: 8, status: 'concluido' },
    ],
    cs3: [
      { mid: 'm1',  feitas: 1, status: 'cursando' },
      { mid: 'm7',  feitas: 1, status: 'cursando' },
    ],
    cs4: [
      { mid: 'm2',  feitas: 6, status: 'concluido' },
      { mid: 'm7',  feitas: 4, status: 'cursando' },
    ],
  };

  /* ── PEDIDOS · oração / falar com líder (do app do membro) ────────
     status: aberto / em_contato / resolvido */
  const PEDIDOS = [
    { id: 'pd1', mid: 'm8',  tipo: 'oracao',  quando: 'há 2 h',  status: 'aberto',     txt: 'Peço oração pela saúde da minha mãe, vai passar por cirurgia.', priv: false },
    { id: 'pd2', mid: 'm21', tipo: 'liticonta', quando: 'há 5 h', status: 'aberto',    txt: 'Gostaria de conversar com um líder sobre batismo.', priv: true },
    { id: 'pd3', mid: 'm20', tipo: 'oracao',  quando: 'ontem',   status: 'em_contato', txt: 'Estou desempregado, peço oração por uma porta de trabalho.', priv: false },
    { id: 'pd4', mid: 'm12', tipo: 'liticonta', quando: 'há 2 dias', status: 'resolvido', txt: 'Queria entender como entrar no time de Kids.', priv: false },
  ];

  /* ── PAPÉIS V2 · 4 níveis ────────────────────────────────────────
     Substitui a matriz por: Master, Pastor, Líder, Voluntário.
     REGRA: toda funcionalidade nova do app entra aqui como uma ação,
     para o Master poder liberar/bloquear por papel. */
  const ACOES_V2 = [
    { id: 'painel',     nome: 'Painel & relatórios',     grupo: 'Visão' },
    { id: 'membros',    nome: 'Membros',                 grupo: 'Pessoas' },
    { id: 'voluntarios',nome: 'Voluntários',             grupo: 'Pessoas' },
    { id: 'times',      nome: 'Times & ministérios',     grupo: 'Pessoas' },
    { id: 'visitantes', nome: 'Visitantes',              grupo: 'Pessoas' },
    { id: 'decisoes',   nome: 'Decisões',                grupo: 'Jornada' },
    { id: 'batismos',   nome: 'Batismos',                grupo: 'Jornada' },
    { id: 'cursos',     nome: 'Cursos & trilhas',        grupo: 'Jornada' },
    { id: 'escala',     nome: 'Escalas',                 grupo: 'Operação' },
    { id: 'cultos',     nome: 'Cultos & eventos',        grupo: 'Operação' },
    { id: 'comunica',   nome: 'Comunicação & push',      grupo: 'Operação' },
    { id: 'identidade', nome: 'Identidade & ciclos',     grupo: 'Igreja' },
    { id: 'historia',   nome: 'Nossa história',          grupo: 'Igreja' },
    { id: 'igreja',     nome: 'Dados da igreja',         grupo: 'Gestão' },
    { id: 'permissoes', nome: 'Papéis & permissões',     grupo: 'Gestão' },
    { id: 'rede',       nome: 'Rede (multi-igreja)',     grupo: 'Gestão' },
  ];
  const PAPEIS_V2 = [
    { id: 'master', nome: 'Pastor Master',  desc: 'Controle total da rede',     ic: '◆' },
    { id: 'pastor', nome: 'Pastor',         desc: 'Sua congregação inteira',    ic: '◆' },
    { id: 'lider',  nome: 'Líder',          desc: 'Seu ministério e GC',        ic: '◇' },
    { id: 'vol',    nome: 'Voluntário',     desc: 'App: escala, jornada, cursos', ic: '→' },
  ];
  const _all = (v) => ACOES_V2.reduce((o, a) => { o[a.id] = v; return o; }, {});
  const MATRIZ_V2 = {
    master: _all(true),
    pastor: Object.assign(_all(true), { permissoes: true, rede: false }),
    lider:  Object.assign(_all(false), { painel: true, voluntarios: true, times: true, decisoes: true, escala: true, cultos: true, comunica: true }),
    vol:    _all(false),
  };

  /* ── helpers da jornada ──────────────────────────────────────────*/
  const timelineDe = (mid) => (TIMELINE[mid] || []).slice().sort((a, b) => b.ord - a.ord);
  const proxPasso = (mid) => {
    const t = TIMELINE[mid] || [];
    const tem = (tipo) => t.some((e) => e.tipo === tipo);
    if (!tem('decisao') && !tem('reconciliacao')) return 'Registrar decisão';
    if (!tem('acompanha')) return 'Iniciar acompanhamento';
    if (!tem('batismo')) return 'Agendar batismo';
    if (!tem('curso')) return 'Matricular em Fundamentos';
    if (!tem('integracao')) return 'Classe de membresia';
    if (!tem('time')) return 'Convidar para servir';
    return 'Jornada completa';
  };

  /* expõe no SVC */
  Object.assign(S, {
    TIPOS_EVENTO, TIMELINE, DECISOES, BATISMOS, CURSOS, CURSO_GRUPOS, MATRICULAS, PEDIDOS,
    ACOES_V2, PAPEIS_V2, MATRIZ_V2, totalAulas, timelineDe, proxPasso,
  });
})();
