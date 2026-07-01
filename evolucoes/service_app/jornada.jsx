/* ════════════════════════════════════════════════════════════════
   CE.X SERVICE · JORNADA — Decisões, Batismos e a linha do tempo
   da pessoa (componente reutilizável no perfil de membro/voluntário).
   ════════════════════════════════════════════════════════════════ */

const JRN_ICON = { decisao: 'decisoes', reconciliacao: 'decisoes', acompanha: 'pessoa', batismo: 'batismos', curso: 'cursos', integracao: 'ok', time: 'times', lider: 'identidade', transferencia: 'avancar', visita: 'visitante', nota: 'editar' };

/* ─── LINHA DO TEMPO DA PESSOA (reutilizável) ─── */
function PersonTimeline({ mid, compact }) {
  const eventos = S.timelineDe(mid);
  if (!eventos.length) return <div className="empty" style={{ padding: '28px 0' }}>Sem eventos registrados ainda.</div>;
  return (
    <div className={`tl jrn-tl ${compact ? 'compact' : ''}`}>
      {eventos.map((e, i) => {
        const t = S.TIPOS_EVENTO[e.tipo] || S.TIPOS_EVENTO.nota;
        return (
          <div className={`tl-item ${t.tom === 'olive' ? 'ol' : ''} tone-${t.tom}`} key={i}>
            <div className="tl-dot"></div>
            <div className="tl-when">{e.when} · <span className="jrn-tl-kind"><Icon name={JRN_ICON[e.tipo] || 'pendente'} size={12} className="ic" /> {t.label}</span></div>
            <div className="tl-text"><b>{e.titulo}</b>{e.desc && <> — {e.desc}</>}</div>
            {e.por && <div className="tl-by">por {e.por}</div>}
          </div>
        );
      })}
    </div>
  );
}

/* botão para registrar um novo evento (mock) */
function AddEventBtn() {
  return <button className="btn btn-sec btn-sm" style={{ marginTop: 16 }} onClick={() => cexSoon('Registrar evento na jornada')}>+ Registrar evento</button>;
}

/* ════════ DECISÕES / CONVERSÕES ════════ */
const DEC_TIPO = {
  decisao: { label: 'Decisão', cls: 'chip-ok' },
  reconciliacao: { label: 'Reconciliação', cls: 'chip-ok' },
};
const DEC_ST = {
  novo: { label: 'A contatar', cls: 'chip-wait' },
  acompanhando: { label: 'Acompanhando', cls: 'chip-ok' },
  encaminhado: { label: 'Encaminhado', cls: 'chip-neutral' },
};

