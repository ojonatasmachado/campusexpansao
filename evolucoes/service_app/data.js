/* ════════════════════════════════════════════════════════════════
   CE.X SERVICE · DADOS SEMENTE (protótipo)
   Estado em memória. Backend real (login, banco, multi-igreja) fica
   para o Claude Code. Multi-congregação: 1 matriz + congregações.
   ════════════════════════════════════════════════════════════════ */

const CONGREGACOES = [
  { id: 'matriz', nome: 'CE.X Central', cidade: 'Sede · matriz', matriz: true, membros: 480 },
  { id: 'norte', nome: 'Congregação Zona Norte', cidade: 'Vila Aurora', matriz: false, membros: 120 },
  { id: 'sul', nome: 'Congregação Zona Sul', cidade: 'Jardim Sul', matriz: false, membros: 86 },
  { id: 'leste', nome: 'Ponto de Pregação Leste', cidade: 'Itaquera', matriz: false, membros: 38 },
];

/* TIMES / MINISTÉRIOS — cor NÃO codifica time (só marca). Ícone ◆/◇ + inicial. */
const TIMES = [
  { id: 'louvor', nome: 'Louvor & Adoração', lider: 'Mariana Reis', voluntarios: 14, ic: '♪', desc: 'Banda, vocal e técnica de palco para os cultos.',
    funcoes: ['Ministro', 'Vocal', 'Violão', 'Teclado', 'Baixo', 'Bateria'] },
  { id: 'recepcao', nome: 'Recepção & Acolhida', lider: 'Paulo Tavares', voluntarios: 11, ic: '◇', desc: 'Primeiro contato: porta, visitantes e direcionamento.',
    funcoes: ['Líder de turno', 'Porta', 'Acolhida visitante', 'Direcionamento'] },
  { id: 'kids', nome: 'CE.X Kids', lider: 'Renata Lopes', voluntarios: 18, ic: '◆', desc: 'Ministério infantil. Berçário, maternal e primários.',
    funcoes: ['Coordenação', 'Professor', 'Auxiliar', 'Check-in'] },
  { id: 'midia', nome: 'Mídia & Transmissão', lider: 'Diego Martins', voluntarios: 8, ic: '▷', desc: 'Som, projeção, câmeras e transmissão online.',
    funcoes: ['Som', 'Projeção', 'Câmera', 'Live / Switcher'] },
  { id: 'diaconia', nome: 'Diaconia', lider: 'Sérgio Almeida', voluntarios: 9, ic: '◆', desc: 'Ceia, ofertas, estrutura e apoio ao culto.',
    funcoes: ['Coordenação', 'Ofertas', 'Ceia', 'Estrutura'] },
  { id: 'intercessao', nome: 'Intercessão', lider: 'Dona Cleusa', voluntarios: 7, ic: '◇', desc: 'Oração antes, durante e ao final dos cultos.',
    funcoes: ['Líder', 'Sala de oração', 'Altar'] },
];

const initials = null; /* helper vive no JSX */

