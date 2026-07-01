/* ════════════════════════════════════════════════════════════════
   CE.X SERVICE · CURSOS & TRILHAS
   Trilhas sequenciais, conteúdo no app e cursos presenciais.
   Matrícula e progresso por pessoa.
   ════════════════════════════════════════════════════════════════ */

const CURSO_TIPO = {
  trilha:     { label: 'Trilha', ic: '▷' },
  conteudo:   { label: 'Conteúdo no app', ic: '◷' },
  presencial: { label: 'Presencial', ic: '◆' },
};
const AULA_IC = { video: '▷', texto: '◇', presencial: '◆' };
const CURSO_TIPO_IC = { trilha: 'cursos', conteudo: 'cultos', presencial: 'membros' };
const AULA_ICON = { video: 'cultos', texto: 'cursos', presencial: 'membros' };

function Cursos({ openCurso }) {
  useRefresh();
  const [f, setF] = useState('todos');
  const [view, setView] = useState('galeria');
  const [cfg, setCfg] = useState(null);
  const [editor, setEditor] = useState(null); // {} novo | {grupo} | {id}
  useEffect(() => {
    const h = (e) => setEditor({ id: e.detail.id });
    window.addEventListener('cex-edit-curso', h);
    return () => window.removeEventListener('cex-edit-curso', h);
  }, []);
  const cursos = S.CURSOS.filter((c) => f === 'todos' || c.tipo === f);
  const totMatric = S.CURSOS.reduce((n, c) => n + c.matriculados, 0);
  const totConcl = S.CURSOS.reduce((n, c) => n + c.concluintes, 0);

  return (
    <div className="content wide">
      <div className="ph">
        <div>
          <div className="ph-eyebrow">Jornada</div>
          <h1 className="ph-title">Cursos & <em>Trilhas</em></h1>
          <p className="ph-sub">Da decisão à liderança. Trilhas sequenciais, conteúdo no app e formações presenciais — cada conclusão entra na linha do tempo da pessoa.</p>
        </div>
        <div className="ph-actions">
          <div className="seg">
            <button className={view === 'galeria' ? 'on' : ''} onClick={() => setView('galeria')}>Galeria</button>
            <button className={view === 'org' ? 'on' : ''} onClick={() => setView('org')}>Organizar</button>
          </div>
          <button className="btn btn-pri" onClick={() => setEditor({})}>+ Novo curso</button>
        </div>
      </div>

      <div className="kpi-row">
        <div className="kpi">
          <div className="kpi-label"><Icon name="cursos" size={13} className="ic" /> Cursos ativos</div>
          <div className="kpi-value">{S.CURSOS.length}</div>
          <div className="kpi-foot">trilhas, conteúdo e presenciais</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><Icon name="membros" size={13} className="ic" /> Matrículas</div>
          <div className="kpi-value">{totMatric}</div>
          <div className="kpi-foot">pessoas cursando agora</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><Icon name="ok" size={13} className="ic" /> Conclusões</div>
          <div className="kpi-value">{totConcl}</div>
          <div className="kpi-foot">{Math.round((totConcl / totMatric) * 100)}% de conclusão</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><Icon name="pessoa" size={13} className="ic" /> Em formação de líderes</div>
          <div className="kpi-value" style={{ color: 'var(--amber)' }}>{(S.MATRICULAS.cs3 || []).length}</div>
          <div className="kpi-foot">na Escola de Líderes</div>
        </div>
      </div>

      {view === 'galeria' && (<>
      <div className="toolbar">
        <div className="seg">
          {[['todos', 'Todos'], ['trilha', 'Trilhas'], ['conteudo', 'Conteúdo'], ['presencial', 'Presenciais']].map(([id, l]) => (
            <button key={id} className={f === id ? 'on' : ''} onClick={() => setF(id)}>{l}</button>
          ))}
        </div>
        <div className="tb-spacer"></div>
        <span className="panel-meta">{cursos.length} cursos</span>
      </div>

      <div className="cs-grid">
        {cursos.map((c) => {
          const aulas = S.totalAulas(c);
          const pct = c.matriculados ? Math.round((c.concluintes / c.matriculados) * 100) : 0;
          return (
            <button className="cs-card" key={c.id} onClick={() => openCurso(c.id)}>
              <div className={`cs-cover tone-${c.cor}`}>
                <span className="cs-cover-ic"><Icon name={CURSO_TIPO_IC[c.tipo]} size={20} /></span>
                <span className="cs-cover-tag">{CURSO_TIPO[c.tipo].label}</span>
                <span className="cs-cover-cap">{c.capa}</span>
              </div>
              <div className="cs-body">
                <div className="cs-nivel">{c.nivel}</div>
                <div className="cs-name">{c.nome}</div>
                <div className="cs-desc">{c.desc}</div>
                <div className="cs-foot">
                  <span className="team-stat"><b>{c.modulos.length}</b> mód · <b>{aulas}</b> aulas</span>
                  <span className="team-stat"><b>{c.matriculados}</b> matric.</span>
                </div>
                <div className="bar" style={{ marginTop: 12 }}><div className="bar-fill" style={{ width: `${pct}%` }}></div></div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--subtle)', marginTop: 6 }}>{pct}% de conclusão</div>
              </div>
            </button>
          );
        })}
      </div>
      </>)}

      {view === 'org' && <CursoBuilder openEditor={setEditor} />}
      {cfg && <CursoConfig id={cfg} onClose={() => setCfg(null)} />}
      {editor && <CursoEditor id={editor.id} grupo={editor.grupo} onClose={() => setEditor(null)} />}
    </div>
  );
}

