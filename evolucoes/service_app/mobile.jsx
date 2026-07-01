/* ════════════════════════════════════════════════════════════════
   CE.X SERVICE · APP DO MEMBRO / LIDERADO (mobile · PWA)
   Mesmo app, o login decide o que vê. O membro: jornada, escala,
   tarefas do quadro, conversas, cursos, avisos, oração e perfil.
   Quem serve na Recepção registra e evolui visitantes pelo celular.
   ════════════════════════════════════════════════════════════════ */

/* personas de pré-visualização (o usuário troca quem está "logado") */
const PERSONAS = [
  { vol: 'p1', mem: 'm1', tag: 'Líder do Louvor' },
  { vol: 'p5', mem: 'm5', tag: 'Voluntário · Louvor' },
  { vol: 'p8', mem: 'm8', tag: 'Recepção · Acolhida' },
];

function minhasEscalas(volId) {
  const out = [];
  S.TIMES.forEach((t) => {
    const esc = S.ESCALAS[t.id]; if (!esc) return;
    esc.funcoes.forEach((f) => S.CULTOS.forEach((c) => {
      (f.cells[c.id] || []).forEach((s) => { if (s.p === volId) out.push({ id: `${t.id}-${f.fn}-${c.id}`, culto: c, fn: f.fn, time: t, st: s.st }); });
    }));
  });
  return out;
}
function meusCursos(memId) {
  const out = [];
  S.CURSOS.forEach((c) => (S.MATRICULAS[c.id] || []).forEach((mt) => {
    if (mt.mid === memId) out.push({ curso: c, feitas: mt.feitas, total: S.totalAulas(c), status: mt.status });
  }));
  return out;
}
/* cards do quadro onde este voluntário é responsável */
function minhasTarefas(volId) {
  return (S.CARDS || []).filter((c) => (c.resp || []).includes(volId));
}

/* ─── INÍCIO ─── */
function MTabInicio({ eu, mem, go, openTeam }) {
  const esc = minhasEscalas(eu.id);
  const prox = esc[0];
  const passo = S.proxPasso(mem.id);
  const done = mem.jornada.filter(Boolean).length;
  const pend = esc.filter((e) => e.st === 'wait').length;
  const tarefas = minhasTarefas(eu.id).filter((c) => c.col !== 'done');
  const tarefasAtras = tarefas.filter((c) => S.isAtrasado(c)).length;
  const ciclo = S.CICLOS ? S.CICLOS.find((c) => c.ativo) : null;
  const isRecep = eu.times.includes('recepcao');
  const meusTimes = mem.volId ? eu.times : [];
  const abertos = (S.TIMES || []).filter((t) => { const i = S.timeInfo && S.timeInfo(t.id); return i && i.aberto && !meusTimes.includes(t.id); });
  return (
    <>
      {pend > 0 && (
        <div className="m-alert" onClick={() => go('escalas')}>
          <span className="m-alert-ic">!</span>
          <div><b>{pend} escala(s) pra confirmar</b><small>Toque para responder</small></div>
          <span className="m-alert-go">→</span>
        </div>
      )}
      {tarefas.length > 0 && (
        <div className="m-alert" style={tarefasAtras ? null : { borderColor: 'var(--olive-line)', background: 'var(--olive-dim)' }} onClick={() => go('tarefas')}>
          <span className="m-alert-ic" style={tarefasAtras ? null : { background: 'var(--olive)', color: 'var(--ink)' }}>☑</span>
          <div><b>{tarefas.length} tarefa(s) com você</b><small>{tarefasAtras ? tarefasAtras + ' atrasada(s) · resolver' : 'no seu quadro'}</small></div>
          <span className="m-alert-go">→</span>
        </div>
      )}

      <div className="m-section-t">Sua caminhada</div>
      <div className="m-journey">
        <div className="m-journey-top">
          <div>
            <div className="m-journey-step">{done}/5 etapas</div>
            <div className="m-journey-next">Próximo: <em>{passo}</em></div>
          </div>
          <div className="m-ring" style={{ '--p': `${(done / 5) * 100}%` }}><span>{Math.round((done / 5) * 100)}%</span></div>
        </div>
        <div className="m-journey-pips">
          {S.JORNADA.map((s, i) => (
            <div className={`m-jp ${mem.jornada[i] ? 'on' : ''}`} key={i}><span>{mem.jornada[i] ? '✓' : i + 1}</span><small>{s}</small></div>
          ))}
        </div>
      </div>

      {prox && (
        <>
          <div className="m-section-t">Sua próxima escala</div>
          <div className="m-card" onClick={() => go('escalas')}>
            <div className="m-card-top">
              <span className="m-when">{prox.culto.dia} · {prox.culto.data} · {prox.culto.hora}</span>
              <Chip st={prox.st} label={prox.st === 'wait' ? 'Responder' : undefined} />
            </div>
            <div className="m-culto">{prox.culto.nome}</div>
            <div className="m-fn">{prox.time.nome} · <b>{prox.fn}</b></div>
          </div>
        </>
      )}

      <div className="m-section-t">Atalhos</div>
      <div className="m-quick">
        <button className="m-quick-b" onClick={() => go('tarefas')}><span><Icon name="tarefas" size={18} /></span>Minhas tarefas</button>
        <button className="m-quick-b" onClick={() => go('conversas')}><span><Icon name="conversas" size={18} /></span>Conversas</button>
        <button className="m-quick-b" onClick={() => go('cursos')}><span><Icon name="cursos" size={18} /></span>Meus cursos</button>
        {isRecep
          ? <button className="m-quick-b" onClick={() => go('visitantes')}><span><Icon name="visitante" size={18} /></span>Visitantes</button>
          : <button className="m-quick-b" onClick={() => go('avisos')}><span><Icon name="oracao" size={18} /></span>Pedir oração</button>}
      </div>

      {ciclo && (
        <>
          <div className="m-section-t" style={{ marginTop: 22 }}>Nossa igreja</div>
          <div className="m-igreja" onClick={() => openTeam('__sobre')}>
            <div className="m-igreja-tag">{ciclo.ano} · {ciclo.tema}</div>
            <div className="m-igreja-x">{S.IDENTIDADE.proposito}</div>
            <div className="m-igreja-go">Conhecer a igreja →</div>
          </div>
        </>
      )}

      {abertos.length > 0 && (
        <>
          <div className="m-section-t" style={{ marginTop: 22 }}>Onde você pode servir</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 12 }}>Times abertos a novos voluntários. Conheça o propósito de cada um e dê o primeiro passo.</div>
          {abertos.map((t) => {
            const info = S.timeInfo(t.id);
            return (
              <button className="m-team" key={t.id} onClick={() => openTeam(t.id)}>
                <div className="m-team-mark">{t.ic}</div>
                <div className="m-team-main">
                  <div className="m-team-name">{t.nome}</div>
                  <div className="m-team-x">{info.proposito.slice(0, 64)}…</div>
                </div>
                <span className="m-team-go">→</span>
              </button>
            );
          })}
        </>
      )}
    </>
  );
}

