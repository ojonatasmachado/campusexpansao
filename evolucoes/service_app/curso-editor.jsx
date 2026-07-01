/* ════════════════════════════════════════════════════════════════
   CE.X SERVICE · EDITOR DE CURSO (criação rica)
   Onde fica (grupo), modalidade (presencial/remoto/híbrido/ao vivo),
   módulos e aulas (vídeo/texto/ao vivo), e prova ao fim de cada aula.
   ════════════════════════════════════════════════════════════════ */

const MODALIDADES = [
  { v: 'presencial', l: 'Presencial', ic: '◆' },
  { v: 'remoto', l: 'Remoto · no app', ic: '◷' },
  { v: 'hibrido', l: 'Híbrido', ic: '◈' },
  { v: 'ao_vivo', l: 'Ao vivo · online', ic: '▶' },
];
const AULA_TIPOS = [
  { v: 'video', l: 'Vídeo', ic: '▷' },
  { v: 'texto', l: 'Texto', ic: '◇' },
  { v: 'ao_vivo', l: 'Ao vivo', ic: '▶' },
  { v: 'presencial', l: 'Presencial', ic: '◆' },
];
const MAT_TIPOS = [{ v: 'video', l: 'Vídeo' }, { v: 'link', l: 'Link / PDF' }, { v: 'texto', l: 'Texto' }];

/* mini editor de texto rico (negrito, itálico, título, listas, link).
   O professor edita; o aluno depois só visualiza (render do HTML). */
function RichText({ value, onChange, placeholder, minH }) {
  const ref = React.useRef(null);
  React.useEffect(() => { if (ref.current && ref.current.innerHTML !== (value || '')) ref.current.innerHTML = value || ''; }, []);
  const cmd = (c, val) => { document.execCommand(c, false, val); if (ref.current) { ref.current.focus(); onChange(ref.current.innerHTML); } };
  const link = () => { const u = window.prompt('Endereço do link (https://...)'); if (u) cmd('createLink', u); };
  return (
    <div className="rt">
      <div className="rt-bar">
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => cmd('bold')} title="Negrito"><b>B</b></button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => cmd('italic')} title="Itálico"><i>I</i></button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => cmd('formatBlock', '<h3>')} title="Título">Título</button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => cmd('insertUnorderedList')} title="Lista">• Lista</button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => cmd('insertOrderedList')} title="Lista numerada">1. Lista</button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={link} title="Link">↗ Link</button>
      </div>
      <div className="rt-area" ref={ref} contentEditable suppressContentEditableWarning data-ph={placeholder || 'Escreva aqui…'} style={{ minHeight: minH || 120 }} onInput={(e) => onChange(e.currentTarget.innerHTML)}></div>
    </div>
  );
}

