/* ════════════════════════════════════════════════════════════════
   CE.X SERVICE · RELATÓRIOS — indicadores, crescimento,
   termômetro de bem-estar dos voluntários, distribuição, funil.
   ════════════════════════════════════════════════════════════════ */

/* carga de cada voluntário na semana (nº de slots válidos) + recusas */
function cargaVol(pid) {
  let escalas = 0, recusas = 0;
  S.TIMES.forEach((t) => {
    const esc = S.ESCALAS[t.id]; if (!esc) return;
    esc.funcoes.forEach((f) => S.CULTOS.forEach((c) => {
      (f.cells[c.id] || []).forEach((s) => { if (s.p === pid) { if (s.st === 'no') recusas++; else escalas++; } });
    }));
  });
  return { escalas, recusas };
}

/* termômetro: deriva nível de bem-estar de carga + engajamento + status */
function bemEstar(p) {
  const { escalas, recusas } = cargaVol(p.id);
  let nivel = 'saudavel', score = Math.min(100, 40 + p.engaj * 0.5), motivo = 'Carga equilibrada, presença alta.';
  if (p.status === 'pausa') { nivel = 'afastando'; score = 22; motivo = 'Em pausa e sem responder convites recentes.'; }
  else if (recusas >= 1 && p.engaj < 75) { nivel = 'afastando'; score = 38; motivo = 'Recusou escala e engajamento caindo.'; }
  else if (escalas >= 3) { nivel = 'sobrecarga'; score = 84; motivo = `Escalado em ${escalas} posições nesta semana.`; }
  else if (p.engaj < 70 || escalas === 0) { nivel = 'atencao'; score = 58; motivo = escalas === 0 ? 'Sem escala nesta semana.' : 'Engajamento abaixo da média.'; }
  if (S.SINAIS[p.id]) motivo = S.SINAIS[p.id].nota;
  return { nivel, score, motivo, escalas };
}

const NIVEL = {
  saudavel: 'Saudável', atencao: 'Atenção', sobrecarga: 'Sobrecarga', afastando: 'Afastando',
};

