/* ════════════════════════════════════════════════════════════════
   CE.X SERVICE · QUADROS (Kanban) — dados
   Quadros simples por time/projeto. Cards com responsáveis, prazo,
   prioridade, comentários e atividades. Responsabilidades das
   Reuniões viram cards aqui (vínculo origem).
   Permissões adaptadas aos 4 papéis: Master/Pastor/Líder/Voluntário.
   ════════════════════════════════════════════════════════════════ */
(function () {
  const S = window.SVC;

  /* colunas padrão de um quadro novo */
  const COLUNAS_PADRAO = [
    { id: 'todo', nome: 'A fazer' },
    { id: 'doing', nome: 'Em andamento' },
    { id: 'review', nome: 'Validar' },
    { id: 'done', nome: 'Concluído' },
  ];

  const PRIORIDADES = {
    alta: { l: 'Alta', c: 'no' },
    media: { l: 'Média', c: 'wait' },
    baixa: { l: 'Baixa', c: 'neutral' },
  };

  /* dias sem mover = "parado" */
  const PARADO_DIAS = 7;

  /* ── QUADROS ──────────────────────────────────────────────────────
     escopo: 'time' (liderança do time) ou 'geral' (liderança).
     time: id do ministério dono (ou null p/ geral). */
  const BOARDS = [
    { id: 'bd-louvor', nome: 'Louvor & Adoração', escopo: 'time', time: 'louvor', desc: 'Tarefas e produção do time de louvor.', colunas: COLUNAS_PADRAO.slice() },
    { id: 'bd-lideres', nome: 'Liderança · Ciclo 2026', escopo: 'geral', time: null, desc: 'Metas e ações da liderança no ano.', colunas: COLUNAS_PADRAO.slice() },
  ];

  /* ── CARDS ────────────────────────────────────────────────────────
     col: id da coluna · resp: ids de pessoas · prazo: 'DD mmm' | ''
     prio: alta|media|baixa · origem: {tipo:'reuniao', id, titulo} | null
     movedAt: dias atrás que mudou de coluna (mock p/ "parado")
     comments: [{autor, txt, when}] · activity: [{txt, when}] */
  const CARDS = [
    { id: 'k1', board: 'bd-louvor', col: 'doing', titulo: 'Definir repertório de julho', desc: 'Escolher 8 músicas e enviar cifras para a equipe.', resp: ['p1'], prazo: '05 jul', prio: 'alta', origem: null, movedAt: 2,
      comments: [{ autor: 'Mariana Reis', txt: 'Já separei 5, faltam 3.', when: 'ontem' }],
      activity: [{ txt: 'Card criado', when: '3 dias atrás' }, { txt: 'Movido para Em andamento', when: '2 dias atrás' }] },
    { id: 'k2', board: 'bd-louvor', col: 'todo', titulo: 'Revisar passagem de som', desc: 'Checar microfones e retornos antes do culto.', resp: ['p2'], prazo: '06 jul', prio: 'media', origem: null, movedAt: 1,
      comments: [], activity: [{ txt: 'Card criado', when: '1 dia atrás' }] },
    { id: 'k3', board: 'bd-louvor', col: 'todo', titulo: 'Escala de feriados', desc: '', resp: ['p1'], prazo: '', prio: 'baixa', origem: null, movedAt: 9,
      comments: [], activity: [{ txt: 'Card criado', when: '9 dias atrás' }] },
    { id: 'k4', board: 'bd-louvor', col: 'done', titulo: 'Comprar cordas de violão', desc: '', resp: ['p13'], prazo: '20 jun', prio: 'media', origem: null, movedAt: 4,
      comments: [], activity: [{ txt: 'Concluído', when: '4 dias atrás' }] },
    /* liderança — alguns vindos de responsabilidades de reunião */
    { id: 'k5', board: 'bd-lideres', col: 'doing', titulo: 'Revisar escala de férias de julho', desc: 'Garantir cobertura em todos os times.', resp: ['p1'], prazo: '08 jul', prio: 'alta', origem: { tipo: 'reuniao', id: 'r2', titulo: 'Reunião de líderes' }, movedAt: 3,
      comments: [], activity: [{ txt: 'Criado a partir da reunião de líderes', when: '6 dias atrás' }] },
    { id: 'k6', board: 'bd-lideres', col: 'todo', titulo: 'Visitar GCs da zona leste', desc: 'Conhecer os novos grupos e líderes.', resp: ['p7'], prazo: '15 jul', prio: 'media', origem: { tipo: 'reuniao', id: 'r2', titulo: 'Reunião de líderes' }, movedAt: 6,
      comments: [], activity: [{ txt: 'Criado a partir da reunião de líderes', when: '6 dias atrás' }] },
    { id: 'k7', board: 'bd-lideres', col: 'done', titulo: 'Abrir inscrições da Escola de Líderes', desc: '', resp: ['p3'], prazo: '01 jul', prio: 'alta', origem: { tipo: 'reuniao', id: 'r2', titulo: 'Reunião de líderes' }, movedAt: 1,
      comments: [], activity: [{ txt: 'Concluído', when: '1 dia atrás' }] },
  ];

  /* ── PERMISSÕES adaptadas aos papéis existentes ───────────────────
     Reaproveita PAPEIS_V2 (master/pastor/lider/vol). Mapeamento:
       master  → admin_master (tudo, em todos os quadros)
       pastor  → team_admin   (cria/edita quadros e cards)
       lider   → team_admin   (idem, foco no seu time)
       vol     → member       (mexe nos cards onde é responsável; comenta)
     viewer é derivado: quem não tem vínculo só visualiza. */
  const KANBAN_PERMS = {
    master: { nivel: 'admin_master', criarBoard: true, editarBoard: true, criarCard: true, moverQualquer: true, comentar: true },
    pastor: { nivel: 'team_admin', criarBoard: true, editarBoard: true, criarCard: true, moverQualquer: true, comentar: true },
    lider: { nivel: 'team_admin', criarBoard: true, editarBoard: true, criarCard: true, moverQualquer: true, comentar: true },
    vol: { nivel: 'member', criarBoard: false, editarBoard: false, criarCard: true, moverQualquer: false, comentar: true },
  };

  /* helpers */
  const cardsDoBoard = (bid) => CARDS.filter((c) => c.board === bid);
  const isAtrasado = (card) => {
    if (!card.prazo || card.col === 'done') return false;
    return window.SVC.prazoVencido ? window.SVC.prazoVencido(card.prazo) : false;
  };
  const isParado = (card) => card.col !== 'done' && (card.movedAt || 0) >= PARADO_DIAS;

  Object.assign(S, { COLUNAS_PADRAO, PRIORIDADES, PARADO_DIAS, BOARDS, CARDS, KANBAN_PERMS, cardsDoBoard, isAtrasado, isParado });
})();
