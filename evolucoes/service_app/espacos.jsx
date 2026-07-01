/* ════════════════════════════════════════════════════════════════
   CE.X SERVICE · ESPAÇOS (salas) + RESERVAS com calendário
   Salas com capacidade. Reuniões, eventos, treinamentos, cursos e
   ensaios reservam um espaço — sem conflito de horário no mesmo dia.
   Inclui MiniCalendar reaproveitado no perfil da pessoa.
   ════════════════════════════════════════════════════════════════ */

const CAL_MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const CAL_MESES_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const CAL_SEM = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const CAL_ANO = 2026;

/* "15 jun" → {d:15, m:5}  (m 0-based) */
function parseCalData(str) {
  if (!str) return null;
  const p = String(str).trim().toLowerCase().split(/\s+/);
  const d = parseInt(p[0], 10);
  const m = CAL_MESES.findIndex((x) => (p[1] || '').slice(0, 3) === x);
  if (!d || m < 0) return null;
  return { d, m };
}

/* MiniCalendar — events: [{data:'15 jun', label, sub, tone, onClick}]
   onAdd(dateStr) opcional habilita o "+ neste dia". */
function MiniCalendar({ events, onAdd, initialMonth }) {
  const evs = (events || []).map((e) => ({ ...e, _p: parseCalData(e.data) })).filter((e) => e._p);
  const firstWith = evs.length ? evs[0]._p.m : (typeof initialMonth === 'number' ? initialMonth : 5);
  const [mes, setMes] = useState(firstWith);
  const [selDay, setSelDay] = useState(null);

  const diasNoMes = new Date(CAL_ANO, mes + 1, 0).getDate();
  const offset = new Date(CAL_ANO, mes, 1).getDay();
  const evDoMes = evs.filter((e) => e._p.m === mes);
  const porDia = {};
  evDoMes.forEach((e) => { (porDia[e._p.d] = porDia[e._p.d] || []).push(e); });

  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= diasNoMes; d++) cells.push(d);

  const selEvs = selDay ? (porDia[selDay] || []) : [];
  const dataSel = selDay ? `${selDay} ${CAL_MESES[mes]}` : null;

  return (
    <div className="cal">
      <div className="cal-head">
        <button type="button" className="cal-nav" onClick={() => { setMes((m) => (m + 11) % 12); setSelDay(null); }}>‹</button>
        <span className="cal-title">{CAL_MESES_FULL[mes]} {CAL_ANO}</span>
        <button type="button" className="cal-nav" onClick={() => { setMes((m) => (m + 1) % 12); setSelDay(null); }}>›</button>
      </div>
      <div className="cal-grid">
        {CAL_SEM.map((s, i) => <span key={'h' + i} className="cal-dow">{s}</span>)}
        {cells.map((d, i) => {
          if (!d) return <span key={'e' + i} className="cal-cell empty"></span>;
          const has = porDia[d];
          return (
            <button type="button" key={'d' + d} className={`cal-cell ${has ? 'has' : ''} ${selDay === d ? 'sel' : ''}`} onClick={() => setSelDay(d)}>
              <span className="cal-num">{d}</span>
              {has && <span className="cal-dots">{has.slice(0, 3).map((e, k) => <i key={k} className={`cal-dot ${e.tone || ''}`}></i>)}</span>}
            </button>
          );
        })}
      </div>

      <div className="cal-agenda">
        {!selDay && <div className="cal-agenda-empty">Toque num dia para ver os compromissos.</div>}
        {selDay && selEvs.length === 0 && <div className="cal-agenda-empty">Nada em {selDay} de {CAL_MESES_FULL[mes]}.{onAdd && ' Que tal reservar?'}</div>}
        {selEvs.map((e, i) => (
          <button type="button" key={i} className="cal-ev" onClick={() => e.onClick && e.onClick()}>
            <span className={`cal-ev-bar ${e.tone || ''}`}></span>
            <div className="cal-ev-main">
              <div className="cal-ev-label">{e.label}</div>
              {e.sub && <div className="cal-ev-sub">{e.sub}</div>}
            </div>
          </button>
        ))}
        {selDay && onAdd && <button type="button" className="cal-add" onClick={() => onAdd(dataSel)}>+ Reservar em {selDay} {CAL_MESES[mes]}</button>}
      </div>
    </div>
  );
}