/* ─── ESCALA ─── */
function MTabEscala({ eu, stMap, setSt, disp, setDisp, setSwapId }) {
  const escalas = minhasEscalas(eu.id);
  return (
    <>
      <div className="m-section-t">Suas próximas escalas · {escalas.length}</div>
      {escalas.map((m) => {
        const st = stMap[m.id];
        return (
          <div className={`m-card ${st === 'wait' ? 'urgent' : ''}`} key={m.id}>
            <div className="m-card-top">
              <span className="m-when">{m.culto.dia} · {m.culto.data} · {m.culto.hora}</span>
              {st === 'ok' && <Chip st="ok" />}
              {st === 'no' && <Chip st="no" />}
              {st === 'wait' && <Chip st="wait" label="Responder" />}
            </div>
            <div className="m-culto">{m.culto.nome}</div>
            <div className="m-fn">{m.time.nome} · <b>{m.fn}</b></div>
            {st === 'ok' ? (
              <div className="m-confirmed">✓ Você confirmou presença
                <button className="m-btn m-btn-swap" style={{ marginLeft: 'auto', padding: '6px 12px' }} onClick={() => setSwapId(m.id)}>Pedir troca</button>
              </div>
            ) : st === 'no' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--danger)', padding: '8px 0' }}>
                ✕ Você recusou
                <button className="m-btn m-btn-ok ghost" style={{ marginLeft: 'auto', padding: '6px 14px' }} onClick={() => setSt(m.id, 'ok')}>Mudei de ideia</button>
              </div>
            ) : (
              <div className="m-actions three">
                <button className="m-btn m-btn-ok" onClick={() => setSt(m.id, 'ok')}>Confirmar</button>
                <button className="m-btn m-btn-swap" onClick={() => setSwapId(m.id)}>Trocar</button>
                <button className="m-btn m-btn-no" onClick={() => setSt(m.id, 'no')}>Recusar</button>
              </div>
            )}
          </div>
        );
      })}

      <div className="m-section-t" style={{ marginTop: 22 }}>Em quais cultos você pode servir</div>
      <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 12 }}>Marque os cultos da agenda em que está disponível. A liderança usa isso para montar a escala.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {S.CULTOS.map((cl) => {
          const on = disp[cl.slot];
          const recor = cl.recorrencia && cl.recorrencia !== 'unico' ? ({ semanal: 'toda semana', quinzenal: 'a cada 15 dias', mensal: 'todo mês' })[cl.recorrencia] : 'único';
          return (
            <div className="m-avail" key={cl.id}>
              <div className="m-avail-day">{cl.nome}<small>{cl.dia} · {cl.hora} · {recor}</small></div>
              <button className={`m-toggle ${on ? 'on' : ''}`} onClick={() => setDisp((p) => ({ ...p, [cl.slot]: !p[cl.slot] }))}></button>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ─── TAREFAS (cards do quadro com este voluntário) ─── */
function MTabTarefas({ eu }) {
  const [, bump] = useState(0);
  const [aberto, setAberto] = useState(null);
  const tarefas = minhasTarefas(eu.id);
  const pend = tarefas.filter((c) => c.col !== 'done');
  const feitas = tarefas.filter((c) => c.col === 'done');
  const force = () => { bump((n) => n + 1); cexRefresh(); };
  const mover = (c, colId) => {
    const board = S.BOARDS.find((b) => b.id === c.board);
    const nomeCol = board && board.colunas.find((k) => k.id === colId);
    c.col = colId; c.movedAt = 0;
    c.activity = [{ txt: 'Movido para ' + (nomeCol ? nomeCol.nome : colId) + ' (pelo app)', when: 'agora' }, ...(c.activity || [])];
    force();
  };
  const card = (c) => {
    const board = S.BOARDS.find((b) => b.id === c.board);
    const pl = window.prazoLabel ? window.prazoLabel(c.prazo) : null;
    const atrasado = S.isAtrasado(c);
    const open = aberto === c.id;
    return (
      <div className={`m-task ${atrasado ? 'late' : ''}`} key={c.id}>
        <button className="m-task-head" onClick={() => setAberto(open ? null : c.id)}>
          <span className={`prio-dot prio-${c.prio}`}></span>
          <div className="m-task-main">
            <div className="m-task-title">{c.titulo}</div>
            <div className="m-task-meta">{board ? board.nome : 'Quadro'}{c.origem && <span className="kb-origem" style={{ marginLeft: 6 }}>◇ reunião</span>}{pl && <span className={`m-task-prazo ${pl.cls}`}> · {pl.t}</span>}</div>
          </div>
          <span className="m-task-caret">{open ? '▴' : '▾'}</span>
        </button>
        {open && (
          <div className="m-task-body">
            {c.desc && <div className="m-task-desc">{c.desc}</div>}
            <div className="m-task-cols">
              {board && board.colunas.map((col) => (
                <button key={col.id} className={`seg-chip ${c.col === col.id ? 'on' : ''}`} onClick={() => mover(c, col.id)}>{col.nome}</button>
              ))}
            </div>
            <MTaskComments c={c} eu={eu} onChange={force} />
          </div>
        )}
      </div>
    );
  };
  return (
    <>
      <div className="m-section-t">Tarefas com você · {pend.length} aberta(s)</div>
      <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 14 }}>O que a liderança deixou no quadro para você. Atualize o andamento e comente — reflete no painel.</div>
      {pend.length === 0 && <div className="m-card"><div style={{ fontSize: 13, color: 'var(--subtle)' }}>Nada pendente com você agora. 🙌</div></div>}
      {pend.map(card)}
      {feitas.length > 0 && <>
        <div className="m-section-t" style={{ marginTop: 22 }}>Concluídas · {feitas.length}</div>
        {feitas.map(card)}
      </>}
    </>
  );
}
function MTaskComments({ c, eu, onChange }) {
  const [txt, setTxt] = useState('');
  const add = () => {
    if (!txt.trim()) return;
    c.comments = [...(c.comments || []), { autor: eu.nome, txt: txt.trim(), when: 'agora' }];
    c.activity = [{ txt: 'Comentou (pelo app)', when: 'agora' }, ...(c.activity || [])];
    setTxt(''); onChange();
  };
  return (
    <div className="m-task-comments">
      {(c.comments || []).map((cm, i) => (
        <div className="m-task-cm" key={i}><b>{cm.autor.split(' ')[0]}</b> <span>{cm.when}</span><div>{cm.txt}</div></div>
      ))}
      <div className="m-task-cm-add">
        <input className="input" placeholder="Comentar..." value={txt} onChange={(e) => setTxt(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button className="m-btn m-btn-ok" style={{ padding: '8px 14px' }} onClick={add}>Enviar</button>
      </div>
    </div>
  );
}

/* ─── CONVERSAS (chat do membro: time + líder) ─── */
function MTabConversas({ mem }) {
  useRefresh();
  const [selId, setSelId] = useState(null);
  const [novo, setNovo] = useState(false);
  const lista = S.chatsDoMembro(mem.id);
  const chat = lista.find((c) => c.id === selId);
  if (chat) {
    return (
      <div className="m-chat">
        <button className="m-chat-back" onClick={() => setSelId(null)}>← {S.chatNome(chat, mem.id)}</button>
        <ChatThread chat={chat} eu={mem.id} compact />
      </div>
    );
  }

  /* com quem o membro pode iniciar conversa: seu líder, líderes de outros
     ministérios e pastores */
  const pessoa = mem.volId ? pById(mem.volId) : null;
  const meusTimes = pessoa ? pessoa.times : [];
  const recibos = [];
  const visto = new Set([mem.id]);
  Object.keys(S.LIDER_TIME || {}).forEach((tid) => {
    const mid = S.liderDoTime(tid); if (!mid || visto.has(mid)) return;
    visto.add(mid);
    const t = tById(tid);
    recibos.push({ mid, papel: meusTimes.includes(tid) ? 'Seu líder · ' + (t ? t.nome.split(' ')[0] : '') : 'Líder · ' + (t ? t.nome.split(' ')[0] : ''), pri: meusTimes.includes(tid) ? 0 : 1 });
  });
  (S.MEMBROS || []).forEach((m) => {
    if (visto.has(m.id)) return;
    if (m.papel && /pastor|bispo|apóstolo|apostolo|presb/i.test(m.papel)) { visto.add(m.id); recibos.push({ mid: m.id, papel: m.papel, pri: 0 }); }
  });
  recibos.sort((a, b) => a.pri - b.pri);

  const abrir = (mid) => {
    let c = (S.CHATS || []).find((x) => x.tipo === 'dm' && (x.membros || []).includes(mem.id) && (x.membros || []).includes(mid));
    if (!c) c = S.novaConversa({ tipo: 'dm', nome: null, membros: [mem.id, mid], timeId: null });
    setNovo(false); setSelId(c.id);
  };

  return (
    <>
      <div className="m-section-row">
        <div className="m-section-t" style={{ margin: 0 }}>Conversas</div>
        <button className="m-mini-btn" onClick={() => setNovo((n) => !n)}>{novo ? 'Fechar' : '+ Nova'}</button>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 14 }}>Fale com o seu time, com o seu líder, com líderes de outros ministérios ou com um pastor.</div>

      {novo && (
        <div className="m-card" style={{ marginBottom: 14 }}>
          <div className="m-section-t" style={{ marginTop: 0 }}>Começar conversa com</div>
          {recibos.map((r) => { const m = memById(r.mid); if (!m) return null; return (
            <button className="m-conv" key={r.mid} onClick={() => abrir(r.mid)}>
              <span className="m-conv-ic"><Icon name="pessoa" size={16} /></span>
              <div className="m-conv-main">
                <div className="m-conv-name">{m.nome}</div>
                <div className="m-conv-prev">{r.papel}</div>
              </div>
            </button>
          ); })}
          {recibos.length === 0 && <div style={{ fontSize: 13, color: 'var(--subtle)' }}>Nenhum líder ou pastor cadastrado ainda.</div>}
        </div>
      )}

      {lista.length === 0 && <div className="m-card"><div style={{ fontSize: 13, color: 'var(--subtle)' }}>Nenhuma conversa ainda. Toque em <b>+ Nova</b> para falar com seu líder.</div></div>}
      {lista.map((c) => {
        const last = c.msgs[c.msgs.length - 1];
        const ic = c.tipo === 'time' ? <TeamMark t={tById(c.timeId)} size={16} /> : c.tipo === 'grupo' ? <Icon name="membros" size={16} /> : <Icon name="pessoa" size={16} />;
        const lastMem = last ? memById(last.de) : null;
        return (
          <button className="m-conv" key={c.id} onClick={() => setSelId(c.id)}>
            <span className="m-conv-ic">{ic}</span>
            <div className="m-conv-main">
              <div className="m-conv-name">{S.chatNome(c, mem.id)}</div>
              <div className="m-conv-prev">{last ? (last.de === mem.id ? 'Você: ' : (lastMem ? lastMem.nome.split(' ')[0] + ': ' : '')) + last.txt : (c.tipo === 'time' ? 'Canal do time' : 'Conversa')}</div>
            </div>
            {last && <span className="m-conv-when">{last.when}</span>}
          </button>
        );
      })}
    </>
  );
}

/* ─── VISITANTES (Recepção registra e evolui pelo celular) ─── */
function MTabVisitantes({ eu }) {
  useRefresh();
  const [novo, setNovo] = useState(false);
  const [aberto, setAberto] = useState(null);
  return (
    <>
      <div className="m-section-t">Acolhida de visitantes</div>
      <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 14 }}>Durante o culto, registre quem chegou e dê os próximos passos direto do celular. Tudo entra no acompanhamento da igreja.</div>
      <button className="m-btn m-btn-ok" style={{ width: '100%', marginBottom: 16 }} onClick={() => setNovo(true)}>+ Registrar visitante</button>

      {novo && <MNovoVisitante onClose={() => setNovo(false)} />}

      {S.VISITANTES.filter((v) => v.etapa !== 'membro').map((v) => {
        const et = S.ETAPAS.find((e) => e.id === v.etapa);
        const etIdx = S.ETAPAS.findIndex((e) => e.id === v.etapa);
        const open = aberto === v.id;
        return (
          <div className="m-card" key={v.id} style={{ paddingBottom: open ? 16 : 16 }}>
            <button className="m-vis-head" onClick={() => setAberto(open ? null : v.id)}>
              <Av nome={v.nome} size="sm" />
              <div className="m-vis-main">
                <div className="m-culto" style={{ fontSize: 15 }}>{v.nome}</div>
                <div className="m-fn"><span className="chip chip-neutral" style={{ color: et.cor }}>{et.nome}</span> · {v.origem}</div>
              </div>
              <span className="m-task-caret">{open ? '▴' : '▾'}</span>
            </button>
            {open && (
              <div style={{ marginTop: 12 }}>
                <div className="m-vis-track">
                  {S.ETAPAS.map((e, i) => (
                    <div key={e.id} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ height: 5, borderRadius: 3, background: i <= etIdx ? e.cor : 'var(--ink)' }}></div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: i <= etIdx ? 'var(--light)' : 'var(--subtle)', marginTop: 6 }}>{e.nome.split(' ')[0]}</div>
                    </div>
                  ))}
                </div>
                {v.tel && <a className="m-btn m-btn-swap" style={{ width: '100%', marginTop: 12, justifyContent: 'center', display: 'flex', textDecoration: 'none' }} href={`tel:${v.tel}`}>◷ Ligar {v.tel}</a>}
                {etIdx < S.ETAPAS.length - 1
                  ? <button className="m-btn m-btn-ok" style={{ width: '100%', marginTop: 8 }} onClick={() => { const prox = S.ETAPAS[etIdx + 1]; v.etapa = prox.id; v.historico = [{ when: 'agora', txt: `Avançou para "${prox.nome}".`, by: eu.nome, ol: true }, ...(v.historico || [])]; cexToast('Avançou para "' + prox.nome + '".'); cexRefresh(); }}>Avançar para "{S.ETAPAS[etIdx + 1].nome}" →</button>
                  : <div className="m-confirmed" style={{ marginTop: 10 }}>✓ Pronto para virar membro</div>}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
function MNovoVisitante({ onClose }) {
  const [nome, setNome] = useState('');
  const [tel, setTel] = useState('');
  const [origem, setOrigem] = useState('Primeira visita');
  const [evento, setEvento] = useState(S.CULTOS[0] ? S.CULTOS[0].nome : 'Culto');
  const salvar = () => {
    if (!nome.trim()) { cexToast('Informe o nome.', 'warn'); return; }
    S.VISITANTES.unshift({ id: cexId('v'), nome: nome.trim(), tel, etapa: 'novo', visitou: evento, resp: null, due: 'Hoje', dueSt: 'soon', origem,
      historico: [{ when: 'agora', txt: 'Registrado na recepção · ' + evento + '.', by: cexWho(), ol: true }] });
    cexToast(nome.split(' ')[0] + ' entrou no acompanhamento.'); cexRefresh(); onClose();
  };
  return (
    <div className="m-card" style={{ borderColor: 'var(--olive-line)' }}>
      <div className="m-when" style={{ marginBottom: 10 }}>Novo visitante</div>
      <input className="input" placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} style={{ marginBottom: 8 }} />
      <input className="input" placeholder="Telefone (WhatsApp)" value={tel} onChange={(e) => setTel(e.target.value)} style={{ marginBottom: 8 }} />
      <select className="select" value={origem} onChange={(e) => setOrigem(e.target.value)} style={{ marginBottom: 8 }}>
        {['Primeira visita', 'Convite de membro', 'Instagram', 'Indicação', 'Evangelismo', 'Tomou decisão no culto'].map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <select className="select" value={evento} onChange={(e) => setEvento(e.target.value)} style={{ marginBottom: 12 }}>
        {S.CULTOS.map((c) => <option key={c.id} value={c.nome}>{c.nome} · {c.data}</option>)}
      </select>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="m-btn m-btn-ok" style={{ flex: 1 }} onClick={salvar}>Salvar</button>
        <button className="m-btn m-btn-swap" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
      </div>
    </div>
  );
}

/* ─── CURSOS ─── */
function MTabCursos({ mem, go }) {
  const meus = meusCursos(mem.id);
  const meusIds = meus.map((m) => m.curso.id);
  const explorar = S.CURSOS.filter((c) => !meusIds.includes(c.id));
  const turmasBat = (S.BATISMOS || []).filter((b) => b.status !== 'concluida').length;
  return (
    <>
      <button className="m-card m-curso-bat" onClick={() => go && go('batismo')}>
        <div className="m-card-top">
          <span className="m-when"><Icon name="batismos" size={13} style={{ verticalAlign: '-2px', marginRight: 5 }} />Batismo nas águas</span>
          {turmasBat > 0 && <span className="m-when" style={{ color: 'var(--olive-soft)' }}>{turmasBat} turma(s)</span>}
        </div>
        <div className="m-culto" style={{ fontSize: 16 }}>Decidiu seguir Jesus nas águas?</div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 6 }}>Inscreva-se numa turma de batismo e faça o curso de membresia pré-batismo. Toque para ver as datas.</div>
        <span className="m-btn m-btn-ok ghost" style={{ display: 'block', textAlign: 'center', marginTop: 12 }}>Ver batismos →</span>
      </button>

      <div className="m-section-t">Meus cursos · {meus.length}</div>
      {meus.map((m) => {
        const pct = Math.round((m.feitas / m.total) * 100);
        return (
          <div className="m-card" key={m.curso.id}>
            <div className="m-card-top">
              <span className="m-when">{CURSO_TIPO[m.curso.tipo].label}</span>
              {m.status === 'concluido' ? <Chip st="ok" label="Concluído" /> : <span className="m-when" style={{ color: 'var(--amber)' }}>{pct}%</span>}
            </div>
            <div className="m-culto" style={{ fontSize: 16 }}>{m.curso.nome}</div>
            <div className="bar" style={{ marginTop: 10 }}><div className={`bar-fill ${m.status === 'concluido' ? '' : 'amber'}`} style={{ width: `${pct}%` }}></div></div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--subtle)', marginTop: 8 }}>{m.feitas}/{m.total} aulas</div>
            {m.status !== 'concluido' && <button className="m-btn m-btn-ok" style={{ width: '100%', marginTop: 12 }} onClick={() => cexToast('Bom estudo! Abrindo a próxima aula.', 'info')}>Continuar →</button>}
          </div>
        );
      })}

      <div className="m-section-t" style={{ marginTop: 22 }}>Explorar</div>
      {explorar.map((c) => (
        <div className="m-card" key={c.id}>
          <div className="m-when" style={{ marginBottom: 6 }}>{c.nivel} · {CURSO_TIPO[c.tipo].label}</div>
          <div className="m-culto" style={{ fontSize: 16 }}>{c.nome}</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 6 }}>{c.desc}</div>
          <button className="m-btn m-btn-ok ghost" style={{ width: '100%', marginTop: 12 }} onClick={() => cexToast('Inscrição feita! Você já pode começar.')}>Inscrever-se</button>
        </div>
      ))}
    </>
  );
}

