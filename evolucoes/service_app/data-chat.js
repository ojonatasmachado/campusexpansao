/* ════════════════════════════════════════════════════════════════
   CE.X SERVICE · CONVERSAS (chat) — dados
   Conversas do time (canal por ministério), grupos e mensagens diretas
   (líder ↔ membro). Mesmo array alimenta o painel (líder) e o app do
   membro: o que um envia, o outro vê. Estado em memória (protótipo).
   autor de cada mensagem = id de membro (mNN). Líderes são membros.
   ════════════════════════════════════════════════════════════════ */
(function () {
  const S = window.SVC;

  /* líder (membro) de cada time — espelha PESSOAS.lider */
  const LIDER_TIME = { louvor: 'm1', recepcao: 'm2', kids: 'm3', midia: 'm4', diaconia: 'm7', intercessao: 'm14' };
  S.liderDoTime = (tid) => LIDER_TIME[tid] || null;

  /* membros (ids) de um time, via vínculo de voluntário */
  S.membrosDoTime = (tid) => (S.PESSOAS || [])
    .filter((p) => p.times.includes(tid))
    .map((p) => { const m = (S.MEMBROS || []).find((x) => x.volId === p.id); return m ? m.id : null; })
    .filter(Boolean);

  /* ── CONVERSAS ────────────────────────────────────────────────────
     tipo: 'time' (canal do ministério) · 'grupo' (recorte) · 'dm' (1:1)
     timeId: dono (time/grupo) · membros: ids · msgs: [{de, txt, when}] */
  const CHATS = [
    { id: 'ch-louvor', tipo: 'time', timeId: 'louvor', nome: 'Louvor & Adoração', membros: ['m1', 'm5', 'm6', 'm9', 'm13'],
      msgs: [
        { de: 'm1', txt: 'Equipe, repertório de domingo já está no ensaio. Deem uma olhada antes de sábado 🙏', when: 'ontem 18:40' },
        { de: 'm5', txt: 'Fechado, Mari. Já comecei a treinar a terceira.', when: 'ontem 19:02' },
        { de: 'm9', txt: 'Bateria pronta. Chego 15h45 pra passagem.', when: 'ontem 19:15' },
      ] },
    { id: 'ch-recepcao', tipo: 'time', timeId: 'recepcao', nome: 'Recepção & Acolhida', membros: ['m2', 'm8', 'm12', 'm16'],
      msgs: [
        { de: 'm2', txt: 'Domingo teremos café dos visitantes após o culto da manhã. Quem fica no apoio?', when: 'há 2 dias' },
        { de: 'm8', txt: 'Eu fico! Já separo as fichas.', when: 'há 2 dias' },
      ] },
    { id: 'ch-lideres', tipo: 'grupo', timeId: null, nome: 'Líderes · Direção', membros: ['direcao', 'm1', 'm2', 'm3', 'm4', 'm7', 'm14'],
      msgs: [
        { de: 'm3', txt: 'Reunião de líderes confirmada terça 19h30. Levem o balanço do mês.', when: 'há 3 dias' },
        { de: 'm1', txt: 'Anotado. Vou com as pendências do louvor.', when: 'há 3 dias' },
        { de: 'm7', txt: 'Diaconia ok. Só preciso fechar a escala de ofertas.', when: 'há 2 dias' },
      ] },
    { id: 'ch-dm-m1-m5', tipo: 'dm', timeId: 'louvor', nome: null, membros: ['m1', 'm5'],
      msgs: [
        { de: 'm1', txt: 'Lucas, consegue cobrir a noite de domingo no violão?', when: 'ontem 20:10' },
        { de: 'm5', txt: 'Consigo sim! Pode marcar.', when: 'ontem 20:22' },
        { de: 'm1', txt: 'Perfeito, já te coloquei na escala. Obrigada!', when: 'ontem 20:25' },
      ] },
    { id: 'ch-dm-m2-m8', tipo: 'dm', timeId: 'recepcao', nome: null, membros: ['m2', 'm8'],
      msgs: [
        { de: 'm8', txt: 'Paulo, tenho uma dúvida sobre o cartão do visitante novo.', when: 'há 2 dias' },
        { de: 'm2', txt: 'Claro! Me chama depois do culto que te mostro.', when: 'há 2 dias' },
      ] },
  ];

  /* conversas visíveis para um MEMBRO (app do membro):
     canais dos times dele + grupos/dms em que participa */
  S.chatsDoMembro = (mid) => CHATS.filter((c) => (c.membros || []).includes(mid));

  /* identidade da PERSPECTIVA atual como participante de conversa */
  S.viewerMid = () => {
    const v = window.cexView ? window.cexView() : { papel: 'master' };
    return v.papel === 'lider' ? (S.liderDoTime(v.timeId) || 'direcao') : 'direcao';
  };

  /* PRIVACIDADE: só os envolvidos veem uma conversa — inclusive a Direção.
     A perspectiva só enxerga conversas das quais participa. */
  S.chatsDaView = () => {
    const eu = S.viewerMid();
    return CHATS.filter((c) => (c.membros || []).includes(eu));
  };

  S.enviarMsg = (chatId, de, txt) => {
    const c = CHATS.find((x) => x.id === chatId); if (!c || !txt.trim()) return;
    c.msgs.push({ de, txt: txt.trim(), when: 'agora' });
    window.cexRefresh && window.cexRefresh();
  };

  /* cria uma conversa nova (líder inicia) — individual ou grupo */
  S.novaConversa = ({ tipo, nome, membros, timeId }) => {
    const id = (window.cexId ? window.cexId('ch') : 'ch-' + Date.now());
    const c = { id, tipo: tipo || (membros.length > 2 ? 'grupo' : 'dm'), timeId: timeId || null, nome: nome || null, membros, msgs: [] };
    CHATS.unshift(c);
    window.cexRefresh && window.cexRefresh();
    return c;
  };

  /* nome de exibição de uma conversa para um observador (mid) */
  S.chatNome = (c, eu) => {
    if (c.nome) return c.nome;
    if (c.tipo === 'dm') {
      const outro = (c.membros || []).find((m) => m !== eu) || c.membros[0];
      const mm = (S.MEMBROS || []).find((x) => x.id === outro);
      return mm ? mm.nome : 'Conversa';
    }
    return 'Conversa';
  };

  Object.assign(S, { CHATS, LIDER_TIME });

  /* ── REPERTÓRIO / SETLIST do louvor por evento ─────────────────────
     O time de louvor adiciona os louvores na escala; o cronograma
     reflete automaticamente (etapas da categoria "louvor").
     Cada louvor: { titulo, tom, youtube, cifra }. A ordem é a posição. */
  const SETLISTS = {
    c1: [
      { titulo: 'Bondade de Deus', tom: 'G', youtube: 'https://youtu.be/', cifra: 'https://www.cifraclub.com.br/' },
      { titulo: 'Teu amor não falha', tom: 'A', youtube: '', cifra: '' },
      { titulo: 'Santo para sempre', tom: 'C', youtube: '', cifra: '' },
      { titulo: 'Tua graça me basta', tom: 'D', youtube: '', cifra: '' },
    ],
  };
  S.setlist = (cid) => (SETLISTS[cid] ||= []);
  S.addLouvor = (cid, song) => { S.setlist(cid).push(song); window.cexRefresh && window.cexRefresh(); };
  S.remLouvor = (cid, i) => { S.setlist(cid).splice(i, 1); window.cexRefresh && window.cexRefresh(); };
  S.moveLouvor = (cid, i, dir) => { const l = S.setlist(cid); const j = i + dir; if (j < 0 || j >= l.length) return; const t = l[i]; l[i] = l[j]; l[j] = t; window.cexRefresh && window.cexRefresh(); };
  /* quem pode editar o repertório: ids de voluntários autorizados além
     do líder de louvor (que pode autorizar). Master sempre pode. */
  S.REPERTORIO_AUTORIZADOS = ['p5'];
  S.podeEditarRepertorio = () => {
    const v = window.cexView ? window.cexView() : { papel: 'master' };
    if (v.papel === 'master') return true;
    if (v.papel === 'lider' && v.timeId === 'louvor') return true;
    if (v.pessoaId && (S.REPERTORIO_AUTORIZADOS || []).includes(v.pessoaId)) return true;
    return false;
  };
  /* o líder de louvor (ou master) pode autorizar/desautorizar pessoas */
  S.podeAutorizarRepertorio = () => {
    const v = window.cexView ? window.cexView() : { papel: 'master' };
    return v.papel === 'master' || (v.papel === 'lider' && v.timeId === 'louvor');
  };

  /* ── REGRAS DE ESCALA (config da igreja) ───────────────────────────
     modo: 'manual'  → líder monta tudo na mão
           'assistido' → gera sugestões (pendentes), líder confirma
           'automatico' → gera e já confirma, sem ação do líder
     naRecusa (no modo automático): 'proximo' chama o próximo apto;
              'avisar' só avisa o líder e deixa a vaga aberta. */
  S.ESCALA_CFG = {
    modo: 'assistido',
    maxPorEvento: 1,
    maxPorMes: 4,
    considerarFerias: true,
    naRecusa: 'proximo',
    folgaSemanas: 0,
  };

  /* ── CONFIGURAÇÕES PADRÃO DE ESCALA (presets de funções por time) ───
     Ex.: "Culto", "Reunião"... Cada preset guarda, por time, a lista
     de funções e quantas pessoas cada uma precisa. Aplicar reescreve
     as funções dos times (preservando quem já está escalado por nome). */
  S.ESCALA_PRESETS = [];
  S.salvarPresetEscala = (nome) => {
    const funcoes = {};
    (S.TIMES || []).forEach((t) => { funcoes[t.id] = ((S.ESCALAS[t.id] && S.ESCALAS[t.id].funcoes) || []).map((f) => ({ fn: f.fn, need: f.need })); });
    const p = { id: window.cexId ? window.cexId('pr') : 'pr-' + Date.now(), nome, funcoes };
    S.ESCALA_PRESETS.push(p);
    window.cexRefresh && window.cexRefresh();
    return p;
  };
  S.aplicarPresetEscala = (id) => {
    const p = S.ESCALA_PRESETS.find((x) => x.id === id); if (!p) return;
    Object.keys(p.funcoes).forEach((tid) => {
      if (!S.ESCALAS[tid]) return;
      const old = S.ESCALAS[tid].funcoes || [];
      S.ESCALAS[tid].funcoes = p.funcoes[tid].map((nf) => {
        const ex = old.find((o) => o.fn === nf.fn);
        return { fn: nf.fn, need: nf.need, cells: ex ? ex.cells : {} };
      });
    });
    window.cexRefresh && window.cexRefresh();
  };

  /* ── DELEGAÇÃO ──────────────────────────────────────────────────────
     O líder pode delegar a gestão da escala do seu time a outras
     pessoas. { timeId: [pessoaIds] }. Esses passam a enxergar/gerir. */
  S.DELEGACOES = {};
  S.delegadosDoTime = (tid) => (S.DELEGACOES[tid] || []);
  S.delegar = (tid, pid) => { (S.DELEGACOES[tid] ||= []); if (!S.DELEGACOES[tid].includes(pid)) S.DELEGACOES[tid].push(pid); window.cexRefresh && window.cexRefresh(); };
  S.removerDelegado = (tid, pid) => { if (S.DELEGACOES[tid]) S.DELEGACOES[tid] = S.DELEGACOES[tid].filter((x) => x !== pid); window.cexRefresh && window.cexRefresh(); };

  /* ── ACESSOS INDIVIDUAIS ────────────────────────────────────────────
     Telas extras liberadas para uma pessoa, além do que o papel já dá.
     ACESSOS[pessoaId] = ['membros','visitantes', ...]
     ACESSO_DELEGADOS = pessoas que podem conceder acessos a outras. */
  S.ACESSOS = { p2: ['visitantes'], p3: ['membros', 'visitantes'] };
  S.ACESSO_DELEGADOS = ['p3'];
  /* rotas que podem ser liberadas individualmente (fora de Operação/Nossa igreja) */
  S.ACESSO_ROTAS = [
    { id: 'painel', label: 'Painel & visão geral' },
    { id: 'membros', label: 'Membros' },
    { id: 'pessoas', label: 'Voluntários' },
    { id: 'times', label: 'Times & Ministérios' },
    { id: 'visitantes', label: 'Visitantes' },
    { id: 'decisoes', label: 'Decisões' },
    { id: 'batismos', label: 'Batismos' },
    { id: 'cursos', label: 'Cursos & Trilhas' },
    { id: 'relatorios', label: 'Relatórios' },
  ];
  S.acessoTog = (pid, route) => {
    if (!S.ACESSOS[pid]) S.ACESSOS[pid] = [];
    const i = S.ACESSOS[pid].indexOf(route);
    if (i >= 0) S.ACESSOS[pid].splice(i, 1); else S.ACESSOS[pid].push(route);
    window.cexRefresh && window.cexRefresh();
  };
  S.delegarAcessoTog = (pid) => {
    const i = S.ACESSO_DELEGADOS.indexOf(pid);
    if (i >= 0) S.ACESSO_DELEGADOS.splice(i, 1); else S.ACESSO_DELEGADOS.push(pid);
    window.cexRefresh && window.cexRefresh();
  };

  /* ── FRENTES / TAGS ──────────────────────────────────────────────
     Etiquetas livres que a igreja cria (Jovens, Kids, Casais, Conferência).
     Uma pessoa pode ter VÁRIAS. Servem para o líder de uma frente montar
     o seu elenco: ao escalar um evento marcado com a tag, o pool de
     candidatos é filtrado para quem tem aquela tag. O time (Som, Louvor…)
     continua sendo um só da igreja; a tag é uma lente sobre quem serve
     naquela frente. Não é faixa etária fixa nem um modo global. */
  S.TAGS = [
    { id: 'jovens', nome: 'Jovens', cor: 'olive', lideres: ['p5'] },
    { id: 'kids', nome: 'Kids', cor: 'wheat', lideres: ['p3'] },
    { id: 'adolescentes', nome: 'Adolescentes', cor: 'clay', lideres: [] },
    { id: 'casais', nome: 'Casais', cor: 'terra', lideres: [] },
  ];
  S.tagById = (id) => (S.TAGS || []).find((t) => t.id === id) || null;
  S.tagNome = (id) => { const t = S.tagById(id); return t ? t.nome : id; };
  S.tagCor = (id) => { const t = S.tagById(id); return t ? (t.cor || 'olive') : 'olive'; };
  S.pessoaTags = (p) => (p && Array.isArray(p.tags)) ? p.tags : [];
  S.pessoaTemTag = (p, id) => S.pessoaTags(p).includes(id);
  /* a pessoa atende às tags exigidas por um evento? (sem exigência = todos) */
  S.atendeTags = (p, tags) => { if (!tags || !tags.length) return true; const pt = S.pessoaTags(p); return tags.some((t) => pt.includes(t)); };
  S.contarTag = (id) => (S.PESSOAS || []).filter((p) => S.pessoaTemTag(p, id)).length;
  S.adicionarTag = (nome, cor) => {
    const n = (nome || '').trim(); if (!n) return null;
    const id = window.cexId ? window.cexId('tag') : 'tag-' + Date.now();
    const tag = { id, nome: n, cor: cor || 'olive', lideres: [] };
    S.TAGS.push(tag); window.cexRefresh && window.cexRefresh(); return tag;
  };
  /* líderes da frente (podem ser vários). Um líder entra automaticamente
     no elenco. São quem cuida da frente: montam o elenco e a escala dela. */
  S.tagLideres = (id) => { const t = S.tagById(id); return (t && Array.isArray(t.lideres)) ? t.lideres : []; };
  S.ehTagLider = (id, pid) => S.tagLideres(id).includes(pid);
  S.toggleTagLider = (id, pid) => {
    const t = S.tagById(id); if (!t) return;
    t.lideres = Array.isArray(t.lideres) ? t.lideres : [];
    const i = t.lideres.indexOf(pid);
    if (i >= 0) { t.lideres.splice(i, 1); }
    else {
      t.lideres.push(pid);
      const p = (S.PESSOAS || []).find((x) => x.id === pid);
      if (p) { p.tags = Array.isArray(p.tags) ? p.tags : []; if (!p.tags.includes(id)) p.tags.push(id); }
    }
    window.cexRefresh && window.cexRefresh();
  };
  S.renomearTag = (id, nome) => { const t = S.tagById(id); if (t) { t.nome = nome; window.cexRefresh && window.cexRefresh(); } };
  S.recolorirTag = (id, cor) => { const t = S.tagById(id); if (t) { t.cor = cor; window.cexRefresh && window.cexRefresh(); } };
  S.removerTag = (id) => {
    S.TAGS = (S.TAGS || []).filter((t) => t.id !== id);
    (S.PESSOAS || []).forEach((p) => { if (Array.isArray(p.tags)) p.tags = p.tags.filter((x) => x !== id); });
    (S.CULTOS || []).forEach((c) => { if (Array.isArray(c.tags)) c.tags = c.tags.filter((x) => x !== id); });
    window.cexRefresh && window.cexRefresh();
  };
  S.togglePessoaTag = (pid, id) => {
    const p = (S.PESSOAS || []).find((x) => x.id === pid); if (!p) return;
    p.tags = Array.isArray(p.tags) ? p.tags : [];
    const i = p.tags.indexOf(id);
    if (i >= 0) {
      p.tags.splice(i, 1);
      /* sai do elenco => deixa de ser líder da frente também */
      const t = S.tagById(id); if (t && Array.isArray(t.lideres)) t.lideres = t.lideres.filter((x) => x !== pid);
    } else { p.tags.push(id); }
    window.cexRefresh && window.cexRefresh();
  };
  /* semeia tags nos voluntários de exemplo (alguns do mesmo time servem
     numa frente, outros não — exatamente o caso "Som que serve nos Jovens") */
  const tagSeed = {
    p1: ['jovens'], p5: ['jovens'], p6: ['jovens'], p8: ['jovens'], p9: ['jovens'],
    p11: ['jovens'], p16: ['jovens'], p10: ['adolescentes'], p12: ['kids', 'jovens'], p3: ['kids'],
  };
  (S.PESSOAS || []).forEach((p) => { p.tags = tagSeed[p.id] || []; });
  /* o Encontro de Jovens já nasce marcado com a frente Jovens → ao montar
     a escala dele, o pool de cada função filtra para quem tem a tag. */
  const cJ = (S.CULTOS || []).find((c) => c.id === 'c4'); if (cJ) cJ.tags = ['jovens'];

  Object.assign(S, { SETLISTS });
})();
