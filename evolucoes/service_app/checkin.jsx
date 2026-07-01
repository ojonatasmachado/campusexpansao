/* ════════════════════════════════════════════════════════════════
   CE.X SERVICE · CHECK-IN POR QR CODE (V1)
   Um QR Code único por evento. O voluntário escaneia com o próprio
   celular e o sistema identifica o evento (pelo QR) e a pessoa (pela
   conta logada). Valida QR ativo, janela e check-in duplicado.
   Escalado → registra presença. Não escalado → bloqueia ou entra
   como presença extra (config da igreja). Relatório ao vivo por evento.
   Estado em memória + persistência local (protótipo).
   ════════════════════════════════════════════════════════════════ */
(function () {
  const S = window.SVC;
  if (!S) return;

  /* ── CONFIG da igreja ── */
  S.CHECKIN_CFG = S.CHECKIN_CFG || { permitirExtra: false };
  try { const c = JSON.parse(localStorage.getItem('cex_checkin_cfg') || 'null'); if (c) S.CHECKIN_CFG = { ...S.CHECKIN_CFG, ...c }; } catch (e) {}
  S.salvarCheckinCfg = () => { try { localStorage.setItem('cex_checkin_cfg', JSON.stringify(S.CHECKIN_CFG)); } catch (e) {} window.cexRefresh && window.cexRefresh(); };

  /* ── ESTADO (persistido) ── */
  try { S.PRESENCA = JSON.parse(localStorage.getItem('cex_presenca') || '{}') || {}; } catch (e) { S.PRESENCA = {}; }
  try { S.QR = JSON.parse(localStorage.getItem('cex_qr') || '{}') || {}; } catch (e) { S.QR = {}; }
  const savePresenca = () => { try { localStorage.setItem('cex_presenca', JSON.stringify(S.PRESENCA)); } catch (e) {} };
  const saveQR = () => { try { localStorage.setItem('cex_qr', JSON.stringify(S.QR)); } catch (e) {} };
  const novoToken = () => Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6);

  /* ── QR por evento ── */
  S.qrDe = (cultoId) => {
    if (!S.QR[cultoId]) { S.QR[cultoId] = { token: novoToken(), ativo: true }; saveQR(); }
    return S.QR[cultoId];
  };
  S.qrLink = (cultoId) => {
    const q = S.qrDe(cultoId);
    const base = location.origin + location.pathname;
    return `${base}?checkin=${encodeURIComponent(cultoId)}&t=${encodeURIComponent(q.token)}`;
  };
  S.qrRegenerar = (cultoId) => { S.QR[cultoId] = { token: novoToken(), ativo: true }; saveQR(); window.cexRefresh && window.cexRefresh(); };
  S.qrAtivar = (cultoId, val) => { const q = S.qrDe(cultoId); q.ativo = !!val; saveQR(); window.cexRefresh && window.cexRefresh(); };

  /* ── ESCALA: quem está escalado e em qual função ── */
  S.escaladosDe = (cultoId) => {
    const set = new Set(); const E = S.ESCALAS || {};
    Object.keys(E).forEach((tid) => (E[tid].funcoes || []).forEach((f) => (f.cells[cultoId] || []).forEach((s) => { if (s.st !== 'no') set.add(s.p); })));
    return [...set];
  };
  S.funcaoNoEvento = (cultoId, pid) => {
    const E = S.ESCALAS || {};
    for (const tid of Object.keys(E)) {
      for (const f of (E[tid].funcoes || [])) {
        if ((f.cells[cultoId] || []).some((s) => s.p === pid && s.st !== 'no')) {
          const t = (S.TIMES || []).find((x) => x.id === tid);
          return (t ? t.nome.split(' ')[0] : tid) + ' · ' + f.fn;
        }
      }
    }
    return null;
  };
  const marcarEscalaChk = (cultoId, pid, val) => {
    const E = S.ESCALAS || {};
    Object.keys(E).forEach((tid) => (E[tid].funcoes || []).forEach((f) => (f.cells[cultoId] || []).forEach((s) => { if (s.p === pid) s.chk = val; })));
  };

  /* ── PRESENÇA ── */
  S.presencaDe = (cultoId) => S.PRESENCA[cultoId] || [];
  S.jaPresente = (cultoId, pid) => S.presencaDe(cultoId).some((r) => r.pid === pid);
  S.registrarPresenca = (cultoId, pid, via, token) => {
    const q = S.qrDe(cultoId);
    if (via === 'qr') {
      if (!q.ativo) return { ok: false, motivo: 'Este QR Code está desativado. Procure a liderança.' };
      if (token && token !== q.token) return { ok: false, motivo: 'QR Code inválido ou expirado. Peça o atual à liderança.' };
    }
    if (S.jaPresente(cultoId, pid)) return { ok: false, dup: true, motivo: 'Você já fez check-in neste evento.' };
    const escalado = S.escaladosDe(cultoId).includes(pid);
    if (!escalado && !S.CHECKIN_CFG.permitirExtra) return { ok: false, bloq: true, motivo: 'Você não está escalado neste evento. Fale com a liderança.' };
    (S.PRESENCA[cultoId] || (S.PRESENCA[cultoId] = [])).push({ pid, quando: Date.now(), via: via || 'qr', extra: !escalado });
    marcarEscalaChk(cultoId, pid, true);
    savePresenca();
    window.cexRefresh && window.cexRefresh();
    return { ok: true, extra: !escalado, via: via || 'qr' };
  };
  S.removerPresenca = (cultoId, pid) => {
    S.PRESENCA[cultoId] = S.presencaDe(cultoId).filter((r) => r.pid !== pid);
    marcarEscalaChk(cultoId, pid, false);
    savePresenca();
    window.cexRefresh && window.cexRefresh();
  };
  S.resumoPresenca = (cultoId) => {
    const escalados = S.escaladosDe(cultoId);
    const presenca = S.presencaDe(cultoId);
    const presentesIds = presenca.map((r) => r.pid);
    const presentesEscala = escalados.filter((id) => presentesIds.includes(id)).length;
    const extras = presenca.filter((r) => r.extra).length;
    return { escalados: escalados.length, presentes: presenca.length, presentesEscala, faltam: Math.max(0, escalados.length - presentesEscala), extras };
  };

  /* ── PRESENÇA DE AULA (professor faz check-in por QR) ──────────────
     Cada aula de um curso presencial tem um QR único. O aluno matriculado
     escaneia e confirma presença; o professor acompanha ao vivo. Chave
     independente da escala de culto: aula:<cursoId>:<aulaId>. */
  try { S.PRESENCA_AULA = JSON.parse(localStorage.getItem('cex_presenca_aula') || '{}') || {}; } catch (e) { S.PRESENCA_AULA = {}; }
  const savePresencaAula = () => { try { localStorage.setItem('cex_presenca_aula', JSON.stringify(S.PRESENCA_AULA)); } catch (e) {} };
  S.aulaKey = (cursoId, aulaId) => 'aula:' + cursoId + ':' + aulaId;
  S.matriculadosDe = (cursoId) => ((S.MATRICULAS && S.MATRICULAS[cursoId]) || []).map((mt) => mt.mid);
  S.presencaAula = (key) => S.PRESENCA_AULA[key] || [];
  S.jaPresenteAula = (key, mid) => S.presencaAula(key).some((r) => r.mid === mid);
  S.registrarPresencaAula = (key, mid, via, token) => {
    const q = S.qrDe(key);
    if (via === 'qr') {
      if (!q.ativo) return { ok: false, motivo: 'Este QR Code está desativado. Procure o professor.' };
      if (token && token !== q.token) return { ok: false, motivo: 'QR Code inválido ou expirado. Peça o atual ao professor.' };
    }
    if (S.jaPresenteAula(key, mid)) return { ok: false, dup: true, motivo: 'Você já confirmou presença nesta aula.' };
    const cursoId = key.split(':')[1];
    const matriculado = S.matriculadosDe(cursoId).includes(mid);
    if (!matriculado) return { ok: false, bloq: true, motivo: 'Você não está matriculado neste curso. Fale com o professor.' };
    (S.PRESENCA_AULA[key] || (S.PRESENCA_AULA[key] = [])).push({ mid, quando: Date.now(), via: via || 'qr' });
    savePresencaAula();
    window.cexRefresh && window.cexRefresh();
    return { ok: true, via: via || 'qr' };
  };
  S.removerPresencaAula = (key, mid) => {
    S.PRESENCA_AULA[key] = S.presencaAula(key).filter((r) => r.mid !== mid);
    savePresencaAula();
    window.cexRefresh && window.cexRefresh();
  };

  /* membro logado (para o check-in de aula, que roda por matrícula) */
  window.cexMeuMembro = function () {
    try { const uid = localStorage.getItem('cex_user'); if (uid) { const m = (S.MEMBROS || []).find((x) => x.id === uid); if (m) return m; } } catch (e) {}
    return null;
  };

  /* ── quem sou eu (conta logada → voluntário) ── */
  window.cexMinhaPessoa = function () {
    try {
      const uid = localStorage.getItem('cex_user');
      if (uid) { const m = (S.MEMBROS || []).find((x) => x.id === uid); if (m && m.volId) return (S.PESSOAS || []).find((p) => p.id === m.volId) || null; }
    } catch (e) {}
    return (S.PESSOAS || []).find((p) => p.self) || null;
  };
})();