/* ─── AVISOS + PEDIDOS ─── */
function MTabAvisos() {
  const [tipo, setTipo] = useState(null);
  const [sent, setSent] = useState(false);
  return (
    <>
      <div className="m-section-t">Pedir oração</div>
      <div className="m-quick" style={{ marginBottom: 18 }}>
        <button className={`m-quick-b ${tipo === 'oracao' ? 'on' : ''}`} onClick={() => { setTipo('oracao'); setSent(false); }}><span>◆</span>Pedir oração</button>
        <button className={`m-quick-b ${tipo === 'testemunho' ? 'on' : ''}`} onClick={() => { setTipo('testemunho'); setSent(false); }}><span>◇</span>Compartilhar testemunho</button>
      </div>
      {tipo && !sent && (
        <div className="m-card">
          <div className="m-when" style={{ marginBottom: 8 }}>{tipo === 'oracao' ? 'Seu pedido de oração' : 'Seu testemunho'}</div>
          <textarea className="textarea" placeholder={tipo === 'oracao' ? 'Escreva seu pedido...' : 'Conte o que Deus fez...'} style={{ fontSize: 13, minHeight: 70 }}></textarea>
          <button className="m-btn m-btn-ok" style={{ width: '100%', marginTop: 10 }} onClick={() => setSent(true)}>Enviar</button>
        </div>
      )}
      {sent && <div className="m-card" style={{ borderColor: 'var(--olive-line)', textAlign: 'center' }}><div style={{ color: 'var(--olive-soft)', fontWeight: 600, fontSize: 14 }}>✓ Enviado</div><div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 6 }}>A liderança recebeu e vai te responder.</div></div>}

      <div className="m-section-t" style={{ marginTop: 22 }}>Avisos dos seus times</div>
      {S.AVISOS.map((a) => (
        <div className="m-card" key={a.id}>
          <div className="m-card-top" style={{ marginBottom: 6 }}>
            <span className="m-when">{a.when}</span>
            <span className="chan">push</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>{a.titulo}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.55 }}>{a.txt}</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--subtle)', marginTop: 10, letterSpacing: '0.06em' }}>{a.para.toUpperCase()}</div>
        </div>
      ))}
    </>
  );
}

