/* CE.X Service · Avaliação de Experiência — dados mock (localStorage) */
const CEX_SURVEYS_KEY = 'cex_service_surveys_v1';

/* ── Cada contexto (Service / Site de materiais) tem suas próprias
   especificidades de segmentação e disparo — não são os mesmos eixos. ── */
const PAPEIS_SERVICE = ['Master', 'Líder', 'Membro'];
const PAPEIS_SITE = ['Líder', 'Aluno', 'Equipe'];
function papeisFor(contexto) { return contexto === 'site' ? PAPEIS_SITE : PAPEIS_SERVICE; }

const TIMES_SERVICE = ['Louvor', 'Recepção', 'Kids', 'Mídia', 'Diaconia', 'Intercessão'];

/* segmentação: eixo extra além de todos/papel/lista muda por contexto */
const SEG_MODES_SERVICE = [
  { key: 'todos', label: 'Todos os usuários', hint: 'Qualquer pessoa cadastrada no Service.' },
  { key: 'papel', label: 'Por papel', hint: 'Master, líder ou membro.' },
  { key: 'time', label: 'Por time/ministério', hint: 'Só quem serve num time específico (Louvor, Kids...).' },
  { key: 'lista', label: 'Lista manual', hint: 'E-mails específicos, um por linha.' },
];
const SEG_MODES_SITE = [
  { key: 'todos', label: 'Todos os usuários', hint: 'Qualquer visitante autenticado no site.' },
  { key: 'papel', label: 'Por papel', hint: 'Líder, aluno ou equipe interna.' },
  { key: 'estante', label: 'Por estante ou curso', hint: 'Só quem acessou uma estante/curso específico.' },
  { key: 'lista', label: 'Lista manual', hint: 'E-mails específicos, um por linha.' },
];
function segModesFor(contexto) { return contexto === 'site' ? SEG_MODES_SITE : SEG_MODES_SERVICE; }

/* disparo: cada contexto tem um gatilho de comportamento próprio,
   além de livre/periódica/campanha */
const DISPARO_MODES_SERVICE = [
  { key: 'livre', label: 'Livre', hint: 'Sempre disponível pelo atalho na Início do app.' },
  { key: 'periodica', label: 'Periódica', hint: 'Reaparece a cada X dias até responder.' },
  { key: 'posescala', label: 'Pós-escala', hint: 'Dispara N horas depois da pessoa confirmar presença numa escala.' },
  { key: 'campanha', label: 'Campanha', hint: 'Pop-up único quando você clicar em "Emitir agora".' },
];
const DISPARO_MODES_SITE = [
  { key: 'livre', label: 'Livre', hint: 'Sempre disponível pelo botão fixo no site.' },
  { key: 'periodica', label: 'Periódica', hint: 'Reaparece a cada X dias até responder.' },
  { key: 'posdownload', label: 'Pós-download', hint: 'Dispara logo depois da pessoa baixar um material.' },
  { key: 'campanha', label: 'Campanha', hint: 'Pop-up único quando você clicar em "Emitir agora".' },
];
function disparoModesFor(contexto) { return contexto === 'site' ? DISPARO_MODES_SITE : DISPARO_MODES_SERVICE; }

/* tipo de pergunta → ícone real da biblioteca (icons.jsx) */
const QUESTION_ICON = { nota: 'estrela', texto: 'conversas', emoji: 'reacao', multipla: 'quadros', simnao: 'decisoes' };
const QUESTION_LABEL = { nota: 'Nota (NPS/escala)', texto: 'Texto livre', emoji: 'Reação', multipla: 'Múltipla escolha', simnao: 'Sim / Não' };
const REACOES = ['Ótimo', 'Bom', 'Neutro', 'Ruim', 'Péssimo'];

function cexUid(p) { return `${p}-${Math.random().toString(36).slice(2, 8)}`; }
function cexRandDate(daysBack) { const d = new Date(); d.setDate(d.getDate() - Math.floor(Math.random() * daysBack)); return d.toISOString().slice(0, 10); }

