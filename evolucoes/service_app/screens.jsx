/* ════════════════════════════════════════════════════════════════
   CE.X SERVICE · TELAS — Painel, Pessoas, Cultos
   ════════════════════════════════════════════════════════════════ */

/* status do voluntário pelos critérios da igreja (recusas / indisponibilidade) */
function volStatus(p) {
  const cfg = S.STATUS_CFG || { recusasInativando: 2, recusasInativo: 4, diasIndispInativo: 30, considerarFerias: false };
  if (p.ferias && !cfg.considerarFerias) return { chip: 'wait', label: 'Em férias', nivel: 'ferias' };
  const recusas = p.recusasSeguidas != null ? p.recusasSeguidas : (p.status === 'pausa' ? 3 : 0);
  const dias = p.diasIndisponivel || 0;
  if (recusas >= cfg.recusasInativo || dias >= cfg.diasIndispInativo) return { chip: 'no', label: 'Inativo', nivel: 'inativo' };
  if (recusas >= cfg.recusasInativando) return { chip: 'wait', label: 'Inativando', nivel: 'inativando' };
  return { chip: 'ok', label: 'Ativo', nivel: 'ativo' };
}

/* gaps: vagas em aberto (need não preenchido) + recusas a cobrir */
function computeGaps() {
  const out = [];
  S.TIMES.forEach((t) => {
    const esc = S.ESCALAS[t.id]; if (!esc) return;
    esc.funcoes.forEach((f) => {
      S.CULTOS.forEach((c) => {
        const slots = f.cells[c.id] || [];
        const valid = slots.filter((s) => s.st !== 'no').length;
        const recusou = slots.filter((s) => s.st === 'no').length;
        const missing = Math.max(0, f.need - valid);
        if (missing > 0) out.push({ time: t, fn: f.fn, culto: c, missing, kind: 'vago' });
        if (recusou > 0) out.push({ time: t, fn: f.fn, culto: c, missing: recusou, kind: 'recusa' });
      });
    });
  });
  return out;
}

/* ════════ PAINEL ════════ */
function Spark({ series }) {
  const w = 240, h = 56, p = 4;
  const max = Math.max(...series), min = Math.min(...series);
  const x = (i) => p + (i * (w - p * 2)) / (series.length - 1);
  const y = (v) => h - p - ((v - min) / (max - min || 1)) * (h - p * 2);
  const line = series.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(series.length - 1)},${h} L${x(0)},${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 56 }} preserveAspectRatio="none">
      <defs><linearGradient id="sp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7A9E3F" stopOpacity="0.3" /><stop offset="100%" stopColor="#7A9E3F" stopOpacity="0" /></linearGradient></defs>
      <path d={area} fill="url(#sp)" />
      <path d={line} fill="none" stroke="#7A9E3F" strokeWidth="2" />
    </svg>
  );
}