/* hora curta a partir de um timestamp */
function horaCurta(ts) { try { return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }

/* gera o data URL (PNG) do QR a partir de um texto */
function qrPngDataURL(text, cell, margin) {
  try {
    const qr = qrcode(0, 'M'); qr.addData(text); qr.make();
    const gif = qr.createDataURL(cell || 7, margin || 4);
    return gif; // GIF data URL — serve para <img>, download e impressão
  } catch (e) { return null; }
}

/* ─────────────────────────────────────────────────────────────────
   MODAL ADMIN · QR Code + presença ao vivo (líder/Direção)
   ───────────────────────────────────────────────────────────────── */
function QRCheckinModal({ cultoId, onClose }) {
  const [, bump] = React.useState(0);
  const [aba, setAba] = React.useState('qr'); // qr | presenca
  const [addPessoa, setAddPessoa] = React.useState(false);
  const culto = cById(cultoId);
  if (!culto) return null;
  const q = S.qrDe(cultoId);
  const link = S.qrLink(cultoId);
  const png = q.ativo ? qrPngDataURL(link, 7, 4) : null;
  const resumo = S.resumoPresenca(cultoId);
  const refresh = () => bump((n) => n + 1);

  const copiar = () => { try { navigator.clipboard.writeText(link); cexToast('Link copiado.'); } catch (e) { cexToast('Não foi possível copiar.', 'warn'); } };
  const salvar = () => {
    if (!png) { cexToast('Ative o QR Code primeiro.', 'warn'); return; }
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement('canvas'); const pad = 48; cv.width = img.width + pad * 2; cv.height = img.height + pad * 2 + 70;
      const ctx = cv.getContext('2d'); ctx.fillStyle = '#FAFAF7'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.drawImage(img, pad, pad);
      ctx.fillStyle = '#0E110D'; ctx.textAlign = 'center'; ctx.font = '700 26px Inter, sans-serif';
      ctx.fillText(culto.nome, cv.width / 2, img.height + pad + 38);
      ctx.fillStyle = '#555650'; ctx.font = '500 16px Inter, sans-serif';
      ctx.fillText(culto.dia + ' ' + culto.data + ' · ' + culto.hora, cv.width / 2, img.height + pad + 62);
      const a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = 'checkin-' + cultoId + '.png'; a.click();
      cexToast('QR Code salvo.');
    };
    img.src = png;
  };
  const imprimir = () => {
    if (!png) { cexToast('Ative o QR Code primeiro.', 'warn'); return; }
    const w = window.open('', '_blank', 'width=520,height=720');
    if (!w) { cexToast('Permita pop-ups para imprimir.', 'warn'); return; }
    w.document.write(`<!doctype html><html><head><title>Check-in · ${culto.nome}</title>
      <style>*{margin:0;font-family:Inter,Arial,sans-serif}body{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;text-align:center;padding:32px}
      .ey{font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#7A9E3F;margin-bottom:18px}
      img{width:340px;height:340px;image-rendering:pixelated}h1{font-size:30px;margin:22px 0 6px}p{color:#555;font-size:17px}.cex{margin-top:30px;font-weight:700;font-size:18px}.cex span{color:#7A9E3F}.in{margin-top:8px;font-size:13px;color:#888}</style>
      </head><body><div class="ey">◆ Check-in de voluntários</div><img src="${png}"/><h1>${culto.nome}</h1><p>${culto.dia} ${culto.data} · ${culto.hora} · ${culto.local || ''}</p>
      <p class="in">Escaneie com a câmera do celular e confirme sua presença no app.</p><div class="cex">CE<span>.X</span> Service</div>
      <script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>`);
    w.document.close();
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow"><Icon name="cultos" size={13} style={{ verticalAlign: '-2px', marginRight: 5 }} /> Check-in · {culto.dia} {culto.data} · {culto.hora}</div>
          <div className="modal-title">{culto.nome}</div>
          <div className="modal-sub">Um QR Code único deste evento. Os voluntários escaneiam e confirmam presença pela própria conta. Você acompanha em tempo real.</div>
          <div className="ck-tabs">
            <button className={`ck-tab ${aba === 'qr' ? 'on' : ''}`} onClick={() => setAba('qr')}>QR Code</button>
            <button className={`ck-tab ${aba === 'presenca' ? 'on' : ''}`} onClick={() => setAba('presenca')}>Presença ao vivo · {resumo.presentes}</button>
          </div>
        </div>

        <div className="modal-body" style={{ display: 'block' }}>
          {aba === 'qr' && (
            <div className="ck-qr-wrap">
              <div className={`ck-qr ${!q.ativo ? 'off' : ''}`}>
                {png ? <img src={png} alt="QR Code de check-in" /> : <div className="ck-qr-off"><Icon name="recusou" size={26} /><span>QR desativado</span></div>}
              </div>
              <div className="ck-qr-side">
                <div className={`ck-status ${q.ativo ? 'on' : 'off'}`}><span className="ck-dot"></span>{q.ativo ? 'Ativo — aceitando check-ins' : 'Desativado'}</div>
                <div className="ck-link"><span className="ck-link-txt">{link}</span></div>
                <div className="ck-actions">
                  <button className="btn btn-sec btn-sm" onClick={salvar}><Icon name="relatorios" size={14} /> Salvar</button>
                  <button className="btn btn-sec btn-sm" onClick={imprimir}><Icon name="cursos" size={14} /> Imprimir</button>
                  <button className="btn btn-sec btn-sm" onClick={copiar}><Icon name="add" size={14} /> Copiar link</button>
                  <button className="btn btn-sec btn-sm" onClick={() => { S.qrAtivar(cultoId, !q.ativo); refresh(); }}>{q.ativo ? 'Desativar' : 'Ativar'}</button>
                  <button className="btn btn-sec btn-sm" onClick={() => { if (confirm('Gerar um novo QR Code? O anterior deixa de funcionar.')) { S.qrRegenerar(cultoId); refresh(); cexToast('Novo QR Code gerado.'); } }}><Icon name="escalas" size={14} /> Regenerar</button>
                </div>
                <div className="ck-hint">Imprima e cole na entrada dos voluntários, backstage, sala de apoio ou secretaria. Quem escanear confirma presença pela conta logada.</div>
                <button className="btn btn-pri" style={{ marginTop: 4, justifyContent: 'center' }} onClick={() => { window.cexAbrirCheckin && window.cexAbrirCheckin(cultoId, q.token); }}>Simular leitura (abrir como voluntário) →</button>
              </div>
            </div>
          )}

          {aba === 'presenca' && (
            <div className="ck-presenca">
              <div className="ck-counters">
                <div className="ck-counter"><b>{resumo.presentes}</b><span>presentes</span></div>
                <div className="ck-counter"><b style={{ color: 'var(--amber)' }}>{resumo.faltam}</b><span>não chegaram</span></div>
                <div className="ck-counter"><b>{resumo.escalados}</b><span>escalados</span></div>
                {resumo.extras > 0 && <div className="ck-counter"><b style={{ color: 'var(--olive-soft)' }}>{resumo.extras}</b><span>extras</span></div>}
              </div>
              <CheckinRoster cultoId={cultoId} onChange={refresh} />
              <button className="btn btn-sec btn-sm" style={{ marginTop: 6 }} onClick={() => setAddPessoa(true)}><Icon name="add" size={14} /> Registrar presença manualmente</button>
              {addPessoa && <CheckinManualModal cultoId={cultoId} onClose={() => { setAddPessoa(false); refresh(); }} />}
            </div>
          )}
        </div>

        <div className="modal-foot"><button className="btn btn-pri" onClick={onClose}>Concluído</button></div>
      </div>
    </div>
  );
}

