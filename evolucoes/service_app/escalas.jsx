/* ════════════════════════════════════════════════════════════════
   CE.X SERVICE · ESCALAS — por EVENTO. Uma coluna por time, linhas
   por função. Filtro é o culto/evento. Master vê todos os times;
   líder vê só os times que lidera (ou que delegaram a ele).
   Estado local mutável (protótipo).
   ════════════════════════════════════════════════════════════════ */

/* candidatos aptos a uma função de um time, p/ um culto.
   bloqueados = ids já escalados em QUALQUER time neste evento (não pode repetir).
   cfg = regras de escala (férias, teto por mês). cargaPorPessoa = nº de eventos
   em que a pessoa já está neste período. */
function candidatos(timeId, fn, culto, jaNoSlot, bloqueados, cfg, cargaPorPessoa) {
  bloqueados = bloqueados || [];
  cfg = cfg || {};
  cargaPorPessoa = cargaPorPessoa || {};
  return S.PESSOAS
    .filter((p) => p.times.includes(timeId) && p.status === 'ativo' && !jaNoSlot.includes(p.id)
      && (S.atendeTags ? S.atendeTags(p, culto && culto.tags) : true))
    .map((p) => {
      let motivo = null;
      if (bloqueados.includes(p.id)) motivo = 'já escalado neste culto';
      else if (cfg.considerarFerias && p.ferias) motivo = 'de férias';
      else if (cfg.maxPorMes && (cargaPorPessoa[p.id] || 0) >= cfg.maxPorMes) motivo = 'no teto do mês';
      const fit = motivo ? 'block' : (p.disp[culto.slot] ? 'good' : 'busy');
      return { p, fit, motivo };
    })
    .sort((a, b) => {
      const rank = (x) => x.fit === 'good' ? 0 : x.fit === 'busy' ? 1 : 2;
      return rank(a) === rank(b) ? b.p.engaj - a.p.engaj : rank(a) - rank(b);
    });
}