function Bars({ series, labels }) {
  const max = Math.max(...series);
  return (
    <div className="bars">
      {series.map((v, i) => (
        <div className="bars-col" key={i}>
          <div className={`bars-bar ${i === series.length - 1 ? 'hi' : ''}`} style={{ height: `${(v / max) * 100}%` }}></div>
          <span className="bars-x">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

function Relatorios({ go }) {
  const r = S.REL;
  const vols = S.PESSOAS.map((p) => ({ p, ...bemEstar(p) }));
  const ordem = { afastando: 0, sobrecarga: 1, atencao: 2, saudavel: 3 };
  const ranked = [...vols].sort((a, b) => ordem[a.nivel] - ordem[b.nivel] || b.score - a.score);
  const cont = (n) => vols.filter((v) => v.nivel === n).length;

  /* distribuição por ministério */
  const porTime = S.TIMES.map((t) => ({ nome: t.nome.split(' ')[0], n: S.PESSOAS.filter((p) => p.times.includes(t.id)).length }))
    .sort((a, b) => b.n - a.n);
  const maxTime = Math.max(...porTime.map((x) => x.n));
  /* funil de visitantes */
  const funil = S.ETAPAS.map((e) => ({ ...e, n: S.VISITANTES.filter((v) => v.etapa === e.id).length }));
  const maxFun = Math.max(...funil.map((x) => x.n), 1);

  return (
    <div className="content wide">
      <div className="ph">
        <div>
          <div className="ph-eyebrow">Gestão</div>
          <h1 className="ph-title">Relatórios & <em>indicadores</em></h1>
          <p className="ph-sub">A saúde da igreja num lugar: crescimento, integração, cobertura de escala e o bem-estar de quem serve.</p>
        </div>
        <div className="ph-actions">
          <button className="btn btn-sec"><Icon name="agenda" size={14} /> Trimestre</button>
          <button className="btn btn-pri">Baixar relatório →</button>
        </div>
      </div>

      <div className="kpi-row">
        <div className="kpi">
          <div className="kpi-label"><Icon name="painel" size={13} className="ic" /> Membros na rede</div>
          <div className="kpi-value">{r.membrosTotal}</div>
          <div className="kpi-foot"><span className="kpi-delta up">▲ {r.membrosDelta}%</span> · {r.novosMes} novos no mês</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><Icon name="painel" size={13} className="ic" /> Retenção de visitantes</div>
          <div className="kpi-value">{r.retencaoVisit}<span className="u">%</span></div>
          <div className="kpi-foot"><span className="kpi-delta up">▲ {r.retencaoDelta}%</span> viram membros</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><Icon name="painel" size={13} className="ic" /> Cobertura de escala</div>
          <div className="kpi-value">{r.coberturaEscala}<span className="u">%</span></div>
          <div className="kpi-foot"><span className="kpi-delta up">▲ {r.coberturaDelta}%</span> das posições preenchidas</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><Icon name="painel" size={13} className="ic" /> Frequência média</div>
          <div className="kpi-value">{r.freqMedia}</div>
          <div className="kpi-foot"><span className="kpi-delta up">▲ {r.freqDelta}%</span> por culto de domingo</div>
        </div>
      </div>

      <div className="dash-3col">
        {/* crescimento */}
        <div className="panel">
          <div className="panel-head"><span className="panel-title"><Icon name="painel" size={13} className="ic" /> Crescimento de membros</span><span className="panel-meta">12 meses</span></div>
          <div className="panel-body">
            <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.04em' }}>{r.membrosTotal}<span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500, marginLeft: 8 }}>membros · +{r.crescimento[r.crescimento.length - 1] - r.crescimento[0]} no período</span></div>
            <div style={{ marginTop: 14 }}><Bars series={r.crescimento} labels={r.meses} /></div>
          </div>
        </div>

        {/* funil de integração */}
        <div className="panel">
          <div className="panel-head"><span className="panel-title"><Icon name="painel" size={13} className="ic" /> Funil de visitantes</span><button className="panel-link" onClick={() => go('visitantes')}>Abrir</button></div>
          <div className="panel-body flush">
            {funil.map((e) => (
              <div className="dist-row" key={e.id}>
                <span className="dist-name" style={{ width: 140 }}>{e.nome}</span>
                <div className="dist-bar"><div className="dist-bar-fill" style={{ width: `${(e.n / maxFun) * 100}%`, background: e.cor }}></div></div>
                <span className="dist-num">{e.n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TERMÔMETRO DE BEM-ESTAR */}
      <div className="section-divide" style={{ marginTop: 28 }}>
        <span className="num">02</span><span className="label">Termômetro de bem-estar</span><span className="line"></span>
      </div>
      <div className="well-sum">
        {['saudavel', 'atencao', 'sobrecarga', 'afastando'].map((n) => (
          <div className="well-pill" key={n}>
            <div className="n" style={{ color: n === 'saudavel' ? 'var(--olive-soft)' : n === 'atencao' ? 'var(--amber)' : n === 'sobrecarga' ? 'var(--clay)' : 'var(--danger)' }}>{cont(n)}</div>
            <div className="l"><span className={`well-dot ${n}`}></span>{NIVEL[n]}</div>
          </div>
        ))}
      </div>
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title"><Icon name="painel" size={13} className="ic" /> Quem precisa de atenção</span>
          <button className="panel-link" onClick={() => go('pessoas')}>Voluntários</button>
        </div>
        <div className="panel-body flush">
          {ranked.slice(0, 8).map(({ p, nivel, score, motivo }) => (
            <div className="well-row" key={p.id}>
              <Av nome={p.nome} size="md" self={p.self} lead={p.lider.length > 0} />
              <div className="mini-main">
                <div className="mini-title">{p.nome}</div>
                <div className="mini-sub">{motivo}</div>
              </div>
              <div className="well-meter">
                <div className="well-track"><div className={`well-fill ${nivel}`} style={{ width: `${score}%` }}></div></div>
                <div className={`well-tag ${nivel}`}>{NIVEL[nivel]}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="dash-2col" style={{ marginTop: 28 }}>
        {/* distribuição por ministério */}
        <div className="panel">
          <div className="panel-head"><span className="panel-title"><Icon name="painel" size={13} className="ic" /> Voluntários por ministério</span><button className="panel-link" onClick={() => go('times')}>Times</button></div>
          <div className="panel-body flush">
            {porTime.map((t) => (
              <div className="dist-row" key={t.nome}>
                <span className="dist-name">{t.nome}</span>
                <div className="dist-bar"><div className="dist-bar-fill" style={{ width: `${(t.n / maxTime) * 100}%` }}></div></div>
                <span className="dist-num">{t.n}</span>
              </div>
            ))}
          </div>
        </div>
        {/* membros por GC */}
        <div className="panel">
          <div className="panel-head"><span className="panel-title"><Icon name="painel" size={13} className="ic" /> Membros por GC</span><span className="panel-meta">{S.GCS.length} grupos</span></div>
          <div className="panel-body flush">
            {S.GCS.map((g) => {
              const n = S.MEMBROS.filter((m) => m.gc === g.id).length;
              const maxGc = Math.max(...S.GCS.map((x) => S.MEMBROS.filter((m) => m.gc === x.id).length));
              return (
                <div className="dist-row" key={g.id}>
                  <span className="dist-name">{g.nome}</span>
                  <div className="dist-bar"><div className="dist-bar-fill" style={{ width: `${(n / maxGc) * 100}%` }}></div></div>
                  <span className="dist-num">{n}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Relatorios, bemEstar, cargaVol });
