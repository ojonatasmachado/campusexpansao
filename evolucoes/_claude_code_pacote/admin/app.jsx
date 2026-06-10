/* ════════════════════════════════════════════════════════════════
   CE.X ADMIN · APLICAÇÃO (shell, login, listas, roteamento)
   Protótipo de design. Estado em memória, semeado com o catálogo
   real do site. Backend real (login, banco) fica para o Claude Code.
   ════════════════════════════════════════════════════════════════ */
const { useState } = React;

const TYPES = [
  { key: 'material', plural: 'Materiais', singular: 'material', arr: 'materiais' },
  { key: 'curso', plural: 'Cursos', singular: 'curso', arr: 'cursos' },
  { key: 'mentoria', plural: 'Mentorias', singular: 'mentoria', arr: 'mentorias' },
  { key: 'evento', plural: 'Eventos', singular: 'evento', arr: 'eventos' },
];

const PASSWORD = 'cex2026';

function newItem(type) {
  const base = { id: null, type, title: '', desc: '', image: null, status: 'Rascunho', views: 0 };
  const acc = (it) => window.CEX_accentFor({ type, ...it });
  if (type === 'material') return { ...base, family: 'Para ministrar', shelf: 'Juniores', code: '', messages: null, pages: null, format: 'PDF', price: 0, hotmart: '', accent: acc({ family: 'Para ministrar', shelf: 'Juniores' }), buyClicks: 0, model: 'A', big: null, bigLabel: 'mensagens', messageList: [], paraQuem: '', beneficios: ['Editável e pronto pra aplicar na sua igreja', 'White-label CE.X: coloque a marca do seu ministério'], depoimento: { texto: '', autor: '' } };
  if (type === 'curso') return { ...base, level: 'Fundação', etapa: 1, totalEtapas: 6, weeks: 4, mentoria: true, aoVivo: true, mentor: '', accent: acc({ level: 'Fundação' }), waitlist: 0, ementa: ['', '', '', ''], paraQuem: '', depoimento: { texto: '', autor: '' }, proximaTurma: 'Próxima turma: a definir' };
  if (type === 'mentoria') return { ...base, formato: 'Grupo · 8 vagas', vagas: 8, mentor: '', cadencia: 'Encontros quinzenais · 90 min', accent: acc({}), waitlist: 0 };
  return { ...base, data: '', local: '', vagas: 100, inscritos: 0, hotmart: '', accent: acc({}) };
}

/* ───────── LOGIN ───────── */
function Login({ onEnter }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState(false);
  const submit = () => { if (pw === PASSWORD) onEnter(); else { setErr(true); setTimeout(() => setErr(false), 600); } };
  return (
    <div className="login">
      <div className="login-grid"></div>
      <div className="login-x">X</div>
      <div className={`login-card ${err ? 'shake' : ''}`}>
        <div className="login-logo">CE<span className="ol">.X</span></div>
        <div className="login-eyebrow">◆ PAINEL INTERNO</div>
        <h1 className="login-title">Área restrita</h1>
        <p className="login-sub">Gestão de materiais, cursos, mentorias e eventos. Acesso só por este endereço.</p>
        <input className="login-input" type="password" value={pw} placeholder="Senha de acesso" autoFocus
          onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
        <button className="login-btn" onClick={submit}>Entrar →</button>
        <div className="login-hint">Protótipo: a senha é <code>cex2026</code></div>
      </div>
      <div className="login-foot">CE.X · Campus Expansão · campusexpansao.com</div>
    </div>
  );
}

/* ───────── SIDEBAR ───────── */
function Sidebar({ route, go, counts, onLogout }) {
  return (
    <aside className="adm-sb">
      <div>
        <div className="adm-sb-logo">CE<span className="ol">.X</span></div>
        <div className="adm-sb-sub">Painel interno</div>
        <nav className="adm-sb-nav">
          <button className={`adm-sb-link ${route.screen === 'dashboard' ? 'on' : ''}`} onClick={() => go({ screen: 'dashboard' })}>
            <span className="adm-sb-ic">◆</span> Painel
          </button>
          <div className="adm-sb-group">Catálogo</div>
          {TYPES.map((t) => (
            <button key={t.key} className={`adm-sb-link ${route.screen === 'list' && route.type === t.key ? 'on' : ''}`} onClick={() => go({ screen: 'list', type: t.key })}>
              <span className="adm-sb-ic">◇</span> {t.plural}
              <span className="adm-sb-count">{counts[t.key]}</span>
            </button>
          ))}
        </nav>
      </div>
      <div className="adm-sb-bottom">
        <a className="adm-sb-link" href="https://campusexpansao.vercel.app" target="_blank" rel="noreferrer"><span className="adm-sb-ic">→</span> Ver o site</a>
        <button className="adm-sb-link" onClick={onLogout}><span className="adm-sb-ic">→</span> Sair</button>
      </div>
    </aside>
  );
}

/* ───────── LINHA DE ITEM NA LISTA ───────── */
function Row({ item, onEdit, onDelete }) {
  const cat = item.type === 'material' ? `${item.family} · ${item.shelf}` :
              item.type === 'curso' ? `${item.level} · Etapa ${String(item.etapa).padStart(2, '0')}` :
              item.type === 'mentoria' ? item.formato :
              `${item.data || 'Sem data'} · ${item.local || ''}`;
  const right = item.type === 'material' ? `R$ ${item.price}` :
                item.type === 'curso' ? `${item.weeks} sem` :
                item.type === 'mentoria' ? `${item.vagas} vagas` : `${item.vagas} vagas`;
  return (
    <div className="row">
      <div className="row-chip" style={{ background: item.image ? `url(${item.image}) center/cover` : 'var(--ink)' }}>
        {!item.image && <span style={{ color: item.accent }}>X</span>}
      </div>
      <div className="row-main">
        <div className="row-title">{item.title || <em className="row-untitled">Sem título</em>}</div>
        <div className="row-cat">{cat}</div>
      </div>
      <span className={`pill ${item.status === 'Publicado' ? 'pub' : 'draft'}`}>{item.status}</span>
      <span className="row-views">{item.views.toLocaleString('pt-BR')} <em>views</em></span>
      <span className="row-right">{right}</span>
      <div className="row-acts">
        <button className="row-btn" onClick={onEdit}>Editar</button>
        <button className="row-btn danger" onClick={onDelete}>Excluir</button>
      </div>
    </div>
  );
}

