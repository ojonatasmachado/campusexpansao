/* ════════════════════════════════════════════════════════════════
   CE.X SERVICE · VISITANTES (CRM) + COMUNICAÇÃO
   ════════════════════════════════════════════════════════════════ */

function Visitantes({ openVisitante }) {
  useRefresh();
  const [view, setView] = useState('pipe');
  const [cfgOpen, setCfgOpen] = useState(false);
  const cc = S.CONTATO_CFG;
  const porEtapa = (id) => S.VISITANTES.filter((v) => v.etapa === id);
  return (
    <div className="content wide">
      <div className="ph">
        <div>
          <div className="ph-eyebrow">Pessoas</div>
          <h1 className="ph-title">Visitantes</h1>
          <p className="ph-sub">Da primeira visita ao discipulado. Cada visitante tem um próximo passo e o histórico de contato. Qualquer um da equipe pode dar seguimento a quem está num estágio.</p>
        </div>
        <div className="ph-actions">
          <div className="seg">
            <button className={view === 'pipe' ? 'on' : ''} onClick={() => setView('pipe')}>Funil</button>
            <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>Lista</button>
            <button className={view === 'painel' ? 'on' : ''} onClick={() => setView('painel')}>Painel</button>
          </div>
          <button className="btn btn-pri" onClick={() => cexCreate('visitante')}>+ Visitante</button>
        </div>
      </div>

      <div className="contato-banner">
        <div className="contato-pill"><span className="contato-pill-n">{cc.prazoHoras}h</span><span>1º contato</span></div>
        <div className="contato-main">
          <div className="contato-t">Primeiro contato em até <em>{cc.prazoHoras}h</em> por <em>{cc.canal}</em> · meta de integração: <em>{cc.metaIntegracaoDias} dias</em></div>
          <div className="contato-s">{cc.abordagem}</div>
        </div>
        <button className="btn btn-sec btn-sm" onClick={() => setCfgOpen(true)}>Ajustar</button>
      </div>
      {cfgOpen && <ContatoCfgModal onClose={() => setCfgOpen(false)} />}

      {view === 'painel' ? (
        <VisitantesPainel openVisitante={openVisitante} />
      ) : view === 'pipe' ? (
        <div className="pipe">
          {S.ETAPAS.map((e) => {
            const itens = porEtapa(e.id);
            return (
              <div className="pipe-col" key={e.id}>
                <div className="pipe-head">
                  <span className="pipe-dot" style={{ background: e.cor }}></span>
                  <span className="pipe-name">{e.nome}</span>
                  <span className="pipe-num">{itens.length}</span>
                </div>
                <div className="pipe-body">
                  {itens.map((v) => {
                    const r = pById(v.resp);
                    return (
                      <div className="vcard" key={v.id} onClick={() => openVisitante(v.id)}>
                        <div className="vcard-top">
                          <Av nome={v.nome} size="sm" />
                          <div style={{ minWidth: 0 }}>
                            <div className="vcard-name">{v.nome}</div>
                            <div className="vcard-when">{v.origem}</div>
                          </div>
                        </div>
                        <div className="vcard-foot">
                          {v.resposta === 'sem_resposta'
                            ? <span className="vcard-noresp">sem resposta</span>
                            : v.resposta === 'respondeu'
                              ? <span className="vcard-resp">respondeu</span>
                              : <div className="vcard-owner">{v.origem || 'Visitante'}</div>}
                          <span className={`vcard-due ${v.dueSt}`}>{v.due}</span>
                        </div>
                      </div>
                    );
                  })}
                  {itens.length === 0 && <div style={{ fontSize: 11, color: 'var(--subtle)', textAlign: 'center', padding: 14, fontFamily: 'var(--mono)' }}>vazio</div>}
                </div>
              </div>
            );
          })}
        </div>
      ) : view === 'list' ? (
        <div className="tbl">
          <div className="tr head" style={{ gridTemplateColumns: '1.4fr 1fr 1fr 1fr 120px' }}><span>Visitante</span><span>Etapa</span><span>Como chegou</span><span>Próximo passo</span><span>Visitou</span></div>
          {S.VISITANTES.map((v) => {
            const et = S.ETAPAS.find((e) => e.id === v.etapa);
            return (
              <div className="tr click" key={v.id} style={{ gridTemplateColumns: '1.4fr 1fr 1fr 1fr 120px' }} onClick={() => openVisitante(v.id)}>
                <div className="cell-person"><Av nome={v.nome} size="md" /><div><div className="cell-name">{v.nome}</div><div className="cell-sub">{v.tel}</div></div></div>
                <div><span className="chip chip-neutral" style={{ color: et.cor, borderColor: 'var(--border-2)' }}>{et.nome}</span></div>
                <div><span style={{ fontSize: 13, color: 'var(--light)' }}>{v.origem || 'Visitante'}</span></div>
                <div><span className={`vcard-due ${v.dueSt}`}>{v.due}</span></div>
                <div className="mini-right">{v.visitou}</div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/* ─── PAINEL DE VISITANTES (por culto · % que responde · % que integra) ─── */
function VisitantesPainel({ openVisitante }) {
  const vs = S.VISITANTES;
  const total = vs.length;
  const contatados = vs.filter((v) => v.resposta === 'respondeu' || v.resposta === 'sem_resposta');
  const responderam = vs.filter((v) => v.resposta === 'respondeu');
  const semResposta = vs.filter((v) => v.resposta === 'sem_resposta');
  const naoContatados = vs.filter((v) => !v.resposta);
  const membros = vs.filter((v) => v.etapa === 'membro');
  const integrando = vs.filter((v) => v.etapa === 'integrando' || v.etapa === 'membro');
  const pctResponde = contatados.length ? Math.round((responderam.length / contatados.length) * 100) : 0;
  const pctIntegra = total ? Math.round((membros.length / total) * 100) : 0;

  /* por culto (agrupado pelo campo visitou) */
  const porCulto = {};
  vs.forEach((v) => { const k = v.visitou || 'Sem registro'; porCulto[k] = (porCulto[k] || 0) + 1; });
  const cultosOrd = Object.keys(porCulto).sort((a, b) => porCulto[b] - porCulto[a]);
  const maxCulto = Math.max(...Object.values(porCulto), 1);

  return (
    <div className="vpanel">
      <div className="kpi-row">
        <div className="kpi">
          <div className="kpi-label"><Icon name="visitante" size={13} className="ic" /> Visitantes</div>
          <div className="kpi-value">{total}</div>
          <div className="kpi-foot">no acompanhamento</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><Icon name="comunicacao" size={13} className="ic" /> Respondem o contato</div>
          <div className="kpi-value">{pctResponde}%</div>
          <div className="kpi-foot">{responderam.length} de {contatados.length} contatados</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><Icon name="ok" size={13} className="ic" /> Integram (viram membro)</div>
          <div className="kpi-value" style={{ color: 'var(--olive)' }}>{pctIntegra}%</div>
          <div className="kpi-foot">{membros.length} de {total} · {integrando.length} em integração</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><Icon name="alerta" size={13} className="ic" /> Sem resposta</div>
          <div className="kpi-value" style={{ color: 'var(--amber)' }}>{semResposta.length}</div>
          <div className="kpi-foot">precisam de novo contato</div>
        </div>
      </div>

      <div className="vpanel-grid">
        <div className="panel">
          <div className="panel-head"><span className="panel-title"><Icon name="cultos" size={14} className="ic" /> Visitantes por culto</span></div>
          <div className="panel-body">
            {cultosOrd.map((k) => (
              <div className="dist-row" key={k} style={{ padding: '9px 0' }}>
                <span className="dist-name" style={{ width: 130 }}>{k}</span>
                <div className="dist-bar"><div className="dist-bar-fill" style={{ width: `${(porCulto[k] / maxCulto) * 100}%` }}></div></div>
                <span className="dist-num">{porCulto[k]}</span>
              </div>
            ))}
            {cultosOrd.length === 0 && <div className="empty">Nenhum visitante ainda.</div>}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><span className="panel-title"><Icon name="comunicacao" size={14} className="ic" /> Resposta ao 1º contato</span></div>
          <div className="panel-body">
            <div className="resp-split">
              <div className="resp-seg respondeu" style={{ flex: Math.max(responderam.length, 0.001) }} title="Responderam"></div>
              <div className="resp-seg sem" style={{ flex: Math.max(semResposta.length, 0.001) }} title="Sem resposta"></div>
              <div className="resp-seg nao" style={{ flex: Math.max(naoContatados.length, 0.001) }} title="Ainda não contatados"></div>
            </div>
            <div className="resp-legend">
              <span><i className="resp-dot respondeu"></i> {responderam.length} responderam</span>
              <span><i className="resp-dot sem"></i> {semResposta.length} sem resposta</span>
              <span><i className="resp-dot nao"></i> {naoContatados.length} a contatar</span>
            </div>
            <div className="dsec-title" style={{ margin: '18px 0 8px' }}>Não responderam · refazer contato</div>
            {semResposta.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--subtle)' }}>Ninguém sem resposta. 🙌</div>}
            {semResposta.map((v) => {
              const r = pById(v.resp);
              return (
                <div className="flag-row click" key={v.id} style={{ cursor: 'pointer' }} onClick={() => openVisitante(v.id)}>
                  <Av nome={v.nome} size="sm" />
                  <div className="flag-main"><div className="flag-nome">{v.nome}</div><div className="flag-meta">{v.visitou} · {r ? 'resp. ' + r.nome.split(' ')[0] : 'sem dono'}</div></div>
                  <span className="vcard-noresp" style={{ marginLeft: 'auto' }}>sem resposta</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── FICHA DO VISITANTE (drawer + trilha) ─── */
function VisitanteDrawer({ id, onClose, openPessoa }) {
  const v0 = S.VISITANTES.find((x) => x.id === id);
  const [v, setV] = useState(v0);
  const [nota, setNota] = useState('');
  const [resp, setResp] = useState('');
  if (!v) return null;
  const r = pById(v.resp);
  const et = S.ETAPAS.find((e) => e.id === v.etapa);
  const etIdx = S.ETAPAS.findIndex((e) => e.id === v.etapa);
  const addNota = () => {
    if (!nota.trim() && !resp) { cexToast('Escreva o contato ou marque a resposta.', 'warn'); return; }
    const marca = resp === 'respondeu' ? ' [respondeu]' : resp === 'sem_resposta' ? ' [não respondeu]' : '';
    const entry = { when: 'agora', txt: (nota.trim() || 'Contato registrado.') + marca, by: cexWho(), ol: true };
    v0.historico = [entry, ...(v0.historico || [])];
    if (resp) v0.resposta = resp;
    setV((p) => ({ ...p, historico: v0.historico, resposta: resp || p.resposta }));
    setNota(''); setResp('');
    cexRefresh();
    cexToast(resp === 'sem_resposta' ? 'Registrado: sem resposta. Vale um novo contato.' : 'Contato salvo no histórico.');
  };
  const avancar = () => {
    if (etIdx >= S.ETAPAS.length - 1) return;
    const prox = S.ETAPAS[etIdx + 1];
    setV((p) => ({ ...p, etapa: prox.id, historico: [{ when: 'agora', txt: `Avançou para "${prox.nome}".`, by: cexWho(), ol: true }, ...p.historico] }));
    cexToast('Avançou para "' + prox.nome + '". Registrado por ' + cexWho() + '.');
  };
  return (
    <>
      <div className="drawer-bg" onClick={onClose}></div>
      <div className="drawer">
        <div className="drawer-head">
          <button className="drawer-close" onClick={onClose}>✕</button>
          <div className="profile-top">
            <Av nome={v.nome} size="xl" />
            <div>
              <div className="profile-name">{v.nome}</div>
              <div className="profile-role">{v.origem} · primeira visita {v.visitou}</div>
              <div style={{ marginTop: 10 }}><span className="chip chip-neutral" style={{ color: et.cor }}>{et.nome}</span></div>
            </div>
          </div>
        </div>
        <div className="drawer-body">
          <div className="dsec" style={{ marginTop: 4 }}>
            <div className="dsec-title">Contato</div>
            <dl className="kv">
              <dt>Telefone</dt><dd><a href={`tel:${v.tel}`}>{v.tel}</a></dd>
              <dt>Como chegou</dt><dd>{v.origem || 'Visitante'}</dd>
              <dt>Primeira visita</dt><dd>{v.visitou}</dd>
              <dt>Próximo passo</dt><dd><span className={`vcard-due ${v.dueSt}`} style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{v.due}</span></dd>
            </dl>
            <div style={{ fontSize: 12, color: 'var(--subtle)', marginTop: 10 }}>Sem dono fixo: qualquer um da equipe pode dar seguimento e o avanço registra quem foi.</div>
          </div>

          {/* etapa pipeline */}
          <div className="dsec">
            <div className="dsec-title">Jornada de integração</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {S.ETAPAS.map((e, i) => (
                <div key={e.id} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ height: 5, borderRadius: 3, background: i <= etIdx ? e.cor : 'var(--ink)' }}></div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: i <= etIdx ? 'var(--light)' : 'var(--subtle)', marginTop: 7, letterSpacing: '0.04em' }}>{e.nome}</div>
                </div>
              ))}
            </div>
            {etIdx < S.ETAPAS.length - 1
              ? <button className="btn btn-pri btn-sm" style={{ marginTop: 16, width: '100%', justifyContent: 'center' }} onClick={avancar}>Avançar para "{S.ETAPAS[etIdx + 1].nome}" →</button>
              : <div className="vmember-cta">
                  <div className="vmember-t"><Icon name="ok" size={13} className="ic" /> Chegou a membro</div>
                  <div className="vmember-s">Complete os dados cadastrais para liberar o acesso ao app (e-mail + telefone viram o login).</div>
                  <button className="btn btn-pri btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }} onClick={() => { onClose(); cexCreate('membro', { nome: v.nome, tel: v.tel }); }}>Completar dados de membro →</button>
                </div>}
          </div>

          {/* registrar contato */}
          <div className="dsec">
            <div className="dsec-title">Registrar contato</div>
            {v.resposta && <div className={`vresp-now ${v.resposta}`}>{v.resposta === 'respondeu' ? '◆ Último contato: respondeu' : '◇ Último contato: sem resposta — refazer'}</div>}
            <textarea className="textarea" placeholder="O que rolou nesse contato? (ligação, WhatsApp, visita...)" value={nota} onChange={(e) => setNota(e.target.value)}></textarea>
            <div className="vresp-pick">
              <span className="vresp-lbl">A pessoa respondeu?</span>
              <div className="seg-check">
                <button className={`seg-chip ${resp === 'respondeu' ? 'on' : ''}`} onClick={() => setResp(resp === 'respondeu' ? '' : 'respondeu')}>Respondeu</button>
                <button className={`seg-chip ${resp === 'sem_resposta' ? 'on' : ''}`} onClick={() => setResp(resp === 'sem_resposta' ? '' : 'sem_resposta')}>Não respondeu</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn btn-pri btn-sm" onClick={addNota}>Salvar no histórico</button>
              <button className="btn btn-sec btn-sm"><Icon name="agenda" size={14} /> Agendar lembrete</button>
            </div>
          </div>

          {/* histórico */}
          <div className="dsec">
            <div className="dsec-title">Histórico de contato</div>
            <div className="tl">
              {v.historico.map((h, i) => (
                <div className={`tl-item ${h.ol ? 'ol' : ''}`} key={i}>
                  <div className="tl-dot"></div>
                  <div className="tl-when">{h.when}</div>
                  <div className="tl-text">{h.txt}</div>
                  <div className="tl-by">por {h.by}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ════════ COMUNICAÇÃO ════════ */
function Composer({ onClose }) {
  const [alvos, setAlvos] = useState(['Todos os times']);
  const [canais, setCanais] = useState(['app', 'push']);
  const opcoes = ['Todos os times', ...S.TIMES.map((t) => t.nome)];
  const toggle = (set, fn, v) => fn(set.includes(v) ? set.filter((x) => x !== v) : [...set, v]);
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Novo comunicado</div>
          <div className="modal-title">Falar com a equipe</div>
          <div className="modal-sub">Escreva uma vez e escolha quem recebe e por onde. O voluntário vê no app e na notificação.</div>
        </div>
        <div className="modal-body">
          <div className="field">
            <label className="field-label">Mensagem</label>
            <textarea className="textarea" placeholder="Ex.: Ensaio geral sábado 16h. Chegada 15h45 para passagem de som." defaultValue=""></textarea>
          </div>
          <div className="field">
            <label className="field-label">Para quem</label>
            <div className="seg-check">
              {opcoes.map((o) => <button key={o} className={`seg-chip ${alvos.includes(o) ? 'on' : ''}`} onClick={() => toggle(alvos, setAlvos, o)}>{o.split(' ')[0]}</button>)}
            </div>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="field-label">Canais</label>
            <div className="seg-check">
              {[['app', 'No app'], ['push', 'Notificação push'], ['email', 'E-mail']].map(([id, l]) => (
                <button key={id} className={`seg-chip ${canais.includes(id) ? 'on' : ''}`} onClick={() => toggle(canais, setCanais, id)}>{l}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-pri" onClick={onClose}>Enviar para {alvos.length} grupo(s) →</button>
        </div>
      </div>
    </div>
  );
}

function Comunicacao() {
  const [view, setView] = useState('mural');
  const [sel, setSel] = useState('a1');
  const [compose, setCompose] = useState(false);
  const a = S.AVISOS.find((x) => x.id === sel);
  return (
    <div className="content wide">
      <div className="ph">
        <div>
          <div className="ph-eyebrow">Operação</div>
          <h1 className="ph-title">Comunicação</h1>
          <p className="ph-sub">Mural em tempo real e avisos segmentados. O voluntário recebe no app e por notificação, e você vê quem leu.</p>
        </div>
        <div className="ph-actions">
          <div className="seg">
            <button className={view === 'mural' ? 'on' : ''} onClick={() => setView('mural')}>Mural</button>
            <button className={view === 'avisos' ? 'on' : ''} onClick={() => setView('avisos')}>Avisos</button>
          </div>
          <button className="btn btn-pri" onClick={() => setCompose(true)}>+ Novo comunicado</button>
        </div>
      </div>

      {view === 'mural' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16, alignItems: 'start' }}>
          <div className="feed">
            {S.MURAL.map((p) => (
              <div className={`post ${p.fixado ? 'pin' : ''}`} key={p.id}>
                <div className="post-top">
                  <Av nome={p.autor} size="md" />
                  <div className="post-who">
                    <div className="post-name">{p.autor} {p.fixado && <span className="post-pin"><Icon name="sino" size={11} className="ic" /> fixado</span>}</div>
                    <div className="post-meta">para {p.para} · {p.when}</div>
                  </div>
                </div>
                <p className="post-txt">{p.txt}</p>
                <div className="post-foot">
                  <span className="post-stat"><span className="ol">♥</span> {p.react} reações</span>
                  <span className="post-stat"><span className="ol">◉</span> {p.lidos}/{p.total} leram</span>
                  <div style={{ flex: 1 }}></div>
                  {p.canal.map((c) => <span key={c} className="chan">{c === 'push' ? 'push' : c === 'app' ? 'app' : 'e-mail'}</span>)}
                </div>
              </div>
            ))}
          </div>
          <div className="panel" style={{ position: 'sticky', top: 88 }}>
            <div className="panel-head"><span className="panel-title"><Icon name="relatorios" size={14} className="ic" /> Alcance da semana</span></div>
            <div className="panel-body">
              <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.04em' }}>91%<span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500, marginLeft: 8 }}>taxa de leitura</span></div>
              <div style={{ marginTop: 14 }}>
                {S.TIMES.slice(0, 4).map((t, i) => {
                  const pct = [96, 88, 79, 84][i];
                  return (
                    <div className="dist-row" key={t.id} style={{ padding: '10px 0' }}>
                      <span className="dist-name" style={{ width: 120 }}>{t.nome.split(' ')[0]}</span>
                      <div className="dist-bar"><div className="dist-bar-fill" style={{ width: `${pct}%`, background: pct < 80 ? 'var(--amber)' : 'var(--olive)' }}></div></div>
                      <span className="dist-num">{pct}%</span>
                    </div>
                  );
                })}
              </div>
              <button className="btn btn-sec btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}>Cobrar quem não leu</button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16 }}>
          <div className="tbl">
            {S.AVISOS.map((x) => (
              <div key={x.id} className="mini-row click" style={{ background: x.id === sel ? 'var(--olive-dim)' : 'transparent' }} onClick={() => setSel(x.id)}>
                <div className="mini-main">
                  <div className="mini-title">{x.titulo}</div>
                  <div className="mini-sub">{x.para} · {x.when}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="panel">
            <div className="panel-head">
              <span className="panel-title"><Icon name="comunicacao" size={14} className="ic" /> {a.titulo}</span>
              <span className="panel-meta">{a.when}</span>
            </div>
            <div className="panel-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <Av nome={a.autor} size="sm" />
                <div><div style={{ fontSize: 13, fontWeight: 600 }}>{a.autor}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>para {a.para}</div></div>
              </div>
              <p style={{ fontSize: 15, color: 'var(--light)', lineHeight: 1.7 }}>{a.txt}</p>
              <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                <button className="btn btn-pri btn-sm" onClick={() => cexToast('Notificação reenviada à equipe.')}>Reenviar notificação</button>
                <VerQuemLeuBtn aviso={a} />
              </div>
            </div>
          </div>
        </div>
      )}

      {compose && <Composer onClose={() => setCompose(false)} />}
    </div>
  );
}

/* config do líder da área: prazo + abordagem do 1º contato */
function ContatoCfgModal({ onClose }) {
  const cc = S.CONTATO_CFG;
  const [v, setV] = useState({ ...cc });
  const set = (k, val) => setV((p) => ({ ...p, [k]: val }));
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Líder da integração</div>
          <div className="modal-title">Como acolhemos quem chega</div>
          <div className="modal-sub">Defina o prazo e a abordagem do primeiro contato. Fica claro para a equipe e deixa visível quanto tempo leva para integrar.</div>
        </div>
        <div className="modal-body">
          <div className="field field-half"><label className="field-label">Prazo do 1º contato (horas)</label><input className="input" type="number" value={v.prazoHoras} onChange={(e) => set('prazoHoras', +e.target.value)} /></div>
          <div className="field field-half"><label className="field-label">Canal</label>
            <select className="select" value={v.canal} onChange={(e) => set('canal', e.target.value)}>
              {['WhatsApp', 'Ligação', 'Mensagem', 'Presencial'].map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="field field-half"><label className="field-label">Meta de integração (dias)</label><input className="input" type="number" value={v.metaIntegracaoDias} onChange={(e) => set('metaIntegracaoDias', +e.target.value)} /></div>
          <div className="field"><label className="field-label">Mensagem padrão</label><textarea className="textarea" value={v.mensagem} onChange={(e) => set('mensagem', e.target.value)} /><div style={{ fontSize: 11, color: 'var(--subtle)', marginTop: 6 }}>Use {'{nome}'}, {'{evento}'} e {'{igreja}'} — preenchemos automaticamente.</div></div>
          <div className="field"><label className="field-label">Abordagem / postura</label><textarea className="textarea" value={v.abordagem} onChange={(e) => set('abordagem', e.target.value)} /></div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-sec" onClick={onClose}>Cancelar</button>
          <button className="btn btn-pri" onClick={() => { Object.assign(S.CONTATO_CFG, v); cexRefresh(); cexToast('Parâmetros de contato salvos.'); onClose(); }}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

/* botão + modal: quem já leu um aviso (leitura simulada no protótipo) */
function VerQuemLeuBtn({ aviso }) {
  const [open, setOpen] = useState(false);
  const pessoas = S.PESSOAS || [];
  const corte = Math.ceil(pessoas.length * 0.6);
  const leram = pessoas.slice(0, corte);
  const naoLeram = pessoas.slice(corte);
  return (
    <>
      <button className="btn btn-sec btn-sm" onClick={() => setOpen(true)}>Ver quem leu</button>
      {open && (
        <div className="modal-bg" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-eyebrow">Confirmação de leitura</div>
              <div className="modal-title">{aviso ? aviso.titulo : 'Aviso'}</div>
              <div className="modal-sub">{leram.length} de {pessoas.length} já leram este aviso.</div>
            </div>
            <div className="modal-body">
              <div className="dsec-title" style={{ marginBottom: 8 }}>Leram · {leram.length}</div>
              {leram.map((p) => (
                <div className="flag-row" key={p.id} style={{ cursor: 'default' }}>
                  <Av nome={p.nome} size="sm" self={p.self} fotoId={p.volId} />
                  <div className="flag-main"><div className="flag-nome">{p.nome}</div></div>
                  <Icon name="ok" size={16} style={{ marginLeft: 'auto', color: 'var(--olive)' }} />
                </div>
              ))}
              {naoLeram.length > 0 && <div className="dsec-title" style={{ margin: '14px 0 8px' }}>Ainda não leram · {naoLeram.length}</div>}
              {naoLeram.map((p) => (
                <div className="flag-row" key={p.id} style={{ cursor: 'default', opacity: 0.6 }}>
                  <Av nome={p.nome} size="sm" self={p.self} fotoId={p.volId} />
                  <div className="flag-main"><div className="flag-nome">{p.nome}</div></div>
                  <span className="cand-fit busy" style={{ marginLeft: 'auto' }}>pendente</span>
                </div>
              ))}
            </div>
            <div className="modal-foot"><button className="btn btn-pri" onClick={() => setOpen(false)}>Fechar</button></div>
          </div>
        </div>
      )}
    </>
  );
}

Object.assign(window, { Visitantes, VisitanteDrawer, Comunicacao, ContatoCfgModal });