/* PESSOAS / VOLUNTÁRIOS */
const PESSOAS = [
  { id: 'p1', nome: 'Mariana Reis', tel: '(11) 98812-4471', email: 'mariana@cex.com', desde: '2021', lider: ['louvor', 'midia'],
    times: ['louvor', 'midia'], funcoes: ['Ministro', 'Vocal'], status: 'ativo', engaj: 96,
    disp: { dom_m: true, dom_n: true, qua: false }, self: true },
  { id: 'p2', nome: 'Paulo Tavares', tel: '(11) 99640-1182', email: 'paulo.t@cex.com', desde: '2020', lider: ['recepcao'],
    times: ['recepcao', 'diaconia'], funcoes: ['Líder de turno', 'Ofertas'], status: 'ativo', engaj: 91,
    disp: { dom_m: true, dom_n: true, qua: true } },
  { id: 'p3', nome: 'Renata Lopes', tel: '(11) 98123-7755', email: 'renata@cex.com', desde: '2019', lider: ['kids'],
    times: ['kids'], funcoes: ['Coordenação'], status: 'ativo', engaj: 88,
    disp: { dom_m: true, dom_n: false, qua: false } },
  { id: 'p4', nome: 'Diego Martins', tel: '(11) 97441-9023', email: 'diego@cex.com', desde: '2022', lider: ['midia'],
    times: ['midia'], funcoes: ['Live / Switcher', 'Câmera'], status: 'ativo', engaj: 84,
    disp: { dom_m: false, dom_n: true, qua: true } },
  { id: 'p5', nome: 'Lucas Andrade', tel: '(11) 96677-3320', email: 'lucas@cex.com', desde: '2023', lider: [],
    times: ['louvor'], funcoes: ['Violão', 'Vocal'], status: 'ativo', engaj: 72,
    disp: { dom_m: true, dom_n: true, qua: false } },
  { id: 'p6', nome: 'Beatriz Nunes', tel: '(11) 98890-5512', email: 'bia@cex.com', desde: '2023', lider: [],
    times: ['louvor', 'midia'], funcoes: ['Vocal', 'Projeção'], status: 'ativo', engaj: 79,
    disp: { dom_m: true, dom_n: false, qua: true } },
  { id: 'p7', nome: 'Sérgio Almeida', tel: '(11) 99012-7781', email: 'sergio@cex.com', desde: '2018', lider: ['diaconia'],
    times: ['diaconia'], funcoes: ['Coordenação', 'Ceia'], status: 'ativo', engaj: 90,
    disp: { dom_m: true, dom_n: true, qua: true } },
  { id: 'p8', nome: 'Camila Souza', tel: '(11) 98445-1190', email: 'camila@cex.com', desde: '2024', lider: [],
    times: ['recepcao'], funcoes: ['Acolhida visitante'], status: 'ativo', engaj: 68,
    disp: { dom_m: true, dom_n: true, qua: false } },
  { id: 'p9', nome: 'Tiago Ferreira', tel: '(11) 97788-2240', email: 'tiago@cex.com', desde: '2022', lider: [],
    times: ['louvor'], funcoes: ['Bateria'], status: 'ativo', engaj: 81,
    disp: { dom_m: false, dom_n: true, qua: false } },
  { id: 'p10', nome: 'Juliana Castro', tel: '(11) 98334-6612', email: 'ju@cex.com', desde: '2023', lider: [],
    times: ['kids'], funcoes: ['Professor'], status: 'ativo', engaj: 77,
    disp: { dom_m: true, dom_n: false, qua: false } },
  { id: 'p11', nome: 'André Pinto', tel: '(11) 96120-8834', email: 'andre@cex.com', desde: '2021', lider: [],
    times: ['midia'], funcoes: ['Som'], status: 'ativo', engaj: 74,
    disp: { dom_m: true, dom_n: true, qua: true } },
  { id: 'p12', nome: 'Fernanda Dias', tel: '(11) 98567-1123', email: 'fe@cex.com', desde: '2024', lider: [],
    times: ['recepcao', 'kids'], funcoes: ['Porta', 'Auxiliar'], status: 'ativo', engaj: 63, recusasSeguidas: 2,
    disp: { dom_m: true, dom_n: false, qua: false } },
  { id: 'p13', nome: 'Marcos Vieira', tel: '(11) 97233-4456', email: 'marcos@cex.com', desde: '2020', lider: [],
    times: ['louvor'], funcoes: ['Baixo', 'Teclado'], status: 'pausa', engaj: 40, recusasSeguidas: 4, diasIndisponivel: 35,
    disp: { dom_m: false, dom_n: false, qua: false } },
  { id: 'p14', nome: 'Cleusa Moraes', tel: '(11) 99800-1245', email: 'cleusa@cex.com', desde: '2015', lider: ['intercessao'],
    times: ['intercessao'], funcoes: ['Líder', 'Altar'], status: 'ativo', engaj: 94,
    disp: { dom_m: true, dom_n: true, qua: true } },
  { id: 'p15', nome: 'Rafael Gomes', tel: '(11) 98090-3367', email: 'rafa@cex.com', desde: '2023', lider: [],
    times: ['diaconia'], funcoes: ['Estrutura', 'Ofertas'], status: 'ativo', engaj: 70, ferias: true,
    disp: { dom_m: true, dom_n: true, qua: false } },
  { id: 'p16', nome: 'Patrícia Lima', tel: '(11) 97455-9981', email: 'paty@cex.com', desde: '2022', lider: [],
    times: ['kids', 'recepcao'], funcoes: ['Professor', 'Direcionamento'], status: 'ativo', engaj: 82,
    disp: { dom_m: true, dom_n: false, qua: true } },
];

/* CULTOS / EVENTOS (próximos) */
/* cronograma: roteiro do culto, etapa por etapa (hora, duração, função, responsável) */
const CULTOS = [
  { id: 'c1', dia: 'Domingo', data: '15 jun', hora: '10h00', nome: 'Culto da Manhã', tipo: 'Culto', slot: 'dom_m', local: 'Templo', times: ['louvor', 'recepcao', 'kids', 'midia', 'diaconia', 'intercessao'],
    cronograma: [
      { hora: '08h30', dur: 30, item: 'Passagem de som', time: 'louvor', resp: 'p1', cat: 'louvor', obs: 'Banda completa no palco.' },
      { hora: '09h00', dur: 30, item: 'Oração de abertura (intercessão)', time: 'intercessao', resp: 'p14', cat: 'oracao', obs: 'Sala de oração e altar.' },
      { hora: '09h15', dur: 45, item: 'Recepção e acolhida na porta', time: 'recepcao', resp: 'p2', cat: 'admin', obs: '' },
      { hora: '10h00', dur: 15, item: 'Boas-vindas e avisos', time: 'recepcao', resp: 'p2', cat: 'admin', obs: 'Palco.' },
      { hora: '10h15', dur: 30, item: 'Momento de louvor', time: 'louvor', resp: 'p1', cat: 'louvor', obs: '4 cânticos.' },
      { hora: '10h45', dur: 10, item: 'Ofertas e dízimos', time: 'diaconia', resp: 'p7', cat: 'admin', obs: '' },
      { hora: '10h55', dur: 40, item: 'Ministração da Palavra', time: null, resp: null, cat: 'mensagem', obs: 'Pr. Daniel.' },
      { hora: '11h35', dur: 15, item: 'Apelo e oração final', time: 'intercessao', resp: 'p14', cat: 'oracao', obs: '' },
      { hora: '11h50', dur: 10, item: 'Encerramento e saída', time: 'recepcao', resp: 'p2', cat: 'admin', obs: '' },
    ] },
  { id: 'c2', dia: 'Domingo', data: '15 jun', hora: '19h00', nome: 'Culto da Noite', tipo: 'Culto', slot: 'dom_n', local: 'Templo', times: ['louvor', 'recepcao', 'midia', 'diaconia'], cronograma: [] },
  { id: 'c3', dia: 'Quarta', data: '18 jun', hora: '20h00', nome: 'Culto de Oração', tipo: 'Oração', slot: 'qua', local: 'Templo', times: ['louvor', 'intercessao', 'midia'], cronograma: [] },
  { id: 'c4', dia: 'Sábado', data: '21 jun', hora: '19h30', nome: 'Encontro de Jovens', tipo: 'Jovens', slot: 'dom_n', local: 'Anexo', times: ['louvor', 'midia', 'recepcao'], cronograma: [] },
];