/* ───────── LISTA POR TIPO ───────── */
function ListView({ type, items, onNew, onEdit, onDelete }) {
  const meta = TYPES.find((t) => t.key === type);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('Todos');

  const filters = type === 'material' ? ['Todos', 'Para ministrar', 'Para liderar'] :
                  type === 'curso' ? ['Todos', 'Fundação', 'Liderança', 'Multiplicação'] :
                  ['Todos', 'Publicado', 'Rascunho'];

  const shown = items.filter((it) => {
    const okQ = !q || (it.title || '').toLowerCase().includes(q.toLowerCase());
    let okF = filter === 'Todos';
    if (!okF) {
      if (type === 'material') okF = it.family === filter;
      else if (type === 'curso') okF = it.level === filter;
      else okF = it.status === filter;
    }
    return okQ && okF;
  });

  return (
    <div className="listview">
      <div className="lv-toolbar">
        <input className="lv-search" placeholder={`Buscar em ${meta.plural.toLowerCase()}...`} value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="lv-filters">
          {filters.map((f) => <button key={f} className={`chip ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>{f}</button>)}
        </div>
        <button className="btn-pri" onClick={onNew}>+ Novo {meta.singular}</button>
      </div>
      <div className="lv-count">{shown.length} {shown.length === 1 ? 'item' : 'itens'}</div>
      <div className="lv-list">
        {shown.length === 0 && <div className="lv-empty">Nenhum item. Clique em <em>+ Novo {meta.singular}</em> para criar.</div>}
        {shown.map((it) => <Row key={it.id} item={it} onEdit={() => onEdit(it)} onDelete={() => onDelete(it)} />)}
      </div>
    </div>
  );
}

/* ───────── CONFIRMAÇÃO DE EXCLUSÃO ───────── */
function Confirm({ item, onYes, onNo }) {
  return (
    <div className="modal-bg" onClick={onNo}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Excluir "{item.title || 'item sem título'}"?</div>
        <p className="modal-text">Some do catálogo do site. Esta ação não pode ser desfeita.</p>
        <div className="modal-acts">
          <button className="btn-danger" onClick={onYes}>Excluir</button>
          <button className="btn-sec" onClick={onNo}>Manter</button>
        </div>
      </div>
    </div>
  );
}

/* ───────── APP ───────── */
function App() {
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState(() => ({
    materiais: window.CEX_DATA.materiais,
    cursos: window.CEX_DATA.cursos,
    mentorias: window.CEX_DATA.mentorias,
    eventos: window.CEX_DATA.eventos,
    metrics: window.CEX_DATA.metrics,
  }));
  const [route, setRoute] = useState({ screen: 'dashboard' });
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const arrName = (type) => TYPES.find((t) => t.key === type).arr;
  const counts = { material: data.materiais.length, curso: data.cursos.length, mentoria: data.mentorias.length, evento: data.eventos.length };

  if (!authed) return <Login onEnter={() => setAuthed(true)} />;

  const go = (r) => { setEditing(null); setRoute(r); };

  const openEdit = (it) => setEditing(it);
  const openNew = (type) => setEditing(newItem(type));

  const save = (d) => {
    const key = arrName(d.type);
    setData((prev) => {
      const arr = prev[key];
      if (d.id) return { ...prev, [key]: arr.map((x) => (x.id === d.id ? d : x)) };
      const withId = { ...d, id: `${d.type}-${Date.now()}` };
      return { ...prev, [key]: [withId, ...arr] };
    });
    setEditing(null);
  };

  const doDelete = (it) => {
    const key = arrName(it.type);
    setData((prev) => ({ ...prev, [key]: prev[key].filter((x) => x.id !== it.id) }));
    setConfirm(null);
  };

  const currentType = route.type;
  const pageTitle = editing ? (editing.id ? 'Editar item' : 'Novo item')
    : route.screen === 'dashboard' ? 'Painel de métricas'
    : TYPES.find((t) => t.key === currentType).plural;

  return (
    <div className="adm">
      <Sidebar route={route} go={go} counts={counts} onLogout={() => setAuthed(false)} />
      <main className="adm-main">
        <header className="adm-top">
          <div>
            <div className="adm-top-crumb">CE.X · PAINEL{editing ? ' · ' + TYPES.find((t) => t.key === editing.type).plural.toUpperCase() : ''}</div>
            <h1 className="adm-top-title">{pageTitle}</h1>
          </div>
          {editing && <button className="btn-sec" onClick={() => setEditing(null)}>← Voltar à lista</button>}
        </header>
        <div className="adm-content">
          {editing ? (
            <Editor item={editing} types={TYPES} onSave={save} onCancel={() => setEditing(null)} />
          ) : route.screen === 'dashboard' ? (
            <Dashboard data={data} />
          ) : (
            <ListView type={currentType} items={data[arrName(currentType)]}
              onNew={() => openNew(currentType)} onEdit={openEdit} onDelete={(it) => setConfirm(it)} />
          )}
        </div>
      </main>
      {confirm && <Confirm item={confirm} onYes={() => doDelete(confirm)} onNo={() => setConfirm(null)} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
