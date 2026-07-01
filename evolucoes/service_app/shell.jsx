/* ════════════════════════════════════════════════════════════════
   CE.X SERVICE · SHELL (helpers, login, sidebar, congregação, topbar)
   ════════════════════════════════════════════════════════════════ */
const { useState, useMemo, useRef, useEffect } = React;
const S = window.SVC;

/* re-render quando os dados mudam (criação/edição em window.SVC) */
function useRefresh() {
  const [, bump] = useState(0);
  useEffect(() => {
    const h = () => bump((n) => n + 1);
    window.addEventListener('cex-data', h);
    return () => window.removeEventListener('cex-data', h);
  }, []);
}

/* ─── HELPERS ─── */
const inits = (nome) => {
  const parts = String(nome).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};
const pById = (id) => S.PESSOAS.find((p) => p.id === id);
const tById = (id) => S.TIMES.find((t) => t.id === id);
const cById = (id) => S.CULTOS.find((c) => c.id === id);

/* ─── AVATAR (monograma de iniciais ou foto) ─── */
function cexImg(key) { try { return localStorage.getItem('cex_img_' + key) || null; } catch (e) { return null; } }
function Av({ nome, size = 'sm', self, lead, novo, fotoId }) {
  const foto = fotoId ? cexImg(fotoId) : null;
  return (
    <div className={`av av-${size} ${self ? 'self' : ''} ${lead ? 'lead' : ''} ${foto ? 'has-foto' : ''}`} title={nome} style={foto ? { backgroundImage: `url(${foto})` } : null}>
      {!foto && inits(nome)}
      {novo && <span className="av-novo">novo</span>}
    </div>
  );
}
function AvStack({ ids, max = 4 }) {
  const show = ids.slice(0, max);
  const extra = ids.length - show.length;
  return (
    <div className="av-stack">
      {show.map((id) => { const p = pById(id); return p ? <Av key={id} nome={p.nome} size="sm" /> : null; })}
      {extra > 0 && <div className="av-more">+{extra}</div>}
    </div>
  );
}

/* ─── UPLOAD DE IMAGEM (logo da igreja / foto do membro) ───
   Salva como data URL no localStorage (key cex_img_<id>) e avisa o app. */
function setCexImg(key, dataUrl) { try { dataUrl ? localStorage.setItem('cex_img_' + key, dataUrl) : localStorage.removeItem('cex_img_' + key); } catch (e) {} window.dispatchEvent(new Event('cex-img')); }
function useImg(key) {
  const [v, setV] = useState(() => cexImg(key));
  useEffect(() => { const h = () => setV(cexImg(key)); window.addEventListener('cex-img', h); return () => window.removeEventListener('cex-img', h); }, [key]);
  return v;
}
function ImgUpload({ id, label, hint, round }) {
  const cur = useImg(id);
  const ref = useRef(null);
  const onFile = (file) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => { setCexImg(id, r.result); cexToast('Imagem salva.'); };
    r.readAsDataURL(file);
  };
  return (
    <div className="img-up">
      <button className={`img-up-slot ${round ? 'round' : ''}`} onClick={() => ref.current && ref.current.click()} style={cur ? { backgroundImage: `url(${cur})` } : null}>
        {!cur && <span className="img-up-plus">+</span>}
      </button>
      <div className="img-up-main">
        <div className="cfg-row-t">{label}</div>
        {hint && <div className="cfg-row-s">{hint}</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button className="btn btn-sec btn-sm" onClick={() => ref.current && ref.current.click()}>{cur ? 'Trocar' : 'Enviar imagem'}</button>
          {cur && <button className="btn btn-ghost btn-sm" onClick={() => { setCexImg(id, null); cexToast('Imagem removida.'); }}>Remover</button>}
        </div>
      </div>
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files[0])} />
    </div>
  );
}

/* ─── LOGO DA IGREJA (logo/CE.X + "Service" no mesmo peso = marca única) ─── */
function IgrejaLogo({ size }) {
  const foto = useImg('igreja-logo');
  const nome = (S.IGREJA && S.IGREJA.nome) || '';
  const big = size === 'lg';
  return (
    <div className={`brand brand-row ${big ? 'brand-lg' : ''}`}>
      {foto
        ? <img className="brand-img" src={foto} alt={nome} />
        : <div className="sb-logo">CE<span className="ol">.X</span></div>}
      <span className="brand-div" aria-hidden="true"></span>
      <span className="brand-service">Service</span>
    </div>
  );
}

/* ─── STATUS CHIP ─── */
const STATUS = {
  ok: { cls: 'chip-ok', label: 'Confirmado' },
  wait: { cls: 'chip-wait', label: 'Pendente' },
  no: { cls: 'chip-no', label: 'Recusou' },
  vago: { cls: 'chip-neutral', label: 'Vago' },
};
function Chip({ st, label, solid }) {
  if (solid) return <span className="chip chip-solid">{label}</span>;
  const s = STATUS[st] || STATUS.vago;
  return <span className={`chip ${s.cls}`}>{label || s.label}</span>;
}