function cexMockValor(q) {
  if (q.tipo === 'nota') { const max = q.escala || 10; const r = Math.random(); return r < 0.6 ? Math.round(max * 0.8 + Math.random() * max * 0.2) : Math.round(Math.random() * max); }
  if (q.tipo === 'emoji') return REACOES[Math.random() < 0.55 ? 0 : Math.floor(Math.random() * REACOES.length)];
  if (q.tipo === 'simnao') return Math.random() < 0.78 ? 'Sim' : 'Não';
  if (q.tipo === 'multipla') return q.opcoes[Math.floor(Math.random() * q.opcoes.length)];
  const pool = ['Mais clareza na escala do mês.', 'Gostaria de mais apoio do meu líder direto.', 'Está ótimo, só manter o ritmo.', 'Poderia avisar as trocas com mais antecedência.', 'Faltou combinar melhor os horários de ensaio.'];
  return pool[Math.floor(Math.random() * pool.length)];
}
function cexMockRespostas(perguntas, n, contexto) {
  const papeis = papeisFor(contexto);
  const out = [];
  for (let i = 0; i < n; i++) out.push({ id: cexUid('r'), papel: papeis[Math.floor(Math.random() * papeis.length)], data: cexRandDate(60), respostasPerguntas: perguntas.map((q) => ({ perguntaId: q.id, valor: cexMockValor(q) })) });
  return out;
}

function cexSeedSurveys() {
  const s1 = [
    { id: 'q1', tipo: 'nota', escala: 10, texto: 'De 0 a 10, o quanto você indicaria servir na CE.X para outro voluntário?' },
    { id: 'q2', tipo: 'texto', texto: 'O que faria você dar uma nota mais alta?' },
  ];
  const s2 = [
    { id: 'q1', tipo: 'emoji', texto: 'Como você se sente sobre a escala deste mês?' },
    { id: 'q2', tipo: 'multipla', texto: 'O que mais pesa na sua função hoje?', opcoes: ['Frequência de escala', 'Comunicação do time', 'Suporte do líder', 'Horário dos encontros'] },
    { id: 'q3', tipo: 'simnao', texto: 'Você se sente apoiado pelo seu líder direto?' },
  ];
  const s3 = [{ id: 'q1', tipo: 'nota', escala: 5, texto: 'Nota de 1 a 5 para sua experiência servindo este mês' }];
  const s4 = [
    { id: 'q1', tipo: 'nota', escala: 10, texto: 'De 0 a 10, o quanto você indicaria a CE.X para outro líder?' },
    { id: 'q2', tipo: 'texto', texto: 'O que faria você dar uma nota mais alta?' },
  ];
  return [
    { id: 'sv-001', nome: 'NPS geral de quem serve', contexto: 'service', status: 'ativa', perguntas: s1, segmentacao: { modo: 'todos', valores: [] }, disparo: { modo: 'livre', ativoComoLivre: true, intervaloDias: null, horasDepois: null }, criadoEm: '2026-06-02', respostas: cexMockRespostas(s1, 41, 'service') },
    { id: 'sv-002', nome: 'Pulso do time de Louvor', contexto: 'service', status: 'ativa', perguntas: s2, segmentacao: { modo: 'time', valores: ['Louvor'] }, disparo: { modo: 'posescala', ativoComoLivre: false, intervaloDias: null, horasDepois: 3 }, criadoEm: '2026-06-20', respostas: cexMockRespostas(s2, 26, 'service') },
    { id: 'sv-003', nome: 'Pulso mensal de bem-estar', contexto: 'service', status: 'ativa', perguntas: s3, segmentacao: { modo: 'papel', valores: ['Membro'] }, disparo: { modo: 'periodica', ativoComoLivre: false, intervaloDias: 30, horasDepois: null }, criadoEm: '2026-05-10', respostas: cexMockRespostas(s3, 96, 'service') },
    { id: 'sv-004', nome: 'NPS geral do site de materiais', contexto: 'site', status: 'ativa', perguntas: s4, segmentacao: { modo: 'todos', valores: [] }, disparo: { modo: 'livre', ativoComoLivre: true, intervaloDias: null, horasDepois: null }, criadoEm: '2026-06-05', respostas: cexMockRespostas(s4, 34, 'site') },
  ];
}
function cexLoadSurveys() {
  const raw = localStorage.getItem(CEX_SURVEYS_KEY);
  if (!raw) { const seed = cexSeedSurveys(); localStorage.setItem(CEX_SURVEYS_KEY, JSON.stringify(seed)); return seed; }
  try { return JSON.parse(raw); } catch (e) { return []; }
}
function cexSaveSurveys(list) { localStorage.setItem(CEX_SURVEYS_KEY, JSON.stringify(list)); }
