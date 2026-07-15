/* CE.X Service · Avaliação de Experiência — componentes (membro + admin) */
const { useState } = React;

function QField({ q, value, onChange }) {
  if (q.tipo === 'nota') {
    const max = q.escala || 10;
    const opts = Array.from({ length: max + 1 }, (_, i) => i);
    return (
      <div className="seg-check">
        {opts.map((i) => <button key={i} type="button" className={`seg-chip ${value === i ? 'on' : ''}`} onClick={() => onChange(i)}>{i}</button>)}
      </div>
    );
  }
  if (q.tipo === 'texto') return <textarea className="textarea" placeholder="Escreva aqui..." value={value || ''} onChange={(e) => onChange(e.target.value)} />;
  if (q.tipo === 'emoji') return <div className="seg-check">{REACOES.map((r) => <button key={r} type="button" className={`seg-chip ${value === r ? 'on' : ''}`} onClick={() => onChange(r)}>{r}</button>)}</div>;
  if (q.tipo === 'simnao') return <div className="seg-check">{['Sim', 'Não'].map((r) => <button key={r} type="button" className={`seg-chip ${value === r ? 'on' : ''}`} onClick={() => onChange(r)}>{r}</button>)}</div>;
  if (q.tipo === 'multipla') return <div className="seg-check">{(q.opcoes || []).map((o) => <button key={o} type="button" className={`seg-chip ${value === o ? 'on' : ''}`} onClick={() => onChange(o)}>{o}</button>)}</div>;
  return null;
}

/* ═══════ MEMBRO (mobile) ═══════ */
function AvaliacaoQuickCard({ onOpen, temLivre }) {
  return (
    <div className="m-card" onClick={temLivre ? onOpen : undefined} style={{ cursor: temLivre ? 'pointer' : 'default', opacity: temLivre ? 1 : 0.5 }}>
      <div className="m-card-top">
        <span className="m-when"><Icon name="estrela" size={12} style={{ verticalAlign: '-2px', marginRight: 5 }} />Avaliação</span>
      </div>
      <div className="m-culto" style={{ fontSize: 15 }}>Avaliar minha experiência</div>
      <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>{temLivre ? 'Leva menos de um minuto. Ajuda sua liderança a cuidar melhor do time.' : 'Nenhuma avaliação livre ativa no momento.'}</div>
    </div>
  );
}

function AvaliacaoSheet({ survey, onClose, onDone }) {
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState({});
  const q = survey.perguntas[i];
  const last = i === survey.perguntas.length - 1;
  const next = () => {
    if (last) {
      const resp = { id: cexUid('r'), papel: 'Voluntário', data: new Date().toISOString().slice(0, 10), respostasPerguntas: Object.keys(answers).map((k) => ({ perguntaId: k, valor: answers[k] })) };
      onDone(resp);
    } else setI(i + 1);
  };
  return (
    <div className="m-sheet-bg" onClick={onClose}>
      <div className="m-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="m-sheet-grip"></div>
        <div className="m-sheet-eyebrow">{survey.nome}</div>
        <div className="m-sheet-head" style={{ marginBottom: 8 }}>
          <div className="m-team-mark" style={{ width: 38, height: 38 }}><Icon name={QUESTION_ICON[q.tipo]} size={18} /></div>
          <div className="m-sheet-title" style={{ fontSize: 16 }}>{q.texto}</div>
        </div>
        <div style={{ margin: '18px 0 22px' }}><QField q={q} value={answers[q.id]} onChange={(v) => setAnswers({ ...answers, [q.id]: v })} /></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 5 }}>{survey.perguntas.map((_, idx) => <span key={idx} style={{ width: 5, height: 5, borderRadius: '50%', background: idx === i ? 'var(--olive)' : 'var(--border-2)' }}></span>)}</div>
          <button className="m-btn m-btn-ok" onClick={next}>{last ? 'Enviar' : 'Próxima →'}</button>
        </div>
      </div>
    </div>
  );
}