/* materiais de divulgação do curso (antes de inscrever) */
function MateriaisEditor({ value, onChange }) {
  const lista = Array.isArray(value) ? value : [];
  const [tipo, setTipo] = useState('video');
  const [titulo, setTitulo] = useState('');
  const [url, setUrl] = useState('');
  const add = () => { if (!titulo.trim()) return; onChange([...lista, { id: cexId('mat'), tipo, titulo: titulo.trim(), url: url.trim() }]); setTitulo(''); setUrl(''); };
  const del = (id) => onChange(lista.filter((m) => m.id !== id));
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
        {lista.map((m) => (
          <div className="mat-row" key={m.id}>
            <span className="mat-tipo">{(MAT_TIPOS.find((t) => t.v === m.tipo) || {}).l || m.tipo}</span>
            <div className="mat-main"><div className="mat-titulo">{m.titulo}</div>{m.url && <div className="mat-url">{m.url}</div>}</div>
            <button className="ce-x" onClick={() => del(m.id)} title="Remover">✕</button>
          </div>
        ))}
        {lista.length === 0 && <div style={{ fontSize: 12, color: 'var(--subtle)' }}>Nenhum material ainda. Adicione vídeos, links ou textos para apresentar o curso.</div>}
      </div>
      <div className="mat-add">
        <select className="select" style={{ flex: '0 0 110px' }} value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {MAT_TIPOS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
        </select>
        <input className="input" placeholder="Título (ex: Chamada do curso)" value={titulo} onChange={(e) => setTitulo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <input className="input" placeholder="Link (YouTube, PDF…)" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button className="btn btn-sec btn-sm" onClick={add}>+ Material</button>
      </div>
    </div>
  );
}

function blankCurso(grupo) {
  return {
    id: null, nome: '', grupo: grupo || (S.CURSO_GRUPOS[0] && S.CURSO_GRUPOS[0].id) || 'entrada',
    tipo: 'trilha', modalidade: 'remoto', nivel: 'Entrada', cor: 'olive', desc: '', divulgacao: '', materiais: [], preReqs: [],
    modulos: [{ id: cexId('mod'), nome: 'Módulo 1', aulas: [] }], matriculados: 0, concluintes: 0,
  };
}

function CursoEditor({ id, grupo, onClose }) {
  const orig = id ? S.CURSOS.find((c) => c.id === id) : null;
  const [c, setC] = useState(() => orig ? JSON.parse(JSON.stringify(orig)) : blankCurso(grupo));
  const [quiz, setQuiz] = useState(null); // {mi, ai} aula em edição de prova
  const set = (k, v) => setC((p) => ({ ...p, [k]: v }));

  /* módulos */
  const addModulo = () => setC((p) => ({ ...p, modulos: [...p.modulos, { id: cexId('mod'), nome: 'Módulo ' + (p.modulos.length + 1), aulas: [] }] }));
  const setModulo = (mi, k, v) => setC((p) => { const m = [...p.modulos]; m[mi] = { ...m[mi], [k]: v }; return { ...p, modulos: m }; });
  const delModulo = (mi) => setC((p) => ({ ...p, modulos: p.modulos.filter((_, i) => i !== mi) }));
  /* aulas */
  const addAula = (mi) => setC((p) => { const m = [...p.modulos]; m[mi] = { ...m[mi], aulas: [...m[mi].aulas, { id: cexId('a'), nome: '', tipo: 'video', dur: '', link: '', prova: null }] }; return { ...p, modulos: m }; });
  const setAula = (mi, ai, k, v) => setC((p) => { const m = [...p.modulos]; const a = [...m[mi].aulas]; a[ai] = { ...a[ai], [k]: v }; m[mi] = { ...m[mi], aulas: a }; return { ...p, modulos: m }; });
  const delAula = (mi, ai) => setC((p) => { const m = [...p.modulos]; m[mi] = { ...m[mi], aulas: m[mi].aulas.filter((_, i) => i !== ai) }; return { ...p, modulos: m }; });

  const totalAulas = c.modulos.reduce((n, m) => n + m.aulas.length, 0);
  const outros = S.CURSOS.filter((x) => x.id !== c.id);
  const togReq = (v) => set('preReqs', c.preReqs.includes(v) ? c.preReqs.filter((x) => x !== v) : [...c.preReqs, v]);

  const salvar = () => {
    if (!c.nome.trim()) { cexToast('Dê um nome ao curso.', 'warn'); return; }
    const capa = ({ trilha: 'Trilha', conteudo: 'Conteúdo no app', presencial: 'Presencial' })[c.tipo] + ' · ' + (MODALIDADES.find((m) => m.v === c.modalidade) || {}).l;
    if (orig) { Object.assign(orig, c, { capa }); }
    else { S.CURSOS.push({ ...c, id: cexId('cs'), capa }); }
    cexRefresh(); cexToast(orig ? 'Curso atualizado.' : 'Curso “' + c.nome + '” criado.'); onClose();
  };

  return (
    <div className="ce-page">
      <div className="ce-page-bar">
        <button className="ce-page-back" onClick={onClose}><span aria-hidden="true">←</span> Cursos</button>
        <div className="ce-page-bar-title">{orig ? 'Editar curso' : 'Novo curso'}{c.nome ? ' · ' + c.nome : ''}</div>
        <div className="ce-page-bar-actions">
          <button className="btn btn-sec" onClick={onClose}>Cancelar</button>
          <button className="btn btn-pri" onClick={salvar}>{orig ? 'Salvar curso' : 'Criar curso'}</button>
        </div>
      </div>
      <div className="ce-page-scroll">
        <div className="ce-page-inner">
          <div className="ph-eyebrow" style={{ marginBottom: 8 }}>{orig ? 'Editar curso' : 'Novo curso'}</div>
          <input className="ce-title-input" placeholder="Nome do curso" value={c.nome} onChange={(e) => set('nome', e.target.value)} />
          {/* identificação */}
          <div className="dsec" style={{ marginTop: 0 }}>
            <div className="dsec-title">Onde fica & como é</div>
            <div className="ce-grid">
              <div className="field"><label className="field-label">Grupo de cursos</label>
                <select className="select" value={c.grupo} onChange={(e) => set('grupo', e.target.value)}>
                  {S.CURSO_GRUPOS.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
                </select></div>
              <div className="field"><label className="field-label">Nível</label><input className="input" value={c.nivel} placeholder="Entrada, Discipulado..." onChange={(e) => set('nivel', e.target.value)} /></div>
            </div>
            <div className="field"><label className="field-label">Formato</label>
              <div className="seg-check">
                {[{ v: 'trilha', l: 'Trilha (módulos)' }, { v: 'conteudo', l: 'Conteúdo no app' }, { v: 'presencial', l: 'Presencial' }].map((o) => (
                  <button key={o.v} className={`seg-chip ${c.tipo === o.v ? 'on' : ''}`} onClick={() => set('tipo', o.v)}>{o.l}</button>
                ))}
              </div>
            </div>
            <div className="field"><label className="field-label">Modalidade</label>
              <div className="seg-check">
                {MODALIDADES.map((o) => <button key={o.v} className={`seg-chip ${c.modalidade === o.v ? 'on' : ''}`} onClick={() => set('modalidade', o.v)}>{o.ic} {o.l}</button>)}
              </div>
            </div>
            <div className="field"><label className="field-label">Descrição</label><textarea className="textarea" value={c.desc} placeholder="Para quem é e o que vão aprender" onChange={(e) => set('desc', e.target.value)} /></div>
            <div className="field"><label className="field-label">Cor</label>
              <div className="seg-check">
                {[{ v: 'olive', l: 'Oliva' }, { v: 'wheat', l: 'Trigo' }, { v: 'clay', l: 'Clay' }].map((o) => <button key={o.v} className={`seg-chip ${c.cor === o.v ? 'on' : ''}`} onClick={() => set('cor', o.v)}>{o.l}</button>)}
              </div>
            </div>
          </div>

          {/* divulgação (antes de inscrever) */}
          <div className="dsec">
            <div className="dsec-title">Divulgação · antes de inscrever</div>
            <div className="cfg-card-s" style={{ marginBottom: 12 }}>Apresentação que aparece para quem ainda não se inscreveu, para gerar curiosidade. Texto livre + materiais (vídeos, links, PDFs).</div>
            <div className="field"><label className="field-label">Texto de apresentação</label>
              <RichText value={c.divulgacao} onChange={(v) => set('divulgacao', v)} placeholder="O que é, para quem é, por que fazer…" minH={120} />
            </div>
            <div className="field"><label className="field-label">Materiais de divulgação</label>
              <MateriaisEditor value={c.materiais} onChange={(v) => set('materiais', v)} />
            </div>
          </div>

          {/* pré-requisitos */}
          <div className="dsec">
            <div className="dsec-title">Pré-requisitos para se inscrever</div>
            <div className="seg-check">
              {outros.length === 0 && <span style={{ fontSize: 12, color: 'var(--subtle)' }}>Nenhum outro curso ainda.</span>}
              {outros.map((o) => <button key={o.id} className={`seg-chip ${c.preReqs.includes(o.id) ? 'on' : ''}`} onClick={() => togReq(o.id)}>{o.nome}</button>)}
            </div>
          </div>

          {/* conteúdo */}
          <div className="dsec">
            <div className="dsec-title">Conteúdo · {c.modulos.length} módulos · {totalAulas} aulas</div>
            {c.modulos.map((m, mi) => (
              <div className="ce-mod" key={m.id}>
                <div className="ce-mod-head">
                  <span className="ce-mod-n">{String(mi + 1).padStart(2, '0')}</span>
                  <input className="ce-mod-name" value={m.nome} onChange={(e) => setModulo(mi, 'nome', e.target.value)} />
                  <button className="ce-x" onClick={() => delModulo(mi)} title="Remover módulo">✕</button>
                </div>
                {m.aulas.map((a, ai) => (
                  <div className="ce-aula" key={a.id}>
                    <div className="ce-aula-row">
                      <input className="input ce-aula-name" placeholder="Título da aula" value={a.nome} onChange={(e) => setAula(mi, ai, 'nome', e.target.value)} />
                      <select className="select ce-aula-tipo" value={a.tipo} onChange={(e) => setAula(mi, ai, 'tipo', e.target.value)}>
                        {AULA_TIPOS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
                      </select>
                      <button className="ce-x" onClick={() => delAula(mi, ai)} title="Remover aula">✕</button>
                    </div>
                    <div className="ce-aula-row">
                      {(a.tipo === 'video' || a.tipo === 'ao_vivo') && <input className="input" placeholder="Link do vídeo (YouTube, Vimeo...)" value={a.link} onChange={(e) => setAula(mi, ai, 'link', e.target.value)} />}
                      <input className="input ce-aula-dur" placeholder="Duração (ex: 8 min)" value={a.dur} onChange={(e) => setAula(mi, ai, 'dur', e.target.value)} />
                    </div>
                    {a.tipo === 'texto' && (
                      <div className="ce-aula-conteudo">
                        <div className="ce-aula-conteudo-lbl">Conteúdo da aula (o aluno lê no app)</div>
                        <RichText value={a.conteudo} onChange={(v) => setAula(mi, ai, 'conteudo', v)} placeholder="Escreva a aula: texto, tópicos, versículos…" minH={140} />
                      </div>
                    )}
                    {(a.tipo === 'video' || a.tipo === 'ao_vivo' || a.tipo === 'presencial') && (
                      <div className="ce-aula-conteudo">
                        <div className="ce-aula-conteudo-lbl">Material de apoio (opcional)</div>
                        <RichText value={a.conteudo} onChange={(v) => setAula(mi, ai, 'conteudo', v)} placeholder="Resumo, referências, o que estudar antes…" minH={90} />
                      </div>
                    )}
                    <button className={`ce-prova ${a.prova ? 'on' : ''}`} onClick={() => setQuiz({ mi, ai })}>
                      {a.prova && a.prova.length ? `◆ Prova · ${a.prova.length} pergunta(s)${a.minAcertos ? ' · mín. ' + a.minAcertos : ''}` : '+ Adicionar prova ao fim da aula'}
                    </button>
                  </div>
                ))}
                <button className="cb-add" onClick={() => addAula(mi)}>+ aula neste módulo</button>
              </div>
            ))}
            <button className="btn btn-sec btn-sm" style={{ marginTop: 12 }} onClick={addModulo}>+ Novo módulo</button>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
            <button className="btn btn-pri" style={{ flex: 1, justifyContent: 'center' }} onClick={salvar}>{orig ? 'Salvar curso' : 'Criar curso'}</button>
            <button className="btn btn-sec" onClick={onClose}>Cancelar</button>
          </div>
        </div>
        </div>

        {quiz && <QuizEditor curso={c} mi={quiz.mi} ai={quiz.ai} onSave={(prova, minAcertos) => { setAula(quiz.mi, quiz.ai, 'prova', prova); setAula(quiz.mi, quiz.ai, 'minAcertos', minAcertos); setQuiz(null); }} onClose={() => setQuiz(null)} />}
    </div>
  );
}

/* editor de prova (perguntas de múltipla escolha) */
function QuizEditor({ curso, mi, ai, onSave, onClose }) {
  const aula = curso.modulos[mi].aulas[ai];
  const [qs, setQs] = useState(() => aula.prova ? JSON.parse(JSON.stringify(aula.prova)) : []);
  const [minA, setMinA] = useState(() => aula.minAcertos != null ? aula.minAcertos : '');
  const add = () => setQs((p) => [...p, { q: '', opts: ['', '', ''], correta: 0 }]);
  const setQ = (i, k, v) => setQs((p) => { const a = [...p]; a[i] = { ...a[i], [k]: v }; return a; });
  const setOpt = (i, oi, v) => setQs((p) => { const a = [...p]; const o = [...a[i].opts]; o[oi] = v; a[i] = { ...a[i], opts: o }; return a; });
  const del = (i) => setQs((p) => p.filter((_, x) => x !== i));
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Prova de evolução</div>
          <div className="modal-title">{aula.nome || 'Aula'}</div>
          <div className="modal-sub">Perguntas que a pessoa responde ao terminar a aula. Marque a alternativa correta.</div>
        </div>
        <div className="modal-body" style={{ display: 'block', maxHeight: '54vh' }}>
          <div className="quiz-cfg">
            <div className="quiz-cfg-main">
              <div className="quiz-cfg-t">Mínimo de acertos para aprovar</div>
              <div className="quiz-cfg-s">Quantas perguntas a pessoa precisa acertar para concluir a aula. A barra de progresso aparece para o aluno conforme avança.</div>
            </div>
            <div className="stepper">
              <button onClick={() => setMinA((n) => Math.max(0, (parseInt(n, 10) || 0) - 1))}>−</button>
              <span>{minA === '' ? Math.max(1, Math.ceil(qs.length * 0.7)) : minA}</span>
              <button onClick={() => setMinA((n) => Math.min(qs.length, (parseInt(n, 10) || 0) + 1))}>+</button>
            </div>
            <span className="quiz-cfg-tot">de {qs.length}</span>
          </div>
          {qs.length === 0 && <div className="empty" style={{ padding: '24px 0' }}>Sem perguntas ainda.</div>}
          {qs.map((q, i) => (
            <div className="quiz-q" key={i}>
              <div className="quiz-q-head">
                <span className="quiz-q-n">{i + 1}</span>
                <input className="input" placeholder="Enunciado da pergunta" value={q.q} onChange={(e) => setQ(i, 'q', e.target.value)} />
                <button className="ce-x" onClick={() => del(i)}>✕</button>
              </div>
              {q.opts.map((o, oi) => (
                <div className="quiz-opt" key={oi}>
                  <button className={`quiz-radio ${q.correta === oi ? 'on' : ''}`} onClick={() => setQ(i, 'correta', oi)} title="Correta">{q.correta === oi ? '●' : '○'}</button>
                  <input className="input" placeholder={`Alternativa ${oi + 1}`} value={o} onChange={(e) => setOpt(i, oi, e.target.value)} />
                </div>
              ))}
            </div>
          ))}
          <button className="btn btn-sec btn-sm" style={{ marginTop: 12 }} onClick={add}>+ Pergunta</button>
        </div>
        <div className="modal-foot">
          <button className="btn btn-sec" onClick={onClose}>Cancelar</button>
          <button className="btn btn-pri" onClick={() => { const limpa = qs.filter((q) => q.q.trim()); const min = minA === '' ? Math.max(1, Math.ceil(limpa.length * 0.7)) : Math.min(limpa.length, Math.max(0, parseInt(minA, 10) || 0)); onSave(limpa, min); }}>Salvar prova</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CursoEditor, QuizEditor, MODALIDADES });