/* ─── REPERTÓRIO DO LOUVOR (setlist do evento) ─── */
function LouvorSetlist({ cultoId }) {
  const [, bump] = useState(0);
  const [titulo, setTitulo] = useState('');
  const [tom, setTom] = useState('');
  const [youtube, setYoutube] = useState('');
  const [cifra, setCifra] = useState('');
  const [gerir, setGerir] = useState(false);
  const songs = S.setlist(cultoId);
  const pode = S.podeEditarRepertorio();
  const add = () => {
    if (!titulo.trim()) return;
    S.addLouvor(cultoId, { titulo: titulo.trim(), tom: tom.trim(), youtube: youtube.trim(), cifra: cifra.trim() });
    setTitulo(''); setTom(''); setYoutube(''); setCifra(''); bump((n) => n + 1);
  };
  const rem = (i) => { S.remLouvor(cultoId, i); bump((n) => n + 1); };
  const move = (i, d) => { S.moveLouvor(cultoId, i, d); bump((n) => n + 1); };

  return (
    <div className="setlist">
      <div className="setlist-head">
        <div>
          <span className="setlist-t"><Icon name="louvor" size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />Repertório do louvor · {songs.length}</span>
          <span className="setlist-sub">{pode ? 'Os louvores aparecem automaticamente no cronograma do culto. Arraste a ordem com ↑ ↓.' : 'Apenas o líder de louvor (ou quem ele autorizar) edita o repertório.'}</span>
        </div>
        {S.podeAutorizarRepertorio() && <button className="btn btn-ghost btn-sm" onClick={() => setGerir((g) => !g)}>{gerir ? 'Fechar' : 'Quem pode editar'}</button>}
      </div>

      {gerir && <RepertorioAutorizados onClose={() => bump((n) => n + 1)} />}

      <div className="setlist-list">
        {songs.map((s, i) => (
          <div className="setlist-row" key={i}>
            <span className="setlist-n">{String(i + 1).padStart(2, '0')}</span>
            <span className="setlist-titulo">{s.titulo}</span>
            {s.tom && <span className="setlist-tom">{s.tom}</span>}
            {s.youtube && <a className="setlist-link" href={s.youtube} target="_blank" rel="noreferrer"><Icon name="cultos" size={12} style={{ verticalAlign: '-2px' }} /> vídeo</a>}
            {s.cifra && <a className="setlist-link" href={s.cifra} target="_blank" rel="noreferrer"><Icon name="cursos" size={12} style={{ verticalAlign: '-2px' }} /> cifra</a>}
            {pode && (
              <span className="setlist-ord">
                <button className="setlist-mv" disabled={i === 0} onClick={() => move(i, -1)} title="Subir">↑</button>
                <button className="setlist-mv" disabled={i === songs.length - 1} onClick={() => move(i, 1)} title="Descer">↓</button>
                <button className="setlist-x" onClick={() => rem(i)} title="Remover"><Icon name="recusou" size={13} /></button>
              </span>
            )}
          </div>
        ))}
        {songs.length === 0 && <div className="setlist-empty">Nenhum louvor ainda. {pode ? 'Monte o repertório abaixo.' : ''}</div>}
      </div>

      {pode ? (
        <div className="setlist-add">
          <input className="input" placeholder="Nome do louvor" value={titulo} onChange={(e) => setTitulo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          <input className="input setlist-tom-in" placeholder="Tom" value={tom} onChange={(e) => setTom(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          <input className="input" placeholder="Link do YouTube" value={youtube} onChange={(e) => setYoutube(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          <input className="input" placeholder="Link do CifraClub" value={cifra} onChange={(e) => setCifra(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          <button className="btn btn-sec btn-sm" onClick={add}>+ Louvor</button>
        </div>
      ) : (
        <div className="setlist-locked"><Icon name="config" size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />Você está vendo o repertório em modo leitura.</div>
      )}
    </div>
  );
}

/* mini-gestor: quem (além do líder de louvor) pode editar o repertório */
function RepertorioAutorizados({ onClose }) {
  const [, bump] = useState(0);
  const lista = S.REPERTORIO_AUTORIZADOS || (S.REPERTORIO_AUTORIZADOS = []);
  const elenco = S.PESSOAS.filter((p) => p.times.includes('louvor'));
  const tog = (pid) => {
    const i = lista.indexOf(pid);
    if (i >= 0) lista.splice(i, 1); else lista.push(pid);
    bump((n) => n + 1); onClose && onClose();
  };
  return (
    <div className="rep-auth">
      <div className="rep-auth-t">Autorizados a editar o repertório</div>
      <div className="rep-auth-grid">
        {elenco.map((p) => {
          const on = lista.includes(p.id) || p.lider.includes('louvor');
          const fixed = p.lider.includes('louvor');
          return (
            <button key={p.id} className={`rep-auth-chip ${on ? 'on' : ''}`} disabled={fixed} onClick={() => !fixed && tog(p.id)} title={fixed ? 'Líder de louvor — sempre pode' : ''}>
              <span className="rep-auth-check">{on ? '✓' : ''}</span>{p.nome.split(' ')[0]}{fixed ? ' · líder' : ''}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* modal de delegação da gestão da escala */
function DelegarModal({ timesVis, onClose }) {
  const [, bump] = useState(0);
  const [timeId, setTimeId] = useState(timesVis[0] ? timesVis[0].id : null);
  if (!timeId) return null;
  const elenco = S.PESSOAS.filter((p) => p.times.includes(timeId) && !p.lider.includes(timeId));
  const deleg = S.delegadosDoTime(timeId);
  const tog = (pid) => { deleg.includes(pid) ? S.removerDelegado(timeId, pid) : S.delegar(timeId, pid); bump((n) => n + 1); };
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Delegar gestão da escala</div>
          <div className="modal-title">Quem mais pode montar a escala</div>
          <div className="modal-sub">As pessoas escolhidas passam a ver e gerir a escala deste time, como você.</div>
        </div>
        <div className="modal-body">
          {timesVis.length > 1 && (
            <div className="seg" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
              {timesVis.map((t) => <button key={t.id} className={timeId === t.id ? 'on' : ''} onClick={() => setTimeId(t.id)}>{t.nome.split(' ')[0]}</button>)}
            </div>
          )}
          {elenco.length === 0 && <div className="empty">Ninguém mais neste time ainda.</div>}
          {elenco.map((p) => {
            const on = S.delegadosDoTime(timeId).includes(p.id);
            return (
              <button type="button" className={`flag-row ${on ? 'on' : ''}`} key={p.id} onClick={() => tog(p.id)}>
                <span className={`flag-check ${on ? 'on' : ''}`}>{on ? '✓' : ''}</span>
                <Av nome={p.nome} size="sm" fotoId={p.volId} />
                <div className="flag-main"><div className="flag-nome">{p.nome}</div><div className="flag-meta">{(p.funcoes || []).join(' · ') || 'Voluntário'}</div></div>
              </button>
            );
          })}
        </div>
        <div className="modal-foot"><button className="btn btn-pri" onClick={onClose}>Concluído</button></div>
      </div>
    </div>
  );
}

/* editor de FUNÇÕES de um time na escala — vale p/ todos os eventos */
function FuncoesEscalaModal({ timeId, onChange, onClose }) {
  const [, bump] = useState(0);
  const [nome, setNome] = useState('');
  const [need, setNeed] = useState(1);
  const t = tById(timeId);
  const dados = S.ESCALAS[timeId] || (S.ESCALAS[timeId] = { funcoes: [] });
  const force = () => { cexRefresh(); onChange && onChange(); bump((n) => n + 1); };
  const add = () => { const n = nome.trim(); if (!n) return; if (dados.funcoes.some((f) => f.fn.toLowerCase() === n.toLowerCase())) { cexToast('Já existe essa função.', 'warn'); return; } dados.funcoes.push({ fn: n, need: Math.max(1, need), cells: {} }); setNome(''); setNeed(1); force(); };
  const rem = (i) => { dados.funcoes.splice(i, 1); force(); };
  const setNeedAt = (i, d) => { dados.funcoes[i].need = Math.max(1, (dados.funcoes[i].need || 1) + d); force(); };
  const rename = (i, v) => { dados.funcoes[i].fn = v; force(); };
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Funções · {t ? t.nome : 'time'}</div>
          <div className="modal-title">Quem o time precisa</div>
          <div className="modal-sub">Adicione, renomeie ou remova funções e diga quantas pessoas cada uma precisa. Vale para <b>todos os eventos</b> deste time.</div>
        </div>
        <div className="modal-body" style={{ display: 'block' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {dados.funcoes.map((f, i) => (
              <div className="func-edit-row" key={i}>
                <input className="input" value={f.fn} onChange={(e) => rename(i, e.target.value)} />
                <div className="stepper">
                  <button onClick={() => setNeedAt(i, -1)}>−</button>
                  <span>{f.need}</span>
                  <button onClick={() => setNeedAt(i, 1)}>+</button>
                </div>
                <button className="func-edit-x" title="Remover função" onClick={() => rem(i)}><Icon name="recusou" size={15} /></button>
              </div>
            ))}
            {dados.funcoes.length === 0 && <div className="empty" style={{ padding: '8px 0' }}>Nenhuma função ainda.</div>}
          </div>
          <div className="dsec-title" style={{ marginBottom: 8 }}>Nova função</div>
          <div className="func-edit-add">
            <input className="input" placeholder="ex: Vocal, Câmera, Recepção" value={nome} onChange={(e) => setNome(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
            <div className="stepper"><button onClick={() => setNeed((n) => Math.max(1, n - 1))}>−</button><span>{need}</span><button onClick={() => setNeed((n) => n + 1)}>+</button></div>
            <button className="btn btn-sec btn-sm" onClick={add}>+ Função</button>
          </div>
        </div>
        <div className="modal-foot"><button className="btn btn-pri" onClick={onClose}>Concluído</button></div>
      </div>
    </div>
  );
}

/* salvar a configuração atual de funções como um padrão nomeado */
function PresetSaveModal({ onClose }) {
  const [nome, setNome] = useState('');
  const salvar = () => { const n = nome.trim(); if (!n) return; S.salvarPresetEscala(n); cexToast('Configuração "' + n + '" salva. Reaproveite em qualquer evento.'); onClose(); };
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Configuração padrão</div>
          <div className="modal-title">Salvar como…</div>
          <div className="modal-sub">Guarda as funções e quantidades atuais de todos os times. Crie uma para "Culto", outra para "Reunião", e aplique quando quiser.</div>
        </div>
        <div className="modal-body" style={{ display: 'block' }}>
          <div className="field"><label className="field-label">Nome da configuração</label><input className="input" placeholder="ex: Culto de domingo" value={nome} onChange={(e) => setNome(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && salvar()} /></div>
        </div>
        <div className="modal-foot"><button className="btn btn-sec" onClick={onClose}>Cancelar</button><button className="btn btn-pri" onClick={salvar}>Salvar</button></div>
      </div>
    </div>
  );
}

function Escalas() {
  useRefresh();
  const [eventId, setEventId] = useState(S.CULTOS[0] ? S.CULTOS[0].id : null);
  const [esc, setEsc] = useState(() => JSON.parse(JSON.stringify(S.ESCALAS)));
  const [sel, setSel] = useState(null);     // {timeId, fnIdx, slotIdx}
  const [assign, setAssign] = useState(null); // {timeId, fnIdx}
  const [swap, setSwap] = useState(null);    // {timeId, fnIdx, slotIdx}
  const [flash, setFlash] = useState(null);
  const [delegar, setDelegar] = useState(false);
  const [funcEdit, setFuncEdit] = useState(null); // timeId
  const [presetSave, setPresetSave] = useState(false);
  const [qrCheckin, setQrCheckin] = useState(false);
  const [, bumpCfg] = useState(0);
  const resync = () => setEsc(JSON.parse(JSON.stringify(S.ESCALAS)));

  const cfg = S.ESCALA_CFG;
  const view = window.cexView();
  const culto = cById(eventId);
  const scopeTimes = window.cexScopeTimes();
  const podeDelegar = view.papel === 'master' || view.papel === 'lider';
  /* times que aparecem: os que o evento precisa (ou todos), filtrados pela perspectiva */
  const eventoTimes = (culto && culto.times && culto.times.length ? culto.times : S.TIMES.map((t) => t.id));
  const timesVis = S.TIMES.filter((t) => eventoTimes.includes(t.id) && scopeTimes.includes(t.id));

  const update = (fn) => setEsc((prev) => { const n = JSON.parse(JSON.stringify(prev)); fn(n); return n; });
  const setStatus = (timeId, fnIdx, slotIdx, st) => update((n) => { n[timeId].funcoes[fnIdx].cells[eventId][slotIdx].st = st; });
  const remover = (timeId, fnIdx, slotIdx) => update((n) => { n[timeId].funcoes[fnIdx].cells[eventId].splice(slotIdx, 1); });
  const trocar = (timeId, fnIdx, slotIdx, pid) => update((n) => { n[timeId].funcoes[fnIdx].cells[eventId][slotIdx] = { p: pid, st: 'wait' }; });
  const checkin = (timeId, fnIdx, slotIdx) => update((n) => { const s = n[timeId].funcoes[fnIdx].cells[eventId][slotIdx]; s.chk = !s.chk; });

  /* mapa de quem já está escalado neste evento (em qualquer time) → time/função */
  const assignmentsNoEvento = (state) => {
    const map = {};
    Object.keys(state).forEach((tid) => {
      (state[tid].funcoes || []).forEach((f) => (f.cells[eventId] || []).forEach((s) => {
        if (s.st !== 'no') map[s.p] = { timeId: tid, fn: f.fn };
      }));
    });
    return map;
  };
  /* carga: nº de eventos (do mês/agenda) em que a pessoa aparece */
  const cargaPorPessoa = (state) => {
    const sets = {};
    Object.keys(state).forEach((tid) => (state[tid].funcoes || []).forEach((f) => {
      Object.keys(f.cells || {}).forEach((ev) => (f.cells[ev] || []).forEach((s) => {
        if (s.st !== 'no') (sets[s.p] || (sets[s.p] = new Set())).add(ev);
      }));
    }));
    const out = {};
    Object.keys(sets).forEach((pid) => { out[pid] = sets[pid].size; });
    return out;
  };

  /* escalar com TRAVA: bloqueia se a pessoa já está em outro lugar do evento */
  const escalar = (timeId, fnIdx, pid) => {
    const map = assignmentsNoEvento(esc);
    if (map[pid]) {
      const t = tById(map[pid].timeId);
      cexToast(`${pById(pid).nome.split(' ')[0]} já está escalado em ${t ? t.nome.split(' ')[0] : 'outro time'} · ${map[pid].fn}. Uma pessoa por culto.`, 'warn');
      return false;
    }
    update((n) => { (n[timeId].funcoes[fnIdx].cells[eventId] ||= []).push({ p: pid, st: cfg.modo === 'automatico' ? 'ok' : 'wait' }); });
    return true;
  };

  /* gerar escala (assistida ou automática) p/ os times visíveis, neste evento */
  const gerarAuto = (silent) => {
    let add = 0, faltou = 0;
    update((n) => {
      const map = assignmentsNoEvento(n);
      const carga = cargaPorPessoa(n);
      const usados = Object.keys(map);
      timesVis.forEach((t) => {
        (n[t.id].funcoes || []).forEach((f) => {
          const slots = (f.cells[eventId] ||= []);
          let missing = Math.max(0, f.need - slots.filter((s) => s.st !== 'no').length);
          if (!missing) return;
          const ja = slots.map((s) => s.p);
          const cands = candidatos(t.id, f.fn, culto, ja, usados, cfg, carga);
          for (const c of cands) {
            if (!missing) break;
            if (c.motivo) continue; // bloqueado por trava/férias/teto
            slots.push({ p: c.p.id, st: cfg.modo === 'automatico' ? 'ok' : 'wait', auto: true });
            usados.push(c.p.id); carga[c.p.id] = (carga[c.p.id] || 0) + 1; missing--; add++;
          }
          faltou += missing;
        });
      });
    });
    if (silent) return;
    const modoTxt = cfg.modo === 'automatico' ? 'preenchidas e já confirmadas' : 'preenchidas — pendentes de confirmação';
    let msg = add ? `${add} vaga(s) ${modoTxt}.` : 'Nenhuma vaga em aberto na sua visão.';
    if (faltou > 0) msg += ` ${faltou} vaga(s) sem ninguém apto — avisamos o líder.`;
    setFlash(msg);
    setTimeout(() => setFlash(null), 5200);
  };

  /* modo automático: gera ao trocar de evento, sem ação do líder */
  useEffect(() => {
    if (cfg.modo === 'automatico' && eventId) {
      const t = setTimeout(() => gerarAuto(true), 60);
      return () => clearTimeout(t);
    }
  }, [eventId, cfg.modo]);

  /* recusa: no automático com 'proximo', chama logo o próximo apto */
  const recusar = (timeId, fnIdx, slotIdx) => {
    update((n) => {
      const f = n[timeId].funcoes[fnIdx];
      const quem = f.cells[eventId][slotIdx].p;
      f.cells[eventId][slotIdx].st = 'no';
      if (cfg.modo === 'automatico' && cfg.naRecusa === 'proximo') {
        const map = assignmentsNoEvento(n);
        const carga = cargaPorPessoa(n);
        const ja = f.cells[eventId].map((s) => s.p);
        const cand = candidatos(timeId, f.fn, culto, ja, Object.keys(map), cfg, carga).find((c) => !c.motivo);
        if (cand) { f.cells[eventId].push({ p: cand.p.id, st: 'ok', auto: true }); cexToast(`${pById(quem).nome.split(' ')[0]} recusou — chamamos ${cand.p.nome.split(' ')[0]} automaticamente.`); }
        else cexToast(`${pById(quem).nome.split(' ')[0]} recusou e não há outro apto. Avisamos o líder.`, 'warn');
      } else {
        cexToast(`${pById(quem).nome.split(' ')[0]} marcado como recusou. Avisamos o líder.`, 'warn');
      }
    });
  };

  /* baixar escala do evento em CSV (times visíveis) */
  const baixar = () => {
    const rows = [['Time', 'Funcao', 'Pessoas']];
    timesVis.forEach((t) => esc[t.id].funcoes.forEach((f) => rows.push([t.nome, f.fn, (f.cells[eventId] || []).map((s) => `${pById(s.p).nome} (${s.st})`).join(' / ')])));
    const csv = rows.map((r) => r.map((x) => `"${x}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `escala-${eventId}.csv`; a.click();
  };

  /* contagem confirmados/vagas no evento (times visíveis) */
  let conf = 0, vagas = 0;
  timesVis.forEach((t) => esc[t.id].funcoes.forEach((f) => {
    const slots = f.cells[eventId] || []; const valid = slots.filter((s) => s.st !== 'no').length;
    conf += slots.filter((s) => s.st === 'ok').length; vagas += Math.max(0, f.need - valid);
  }));

  const setModo = (m) => { cfg.modo = m; bumpCfg((n) => n + 1); };

  return (
    <div className="content wide">
      <div className="ph">
        <div>
          <div className="ph-eyebrow">Operação</div>
          <h1 className="ph-title">Escalas <em>por evento</em></h1>
          <p className="ph-sub">Escolha o culto e monte a escala. Cada coluna é um time. {view.papel === 'lider' ? <>Você está vendo {timesVis.length > 1 ? <>os <em>{timesVis.length} times</em> que lidera</> : <>só o <em>{timesVis[0] ? timesVis[0].nome : 'seu time'}</em></>}.</> : 'A Direção vê todos os times.'} Toque numa pessoa para confirmar, trocar ou remover; na vaga para escalar.</p>
        </div>
        <div className="ph-actions">
          {podeDelegar && <button className="btn btn-sec" onClick={() => setDelegar(true)}><Icon name="membros" size={15} /> Delegar</button>}
          <button className="btn btn-sec" onClick={() => setQrCheckin(true)}><Icon name="cultos" size={15} /> QR Check-in</button>
          <button className="btn btn-sec" onClick={baixar}><Icon name="relatorios" size={15} /> Baixar</button>
          {cfg.modo !== 'manual' && <button className="btn btn-sec" onClick={() => gerarAuto(false)}><Icon name="escalas" size={15} /> Gerar {cfg.modo === 'automatico' ? 'agora' : 'automática'}</button>}
          <button className="btn btn-pri" onClick={() => cexToast('Escala publicada! Avisamos a equipe pelo app.')}>Publicar & avisar <Icon name="avancar" size={15} /></button>
        </div>
      </div>

      {/* MODO de geração da escala */}
      <div className="esc-modo">
        <span className="esc-modo-lbl">Geração da escala</span>
        <div className="seg seg-sm">
          {[['manual', 'Manual'], ['assistido', 'Assistida'], ['automatico', 'Automática']].map(([k, l]) => (
            <button key={k} className={cfg.modo === k ? 'on' : ''} onClick={() => setModo(k)}>{l}</button>
          ))}
        </div>
        <span className="esc-modo-hint">
          {cfg.modo === 'manual' && 'Você monta tudo na mão.'}
          {cfg.modo === 'assistido' && 'O sistema sugere os nomes; você confirma cada um.'}
          {cfg.modo === 'automatico' && 'O sistema gera e já confirma. Na recusa, chama o próximo apto.'}
        </span>
        <span className="tb-spacer"></span>
        <span className="esc-preset">
          <Icon name="escalas" size={13} style={{ verticalAlign: '-2px' }} />
          <select className="esc-preset-sel" value="" onChange={(e) => { if (e.target.value) { S.aplicarPresetEscala(e.target.value); resync(); cexToast('Configuração aplicada a todos os times.'); } }}>
            <option value="">Aplicar configuração…</option>
            {(S.ESCALA_PRESETS || []).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
          <button className="esc-preset-save" onClick={() => setPresetSave(true)}>Salvar atual</button>
        </span>
        <a className="esc-modo-cfg" onClick={() => window.cexGo && window.cexGo('config')}><Icon name="config" size={13} style={{ verticalAlign: '-2px' }} /> Regras</a>
      </div>

      {/* seletor de EVENTO */}
      <div className="esc-events">
        {S.CULTOS.map((c) => (
          <button key={c.id} className={`esc-event ${eventId === c.id ? 'on' : ''}`} onClick={() => setEventId(c.id)}>
            <span className="esc-event-day">{c.dia.slice(0, 3)} · {c.data}</span>
            <span className="esc-event-name">{c.nome}</span>
            <span className="esc-event-time">{c.hora} · {c.local}</span>
            {(c.tags || []).length > 0 && (
              <span className="esc-event-tags">
                {c.tags.map((tid) => { const tg = S.tagById && S.tagById(tid); return tg ? <span key={tid} className="esc-event-tag"><span className="esc-event-tag-dot" style={{ background: ({olive:'var(--olive)',wheat:'var(--wheat)',clay:'var(--clay)',terra:'var(--terra)',sand:'var(--sand)',amber:'var(--amber)',rust:'var(--rust)'}[tg.cor] || 'var(--olive)') }}></span>{tg.nome}</span> : null; })}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="toolbar" style={{ marginTop: 4 }}>
        <span className="panel-meta">{culto ? <><b style={{ color: 'var(--light)' }}>{culto.nome}</b> · {culto.dia} {culto.data} · {culto.hora}</> : 'Selecione um evento'}</span>
        <div className="tb-spacer"></div>
        <span className="panel-meta" style={{ marginRight: 14 }}><span style={{ color: 'var(--olive-soft)' }}>{conf}</span> confirmados</span>
        {vagas > 0 && <span className="panel-meta"><span style={{ color: 'var(--amber)' }}>{vagas}</span> vagas</span>}
      </div>

      {flash && <div className="esc-flash"><Icon name="escalas" size={15} style={{ verticalAlign: '-3px', marginRight: 6 }} />{flash}</div>}

      {/* repertório do louvor — quando o time de louvor está visível neste evento */}
      {timesVis.some((t) => t.id === 'louvor') && <LouvorSetlist cultoId={eventId} />}

      {/* COLUNAS = TIMES (estilo quadro) */}
      <div className="esc-cols">
        {timesVis.map((t) => {
          const dados = esc[t.id];
          if (!dados) return null;
          let tConf = 0, tNeed = 0;
          dados.funcoes.forEach((f) => { tNeed += f.need; tConf += (f.cells[eventId] || []).filter((s) => s.st === 'ok').length; });
          const full = tConf >= tNeed;
          return (
            <div className="esc-col" key={t.id}>
              <div className="esc-col-head">
                <span className="esc-col-mark"><TeamMark t={t} size={17} /></span>
                <div className="esc-col-info">
                  <div className="esc-col-tname">{t.nome}</div>
                  <div className="esc-col-tmeta">{tConf}/{tNeed} confirmados</div>
                </div>
                <span className={`esc-col-badge ${full ? 'ok' : ''}`}>{full ? 'completo' : tNeed - tConf + ' falta'}</span>
                {podeDelegar && <button className="esc-col-edit" title="Editar funções deste time" onClick={() => setFuncEdit(t.id)}><Icon name="editar" size={14} /></button>}
              </div>
              <div className="esc-col-body">
                {dados.funcoes.map((f, fnIdx) => {
                  const slots = f.cells[eventId] || [];
                  const valid = slots.filter((s) => s.st !== 'no').length;
                  const missing = Math.max(0, f.need - valid);
                  return (
                    <div className="esc-fnblock" key={f.fn}>
                      <div className="esc-fnblock-head">
                        <span className="esc-fnblock-name">{f.fn}</span>
                        <span className={`esc-fnblock-need ${missing > 0 ? 'gap' : ''}`}>{valid}/{f.need}</span>
                      </div>
                      <div className="esc-fnblock-slots">
                        {slots.map((s, slotIdx) => {
                          const p = pById(s.p);
                          return (
                            <button key={slotIdx} className={`esc-person ${s.st === 'no' ? 'is-no' : ''}`} onClick={() => setSel({ timeId: t.id, fnIdx, slotIdx })}>
                              <Av nome={p.nome} size="xs" self={p.self} fotoId={p.volId} />
                              <span className="esc-person-name">{p.nome.split(' ')[0]}</span>
                              {s.chk && <span title="Check-in feito" style={{ color: 'var(--olive)', fontSize: 11 }}>✓</span>}
                              <span className={`slot-st ${s.st}`}></span>
                            </button>
                          );
                        })}
                        {Array.from({ length: missing }).map((_, i) => (
                          <button key={`e${i}`} className="esc-vaga" onClick={() => setAssign({ timeId: t.id, fnIdx })}>+ escalar</button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {timesVis.length === 0 && <div className="empty" style={{ flex: 1 }}>Nenhum time neste evento na sua perspectiva.</div>}
      </div>

      <div style={{ display: 'flex', gap: 18, marginTop: 18, flexWrap: 'wrap' }}>
        {[['ok', 'Confirmado'], ['wait', 'Pendente'], ['no', 'Recusou'], ['vago', 'Vaga aberta']].map(([k, l]) => (
          <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', letterSpacing: '0.04em' }}>
            {k === 'vago' ? <span style={{ width: 11, height: 11, border: '1px dashed var(--border-3)', borderRadius: 3 }}></span> : <span className={`slot-st ${k}`} style={{ width: 9, height: 9 }}></span>}
            {l}
          </span>
        ))}
      </div>

      {/* AÇÃO NUMA PESSOA */}
      {sel && (() => {
        const f = esc[sel.timeId].funcoes[sel.fnIdx]; const s = f.cells[eventId][sel.slotIdx]; const p = pById(s.p);
        return (
          <div className="modal-bg" onClick={() => setSel(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <div className="modal-eyebrow">{f.fn} · {tById(sel.timeId).nome.split(' ')[0]} · {culto.dia} {culto.data}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                  <Av nome={p.nome} size="lg" self={p.self} fotoId={p.volId} />
                  <div>
                    <div className="modal-title">{p.nome}</div>
                    <div style={{ marginTop: 7 }}><Chip st={s.st} /></div>
                  </div>
                </div>
              </div>
              <div className="modal-body">
                <div style={{ display: 'grid', gap: 8 }}>
                  <button className="btn btn-pri" style={{ justifyContent: 'center' }} onClick={() => { setStatus(sel.timeId, sel.fnIdx, sel.slotIdx, 'ok'); setSel(null); }}>✓ Marcar como confirmado</button>
                  <button className="btn btn-sec" style={{ justifyContent: 'center' }} onClick={() => { setStatus(sel.timeId, sel.fnIdx, sel.slotIdx, 'wait'); setSel(null); }}>Deixar pendente (reenviar convite)</button>
                  <button className="btn btn-sec" style={{ justifyContent: 'center' }} onClick={() => { recusar(sel.timeId, sel.fnIdx, sel.slotIdx); setSel(null); }}>Marcar que recusou{cfg.modo === 'automatico' && cfg.naRecusa === 'proximo' ? ' (chama o próximo)' : ''}</button>
                  <button className="btn btn-sec" style={{ justifyContent: 'center' }} onClick={() => { checkin(sel.timeId, sel.fnIdx, sel.slotIdx); setSel(null); }}>{s.chk ? '✓ Desfazer check-in' : '● Check-in (presente no culto)'}</button>
                  <button className="btn btn-sec" style={{ justifyContent: 'center' }} onClick={() => { setSwap(sel); setSel(null); }}>⇄ Pedir troca / substituir</button>
                  <button className="btn btn-danger" style={{ justifyContent: 'center' }} onClick={() => { remover(sel.timeId, sel.fnIdx, sel.slotIdx); setSel(null); }}>Remover da escala</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ESCALAR VAGA */}
      {assign && (() => {
        const f = esc[assign.timeId].funcoes[assign.fnIdx];
        const ja = (f.cells[eventId] || []).map((s) => s.p);
        const map = assignmentsNoEvento(esc);
        const carga = cargaPorPessoa(esc);
        const cands = candidatos(assign.timeId, f.fn, culto, ja, Object.keys(map), cfg, carga);
        return (
          <div className="modal-bg" onClick={() => setAssign(null)}>
            <div className="modal wide" onClick={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <div className="modal-eyebrow">Escalar · {f.fn} · {tById(assign.timeId).nome.split(' ')[0]}</div>
                <div className="modal-title">{culto.nome}</div>
                <div className="modal-sub">{culto.dia} {culto.data} · {culto.hora}. Verde: disponível. Quem já está em outro time aparece travado.{(culto.tags || []).length > 0 && S.tagNome ? <> Só a frente <b style={{ color: 'var(--olive-soft)' }}>{culto.tags.map((t) => S.tagNome(t)).join(', ')}</b> aparece aqui.</> : ''}</div>
              </div>
              <div className="modal-body">
                {cands.length === 0 && <div className="empty">Ninguém disponível neste time.</div>}
                {cands.map(({ p, fit, motivo }) => (
                  <div className={`cand ${fit === 'block' ? 'is-block' : ''}`} key={p.id} onClick={() => { if (fit === 'block') return; if (escalar(assign.timeId, assign.fnIdx, p.id)) setAssign(null); }}>
                    <Av nome={p.nome} size="md" self={p.self} fotoId={p.volId} lead={p.lider.includes(assign.timeId)} />
                    <div className="cand-main">
                      <div className="cand-name">{p.nome}</div>
                      <div className="cand-meta">{p.funcoes.join(' · ')} · {p.engaj}% engajamento</div>
                    </div>
                    <span className={`cand-fit ${fit}`}>{fit === 'good' ? '● disponível' : fit === 'busy' ? '○ ocupado' : '✕ ' + motivo}</span>
                  </div>
                ))}
              </div>
              <div className="modal-foot"><button className="btn btn-ghost" onClick={() => setAssign(null)}>Cancelar</button></div>
            </div>
          </div>
        );
      })()}

      {/* TROCA */}
      {swap && (() => {
        const f = esc[swap.timeId].funcoes[swap.fnIdx]; const s = f.cells[eventId][swap.slotIdx]; const atual = pById(s.p);
        const ja = (f.cells[eventId] || []).map((x) => x.p);
        const map = assignmentsNoEvento(esc);
        const carga = cargaPorPessoa(esc);
        const cands = candidatos(swap.timeId, f.fn, culto, ja, Object.keys(map).filter((id) => id !== s.p), cfg, carga);
        return (
          <div className="modal-bg" onClick={() => setSwap(null)}>
            <div className="modal wide" onClick={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <div className="modal-eyebrow">⇄ Pedir troca · {f.fn}</div>
                <div className="modal-title">Substituir {atual.nome.split(' ')[0]}</div>
                <div className="modal-sub">{culto.nome} · {culto.dia} {culto.data}. Quem entra recebe convite e fica pendente até confirmar.</div>
              </div>
              <div className="modal-body">
                {cands.map(({ p, fit, motivo }) => (
                  <div className={`cand ${fit === 'block' ? 'is-block' : ''}`} key={p.id} onClick={() => { if (fit === 'block') return; trocar(swap.timeId, swap.fnIdx, swap.slotIdx, p.id); setSwap(null); }}>
                    <Av nome={p.nome} size="md" self={p.self} fotoId={p.volId} lead={p.lider.includes(swap.timeId)} />
                    <div className="cand-main">
                      <div className="cand-name">{p.nome}</div>
                      <div className="cand-meta">{p.funcoes.join(' · ')} · {p.engaj}% engajamento</div>
                    </div>
                    <span className={`cand-fit ${fit}`}>{fit === 'good' ? '● disponível' : fit === 'busy' ? '○ ocupado' : '✕ ' + motivo}</span>
                  </div>
                ))}
              </div>
              <div className="modal-foot"><button className="btn btn-ghost" onClick={() => setSwap(null)}>Cancelar</button></div>
            </div>
          </div>
        );
      })()}

      {delegar && <DelegarModal timesVis={timesVis.length ? timesVis : S.TIMES} onClose={() => setDelegar(false)} />}
      {qrCheckin && eventId && <QRCheckinModal cultoId={eventId} onClose={() => setQrCheckin(false)} />}
      {funcEdit && <FuncoesEscalaModal timeId={funcEdit} onChange={resync} onClose={() => setFuncEdit(null)} />}
      {presetSave && <PresetSaveModal onClose={() => setPresetSave(false)} />}
    </div>
  );
}

Object.assign(window, { Escalas });