function AvaliacaoMemberDemo() {
  const [surveys, setSurveys] = useState(() => cexLoadSurveys());
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const livre = surveys.find((s) => s.disparo.ativoComoLivre && s.status === 'ativa');
  const submit = (resp) => {
    livre.respostas.push(resp);
    cexSaveSurveys(surveys);
    setSurveys([...surveys]);
    setOpen(false);
    setDone(true);
    setTimeout(() => setDone(false), 2200);
  };
  return (
    <div className="phone">
      <div className="phone-screen">
        <div className="phone-notch"></div>
        <div className="m-statusbar"><span>9:41</span><span>CE.X ◆</span></div>
        <div className="m-head"><div className="m-culto" style={{ fontSize: 20 }}>Início</div></div>
        <div className="m-scroll">
          <div className="m-section-t">Atalhos</div>
          <AvaliacaoQuickCard onOpen={() => setOpen(true)} temLivre={!!livre} />
          {done && <div className="m-card" style={{ borderColor: 'var(--olive-line)', textAlign: 'center' }}><div style={{ color: 'var(--olive-soft)', fontWeight: 600, fontSize: 13 }}>◆ Obrigado pela resposta</div></div>}
        </div>
        <div className="m-tab">
          <button className="on"><span className="ic"><Icon name="inicio" size={16} /></span>Início</button>
          <button><span className="ic"><Icon name="escalas" size={16} /></span>Escala</button>
          <button><span className="ic"><Icon name="tarefas" size={16} /></span>Tarefas</button>
          <button><span className="ic"><Icon name="conversas" size={16} /></span>Conversas</button>
          <button><span className="ic"><Icon name="perfil" size={16} /></span>Perfil</button>
        </div>
        {open && livre && <AvaliacaoSheet survey={livre} onClose={() => setOpen(false)} onDone={submit} />}
      </div>
    </div>
  );
}

/* ═══════ ADMIN (desktop) ═══════ */
function segLabel(seg, contexto) {
  if (seg.modo === 'todos') return 'Todos os usuários';
  if (seg.modo === 'papel') return 'Papel: ' + seg.valores.join(', ');
  if (seg.modo === 'time') return 'Time: ' + seg.valores.join(', ');
  if (seg.modo === 'estante') return 'Estante/curso: ' + seg.valores.join(', ');
  if (seg.modo === 'lista') return `Lista manual (${seg.valores.length})`;
  return '';
}
function disparoLabel(d, contexto) {
  const modos = disparoModesFor(contexto);
  const found = modos.find((m) => m.key === d.modo);
  if (d.modo === 'livre') return 'Livre' + (d.ativoComoLivre ? ' · ativa' : '');
  if (d.modo === 'periodica') return `Periódica · ${d.intervaloDias}d`;
  if (d.modo === 'posescala') return `Pós-escala · ${d.horasDepois || 3}h`;
  if (d.modo === 'posdownload') return 'Pós-download';
  return found ? found.label : 'Campanha';
}
function contextoLabel(c) { return c === 'site' ? 'Site de materiais' : 'Service'; }

function AdminLista({ surveys, onOpen, onNova }) {
  return (
    <>
      <div className="ph">
        <div><div className="ph-eyebrow">Avaliação de experiência</div><h1 className="ph-title">Enquetes & <em>pulsos</em></h1><p className="ph-sub">Livre a qualquer hora, campanha pontual ou pulso periódico, com resultados filtráveis por papel e período.</p></div>
        <div className="ph-actions"><button className="btn btn-pri" onClick={onNova}>+ Nova enquete</button></div>
      </div>
      <div className="kpi-row">
        <div className="kpi"><div className="kpi-label">Enquetes ativas</div><div className="kpi-value">{surveys.filter((s) => s.status === 'ativa').length}</div></div>
        <div className="kpi"><div className="kpi-label">Respostas totais</div><div className="kpi-value">{surveys.reduce((a, s) => a + s.respostas.length, 0)}</div></div>
        <div className="kpi"><div className="kpi-label">Livre ativa</div><div className="kpi-value" style={{ fontSize: 18 }}>{(surveys.find((s) => s.disparo.ativoComoLivre) || {}).nome || '— nenhuma —'}</div></div>
        <div className="kpi"><div className="kpi-label">Periódicas em curso</div><div className="kpi-value">{surveys.filter((s) => s.disparo.modo === 'periodica' && s.status === 'ativa').length}</div></div>
      </div>
      <div className="tbl">
        {surveys.map((s) => (
          <div className="tr" key={s.id} style={{ gridTemplateColumns: '1fr auto auto auto', cursor: 'pointer' }} onClick={() => onOpen(s.id)}>
            <div><div style={{ fontWeight: 600, color: 'var(--white)' }}>{s.nome}</div><div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{contextoLabel(s.contexto)} · {s.perguntas.length} pergunta(s) · {segLabel(s.segmentacao, s.contexto)}</div></div>
            <span className="chip chip-neutral">{disparoLabel(s.disparo, s.contexto)}</span>
            <span className={`chip ${s.status === 'ativa' ? 'chip-ok' : 'chip-neutral'}`}>{s.status === 'ativa' ? 'Ativa' : 'Pausada'}</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>{s.respostas.length} respostas</span>
          </div>
        ))}
      </div>
    </>
  );
}