/* ESCALA · por time → função → cultos (status: ok / wait / no / vago) */
/* st: ok=confirmado, wait=pendente, no=recusou */
const ESCALAS = {
  louvor: {
    funcoes: [
      { fn: 'Ministro', need: 1, cells: { c1: [{ p: 'p1', st: 'ok' }], c2: [{ p: 'p1', st: 'ok' }], c3: [], c4: [{ p: 'p6', st: 'wait' }] } },
      { fn: 'Vocal', need: 2, cells: { c1: [{ p: 'p6', st: 'ok' }, { p: 'p5', st: 'wait' }], c2: [{ p: 'p6', st: 'ok' }], c3: [], c4: [{ p: 'p5', st: 'ok' }] } },
      { fn: 'Violão', need: 1, cells: { c1: [{ p: 'p5', st: 'ok' }], c2: [{ p: 'p5', st: 'wait' }], c3: [], c4: [] } },
      { fn: 'Bateria', need: 1, cells: { c1: [], c2: [{ p: 'p9', st: 'ok' }], c3: [], c4: [{ p: 'p9', st: 'no' }] } },
      { fn: 'Baixo / Teclado', need: 1, cells: { c1: [{ p: 'p13', st: 'no' }], c2: [], c3: [], c4: [] } },
    ],
  },
  recepcao: {
    funcoes: [
      { fn: 'Líder de turno', need: 1, cells: { c1: [{ p: 'p2', st: 'ok' }], c2: [{ p: 'p2', st: 'ok' }], c3: [{ p: 'p2', st: 'ok' }], c4: [] } },
      { fn: 'Porta', need: 2, cells: { c1: [{ p: 'p12', st: 'ok' }, { p: 'p16', st: 'wait' }], c2: [{ p: 'p8', st: 'ok' }], c3: [], c4: [] } },
      { fn: 'Acolhida visitante', need: 1, cells: { c1: [{ p: 'p8', st: 'ok' }], c2: [{ p: 'p8', st: 'wait' }], c3: [], c4: [{ p: 'p16', st: 'ok' }] } },
      { fn: 'Direcionamento', need: 1, cells: { c1: [{ p: 'p16', st: 'ok' }], c2: [], c3: [], c4: [] } },
    ],
  },
  kids: {
    funcoes: [
      { fn: 'Coordenação', need: 1, cells: { c1: [{ p: 'p3', st: 'ok' }], c2: [], c3: [], c4: [] } },
      { fn: 'Professor', need: 2, cells: { c1: [{ p: 'p10', st: 'ok' }, { p: 'p16', st: 'ok' }], c2: [], c3: [], c4: [] } },
      { fn: 'Auxiliar', need: 2, cells: { c1: [{ p: 'p12', st: 'wait' }], c2: [], c3: [], c4: [] } },
      { fn: 'Check-in', need: 1, cells: { c1: [{ p: 'p3', st: 'ok' }], c2: [], c3: [], c4: [] } },
    ],
  },
  midia: {
    funcoes: [
      { fn: 'Som', need: 1, cells: { c1: [{ p: 'p11', st: 'ok' }], c2: [{ p: 'p11', st: 'ok' }], c3: [{ p: 'p11', st: 'wait' }], c4: [] } },
      { fn: 'Projeção', need: 1, cells: { c1: [{ p: 'p6', st: 'ok' }], c2: [], c3: [], c4: [{ p: 'p6', st: 'wait' }] } },
      { fn: 'Câmera', need: 1, cells: { c1: [{ p: 'p4', st: 'ok' }], c2: [{ p: 'p4', st: 'ok' }], c3: [], c4: [] } },
      { fn: 'Live / Switcher', need: 1, cells: { c1: [], c2: [{ p: 'p4', st: 'ok' }], c3: [], c4: [] } },
    ],
  },
  diaconia: {
    funcoes: [
      { fn: 'Coordenação', need: 1, cells: { c1: [{ p: 'p7', st: 'ok' }], c2: [{ p: 'p7', st: 'ok' }], c3: [{ p: 'p7', st: 'ok' }], c4: [] } },
      { fn: 'Ofertas', need: 2, cells: { c1: [{ p: 'p15', st: 'ok' }, { p: 'p2', st: 'ok' }], c2: [{ p: 'p15', st: 'wait' }], c3: [], c4: [] } },
      { fn: 'Ceia', need: 1, cells: { c1: [{ p: 'p7', st: 'ok' }], c2: [], c3: [], c4: [] } },
      { fn: 'Estrutura', need: 1, cells: { c1: [{ p: 'p15', st: 'ok' }], c2: [{ p: 'p15', st: 'ok' }], c3: [], c4: [] } },
    ],
  },
  intercessao: {
    funcoes: [
      { fn: 'Líder', need: 1, cells: { c1: [{ p: 'p14', st: 'ok' }], c2: [{ p: 'p14', st: 'ok' }], c3: [{ p: 'p14', st: 'ok' }], c4: [] } },
      { fn: 'Sala de oração', need: 1, cells: { c1: [{ p: 'p14', st: 'ok' }], c2: [], c3: [{ p: 'p14', st: 'ok' }], c4: [] } },
      { fn: 'Altar', need: 1, cells: { c1: [], c2: [{ p: 'p14', st: 'wait' }], c3: [], c4: [] } },
    ],
  },
};