/* ─── PAINEL DESLIZANTE: time aberto / sobre a igreja ─── */
function MTeamSheet({ id, onClose }) {
  if (id === '__sobre') {
    const ciclo = S.CICLOS.find((c) => c.ativo);
    return (
      <div className="m-sheet-bg" onClick={onClose}>
        <div className="m-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="m-sheet-grip"></div>
          <div className="m-sheet-eyebrow">Nossa igreja</div>
          <div className="m-sheet-title">{S.IDENTIDADE.proposito}</div>
          {S.IDENTIDADE.versiculo && <div className="m-sheet-verse">{S.IDENTIDADE.versiculo}</div>}
          <div className="m-data" style={{ marginTop: 14 }}><span>Missão</span></div>
          <div style={{ fontSize: 13, color: 'var(--light)', lineHeight: 1.6 }}>{S.IDENTIDADE.missao}</div>
          {ciclo && (
            <>
              <div className="m-data" style={{ marginTop: 14 }}><span>{ciclo.ano} · {ciclo.tema}</span></div>
              <div style={{ fontSize: 13, color: 'var(--light)', lineHeight: 1.6 }}>{ciclo.texto}</div>
            </>
          )}
          <button className="m-btn m-btn-swap" style={{ width: '100%', marginTop: 16 }} onClick={onClose}>Fechar</button>
        </div>
      </div>
    );
  }
  const t = tById(id);
  const info = S.timeInfo(id);
  if (!t || !info) return null;
  return (
    <div className="m-sheet-bg" onClick={onClose}>
      <div className="m-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="m-sheet-grip"></div>
        <div className="m-sheet-head">
          <div className="m-team-mark" style={{ width: 44, height: 44, fontSize: 18 }}>{t.ic}</div>
          <div>
            <div className="m-sheet-tname">{t.nome}</div>
            <span className="topen yes" style={{ marginTop: 6, display: 'inline-flex' }}>◆ Recebendo voluntários</span>
          </div>
        </div>
        <div className="m-sheet-block"><div className="tinfo-label">◆ Propósito</div><div className="tinfo-x">{info.proposito}</div></div>
        {info.chegada && <div className="m-sheet-block"><div className="tinfo-label">◷ Horário</div><div className="tinfo-x">{info.chegada}</div></div>}
        {info.responsabilidades && (
          <div className="m-sheet-block"><div className="tinfo-label">→ O que esperamos</div>{info.responsabilidades.map((r, i) => <div className="tinfo-li" key={i}>{r}</div>)}</div>
        )}
        {info.preReqs && info.preReqs.length > 0 && (
          <div className="m-sheet-block">{info.preReqs.map((cid) => { const c = S.CURSOS.find((x) => x.id === cid); return <div className="tprereq" key={cid}>◇ Antes, conclua: <b style={{ color: 'var(--white)', marginLeft: 4 }}>{c ? c.nome : cid}</b></div>; })}</div>
        )}
        <button className="m-btn m-btn-ok" style={{ width: '100%', marginTop: 14 }} onClick={() => { cexToast('Pedido enviado! O líder do time vai falar com você.'); onClose(); }}>Quero servir aqui →</button>
      </div>
    </div>
  );
}