function newDraft() { return { id: cexUid('sv'), nome: '', contexto: 'service', status: 'ativa', perguntas: [{ id: cexUid('q'), tipo: 'nota', escala: 10, texto: '' }], segmentacao: { modo: 'todos', valores: [] }, disparo: { modo: 'livre', ativoComoLivre: false, intervaloDias: 7, horasDepois: 3 }, criadoEm: new Date().toISOString().slice(0, 10), respostas: [] }; }

function SectionDivide({ n, label }) { return <div className="section-divide"><span className="num">{n}</span><span className="label">{label}</span><span className="line"></span></div>; }

function PreviewCard({ d }) {
  const [vals, setVals] = useState({});
  const isSite = d.contexto === 'site';
  return (
    <div className="panel" style={{ position: 'sticky', top: 20 }}>
      <div className="panel-head"><div className="panel-title"><Icon name={isSite ? 'globo' : 'inicio'} size={14} className="ic" />Pré-visualização</div><div className="panel-meta">{contextoLabel(d.contexto)}</div></div>
      <div className="panel-body">
        {isSite && <div style={{ fontSize: 11.5, color: 'var(--subtle)', marginBottom: 14, lineHeight: 1.5 }}>No site, isto aparece como um modal centralizado (componentes do cex-brand-library). Conteúdo abaixo é o mesmo, simplificado.</div>}
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--olive)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 10 }}>{d.nome || 'Sem nome ainda'}</div>
        {d.perguntas.map((q, idx) => (
          <div key={q.id} style={{ padding: '14px 0', borderBottom: idx < d.perguntas.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ color: 'var(--olive)', display: 'flex' }}><Icon name={QUESTION_ICON[q.tipo]} size={15} /></div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--white)' }}>{q.texto || <em style={{ color: 'var(--subtle)', fontStyle: 'normal' }}>Escreva a pergunta {idx + 1}...</em>}</div>
            </div>
            <QField q={q} value={vals[q.id]} onChange={(v) => setVals({ ...vals, [q.id]: v })} />
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminEditor({ draft: initial, onSave, onCancel }) {
  const [d, setD] = useState(initial);
  const setPerg = (arr) => setD({ ...d, perguntas: arr });
  const segModes = segModesFor(d.contexto);
  const disparoModes = disparoModesFor(d.contexto);
  const disparoAtual = disparoModes.find((m) => m.key === d.disparo.modo) || disparoModes[0];
  return (
    <>
      <div className="ph">
        <div><div className="ph-eyebrow">Avaliação de experiência</div><h1 className="ph-title">{initial.nome ? 'Editar enquete' : 'Nova enquete'}</h1><p className="ph-sub">Onde aparece decide o resto: perguntas iguais, mas segmentação e disparo seguem as regras de cada produto.</p></div>
        <div className="ph-actions"><button className="btn btn-sec" onClick={onCancel}>Cancelar</button><button className="btn btn-pri" onClick={() => onSave(d)} disabled={!d.nome}>Salvar enquete</button></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
        <div>
          <div className="panel">
            <div className="panel-body">
              <div className="field"><label className="field-label">Nome da enquete</label><input className="input" value={d.nome} onChange={(e) => setD({ ...d, nome: e.target.value })} placeholder="Ex.: Pulso mensal de bem-estar" /></div>
              <div className="field" style={{ marginBottom: 0 }}><label className="field-label">Onde aparece</label>
                <div className="seg" style={{ width: '100%' }}>{['service', 'site'].map((c) => <button key={c} style={{ flex: 1 }} className={d.contexto === c ? 'on' : ''} onClick={() => setD({ ...d, contexto: c, segmentacao: { modo: 'todos', valores: [] }, disparo: { ...d.disparo, modo: 'livre' } })}>{contextoLabel(c)}</button>)}</div>
              </div>
            </div>
          </div>

          <SectionDivide n="01" label="Segmentação · quem recebe" />
          <div className="panel"><div className="panel-body">
            {segModes.map((m) => (
              <label key={m.key} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 0', borderBottom: '0.5px solid var(--border)', cursor: 'pointer' }}>
                <input type="radio" checked={d.segmentacao.modo === m.key} onChange={() => setD({ ...d, segmentacao: { modo: m.key, valores: [] } })} style={{ marginTop: 3 }} />
                <div><div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--light)' }}>{m.label}</div><div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{m.hint}</div></div>
              </label>
            ))}
            {d.segmentacao.modo === 'papel' && <div className="field" style={{ marginTop: 16, marginBottom: 0 }}><div className="seg-check">{papeisFor(d.contexto).map((p) => <button key={p} type="button" className={`seg-chip ${d.segmentacao.valores.includes(p) ? 'on' : ''}`} onClick={() => { const v = d.segmentacao.valores; setD({ ...d, segmentacao: { ...d.segmentacao, valores: v.includes(p) ? v.filter((x) => x !== p) : [...v, p] } }); }}>{p}</button>)}</div></div>}
            {d.segmentacao.modo === 'time' && <div className="field" style={{ marginTop: 16, marginBottom: 0 }}><div className="seg-check">{TIMES_SERVICE.map((t) => <button key={t} type="button" className={`seg-chip ${d.segmentacao.valores.includes(t) ? 'on' : ''}`} onClick={() => { const v = d.segmentacao.valores; setD({ ...d, segmentacao: { ...d.segmentacao, valores: v.includes(t) ? v.filter((x) => x !== t) : [...v, t] } }); }}>{t}</button>)}</div></div>}
            {d.segmentacao.modo === 'estante' && <div className="field" style={{ marginTop: 16, marginBottom: 0 }}><input className="input" placeholder="Ex.: Jovens, Formação de Líderes" value={d.segmentacao.valores.join(', ')} onChange={(e) => setD({ ...d, segmentacao: { ...d.segmentacao, valores: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } })} /></div>}
            {d.segmentacao.modo === 'lista' && <div className="field" style={{ marginTop: 16, marginBottom: 0 }}><textarea className="textarea" placeholder="Um e-mail por linha" value={d.segmentacao.valores.join('\n')} onChange={(e) => setD({ ...d, segmentacao: { ...d.segmentacao, valores: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) } })} /></div>}
          </div></div>

          <SectionDivide n="02" label="Perguntas · o que perguntar" />
          <div className="panel"><div className="panel-body">
            {d.perguntas.map((q, idx) => (
              <div key={q.id} style={{ background: 'var(--ink)', border: '0.5px solid var(--border-2)', borderRadius: 'var(--r-md)', padding: 16, marginBottom: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '190px 1fr', gap: 10, marginBottom: 10 }}>
                  <select className="select" value={q.tipo} onChange={(e) => { const arr = [...d.perguntas]; arr[idx] = { ...q, tipo: e.target.value, escala: e.target.value === 'nota' ? 10 : undefined, opcoes: e.target.value === 'multipla' ? ['', ''] : undefined }; setPerg(arr); }}>
                    {Object.keys(QUESTION_LABEL).map((t) => <option key={t} value={t}>{QUESTION_LABEL[t]}</option>)}
                  </select>
                  <input className="input" placeholder="Texto da pergunta" value={q.texto} onChange={(e) => { const arr = [...d.perguntas]; arr[idx] = { ...q, texto: e.target.value }; setPerg(arr); }} />
                </div>
                {q.tipo === 'nota' && <div className="field" style={{ marginBottom: 8 }}><select className="select" style={{ width: '100%' }} value={q.escala} onChange={(e) => { const arr = [...d.perguntas]; arr[idx] = { ...q, escala: Number(e.target.value) }; setPerg(arr); }}><option value="5">Escala 1 a 5</option><option value="10">Escala 0 a 10 (NPS)</option></select></div>}
                {q.tipo === 'multipla' && <div className="field" style={{ marginBottom: 8 }}><input className="input" placeholder="Opções separadas por vírgula" value={(q.opcoes || []).join(', ')} onChange={(e) => { const arr = [...d.perguntas]; arr[idx] = { ...q, opcoes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }; setPerg(arr); }} /></div>}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setPerg(d.perguntas.filter((x) => x.id !== q.id))}>Remover</button></div>
              </div>
            ))}
            <button className="btn btn-sec" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setPerg([...d.perguntas, { id: cexUid('q'), tipo: 'nota', escala: 10, texto: '' }])}>+ Adicionar pergunta</button>
          </div></div>

          <SectionDivide n="03" label="Disparo · quando aparece" />
          <div className="panel"><div className="panel-body">
            <div className="seg" style={{ width: '100%', marginBottom: 10 }}>{disparoModes.map((m) => <button key={m.key} style={{ flex: 1 }} className={d.disparo.modo === m.key ? 'on' : ''} onClick={() => setD({ ...d, disparo: { ...d.disparo, modo: m.key, ativoComoLivre: m.key === 'livre' ? d.disparo.ativoComoLivre : false } })}>{m.label}</button>)}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>{disparoAtual.hint}</div>
            {d.disparo.modo === 'livre' && <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: 'var(--light)', cursor: 'pointer' }}><input type="checkbox" checked={d.disparo.ativoComoLivre} onChange={(e) => setD({ ...d, disparo: { ...d.disparo, ativoComoLivre: e.target.checked } })} style={{ marginTop: 2 }} />Ativar como a avaliação livre {d.contexto === 'site' ? 'do site de materiais' : 'do Service'} (só uma pode estar ativa por vez).</label>}
            {d.disparo.modo === 'periodica' && <div className="field" style={{ marginBottom: 0 }}><label className="field-label">Reaparece a cada quantos dias</label><input className="input" type="number" min="1" value={d.disparo.intervaloDias || 7} onChange={(e) => setD({ ...d, disparo: { ...d.disparo, intervaloDias: Number(e.target.value) } })} /></div>}
            {d.disparo.modo === 'posescala' && <div className="field" style={{ marginBottom: 0 }}><label className="field-label">Horas depois de confirmar presença</label><input className="input" type="number" min="1" value={d.disparo.horasDepois || 3} onChange={(e) => setD({ ...d, disparo: { ...d.disparo, horasDepois: Number(e.target.value) } })} /></div>}
          </div></div>
        </div>
        <PreviewCard d={d} />
      </div>
    </>
  );
}