/* VISITANTES · CRM com responsável, lembrete e histórico */
/* etapa: novo / contato / integrando / membro */
const ETAPAS = [
  { id: 'novo', nome: 'Primeira visita', cor: 'var(--sand)' },
  { id: 'contato', nome: 'Em contato', cor: 'var(--amber)' },
  { id: 'integrando', nome: 'Integrando', cor: 'var(--clay)' },
  { id: 'membro', nome: 'Tornou-se membro', cor: 'var(--olive)' },
];

/* resposta: null = ainda não contatado · 'respondeu' · 'sem_resposta' (não respondeu o contato) */
const VISITANTES = [
  { id: 'v1', nome: 'Gabriel Souza', tel: '(11) 98123-0091', etapa: 'novo', visitou: '08 jun', resp: 'p8', due: 'Hoje', dueSt: 'soon', resposta: null,
    origem: 'Convite de membro', historico: [
      { when: '08 jun', txt: 'Primeira visita no culto da manhã. Veio com a esposa.', by: 'Recepção', ol: true },
    ] },
  { id: 'v2', nome: 'Larissa Pereira', tel: '(11) 99654-7781', etapa: 'novo', visitou: '08 jun', resp: 'p8', due: 'Amanhã', dueSt: 'ok', resposta: null,
    origem: 'Instagram', historico: [
      { when: '08 jun', txt: 'Chegou pela primeira vez. Preencheu o cartão de visitante.', by: 'Recepção', ol: true },
    ] },
  { id: 'v3', nome: 'Família Oliveira', tel: '(11) 98890-2234', etapa: 'contato', visitou: '01 jun', resp: 'p12', due: 'Atrasado 2d', dueSt: 'late', resposta: 'respondeu',
    origem: 'Indicação', historico: [
      { when: '01 jun', txt: 'Primeira visita. Casal com dois filhos pequenos.', by: 'Recepção', ol: false },
      { when: '03 jun', txt: 'WhatsApp de boas-vindas enviado. Responderam com interesse no Kids.', by: 'Fernanda Dias', ol: true },
    ] },
  { id: 'v4', nome: 'Rodrigo Alves', tel: '(11) 97712-8890', etapa: 'contato', visitou: '25 mai', resp: 'p2', due: 'Em 3 dias', dueSt: 'ok', resposta: 'sem_resposta',
    origem: 'Evangelismo', historico: [
      { when: '25 mai', txt: 'Veio pelo evangelismo da praça.', by: 'Recepção', ol: false },
      { when: '28 mai', txt: 'Ligação feita. Convidado para o café dos visitantes.', by: 'Paulo Tavares', ol: true },
    ] },
  { id: 'v5', nome: 'Vanessa Rocha', tel: '(11) 98445-6601', etapa: 'integrando', visitou: '04 mai', resp: 'p3', due: 'Em 5 dias', dueSt: 'ok', resposta: 'respondeu',
    origem: 'Convite de membro', historico: [
      { when: '04 mai', txt: 'Primeira visita.', by: 'Recepção', ol: false },
      { when: '11 mai', txt: 'Participou do almoço de integração.', by: 'Renata Lopes', ol: false },
      { when: '01 jun', txt: 'Entrou no GC da Vila Aurora. Demonstrou interesse em servir no Kids.', by: 'Renata Lopes', ol: true },
    ] },
  { id: 'v6', nome: 'Eduardo Pires', tel: '(11) 96678-1120', etapa: 'integrando', visitou: '20 abr', resp: 'p2', due: 'Sem pendência', dueSt: 'ok', resposta: 'respondeu',
    origem: 'Indicação', historico: [
      { when: '20 abr', txt: 'Chegou indicado por um amigo.', by: 'Recepção', ol: false },
      { when: '15 mai', txt: 'Concluiu o curso de novos convertidos.', by: 'Paulo Tavares', ol: true },
    ] },
  { id: 'v7', nome: 'Aline Costa', tel: '(11) 98012-4456', etapa: 'membro', visitou: '02 mar', resp: 'p3', due: 'Concluído', dueSt: 'ok', resposta: 'respondeu',
    origem: 'Instagram', historico: [
      { when: '02 mar', txt: 'Primeira visita.', by: 'Recepção', ol: false },
      { when: '06 jun', txt: 'Batizada. Tornou-se membro e entrou no time de Recepção.', by: 'Renata Lopes', ol: true },
    ] },
];