/* ─── LOGIN ─── */
function Login({ onEnter }) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const go = () => {
    const e = email.trim().toLowerCase();
    // membro com email + senha = 4 últimos do telefone (ou senha trocada)
    const mem = S.MEMBROS.find((m) => (m.email || '').toLowerCase() === e);
    if (mem) {
      const esperada = mem.senha || (mem.tel || '').replace(/\D/g, '').slice(-4);
      if (pw === esperada) { try { localStorage.setItem('cex_user', mem.id); } catch (x) {} onEnter(mem); return; }
      setErr('Senha incorreta. É os 4 últimos dígitos do seu telefone.'); flash(); return;
    }
    // protótipo: liderança entra com qualquer senha
    if (pw.length > 0) { onEnter(null); return; }
    setErr('Informe e-mail e senha.'); flash();
  };
  const flash = () => { setTimeout(() => setErr(''), 3200); };
  return (
    <div className="login">
      <div className="login-grid"></div>
      <div className="login-x">X</div>
      <div className={`login-card ${err ? 'shake' : ''}`}>
        <div className="login-logo"><IgrejaLogo size="lg" /></div>
        <div className="login-app">Gestão ministerial</div>
        <div className="login-eyebrow">Acesso</div>
        <h1 className="login-title">Entrar na sua igreja</h1>
        <p className="login-sub">Membros e liderança entram com o e-mail. A primeira senha são os 4 últimos dígitos do seu telefone, e você pode trocar depois.</p>
        <input className="login-input" type="email" placeholder="Seu e-mail" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} />
        <input className="login-input" type="password" value={pw} placeholder="Senha (4 últimos do telefone)" onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} />
        <button className="login-btn" onClick={go}>Entrar →</button>
        {err && <div className="login-err">{err}</div>}
        <div className="login-hint">Protótipo: liderança entra com qualquer senha. Membro: ex. <code>mariana@cex.com</code> / <code>4471</code></div>
      </div>
      <div className="login-foot">CE.X Service · acesse por campusexpansao.com/app ou direto</div>
    </div>
  );
}