function Decisoes({ openDecisao }) {
  const [q, setQ] = useState('');
  const [f, setF] = useState('todos');
  const shown = S.DECISOES.filter((d) => {
    const okQ = !q || d.nome.toLowerCase().includes(q.toLowerCase());
    const okF = f === 'todos' || d.status === f;
    return okQ && okF;
  });
  const novos = S.DECISOES.filter((d) => d.status === 'novo').length;
  const acomp = S.DECISOES.filter((d) => d.status === 'acompanhando').length;
  const mes = S.DECISOES.length;

  return (
    <div className="content wide">
      <div className="ph">
        <div>
          <div className="ph-eyebrow">Jornada</div>
          <h1 className="ph-title">Decisões por <em>Jesus</em></h1>
          <p className="ph-sub">Quem aceitou ou se reconciliou. Cada decisão vira uma pessoa no sistema e começa uma jornada — registre, acompanhe e encaminhe.</p>
        </div>
        <div className="ph-actions"><button className="btn btn-pri" onClick={() => cexSoon('Registrar decisão')}>+ Registrar decisão</button></div>
      </div>

      <div className="kpi-row">
        <div className="kpi">
          <div className="kpi-label"><Icon name="decisoes" size={13} className="ic" /> Decisões no mês</div>
          <div className="kpi-value">{mes}</div>
          <div className="kpi-foot"><span className="kpi-delta up">▲ novas almas</span> registradas</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><Icon name="pendente" size={13} className="ic" /> A contatar</div>
          <div className="kpi-value" style={{ color: 'var(--amber)' }}>{novos}</div>
          <div className="kpi-foot">aguardando primeiro contato</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><Icon name="pessoa" size={13} className="ic" /> Em acompanhamento</div>
          <div className="kpi-value">{acomp}</div>
          <div className="kpi-foot">discipulado 1-a-1 em andamento</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><Icon name="avancar" size={13} className="ic" /> Encaminhados</div>
          <div className="kpi-value">{S.DECISOES.filter((d) => d.status === 'encaminhado').length}</div>
          <div className="kpi-foot">já viraram membros</div>
        </div>
      </div>

      <div className="toolbar">
        <div className="tb-search"><span className="si">⌕</span><input placeholder="Buscar por nome..." value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="seg">
          {[['todos', 'Todas'], ['novo', 'A contatar'], ['acompanhando', 'Acompanhando'], ['encaminhado', 'Encaminhados']].map(([id, l]) => (
            <button key={id} className={f === id ? 'on' : ''} onClick={() => setF(id)}>{l}</button>
          ))}
        </div>
        <div className="tb-spacer"></div>
        <span className="panel-meta">{shown.length} decisões</span>
      </div>

      <div className="tbl">
        <div className="tr head" style={{ gridTemplateColumns: '1.5fr 1fr 1fr 130px' }}>
          <span>Pessoa</span><span>Quando & culto</span><span>Responsável</span><span>Situação</span>
        </div>
        {shown.map((d) => {
          const resp = pById(d.resp);
          return (
            <div className="tr click" key={d.id} style={{ gridTemplateColumns: '1.5fr 1fr 1fr 130px' }} onClick={() => openDecisao(d.id)}>
              <div className="cell-person">
                <Av nome={d.nome} size="md" />
                <div>
                  <div className="cell-name">{d.nome} <span className={`chip ${DEC_TIPO[d.tipo].cls}`} style={{ marginLeft: 6, transform: 'scale(0.92)' }}>{DEC_TIPO[d.tipo].label}</span></div>
                  <div className="cell-sub">{d.idade} anos · {d.tel}</div>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 13, color: 'var(--light)' }}>{d.quando}</div>
                <div className="cell-sub">{d.culto}</div>
              </div>
              <div className="cell-person">
                {resp && <Av nome={resp.nome} size="sm" />}
                <div className="cell-sub" style={{ marginTop: 0 }}>{resp ? resp.nome : '— a definir'}</div>
              </div>
              <div><span className={`chip ${DEC_ST[d.status].cls}`}>{DEC_ST[d.status].label}</span></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DecisaoDrawer({ id, onClose, openMembro }) {
  const d = S.DECISOES.find((x) => x.id === id);
  if (!d) return null;
  const resp = pById(d.resp);
  return (
    <>
      <div className="drawer-bg" onClick={onClose}></div>
      <div className="drawer">
        <div className="drawer-head">
          <button className="drawer-close" onClick={onClose}>✕</button>
          <div className="profile-top">
            <Av nome={d.nome} size="xl" />
            <div>
              <div className="profile-name">{d.nome}</div>
              <div className="profile-role">{DEC_TIPO[d.tipo].label} · {d.quando} · {d.idade} anos</div>
              <div style={{ marginTop: 10 }}><span className={`chip ${DEC_ST[d.status].cls}`}>{DEC_ST[d.status].label}</span></div>
            </div>
          </div>
        </div>
        <div className="drawer-body">
          <div className="dsec" style={{ marginTop: 4 }}>
            <div className="dsec-title">Registro da decisão</div>
            <dl className="kv">
              <dt>Telefone</dt><dd><a href={`tel:${d.tel}`}>{d.tel}</a></dd>
              <dt>Onde</dt><dd>{d.culto}</dd>
              <dt>Responsável</dt><dd>{resp ? resp.nome : 'a definir'}</dd>
            </dl>
            <div style={{ marginTop: 14, fontSize: 13.5, color: 'var(--light)', lineHeight: 1.6, padding: '14px 16px', background: 'var(--ink)', borderRadius: 'var(--r-md)', border: '0.5px solid var(--border-2)' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--subtle)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Observação</span>
              {d.obs}
            </div>
          </div>

          {d.membroId && (
            <div className="dsec">
              <div className="dsec-title">Jornada já iniciada</div>
              <PersonTimeline mid={d.membroId} compact />
            </div>
          )}

          <div className="dsec">
            <div className="dsec-title">Próximos passos</div>
            <div className="step-stack">
              <div className="step-do"><span className="step-ic">→</span> Fazer o primeiro contato (ligar / WhatsApp)</div>
              <div className="step-do"><span className="step-ic">→</span> Iniciar acompanhamento 1-a-1</div>
              <div className="step-do"><span className="step-ic">→</span> Matricular em <em style={{ color: 'var(--olive)', fontStyle: 'normal' }}>Novos Convertidos</em></div>
              <div className="step-do"><span className="step-ic">→</span> Inserir num Grupo de Comunhão</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--subtle)', marginTop: 12 }}>Toda decisão parte do mesmo princípio do visitante: entra no acompanhamento e segue a jornada até a membresia.</div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
            {d.membroId
              ? <button className="btn btn-pri" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { onClose(); openMembro(d.membroId); }}>Ver ficha do membro →</button>
              : <button className="btn btn-pri" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { S.VISITANTES.unshift({ id: cexId('v'), nome: d.nome, tel: d.tel, etapa: 'novo', visitou: d.culto, resp: null, due: 'Hoje', dueSt: 'soon', origem: 'Tomou decisão no culto', historico: [{ when: 'Hoje', txt: 'Decisão registrada · entrou no acompanhamento.', by: cexWho(), ol: true }] }); cexRefresh(); onClose(); cexToast(d.nome.split(' ')[0] + ' entrou no fluxo de visitantes.'); }}>Encaminhar p/ acompanhamento →</button>}
            <button className="btn btn-sec" style={{ flex: 1, justifyContent: 'center' }} onClick={() => cexToast('Contato registrado na jornada.')}>Registrar contato</button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ════════ BATISMOS ════════ */
const BAT_ST = {
  aberta: { label: 'Inscrições abertas', cls: 'chip-ok' },
  preparacao: { label: 'Em preparação', cls: 'chip-wait' },
  agendada: { label: 'Agendada', cls: 'chip-ok' },
  concluida: { label: 'Concluída', cls: 'chip-neutral' },
};
const candNome = (id) => {
  if (id[0] === 'm') { const m = mById(id); return m ? m.nome : id; }
  const d = S.DECISOES.find((x) => x.id === id); return d ? d.nome : id;
};

function Batismos({ openBatismo }) {
  const prox = S.BATISMOS.filter((b) => b.status !== 'concluida');
  const feitos = S.BATISMOS.filter((b) => b.status === 'concluida');
  const candidatos = prox.reduce((n, b) => n + b.candidatos.length, 0);
  return (
    <div className="content wide">
      <div className="ph">
        <div>
          <div className="ph-eyebrow">Jornada</div>
          <h1 className="ph-title">Batismos</h1>
          <p className="ph-sub">Turmas de batismo nas águas. Inscrições, curso pré-batismo, agenda e histórico — cada batismo entra na linha do tempo da pessoa.</p>
        </div>
        <div className="ph-actions"><button className="btn btn-pri">+ Nova turma</button></div>
      </div>

      <div className="kpi-row">
        <div className="kpi">
          <div className="kpi-label"><Icon name="agenda" size={13} className="ic" /> Próxima turma</div>
          <div className="kpi-value" style={{ fontSize: 26 }}>{prox[0] ? prox[0].data.replace(' 2025', '') : '—'}</div>
          <div className="kpi-foot">{prox[0] ? prox[0].turma : 'nenhuma agendada'}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><Icon name="membros" size={13} className="ic" /> Candidatos</div>
          <div className="kpi-value">{candidatos}</div>
          <div className="kpi-foot">inscritos nas próximas turmas</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><Icon name="batismos" size={13} className="ic" /> Batizados no ano</div>
          <div className="kpi-value">{feitos.reduce((n, b) => n + b.candidatos.length, 0) + 19}</div>
          <div className="kpi-foot">{feitos.length} turmas concluídas</div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><Icon name="cursos" size={13} className="ic" /> Em preparação</div>
          <div className="kpi-value" style={{ color: 'var(--amber)' }}>{S.BATISMOS.filter((b) => b.status === 'preparacao').length}</div>
          <div className="kpi-foot">turmas no curso pré-batismo</div>
        </div>
      </div>

      <div className="section-divide"><Icon name="batismos" size={14} className="num" /><span className="label">Próximas turmas</span><span className="line"></span></div>
      <div className="bat-grid">
        {prox.map((b) => (
          <button className="bat-card" key={b.id} onClick={() => openBatismo(b.id)}>
            <div className="bat-card-top">
              <div>
                <div className="bat-date">{b.data}</div>
                <div className="bat-turma">{b.turma}</div>
              </div>
              <span className={`chip ${BAT_ST[b.status].cls}`}>{BAT_ST[b.status].label}</span>
            </div>
            <div className="bat-meta">{b.local} · {b.pastor}</div>
            <div className="bat-foot">
              <AvStack ids={b.candidatos.filter((c) => c[0] === 'm')} max={5} />
              <span className="team-stat"><b>{b.candidatos.length}</b> candidato(s)</span>
            </div>
          </button>
        ))}
      </div>

      <div className="section-divide"><Icon name="historia" size={14} className="num" /><span className="label">Histórico</span><span className="line"></span></div>
      <div className="tbl">
        {feitos.map((b) => (
          <div className="tr click" key={b.id} style={{ gridTemplateColumns: '120px 1.4fr 1fr 130px' }} onClick={() => openBatismo(b.id)}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--olive)' }}>{b.data}</div>
            <div><div className="cell-name">{b.turma}</div><div className="cell-sub">{b.local}</div></div>
            <div className="cell-sub">{b.obs}</div>
            <div><span className={`chip ${BAT_ST[b.status].cls}`}>{BAT_ST[b.status].label}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BatismoDrawer({ id, onClose, openMembro }) {
  const b = S.BATISMOS.find((x) => x.id === id);
  if (!b) return null;
  return (
    <>
      <div className="drawer-bg" onClick={onClose}></div>
      <div className="drawer">
        <div className="drawer-head">
          <button className="drawer-close" onClick={onClose}>✕</button>
          <div className="profile-top">
            <div className="bat-mark"><Icon name="batismos" size={22} /></div>
            <div>
              <div className="profile-name">{b.turma}</div>
              <div className="profile-role">{b.data} · {b.local}</div>
              <div style={{ marginTop: 10 }}><span className={`chip ${BAT_ST[b.status].cls}`}>{BAT_ST[b.status].label}</span></div>
            </div>
          </div>
        </div>
        <div className="drawer-body">
          <div className="dsec" style={{ marginTop: 4 }}>
            <div className="dsec-title">Detalhes</div>
            <dl className="kv">
              <dt>Data</dt><dd>{b.data}</dd>
              <dt>Local</dt><dd>{b.local}</dd>
              <dt>Pastor</dt><dd>{b.pastor}</dd>
              <dt>Observação</dt><dd>{b.obs}</dd>
            </dl>
          </div>
          <div className="dsec">
            <div className="dsec-title">Candidatos · {b.candidatos.length}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {b.candidatos.map((cid) => {
                const isM = cid[0] === 'm';
                const m = isM ? mById(cid) : null;
                return (
                  <div className="cand" key={cid} onClick={() => { if (isM) { onClose(); openMembro(cid); } }} style={{ cursor: isM ? 'pointer' : 'default' }}>
                    <Av nome={candNome(cid)} size="sm" />
                    <div className="cand-main">
                      <div className="cand-name">{candNome(cid)}</div>
                      <div className="cand-meta">{isM ? 'Membro' : 'Nova decisão'}</div>
                    </div>
                    {isM ? <span className="cand-fit good">ver →</span> : <span className="cand-fit busy">decisão</span>}
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
            <AddCandidatoBtn b={b} />
            {b.status === 'concluida'
              ? <button className="btn btn-sec" style={{ flex: 1, justifyContent: 'center' }} onClick={() => cexToast('Certificados gerados para os batizados.')}>Emitir certificados</button>
              : <button className="btn btn-sec" style={{ flex: 1, justifyContent: 'center' }} onClick={() => cexToast('Aviso enviado aos candidatos.')}>Avisar candidatos</button>}
          </div>
        </div>
      </div>
    </>
  );
}

/* botão + modal: adicionar candidato (membro) a uma turma de batismo */
function AddCandidatoBtn({ b }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [, bump] = useState(0);
  const fora = (S.MEMBROS || []).filter((m) => !(b.candidatos || []).includes(m.id) && (!q || m.nome.toLowerCase().includes(q.toLowerCase())));
  const add = (m) => { (b.candidatos || (b.candidatos = [])).push(m.id); cexRefresh(); bump((n) => n + 1); cexToast(m.nome.split(' ')[0] + ' adicionado(a) à turma.'); };
  return (
    <>
      <button className="btn btn-pri" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setOpen(true)}>+ Adicionar candidato</button>
      {open && (
        <div className="modal-bg" onClick={() => setOpen(false)} style={{ zIndex: 80 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-eyebrow">Adicionar candidato</div>
              <div className="modal-title">Turma de batismo</div>
              <div className="modal-sub">Escolha quem será batizado nesta turma.</div>
            </div>
            <div className="modal-body">
              <div className="tb-search" style={{ marginBottom: 12 }}><span className="si"><Icon name="buscar" size={13} /></span><input placeholder="Buscar membro…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
              {fora.map((m) => (
                <div className="flag-row" key={m.id} style={{ cursor: 'pointer' }} onClick={() => add(m)}>
                  <Av nome={m.nome} size="sm" />
                  <div className="flag-main"><div className="flag-nome">{m.nome}</div><div className="flag-meta">{m.bairro || 'Membro'}</div></div>
                  <span className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}>Adicionar</span>
                </div>
              ))}
              {fora.length === 0 && <div className="empty">Ninguém disponível para adicionar.</div>}
            </div>
            <div className="modal-foot"><button className="btn btn-pri" onClick={() => setOpen(false)}>Concluído</button></div>
          </div>
        </div>
      )}
    </>
  );
}

Object.assign(window, { PersonTimeline, AddEventBtn, Decisoes, DecisaoDrawer, Batismos, BatismoDrawer, candNome });