/* AVISOS / COMUNICAÇÃO */
const AVISOS = [
  { id: 'a1', titulo: 'Ensaio geral do louvor', para: 'Louvor & Adoração', when: 'sáb 14 jun · 16h', autor: 'Mariana Reis', txt: 'Ensaio completo no templo. Chegada 15h45 para passagem de som.' },
  { id: 'a2', titulo: 'Escala de junho publicada', para: 'Todos os times', when: 'há 2 dias', autor: 'Coordenação', txt: 'Confiram suas escalas e confirmem presença até quinta. Trocas só pelo app.' },
  { id: 'a3', titulo: 'Treinamento de novos voluntários', para: 'Recepção · Kids', when: 'dom 22 jun · 9h', autor: 'Paulo Tavares', txt: 'Encontro obrigatório para quem entrou nos últimos 60 dias.' },
];

/* MÉTRICAS DO PAINEL */
const METRICS = {
  voluntariosAtivos: 76, voluntariosDelta: 6,
  taxaConfirmacao: 82, confirmacaoDelta: 4,
  escalasSemana: 38, vagasAbertas: 7,
  visitantesAcomp: 14, visitantesDelta: 12,
  engajSerie: [62, 65, 61, 70, 68, 74, 72, 78, 75, 80, 79, 84, 82],
};

/* ════════════════════════════════════════════════════════════════
   GRUPOS DE COMUNHÃO (células / GCs)
   ════════════════════════════════════════════════════════════════ */
const GCS = [
  { id: 'gc1', nome: 'GC Vila Aurora', lider: 'p2', dia: 'Terça', hora: '20h', bairro: 'Vila Aurora' },
  { id: 'gc2', nome: 'GC Jardim Sul', lider: 'p7', dia: 'Quinta', hora: '20h', bairro: 'Jardim Sul' },
  { id: 'gc3', nome: 'GC Centro', lider: 'p14', dia: 'Quarta', hora: '19h30', bairro: 'Centro' },
  { id: 'gc4', nome: 'GC Jovens', lider: 'p5', dia: 'Sexta', hora: '20h', bairro: 'Centro' },
  { id: 'gc5', nome: 'GC Famílias', lider: 'p3', dia: 'Terça', hora: '19h30', bairro: 'Itaquera' },
];

/* ════════════════════════════════════════════════════════════════
   MEMBROS — congregação inteira (≠ Voluntários: nem todo membro serve)
   situacao: membro / novo (congregando foi removido)
   jornada: [Decisão, Batismo, Fundamentos, GC, Servindo]
   volId: vínculo com um voluntário (PESSOAS) quando serve
   ════════════════════════════════════════════════════════════════ */