function MTabPerfil({ eu, mem, theme, setTheme }) {
  const G = S.grp();
  return (
    <>
      <div className="m-profile">
        <Av nome={mem.nome} size="xl" self lead={eu.lider.length > 0} />
        <div className="m-profile-name">{mem.nome}</div>
        <div className="m-profile-role">{eu.lider.length ? `Líder · ${tById(eu.lider[0]).nome}` : 'Voluntário'} · membro desde {mem.desde}</div>
      </div>

      <div className="m-section-t">Meus dados</div>
      <div className="m-card">
        <div className="m-data"><span>Telefone</span><b>{mem.tel}</b></div>
        <div className="m-data"><span>Aniversário</span><b>{mem.nasc}</b></div>
        {G.ativo && <div className="m-data"><span>{G.termo}</span><b>{gcById(mem.gc) ? gcById(mem.gc).nome : '—'}</b></div>}
        <div className="m-data" style={{ borderBottom: 'none' }}><span>Bairro</span><b>{mem.bairro}</b></div>
        <EditarDadosBtn mem={mem} />
      </div>

      <div className="m-section-t" style={{ marginTop: 22 }}>App & notificações</div>
      <div className="m-card">
        <div className="m-data" style={{ paddingTop: 0, borderBottom: 'none' }}>
          <div><b style={{ display: 'block' }}>Trocar senha</b><small style={{ color: 'var(--muted)', fontSize: 11.5 }}>Sua senha inicial são os 4 últimos do telefone</small></div>
          <button className="m-toggle-btn" onClick={() => { const n = prompt('Nova senha:'); if (n && n.length >= 4) { mem.senha = n; cexToast('Senha atualizada.'); } else if (n) { cexToast('Use ao menos 4 caracteres.', 'warn'); } }}>Alterar</button>
        </div>
      </div>
      <div className="m-card">
        <div className="m-data" style={{ paddingTop: 0 }}>
          <div><b style={{ display: 'block' }}>Tema do app</b><small style={{ color: 'var(--muted)', fontSize: 11.5 }}>{theme === 'light' ? 'Claro (papel cream)' : 'Escuro (padrão)'}</small></div>
          <div className="seg">
            <button className={theme === 'dark' ? 'on' : ''} onClick={() => setTheme && setTheme('dark')}>◑ Escuro</button>
            <button className={theme === 'light' ? 'on' : ''} onClick={() => setTheme && setTheme('light')}>◐ Claro</button>
          </div>
        </div>
      </div>
      <PushToggle />

      <div className="m-section-t" style={{ marginTop: 22 }}>Minha jornada</div>
      <div className="m-card" style={{ paddingBottom: 6 }}>
        <PersonTimeline mid={mem.id} compact />
      </div>
    </>
  );
}

