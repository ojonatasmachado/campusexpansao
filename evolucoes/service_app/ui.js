/* ════════════════════════════════════════════════════════════════
   CE.X SERVICE · UI helpers globais (avisos amigáveis / toasts)
   Plain JS — disponível em todo o app. Dá vida aos botões com uma
   resposta calorosa em vez de "não faz nada".
   ════════════════════════════════════════════════════════════════ */
(function () {
  function host() {
    let h = document.getElementById('cex-toasts');
    if (!h) { h = document.createElement('div'); h.id = 'cex-toasts'; h.className = 'toast-host'; document.body.appendChild(h); }
    return h;
  }

  /* cexToast('mensagem', 'ok' | 'info' | 'warn') */
  window.cexToast = function (msg, kind) {
    kind = kind || 'ok';
    const t = document.createElement('div');
    t.className = 'toast toast-' + kind;
    const ic = kind === 'warn' ? '!' : kind === 'info' ? '◇' : '✓';
    t.innerHTML = '<span class="toast-ic">' + ic + '</span><span class="toast-msg"></span>';
    t.querySelector('.toast-msg').textContent = msg;
    host().appendChild(t);
    requestAnimationFrame(() => t.classList.add('in'));
    setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 280); }, 3200);
  };

  /* atalho: ação ainda sem backend, com tom amigável */
  window.cexSoon = function (label) {
    window.cexToast((label || 'Pronto') + ' — guardamos sua ação por aqui no protótipo.', 'info');
  };

  /* avisa as telas que os dados (window.SVC) mudaram → re-render das listas */
  window.cexRefresh = function () { window.dispatchEvent(new Event('cex-data')); };

  /* abre o formulário de criação certo (tratado pelo CreateHost no app) */
  window.cexCreate = function (kind, opts) { window.dispatchEvent(new CustomEvent('cex-create', { detail: { kind: kind, opts: opts || {} } })); };

  /* id curto único para novos registros */
  window.cexId = function (prefix) { return (prefix || 'x') + '-' + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36); };

  /* nome de quem está logado (membro) ou "Liderança" no protótipo */
  window.cexWho = function () {
    try {
      const uid = localStorage.getItem('cex_user');
      if (uid && window.SVC && window.SVC.MEMBROS) { const m = window.SVC.MEMBROS.find((x) => x.id === uid); if (m) return m.nome.split(' ').slice(0, 2).join(' '); }
    } catch (e) {}
    const v = window.cexView && window.cexView();
    if (v && v.papel === 'lider' && v.nome) return v.nome;
    return 'Liderança';
  };

  /* ── PERSPECTIVA (papel ativo no painel) ─────────────────────────
     master = Direção (vê tudo) · lider = vê só o seu time.
     Guardado em localStorage; o switcher na topbar troca. */
  window.cexView = function () {
    try { const v = JSON.parse(localStorage.getItem('cex_view') || 'null'); if (v && v.papel) return v; } catch (e) {}
    return { papel: 'master', timeId: null, pessoaId: null, nome: 'Direção' };
  };
  window.cexSetView = function (v) {
    try { localStorage.setItem('cex_view', JSON.stringify(v)); } catch (e) {}
    window.dispatchEvent(new Event('cex-data'));
    window.dispatchEvent(new Event('cex-view'));
  };
  /* ids de times que a perspectiva atual enxerga.
     Líder: todos os times que ele lidera + os que delegaram a ele. */
  window.cexScopeTimes = function () {
    const v = window.cexView();
    const S = window.SVC;
    if (v.papel === 'lider') {
      const set = new Set();
      const p = v.pessoaId && S && S.PESSOAS ? S.PESSOAS.find((x) => x.id === v.pessoaId) : null;
      if (p && p.lider) p.lider.forEach((t) => set.add(t));
      if (v.timeId) set.add(v.timeId);
      if (v.pessoaId && S && S.DELEGACOES) Object.keys(S.DELEGACOES).forEach((tid) => { if (S.DELEGACOES[tid].includes(v.pessoaId)) set.add(tid); });
      return [...set];
    }
    return ((S && S.TIMES) || []).map((t) => t.id);
  };
  window.cexCanSeeTime = function (tid) { return window.cexScopeTimes().includes(tid); };

  /* ── VISIBILIDADE POR PAPEL + ACESSOS INDIVIDUAIS ────────────────
     Regras base:
       master → vê tudo, edita tudo.
       líder  → vê tudo de OPERAÇÃO + NOSSA IGREJA (só leitura).
                NÃO vê Painel, Pessoas, Jornada nem Gestão.
     Acessos individuais (por pessoa) liberam telas extras:
       S.ACESSOS[pessoaId] = ['membros','visitantes', ...]
     Delegados podem conceder acessos (abrem a aba Acessos em Config):
       S.ACESSO_DELEGADOS = [pessoaId, ...] */
  const GRUPO_OPERACAO = ['escalas', 'reunioes', 'ensaios', 'quadros', 'cultos', 'comunicacao', 'conversas'];
  const GRUPO_NOSSA = ['identidade', 'historia'];
  window.CEX_GRUPO_OPERACAO = GRUPO_OPERACAO;
  window.CEX_GRUPO_NOSSA = GRUPO_NOSSA;

  function acessosDa(pid) {
    const S = window.SVC;
    if (!S) return [];
    if (!S.ACESSOS) S.ACESSOS = {};
    return (pid && S.ACESSOS[pid]) || [];
  }
  window.cexAcessosDa = acessosDa;

  /* pode VER uma rota? */
  window.cexPodeVer = function (route) {
    const v = window.cexView();
    if (v.papel === 'master') return true;
    if (GRUPO_OPERACAO.includes(route) || GRUPO_NOSSA.includes(route)) return true;
    if (acessosDa(v.pessoaId).includes(route)) return true;
    // delegados de acesso enxergam Configurações (só a aba de acessos)
    if (route === 'config' && window.cexPodeDelegarAcesso()) return true;
    return false;
  };

  /* pode EDITAR num contexto? (Nossa igreja: só master) */
  window.cexPodeEditar = function (ctx) {
    const v = window.cexView();
    if (v.papel === 'master') return true;
    return false;
  };

  /* esta pessoa pode conceder acessos a outras? (master ou delegado) */
  window.cexPodeDelegarAcesso = function () {
    const v = window.cexView();
    if (v.papel === 'master') return true;
    const S = window.SVC;
    return !!(S && S.ACESSO_DELEGADOS && v.pessoaId && S.ACESSO_DELEGADOS.includes(v.pessoaId));
  };

  /* primeira rota visível (fallback ao trocar de perspectiva) */
  window.cexPrimeiraRota = function () {
    const cands = ['painel', 'escalas', 'reunioes', 'identidade'];
    for (const r of cands) if (window.cexPodeVer(r)) return r;
    return 'escalas';
  };

  /* ── FRENTES / TAGS ──────────────────────────────────────────────
     As tags vivem nos dados (S.TAGS, pessoa.tags, culto.tags). Não há
     mais "modo global de faixa etária": a filtragem acontece localmente
     onde faz sentido (ex.: pool da escala de um evento marcado). */
})();