function AdminResultados({ survey, onVoltar }) {
  const [periodo, setPeriodo] = useState('todos');
  const [papel, setPapel] = useState('todos');
  const now = new Date();
  const filtered = survey.respostas.filter((r) => {
    if (papel !== 'todos' && r.papel !== papel) return false;
    if (periodo !== 'todos') { const dias = { '7': 7, '30': 30, '90': 90 }[periodo]; if ((now - new Date(r.data)) / 86400000 > dias) return false; }
    return true;
  });
  return (
    <>
      <div className="ph"><div><div className="ph-eyebrow">Resultados</div><h1 className="ph-title">{survey.nome}</h1><p className="ph-sub">{filtered.length} de {survey.respostas.length} respostas no filtro atual</p></div><div className="ph-actions"><button className="btn btn-sec" onClick={onVoltar}>← Voltar</button></div></div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <select className="select" style={{ width: 190 }} value={periodo} onChange={(e) => setPeriodo(e.target.value)}><option value="todos">Todo o período</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option></select>
        <select className="select" style={{ width: 190 }} value={papel} onChange={(e) => setPapel(e.target.value)}><option value="todos">Todos os papéis</option>{papeisFor(survey.contexto).map((p) => <option key={p} value={p}>{p}</option>)}</select>
      </div>
      {survey.perguntas.map((q) => {
        const vals = filtered.map((r) => (r.respostasPerguntas.find((a) => a.perguntaId === q.id) || {}).valor).filter((v) => v !== undefined);
        let rows = [];
        if (q.tipo === 'nota') {
          const max = q.escala || 10; const dist = {}; for (let i = 0; i <= max; i++) dist[i] = 0; vals.forEach((v) => dist[v] = (dist[v] || 0) + 1);
          const avg = vals.length ? (vals.reduce((a, b) => a + Number(b), 0) / vals.length).toFixed(1) : '0.0';
          rows = Object.keys(dist).map((k) => ({ k: `Nota ${k}`, n: dist[k] }));
          return <div className="panel" key={q.id} style={{ marginBottom: 16 }}><div className="panel-head"><div className="panel-title">{q.texto}</div><div className="panel-meta">média {avg}</div></div><div className="panel-body">{barRows(rows, vals.length)}</div></div>;
        }
        if (q.tipo === 'texto') {
          const items = vals.filter(Boolean).slice(0, 6);
          return <div className="panel" key={q.id} style={{ marginBottom: 16 }}><div className="panel-head"><div className="panel-title">{q.texto}</div></div><div className="panel-body">{items.length ? items.map((t, i) => <div key={i} style={{ padding: '9px 0', borderBottom: '0.5px solid var(--border)', fontSize: 13.5, color: 'var(--light)' }}>"{t}"</div>) : <div style={{ fontSize: 13, color: 'var(--subtle)' }}>Sem respostas no período.</div>}</div></div>;
        }
        const counts = {}; vals.forEach((v) => counts[v] = (counts[v] || 0) + 1);
        rows = Object.keys(counts).map((k) => ({ k, n: counts[k] }));
        return <div className="panel" key={q.id} style={{ marginBottom: 16 }}><div className="panel-head"><div className="panel-title">{q.texto}</div></div><div className="panel-body">{barRows(rows, vals.length)}</div></div>;
      })}
    </>
  );
}
function barRows(rows, total) {
  return rows.map((r) => { const pct = total ? Math.round(r.n / total * 100) : 0; return (
    <div key={r.k} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 9 }}>
      <div style={{ width: 110, fontSize: 12.5, color: 'var(--light)', flexShrink: 0 }}>{r.k}</div>
      <div style={{ flex: 1, height: 18, background: 'var(--border)', borderRadius: 'var(--r-sm)', overflow: 'hidden' }}><div style={{ height: '100%', width: pct + '%', background: 'var(--olive)' }}></div></div>
      <div style={{ width: 40, textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--muted)' }}>{r.n}</div>
    </div>
  ); });
}

function AvaliacaoAdminDemo() {
  const [surveys, setSurveys] = useState(() => cexLoadSurveys());
  const [route, setRoute] = useState({ screen: 'lista' });
  const persist = (list) => { setSurveys(list); cexSaveSurveys(list); };
  if (route.screen === 'editor') return <AdminEditor draft={route.draft} onCancel={() => setRoute({ screen: 'lista' })} onSave={(d) => { const arr = surveys.filter((s) => s.id !== d.id); if (d.disparo.ativoComoLivre) arr.forEach((s) => s.disparo.ativoComoLivre = false); persist([...arr, d]); setRoute({ screen: 'lista' }); }} />;
  if (route.screen === 'resultados') return <AdminResultados survey={surveys.find((s) => s.id === route.id)} onVoltar={() => setRoute({ screen: 'lista' })} />;
  return <AdminLista surveys={surveys} onOpen={(id) => setRoute({ screen: 'resultados', id })} onNova={() => setRoute({ screen: 'editor', draft: newDraft() })} />;
}

Object.assign(window, { AvaliacaoMemberDemo, AvaliacaoAdminDemo });