/* lista de presença: presentes (com horário/via) + quem falta */
function CheckinRoster({ cultoId, onChange }) {
  const escalados = S.escaladosDe(cultoId);
  const presenca = S.presencaDe(cultoId).slice().sort((a, b) => a.quando - b.quando);
  const presentesIds = presenca.map((r) => r.pid);
  const faltam = escalados.filter((id) => !presentesIds.includes(id));
  return (
    <div className="ck-roster">
      {presenca.length === 0 && faltam.length === 0 && <div className="empty">Ninguém escalado neste evento ainda.</div>}
      {presenca.map((r) => {
        const p = pById(r.pid); if (!p) return null;
        const fn = S.funcaoNoEvento(cultoId, r.pid);
        return (
          <div className="ck-row" key={r.pid}>
            <span className="ck-check"><Icon name="ok" size={16} /></span>
            <Av nome={p.nome} size="sm" self={p.self} fotoId={p.volId} />
            <div className="ck-row-main">
              <div className="ck-row-name">{p.nome}{r.extra && <span className="ck-extra">extra</span>}</div>
              <div className="ck-row-meta">{fn || 'Presença extra'} · {r.via === 'manual' ? 'registro manual' : 'QR'} · {horaCurta(r.quando)}</div>
            </div>
            <button className="ck-undo" title="Desfazer presença" onClick={() => { S.removerPresenca(cultoId, r.pid); onChange && onChange(); }}><Icon name="recusou" size={15} /></button>
          </div>
        );
      })}
      {faltam.map((pid) => {
        const p = pById(pid); if (!p) return null;
        const fn = S.funcaoNoEvento(cultoId, pid);
        return (
          <div className="ck-row pend" key={pid}>
            <span className="ck-check pend">○</span>
            <Av nome={p.nome} size="sm" self={p.self} fotoId={p.volId} />
            <div className="ck-row-main">
              <div className="ck-row-name">{p.nome}</div>
              <div className="ck-row-meta">{fn || 'Escalado'} · não chegou</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => { const r = S.registrarPresenca(cultoId, pid, 'manual'); if (r.ok) { cexToast(p.nome.split(' ')[0] + ' marcado como presente.'); onChange && onChange(); } else cexToast(r.motivo, 'warn'); }}>Marcar presente</button>
          </div>
        );
      })}
    </div>
  );
}