/* ─── BATISMO (inscrição no app + datas do curso pré-batismo) ─── */
function MTabBatismo() {
  const turmas = (S.BATISMOS || []).filter((b) => b.status !== 'concluida');
  const [inscrito, setInscrito] = useState({});
  return (
    <>
      <div className="m-section-t">Próximos batismos</div>
      <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 12 }}>Decidiu seguir Jesus nas águas? Inscreva-se numa turma. O curso de membresia pré-batismo prepara seu coração.</div>
      {turmas.length === 0 && <div className="m-card"><div style={{ fontSize: 13, color: 'var(--subtle)' }}>Nenhuma turma agendada por ora. Logo abrimos a próxima.</div></div>}
      {turmas.map((b) => (
        <div className="m-card" key={b.id}>
          <div className="m-card-top">
            <span className="m-when">{b.data}</span>
            {b.inscricoesAbertas ? <Chip st="ok" label="Inscrições abertas" /> : <Chip st="wait" label="Em preparação" />}
          </div>
          <div className="m-culto" style={{ fontSize: 16 }}>{b.turma}</div>
          <div className="m-fn">{b.local} · {b.pastor}</div>
          {b.curso && (
            <div className="m-bat-curso">
              <span className="m-bat-curso-ic">◇</span>
              <div><b>Curso de membresia pré-batismo</b><small>{b.curso}</small></div>
            </div>
          )}
          {b.inscricoesAbertas
            ? (inscrito[b.id]
              ? <div className="m-confirmed" style={{ marginTop: 12 }}>✓ Inscrição enviada! O responsável vai te chamar.</div>
              : <button className="m-btn m-btn-ok" style={{ width: '100%', marginTop: 12 }} onClick={() => { setInscrito((p) => ({ ...p, [b.id]: true })); cexToast('Inscrição no batismo enviada!'); }}>Quero me inscrever →</button>)
            : <div style={{ fontSize: 12, color: 'var(--subtle)', marginTop: 12 }}>Inscrições ainda não abertas para esta turma.</div>}
        </div>
      ))}
    </>
  );
}