/* tom por tipo de reserva */
const RESERVA_TONE = { reuniao: 'olive', evento: 'amber', treinamento: 'olive', curso: 'amber', ensaio: 'olive', outro: '' };

/* modal de reserva (conflito barrado) */
function ReservaModal({ salaInicial, dataInicial, onClose }) {
  const [sala, setSala] = useState(salaInicial || (S.SALAS[0] && S.SALAS[0].id) || '');
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState('reuniao');
  const [data, setData] = useState(dataInicial || '');
  const [inicio, setInicio] = useState('19h00');
  const [fim, setFim] = useState('21h00');
  const [erro, setErro] = useState(null);
  const { DatePicker, TimePicker } = window;

  const salvar = () => {
    if (!titulo.trim()) { setErro('Dê um nome ao compromisso.'); return; }
    if (!data) { setErro('Escolha o dia no calendário.'); return; }
    const r = S.reservar({ sala, titulo: titulo.trim(), tipo, data, inicio, fim });
    if (!r.ok) { setErro(`Conflito: "${r.conflito.titulo}" já usa esta sala em ${r.conflito.inicio}–${r.conflito.fim}.`); return; }
    cexToast('Espaço reservado.'); onClose();
  };

  const cand = data ? S.conflitoReserva({ sala, data, inicio, fim }) : null;

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Reservar espaço</div>
          <div className="modal-title">Novo compromisso na sala</div>
          <div className="modal-sub">Não deixamos duas reservas se cruzarem no mesmo espaço e horário.</div>
        </div>
        <div className="modal-body">
          <div className="field"><label className="field-label">Título</label><input className="input" placeholder="ex: Reunião de líderes" value={titulo} onChange={(e) => setTitulo(e.target.value)} /></div>
          <div className="field field-half"><label className="field-label">Sala</label>
            <select className="select" value={sala} onChange={(e) => setSala(e.target.value)}>
              {S.SALAS.map((s) => <option key={s.id} value={s.id}>{s.nome} · {s.capacidade} lug.</option>)}
            </select>
          </div>
          <div className="field field-half"><label className="field-label">Tipo</label>
            <select className="select" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {Object.entries(S.TIPOS_RESERVA).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
          <div className="field field-half"><label className="field-label">Dia</label><DatePicker value={data} onChange={setData} /></div>
          <div className="field field-half"><label className="field-label">Início</label><TimePicker value={inicio} onChange={setInicio} /></div>
          <div className="field field-half"><label className="field-label">Fim</label><TimePicker value={fim} onChange={setFim} /></div>
          {cand && <div className="reserva-warn" style={{ gridColumn: '1 / -1' }}><Icon name="alerta" size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />Já existe "{cand.titulo}" aqui em {cand.inicio}–{cand.fim}.</div>}
          {erro && <div style={{ gridColumn: '1 / -1', fontSize: 12.5, color: 'var(--danger)' }}>{erro}</div>}
        </div>
        <div className="modal-foot">
          <button className="btn btn-sec" onClick={onClose}>Cancelar</button>
          <button className="btn btn-pri" disabled={!!cand} onClick={salvar}>Reservar</button>
        </div>
      </div>
    </div>
  );
}

