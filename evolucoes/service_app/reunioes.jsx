/* ════════════════════════════════════════════════════════════════
   CE.X SERVICE · REUNIÕES & ENSAIOS (tela)
   ════════════════════════════════════════════════════════════════ */

function Reunioes({ openPessoa, go, only }) {
  useRefresh();
  const [aba, setAba] = useState(only || 'reunioes');
  const [drawer, setDrawer] = useState(null); // {kind:'reuniao'|'ensaio', id} | {kind:'nova'}
  const futuras = S.REUNIOES.filter((r) => r.status === 'agendada');
  const feitas = S.REUNIOES.filter((r) => r.status === 'realizada');

  return (
    <div className="content wide">
      <div className="ph">
        <div>
          <div className="ph-eyebrow">Liderança</div>
          <h1 className="ph-title">{aba === 'ensaios' ? <>Ensaios</> : <>Reuniões</>}</h1>
          <p className="ph-sub">{aba === 'ensaios' ? 'Ensaios de louvor, teatro, dança e mais — com quem participa, o repertório (tom e cifra) ou os materiais (vídeos, documentos).' : 'Líderes e pastores marcam reuniões, registram a pauta, a ata e as responsabilidades, para validar na próxima.'}</p>
        </div>
        <div className="ph-actions">
          {!only && <div className="seg">
            <button className={aba === 'reunioes' ? 'on' : ''} onClick={() => setAba('reunioes')}>Reuniões</button>
            <button className={aba === 'ensaios' ? 'on' : ''} onClick={() => setAba('ensaios')}>Ensaios</button>
          </div>}
          {aba === 'reunioes'
            ? <button className="btn btn-pri" onClick={() => setDrawer({ kind: 'nova' })}>+ Marcar reunião</button>
            : <button className="btn btn-pri" onClick={() => cexCreate('ensaio')}>+ Novo ensaio</button>}
        </div>
      </div>

      {aba === 'reunioes' && (
        <>
          <div className="section-divide"><Icon name="reunioes" size={15} className="num" /><span className="label">Agendadas</span><span className="line"></span></div>
          {futuras.length === 0 && <div className="empty">Nenhuma reunião agendada. <em>Marque a próxima.</em></div>}
          <div className="reu-grid">
            {futuras.map((r) => <ReuCard key={r.id} r={r} onOpen={() => setDrawer({ kind: 'reuniao', id: r.id })} />)}
          </div>

          <div className="section-divide"><Icon name="ok" size={15} className="num" /><span className="label">Realizadas</span><span className="line"></span></div>
          <div className="tbl">
            {feitas.map((r) => {
              const pend = (r.acoes || []).filter((a) => a.status !== 'feito').length;
              return (
                <div className="tr click" key={r.id} style={{ gridTemplateColumns: '130px 1.6fr 1fr 120px' }} onClick={() => setDrawer({ kind: 'reuniao', id: r.id })}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--olive)' }}>{r.data}</div>
                  <div><div className="cell-name">{r.titulo}</div><div className="cell-sub">{r.times.length} time(s) · {r.presentes.length} presentes</div></div>
                  <div className="cell-sub">{(r.acoes || []).length} responsabilidade(s)</div>
                  <div>{pend > 0 ? <Chip st="wait" label={pend + ' em aberto'} /> : <Chip st="ok" label="Tudo feito" />}</div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {aba === 'ensaios' && (
        <div className="reu-grid">
          {S.ENSAIOS.map((e) => {
            const t = tById(e.time || (e.times && e.times[0]));
            const tipo = (S.TIPOS_ENSAIO && S.TIPOS_ENSAIO[e.tipo]) || 'Ensaio';
            return (
              <button className="ens-card" key={e.id} onClick={() => setDrawer({ kind: 'ensaio', id: e.id })}>
                <div className="ens-top">
                  <span className="ens-rec">{S.RECOR[e.recorrencia]}{e.recorrencia === 'eventual' && e.vezes ? ' · ' + e.vezes + 'x' : ''}</span>
                  <span className="ens-pub">{tipo}</span>
                </div>
                <div className="ens-title">{e.titulo}</div>
                <div className="ens-when">{e.data || e.dia} · {e.hora} · {e.local}</div>
                <div className="ens-team"><span className="ens-team-ic"><TeamMark t={t} size={15} /></span>{t ? t.nome : 'Vários times'}{(e.presentes && e.presentes.length) ? ' · ' + e.presentes.length + ' pessoas' : ''}</div>
                {(e.repertorio && e.repertorio.length > 0) && <div className="ens-obs"><Icon name="louvor" size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />{e.repertorio.length} louvor(es) no repertório</div>}
                {e.obs && <div className="ens-obs">{e.obs}</div>}
              </button>
            );
          })}
        </div>
      )}

      {drawer && drawer.kind === 'reuniao' && <ReuniaoDrawer id={drawer.id} onClose={() => setDrawer(null)} openPessoa={openPessoa} go={go} />}
      {drawer && drawer.kind === 'ensaio' && <EnsaioDrawer id={drawer.id} onClose={() => setDrawer(null)} openPessoa={openPessoa} />}
      {drawer && drawer.kind === 'nova' && <ReuniaoForm onClose={() => setDrawer(null)} />}
    </div>
  );
}

function ReuCard({ r, onOpen }) {
  const autor = pById(r.autor);
  return (
    <button className="reu-card" onClick={onOpen}>
      <div className="reu-card-top">
        <div>
          <div className="reu-date">{r.data} · {r.hora}</div>
          <div className="reu-title">{r.titulo}</div>
        </div>
        <span className="chip chip-ok">Agendada</span>
      </div>
      <div className="reu-meta">{r.local} · marcada por {autor ? autor.nome.split(' ')[0] : 'líder'}</div>
      <div className="reu-foot">
        <div className="reu-times">{r.times.map((tid) => { const t = tById(tid); return t ? <span key={tid} className="tag">{t.nome.split(' ')[0]}</span> : null; })}</div>
        <AvStack ids={r.presentes} max={5} />
      </div>
    </button>
  );
}

/* ─── DRAWER DO ENSAIO (ver/abrir um ensaio marcado) ─── */
function EnsaioDrawer({ id, onClose, openPessoa }) {
  useRefresh();
  const e = S.ENSAIOS.find((x) => x.id === id);
  if (!e) return null;
  const times = e.times && e.times.length ? e.times : (e.time ? [e.time] : []);
  const tipo = (S.TIPOS_ENSAIO && S.TIPOS_ENSAIO[e.tipo]) || 'Ensaio';
  const presentes = e.presentes || [];
  return (
    <>
      <div className="drawer-bg" onClick={onClose}></div>
      <div className="drawer drawer-wide">
        <div className="drawer-head">
          <button className="drawer-close" onClick={onClose}>✕</button>
          <div className="ph-eyebrow" style={{ marginBottom: 8 }}>{tipo} · {S.RECOR[e.recorrencia]}{e.recorrencia === 'eventual' && e.vezes ? ' · ' + e.vezes + '×' : ''}</div>
          <div className="profile-name">{e.titulo}</div>
          <div className="profile-role">{e.data || e.dia} · {e.hora} · {e.local}{e.publico ? ' · ' + (S.PUBLICO[e.publico] || '') : ''}</div>
        </div>
        <div className="drawer-body">
          {times.length > 0 && (
            <div className="dsec" style={{ marginTop: 0 }}>
              <div className="dsec-title">Times</div>
              <div className="cell-tags">{times.map((tid) => { const t = tById(tid); return t ? <span key={tid} className="tag lead"><TeamMark t={t} size={13} style={{ verticalAlign: '-2px', marginRight: 4 }} /> {t.nome}</span> : null; })}</div>
            </div>
          )}

          {presentes.length > 0 && (
            <div className="dsec">
              <div className="dsec-title">Quem participa · {presentes.length}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {presentes.map((pid) => { const p = pById(pid); return p ? (
                  <div className="cand" key={pid} onClick={() => { onClose(); openPessoa && openPessoa(pid); }}>
                    <Av nome={p.nome} size="sm" fotoId={p.volId} />
                    <div className="cand-main"><div className="cand-name">{p.nome}</div><div className="cand-meta">{(p.funcoes || []).join(' · ') || 'Participante'}</div></div>
                  </div>
                ) : null; })}
              </div>
            </div>
          )}

          {e.repertorio && e.repertorio.length > 0 && (
            <div className="dsec">
              <div className="dsec-title">Repertório</div>
              <div className="setlist-list">
                {e.repertorio.map((s, i) => (
                  <div className="setlist-row" key={i}>
                    <span className="setlist-n">{String(i + 1).padStart(2, '0')}</span>
                    <span className="setlist-titulo">{s.titulo}</span>
                    {s.tom && <span className="setlist-tom">{s.tom}</span>}
                    {s.youtube && <a className="setlist-link" href={s.youtube} target="_blank" rel="noreferrer">vídeo</a>}
                    {s.cifra && <a className="setlist-link" href={s.cifra} target="_blank" rel="noreferrer">cifra</a>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {e.anexos && e.anexos.length > 0 && (
            <div className="dsec">
              <div className="dsec-title">Materiais</div>
              <div className="anx-list">
                {e.anexos.map((a, i) => (
                  a.url
                    ? <a className="anx-item" key={i} href={a.url} target="_blank" rel="noreferrer"><span className="anx-tag">{a.tipo}</span><span className="anx-nome">{a.nome}</span></a>
                    : <div className="anx-item" key={i}><span className="anx-tag">{a.tipo}</span><span className="anx-nome">{a.nome}</span></div>
                ))}
              </div>
            </div>
          )}

          {e.obs && (
            <div className="dsec">
              <div className="dsec-title">Observação</div>
              <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6 }}>{e.obs}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ─── escolha de quadro para mandar as responsabilidades ─── */
function BoardChooser({ title, onPick, onClose }) {
  const [novo, setNovo] = useState('');
  const boards = S.BOARDS || [];
  const criar = () => {
    const nome = novo.trim(); if (!nome) return;
    const b = { id: cexId('bd'), nome, escopo: 'geral', time: null, desc: 'Criado a partir de uma reunião.', colunas: S.COLUNAS_PADRAO.slice() };
    S.BOARDS.push(b); onPick(b.id);
  };
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Responsabilidades</div>
          <div className="modal-title">{title || 'Para qual quadro?'}</div>
          <div className="modal-sub">Mande para um quadro que já existe ou crie um novo. As responsabilidades viram cards com o responsável marcado.</div>
        </div>
        <div className="modal-body" style={{ display: 'block' }}>
          <div className="dsec-title" style={{ marginBottom: 10 }}>Quadros existentes</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {boards.length === 0 && <div className="empty" style={{ padding: '8px 0' }}>Nenhum quadro ainda — crie um abaixo.</div>}
            {boards.map((b) => (
              <button className="cand" key={b.id} onClick={() => onPick(b.id)}>
                <span className="esc-col-mark" style={{ width: 30, height: 30 }}><Icon name="quadros" size={15} /></span>
                <div className="cand-main"><div className="cand-name">{b.nome}</div><div className="cand-meta">{b.escopo === 'geral' ? 'Liderança' : (tById(b.time) ? tById(b.time).nome : 'Time')}</div></div>
              </button>
            ))}
          </div>
          <div className="dsec-title" style={{ margin: '20px 0 10px' }}>Ou crie um novo</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input className="input" style={{ flex: 1 }} placeholder="Nome do novo quadro" value={novo} onChange={(e) => setNovo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && criar()} />
            <button className="btn btn-pri" onClick={criar}>Criar e usar</button>
          </div>
        </div>
        <div className="modal-foot"><button className="btn btn-ghost" onClick={onClose}>Cancelar</button></div>
      </div>
    </div>
  );
}

function ReuniaoDrawer({ id, onClose, openPessoa, go }) {
  const r0 = S.REUNIOES.find((x) => x.id === id);
  const [r, setR] = useState(r0);
  const [ata, setAta] = useState(r0 ? r0.ata : '');
  const [novoO, setNovoO] = useState('');
  const [novoQuem, setNovoQuem] = useState('');
  const [chooser, setChooser] = useState(null); // {scope:'all'|number}
  if (!r) return null;
  const autor = r.autor ? pById(r.autor) : null;
  const autorNome = autor ? autor.nome : (r.autorNome || 'Liderança');

  const addAcao = () => {
    if (!novoO.trim()) { cexToast('Descreva a responsabilidade.', 'warn'); return; }
    const acoes = [...(r.acoes || []), { o: novoO.trim(), quem: novoQuem || null, status: 'pendente' }];
    r.acoes = acoes; setR({ ...r, acoes }); setNovoO(''); setNovoQuem('');
  };

  /* cria card de uma responsabilidade num board específico */
  const enviarParaBoard = (i, boardId) => {
    const a = r.acoes[i];
    const cid = cexId('k');
    S.CARDS.push({ id: cid, board: boardId, col: 'todo', titulo: a.o, desc: '', resp: a.quem ? [a.quem] : [], prazo: '', prio: 'media', origem: { tipo: 'reuniao', id: r.id, titulo: r.titulo }, movedAt: 0, comments: [], activity: [{ txt: 'Criado a partir da reunião ' + r.titulo, when: 'agora' }] });
    const acoes = [...r.acoes]; acoes[i] = { ...a, cardId: cid }; r.acoes = acoes; setR({ ...r, acoes });
  };

  const onPickBoard = (boardId) => {
    const board = S.BOARDS.find((b) => b.id === boardId);
    if (chooser.scope === 'all') {
      (r.acoes || []).forEach((a, i) => { if (!a.cardId) enviarParaBoard(i, boardId); });
      cexToast('Responsabilidades enviadas ao quadro "' + (board ? board.nome : '') + '".');
    } else {
      enviarParaBoard(chooser.scope, boardId);
      cexToast('Responsabilidade enviada ao quadro "' + (board ? board.nome : '') + '".');
    }
    cexRefresh(); setChooser(null);
  };

  const salvarAta = () => {
    r.ata = ata;
    const pendentes = (r.acoes || []).filter((a) => !a.cardId).length;
    if (r.status === 'agendada') { r.status = 'realizada'; }
    cexRefresh();
    if (pendentes > 0) { setChooser({ scope: 'all' }); }
    else { cexToast('Ata salva.'); }
  };

  return (
    <>
      <div className="drawer-bg" onClick={onClose}></div>
      <div className="drawer drawer-wide">
        <div className="drawer-head">
          <button className="drawer-close" onClick={onClose}>✕</button>
          <div className="ph-eyebrow" style={{ marginBottom: 8 }}>{r.status === 'agendada' ? 'Reunião agendada' : 'Reunião realizada'}</div>
          <div className="profile-name">{r.titulo}</div>
          <div className="profile-role">{r.data} · {r.hora} · {r.local} · por {autorNome}</div>
        </div>
        <div className="drawer-body">
          <div className="dsec" style={{ marginTop: 0 }}>
            <div className="dsec-title">Times & presentes</div>
            <div className="cell-tags" style={{ marginBottom: 12 }}>{r.times.map((tid) => { const t = tById(tid); return t ? <span key={tid} className="tag lead"><TeamMark t={t} size={13} style={{ verticalAlign: '-2px', marginRight: 4 }} /> {t.nome}</span> : null; })}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {r.presentes.map((pid) => { const p = pById(pid); return p ? (
                <div className="cand" key={pid} onClick={() => { onClose(); openPessoa && openPessoa(pid); }}>
                  <Av nome={p.nome} size="sm" fotoId={p.volId} />
                  <div className="cand-main"><div className="cand-name">{p.nome}</div><div className="cand-meta">{(p.funcoes || []).join(' · ') || 'Participante'}</div></div>
                </div>
              ) : null; })}
            </div>
          </div>

          <div className="dsec">
            <div className="dsec-title">Pauta</div>
            <div className="step-stack">
              {r.pauta.map((p, i) => <div className="step-do" key={i}><span className="step-ic">{String(i + 1).padStart(2, '0')}</span> {p}</div>)}
            </div>
          </div>

          <div className="dsec">
            <div className="dsec-title">Ata · o que foi discutido</div>
            <textarea className="textarea" style={{ minHeight: 90 }} placeholder="Registre as decisões e os pontos principais da reunião..." value={ata} onChange={(e) => setAta(e.target.value)}></textarea>
          </div>

          <div className="dsec">
            <div className="dsec-title">Responsabilidades · anote durante a reunião</div>
            <div className="reu-quadro-note">Cada responsabilidade vira um <b>card no quadro</b>. O andamento é acompanhado lá — aqui ele só <b>reflete</b> o que está no quadro.</div>

            {(r.acoes && r.acoes.length > 0) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                {r.acoes.map((a, i) => {
                  const q = pById(a.quem);
                  const card = (a.cardId && S.CARDS.find((c) => c.id === a.cardId))
                    || S.CARDS.find((c) => c.origem && c.origem.tipo === 'reuniao' && c.origem.id === r.id && c.titulo === a.o);
                  const COL = { todo: { l: 'A fazer', st: 'wait' }, doing: { l: 'Em andamento', st: 'wait' }, done: { l: 'Concluído', st: 'ok' } };
                  const stt = card ? (COL[card.col] || COL.todo) : null;
                  return (
                    <div className="acao-row" key={i}>
                      <div className="acao-main">
                        <div className="acao-o">{a.o}</div>
                        <div className="acao-quem">{q ? q.nome.split(' ')[0] : 'a definir'}</div>
                      </div>
                      <div className="acao-side">
                        {card
                          ? <>
                              <Chip st={stt.st} label={stt.l} />
                              <button className="btn btn-ghost btn-sm acao-toboard" onClick={() => { onClose(); go && go('quadros'); }} title="Abrir nos quadros">Ver no quadro →</button>
                            </>
                          : <>
                              <span className="acao-semquadro">fora do quadro</span>
                              <button className="btn btn-ghost btn-sm acao-toboard" onClick={() => setChooser({ scope: i })} title="Mandar a um quadro">→ Quadro</button>
                            </>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="acao-add">
              <input className="input" placeholder="O que ficou combinado (ex: Revisar escala de julho)" value={novoO} onChange={(e) => setNovoO(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addAcao()} />
              <select className="select acao-add-quem" value={novoQuem} onChange={(e) => setNovoQuem(e.target.value)}>
                <option value="">Responsável…</option>
                {r.presentes.map((pid) => { const p = pById(pid); return p ? <option key={pid} value={pid}>{p.nome}</option> : null; })}
              </select>
              <button className="btn btn-sec btn-sm" onClick={addAcao}>+ Anotar</button>
            </div>
          </div>

          <button className="btn btn-pri" style={{ width: '100%', justifyContent: 'center', marginTop: 20 }} onClick={salvarAta}>Salvar ata{r.status === 'agendada' ? ' & marcar realizada' : ''}</button>
        </div>
      </div>

      {chooser && <BoardChooser title={chooser.scope === 'all' ? 'Onde colocar as responsabilidades?' : 'Mandar para qual quadro?'} onPick={onPickBoard} onClose={() => { setChooser(null); cexToast('Ata salva.'); }} />}
    </>
  );
}

function ReuniaoForm({ onClose }) {
  const { DatePicker, TimePicker, PeoplePicker } = window;
  const [titulo, setTitulo] = useState('');
  const [data, setData] = useState('');
  const [hora, setHora] = useState('20h00');
  const [fim, setFim] = useState('21h30');
  const [local, setLocal] = useState('Templo');
  const [sala, setSala] = useState('');
  const [presentes, setPresentes] = useState([]);
  const [pauta, setPauta] = useState('');
  const autorNome = (typeof cexWho === 'function') ? cexWho() : 'Liderança';

  const conflito = (sala && data) ? S.conflitoReserva({ sala, data, inicio: hora, fim }) : null;

  const criar = () => {
    if (!titulo.trim()) { cexToast('Dê um título à reunião.', 'warn'); return; }
    if (sala && data && conflito) { cexToast(`A sala já tem "${conflito.titulo}" em ${conflito.inicio}–${conflito.fim}. Escolha outro horário ou sala.`, 'warn'); return; }
    const times = [...new Set(S.PESSOAS.filter((p) => presentes.includes(p.id)).flatMap((p) => p.times))];
    const id = cexId('r');
    S.REUNIOES.unshift({
      id, titulo: titulo.trim(), data: data || 'a definir', hora, local: sala ? (S.salaById(sala).nome) : local, sala: sala || null, autor: null, autorNome, status: 'agendada',
      times, presentes, pauta: pauta.split('\n').map((s) => s.trim()).filter(Boolean), ata: '', acoes: [],
    });
    if (sala && data) S.reservar({ sala, titulo: titulo.trim(), tipo: 'reuniao', data, inicio: hora, fim, origem: { tipo: 'reuniao', id } });
    cexRefresh(); cexToast(sala ? 'Reunião marcada e espaço reservado.' : 'Reunião marcada. A equipe será avisada.'); onClose();
  };

  return (
    <>
      <div className="drawer-bg" onClick={onClose}></div>
      <div className="drawer drawer-wide">
        <div className="drawer-head">
          <button className="drawer-close" onClick={onClose}>✕</button>
          <div className="ph-eyebrow" style={{ marginBottom: 8 }}>Nova reunião · por {autorNome}</div>
          <input className="ce-title-input" placeholder="Título da reunião" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </div>
        <div className="drawer-body">
          <div className="dsec" style={{ marginTop: 0 }}>
            <div className="dsec-title">Quando & onde</div>
            <div className="ce-grid">
              <div className="field"><label className="field-label">Data</label><DatePicker value={data} onChange={setData} /></div>
              <div className="field"><label className="field-label">Início</label><TimePicker value={hora} onChange={setHora} /></div>
              <div className="field"><label className="field-label">Fim</label><TimePicker value={fim} onChange={setFim} /></div>
            </div>
            <div className="ce-grid" style={{ marginTop: 4 }}>
              <div className="field"><label className="field-label">Reservar uma sala</label>
                <select className="select" value={sala} onChange={(e) => setSala(e.target.value)}>
                  <option value="">Sem reserva de sala</option>
                  {(S.SALAS || []).map((s) => <option key={s.id} value={s.id}>{s.nome} · {s.capacidade} lug.</option>)}
                </select>
              </div>
              {!sala && <div className="field"><label className="field-label">Local (texto livre)</label><input className="input" value={local} onChange={(e) => setLocal(e.target.value)} /></div>}
            </div>
            {conflito && <div className="reserva-warn"><Icon name="alerta" size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />A sala já tem "{conflito.titulo}" em {conflito.inicio}–{conflito.fim} nesse dia.</div>}
          </div>

          <div className="dsec">
            <div className="dsec-title">Quem participa</div>
            <PeoplePicker value={presentes} onChange={setPresentes} />
          </div>

          <div className="dsec">
            <div className="dsec-title">Pauta · um item por linha</div>
            <textarea className="textarea" style={{ minHeight: 90 }} placeholder={'Balanço do mês\nEscala de julho\nCuidado com a equipe'} value={pauta} onChange={(e) => setPauta(e.target.value)}></textarea>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button className="btn btn-pri" style={{ flex: 1, justifyContent: 'center' }} disabled={!!conflito} onClick={criar}>Marcar reunião</button>
            <button className="btn btn-sec" onClick={onClose}>Cancelar</button>
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { Reunioes, ReuCard, ReuniaoDrawer, ReuniaoForm, EnsaioDrawer, BoardChooser });
