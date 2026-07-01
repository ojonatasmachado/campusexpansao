/* ════════════════════════════════════════════════════════════════
   CE.X SERVICE · QUADROS (Kanban) — tela
   Lista de quadros → quadro com colunas → drawer do card.
   Mover por arrastar (HTML5 DnD) ou pelos botões. Simples e funcional.
   ════════════════════════════════════════════════════════════════ */

/* papel da PERSPECTIVA ativa no painel (Direção = master; líder = lider).
   No app do membro, o cartão usa permissões de 'vol' diretamente. */
function kanbanPapel() {
  const v = window.cexView ? window.cexView() : { papel: 'master' };
  return v.papel === 'lider' ? 'lider' : 'master';
}
function kanbanPerm() { return S.KANBAN_PERMS[kanbanPapel()] || S.KANBAN_PERMS.vol; }

/* ── parse de prazo "DD mmm" vs hoje (28 jun 2026) ── */
const KB_MES = { jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5, jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11 };
function prazoData(prazo) {
  if (!prazo) return null;
  const p = prazo.toLowerCase().split(' ');
  const d = parseInt(p[0], 10); const m = KB_MES[(p[1] || '').slice(0, 3)];
  if (isNaN(d) || m == null) return null;
  const hoje = new Date(2026, 5, 28);
  let ano = 2026; if (m < hoje.getMonth() - 2) ano = 2027;
  return new Date(ano, m, d);
}
S.prazoVencido = (prazo) => { const dt = prazoData(prazo); return dt ? dt < new Date(2026, 5, 28) : false; };
function prazoLabel(prazo) {
  const dt = prazoData(prazo); if (!dt) return null;
  const hoje = new Date(2026, 5, 28);
  const dias = Math.round((dt - hoje) / 86400000);
  if (dias < 0) return { t: prazo + ' · atrasado', cls: 'late' };
  if (dias === 0) return { t: 'hoje', cls: 'soon' };
  if (dias <= 3) return { t: prazo + ' · ' + dias + 'd', cls: 'soon' };
  return { t: prazo, cls: '' };
}

