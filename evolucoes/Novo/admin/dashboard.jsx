/* ════════════════════════════════════════════════════════════════
   CE.X ADMIN · PAINEL DE MÉTRICAS
   Dados de exemplo realistas (últimos 30 dias). O Claude Code liga
   nas fontes reais depois (analytics + Hotmart + lista de espera).
   ════════════════════════════════════════════════════════════════ */
const fmt = (n) => n.toLocaleString('pt-BR');

function Delta({ v }) {
  const up = v >= 0;
  return <span className={`kpi-delta ${up ? 'up' : 'down'}`}>{up ? '▲' : '▼'} {Math.abs(v)}%</span>;
}

function KpiCard({ label, value, delta, sub }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-foot"><Delta v={delta} /> <span className="kpi-sub">{sub}</span></div>
    </div>
  );
}

/* Gráfico de área (SVG) das visitas dos últimos 30 dias */
function VisitsChart({ series }) {
  const w = 760, h = 200, pad = 8;
  const max = Math.max(...series), min = Math.min(...series);
  const x = (i) => pad + (i * (w - pad * 2)) / (series.length - 1);
  const y = (v) => h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2 - 18);
  const line = series.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(series.length - 1).toFixed(1)},${h} L${x(0).toFixed(1)},${h} Z`;
  const peak = series.indexOf(max);
  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">Visitas ao site · últimos 30 dias</span>
        <span className="panel-meta">{fmt(series.reduce((a, b) => a + b, 0))} no período</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="chart" preserveAspectRatio="none">
        <defs>
          <linearGradient id="vg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7A9E3F" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#7A9E3F" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((g, i) => <line key={i} x1="0" x2={w} y1={h * g} y2={h * g} className="chart-grid" />)}
        <path d={area} fill="url(#vg)" />
        <path d={line} fill="none" stroke="#7A9E3F" strokeWidth="2" />
        <circle cx={x(peak)} cy={y(max)} r="3.5" fill="#94B85C" />
      </svg>
    </div>
  );
}

/* Funil de conversão */
function Funnel({ steps }) {
  const top = steps[0].value;
  return (
    <div className="panel">
      <div className="panel-head"><span className="panel-title">Funil de conversão</span></div>
      <div className="funnel">
        {steps.map((s, i) => {
          const pct = (s.value / top) * 100;
          const conv = i === 0 ? 100 : (s.value / steps[i - 1].value) * 100;
          return (
            <div className="funnel-row" key={i}>
              <div className="funnel-meta">
                <span className="funnel-label">{s.label}</span>
                <span className="funnel-val">{fmt(s.value)} {i > 0 && <em>· {conv.toFixed(0)}%</em>}</span>
              </div>
              <div className="funnel-track"><div className="funnel-fill" style={{ width: `${pct}%` }}></div></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* Origem do tráfego */
function Origem({ rows }) {
  return (
    <div className="panel">
      <div className="panel-head"><span className="panel-title">Origem do tráfego</span></div>
      <div className="origem">
        {rows.map((r, i) => (
          <div className="origem-row" key={i}>
            <span className="origem-label">{r.label}</span>
            <div className="origem-track"><div className="origem-fill" style={{ width: `${r.value}%`, background: r.color }}></div></div>
            <span className="origem-val">{r.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Itens mais vistos */
function TopItens({ items }) {
  const top = [...items].sort((a, b) => b.views - a.views).slice(0, 6);
  const max = top[0].views;
  return (
    <div className="panel">
      <div className="panel-head"><span className="panel-title">Itens mais vistos</span><span className="panel-meta">30 dias</span></div>
      <div className="toplist">
        {top.map((it, i) => (
          <div className="top-row" key={it.id}>
            <span className="top-rank">{String(i + 1).padStart(2, '0')}</span>
            <div className="top-main">
              <div className="top-title">{it.title}</div>
              <div className="top-bar"><div style={{ width: `${(it.views / max) * 100}%`, background: it.accent }}></div></div>
            </div>
            <span className="top-views">{fmt(it.views)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Próximas turmas / lista de espera */
function ListaEspera({ cursos }) {
  const rows = [...cursos].sort((a, b) => b.waitlist - a.waitlist).slice(0, 4);
  return (
    <div className="panel">
      <div className="panel-head"><span className="panel-title">Lista de espera · cursos</span></div>
      <div className="toplist">
        {rows.map((c) => (
          <div className="top-row" key={c.id}>
            <span className="le-tag" style={{ color: c.accent, borderColor: c.accent }}>◆ {c.level}</span>
            <div className="top-main"><div className="top-title">{c.title}</div></div>
            <span className="top-views" style={{ color: c.accent }}>{fmt(c.waitlist)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Dashboard({ data }) {
  const m = data.metrics;
  const allItems = [...data.materiais, ...data.cursos, ...data.mentorias, ...data.eventos];
  return (
    <div className="dash">
      <div className="kpi-row">
        <KpiCard label="Visitas (30d)" value={fmt(m.kpis.visitas)} delta={m.kpis.visitasDelta} sub="vs. período anterior" />
        <KpiCard label="Cliques em comprar" value={fmt(m.kpis.cliquesComprar)} delta={m.kpis.cliquesDelta} sub="Hotmart" />
        <KpiCard label="Lista de espera" value={fmt(m.kpis.listaEspera)} delta={m.kpis.listaDelta} sub="cursos ao vivo" />
        <KpiCard label="Capturas de e-mail" value={fmt(m.kpis.capturas)} delta={m.kpis.capturasDelta} sub="material gratuito" />
      </div>
      <VisitsChart series={m.series30} />
      <div className="dash-2col">
        <Funnel steps={m.funil} />
        <Origem rows={m.origem} />
      </div>
      <div className="dash-2col">
        <TopItens items={allItems} />
        <ListaEspera cursos={data.cursos} />
      </div>
    </div>
  );
}

Object.assign(window, { Dashboard });
