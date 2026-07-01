/* ════════════════════════════════════════════════════════════════
   CE.X SERVICE · CONVERSAS (chat) — painel da liderança
   Canal por time, grupos e mensagens diretas (líder ↔ membro).
   O líder pode iniciar conversa (individual ou em grupo). Respeita a
   perspectiva: Direção vê tudo; líder vê só o seu time.
   ════════════════════════════════════════════════════════════════ */

/* avatar+nome de um membro por id (Direção = identidade da liderança) */
function memById(mid) {
  if (mid === 'direcao') return { id: 'direcao', nome: 'Direção', volId: null };
  return (S.MEMBROS || []).find((m) => m.id === mid);
}

/* quem "eu" sou ao enviar, na perspectiva atual */
function chatMeId() { return S.viewerMid ? S.viewerMid() : 'direcao'; }

/* ─── linha da lista de conversas ─── */
function ChatRow({ c, active, onClick, eu }) {
  const last = c.msgs[c.msgs.length - 1];
  const nome = S.chatNome(c, eu);
  const tipoLabel = c.tipo === 'time' ? 'Canal do time' : c.tipo === 'grupo' ? 'Grupo' : 'Mensagem direta';
  const ic = c.tipo === 'time' ? <TeamMark t={tById(c.timeId)} size={16} /> : c.tipo === 'grupo' ? <Icon name="membros" size={16} /> : <Icon name="pessoa" size={16} />;
  return (
    <button className={`chat-row ${active ? 'on' : ''}`} onClick={onClick}>
      <span className="chat-row-ic">{ic}</span>
      <span className="chat-row-main">
        <span className="chat-row-top"><b>{nome}</b>{last && <small>{last.when}</small>}</span>
        <span className="chat-row-prev">{last ? (last.de === eu ? 'Você: ' : '') + last.txt : tipoLabel}</span>
      </span>
      {c.tipo !== 'dm' && <span className="chat-row-count">{(c.membros || []).length}</span>}
    </button>
  );
}

