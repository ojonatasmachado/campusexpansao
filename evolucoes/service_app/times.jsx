/* ════════════════════════════════════════════════════════════════
   CE.X SERVICE · Times & Ministérios + detalhe do culto
   ════════════════════════════════════════════════════════════════ */

function Times({ openTime }) {
  useRefresh();
  return (
    <div className="content">
      <div className="ph">
        <div>
          <div className="ph-eyebrow">Pessoas</div>
          <h1 className="ph-title">Times & Ministérios</h1>
          <p className="ph-sub">Cada ministério tem um líder, suas funções e seu time. A cor é só da marca: o que diferencia é o nome e o líder.</p>
        </div>
        <div className="ph-actions"><button className="btn btn-pri" onClick={() => cexCreate('time')}>+ Novo time</button></div>
      </div>
      <div className="team-grid">
        {S.TIMES.map((t) => {
          const membros = S.PESSOAS.filter((p) => p.times.includes(t.id));
          const lider = S.PESSOAS.find((p) => p.lider.includes(t.id));
          return (
            <button className="team-card" key={t.id} onClick={() => openTime(t.id)}>
              <div className="team-card-top">
                <div className="team-mark"><TeamMark t={t} size={20} /></div>
                <AvStack ids={membros.map((m) => m.id)} max={4} />
              </div>
              <div className="team-name">{t.nome}</div>
              <div className="team-lead">Líder: <em>{lider ? lider.nome : 'a definir'}</em></div>
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.55, marginTop: 12 }}>{t.desc}</div>
              <div className="team-foot">
                <span className="team-stat"><b>{membros.length}</b> voluntários</span>
                <span className="team-stat"><b>{t.funcoes.length}</b> funções</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── DETALHE DO TIME (drawer largo) ─── */
function TimeDrawer({ id, onClose, openPessoa, go, member }) {
  const t = tById(id); if (!t) return null;
  const info = S.timeInfo ? S.timeInfo(t.id) : null;
  const membros = S.PESSOAS.filter((p) => p.times.includes(t.id));
  const lider = S.PESSOAS.find((p) => p.lider.includes(t.id));
  /* roster por função */
  const porFuncao = t.funcoes.map((fn) => ({
    fn,
    pessoas: membros.filter((p) => p.funcoes.some((f) => f === fn || fn.includes(f) || f.includes(fn))),
  }));
  return (
    <>
      <div className="drawer-bg" onClick={onClose}></div>
      <div className="drawer">
        <div className="drawer-head">
          <button className="drawer-close" onClick={onClose}>✕</button>
          <div className="profile-top">
            <div className="team-mark" style={{ width: 56, height: 56, fontSize: 22 }}><TeamMark t={t} size={26} /></div>
            <div>
              <div className="profile-name">{t.nome}</div>
              <div className="profile-role">Líder: <span style={{ color: 'var(--olive)' }}>{lider ? lider.nome : 'a definir'}</span> · {membros.length} voluntários</div>
            </div>
          </div>
          <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6, marginTop: 14 }}>{t.desc}</p>
          {info && (
            <div style={{ marginTop: 14 }}>
              <span className={`topen ${info.aberto ? 'yes' : 'no'}`}>{info.aberto ? 'Recebendo voluntários' : 'Equipe completa por ora'}</span>
            </div>
          )}
        </div>
        <div className="drawer-body">
          {info && (
            <div className="dsec" style={{ marginTop: 4 }}>
              <div className="dsec-title">Sobre o time</div>
              <div className="tinfo">
                {info.proposito && (
                  <div className="tinfo-block">
                    <div className="tinfo-label"><Icon name="identidade" size={13} className="ic" /> Propósito</div>
                    <div className="tinfo-x">{info.proposito}</div>
                  </div>
                )}
                {info.comoTrabalha && (
                  <div className="tinfo-block">
                    <div className="tinfo-label"><Icon name="times" size={13} className="ic" /> Como trabalhamos</div>
                    <div className="tinfo-x">{info.comoTrabalha}</div>
                  </div>
                )}
                {info.chegada && (
                  <div className="tinfo-block">
                    <div className="tinfo-label"><Icon name="agenda" size={13} className="ic" /> Horário de chegada</div>
                    <div className="tinfo-x">{info.chegada}</div>
                  </div>
                )}
                {info.responsabilidades && info.responsabilidades.length > 0 && (
                  <div className="tinfo-block">
                    <div className="tinfo-label">→ O que esperamos</div>
                    {info.responsabilidades.map((r, i) => <div className="tinfo-li" key={i}>{r}</div>)}
                  </div>
                )}
                {info.preReqs && info.preReqs.length > 0 && (
                  <div className="tinfo-block">
                    <div className="tinfo-label"><Icon name="cursos" size={13} className="ic" /> Pré-requisitos</div>
                    {info.preReqs.map((cid) => {
                      const c = S.CURSOS.find((x) => x.id === cid);
                      return <div className="tprereq" key={cid}><Icon name="cursos" size={12} className="ic" /> Concluir o curso <b style={{ color: 'var(--white)', fontWeight: 600, marginLeft: 4 }}>{c ? c.nome : cid}</b></div>;
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="dsec" style={{ marginTop: info ? 26 : 4 }}>
            <div className="dsec-title">Funções & quem cobre</div>
            {porFuncao.map((g) => (
              <div key={g.fn} style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div className="esc-fn">{g.fn}</div>
                  <span className="panel-meta">{g.pessoas.length} aptos</span>
                </div>
                {g.pessoas.length === 0 ? <div style={{ fontSize: 12, color: 'var(--subtle)', fontFamily: 'var(--mono)' }}>Ninguém habilitado ainda.</div> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {g.pessoas.map((p) => (
                      <div className="cand" key={p.id} onClick={() => openPessoa(p.id)}>
                        <Av nome={p.nome} size="sm" self={p.self} lead={p.lider.includes(t.id)} />
                        <div className="cand-main">
                          <div className="cand-name">{p.nome}</div>
                          <div className="cand-meta">{p.lider.includes(t.id) ? 'Líder do time' : 'Voluntário'} · {p.engaj}% engajamento</div>
                        </div>
                        {p.status !== 'ativo' && <Chip st="wait" label="Pausa" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
            {member ? (
              <button className="btn btn-pri" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { cexToast('Pedido enviado! O líder do time vai falar com você.'); onClose(); }}>Quero servir aqui →</button>
            ) : (
              <>
                <button className="btn btn-pri" style={{ flex: 1, justifyContent: 'center' }} onClick={() => go('escalas')}>Ver escala do time →</button>
                <AddToTeamBtn t={t} />
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* botão + modal: adicionar voluntários existentes a um time */
function AddToTeamBtn({ t }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [, bump] = useState(0);
  const fora = (S.PESSOAS || []).filter((p) => !(p.times || []).includes(t.id) && (!q || p.nome.toLowerCase().includes(q.toLowerCase())));
  const add = (p) => { p.times = [...new Set([...(p.times || []), t.id])]; t.voluntarios = (t.voluntarios || 0) + 1; cexRefresh(); bump((n) => n + 1); cexToast(p.nome.split(' ')[0] + ' entrou em ' + t.nome.split(' ')[0] + '.'); };
  return (
    <>
      <button className="btn btn-sec" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setOpen(true)}>Adicionar pessoa</button>
      {open && (
        <div className="modal-bg" onClick={() => setOpen(false)} style={{ zIndex: 80 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-eyebrow">Adicionar ao time</div>
              <div className="modal-title">{t.nome}</div>
              <div className="modal-sub">Escolha voluntários para incluir neste ministério. Eles passam a aparecer na escala do time.</div>
            </div>
            <div className="modal-body">
              <div className="tb-search" style={{ marginBottom: 12 }}><span className="si"><Icon name="buscar" size={13} /></span><input placeholder="Buscar voluntário…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
              {fora.map((p) => (
                <div className="flag-row" key={p.id} style={{ cursor: 'pointer' }} onClick={() => add(p)}>
                  <Av nome={p.nome} size="sm" self={p.self} fotoId={p.volId} />
                  <div className="flag-main"><div className="flag-nome">{p.nome}</div><div className="flag-meta">{(p.times || []).map((tid) => { const tt = tById(tid); return tt ? tt.nome.split(' ')[0] : ''; }).filter(Boolean).join(' · ') || 'Sem time'}</div></div>
                  <span className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}>Adicionar</span>
                </div>
              ))}
              {fora.length === 0 && <div className="empty">Todos os voluntários já estão no time.</div>}
            </div>
            <div className="modal-foot"><button className="btn btn-pri" onClick={() => setOpen(false)}>Concluído</button></div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── CRONOGRAMA DO CULTO — roteiro etapa por etapa (hora, função, responsável) ─── */
const CRONO_CATS = [
  { v: 'admin', l: 'Administrativo' },
  { v: 'louvor', l: 'Louvor' },
  { v: 'mensagem', l: 'Mensagem' },
  { v: 'apresentacao', l: 'Apresentações' },
  { v: 'oracao', l: 'Oração' },
  { v: 'outro', l: 'Outro' },
];
const CRONO_CAT_L = Object.fromEntries(CRONO_CATS.map((c) => [c.v, c.l]));
function CronogramaEditor({ culto }) {
  const [, bump] = useState(0);
  const { TimePicker } = window;
  const passos = (culto.cronograma ||= []);
  const force = () => { bump((n) => n + 1); cexRefresh(); };

  const add = () => {
    passos.push({ dur: 15, item: '', time: null, resp: null, obs: '' });
    force();
  };
  const set = (i, k, v) => { passos[i] = { ...passos[i], [k]: v }; if (k === 'time') passos[i].resp = leaderPid(v); force(); };
  const rem = (i) => { passos.splice(i, 1); force(); };
  const move = (i, d) => { const j = i + d; if (j < 0 || j >= passos.length) return; const tmp = passos[i]; passos[i] = passos[j]; passos[j] = tmp; force(); };

  /* responsável de uma etapa = líder do time escolhido (não se edita aqui) */
  const leaderPid = (tid) => { const p = S.PESSOAS.find((x) => (x.lider || []).includes(tid)); return p ? p.id : null; };
  const leaderNome = (tid) => { const p = S.PESSOAS.find((x) => (x.lider || []).includes(tid)); if (p) return p.nome; const t = tById(tid); return t && t.lider ? t.lider : 'a definir'; };

  /* totais por categoria (minutos) */
  const totais = {};
  let totalGeral = 0;
  passos.forEach((s) => { const m = +s.dur || 0; totais[s.cat || 'outro'] = (totais[s.cat || 'outro'] || 0) + m; totalGeral += m; });
  const fmt = (min) => { const h = Math.floor(min / 60), m = min % 60; return (h ? h + 'h' : '') + (m || !h ? String(m).padStart(h ? 2 : 1, '0') + 'min' : ''); };

  /* hora de cada etapa = início do culto + soma das durações anteriores */
  const parseHora = (h) => { const mt = String(h || '').match(/(\d{1,2})[h:](\d{0,2})/); return mt ? (+mt[1]) * 60 + (+(mt[2] || 0)) : 19 * 60; };
  const toHora = (min) => { min = ((min % 1440) + 1440) % 1440; return String(Math.floor(min / 60)).padStart(2, '0') + 'h' + String(min % 60).padStart(2, '0'); };
  const inicioBase = parseHora(culto.hora);
  let _acc = inicioBase;
  const horaInicioPasso = passos.map((s) => { const t = _acc; _acc += (+s.dur || 0); return t; });
  /* grava de volta para o Setup/escala refletirem o horário calculado */
  passos.forEach((s, i) => { s.hora = toHora(horaInicioPasso[i]); });
  const fimCulto = toHora(_acc);

  return (
    <div className="crono">
      <div className="crono-anchor">
        <div className="crono-anchor-f">
          <label>Início do culto</label>
          <TimePicker value={culto.hora} onChange={(v) => { culto.hora = v; force(); }} />
        </div>
        <div className="crono-anchor-note">As etapas seguem em sequência somando as durações — você só informa quanto dura cada uma. Término previsto: <b>{fimCulto}</b>.</div>
      </div>
      {passos.length === 0 && <div className="crono-empty">Sem cronograma ainda. Monte o roteiro do culto, etapa por etapa — duração e o time responsável. O horário é calculado sozinho.</div>}
      <div className="crono-list">
        {passos.map((s, i) => {
          return (
            <div className="crono-step" key={i}>
              <div className="crono-rail">
                <div className="crono-hora">{toHora(horaInicioPasso[i])}</div>
                <div className="crono-dot"></div>
                {i < passos.length - 1 && <div className="crono-line"></div>}
              </div>
              <div className="crono-body">
                <div className="crono-row1">
                  <input className="crono-item-in" placeholder="Etapa do culto (ex: Momento de louvor)" value={s.item} onChange={(e) => set(i, 'item', e.target.value)} />
                  <div className="crono-actions">
                    <button className="crono-mini" title="Subir" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
                    <button className="crono-mini" title="Descer" onClick={() => move(i, 1)} disabled={i === passos.length - 1}>↓</button>
                    <button className="crono-mini danger" title="Remover" onClick={() => rem(i)}>✕</button>
                  </div>
                </div>
                <div className="crono-fields">
                  <div className="crono-f crono-f-dur">
                    <label>Duração</label>
                    <div className="crono-dur"><input type="number" min="0" step="5" value={s.dur || ''} onChange={(e) => set(i, 'dur', +e.target.value)} /><span>min</span></div>
                  </div>
                  <div className="crono-f">
                    <label>Time (opcional)</label>
                    <select className="select" value={s.time || ''} onChange={(e) => set(i, 'time', e.target.value || null)}>
                      <option value="">— sem time</option>
                      {(culto.times && culto.times.length ? S.TIMES.filter((x) => culto.times.includes(x.id)) : S.TIMES).map((tm) => <option key={tm.id} value={tm.id}>{tm.nome}</option>)}
                    </select>
                  </div>
                  {s.time && (
                  <div className="crono-f crono-f-full">
                    <label>Responsável (líder do time)</label>
                    <div className="crono-resp-ro">{leaderNome(s.time)}</div>
                  </div>
                  )}
                </div>
                <input className="crono-obs" placeholder="Observação (opcional)" value={s.obs || ''} onChange={(e) => set(i, 'obs', e.target.value)} />
                {s.time === 'louvor' && S.setlist(culto.id).length > 0 && (
                  <div className="crono-louvores">
                    <div className="crono-louvores-t"><Icon name="louvor" size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />Repertório (da escala do louvor)</div>
                    {S.setlist(culto.id).map((song, k) => (
                      <div className="crono-louvor" key={k}><span>{String(k + 1).padStart(2, '0')}</span>{song.titulo}{song.tom ? ' · ' + song.tom : ''}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <button className="btn btn-sec btn-sm crono-add" onClick={add}>+ Adicionar etapa</button>

      {passos.length > 0 && (
        <div className="crono-totais">
          <div className="crono-tot-geral"><span>Duração total do culto</span><b>{fmt(totalGeral)}</b></div>
        </div>
      )}
    </div>
  );
}

/* ─── DETALHE DO CULTO (drawer) — posições por time + cronograma ─── */
function CultoDrawer({ id, onClose, openPessoa, go }) {
  const [share, setShare] = useState(false);
  const [aba, setAba] = useState('crono');
  const c = cById(id); if (!c) return null;
  const blocos = S.TIMES.map((t) => {
    const esc = S.ESCALAS[t.id]; if (!esc) return null;
    const linhas = esc.funcoes.map((f) => ({ fn: f.fn, need: f.need, slots: f.cells[c.id] || [] })).filter((l) => l.slots.length > 0 || l.need > 0);
    const has = linhas.some((l) => l.slots.length > 0);
    return has ? { t, linhas } : null;
  }).filter(Boolean);
  return (
    <>
      <div className="drawer-bg" onClick={onClose}></div>
      <div className="drawer drawer-wide">
        <div className="drawer-head">
          <button className="drawer-close" onClick={onClose}>✕</button>
          <div className="ph-eyebrow" style={{ marginBottom: 8 }}>{c.dia} · {c.data}</div>
          <div className="profile-name">{c.nome}</div>
          <div className="profile-role">{c.hora} · {c.local} · {c.tipo}</div>
          <div className="seg" style={{ marginTop: 14 }}>
            <button className={aba === 'crono' ? 'on' : ''} onClick={() => setAba('crono')}>Cronograma</button>
            <button className={aba === 'posicoes' ? 'on' : ''} onClick={() => setAba('posicoes')}>Posições</button>
          </div>
        </div>
        <div className="drawer-body">
          {aba === 'crono' ? (
            <div className="dsec" style={{ marginTop: 4 }}>
              <div className="dsec-title">Roteiro do culto · etapa por etapa</div>
              <CronogramaEditor culto={c} />
            </div>
          ) : (
          <>
          {blocos.map(({ t, linhas }) => (
            <div className="dsec" key={t.id} style={{ marginTop: 18 }}>
              <div className="dsec-title"><TeamMark t={t} size={14} style={{ verticalAlign: '-2px', marginRight: 4 }} /> {t.nome}</div>
              {linhas.map((l) => {
                const valid = l.slots.filter((s) => s.st !== 'no').length;
                const missing = Math.max(0, l.need - valid);
                return (
                  <div key={l.fn} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                      <span className="esc-fn" style={{ fontSize: 13 }}>{l.fn}</span>
                      <span className="panel-meta">{valid}/{l.need}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                      {l.slots.map((s, i) => {
                        const p = pById(s.p);
                        return (
                          <div key={i} className="slot" style={{ margin: 0, width: 'auto' }} onClick={() => openPessoa(s.p)}>
                            <Av nome={p.nome} size="xs" />
                            <span className="slot-name" style={{ maxWidth: 120 }}>{p.nome.split(' ')[0]}</span>
                            <span className={`slot-st ${s.st}`}></span>
                          </div>
                        );
                      })}
                      {Array.from({ length: missing }).map((_, i) => (
                        <button key={`e${i}`} className="slot-empty" style={{ width: 'auto', padding: '7px 14px' }} onClick={() => go('escalas')}>+ vaga</button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          </>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button className="btn btn-pri" style={{ flex: 1, justifyContent: 'center' }} onClick={() => go('escalas')}>Editar escala →</button>
            <button className="btn btn-sec" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShare(true)}><Icon name="comunicacao" size={15} /> Setup da celebração</button>
          </div>
        </div>
      </div>
      {share && <EventoShare culto={c} blocos={blocos} onClose={() => setShare(false)} />}
    </>
  );
}

Object.assign(window, { Times, TimeDrawer, CultoDrawer, CronogramaEditor });
