/* ════════════════════════════════════════════════════════════════
   CE.X SERVICE · MEMBROS — congregação inteira (≠ Voluntários)
   Ficha com jornada de integração (Decisão → Servindo) e vínculo a GC.
   ════════════════════════════════════════════════════════════════ */

const gcById = (id) => S.GCS.find((g) => g.id === id);
const mById = (id) => S.MEMBROS.find((m) => m.id === id);
const SIT = {
  membro: { cls: 'sit-membro', label: 'Membro' },
  congregando: { cls: 'sit-congregando', label: 'Congregando' },
  novo: { cls: 'sit-novo', label: 'Novo' },
};
function SitChip({ s }) { const c = SIT[s] || SIT.novo; return <span className={`sit ${c.cls}`}>{c.label}</span>; }

function JrnPips({ jornada }) {
  return (
    <div className="jrn-mini">
      {jornada.map((v, i) => <span key={i} className={`jrn-pip ${v ? 'on' : ''}`}></span>)}
    </div>
  );
}

function Membros({ openMembro }) {
  useRefresh();
  const G = S.grp();
  const [q, setQ] = useState('');
  const [sit, setSit] = useState('todos');
  const [gc, setGc] = useState('todos');

  const shown = S.MEMBROS.filter((m) => {
    const okQ = !q || m.nome.toLowerCase().includes(q.toLowerCase());
    const okS = sit === 'todos'
      || (sit === 'servindo' && m.volId)
      || (sit === 'novo' && S.isNovo(m));
    const okG = gc === 'todos' || m.gc === gc;
    return okQ && okS && okG;
  });

  const total = S.MEMBROS.length;
  const novos = S.MEMBROS.filter((m) => S.isNovo(m)).length;
  const integrando = S.MEMBROS.filter((m) => m.jornada.filter(Boolean).length < 5).length;
  const servindo = S.MEMBROS.filter((m) => m.volId).length;

  return (
    <div className="content wide">
      <div className="ph">
        <div>
          <div className="ph-eyebrow">Pessoas</div>
          <h1 className="ph-title">Membros</h1>
          <p className="ph-sub">Toda a congregação, sirva ou não. Veja quem serve em quais ministérios, desde quando é da casa e o papel que exerce.</p>
        </div>
        <div className="ph-actions"><button className="btn btn-pri" onClick={() => cexCreate('membro')}>+ Novo membro</button></div>
      </div>

      <div className="kpi-row">
        <div className="kpi">
          <div className="kpi-label"><Icon name="membros" size={13} className="ic" /> Membros</div>
          <div className="kpi-value">{total}<span className="u">na rede {S.REL.membrosTotal}</span></div>
          <div className="kpi-foot"><span className="kpi-delta up">▲ {S.REL.membrosDelta}%</span> nos últimos 90 dias</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><Icon name="decisoes" size={13} className="ic" /> Novos convertidos</div>
          <div className="kpi-value">{novos}</div>
          <div className="kpi-foot">em discipulado inicial</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><Icon name="cursos" size={13} className="ic" /> Em integração</div>
          <div className="kpi-value" style={{ color: 'var(--amber)' }}>{integrando}</div>
          <div className="kpi-foot">jornada ainda incompleta</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><Icon name="times" size={13} className="ic" /> Já servindo</div>
          <div className="kpi-value">{servindo}<span className="u">/{total}</span></div>
          <div className="kpi-foot">{Math.round((servindo / total) * 100)}% da congregação serve</div>
        </div>
      </div>

      <div className="toolbar">
        <div className="tb-search"><span className="si">⌕</span><input placeholder="Buscar membro..." value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="seg">
          {[['todos', 'Todos'], ['servindo', 'Servindo'], ['novo', 'Novos']].map(([id, l]) => (
            <button key={id} className={sit === id ? 'on' : ''} onClick={() => setSit(id)}>{l}</button>
          ))}
        </div>
        {G.ativo && (
          <select className="select" style={{ width: 'auto', minWidth: 160 }} value={gc} onChange={(e) => setGc(e.target.value)}>
            <option value="todos">Todos os {G.termoP}</option>
            {S.GCS.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
          </select>
        )}
        <div className="tb-spacer"></div>
        <span className="panel-meta">{shown.length} membros</span>
      </div>

      <div className="tbl">
        <div className="tr head" style={{ gridTemplateColumns: '1.6fr 0.8fr 1.1fr 1.1fr' }}>
          <span>Membro</span><span>Membro desde</span><span>Serve</span><span>Cargo</span>
        </div>
        {shown.map((m) => {
          const vol = m.volId ? pById(m.volId) : null;
          const ministerios = vol ? vol.times.map((t) => tById(t)).filter(Boolean) : [];
          const lideraTimes = vol ? (vol.lider || []).map((t) => tById(t)).filter(Boolean) : [];
          const lidera = lideraTimes.length > 0;
          return (
            <div className="tr click" key={m.id} style={{ gridTemplateColumns: '1.6fr 0.8fr 1.1fr 1.1fr' }} onClick={() => openMembro(m.id)}>
              <div className="cell-person">
                <Av nome={m.nome} size="md" self={m.volId === 'p1'} lead={lidera} novo={S.isNovo(m)} fotoId={m.id} />
                <div>
                  <div className="cell-name">{m.nome}</div>
                  <div className="cell-sub">{m.tel}</div>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.02em' }}>{m.membroDesde}</div>
                <div className="cell-sub">na casa</div>
              </div>
              <div>
                {ministerios.length > 0
                  ? <div className="cell-tags">{ministerios.map((t) => <span key={t.id} className="tag">{t.nome.split(' ')[0]}</span>)}</div>
                  : <span style={{ fontSize: 13, color: 'var(--subtle)' }}>ainda não serve</span>}
              </div>
              <div className="cell-cargo">
                {m.papel && <span className="papel-tag">{m.papel}</span>}
                {lideraTimes.map((t) => <span key={t.id} className="lider-tag">Líder · {t.nome.split(' ')[0]}</span>)}
                {!m.papel && !lidera && <span style={{ fontSize: 12, color: 'var(--faint)' }}>·</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── FICHA DO MEMBRO (drawer) ─── */
const JRN_SUB = [
  'Decisão / conversão registrada',
  'Batismo nas águas',
  'Curso de fundamentos concluído',
  'Inserido num Grupo de Comunhão',
  'Servindo em um ministério',
];

function MembroDrawer({ id, onClose, openPessoa }) {
  const G = S.grp();
  const m0 = mById(id);
  const [m, setM] = useState(m0);
  if (!m) return null;
  const g = gcById(m.gc);
  const vol = m.volId ? pById(m.volId) : null;
  const lider = g ? pById(g.lider) : null;
  const done = m.jornada.filter(Boolean).length;
  const familiares = S.MEMBROS.filter((x) => x.familia === m.familia && x.id !== m.id);

  const toggleStep = (i) => setM((p) => {
    const j = [...p.jornada]; j[i] = j[i] ? 0 : 1; return { ...p, jornada: j };
  });

  return (
    <>
      <div className="drawer-bg" onClick={onClose}></div>
      <div className="drawer">
        <div className="drawer-head">
          <button className="drawer-close" onClick={onClose}>✕</button>
          <div className="profile-top">
            <Av nome={m.nome} size="xl" self={m.volId === 'p1'} lead={!!m.papel} novo={S.isNovo(m)} fotoId={m.id} />
            <div>
              <div className="profile-name">{m.nome}</div>
              <div className="profile-role">na casa desde {m.membroDesde || m.desde}</div>
              <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {S.isNovo(m) && <Chip st="wait" label="Novo na casa" />}
                {m.papel && <span className="papel-tag">{m.papel}</span>}
                {m.volId && <Chip st="ok" label="Servindo" />}
              </div>
            </div>
          </div>
        </div>
        <div className="drawer-body">
          <div className="dsec" style={{ marginTop: 4 }}>
            <div className="dsec-title">Dados cadastrais</div>
            <dl className="kv">
              <dt>Telefone</dt><dd><a href={`tel:${m.tel}`}>{m.tel}</a></dd>
              <dt>E-mail</dt><dd>{m.email || <span style={{ color: 'var(--subtle)' }}>a completar</span>}</dd>
              <dt>Aniversário</dt><dd>{m.nasc || <span style={{ color: 'var(--subtle)' }}>a completar</span>}</dd>
              <dt>Bairro</dt><dd>{m.bairro || <span style={{ color: 'var(--subtle)' }}>a completar</span>}</dd>
              {G.ativo && <><dt>{G.termo}</dt><dd>{g ? <span style={{ color: 'var(--olive)' }}>{g.nome}</span> : 'sem ' + G.sigla} {lider && <span style={{ color: 'var(--subtle)' }}>· líder {lider.nome.split(' ')[0]}</span>}</dd></>}
              <dt>Acesso ao app</dt><dd>{m.email ? <span style={{ color: 'var(--olive-soft)' }}>liberado</span> : <span style={{ color: 'var(--amber)' }}>pendente (faltam dados)</span>}</dd>
            </dl>
          </div>

          <div className="dsec">
            <div className="dsec-title">Serve & cargo</div>
            {vol && vol.times.length > 0 ? (
              <div className="ov-serve">
                {vol.times.map((tid) => { const t = tById(tid); const lid = vol.lider && vol.lider.includes(tid); return t ? <div className="ov-serve-row" key={tid}><span className="ov-serve-ic">{t.ic}</span><span className="ov-serve-name">{t.nome}</span>{lid ? <span className="lider-tag">Líder</span> : <span className="ov-serve-fn">{(vol.funcoes || []).join(' · ')}</span>}</div> : null; })}
              </div>
            ) : <div style={{ fontSize: 13, color: 'var(--subtle)' }}>Ainda não serve em nenhum ministério.</div>}
            {m.papel && <div style={{ marginTop: 12 }}><span className="papel-tag">{m.papel}</span> <span style={{ fontSize: 12, color: 'var(--subtle)', marginLeft: 6 }}>cargo ministerial</span></div>}
          </div>

          <div className="dsec">
            <div className="dsec-title">Jornada de integração · cursos</div>
            <CursosDoMembro mid={m.id} />
          </div>

          <div className="dsec">
            <div className="dsec-title">Linha do tempo · histórico</div>
            <PersonTimeline mid={m.id} />
            <AddEventBtn />
          </div>

          {familiares.length > 0 && (
            <div className="dsec">
              <div className="dsec-title">Família · {familiares.length}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {familiares.map((f) => (
                  <div className="cand" key={f.id}>
                    <Av nome={f.nome} size="sm" fotoId={f.id} />
                    <div className="cand-main"><div className="cand-name">{f.nome}</div><div className="cand-meta">{gcById(f.gc) ? gcById(f.gc).nome : 'sem grupo'}</div></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
            {m.volId
              ? <button className="btn btn-pri" style={{ flex: 1, justifyContent: 'center' }} onClick={() => openPessoa(m.volId)}>Ver como voluntário →</button>
              : <button className="btn btn-pri" style={{ flex: 1, justifyContent: 'center' }} onClick={() => cexToast('Convite para servir enviado a ' + m.nome.split(' ')[0] + '.')}>Convidar para servir</button>}
            <button className="btn btn-sec" style={{ flex: 1, justifyContent: 'center' }} onClick={() => cexToast('Abrindo conversa com ' + m.nome.split(' ')[0] + '.', 'info')}>Enviar mensagem</button>
          </div>
        </div>
      </div>
    </>
  );
}

/* botão + modal: matricular um membro num curso */
function MatricularCursoBtn({ mid }) {
  const [open, setOpen] = useState(false);
  const [, bump] = useState(0);
  const disp = (S.CURSOS || []).filter((c) => !(S.MATRICULAS[c.id] || []).some((x) => x.mid === mid));
  const matricular = (c) => { (S.MATRICULAS[c.id] || (S.MATRICULAS[c.id] = [])).push({ mid, feitas: 0, status: 'cursando' }); c.matriculados = (c.matriculados || 0) + 1; cexRefresh(); bump((n) => n + 1); cexToast('Matriculado em ' + c.nome + '.'); };
  return (
    <>
      <button className="btn btn-sec btn-sm" style={{ marginTop: 14 }} onClick={() => setOpen(true)}>+ Matricular em curso</button>
      {open && (
        <div className="modal-bg" onClick={() => setOpen(false)} style={{ zIndex: 80 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-eyebrow">Matricular em curso</div>
              <div className="modal-title">Escolha o curso</div>
              <div className="modal-sub">A pessoa entra com 0% e o progresso aparece aqui e na linha do tempo dela.</div>
            </div>
            <div className="modal-body">
              {disp.map((c) => (
                <div className="flag-row" key={c.id} style={{ cursor: 'pointer' }} onClick={() => matricular(c)}>
                  <span className="seg-sw-opt-ic" style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--ink)', color: 'var(--olive)', display: 'grid', placeItems: 'center' }}><Icon name="cursos" size={15} /></span>
                  <div className="flag-main"><div className="flag-nome">{c.nome}</div><div className="flag-meta">{c.nivel} · {S.totalAulas(c)} aula(s)</div></div>
                  <span className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}>Matricular</span>
                </div>
              ))}
              {disp.length === 0 && <div className="empty">Já está matriculado em todos os cursos.</div>}
            </div>
            <div className="modal-foot"><button className="btn btn-pri" onClick={() => setOpen(false)}>Concluído</button></div>
          </div>
        </div>
      )}
    </>
  );
}

/* jornada de integração refletindo a ÁREA DE CURSOS da igreja */
function CursosDoMembro({ mid }) {
  const matric = [];
  (S.CURSOS || []).forEach((c) => {
    const mt = (S.MATRICULAS[c.id] || []).find((x) => x.mid === mid);
    if (mt) { const total = S.totalAulas(c); matric.push({ c, feitas: mt.feitas, total, status: mt.status, pct: total ? Math.round((mt.feitas / total) * 100) : 0 }); }
  });
  const concl = matric.filter((m) => m.status === 'concluido').length;
  if (matric.length === 0) {
    return <div className="empty" style={{ padding: '22px 0' }}>Ainda não está matriculado em nenhum curso. <em>Convide para começar a trilha.</em></div>;
  }
  return (
    <>
      <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14 }}>{concl} de {matric.length} cursos concluídos. Reflete a área de Cursos da igreja.</div>
      <div className="mc-list">
        {matric.map(({ c, feitas, total, status, pct }) => (
          <div className="mc-row" key={c.id}>
            <div className={`mc-bar tone-${c.cor}`}></div>
            <div className="mc-main">
              <div className="mc-head">
                <div className="mc-name">{c.nome}</div>
                {status === 'concluido' ? <Chip st="ok" label="Concluído" /> : <span className="mc-pct">{pct}%</span>}
              </div>
              <div className="mc-meta">{c.nivel} · {feitas}/{total} aulas</div>
              <div className="bar" style={{ marginTop: 8 }}><div className={`bar-fill ${status === 'concluido' ? '' : 'amber'}`} style={{ width: `${pct}%` }}></div></div>
            </div>
          </div>
        ))}
      </div>
      <MatricularCursoBtn mid={mid} />
    </>
  );
}

Object.assign(window, { gcById, mById, Membros, MembroDrawer, SitChip, CursosDoMembro });