function CursoDrawer({ id, onClose, openMembro }) {
  const c = S.CURSOS.find((x) => x.id === id);
  const [open, setOpen] = useState(0);
  const [aulaOpen, setAulaOpen] = useState(null);
  const [matricOpen, setMatricOpen] = useState(false);
  const [aulaQR, setAulaQR] = useState(null); // {mi, aulaId}
  const ehPresencial = c && (c.tipo === 'presencial' || c.modalidade === 'presencial' || c.modalidade === 'hibrido');
  if (!c) return null;
  const matric = S.MATRICULAS[c.id] || [];
  const aulas = S.totalAulas(c);

  return (
    <>
      <div className="drawer-bg" onClick={onClose}></div>
      <div className="drawer">
        <div className={`cs-drawer-cover tone-${c.cor}`}>
          <button className="drawer-close" onClick={onClose} style={{ background: 'rgba(0,0,0,0.25)' }}>✕</button>
          <span className="cs-cover-tag"><Icon name={CURSO_TIPO_IC[c.tipo]} size={13} className="ic" /> {CURSO_TIPO[c.tipo].label}</span>
          <div className="cs-drawer-title">{c.nome}</div>
          <div className="cs-drawer-meta">{c.nivel} · {c.modulos.length} módulos · {aulas} aulas{c.turma ? ` · ${c.turma}` : ''}</div>
        </div>
        <div className="drawer-body">
          <div style={{ fontSize: 14, color: 'var(--light)', lineHeight: 1.6, marginBottom: 8 }}>{c.desc}</div>
          {(c.divulgacao || (c.materiais && c.materiais.length > 0)) && (
            <div className="dsec">
              <div className="dsec-title">Sobre o curso</div>
              {c.divulgacao && <div className="rt-view" dangerouslySetInnerHTML={{ __html: c.divulgacao }}></div>}
              {c.materiais && c.materiais.length > 0 && (
                <div className="mat-view">
                  {c.materiais.map((m) => (
                    m.url
                      ? <a className="mat-view-row" key={m.id} href={m.url} target="_blank" rel="noreferrer"><Icon name={m.tipo === 'video' ? 'cultos' : 'cursos'} size={14} /><span>{m.titulo}</span><span className="mat-view-tipo">{m.tipo}</span></a>
                      : <div className="mat-view-row" key={m.id}><Icon name="cursos" size={14} /><span>{m.titulo}</span><span className="mat-view-tipo">{m.tipo}</span></div>
                  ))}
                </div>
              )}
            </div>
          )}
          {c.proximo && <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--olive)', marginTop: 10 }}><Icon name="agenda" size={12} className="ic" /> Próximo encontro: {c.proximo}</div>}

          <div className="dsec">
            <div className="dsec-title">Conteúdo · {c.modulos.length} módulos</div>
            <div className="mod-list">
              {c.modulos.map((m, i) => (
                <div className={`mod ${open === i ? 'open' : ''}`} key={m.id}>
                  <button className="mod-head" onClick={() => setOpen(open === i ? -1 : i)}>
                    <span className="mod-num">{String(i + 1).padStart(2, '0')}</span>
                    <span className="mod-name">{m.nome}</span>
                    <span className="mod-count">{m.aulas.length} aula(s)</span>
                    <span className="mod-caret">{open === i ? '▴' : '▾'}</span>
                  </button>
                  {open === i && (
                    <div className="mod-aulas">
                      {m.aulas.map((a, j) => {
                        const key = i + '-' + j;
                        const aberta = aulaOpen === key;
                        const temConteudo = a.conteudo || (a.prova && a.prova.length);
                        const comQR = ehPresencial || a.tipo === 'presencial' || a.tipo === 'ao_vivo';
                        return (
                          <div key={j}>
                            <div className="aula-line">
                            <button className="aula" style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', cursor: temConteudo ? 'pointer' : 'default' }} onClick={() => temConteudo && setAulaOpen(aberta ? null : key)}>
                              <span className="aula-ic"><Icon name={AULA_ICON[a.tipo]} size={13} /></span>
                              <span className="aula-name">{a.nome}</span>
                              {a.prova && a.prova.length > 0 && <span className="aula-prova-badge">prova</span>}
                              <span className="aula-dur">{a.dur}</span>
                              {temConteudo && <span className="mod-caret" style={{ marginLeft: 6 }}>{aberta ? '▴' : '▾'}</span>}
                            </button>
                            {comQR && <button className="aula-qr" title="Check-in de presença por QR (professor)" onClick={(e) => { e.stopPropagation(); setAulaQR({ mi: i, aulaId: a.id }); }}><Icon name="cultos" size={13} /> QR</button>}
                            </div>
                            {aberta && (
                              <div className="aula-detalhe">
                                {a.link && (a.tipo === 'video' || a.tipo === 'ao_vivo') && <a className="aula-link" href={a.link} target="_blank" rel="noreferrer"><Icon name="cultos" size={13} /> Abrir vídeo</a>}
                                {a.conteudo && <div className="rt-view" dangerouslySetInnerHTML={{ __html: a.conteudo }}></div>}
                                {a.prova && a.prova.length > 0 && (
                                  <div className="aula-prova-info"><Icon name="cursos" size={13} /> Prova de {a.prova.length} pergunta(s){a.minAcertos ? ` · mínimo ${a.minAcertos} acerto(s) para aprovar` : ''}.</div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="dsec">
            <div className="dsec-title">Matriculados · {matric.length}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {matric.map((mt) => {
                const m = mById(mt.mid);
                const pct = Math.round((mt.feitas / aulas) * 100);
                return (
                  <div className="cand" key={mt.mid} onClick={() => { onClose(); openMembro(mt.mid); }}>
                    <Av nome={m ? m.nome : '?'} size="sm" />
                    <div className="cand-main">
                      <div className="cand-name">{m ? m.nome : '—'}</div>
                      <div className="bar" style={{ marginTop: 6, width: 160 }}><div className={`bar-fill ${mt.status === 'concluido' ? '' : 'amber'}`} style={{ width: `${pct}%` }}></div></div>
                    </div>
                    {mt.status === 'concluido' ? <Chip st="ok" label="Concluiu" /> : <span className="cand-fit busy">{pct}%</span>}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
            <button className="btn btn-pri" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setMatricOpen(true)}>+ Matricular pessoa</button>
            <button className="btn btn-sec" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { onClose(); window.dispatchEvent(new CustomEvent('cex-edit-curso', { detail: { id: c.id } })); }}>Editar curso</button>
          </div>
        </div>
      </div>
      {matricOpen && <MatricularModal curso={c} onClose={() => setMatricOpen(false)} />}
      {aulaQR && <AulaCheckinModal cursoId={c.id} moduloIdx={aulaQR.mi} aulaId={aulaQR.aulaId} onClose={() => setAulaQR(null)} />}
    </>
  );
}

/* matricular pessoas num curso */
function MatricularModal({ curso, onClose }) {
  const [q, setQ] = useState('');
  const [, bump] = useState(0);
  const jaIds = (S.MATRICULAS[curso.id] || []).map((mt) => mt.mid);
  const lista = (S.MEMBROS || []).filter((m) => !q || m.nome.toLowerCase().includes(q.toLowerCase()));
  const matricular = (mid) => {
    if (jaIds.includes(mid)) return;
    (S.MATRICULAS[curso.id] || (S.MATRICULAS[curso.id] = [])).push({ mid, feitas: 0, status: 'cursando' });
    curso.matriculados = (curso.matriculados || 0) + 1;
    const m = mById(mid);
    cexRefresh(); bump((n) => n + 1); cexToast((m ? m.nome.split(' ')[0] : 'Pessoa') + ' matriculado(a).');
  };
  return (
    <div className="modal-bg" onClick={onClose} style={{ zIndex: 80 }}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Matricular · {curso.nome}</div>
          <div className="modal-title">Quem vai cursar</div>
          <div className="modal-sub">Escolha as pessoas. Elas entram com 0% e o progresso aparece aqui e na linha do tempo de cada uma.</div>
        </div>
        <div className="modal-body">
          <div className="tb-search" style={{ marginBottom: 12 }}><span className="si"><Icon name="buscar" size={13} /></span><input placeholder="Buscar membro…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          {lista.map((m) => {
            const ja = (S.MATRICULAS[curso.id] || []).some((mt) => mt.mid === m.id);
            return (
              <div className="flag-row" key={m.id} style={{ cursor: ja ? 'default' : 'pointer', opacity: ja ? 0.6 : 1 }} onClick={() => matricular(m.id)}>
                <Av nome={m.nome} size="sm" />
                <div className="flag-main"><div className="flag-nome">{m.nome}</div><div className="flag-meta">{m.papel || (ja ? 'Já matriculado' : 'Membro')}</div></div>
                {ja ? <Icon name="ok" size={16} style={{ marginLeft: 'auto', color: 'var(--olive)' }} /> : <span className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}>Matricular</span>}
              </div>
            );
          })}
          {lista.length === 0 && <div className="empty">Ninguém encontrado.</div>}
        </div>
        <div className="modal-foot"><button className="btn btn-pri" onClick={onClose}>Concluído</button></div>
      </div>
    </div>
  );
}

/* ════════ CONSTRUTOR (canva de grupos e cursos) ════════ */
function CursoBuilder({ openEditor }) {
  const grupos = S.CURSO_GRUPOS || [];
  const semGrupo = S.CURSOS.filter((c) => !grupos.some((g) => g.id === c.grupo));
  const nomeCurso = (id) => { const c = S.CURSOS.find((x) => x.id === id); return c ? c.nome : id; };

  const Coluna = ({ g, cursos }) => (
    <div className="cb-col">
      <div className="cb-col-head">
        <div>
          <div className="cb-col-name">{g.nome}</div>
          {g.desc && <div className="cb-col-desc">{g.desc}</div>}
        </div>
        <span className="cb-col-n">{cursos.length}</span>
      </div>
      <div className="cb-col-body">
        {cursos.map((c) => (
          <button className="cb-card" key={c.id} onClick={() => openEditor({ id: c.id })}>
            <div className={`cb-card-bar tone-${c.cor}`}></div>
            <div className="cb-card-main">
              <div className="cb-card-name">{c.nome}</div>
              <div className="cb-card-meta"><Icon name={CURSO_TIPO_IC[c.tipo]} size={13} className="ic" /> {CURSO_TIPO[c.tipo].label} · {c.nivel}</div>
              {c.preReqs && c.preReqs.length > 0 && (
                <div className="cb-req"><Icon name="cursos" size={11} className="ic" /> exige: {c.preReqs.map(nomeCurso).join(', ')}</div>
              )}
            </div>
            <span className="cb-card-go">⚙</span>
          </button>
        ))}
        <button className="cb-add" onClick={() => openEditor({ grupo: g.id })}>+ curso neste grupo</button>
      </div>
    </div>
  );

  return (
    <>
      <div className="toolbar">
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>Organize os cursos em grupos e defina o que cada um exige para a inscrição. Toque num curso para ajustar grupo e pré-requisitos.</div>
        <div className="tb-spacer"></div>
        <button className="btn btn-sec btn-sm" onClick={() => cexCreate('grupo')}>+ Novo grupo</button>
      </div>
      <div className="cb-board">
        {grupos.map((g) => <Coluna key={g.id} g={g} cursos={S.CURSOS.filter((c) => c.grupo === g.id)} />)}
        {semGrupo.length > 0 && <Coluna g={{ id: '_', nome: 'Sem grupo', desc: 'Arraste para um grupo' }} cursos={semGrupo} />}
      </div>
    </>
  );
}

/* editor de grupo + pré-requisitos de um curso */
function CursoConfig({ id, onClose }) {
  const c = S.CURSOS.find((x) => x.id === id);
  const [grupo, setGrupo] = useState(c ? c.grupo : '');
  const [reqs, setReqs] = useState(c ? [...(c.preReqs || [])] : []);
  if (!c) return null;
  const outros = S.CURSOS.filter((x) => x.id !== id);
  const tog = (v) => setReqs((r) => r.includes(v) ? r.filter((x) => x !== v) : [...r, v]);
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Configurar curso</div>
          <div className="modal-title">{c.nome}</div>
          <div className="modal-sub">Em qual grupo ele fica e o que a pessoa precisa concluir antes de se inscrever.</div>
        </div>
        <div className="modal-body">
          <div className="field">
            <label className="field-label">Grupo</label>
            <select className="select" value={grupo} onChange={(e) => setGrupo(e.target.value)}>
              {(S.CURSO_GRUPOS || []).map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field-label">Pré-requisitos para se inscrever</label>
            <div className="seg-check">
              {outros.length === 0 && <span style={{ fontSize: 12, color: 'var(--subtle)' }}>Nenhum outro curso ainda.</span>}
              {outros.map((o) => <button key={o.id} className={`seg-chip ${reqs.includes(o.id) ? 'on' : ''}`} onClick={() => tog(o.id)}>{o.nome}</button>)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--subtle)', marginTop: 8 }}>Quem não concluiu esses cursos não consegue se inscrever neste.</div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-sec" onClick={onClose}>Cancelar</button>
          <button className="btn btn-pri" onClick={() => { c.grupo = grupo; c.preReqs = reqs; cexRefresh(); cexToast('Curso atualizado.'); onClose(); }}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Cursos, CursoDrawer, CursoBuilder, CursoConfig, CURSO_TIPO });