const JORNADA = ['Decisão', 'Batismo', 'Fundamentos', 'GC', 'Servindo'];
const MEMBROS = [
  { id: 'm1', nome: 'Mariana Reis', tel: '(11) 98812-4471', email: 'mariana@cex.com', nasc: '12 mar', desde: '2021', situacao: 'membro', gc: 'gc3', bairro: 'Centro', familia: 'Reis', volId: 'p1', jornada: [1,1,1,1,1] },
  { id: 'm2', nome: 'Paulo Tavares', tel: '(11) 99640-1182', email: 'paulo@cex.com', nasc: '03 jul', desde: '2020', situacao: 'membro', gc: 'gc1', bairro: 'Vila Aurora', familia: 'Tavares', volId: 'p2', jornada: [1,1,1,1,1] },
  { id: 'm3', nome: 'Renata Lopes', tel: '(11) 98123-7755', email: 'renata@cex.com', nasc: '28 set', desde: '2019', situacao: 'membro', gc: 'gc5', bairro: 'Itaquera', familia: 'Lopes', volId: 'p3', jornada: [1,1,1,1,1] },
  { id: 'm4', nome: 'Diego Martins', tel: '(11) 97441-9023', email: 'diego@cex.com', nasc: '15 jan', desde: '2022', situacao: 'membro', gc: 'gc4', bairro: 'Centro', familia: 'Martins', volId: 'p4', jornada: [1,1,1,1,1] },
  { id: 'm5', nome: 'Lucas Andrade', tel: '(11) 96677-3320', email: 'lucas@cex.com', nasc: '09 jun', desde: '2023', situacao: 'membro', gc: 'gc4', bairro: 'Centro', familia: 'Andrade', volId: 'p5', jornada: [1,1,1,1,1] },
  { id: 'm6', nome: 'Beatriz Nunes', tel: '(11) 98890-5512', email: 'beatriz@cex.com', nasc: '21 nov', desde: '2023', situacao: 'membro', gc: 'gc4', bairro: 'Centro', familia: 'Nunes', volId: 'p6', jornada: [1,1,1,1,1] },
  { id: 'm7', nome: 'Sérgio Almeida', tel: '(11) 99012-7781', email: 'sergio@cex.com', nasc: '02 fev', desde: '2018', situacao: 'membro', gc: 'gc2', bairro: 'Jardim Sul', familia: 'Almeida', volId: 'p7', jornada: [1,1,1,1,1] },
  { id: 'm8', nome: 'Camila Souza', tel: '(11) 98445-1190', email: 'camila@cex.com', nasc: '17 ago', desde: '2024', situacao: 'membro', gc: 'gc1', bairro: 'Vila Aurora', familia: 'Souza', volId: 'p8', jornada: [1,1,1,0,1] },
  { id: 'm9', nome: 'Tiago Ferreira', tel: '(11) 97788-2240', email: 'tiago@cex.com', nasc: '30 abr', desde: '2022', situacao: 'membro', gc: 'gc4', bairro: 'Centro', familia: 'Ferreira', volId: 'p9', jornada: [1,1,1,1,1] },
  { id: 'm10', nome: 'Juliana Castro', tel: '(11) 98334-6612', email: 'juliana@cex.com', nasc: '06 dez', desde: '2023', situacao: 'membro', gc: 'gc5', bairro: 'Itaquera', familia: 'Castro', volId: 'p10', jornada: [1,1,1,1,1] },
  { id: 'm11', nome: 'André Pinto', tel: '(11) 96120-8834', email: 'andre@cex.com', nasc: '24 mai', desde: '2021', situacao: 'membro', gc: 'gc3', bairro: 'Centro', familia: 'Pinto', volId: 'p11', jornada: [1,1,1,1,1] },
  { id: 'm12', nome: 'Fernanda Dias', tel: '(11) 98567-1123', email: 'fernanda@cex.com', nasc: '11 out', desde: '2024', situacao: 'membro', gc: 'gc1', bairro: 'Vila Aurora', familia: 'Dias', volId: 'p12', jornada: [1,1,0,1,1] },
  { id: 'm13', nome: 'Marcos Vieira', tel: '(11) 97233-4456', email: 'marcos@cex.com', nasc: '19 jul', desde: '2020', situacao: 'membro', gc: 'gc3', bairro: 'Centro', familia: 'Vieira', volId: 'p13', jornada: [1,1,1,1,0] },
  { id: 'm14', nome: 'Cleusa Moraes', tel: '(11) 99800-1245', email: 'cleusa@cex.com', nasc: '08 set', desde: '2015', situacao: 'membro', gc: 'gc3', bairro: 'Centro', familia: 'Moraes', volId: 'p14', jornada: [1,1,1,1,1] },
  { id: 'm15', nome: 'Rafael Gomes', tel: '(11) 98090-3367', email: 'rafael@cex.com', nasc: '02 mar', desde: '2023', situacao: 'membro', gc: 'gc2', bairro: 'Jardim Sul', familia: 'Gomes', volId: 'p15', jornada: [1,1,1,1,1] },
  { id: 'm16', nome: 'Patrícia Lima', tel: '(11) 97455-9981', email: 'patricia@cex.com', nasc: '14 jun', desde: '2022', situacao: 'membro', gc: 'gc5', bairro: 'Itaquera', familia: 'Lima', volId: 'p16', jornada: [1,1,1,1,1] },
  { id: 'm17', nome: 'Helena Castro', tel: '(11) 98221-7740', email: 'helena@cex.com', nasc: '27 jan', desde: '2019', situacao: 'membro', gc: 'gc3', bairro: 'Centro', familia: 'Castro', volId: null, jornada: [1,1,1,1,0] },
  { id: 'm18', nome: 'Roberto Dias', tel: '(11) 99334-8821', email: 'roberto@cex.com', nasc: '05 abr', desde: '2021', situacao: 'membro', gc: 'gc1', bairro: 'Vila Aurora', familia: 'Dias', volId: null, jornada: [1,1,1,0,0] },
  { id: 'm19', nome: 'Sandra Vieira', tel: '(11) 98112-3390', email: 'sandra@cex.com', nasc: '16 nov', desde: '2018', situacao: 'membro', gc: 'gc3', bairro: 'Centro', familia: 'Vieira', volId: null, jornada: [1,1,1,1,0] },
  { id: 'm20', nome: 'Otávio Ramos', tel: '(11) 97009-4412', email: 'otavio@cex.com', nasc: '23 fev', desde: '2024', situacao: 'membro', gc: 'gc2', bairro: 'Jardim Sul', familia: 'Ramos', volId: null, jornada: [1,0,1,1,0] },
  { id: 'm21', nome: 'Bianca Melo', tel: '(11) 98778-1102', email: 'bianca@cex.com', nasc: '08 ago', desde: '2025', situacao: 'novo', gc: 'gc4', bairro: 'Centro', familia: 'Melo', volId: null, jornada: [1,0,0,1,0] },
  { id: 'm22', nome: 'Jorge Antunes', tel: '(11) 99445-2018', email: 'jorge@cex.com', nasc: '12 dez', desde: '2020', situacao: 'membro', gc: 'gc2', bairro: 'Jardim Sul', familia: 'Antunes', volId: null, jornada: [1,1,1,0,0] },
  { id: 'm23', nome: 'Marta Figueiredo', tel: '(11) 98556-7731', email: 'marta@cex.com', nasc: '01 mai', desde: '2017', situacao: 'membro', gc: 'gc5', bairro: 'Itaquera', familia: 'Figueiredo', volId: null, jornada: [1,1,1,1,0] },
  { id: 'm24', nome: 'Vitor Hugo', tel: '(11) 97220-9985', email: 'vitor@cex.com', nasc: '19 mar', desde: '2024', situacao: 'membro', gc: 'gc4', bairro: 'Centro', familia: 'Hugo', volId: null, jornada: [1,1,0,1,0] },
  { id: 'm25', nome: 'Daniela Prado', tel: '(11) 98990-3344', email: 'daniela@cex.com', nasc: '07 jul', desde: '2025', situacao: 'novo', gc: 'gc5', bairro: 'Itaquera', familia: 'Prado', volId: null, jornada: [1,0,0,0,0] },
  { id: 'm26', nome: 'Caio Bernardes', tel: '(11) 99112-6650', email: 'caio@cex.com', nasc: '25 out', desde: '2024', situacao: 'membro', gc: 'gc1', bairro: 'Vila Aurora', familia: 'Bernardes', volId: null, jornada: [1,0,1,1,0] },
  { id: 'm27', nome: 'Luana Teixeira', tel: '(11) 98334-1197', email: 'luana@cex.com', nasc: '13 set', desde: '2025', situacao: 'novo', gc: 'gc4', bairro: 'Centro', familia: 'Teixeira', volId: null, jornada: [1,0,0,1,0] },
  { id: 'm28', nome: 'Osvaldo Pinto', tel: '(11) 97881-2204', email: 'osvaldo@cex.com', nasc: '04 jun', desde: '2014', situacao: 'membro', gc: 'gc3', bairro: 'Centro', familia: 'Pinto', volId: null, jornada: [1,1,1,1,0] },
];