/* ════════ LISTA DE QUADROS ════════ */
function Quadros({ openPessoa }) {
  useRefresh();
  const [boardId, setBoardId] = useState(null);
  const perm = kanbanPerm();
  const view = window.cexView();
  const scope = window.cexScopeTimes();
  const boards = S.BOARDS.filter((b) => view.papel === 'master' ? true : (b.time && scope.includes(b.time)));
  if (boardId) return <BoardView id={boardId} onBack={() => setBoardId(null)} openPessoa={openPessoa} />;

  return (
    <div className="content wide">
      <div className="ph">
        <div>
          <div className="ph-eyebrow">Operação</div>
          <h1 className="ph-title">Quadros de <em>tarefas</em></h1>
          <p className="ph-sub">{view.papel === 'lider' ? <>Os quadros do <em>{tById(view.timeId) ? tById(view.timeId).nome : 'seu time'}</em>. A Direção vê todos.</> : 'Um quadro por time ou da Direção. Cada tarefa é um card com responsável, prazo e status.'}</p>
        </div>
        <div className="ph-actions"><button className="btn btn-pri" onClick={() => cexCreate('board')}>+ Novo quadro</button></div>
      </div>

      {/* explica o vínculo reunião → quadro */}
      <div className="kb-explain">
        <span className="kb-explain-ic"><Icon name="reunioes" size={18} /></span>
        <div>
          <div className="kb-explain-t">De onde vêm os cards</div>
          <div className="kb-explain-s">Toda <b>responsabilidade definida numa reunião</b> pode virar um card aqui: na reunião, toque em <b>“→ Quadro”</b> ao lado da responsabilidade. Ela entra como card (marcado com <span className="kb-origem"><Icon name="reunioes" size={11} className="ic" /> reunião</span>) com o responsável já preenchido. Você também cria cards direto, com o botão <b>+ Card</b> dentro de um quadro.</div>
        </div>
      </div>

      {boards.length === 0 ? (
        <div className="empty">Nenhum quadro ainda. <em>Crie o primeiro com “+ Novo quadro”.</em></div>
      ) : (
        <div className="bd-grid">
          {boards.map((b) => {
            const cards = S.cardsDoBoard(b.id);
            const feitos = cards.filter((c) => c.col === 'done').length;
            const atrasados = cards.filter((c) => S.isAtrasado(c)).length;
            const pct = cards.length ? Math.round((feitos / cards.length) * 100) : 0;
            const t = b.time ? tById(b.time) : null;
            return (
              <button className="bd-card" key={b.id} onClick={() => setBoardId(b.id)}>
                <div className="bd-card-top">
                  <div className="bd-mark"><TeamMark t={t} size={18} /></div>
                  {atrasados > 0 && <span className="chip chip-no">{atrasados} atrasado(s)</span>}
                </div>
                <div className="bd-name">{b.nome}</div>
                <div className="bd-desc">{b.desc || (b.escopo === 'geral' ? 'Quadro da liderança' : 'Quadro do time')}</div>
                <div className="bd-foot">
                  <span className="team-stat"><b>{cards.length}</b> cards · <b>{feitos}</b> feitos</span>
                </div>
                <div className="bar" style={{ marginTop: 10 }}><div className="bar-fill" style={{ width: `${pct}%` }}></div></div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ════════ QUADRO (colunas + cards) ════════ */
function BoardView({ id, onBack, openPessoa }) {
  useRefresh();
  const [card, setCard] = useState(null);
  const [novoCol, setNovoCol] = useState(null);
  const [q, setQ] = useState('');
  const [fPrio, setFPrio] = useState('todas');
  const [fEstado, setFEstado] = useState('todos'); // todos | atrasados | parados | meus
  const [drag, setDrag] = useState(null);
  const perm = kanbanPerm();
  const b = S.BOARDS.find((x) => x.id === id);
  if (!b) return null;
  const meId = (() => { try { return localStorage.getItem('cex_user'); } catch (e) { return null; } })();

  const todos = S.cardsDoBoard(id);
  const match = (c) => {
    if (q && !c.titulo.toLowerCase().includes(q.toLowerCase())) return false;
    if (fPrio !== 'todas' && c.prio !== fPrio) return false;
    if (fEstado === 'atrasados' && !S.isAtrasado(c)) return false;
    if (fEstado === 'parados' && !S.isParado(c)) return false;
    if (fEstado === 'meus' && !(c.resp || []).includes(meId)) return false;
    return true;
  };
  const cardsCol = (colId) => todos.filter((c) => c.col === colId && match(c));

  const moverCard = (cardId, colId) => {
    const c = S.CARDS.find((x) => x.id === cardId); if (!c || c.col === colId) return;
    if (!perm.moverQualquer && !(c.resp || []).includes(meId)) { cexToast('Você só move cards onde é responsável.', 'warn'); return; }
    const nomeCol = b.colunas.find((k) => k.id === colId);
    c.col = colId; c.movedAt = 0;
    c.activity = [{ txt: 'Movido para ' + (nomeCol ? nomeCol.nome : colId), when: 'agora' }, ...(c.activity || [])];
    cexRefresh();
  };

  const atrasados = todos.filter((c) => S.isAtrasado(c)).length;
  const parados = todos.filter((c) => S.isParado(c)).length;

  return (
    <div className="content wide">
      <div className="ph">
        <div>
          <button className="back-link" onClick={onBack}>← Quadros</button>
          <h1 className="ph-title" style={{ marginTop: 8 }}>{b.nome}</h1>
          <p className="ph-sub">{b.desc}</p>
        </div>
      </div>

      <div className="toolbar">
        <div className="tb-search"><span className="si">⌕</span><input placeholder="Buscar card..." value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="seg">
          {[['todos', 'Todos'], ['meus', 'Meus'], ['atrasados', `Atrasados${atrasados ? ' ' + atrasados : ''}`], ['parados', `Parados${parados ? ' ' + parados : ''}`]].map(([k, l]) => (
            <button key={k} className={fEstado === k ? 'on' : ''} onClick={() => setFEstado(k)}>{l}</button>
          ))}
        </div>
        <div className="seg">
          {[['todas', 'Prioridade'], ['alta', 'Alta'], ['media', 'Média'], ['baixa', 'Baixa']].map(([k, l]) => (
            <button key={k} className={fPrio === k ? 'on' : ''} onClick={() => setFPrio(k)}>{l}</button>
          ))}
        </div>
      </div>

      <div className="kb-board">
        {b.colunas.map((col) => {
          const cards = cardsCol(col.id);
          return (
            <div className={`kb-col ${drag ? 'drop' : ''}`} key={col.id}
              onDragOver={(e) => { if (drag) e.preventDefault(); }}
              onDrop={() => { if (drag) { moverCard(drag, col.id); setDrag(null); } }}>
              <div className="kb-col-head">
                <span className="kb-col-name">{col.nome}</span>
                <span className="kb-col-count">{cards.length}</span>
              </div>
              <div className="kb-col-body">
                {cards.map((c) => (
                  <KbCard key={c.id} c={c} onOpen={() => setCard(c.id)} onDragStart={() => setDrag(c.id)} onDragEnd={() => setDrag(null)} />
                ))}
                {perm.criarCard && <button className="kb-add" onClick={() => setNovoCol(col.id)}>+ Card</button>}
              </div>
            </div>
          );
        })}
      </div>

      {card && <CardDrawer id={card} onClose={() => setCard(null)} openPessoa={openPessoa} onMove={moverCard} board={b} />}
      {novoCol && <NovoCard board={b} col={novoCol} onClose={() => setNovoCol(null)} />}
    </div>
  );
}

function KbCard({ c, onOpen, onDragStart, onDragEnd }) {
  const prio = S.PRIORIDADES[c.prio];
  const pl = prazoLabel(c.prazo);
  const atrasado = S.isAtrasado(c); const parado = S.isParado(c);
  return (
    <div className={`kb-card ${atrasado ? 'atrasado' : ''}`} draggable onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={onOpen}>
      <div className="kb-card-top">
        <span className={`prio-dot prio-${c.prio}`} title={prio.l}></span>
        {c.origem && <span className="kb-origem" title={'Da reunião: ' + c.origem.titulo}><Icon name="reunioes" size={11} className="ic" /> reunião</span>}
        {parado && !atrasado && <span className="kb-parado" title="Sem movimento há dias">parado</span>}
      </div>
      <div className="kb-card-title">{c.titulo}</div>
      <div className="kb-card-foot">
        {pl && <span className={`kb-prazo ${pl.cls}`}>{pl.t}</span>}
        <AvStack ids={c.resp || []} max={3} />
      </div>
    </div>
  );
}

/* ════════ DRAWER DO CARD ════════ */
function CardDrawer({ id, onClose, openPessoa, onMove, board }) {
  const c0 = S.CARDS.find((x) => x.id === id);
  const [, bump] = useState(0);
  const [coment, setComent] = useState('');
  if (!c0) return null;
  const c = c0;
  const perm = kanbanPerm();
  const force = () => bump((n) => n + 1);
  const prio = S.PRIORIDADES[c.prio];

  const addComent = () => {
    if (!coment.trim()) return;
    c.comments = [...(c.comments || []), { autor: cexWho(), txt: coment.trim(), when: 'agora' }];
    c.activity = [{ txt: 'Comentou', when: 'agora' }, ...(c.activity || [])];
    setComent(''); force();
  };
  const setPrio = (p) => { c.prio = p; force(); };
  const togResp = (pid) => { c.resp = (c.resp || []).includes(pid) ? c.resp.filter((x) => x !== pid) : [...(c.resp || []), pid]; force(); };
  const excluir = () => { const i = S.CARDS.indexOf(c); if (i >= 0) S.CARDS.splice(i, 1); cexToast('Card removido.'); onClose(); cexRefresh(); };

  const candidatos = c.resp && board.time ? S.PESSOAS.filter((p) => p.times.includes(board.time)) : S.PESSOAS;

  return (
    <>
      <div className="drawer-bg" onClick={onClose}></div>
      <div className="drawer drawer-wide">
        <div className="drawer-head">
          <button className="drawer-close" onClick={onClose}>✕</button>
          <div className="ph-eyebrow" style={{ marginBottom: 8 }}>
            {board.nome}{c.origem && <span className="kb-origem" style={{ marginLeft: 8 }}><Icon name="reunioes" size={11} className="ic" /> da reunião · {c.origem.titulo}</span>}
          </div>
          <div className="profile-name" style={{ fontSize: 22 }}>{c.titulo}</div>
        </div>
        <div className="drawer-body">
          {c.desc && <p style={{ fontSize: 14, color: 'var(--light)', lineHeight: 1.6, marginBottom: 8 }}>{c.desc}</p>}

          <div className="dsec" style={{ marginTop: 8 }}>
            <div className="dsec-title">Situação</div>
            <div className="kb-move">
              {board.colunas.map((col) => (
                <button key={col.id} className={`seg-chip ${c.col === col.id ? 'on' : ''}`} onClick={() => { onMove(c.id, col.id); force(); }}>{col.nome}</button>
              ))}
            </div>
            <dl className="kv" style={{ marginTop: 14 }}>
              <dt>Prazo</dt><dd>{c.prazo ? c.prazo : <span style={{ color: 'var(--subtle)' }}>sem prazo</span>} {S.isAtrasado(c) && <span className="chip chip-no" style={{ marginLeft: 6 }}>atrasado</span>}</dd>
              <dt>Prioridade</dt><dd>
                <div className="seg seg-sm" style={{ display: 'inline-flex' }}>
                  {['alta', 'media', 'baixa'].map((p) => <button key={p} className={c.prio === p ? 'on' : ''} onClick={() => setPrio(p)}>{S.PRIORIDADES[p].l}</button>)}
                </div>
              </dd>
            </dl>
          </div>

          <div className="dsec">
            <div className="dsec-title">Responsáveis</div>
            <div className="cand-pick">
              {candidatos.slice(0, 12).map((p) => {
                const on = (c.resp || []).includes(p.id);
                return (
                  <button key={p.id} className={`cand-chip ${on ? 'on' : ''}`} onClick={() => togResp(p.id)}>
                    <Av nome={p.nome} size="xs" fotoId={p.volId} /> {p.nome.split(' ')[0]} {on && '✓'}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="dsec">
            <div className="dsec-title">Comentários · {(c.comments || []).length}</div>
            <div className="kb-comments">
              {(c.comments || []).map((cm, i) => (
                <div className="kb-coment" key={i}>
                  <Av nome={cm.autor} size="sm" />
                  <div className="kb-coment-body"><div className="kb-coment-top"><b>{cm.autor}</b><span>{cm.when}</span></div><div className="kb-coment-txt">{cm.txt}</div></div>
                </div>
              ))}
              {(c.comments || []).length === 0 && <div style={{ fontSize: 13, color: 'var(--subtle)' }}>Nenhum comentário ainda.</div>}
            </div>
            {perm.comentar && (
              <div className="kb-coment-add">
                <input className="input" placeholder="Escreva um comentário..." value={coment} onChange={(e) => setComent(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addComent()} />
                <button className="btn btn-sec btn-sm" onClick={addComent}>Enviar</button>
              </div>
            )}
          </div>

          <div className="dsec">
            <div className="dsec-title">Atividade</div>
            <div className="tl jrn-tl compact">
              {(c.activity || []).slice(0, 8).map((a, i) => (
                <div className="tl-item" key={i}><div className="tl-dot"></div><div className="tl-when">{a.when}</div><div className="tl-text">{a.txt}</div></div>
              ))}
            </div>
          </div>

          {perm.editarBoard && <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={excluir}>Excluir card</button>}
        </div>
      </div>
    </>
  );
}

/* ════════ NOVO CARD ════════ */
function NovoCard({ board, col, onClose }) {
  const [titulo, setTitulo] = useState('');
  const [desc, setDesc] = useState('');
  const [prazo, setPrazo] = useState('');
  const [prio, setPrio] = useState('media');
  const [resp, setResp] = useState([]);
  const { DatePicker } = window;
  const candidatos = board.time ? S.PESSOAS.filter((p) => p.times.includes(board.time)) : S.PESSOAS;
  const criar = () => {
    if (!titulo.trim()) { cexToast('Dê um título ao card.', 'warn'); return; }
    S.CARDS.push({ id: cexId('k'), board: board.id, col, titulo: titulo.trim(), desc: desc.trim(), resp, prazo, prio, origem: null, movedAt: 0, comments: [], activity: [{ txt: 'Card criado', when: 'agora' }] });
    cexRefresh(); cexToast('Card adicionado.'); onClose();
  };
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">{board.nome}</div>
          <div className="modal-title">Novo card</div>
        </div>
        <div className="modal-body">
          <div className="field"><label className="field-label">Título</label><input className="input" autoFocus value={titulo} placeholder="O que precisa ser feito" onChange={(e) => setTitulo(e.target.value)} /></div>
          <div className="field"><label className="field-label">Descrição</label><textarea className="textarea" value={desc} placeholder="Detalhes (opcional)" onChange={(e) => setDesc(e.target.value)} /></div>
          <div className="field field-half"><label className="field-label">Prazo</label><DatePicker value={prazo} onChange={setPrazo} /></div>
          <div className="field field-half"><label className="field-label">Prioridade</label>
            <div className="seg seg-sm">{['alta', 'media', 'baixa'].map((p) => <button key={p} type="button" className={prio === p ? 'on' : ''} onClick={() => setPrio(p)}>{S.PRIORIDADES[p].l}</button>)}</div>
          </div>
          <div className="field"><label className="field-label">Responsáveis</label>
            <div className="cand-pick">
              {candidatos.slice(0, 12).map((p) => { const on = resp.includes(p.id); return (
                <button key={p.id} type="button" className={`cand-chip ${on ? 'on' : ''}`} onClick={() => setResp(on ? resp.filter((x) => x !== p.id) : [...resp, p.id])}><Av nome={p.nome} size="xs" fotoId={p.volId} /> {p.nome.split(' ')[0]} {on && '✓'}</button>
              ); })}
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-sec" onClick={onClose}>Cancelar</button>
          <button className="btn btn-pri" onClick={criar}>Adicionar card</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Quadros, BoardView, KbCard, CardDrawer, NovoCard, kanbanPerm, kanbanPapel, prazoLabel });