function MobileMembro({ theme, setTheme, persona, setPersona }) {
  const eu = pById(persona.vol);
  const mem = mById(persona.mem);
  const [tab, setTab] = useState('inicio');
  const [stMap, setStMap] = useState(() => Object.fromEntries(minhasEscalas(persona.vol).map((m) => [m.id, m.st])));
  const [disp, setDisp] = useState({ ...eu.disp });
  const [swapId, setSwapId] = useState(null);
  const [team, setTeam] = useState(null);
  const setSt = (id, v) => setStMap((p) => ({ ...p, [id]: v }));

  /* ao trocar de persona, reseta o estado dependente */
  useEffect(() => {
    setTab('inicio');
    setStMap(Object.fromEntries(minhasEscalas(persona.vol).map((m) => [m.id, m.st])));
    setDisp({ ...pById(persona.vol).disp });
  }, [persona.vol]);

  const isRecep = eu.times.includes('recepcao');
  const TABS = [
    { id: 'inicio', icon: 'inicio', l: 'Início' },
    { id: 'escalas', icon: 'escalas', l: 'Escala' },
    { id: 'tarefas', icon: 'tarefas', l: 'Tarefas' },
    { id: 'conversas', icon: 'conversas', l: 'Chat' },
    isRecep ? { id: 'visitantes', icon: 'visitante', l: 'Visitas' } : { id: 'cursos', icon: 'cursos', l: 'Cursos' },
    { id: 'perfil', icon: 'perfil', l: 'Perfil' },
  ];

  return (
    <div className="phone">
      <div className="phone-screen">
        <div className="phone-notch"></div>
        <div className="m-statusbar"><span>9:41</span><span>CE.X ◆</span></div>
        <div className="m-head">
          <div className="m-app">Service · {eu.lider.length ? 'Liderança' : 'Membro'}</div>
          <div className="m-h1">Olá, <em>{mem.nome.split(' ')[0]}</em></div>
        </div>

        <div className="m-scroll">
          {tab === 'inicio' && <MTabInicio eu={eu} mem={mem} go={setTab} openTeam={setTeam} />}
          {tab === 'escalas' && <MTabEscala eu={eu} stMap={stMap} setSt={setSt} disp={disp} setDisp={setDisp} setSwapId={setSwapId} />}
          {tab === 'tarefas' && <MTabTarefas eu={eu} />}
          {tab === 'conversas' && <MTabConversas mem={mem} />}
          {tab === 'visitantes' && <MTabVisitantes eu={eu} />}
          {tab === 'cursos' && <MTabCursos mem={mem} go={setTab} />}
          {tab === 'batismo' && <MTabBatismo />}
          {tab === 'avisos' && <MTabAvisos />}
          {tab === 'perfil' && <MTabPerfil eu={eu} mem={mem} theme={theme} setTheme={setTheme} />}
        </div>

        <div className="m-tab">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}><span className="ic"><Icon name={t.icon} size={19} /></span> {t.l}</button>
          ))}
        </div>

        {team && <MTeamSheet id={team} onClose={() => setTeam(null)} />}

        {swapId && (
          <div className="modal-bg" style={{ position: 'absolute', borderRadius: 36 }} onClick={() => setSwapId(null)}>
            <div className="m-card" style={{ width: '86%', margin: 0 }} onClick={(e) => e.stopPropagation()}>
              <div className="m-when" style={{ marginBottom: 10 }}>Pedir troca</div>
              <div style={{ fontSize: 14, color: 'var(--light)', lineHeight: 1.55, marginBottom: 16 }}>Quem do seu time pode te cobrir? Mandamos o convite e seu líder aprova.</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {S.PESSOAS.filter((p) => p.times.some((tid) => eu.times.includes(tid)) && p.id !== eu.id).slice(0, 3).map((p) => (
                  <div className="cand" key={p.id} onClick={() => { setSt(swapId, 'no'); setSwapId(null); }}>
                    <Av nome={p.nome} size="sm" />
                    <div className="cand-main"><div className="cand-name">{p.nome}</div><div className="cand-meta">{p.funcoes.join(' · ')}</div></div>
                    <span className="cand-fit good">enviar →</span>
                  </div>
                ))}
              </div>
              <button className="m-btn m-btn-swap" style={{ width: '100%', marginTop: 12 }} onClick={() => setSwapId(null)}>Cancelar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MobileOverlay({ onClose, theme, setTheme }) {
  const [persona, setPersona] = useState(PERSONAS[0]);
  return (
    <div className="mob-bg">
      <div className="mob-side">
        <div className="mob-side-eyebrow">Mesmo app · outra superfície</div>
        <h3>O app do <span className="ol">membro</span></h3>
        <p>Mesmo login, o que cada um vê muda. O membro acompanha a jornada, confirma escala, resolve tarefas do quadro, conversa com o time e o líder, faz cursos e pede oração — tudo no celular.</p>

        <div className="mob-persona">
          <div className="mob-persona-t">Pré-visualizar como</div>
          {PERSONAS.map((p) => {
            const m = mById(p.mem);
            const on = p.vol === persona.vol;
            return (
              <button key={p.vol} className={`mob-persona-opt ${on ? 'on' : ''}`} onClick={() => setPersona(p)}>
                <Av nome={m.nome} size="sm" fotoId={p.vol} />
                <div><b>{m.nome}</b><small>{p.tag}</small></div>
                {on && <span className="mob-persona-chk">●</span>}
              </button>
            );
          })}
          <div className="mob-persona-hint">Escolha a Recepção para ver o cadastro de visitantes pelo celular.</div>
        </div>

        <button className="mob-close" onClick={onClose}>← Voltar ao painel</button>
      </div>
      <MobileMembro theme={theme} setTheme={setTheme} persona={persona} setPersona={setPersona} />
    </div>
  );
}

/* botão + modal: o membro edita os próprios dados no app */
function EditarDadosBtn({ mem }) {
  const [open, setOpen] = useState(false);
  const [d, setD] = useState({ tel: mem.tel || '', nasc: mem.nasc || '', bairro: mem.bairro || '' });
  const salvar = () => { Object.assign(mem, { tel: d.tel, nasc: d.nasc, bairro: d.bairro }); cexRefresh(); cexToast('Dados atualizados.'); setOpen(false); };
  return (
    <>
      <button className="m-btn m-btn-swap" style={{ width: '100%', marginTop: 12 }} onClick={() => { setD({ tel: mem.tel || '', nasc: mem.nasc || '', bairro: mem.bairro || '' }); setOpen(true); }}>Editar dados</button>
      {open && (
        <div className="modal-bg" onClick={() => setOpen(false)} style={{ zIndex: 90 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-eyebrow">Meus dados</div>
              <div className="modal-title">Editar dados</div>
              <div className="modal-sub">Mantenha seu contato em dia para a liderança falar com você.</div>
            </div>
            <div className="modal-body" style={{ display: 'block' }}>
              <div className="field"><label className="field-label">Telefone</label><input className="input" value={d.tel} onChange={(e) => setD((p) => ({ ...p, tel: e.target.value }))} /></div>
              <div className="field"><label className="field-label">Aniversário</label><input className="input" placeholder="ex: 12 mar" value={d.nasc} onChange={(e) => setD((p) => ({ ...p, nasc: e.target.value }))} /></div>
              <div className="field"><label className="field-label">Bairro</label><input className="input" value={d.bairro} onChange={(e) => setD((p) => ({ ...p, bairro: e.target.value }))} /></div>
            </div>
            <div className="modal-foot"><button className="btn btn-sec" onClick={() => setOpen(false)}>Cancelar</button><button className="btn btn-pri" onClick={salvar}>Salvar</button></div>
          </div>
        </div>
      )}
    </>
  );
}

Object.assign(window, { MobileMembro, MobileVolunteer: MobileMembro, MobileOverlay });