function Painel({ go, openCulto }) {
  const m = S.METRICS;
  const gaps = computeGaps();
  const topVol = [...S.PESSOAS].filter((p) => p.status === 'ativo').sort((a, b) => b.engaj - a.engaj).slice(0, 5);
  const [qrCulto, setQrCulto] = useState(null);
  return (
    <div className="content wide">
      <div className="ph">
        <div>
          <div className="ph-eyebrow">Painel</div>
          <h1 className="ph-title">Bom domingo, <em>liderança</em></h1>
          <p className="ph-sub">Visão da semana: quem está escalado, o que falta preencher e quem precisa de acompanhamento.</p>
        </div>
        <div className="ph-actions">
          <button className="btn btn-sec" onClick={() => go('cultos')}>Ver agenda</button>
          <button className="btn btn-pri" onClick={() => go('escalas')}>Montar escala →</button>
        </div>
      </div>

      <div className="kpi-row">
        <div className="kpi">
          <div className="kpi-label"><Icon name="pessoa" size={13} className="ic" /> Voluntários ativos</div>
          <div className="kpi-value">{m.voluntariosAtivos}</div>
          <div className="kpi-foot"><span className="kpi-delta up">▲ {m.voluntariosDelta}%</span> vs. mês anterior</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><Icon name="ok" size={13} className="ic" /> Taxa de confirmação</div>
          <div className="kpi-value">{m.taxaConfirmacao}<span className="u">%</span></div>
          <div className="kpi-foot"><span className="kpi-delta up">▲ {m.confirmacaoDelta}%</span> da escala da semana</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><Icon name="alerta" size={13} className="ic" /> Vagas em aberto</div>
          <div className="kpi-value" style={{ color: 'var(--amber)' }}>{m.vagasAbertas}</div>
          <div className="kpi-foot">de {m.escalasSemana} posições nesta semana</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><Icon name="visitante" size={13} className="ic" /> Visitantes em acomp.</div>
          <div className="kpi-value">{m.visitantesAcomp}</div>
          <div className="kpi-foot"><span className="kpi-delta up">▲ {m.visitantesDelta}%</span> a contatar esta semana</div>
        </div>
      </div>

      <div className="dash-3col">
        {/* buracos na escala */}
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title"><Icon name="escalas" size={14} className="ic" /> Pendências da escala</span>
            <button className="panel-link" onClick={() => go('escalas')}>Resolver</button>
          </div>
          <div className="panel-body flush">
            {gaps.slice(0, 6).map((g, i) => (
              <div className="gap-row" key={i}>
                <div className={`gap-ic ${g.kind === 'recusa' ? '' : 'wait'}`}>{g.kind === 'recusa' ? '✕' : '!'}</div>
                <div className="mini-main">
                  <div className="mini-title">{g.fn} <span style={{ color: 'var(--subtle)', fontWeight: 400 }}>· {g.time.nome}</span></div>
                  <div className="mini-sub">{g.culto.dia} {g.culto.data} · {g.culto.hora} · {g.kind === 'recusa' ? 'recusou, cobrir' : `${g.missing} vaga(s)`}</div>
                </div>
                <button className="btn btn-sec btn-sm" onClick={() => go('escalas')}>Escalar</button>
              </div>
            ))}
          </div>
        </div>

        {/* engajamento + próximos cultos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="panel">
            <div className="panel-head"><span className="panel-title"><Icon name="relatorios" size={14} className="ic" /> Engajamento</span><span className="panel-meta">90 dias</span></div>
            <div className="panel-body">
              <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.04em' }}>{m.taxaConfirmacao}%<span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500, marginLeft: 8 }}>presença média</span></div>
              <div style={{ marginTop: 6 }}><Spark series={m.engajSerie} /></div>
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><span className="panel-title"><Icon name="cultos" size={14} className="ic" /> Próximos cultos</span><button className="panel-link" onClick={() => go('cultos')}>Agenda</button></div>
            <div className="panel-body flush">
              {S.CULTOS.slice(0, 3).map((c) => (
                <div className="mini-row click" key={c.id} onClick={() => openCulto(c.id)}>
                  <div className="mini-main">
                    <div className="mini-title">{c.nome}</div>
                    <div className="mini-sub">{c.dia} {c.data} · {c.hora} · {c.local}</div>
                  </div>
                  <div className="mini-right" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span>{c.hora}</span>
                  <button className="painel-qr" title="QR Check-in / presença" onClick={(e) => { e.stopPropagation(); setQrCulto(c.id); }}>
                    {(() => { const r = S.resumoPresenca ? S.resumoPresenca(c.id) : null; return r && r.presentes > 0 ? <span className="painel-qr-count">{r.presentes}</span> : null; })()}
                    <Icon name="cultos" size={14} />
                  </button>
                </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="dash-2col">
        {/* top voluntários */}
        <div className="panel">
          <div className="panel-head"><span className="panel-title"><Icon name="pessoa" size={14} className="ic" /> Voluntários mais engajados</span><button className="panel-link" onClick={() => go('pessoas')}>Todos</button></div>
          <div className="panel-body flush">
            {topVol.map((p, i) => (
              <div className="mini-row" key={p.id}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--subtle)', width: 18 }}>{String(i + 1).padStart(2, '0')}</span>
                <Av nome={p.nome} size="sm" />
                <div className="mini-main">
                  <div className="mini-title">{p.nome}</div>
                  <div className="mini-sub">{p.times.map((t) => tById(t).nome).join(' · ')}</div>
                </div>
                <div style={{ width: 90 }}>
                  <div className="bar"><div className="bar-fill" style={{ width: `${p.engaj}%` }}></div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* avisos */}
        <div className="panel">
          <div className="panel-head"><span className="panel-title"><Icon name="comunicacao" size={14} className="ic" /> Comunicação recente</span><button className="panel-link" onClick={() => go('comunicacao')}>Ver tudo</button></div>
          <div className="panel-body flush">
            {S.AVISOS.map((a) => (
              <div className="mini-row" key={a.id}>
                <div className="mini-main">
                  <div className="mini-title">{a.titulo}</div>
                  <div className="mini-sub">{a.para} · {a.when}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {qrCulto && <QRCheckinModal cultoId={qrCulto} onClose={() => setQrCulto(null)} />}
    </div>
  );
}

/* botão + modal: cadastrar um novo voluntário */
function NovoVoluntarioBtn() {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [tel, setTel] = useState('');
  const [times, setTimes] = useState([]);
  const togT = (id) => setTimes((t) => t.includes(id) ? t.filter((x) => x !== id) : [...t, id]);
  const salvar = () => {
    if (!nome.trim()) { cexToast('Informe o nome.', 'warn'); return; }
    const id = cexId('p');
    S.PESSOAS.push({ id, nome: nome.trim(), tel, email: '', desde: String(new Date().getFullYear()), lider: [], times, funcoes: [], status: 'ativo', engaj: 60, disp: { dom_m: true, dom_n: true, qua: false }, tags: [] });
    times.forEach((tid) => { const t = tById(tid); if (t) t.voluntarios = (t.voluntarios || 0) + 1; });
    cexRefresh(); cexToast(nome.split(' ')[0] + ' cadastrado(a) como voluntário.');
    setNome(''); setTel(''); setTimes([]); setOpen(false);
  };
  return (
    <>
      <button className="btn btn-pri" onClick={() => setOpen(true)}>+ Novo voluntário</button>
      {open && (
        <div className="modal-bg" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-eyebrow">Novo voluntário</div>
              <div className="modal-title">Quem vai servir</div>
              <div className="modal-sub">Cadastre e já escolha os ministérios. Depois dá pra ajustar funções e disponibilidade no perfil.</div>
            </div>
            <div className="modal-body" style={{ display: 'block' }}>
              <div className="field"><label className="field-label">Nome</label><input className="input" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" /></div>
              <div className="field"><label className="field-label">Telefone</label><input className="input" value={tel} onChange={(e) => setTel(e.target.value)} placeholder="(11) 90000-0000" /></div>
              <div className="field"><label className="field-label">Ministérios</label>
                <div className="seg-check">
                  {(S.TIMES || []).map((t) => <button type="button" key={t.id} className={`seg-chip ${times.includes(t.id) ? 'on' : ''}`} onClick={() => togT(t.id)}><TeamMark t={t} size={13} style={{ verticalAlign: '-2px' }} /> {t.nome.split(' ')[0]}</button>)}
                </div>
              </div>
            </div>
            <div className="modal-foot"><button className="btn btn-sec" onClick={() => setOpen(false)}>Cancelar</button><button className="btn btn-pri" onClick={salvar}>Cadastrar</button></div>
          </div>
        </div>
      )}
    </>
  );
}

/* ════════ PESSOAS ════════ */
function Pessoas({ openPessoa }) {
  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const filtros = [{ id: 'todos', label: 'Todos' }, ...S.TIMES.map((t) => ({ id: t.id, label: t.nome.split(' ')[0] }))];
  const shown = S.PESSOAS.filter((p) => {
    const okQ = !q || p.nome.toLowerCase().includes(q.toLowerCase());
    const okF = filtro === 'todos' || p.times.includes(filtro);
    return okQ && okF;
  });
  return (
    <div className="content">
      <div className="ph">
        <div>
          <div className="ph-eyebrow">Pessoas</div>
          <h1 className="ph-title">Voluntários</h1>
          <p className="ph-sub">Quem serve, em quais times e funções. Toque para ver perfil, disponibilidade e histórico.</p>
        </div>
        <div className="ph-actions"><NovoVoluntarioBtn /></div>
      </div>

      <div className="toolbar">
        <div className="tb-search"><span className="si">⌕</span><input placeholder="Buscar por nome..." value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="seg">
          {filtros.slice(0, 5).map((f) => <button key={f.id} className={filtro === f.id ? 'on' : ''} onClick={() => setFiltro(f.id)}>{f.label}</button>)}
        </div>
        <div className="tb-spacer"></div>
        <span className="panel-meta">{shown.length} pessoas</span>
      </div>

      <div className="tbl">
        <div className="tr tr-people head"><span>Voluntário</span><span>Times & funções</span><span>Engajamento</span><span>Situação</span></div>
        {shown.map((p) => (
          <div className="tr tr-people click" key={p.id} onClick={() => openPessoa(p.id)}>
            <div className="cell-person">
              <Av nome={p.nome} size="md" self={p.self} lead={p.lider.length > 0} />
              <div>
                <div className="cell-name">{p.nome}{p.self && <span style={{ color: 'var(--olive)', fontSize: 11, marginLeft: 7, fontFamily: 'var(--mono)' }}>você</span>}</div>
                <div className="cell-sub">desde {p.desde} · {p.tel}</div>
              </div>
            </div>
            <div className="cell-tags">
              {p.times.map((t) => <span key={t} className={`tag ${p.lider.includes(t) ? 'lead' : ''}`}>{tById(t).nome.split(' ')[0]}</span>)}
            </div>
            <div style={{ width: 100 }}>
              <div className="bar"><div className={`bar-fill ${p.engaj < 55 ? 'amber' : ''}`} style={{ width: `${p.engaj}%` }}></div></div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--subtle)', marginTop: 5 }}>{p.engaj}%</div>
            </div>
            <div>{(() => { const s = volStatus(p); return <Chip st={s.chip} label={s.label} />; })()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════ FICHA DE PESSOA (drawer) ════════ */
const DIAS = [{ k: 'dom_m', l: 'Dom manhã' }, { k: 'dom_n', l: 'Dom noite' }, { k: 'qua', l: 'Quarta' }];
function PessoaDrawer({ id, onClose, openTime }) {
  const p = pById(id); if (!p) return null;
  /* agenda da pessoa: escalas + reuniões + ensaios em que participa */
  const minhas = [];
  S.TIMES.forEach((t) => {
    const esc = S.ESCALAS[t.id]; if (!esc) return;
    esc.funcoes.forEach((f) => S.CULTOS.forEach((c) => {
      (f.cells[c.id] || []).forEach((s) => { if (s.p === id) minhas.push({ culto: c, fn: f.fn, time: t, st: s.st }); });
    }));
  });
  const calEventos = [];
  minhas.forEach((m) => calEventos.push({ data: m.culto.data, label: m.fn + ' · ' + m.time.nome.split(' ')[0], sub: m.culto.nome + ' · ' + m.culto.hora, tone: m.st === 'no' ? 'amber' : 'olive' }));
  (S.REUNIOES || []).forEach((r) => { if ((r.presentes || []).includes(id)) calEventos.push({ data: r.data, label: r.titulo, sub: 'Reunião · ' + r.hora, tone: 'amber' }); });
  (S.ENSAIOS || []).forEach((e) => { if ((e.presentes || []).includes(id)) calEventos.push({ data: e.data || e.dia, label: e.titulo, sub: 'Ensaio · ' + e.hora, tone: 'olive' }); });
  return (
    <>
      <div className="drawer-bg" onClick={onClose}></div>
      <div className="drawer">
        <div className="drawer-head">
          <button className="drawer-close" onClick={onClose}>✕</button>
          <div className="profile-top">
            <Av nome={p.nome} size="xl" self={p.self} lead={p.lider.length > 0} />
            <div>
              <div className="profile-name">{p.nome}</div>
              <div className="profile-role">{p.lider.length ? `Líder · ${p.lider.map((l) => tById(l).nome).join(', ')}` : 'Voluntário'} · desde {p.desde}</div>
              <div style={{ marginTop: 10 }}>{(() => { const s = volStatus(p); return <Chip st={s.chip} label={s.label} />; })()}</div>
            </div>
          </div>
        </div>
        <div className="drawer-body">
          <div className="dsec">
            <div className="dsec-title">Contato</div>
            <dl className="kv">
              <dt>Telefone</dt><dd><a href={`tel:${p.tel}`}>{p.tel}</a></dd>
              <dt>E-mail</dt><dd><a href={`mailto:${p.email}`}>{p.email}</a></dd>
              <dt>Engajamento</dt><dd>{p.engaj}% de presença nos últimos 90 dias</dd>
            </dl>
          </div>

          <div className="dsec">
            <div className="dsec-title">Times & funções</div>
            <div className="cell-tags" style={{ gap: 8 }}>
              {p.times.map((t) => (
                <button key={t} className={`tag ${p.lider.includes(t) ? 'lead' : ''}`} style={{ cursor: 'pointer' }} onClick={() => openTime(t)}>
                  {tById(t).nome}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 12, fontSize: 13, color: 'var(--muted)' }}>
              Funções: {p.funcoes.join(' · ')}
            </div>
          </div>

          <div className="dsec">
            <div className="dsec-title">Disponibilidade</div>
            <div className="avail">
              {DIAS.map((d) => <span key={d.k} className={`avail-day ${p.disp[d.k] ? 'free' : 'block'}`}>{d.l}</span>)}
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--subtle)' }}>Verde: disponível para escalar. Riscado: bloqueado pelo voluntário.</div>
          </div>

          <div className="dsec">
            <div className="dsec-title">Meu calendário · {calEventos.length} compromisso(s)</div>
            <MiniCalendar events={calEventos} />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
            <button className="btn btn-pri" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { onClose(); window.cexGo && window.cexGo('escalas'); }}>Escalar</button>
            <button className="btn btn-sec" style={{ flex: 1, justifyContent: 'center' }} onClick={() => cexToast('Abrindo conversa com ' + p.nome.split(' ')[0] + '.', 'info')}>Enviar mensagem</button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ════════ CULTOS ════════ */
function Cultos({ openCulto }) {
  useRefresh();
  return (
    <div className="content">
      <div className="ph">
        <div>
          <div className="ph-eyebrow">Agenda</div>
          <h1 className="ph-title">Cultos & Eventos</h1>
          <p className="ph-sub">Cada culto tem suas posições. Veja quem está escalado e quanto já está confirmado.</p>
        </div>
        <div className="ph-actions"><button className="btn btn-pri" onClick={() => cexCreate('culto')}>+ Novo culto</button></div>
      </div>
      <div className="tbl">
        <div className="tr head" style={{ gridTemplateColumns: '80px 1.6fr 1fr 1fr 120px' }}><span>Data</span><span>Culto</span><span>Equipe</span><span>Confirmação</span><span></span></div>
        {S.CULTOS.map((c) => {
          let total = 0, ok = 0; const ids = new Set();
          S.TIMES.forEach((t) => { const e = S.ESCALAS[t.id]; if (!e) return; e.funcoes.forEach((f) => (f.cells[c.id] || []).forEach((s) => { total++; if (s.st === 'ok') ok++; ids.add(s.p); })); });
          const pct = total ? Math.round((ok / total) * 100) : 0;
          return (
            <div className="tr click" key={c.id} style={{ gridTemplateColumns: '80px 1.6fr 1fr 1fr 120px' }} onClick={() => openCulto(c.id)}>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--olive)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{c.dia.slice(0, 3)}</div>
                <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 2 }}>{c.data}</div>
              </div>
              <div><div className="cell-name">{c.nome}</div><div className="cell-sub">{c.hora} · {c.local} · {c.tipo}</div></div>
              <div><AvStack ids={[...ids]} max={5} /></div>
              <div style={{ width: 120 }}>
                <div className="bar"><div className={`bar-fill ${pct < 60 ? 'amber' : ''}`} style={{ width: `${pct}%` }}></div></div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--subtle)', marginTop: 5 }}>{ok}/{total} confirmados</div>
              </div>
              <div style={{ textAlign: 'right' }}><span className="btn btn-sec btn-sm">Ver posições</span></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { computeGaps, Painel, Pessoas, PessoaDrawer, Cultos });