/* ─── SELETOR DE CONGREGAÇÃO ─── */
function CongSwitcher({ cong, setCong }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const cur = S.CONGREGACOES.find((c) => c.id === cong);
  const matriz = S.CONGREGACOES.filter((c) => c.matriz);
  const filhas = S.CONGREGACOES.filter((c) => !c.matriz);
  return (
    <div className="cong" ref={ref}>
      <button className="cong-btn" onClick={() => setOpen((o) => !o)}>
        <span className="cong-mark"><Icon name={cur.matriz ? 'identidade' : 'globo'} size={16} /></span>
        <span className="cong-info">
          <span className="cong-name">{cur.nome}</span>
          <span className="cong-role">{cur.matriz ? 'Matriz · rede' : 'Congregação'}</span>
        </span>
        <span className="cong-caret">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div className="cong-menu">
          <div className="cong-group">Matriz</div>
          {matriz.map((c) => (
            <button key={c.id} className={`cong-opt matriz ${c.id === cong ? 'on' : ''}`} onClick={() => { setCong(c.id); setOpen(false); }}>
              <span className="cong-opt-dot"></span>
              <span className="cong-opt-name">{c.nome}</span>
              <span className="cong-opt-tag">rede</span>
            </button>
          ))}
          <div className="cong-group">Congregações · {filhas.length}</div>
          {filhas.map((c) => (
            <button key={c.id} className={`cong-opt ${c.id === cong ? 'on' : ''}`} onClick={() => { setCong(c.id); setOpen(false); }}>
              <span className="cong-opt-dot"></span>
              <span className="cong-opt-name">{c.nome}</span>
              <span className="cong-opt-meta">{c.membros}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── SIDEBAR ─── */
const NAV = [
  { group: 'Visão geral', items: [
    { id: 'painel', ic: '◆', label: 'Painel' },
  ] },
  { group: 'Pessoas', items: [
    { id: 'membros', ic: '◇', label: 'Membros', count: 'membros' },
    { id: 'pessoas', ic: '◇', label: 'Voluntários', count: 'pessoas' },
    { id: 'times', ic: '◇', label: 'Times & Ministérios', count: 'times' },
    { id: 'visitantes', ic: '◇', label: 'Visitantes', badge: 'visit' },
  ] },
  { group: 'Jornada', items: [
    { id: 'batismos', ic: '◇', label: 'Batismos' },
    { id: 'cursos', ic: '▷', label: 'Cursos & Trilhas' },
  ] },
  { group: 'Operação', items: [
    { id: 'escalas', ic: '▷', label: 'Escalas', badge: 'gap' },
    { id: 'reunioes', ic: '▷', label: 'Reuniões' },
    { id: 'ensaios', ic: '▷', label: 'Ensaios' },
    { id: 'quadros', ic: '▷', label: 'Quadros' },
    { id: 'cultos', ic: '▷', label: 'Cultos & Agenda', count: 'cultos' },
    { id: 'comunicacao', ic: '▷', label: 'Comunicação' },
    { id: 'conversas', ic: '▷', label: 'Conversas', badge: 'chat' },
  ] },
  { group: 'Gestão', items: [
    { id: 'relatorios', ic: '▷', label: 'Relatórios' },
    { id: 'config', ic: '▷', label: 'Configurações' },
  ] },
  { group: 'Nossa igreja', items: [
    { id: 'identidade', ic: '◆', label: 'Identidade & propósito' },
    { id: 'historia', ic: '◇', label: 'Nossa história' },
  ] },
];

function Sidebar({ route, go, cong, setCong, gaps, onLogout }) {
  const counts = { membros: S.MEMBROS.length, pessoas: S.PESSOAS.length, times: S.TIMES.length, cultos: S.CULTOS.length };
  return (
    <aside className="sb">
      <div className="sb-top">
        <IgrejaLogo />
      </div>
      <CongSwitcher cong={cong} setCong={setCong} />
      <nav className="sb-nav">
        {NAV.map((g) => {
          const items = g.items.filter((it) => window.cexPodeVer(it.id));
          if (items.length === 0) return null;
          return (
          <div key={g.group}>
            <div className="sb-group">{g.group}</div>
            {items.map((it) => (
              <button key={it.id} className={`sb-link ${route === it.id ? 'on' : ''}`} onClick={() => go(it.id)}>
                <span className="sb-ic"><Icon name={CEX_ICON_FOR[it.id] || 'painel'} size={17} /></span>
                {it.label}
                {it.badge === 'gap' && gaps > 0 && <span className="sb-badge">{gaps}</span>}
                {it.badge === 'visit' && <span className="sb-badge olive">{S.VISITANTES.filter((v) => v.etapa !== 'membro').length}</span>}
                {it.badge === 'dec' && <span className="sb-badge olive">{S.DECISOES.filter((d) => d.status === 'novo').length}</span>}
                {it.count && <span className="sb-count">{counts[it.count]}</span>}
              </button>
            ))}
          </div>
          );
        })}
      </nav>
      <div className="sb-bottom">
        <button className="sb-link" onClick={() => window.open('https://campusexpansao.vercel.app', '_blank')}>
          <span className="sb-ic"><Icon name="globo" size={17} /></span> Ver o site público
        </button>
        <button className="sb-link" onClick={onLogout}>
          <span className="sb-ic"><Icon name="sair" size={17} /></span> Sair
        </button>
      </div>
    </aside>
  );
}

/* ─── SELETOR DE PERSPECTIVA (papel ativo: Direção / líder de time) ─── */
function ViewSwitcher() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => window.cexView());
  const ref = useRef(null);
  useEffect(() => {
    const h = () => setView(window.cexView());
    window.addEventListener('cex-view', h);
    const c = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', c);
    return () => { window.removeEventListener('cex-view', h); document.removeEventListener('mousedown', c); };
  }, []);
  const pick = (v) => { window.cexSetView(v); setOpen(false); };
  const lideres = S.TIMES.map((t) => {
    const lid = S.liderDoTime ? S.liderDoTime(t.id) : null;
    const m = lid ? S.MEMBROS.find((x) => x.id === lid) : null;
    const pid = m ? m.volId : null;
    return { timeId: t.id, t, time: t.nome, nome: m ? m.nome : 'Líder', pessoaId: pid };
  });
  const label = view.papel === 'master' ? 'Direção' : view.nome;
  const sub = view.papel === 'master' ? 'vê toda a rede' : 'líder · ' + (tById(view.timeId) ? tById(view.timeId).nome.split(' ')[0] : '');
  return (
    <div className="view-sw" ref={ref}>
      <button className="view-sw-btn" onClick={() => setOpen((o) => !o)} title="Trocar perspectiva">
        <span className="view-sw-ic">{view.papel === 'master' ? <Icon name="identidade" size={15} /> : <Icon name="pessoa" size={15} />}</span>
        <span className="view-sw-info">
          <span className="view-sw-name">{label}</span>
          <span className="view-sw-role">{sub}</span>
        </span>
        <span className="view-sw-caret">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div className="view-sw-menu">
          <div className="view-sw-group">Ver o painel como</div>
          <button className={`view-sw-opt ${view.papel === 'master' ? 'on' : ''}`} onClick={() => pick({ papel: 'master', timeId: null, pessoaId: null, nome: 'Direção' })}>
            <span className="view-sw-opt-ic"><Icon name="identidade" size={15} /></span>
            <span className="view-sw-opt-main"><b>Direção / Master</b><small>vê todos os times e quadros</small></span>
          </button>
          <div className="view-sw-group">Líderes de time · vê só o seu</div>
          {lideres.map((l) => (
            <button key={l.timeId} className={`view-sw-opt ${view.papel === 'lider' && view.timeId === l.timeId ? 'on' : ''}`}
              onClick={() => pick({ papel: 'lider', timeId: l.timeId, pessoaId: l.pessoaId, nome: l.nome })}>
              <span className="view-sw-opt-ic"><TeamMark t={l.t} size={15} /></span>
              <span className="view-sw-opt-main"><b>{l.nome}</b><small>{l.time}</small></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── BUSCA GLOBAL (atalho rápido: membros, voluntários, times, funções) ─── */
function GlobalSearch({ go, openMembro, openPessoa, openTime }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const c = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', c);
    return () => document.removeEventListener('mousedown', c);
  }, []);
  const term = q.trim().toLowerCase();
  const res = [];
  if (term) {
    (S.MEMBROS || []).filter((m) => m.nome.toLowerCase().includes(term)).slice(0, 4)
      .forEach((m) => res.push({ tipo: 'Membro', ic: 'membros', nome: m.nome, sub: m.papel || 'Membro', act: () => openMembro && openMembro(m.id) }));
    (S.PESSOAS || []).filter((p) => p.nome.toLowerCase().includes(term)).slice(0, 4)
      .forEach((p) => res.push({ tipo: 'Voluntário', ic: 'pessoa', nome: p.nome, sub: (p.funcoes || []).join(' · ') || 'Voluntário', act: () => openPessoa && openPessoa(p.id) }));
    (S.TIMES || []).filter((t) => t.nome.toLowerCase().includes(term)).slice(0, 4)
      .forEach((t) => res.push({ tipo: 'Time', ic: 'times', nome: t.nome, sub: 'Ministério', act: () => openTime && openTime(t.id) }));
    const funcs = {};
    (S.TIMES || []).forEach((t) => (t.funcoes || []).forEach((fn) => { if (fn.toLowerCase().includes(term)) (funcs[fn] = funcs[fn] || []).push(t); }));
    Object.keys(funcs).slice(0, 6).forEach((fn) => res.push({ tipo: 'Função', ic: 'escalas', nome: fn, sub: funcs[fn].map((t) => t.nome.split(' ')[0]).join(', '), act: () => openTime && openTime(funcs[fn][0].id) }));
  }
  const pick = (r) => { setQ(''); setOpen(false); r.act(); };
  return (
    <div className="top-search" ref={ref}>
      <span className="si"><Icon name="buscar" size={15} /></span>
      <input placeholder="Buscar membro, voluntário, time ou função..." value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === 'Enter' && res[0]) pick(res[0]); if (e.key === 'Escape') setOpen(false); }} />
      {open && term && (
        <div className="gsearch-pop">
          {res.length === 0 && <div className="gsearch-empty">Nada encontrado para "{q}".</div>}
          {res.map((r, i) => (
            <button key={i} className="gsearch-row" onMouseDown={(e) => { e.preventDefault(); pick(r); }}>
              <span className="gsearch-ic"><Icon name={r.ic} size={15} /></span>
              <span className="gsearch-main"><span className="gsearch-nome">{r.nome}</span><span className="gsearch-sub">{r.sub}</span></span>
              <span className="gsearch-tag">{r.tipo}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── TOPBAR ─── */
function Topbar({ crumb, onMobile, theme, onTheme, go, openMembro, openPessoa, openTime }) {
  return (
    <header className="top">
      <div className="top-crumb">{crumb}</div>
      <GlobalSearch go={go} openMembro={openMembro} openPessoa={openPessoa} openTime={openTime} />
      <div className="top-actions">
        <button className="theme-tog" title={theme === 'light' ? 'Mudar para escuro' : 'Mudar para claro'} onClick={onTheme}><Icon name={theme === 'light' ? 'lua' : 'sol'} size={16} /></button>
        <button className="top-icon" title="Avisos" onClick={() => onMobile && onMobile()}>
          <Icon name="sino" size={17} />
        </button>
        <button className="top-icon" title="Notificações"><span className="dot"></span><Icon name="comunicacao" size={17} /></button>
        <ViewSwitcher />
      </div>
    </header>
  );
}

Object.assign(window, { inits, pById, tById, cById, Av, AvStack, Chip, STATUS, Login, Sidebar, Topbar, ViewSwitcher });