/* ════════════════════════════════════════════════════════════════
   BEM-ESTAR — sinais manuais que ajustam o termômetro (resto é calculado)
   nivel: saudavel / atencao / sobrecarga / afastando
   ════════════════════════════════════════════════════════════════ */
const SINAIS = {
  p1: { nota: 'Escalada em 3 dos 4 cultos da semana. Acompanhar carga.' },
  p13: { nota: 'Em pausa há 5 semanas. Sem responder convites.' },
  p8: { nota: 'Entrou há pouco, primeira vez escalada sozinha.' },
};

/* ════════════════════════════════════════════════════════════════
   RELATÓRIOS — séries e indicadores agregados
   ════════════════════════════════════════════════════════════════ */
const REL = {
  membrosTotal: 312, membrosDelta: 8, novosMes: 11, novosDelta: 3,
  retencaoVisit: 64, retencaoDelta: 9, coberturaEscala: 88, coberturaDelta: 5,
  freqMedia: 217, freqDelta: 6,
  crescimento: [248, 256, 261, 268, 270, 277, 283, 289, 294, 301, 305, 312],
  meses: ['jul','ago','set','out','nov','dez','jan','fev','mar','abr','mai','jun'],
};

/* ════════════════════════════════════════════════════════════════
   MURAL — comunicação em timeline (feed interno dos times)
   ════════════════════════════════════════════════════════════════ */
const MURAL = [
  { id: 'mu1', autor: 'Coordenação', when: 'há 3 h', para: 'Todos os times', fixado: true,
    txt: 'Escala de junho publicada. Confirmem presença até quinta pelo app. Trocas só pelo aplicativo, sem combinar por fora.', react: 24, lidos: 71, total: 76, canal: ['app','push'] },
  { id: 'mu2', autor: 'Mariana Reis', when: 'há 6 h', para: 'Louvor & Adoração', fixado: false,
    txt: 'Ensaio geral sábado 16h no templo. Chegada 15h45 para passagem de som. Quem não puder, avisa aqui.', react: 9, lidos: 12, total: 14, canal: ['app'] },
  { id: 'mu3', autor: 'Renata Lopes', when: 'ontem', para: 'CE.X Kids', fixado: false,
    txt: 'Treinamento de novos professores domingo às 9h. Material novo do trimestre já está na sala.', react: 7, lidos: 15, total: 18, canal: ['app','push'] },
  { id: 'mu4', autor: 'Paulo Tavares', when: 'há 2 dias', para: 'Recepção & Acolhida', fixado: false,
    txt: 'Lembrete: café dos visitantes neste domingo após o culto da manhã. Recepção fica responsável por receber.', react: 5, lidos: 9, total: 11, canal: ['app'] },
];

/* ════════════════════════════════════════════════════════════════
   IGREJA — cadastro & configuração (Configurações)
   ════════════════════════════════════════════════════════════════ */
const IGREJA = {
  nome: 'CE.X · Campus Expansão', responsavel: 'Pr. Daniel Expansão',
  doc: '12.345.678/0001-90', fundada: '2014',
  endereco: 'Av. das Nações, 1200 · Centro', cidade: 'São Paulo · SP', cep: '01000-000',
  email: 'contato@campusexpansao.com', tel: '(11) 4000-1200',
  horarios: ['Domingo 10h', 'Domingo 19h', 'Quarta 20h'],
};