/* ─── thread (mensagens + envio) — reutilizável painel/mobile ─── */
function ChatThread({ chat, eu, compact }) {
  const [, bump] = useState(0);
  const [txt, setTxt] = useState('');
  const endRef = useRef(null);
  useEffect(() => { if (endRef.current) endRef.current.scrollTop = endRef.current.scrollHeight; }, [chat && chat.id, chat && chat.msgs.length]);
  if (!chat) return null;
  const enviar = () => { if (!txt.trim()) return; S.enviarMsg(chat.id, eu, txt); setTxt(''); bump((n) => n + 1); };
  return (
    <div className={`chat-thread ${compact ? 'compact' : ''}`}>
      <div className="chat-msgs" ref={endRef}>
        {chat.msgs.map((m, i) => {
          const self = m.de === eu;
          const mm = memById(m.de);
          const prev = chat.msgs[i - 1];
          const showName = !self && chat.tipo !== 'dm' && (!prev || prev.de !== m.de);
          return (
            <div className={`chat-msg ${self ? 'me' : ''}`} key={i}>
              {!self && <Av nome={mm ? mm.nome : '?'} size="xs" fotoId={mm ? mm.volId : null} />}
              <div className="chat-bubble-wrap">
                {showName && <div className="chat-msg-name">{mm ? mm.nome.split(' ')[0] : 'Membro'}</div>}
                <div className="chat-bubble">{m.txt}</div>
                <div className="chat-when">{m.when}</div>
              </div>
            </div>
          );
        })}
        {chat.msgs.length === 0 && <div className="chat-empty">Nenhuma mensagem ainda. Mande a primeira.</div>}
      </div>
      <div className="chat-compose">
        <input className="input" placeholder="Escreva uma mensagem..." value={txt} onChange={(e) => setTxt(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && enviar()} />
        <button className="btn btn-pri btn-sm" onClick={enviar}>Enviar</button>
      </div>
    </div>
  );
}

/* ─── nova conversa (líder inicia: individual ou grupo) ─── */
function NovaConversaModal({ onClose, onCreated }) {
  const v = window.cexView();
  const [tipo, setTipo] = useState('dm'); // dm | grupo
  const [nome, setNome] = useState('');
  const [sel, setSel] = useState([]);
  /* candidatos: membros dos times visíveis na perspectiva */
  const times = window.cexScopeTimes();
  const ids = [...new Set(times.flatMap((tid) => S.membrosDoTime(tid)))];
  const eu = window.cexView().papel === 'lider' ? S.liderDoTime(window.cexView().timeId) : 'direcao';
  const candidatos = ids.filter((id) => id !== eu).map(memById).filter(Boolean);
  const tog = (id) => setSel((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  const criar = () => {
    if (sel.length === 0) { cexToast('Escolha pelo menos uma pessoa.', 'warn'); return; }
    const isGrupo = tipo === 'grupo' || sel.length > 1;
    const c = S.novaConversa({ tipo: isGrupo ? 'grupo' : 'dm', nome: isGrupo ? (nome.trim() || 'Novo grupo') : null, membros: [eu, ...sel], timeId: v.papel === 'lider' ? v.timeId : null });
    cexToast('Conversa criada.'); onCreated && onCreated(c.id); onClose();
  };
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Nova conversa</div>
          <div className="modal-title">Chamar para conversar</div>
          <div className="modal-sub">Fale com alguém em particular ou crie um grupo com parte da equipe.</div>
        </div>
        <div className="modal-body">
          <div className="field">
            <label className="field-label">Tipo</label>
            <div className="seg">
              <button className={tipo === 'dm' ? 'on' : ''} onClick={() => setTipo('dm')}>Individual</button>
              <button className={tipo === 'grupo' ? 'on' : ''} onClick={() => setTipo('grupo')}>Em grupo</button>
            </div>
          </div>
          {(tipo === 'grupo' || sel.length > 1) && (
            <div className="field"><label className="field-label">Nome do grupo</label><input className="input" value={nome} placeholder="ex: Apoio do domingo" onChange={(e) => setNome(e.target.value)} /></div>
          )}
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="field-label">Quem participa</label>
            <div className="cand-pick">
              {candidatos.map((m) => {
                const on = sel.includes(m.id);
                return <button key={m.id} className={`cand-chip ${on ? 'on' : ''}`} onClick={() => tog(m.id)}><Av nome={m.nome} size="xs" fotoId={m.volId} /> {m.nome.split(' ')[0]} {on && '✓'}</button>;
              })}
              {candidatos.length === 0 && <span style={{ fontSize: 12.5, color: 'var(--subtle)' }}>Sem pessoas no escopo atual.</span>}
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-sec" onClick={onClose}>Cancelar</button>
          <button className="btn btn-pri" onClick={criar}>Iniciar conversa</button>
        </div>
      </div>
    </div>
  );
}

/* ════════ TELA CONVERSAS ════════ */
function Conversas() {
  useRefresh();
  const [nova, setNova] = useState(false);
  const lista = S.chatsDaView();
  const [selId, setSelId] = useState(lista[0] ? lista[0].id : null);
  const v = window.cexView();
  const chat = lista.find((c) => c.id === selId) || lista[0] || null;
  const eu = chatMeId(chat);

  return (
    <div className="content wide">
      <div className="ph">
        <div>
          <div className="ph-eyebrow">Operação</div>
          <h1 className="ph-title">Conversas</h1>
          <p className="ph-sub">{v.papel === 'master' ? 'Só as conversas das quais você participa aparecem aqui.' : <>Canal do <em>{tById(v.timeId) ? tById(v.timeId).nome : 'seu time'}</em>, grupos e mensagens diretas da sua equipe.</>} Conversas são privadas: só os envolvidos veem.</p>
        </div>
        <div className="ph-actions">
          <button className="btn btn-pri" onClick={() => setNova(true)}>+ Nova conversa</button>
        </div>
      </div>

      <div className="chat-layout">
        <div className="chat-list">
          {lista.length === 0 && <div className="empty" style={{ margin: 8 }}>Nenhuma conversa ainda. <em>Inicie a primeira.</em></div>}
          {lista.map((c) => <ChatRow key={c.id} c={c} eu={eu} active={chat && c.id === chat.id} onClick={() => setSelId(c.id)} />)}
        </div>
        <div className="chat-main">
          {chat ? (
            <>
              <div className="chat-head">
                <span className="chat-head-ic">{chat.tipo === 'time' ? <TeamMark t={tById(chat.timeId)} size={16} /> : chat.tipo === 'grupo' ? <Icon name="membros" size={16} /> : <Icon name="pessoa" size={16} />}</span>
                <div>
                  <div className="chat-head-name">{S.chatNome(chat, eu)}</div>
                  <div className="chat-head-sub">{chat.tipo === 'time' ? 'Canal do time · ' + (chat.membros || []).length + ' pessoas' : chat.tipo === 'grupo' ? 'Grupo · ' + (chat.membros || []).length + ' pessoas' : 'Mensagem direta'}</div>
                </div>
              </div>
              <ChatThread chat={chat} eu={eu} />
            </>
          ) : <div className="empty" style={{ margin: 'auto' }}>Selecione uma conversa.</div>}
        </div>
      </div>

      {nova && <NovaConversaModal onClose={() => setNova(false)} onCreated={(id) => setSelId(id)} />}
    </div>
  );
}

Object.assign(window, { Conversas, ChatThread, ChatRow, NovaConversaModal, memById, chatMeId });