/* registrar presença manualmente: busca qualquer voluntário */
function CheckinManualModal({ cultoId, onClose }) {
  const [q, setQ] = React.useState('');
  const lista = (S.PESSOAS || []).filter((p) => !S.jaPresente(cultoId, p.id) && (!q || p.nome.toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="modal-bg" onClick={onClose} style={{ zIndex: 80 }}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Registro manual</div>
          <div className="modal-title">Quem está presente</div>
          <div className="modal-sub">Para quem chegou sem escanear. Entra na presença com a marca de registro manual.</div>
        </div>
        <div className="modal-body">
          <div className="tb-search" style={{ marginBottom: 12 }}><span className="si"><Icon name="buscar" size={13} /></span><input placeholder="Buscar voluntário…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          {lista.map((p) => {
            const escalado = S.escaladosDe(cultoId).includes(p.id);
            return (
              <div className="flag-row" key={p.id} style={{ cursor: 'pointer' }} onClick={() => { const r = S.registrarPresenca(cultoId, p.id, 'manual'); if (r.ok) { cexToast(p.nome.split(' ')[0] + ' presente.'); onClose(); } else cexToast(r.motivo, 'warn'); }}>
                <Av nome={p.nome} size="sm" self={p.self} fotoId={p.volId} />
                <div className="flag-main"><div className="flag-nome">{p.nome}</div><div className="flag-meta">{escalado ? (S.funcaoNoEvento(cultoId, p.id) || 'Escalado') : 'Não escalado · entra como extra'}</div></div>
                <Icon name="avancar" size={15} style={{ marginLeft: 'auto', color: 'var(--subtle)' }} />
              </div>
            );
          })}
          {lista.length === 0 && <div className="empty">Todos os voluntários encontrados já estão presentes.</div>}
        </div>
        <div className="modal-foot"><button className="btn btn-sec" onClick={onClose}>Fechar</button></div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   MODAL PROFESSOR · QR Code + presença de aula ao vivo
   ───────────────────────────────────────────────────────────────── */