/* PAPÉIS & PERMISSÕES — matriz (Configurações) */
const PERMISSOES = {
  papeis: [
    { id: 'pastor', nome: 'Pastor / Direção', desc: 'Acesso total à rede' },
    { id: 'coord', nome: 'Coordenador', desc: 'Gestão de várias áreas' },
    { id: 'lider', nome: 'Líder de time', desc: 'Seu ministério e escala' },
    { id: 'vol', nome: 'Voluntário', desc: 'App: escala e disponibilidade' },
  ],
  acoes: [
    { id: 'painel', nome: 'Ver painel & relatórios' },
    { id: 'membros', nome: 'Gerir membros' },
    { id: 'escala', nome: 'Montar & publicar escalas' },
    { id: 'comunica', nome: 'Enviar comunicação' },
    { id: 'igreja', nome: 'Configurar a igreja' },
    { id: 'rede', nome: 'Gerir multi-congregação' },
  ],
  /* matriz[papel][acao] = true/false */
  matriz: {
    pastor: { painel: true, membros: true, escala: true, comunica: true, igreja: true, rede: true },
    coord:  { painel: true, membros: true, escala: true, comunica: true, igreja: false, rede: false },
    lider:  { painel: true, membros: false, escala: true, comunica: true, igreja: false, rede: false },
    vol:    { painel: false, membros: false, escala: false, comunica: false, igreja: false, rede: false },
  },
};

/* ── ESPAÇOS / SALAS e RESERVAS ───────────────────────────────────
   Salas físicas da igreja (com capacidade). Reuniões, eventos,
   treinamentos, cursos e ensaios reservam um espaço — sem conflito
   de horário no mesmo dia. */
const SALAS = [
  { id: 's-templo', nome: 'Templo principal', capacidade: 400, local: 'Térreo', recursos: ['Som', 'Projeção', 'Palco'] },
  { id: 's-anexo', nome: 'Anexo / Salão', capacidade: 120, local: 'Anexo', recursos: ['Som', 'Cadeiras'] },
  { id: 's-sala1', nome: 'Sala 1', capacidade: 20, local: '1º andar', recursos: ['TV', 'Mesa'] },
  { id: 's-sala2', nome: 'Sala 2', capacidade: 30, local: '1º andar', recursos: ['Piano', 'Cadeiras'] },
  { id: 's-kids', nome: 'Espaço Kids', capacidade: 40, local: 'Térreo', recursos: ['Tapete', 'Brinquedos'] },
];

const RESERVAS = [
  { id: 'rs1', sala: 's-templo', titulo: 'Ensaio do Louvor', tipo: 'ensaio', data: '28 jun', inicio: '16h00', fim: '18h00', origem: { tipo: 'ensaio', id: 'e1' } },
  { id: 'rs2', sala: 's-sala2', titulo: 'Alinhamento de Louvor & Mídia', tipo: 'reuniao', data: '02 jul', inicio: '20h00', fim: '21h30', origem: { tipo: 'reuniao', id: 'r1' } },
  { id: 'rs3', sala: 's-anexo', titulo: 'Treinamento de voluntários', tipo: 'treinamento', data: '22 jun', inicio: '09h00', fim: '12h00', origem: null },
  { id: 'rs4', sala: 's-sala1', titulo: 'Escola de Líderes · Turma 1', tipo: 'curso', data: '24 jun', inicio: '19h30', fim: '21h30', origem: null },
  { id: 'rs5', sala: 's-templo', titulo: 'Culto de Oração', tipo: 'evento', data: '18 jun', inicio: '20h00', fim: '21h30', origem: { tipo: 'culto', id: 'c3' } },
];

window.SVC = { CONGREGACOES, TIMES, PESSOAS, CULTOS, ESCALAS, ETAPAS, VISITANTES, AVISOS, METRICS,
  GCS, JORNADA, MEMBROS, SINAIS, REL, MURAL, IGREJA, PERMISSOES, SALAS, RESERVAS };

/* ── helpers de reserva / conflito ── */
(function () {
  const S = window.SVC;
  const TIPOS_RESERVA = { reuniao: 'Reunião', evento: 'Evento', treinamento: 'Treinamento', curso: 'Curso', ensaio: 'Ensaio', outro: 'Outro' };
  const toMin = (h) => { const m = String(h || '').match(/(\d{1,2})[h:](\d{0,2})/); return m ? (+m[1]) * 60 + (+(m[2] || 0)) : null; };
  S.TIPOS_RESERVA = TIPOS_RESERVA;
  S.salaById = (id) => (S.SALAS || []).find((x) => x.id === id) || null;
  S.reservasDaSala = (id) => (S.RESERVAS || []).filter((r) => r.sala === id);
  S.reservasNoDia = (data) => (S.RESERVAS || []).filter((r) => r.data === data);
  /* conflito: mesma sala, mesmo dia, faixas de horário que se sobrepõem */
  S.conflitoReserva = ({ sala, data, inicio, fim }, ignoreId) => {
    const a0 = toMin(inicio), a1 = toMin(fim);
    return (S.RESERVAS || []).find((r) => {
      if (r.id === ignoreId || r.sala !== sala || r.data !== data) return false;
      const b0 = toMin(r.inicio), b1 = toMin(r.fim);
      if (a0 == null || a1 == null || b0 == null || b1 == null) return false;
      return a0 < b1 && b0 < a1; // sobreposição
    }) || null;
  };
  S.reservar = (res) => {
    const conflito = S.conflitoReserva(res);
    if (conflito) return { ok: false, conflito };
    const r = Object.assign({ id: (window.cexId ? window.cexId('rs') : 'rs-' + Date.now()), tipo: 'outro', origem: null }, res);
    S.RESERVAS.push(r);
    window.cexRefresh && window.cexRefresh();
    return { ok: true, reserva: r };
  };
})();
