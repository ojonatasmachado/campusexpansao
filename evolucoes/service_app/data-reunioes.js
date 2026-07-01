/* ════════════════════════════════════════════════════════════════
   CE.X SERVICE · REUNIÕES & ENSAIOS (dados)
   Reuniões: líder/pastor marca, escolhe times, flega/desflega pessoas,
   pauta, ata (o que foi discutido) e responsabilidades para validar
   na próxima. Ensaios: recorrentes ou eventuais, com participantes.
   Estende window.SVC. Carregado depois de data.js.
   ════════════════════════════════════════════════════════════════ */
(function () {
  const S = window.SVC;

  /* quem pode marcar reunião = líderes e pastores */
  const podeMarcar = (p) => p && ((p.lider && p.lider.length > 0) || (p.papel && /pastor|bispo|apóstolo|presb/i.test(p.papel)));

  /* ── REUNIÕES ────────────────────────────────────────────────────
     status: agendada / realizada
     pauta: [linhas] · ata: o que foi discutido · acoes: [{ o, quem, status }]
     times: ids · presentes: ids de pessoas (flegadas) */
  const REUNIOES = [
    {
      id: 'r1', titulo: 'Alinhamento de Louvor & Mídia', data: '02 jul 2026', hora: '20h00', local: 'Sala 2',
      autor: 'p1', status: 'agendada', times: ['louvor', 'midia'],
      presentes: ['p1', 'p2', 'p13', 'p9'],
      pauta: ['Repertório do mês de julho', 'Integração entre som e vocal', 'Escala de feriados'],
      ata: '', acoes: [],
    },
    {
      id: 'r2', titulo: 'Reunião de líderes', data: '18 jun 2026', hora: '19h30', local: 'Templo',
      autor: 'p1', status: 'realizada', times: ['louvor', 'recepcao', 'kids', 'midia', 'diaconia'],
      presentes: ['p1', 'p3', 'p7', 'p14', 'p9'],
      pauta: ['Balanço do trimestre', 'Metas do ciclo 2026', 'Cuidado com a equipe'],
      ata: 'Avaliamos o crescimento dos GCs e a necessidade de formar novos líderes. Decisão de abrir a próxima turma da Escola de Líderes em agosto.',
      acoes: [
        { o: 'Abrir inscrições da Escola de Líderes', quem: 'p3', status: 'feito' },
        { o: 'Revisar escala de férias de julho', quem: 'p1', status: 'andamento' },
        { o: 'Visitar GCs da zona leste', quem: 'p7', status: 'pendente' },
      ],
    },
  ];

  /* ── ENSAIOS ─────────────────────────────────────────────────────
     tipo: louvor / teatro / danca / coreografia / geral / outro
     recorrencia: semanal / quinzenal / eventual
     publico: 'musicos' | 'ministros' | 'todos'
     data: dia no calendário · times/presentes: ids
     repertorio: [{titulo,tom,youtube,cifra}] · anexos: [{kind,tipo,nome,url}] */
  const ENSAIOS = [
    { id: 'e1', titulo: 'Ensaio do Louvor', tipo: 'louvor', time: 'louvor', times: ['louvor'], presentes: ['p1', 'p5', 'p6', 'p9', 'p13'],
      data: '28 jun', hora: '16h00', local: 'Templo', recorrencia: 'semanal', publico: 'musicos', vezes: null,
      repertorio: [
        { titulo: 'Bondade de Deus', tom: 'G', youtube: 'https://youtu.be/', cifra: 'https://www.cifraclub.com.br/' },
        { titulo: 'Santo para sempre', tom: 'C', youtube: '', cifra: '' },
      ], anexos: [], obs: 'Banda completa. Passagem de repertório da semana.' },
    { id: 'e2', titulo: 'Ensaio de vocal', tipo: 'louvor', time: 'louvor', times: ['louvor'], presentes: ['p1', 'p6'],
      data: '26 jun', hora: '20h00', local: 'Sala 2', recorrencia: 'semanal', publico: 'ministros', vezes: null,
      repertorio: [], anexos: [], obs: 'Somente ministros de vocal.' },
    { id: 'e3', titulo: 'Ensaio geral · Conferência', tipo: 'geral', time: 'louvor', times: ['louvor', 'midia'], presentes: ['p1', 'p4', 'p6', 'p9'],
      data: '04 jul', hora: '14h00', local: 'Templo', recorrencia: 'eventual', publico: 'todos', vezes: 3,
      repertorio: [], anexos: [{ kind: 'link', tipo: 'YouTube', nome: 'roteiro da abertura', url: 'https://youtu.be/' }], obs: 'Preparação para a conferência de jovens. 3 sábados seguidos.' },
  ];

  const TIPOS_ENSAIO = { louvor: 'Louvor', teatro: 'Teatro', danca: 'Dança', coreografia: 'Coreografia', geral: 'Geral', outro: 'Outro' };

  const PUBLICO = { musicos: 'Só músicos', ministros: 'Só ministros', todos: 'Time todo' };
  const RECOR = { semanal: 'Semanal', quinzenal: 'Quinzenal', mensal: 'Mensal', bimestral: 'Bimestral', trimestral: 'Trimestral', eventual: 'Eventual' };
  const ACAO_ST = { pendente: { l: 'Pendente', c: 'wait' }, andamento: { l: 'Em andamento', c: 'wait' }, feito: { l: 'Feito', c: 'ok' } };

  Object.assign(S, { REUNIOES, ENSAIOS, TIPOS_ENSAIO, PUBLICO, RECOR, ACAO_ST, podeMarcar });
})();