function Espacos({ embed }) {
  useRefresh();
  const [filtro, setFiltro] = useState('todas');
  const [reservar, setReservar] = useState(null); // {sala?, data?} | null

  const salas = S.SALAS || [];
  const reservasVis = (S.RESERVAS || []).filter((r) => filtro === 'todas' || r.sala === filtro);
  const events = reservasVis.map((r) => {
    const s = S.salaById(r.sala);
    return { data: r.data, label: r.titulo, sub: `${(S.salaById(r.sala) || {}).nome || 'Sala'} · ${r.inicio}–${r.fim}`, tone: RESERVA_TONE[r.tipo] || 'olive' };
  });

  const header = embed ? (
    <div className="cfg-card-head-row">
      <div>
        <div className="cfg-card-t">Espaços & reservas</div>
        <div className="cfg-card-s">As salas da igreja e quem as usa. Reuniões, eventos, treinamentos, cursos e ensaios reservam aqui — sem dois compromissos colidirem no mesmo espaço.</div>
      </div>
      <div className="ph-actions">
        <button className="btn btn-sec btn-sm" onClick={() => cexCreate('sala')}>+ Nova sala</button>
        <button className="btn btn-pri btn-sm" onClick={() => setReservar({})}>+ Reservar</button>
      </div>
    </div>
  ) : (
    <div className="ph">
      <div>
        <div className="ph-eyebrow">Operação</div>
        <h1 className="ph-title">Espaços <em>& reservas</em></h1>
        <p className="ph-sub">As salas da igreja e quem as usa. Reuniões, eventos, treinamentos, cursos e ensaios reservam aqui — e o sistema não deixa dois compromissos colidirem no mesmo espaço.</p>
      </div>
      <div className="ph-actions">
        <button className="btn btn-sec" onClick={() => cexCreate('sala')}>+ Nova sala</button>
        <button className="btn btn-pri" onClick={() => setReservar({})}>+ Reservar espaço</button>
      </div>
    </div>
  );

  const inner = (
    <>
      {header}
      {/* SALAS */}
      <div className="sala-grid">
        {salas.map((s) => {
          const n = S.reservasDaSala(s.id).length;
          return (
            <button key={s.id} className={`sala-card ${filtro === s.id ? 'on' : ''}`} onClick={() => setFiltro(filtro === s.id ? 'todas' : s.id)}>
              <div className="sala-card-top">
                <span className="sala-mark"><Icon name="espacos" size={18} /></span>
                <span className="sala-cap">{s.capacidade} <small>lugares</small></span>
              </div>
              <div className="sala-nome">{s.nome}</div>
              <div className="sala-local">{s.local}</div>
              {s.recursos && s.recursos.length > 0 && <div className="sala-rec">{s.recursos.map((r) => <span key={r} className="tag">{r}</span>)}</div>}
              <div className="sala-foot">{n} reserva(s)</div>
            </button>
          );
        })}
        {salas.length === 0 && <div className="empty">Nenhuma sala cadastrada ainda. <em>Adicione a primeira.</em></div>}
      </div>

      {/* CALENDÁRIO DE RESERVAS */}
      <div className="esp-cal-wrap">
        <div className="toolbar" style={{ marginBottom: 12 }}>
          <span className="panel-meta">Calendário de reservas{filtro !== 'todas' ? <> · <b style={{ color: 'var(--light)' }}>{(S.salaById(filtro) || {}).nome}</b></> : ''}</span>
          <div className="tb-spacer"></div>
          {filtro !== 'todas' && <button className="btn btn-ghost btn-sm" onClick={() => setFiltro('todas')}>Ver todas as salas</button>}
        </div>
        <MiniCalendar events={events} onAdd={(dataStr) => setReservar({ sala: filtro !== 'todas' ? filtro : null, data: dataStr })} />
        <div className="cal-legend">
          {Object.entries(S.TIPOS_RESERVA).map(([k, l]) => k !== 'outro' && (
            <span key={k} className="cal-legend-i"><i className={`cal-dot ${RESERVA_TONE[k] || ''}`}></i>{l}</span>
          ))}
        </div>
      </div>

      {reservar && <ReservaModal salaInicial={reservar.sala} dataInicial={reservar.data} onClose={() => setReservar(null)} />}
    </>
  );

  return embed ? inner : <div className="content wide">{inner}</div>;
}

Object.assign(window, { Espacos, MiniCalendar, ReservaModal, parseCalData, RESERVA_TONE });
