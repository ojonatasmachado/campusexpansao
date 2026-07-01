/* ════════════════════════════════════════════════════════════════
   CE.X SERVICE · IDENTIDADE, CICLOS, HISTÓRIA & PERFIL DOS TIMES
   Tudo é opcional: o que não estiver preenchido simplesmente não
   aparece. Conteúdo voltado ao membro conhecer e se conectar.
   Estende window.SVC. Carregado depois de data.js.
   ════════════════════════════════════════════════════════════════ */
(function () {
  const S = window.SVC;

  /* ── IDENTIDADE — missão, visão, propósito, valores ──────────────
     Qualquer campo vazio ('') é ocultado na tela. */
  const IDENTIDADE = {
    proposito: 'Existimos para que cada pessoa encontre Jesus, cresça na fé e descubra o seu lugar para servir. Nós preparamos. Deus multiplica.',
    missao: 'Fazer discípulos de Jesus — gente comum sendo transformada e transformando a sua cidade, uma vida de cada vez.',
    visao: 'Ser uma igreja de igrejas: formar líderes e multiplicar comunidades saudáveis em cada bairro, até que ninguém esteja longe de uma família na fé.',
    versiculo: '"Ide e fazei discípulos de todas as nações." — Mateus 28.19',
  };

  const VALORES = [
    { ic: '◆', titulo: 'Pessoas acima de programas', texto: 'Estruturas existem para servir gente — nunca o contrário. Cuidamos de quem está perto antes de fazer mais.' },
    { ic: '◇', titulo: 'Bíblia como base', texto: 'A Palavra orienta o que cremos, como vivemos e como decidimos. Tudo passa por ela.' },
    { ic: '◆', titulo: 'Todo mundo serve', texto: 'Ninguém é só plateia. Cada pessoa tem um dom e um lugar no corpo.' },
    { ic: '◇', titulo: 'Multiplicação, não acúmulo', texto: 'Formamos para enviar. O sucesso é ver gente nova liderando e novas igrejas nascendo.' },
    { ic: '◆', titulo: 'Excelência com simplicidade', texto: 'Fazemos bem feito, sem complicar. O melhor para Deus, ao alcance de todos.' },
  ];

  /* ── CICLOS / VISÃO DO ANO ───────────────────────────────────────
     Cada ciclo: tema do ano, banner (image-slot id), texto e objetivos.
     ativo:true = ciclo vigente, aparece em destaque pra todos. */
  const CICLOS = [
    { id: 'ciclo-2025', ano: '2025', tema: 'Ano do Enraizamento', ativo: true,
      versiculo: '"Firmados e edificados nele." — Colossenses 2.7',
      bannerId: 'ciclo-2025-banner',
      texto: 'Depois de anos crescendo para fora, 2025 é o ano de aprofundar raízes. Queremos uma igreja madura: gente firmada na Palavra, conectada em grupos e servindo com propósito. Menos correria, mais profundidade.',
      objetivos: [
        'Cada membro num Grupo de Comunhão até o meio do ano',
        'Dobrar o número de discipuladores 1-a-1',
        'Concluir a primeira turma da Escola de Líderes',
        'Plantar uma nova congregação na zona leste',
      ] },
    { id: 'ciclo-2024', ano: '2024', tema: 'Ano do Envio', ativo: false,
      versiculo: '"Como o Pai me enviou, eu vos envio." — João 20.21',
      bannerId: 'ciclo-2024-banner',
      texto: 'Foi o ano de sair: evangelismo nas praças, novos GCs e o primeiro time de plantação. Encerramos com 4 congregações na rede.',
      objetivos: ['Abrir 10 novos GCs', 'Treinar 30 evangelistas', 'Iniciar a rede de congregações'] },
  ];

  /* ── NOSSA HISTÓRIA — mural histórico (fotos, textos, links) ──────
     Ordem cronológica (mais antigo → recente). fotoId = image-slot.
     link opcional (vídeo, matéria). */
  const HISTORIA = [
    { id: 'h1', ano: '2014', titulo: 'O começo na sala de casa', fotoId: 'hist-2014',
      texto: 'Tudo começou com 12 pessoas reunidas numa sala, com uma convicção simples: preparar gente e deixar Deus multiplicar. Sem estrutura, só fé e um sofá.', link: '' },
    { id: 'h2', ano: '2016', titulo: 'O primeiro templo', fotoId: 'hist-2016',
      texto: 'Já eram 80 pessoas. Alugamos o primeiro salão no Centro e fizemos o primeiro batismo: 9 vidas nas águas num dia que ninguém esquece.', link: '' },
    { id: 'h3', ano: '2019', titulo: 'Nasce o CE.X Kids', fotoId: 'hist-2019',
      texto: 'O ministério infantil ganhou espaço próprio e identidade. As crianças deixaram de ser "o cantinho" para serem prioridade.', link: '' },
    { id: 'h4', ano: '2021', titulo: 'A igreja online', fotoId: 'hist-2021',
      texto: 'A pandemia nos empurrou para as telas. Em semanas tínhamos transmissão, GCs por vídeo e gente de outras cidades acompanhando. A igreja não parou.', link: 'https://exemplo.com/primeira-live' },
    { id: 'h5', ano: '2024', titulo: 'A rede de congregações', fotoId: 'hist-2024',
      texto: 'Da matriz nasceram congregações no Norte, Sul e Leste. O sonho de "uma igreja de igrejas" começou a virar mapa.', link: '' },
  ];

  /* ── PERFIL DOS TIMES — info rica por ministério ──────────────────
     Tudo opcional. preReqs = ids de cursos (S.CURSOS). aberto = recebe
     novos voluntários agora. Conecta o membro ao propósito do time. */
  const TIMES_INFO = {
    louvor: {
      proposito: 'Conduzir a igreja à presença de Deus com excelência e verdade. A gente não faz show — abre caminho para o encontro.',
      chegada: 'Domingo 8h30 (manhã) · 17h30 (noite) — 1h30 antes para passagem de som.',
      comoTrabalha: 'Ensaiamos aos sábados às 16h. Repertório enviado na segunda. Cada escala roda banda, vocal e técnica.',
      responsabilidades: ['Chegar no horário da passagem de som', 'Estudar o repertório antes do ensaio', 'Vestimenta combinada com a equipe', 'Coração preparado em oração'],
      preReqs: ['cs1'], aberto: true },
    recepcao: {
      proposito: 'Ser o primeiro abraço da igreja. Quem chega precisa se sentir esperado, visto e em casa logo na porta.',
      chegada: 'Domingo 9h15 (manhã) · 18h15 (noite) — 45min antes para preparar a recepção.',
      comoTrabalha: 'Times por turno. Acolhemos na porta, cuidamos do visitante e direcionamos para os lugares e ministérios.',
      responsabilidades: ['Sorriso e atenção genuína', 'Conhecer a programação para orientar', 'Cuidar do cartão do visitante', 'Acompanhar quem chega sozinho'],
      preReqs: [], aberto: true },
    kids: {
      proposito: 'Plantar a fé no coração das crianças e dar paz aos pais. O que se aprende cedo, fica para a vida toda.',
      chegada: 'Domingo 9h00 — 1h antes para preparar a sala e o check-in.',
      comoTrabalha: 'Salas por faixa etária. Material novo a cada trimestre. Check-in com segurança para entrega só aos responsáveis.',
      responsabilidades: ['Antecedentes e ficha em dia', 'Preparar a aula da semana', 'Zelar pela segurança no check-in/out', 'Paciência e carinho de sobra'],
      preReqs: ['cs1'], aberto: true },
    midia: {
      proposito: 'Levar o culto para além das quatro paredes. Cada transmissão pode alcançar quem nunca entraria por uma porta.',
      chegada: 'Domingo 8h45 — para ligar e testar tudo antes.',
      comoTrabalha: 'Som, projeção, câmeras e live. Rodízio nas funções e checklist técnico antes de cada culto.',
      responsabilidades: ['Saber operar sua função', 'Testar equipamentos antes', 'Atenção total durante o culto', 'Guardar e organizar no fim'],
      preReqs: [], aberto: true },
    diaconia: {
      proposito: 'Servir nos bastidores para que tudo aconteça. Ceia, ofertas, estrutura — o cuidado que quase ninguém vê, mas todos sentem.',
      chegada: 'Domingo 9h00 — para preparar o ambiente e a ceia.',
      comoTrabalha: 'Coordenação distribui as funções. Cuidamos da estrutura, das ofertas com responsabilidade e da Santa Ceia.',
      responsabilidades: ['Pontualidade e discrição', 'Cuidado fiel com as ofertas', 'Preparar a ceia com reverência', 'Deixar tudo organizado'],
      preReqs: [], aberto: false },
    intercessao: {
      proposito: 'Sustentar a igreja em oração. Antes de qualquer coisa acontecer no altar, ela já aconteceu no joelho.',
      chegada: 'Domingo 9h00 — sala de oração aberta 1h antes do culto.',
      comoTrabalha: 'Escala de oração antes, durante e depois dos cultos. Sala de oração aberta e apoio ao altar.',
      responsabilidades: ['Vida de oração constante', 'Sigilo sobre os pedidos', 'Disponibilidade para o altar', 'Sensibilidade espiritual'],
      preReqs: ['cs1', 'cs2'], aberto: true },
  };

  const timeInfo = (id) => TIMES_INFO[id] || null;

  /* ── GRUPOS / CÉLULAS — estrutura opcional e renomeável ──────────
     Nem toda igreja trabalha com células. Quando ativo, o nome é o que
     a igreja escolher (Célula, GC, Pequeno Grupo, Conexão...). */
  const GRUPOS_CFG = {
    ativo: true,
    termo: 'Grupo de Comunhão',   // singular
    termoP: 'Grupos de Comunhão', // plural
    sigla: 'GC',
  };
  const GRUPOS_PRESETS = [
    { termo: 'Grupo de Comunhão', termoP: 'Grupos de Comunhão', sigla: 'GC' },
    { termo: 'Célula', termoP: 'Células', sigla: 'CEL' },
    { termo: 'Pequeno Grupo', termoP: 'Pequenos Grupos', sigla: 'PG' },
    { termo: 'Conexão', termoP: 'Conexões', sigla: 'CX' },
    { termo: 'Casa de Paz', termoP: 'Casas de Paz', sigla: 'CP' },
  ];
  const grp = () => S.GRUPOS_CFG || GRUPOS_CFG;

  /* ── PAPÉIS MINISTERIAIS — títulos que a igreja define (opcional) ──
     Pastor, líder, diácono... cada igreja monta a sua lista. */
  const PAPEIS_IGREJA = ['Pastor', 'Pastora', 'Líder', 'Diácono', 'Diaconisa', 'Evangelista', 'Presbítero', 'Bispo', 'Apóstolo'];
  /* alguns membros já exercem papéis (semente do protótipo) */
  const _papeis = { m1: 'Líder', m3: 'Líder', m7: 'Diácono', m14: 'Presbítero', m2: 'Líder' };
  (S.MEMBROS || []).forEach((m) => { if (_papeis[m.id]) m.papel = _papeis[m.id]; });

  /* ── "NOVO" por 3 meses desde o 1º contato + mês/ano de entrada ──
     contato: AAAA-MM da primeira visita. isNovo = menos de 3 meses. */
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const _contatoRecente = { m25: '2026-05', m27: '2026-06', m24: '2026-04', m21: '2026-03', m20: '2026-04', m26: '2026-05' };
  (S.MEMBROS || []).forEach((m) => {
    m.contato = _contatoRecente[m.id] || (m.desde + '-01');
    const h = String(m.id).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    m.membroDesde = m.membroDesde || (MESES[h % 12] + ' ' + m.desde);
  });
  const NOW = new Date();
  const isNovo = (m) => {
    if (!m || !m.contato) return false;
    const p = m.contato.split('-'); const y = +p[0], mo = +p[1];
    const months = (NOW.getFullYear() - y) * 12 + (NOW.getMonth() + 1 - mo);
    return months >= 0 && months < 3;
  };

  /* ── BIBLIOTECA DE ÍCONES — marcas geométricas on-brand ──────────
     Glifos de linha/sólidos coerentes com a identidade (◆ ◇ → ▷).
     Usados em times/ministérios, grupos e categorias. */
  const ICONES = [...new Set([
    '◆', '◇', '◈', '◢', '▷', '▶', '△', '▲', '◭', '⬡', '⬢', '⬣',
    '●', '◐', '◑', '◍', '◎', '⊕', '⊗', '✦', '✧', '✚', '✛', '❖',
    '♪', '♫', '☰', '⌖', '⌘', '⎈', '⧉', '⬥', '⬦', '➤', '→', '↗',
    '☼', '✿', '❂', '⚑', '⚐', '⛬', '⌂', '☖', '♁', '⟁', '◔', '◕',
    '⛪', '✝', '☨', '☧', '☥', '⌖', '✦', '♫', '☖', '⌂', '☗', '⛺',
    '✆', '✉', '✍', '✋', '☞', '☕', '♬', '⚿', '⚓', '☂', '☘', '✺',
    '⚐', '☼', '⛅', '★', '✵', '✷', '⚜', '⚘', '✾', '✤', '❀', '✿',
  ])];

  /* ── TIPOS DE EVENTO — configuráveis pela igreja ─────────────────
     Pré-preenchem o campo "tipo" ao criar culto/evento. A igreja
     adiciona os seus; sempre cabe um do zero. */
  const TIPOS_EVENTO_CFG = ['Culto', 'Oração', 'Jovens', 'Kids', 'Ensino', 'Conferência', 'Discipulado', 'Evangelismo', 'Ceia', 'Vigília'];

  /* ── FAIXAS DE ESCALA — fixas: manhã/tarde/noite (ligadas à disponibilidade) */
  const FAIXAS = [
    { v: 'manha', l: 'Manhã' },
    { v: 'tarde', l: 'Tarde' },
    { v: 'noite', l: 'Noite' },
  ];

  /* ── CONTATO DE VISITANTES — parametrização do líder da área ──────
     Prazo do 1º contato, canal e a mensagem/abordagem padrão. */
  const CONTATO_CFG = {
    prazoHoras: 48,
    canal: 'WhatsApp',
    metaIntegracaoDias: 90,
    mensagem: 'Oi {nome}! Que alegria ter você com a gente no {evento}. Somos a {igreja} e queremos te conhecer melhor. Posso te ajudar com algo essa semana?',
    abordagem: 'Acolher sem pressão. Ouvir a história, oferecer oração e convidar para um Grupo de Comunhão. Sem cobrança, só cuidado genuíno.',
  };

  /* ── CORES DE DESTAQUE (SaaS) — todas dentro da paleta quente CE.X ──
     A igreja escolhe a que mais combina com a sua marca. */
  const ACCENTS = [
    { id: 'olive', nome: 'Oliva',   hex: '#7A9E3F', soft: '#94B85C', deep: '#4F6B26', rgb: '122,158,63' },
    { id: 'moss',  nome: 'Musgo',   hex: '#5E7E3A', soft: '#7C9C56', deep: '#3C5322', rgb: '94,126,58' },
    { id: 'sage',  nome: 'Sálvia',  hex: '#8AA06A', soft: '#A4B889', deep: '#5E724A', rgb: '138,160,106' },
    { id: 'wheat', nome: 'Trigo',   hex: '#CBA95C', soft: '#DCC07E', deep: '#9C7E3E', rgb: '203,169,92' },
    { id: 'ochre', nome: 'Ocre',    hex: '#C79A3E', soft: '#D8B566', deep: '#977430', rgb: '199,154,62' },
    { id: 'clay',  nome: 'Clay',    hex: '#C5805A', soft: '#D6A07F', deep: '#9A5E3C', rgb: '197,128,90' },
    { id: 'terra', nome: 'Terra',   hex: '#B5694A', soft: '#CB876B', deep: '#8C4E33', rgb: '181,105,74' },
    { id: 'rust',  nome: 'Ferrugem',hex: '#A85C36', soft: '#C07B56', deep: '#7E4427', rgb: '168,92,54' },
    { id: 'brick', nome: 'Telha',   hex: '#B25548', soft: '#C9786C', deep: '#883E33', rgb: '178,85,72' },
    { id: 'grafite',nome: 'Grafite', hex: '#5A5E50', soft: '#787C6C', deep: '#3A3D34', rgb: '90,94,80' },
    { id: 'cinza',  nome: 'Cinza',   hex: '#9A9C8E', soft: '#B4B6A8', deep: '#6B6E62', rgb: '154,156,142' },
  ];

  Object.assign(S, { IDENTIDADE, VALORES, CICLOS, HISTORIA, TIMES_INFO, timeInfo, GRUPOS_CFG, GRUPOS_PRESETS, grp, ICONES, ACCENTS, PAPEIS_IGREJA, isNovo, TIPOS_EVENTO_CFG, FAIXAS, CONTATO_CFG });
})();