function AulaCheckinModal({ cursoId, moduloIdx, aulaId, onClose }) {
  const [, bump] = React.useState(0);
  const [aba, setAba] = React.useState('qr');
  const curso = (S.CURSOS || []).find((c) => c.id === cursoId);
  if (!curso) return null;
  const modulo = curso.modulos[moduloIdx] || {};
  const aula = (modulo.aulas || []).find((a) => a.id === aulaId) || {};
  const key = S.aulaKey(cursoId, aulaId);
  const q = S.qrDe(key);
  const link = S.qrLink(key);
  const png = q.ativo ? qrPngDataURL(link, 7, 4) : null;
  const matric = S.matriculadosDe(cursoId);
  const presenca = S.presencaAula(key).slice().sort((a, b) => a.quando - b.quando);
  const presentesIds = presenca.map((r) => r.mid);
  const faltam = matric.filter((mid) => !presentesIds.includes(mid));
  const refresh = () => bump((n) => n + 1);
  const subt = (modulo.nome ? modulo.nome + ' · ' : '') + (aula.nome || 'Aula');

  const copiar = () => { try { navigator.clipboard.writeText(link); cexToast('Link copiado.'); } catch (e) { cexToast('Não foi possível copiar.', 'warn'); } };
  const imprimir = () => {
    if (!png) { cexToast('Ative o QR Code primeiro.', 'warn'); return; }
    const w = window.open('', '_blank', 'width=520,height=720');
    if (!w) { cexToast('Permita pop-ups para imprimir.', 'warn'); return; }
    w.document.write(`<!doctype html><html><head><title>Presença · ${curso.nome}</title>
      <style>*{margin:0;font-family:Inter,Arial,sans-serif}body{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;text-align:center;padding:32px}
      .ey{font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#7A9E3F;margin-bottom:18px}
      img{width:340px;height:340px;image-rendering:pixelated}h1{font-size:28px;margin:22px 0 6px}p{color:#555;font-size:16px}.cex{margin-top:30px;font-weight:700;font-size:18px}.cex span{color:#7A9E3F}.in{margin-top:8px;font-size:13px;color:#888}</style>
      </head><body><div class="ey">◆ Presença de aula</div><img src="${png}"/><h1>${curso.nome}</h1><p>${subt}</p>
      <p class="in">Aluno matriculado: escaneie e confirme presença no app.</p><div class="cex">CE<span>.X</span> Service</div>
      <script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>`);
    w.document.close();
  };

  return (
    <div className="modal-bg" onClick={onClose} style={{ zIndex: 90 }}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow"><Icon name="cursos" size={13} style={{ verticalAlign: '-2px', marginRight: 5 }} /> Presença de aula · {curso.nome}</div>
          <div className="modal-title">{subt}</div>
          <div className="modal-sub">Um QR Code único desta aula. O professor mostra na tela ou impresso; cada aluno matriculado escaneia e confirma presença pela própria conta.</div>
          <div className="ck-tabs">
            <button className={`ck-tab ${aba === 'qr' ? 'on' : ''}`} onClick={() => setAba('qr')}>QR Code</button>
            <button className={`ck-tab ${aba === 'presenca' ? 'on' : ''}`} onClick={() => setAba('presenca')}>Presença ao vivo · {presenca.length}</button>
          </div>
        </div>
        <div className="modal-body" style={{ display: 'block' }}>
          {aba === 'qr' && (
            <div className="ck-qr-wrap">
              <div className={`ck-qr ${!q.ativo ? 'off' : ''}`}>
                {png ? <img src={png} alt="QR Code de presença" /> : <div className="ck-qr-off"><Icon name="recusou" size={26} /><span>QR desativado</span></div>}
              </div>
              <div className="ck-qr-side">
                <div className={`ck-status ${q.ativo ? 'on' : 'off'}`}><span className="ck-dot"></span>{q.ativo ? 'Ativo — aceitando presença' : 'Desativado'}</div>
                <div className="ck-link"><span className="ck-link-txt">{link}</span></div>
                <div className="ck-actions">
                  <button className="btn btn-sec btn-sm" onClick={imprimir}><Icon name="cursos" size={14} /> Imprimir</button>
                  <button className="btn btn-sec btn-sm" onClick={copiar}><Icon name="add" size={14} /> Copiar link</button>
                  <button className="btn btn-sec btn-sm" onClick={() => { S.qrAtivar(key, !q.ativo); refresh(); }}>{q.ativo ? 'Desativar' : 'Ativar'}</button>
                  <button className="btn btn-sec btn-sm" onClick={() => { if (confirm('Gerar um novo QR Code? O anterior deixa de funcionar.')) { S.qrRegenerar(key); refresh(); cexToast('Novo QR Code gerado.'); } }}><Icon name="escalas" size={14} /> Regenerar</button>
                </div>
                <div className="ck-hint">O professor projeta ou imprime este QR no início da aula. {matric.length} aluno(s) matriculado(s) neste curso.</div>
                <button className="btn btn-pri" style={{ marginTop: 4, justifyContent: 'center' }} onClick={() => { window.cexAbrirCheckin && window.cexAbrirCheckin(key, q.token); }}>Simular leitura (abrir como aluno) →</button>
              </div>
            </div>
          )}
          {aba === 'presenca' && (
            <div className="ck-presenca">
              <div className="ck-counters">
                <div className="ck-counter"><b>{presenca.length}</b><span>presentes</span></div>
                <div className="ck-counter"><b style={{ color: 'var(--amber)' }}>{faltam.length}</b><span>faltam</span></div>
                <div className="ck-counter"><b>{matric.length}</b><span>matriculados</span></div>
              </div>
              <div className="ck-roster">
                {matric.length === 0 && <div className="empty">Ninguém matriculado neste curso ainda.</div>}
                {presenca.map((r) => {
                  const m = mById(r.mid); if (!m) return null;
                  return (
                    <div className="ck-row" key={r.mid}>
                      <span className="ck-check"><Icon name="ok" size={16} /></span>
                      <Av nome={m.nome} size="sm" fotoId={m.volId} />
                      <div className="ck-row-main"><div className="ck-row-name">{m.nome}</div><div className="ck-row-meta">{r.via === 'manual' ? 'registro manual' : 'QR'} · {horaCurta(r.quando)}</div></div>
                      <button className="ck-undo" title="Desfazer presença" onClick={() => { S.removerPresencaAula(key, r.mid); refresh(); }}><Icon name="recusou" size={15} /></button>
                    </div>
                  );
                })}
                {faltam.map((mid) => {
                  const m = mById(mid); if (!m) return null;
                  return (
                    <div className="ck-row pend" key={mid}>
                      <span className="ck-check pend">○</span>
                      <Av nome={m.nome} size="sm" fotoId={m.volId} />
                      <div className="ck-row-main"><div className="ck-row-name">{m.nome}</div><div className="ck-row-meta">matriculado · não chegou</div></div>
                      <button className="btn btn-ghost btn-sm" onClick={() => { const res = S.registrarPresencaAula(key, mid, 'manual'); if (res.ok) { cexToast(m.nome.split(' ')[0] + ' presente.'); refresh(); } else cexToast(res.motivo, 'warn'); }}>Marcar presente</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div className="modal-foot"><button className="btn btn-pri" onClick={onClose}>Concluído</button></div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   TELA DO ALUNO · resultado do check-in de aula ao escanear
   ───────────────────────────────────────────────────────────────── */
function AulaCheckinLanding({ aulaKey, token, onDone }) {
  const [, cursoId, aulaId] = aulaKey.split(':');
  const curso = (S.CURSOS || []).find((c) => c.id === cursoId);
  let aula = null, modulo = null;
  if (curso) curso.modulos.forEach((mo) => (mo.aulas || []).forEach((a) => { if (a.id === aulaId) { aula = a; modulo = mo; } }));
  /* membro logado; no protótipo, cai no 1º matriculado para demonstrar */
  let membro = window.cexMeuMembro && window.cexMeuMembro();
  if (!membro && curso) { const ids = S.matriculadosDe(cursoId); membro = ids.length ? mById(ids[0]) : null; }
  const [res, setRes] = React.useState(null);
  React.useEffect(() => { if (curso && membro) setRes(S.registrarPresencaAula(aulaKey, membro.id, 'qr', token)); }, []);

  let icone = 'ok', cor = 'var(--olive)', titulo = '', txt = '';
  if (!curso || !aula) { icone = 'alerta'; cor = 'var(--danger)'; titulo = 'Aula não encontrada'; txt = 'Este QR Code não aponta para uma aula válida.'; }
  else if (!membro) { icone = 'pessoa'; cor = 'var(--amber)'; titulo = 'Entre na sua conta'; txt = 'Faça login para confirmar presença na aula.'; }
  else if (res) {
    if (res.ok) { icone = 'ok'; cor = 'var(--olive)'; titulo = 'Presença confirmada!'; txt = 'Tudo certo, ' + membro.nome.split(' ')[0] + '. Bons estudos!'; }
    else if (res.dup) { icone = 'ok'; cor = 'var(--olive-soft)'; titulo = 'Você já está presente'; txt = 'Sua presença nesta aula já foi registrada.'; }
    else { icone = 'alerta'; cor = res.bloq ? 'var(--amber)' : 'var(--danger)'; titulo = res.bloq ? 'Presença não liberada' : 'Não foi possível'; txt = res.motivo; }
  }
  return (
    <div className="ck-land">
      <div className="ck-land-card">
        <div className="ck-land-logo"><IgrejaLogo /></div>
        {curso && <div className="ck-land-event"><div className="ck-land-ey">◆ Presença de aula</div><div className="ck-land-name">{curso.nome}</div><div className="ck-land-when">{(modulo ? modulo.nome + ' · ' : '') + (aula ? aula.nome : '')}</div></div>}
        <div className="ck-land-result">
          <div className="ck-land-ic" style={{ color: cor, borderColor: cor }}><Icon name={icone} size={34} /></div>
          {membro && <div className="ck-land-pessoa"><Av nome={membro.nome} size="md" fotoId={membro.volId} /><span>{membro.nome}</span></div>}
          <div className="ck-land-title">{titulo}</div>
          <div className="ck-land-txt">{txt}</div>
        </div>
        <button className="btn btn-pri" style={{ width: '100%', justifyContent: 'center' }} onClick={onDone}>{res && res.ok ? 'Concluir' : 'Voltar ao app'}</button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   TELA DO VOLUNTÁRIO · resultado do check-in ao escanear
   ───────────────────────────────────────────────────────────────── */
function CheckinLanding({ cultoId, token, onDone }) {
  if (typeof cultoId === 'string' && cultoId.indexOf('aula:') === 0) return <AulaCheckinLanding aulaKey={cultoId} token={token} onDone={onDone} />;
  const culto = cById(cultoId);
  const pessoa = window.cexMinhaPessoa();
  const [res, setRes] = React.useState(null);

  React.useEffect(() => {
    if (!culto || !pessoa) return;
    setRes(S.registrarPresenca(cultoId, pessoa.id, 'qr', token));
  }, []);

  let icone = 'ok', cor = 'var(--olive)', titulo = '', txt = '';
  if (!culto) { icone = 'alerta'; cor = 'var(--danger)'; titulo = 'Evento não encontrado'; txt = 'Este QR Code não aponta para um evento válido.'; }
  else if (!pessoa) { icone = 'pessoa'; cor = 'var(--amber)'; titulo = 'Entre na sua conta'; txt = 'Faça login com seu e-mail para confirmar a presença.'; }
  else if (res) {
    if (res.ok) { icone = 'ok'; cor = 'var(--olive)'; titulo = res.extra ? 'Presença registrada (extra)' : 'Presença confirmada!'; txt = res.extra ? 'Você não estava escalado, mas a igreja permite presença extra. Bom serviço!' : 'Tudo certo. Bom serviço, ' + pessoa.nome.split(' ')[0] + '!'; }
    else if (res.dup) { icone = 'ok'; cor = 'var(--olive-soft)'; titulo = 'Você já está presente'; txt = 'Seu check-in neste evento já foi registrado.'; }
    else { icone = 'alerta'; cor = res.bloq ? 'var(--amber)' : 'var(--danger)'; titulo = res.bloq ? 'Check-in não liberado' : 'Não foi possível'; txt = res.motivo; }
  }

  return (
    <div className="ck-land">
      <div className="ck-land-card">
        <div className="ck-land-logo"><IgrejaLogo /></div>
        {culto && <div className="ck-land-event"><div className="ck-land-ey">◆ Check-in de voluntário</div><div className="ck-land-name">{culto.nome}</div><div className="ck-land-when">{culto.dia} {culto.data} · {culto.hora} · {culto.local || ''}</div></div>}
        <div className="ck-land-result">
          <div className="ck-land-ic" style={{ color: cor, borderColor: cor }}><Icon name={icone} size={34} /></div>
          {pessoa && <div className="ck-land-pessoa"><Av nome={pessoa.nome} size="md" self={pessoa.self} fotoId={pessoa.volId} /><span>{pessoa.nome}</span></div>}
          <div className="ck-land-title">{titulo}</div>
          <div className="ck-land-txt">{txt}</div>
        </div>
        <button className="btn btn-pri" style={{ width: '100%', justifyContent: 'center' }} onClick={onDone}>{res && res.ok ? 'Concluir' : 'Voltar ao app'}</button>
      </div>
    </div>
  );
}

Object.assign(window, { QRCheckinModal, CheckinRoster, CheckinManualModal, CheckinLanding, AulaCheckinModal, AulaCheckinLanding });
