/* ════════════════════════════════════════════════════════════════
   CE.X SERVICE · ARTE DO EVENTO (story vertical 1080×1920)
   Layout em coluna (sem sobreposição), com respiro entre blocos:
   marca, data/nome/hora/local, programação (cronograma) e rodapé.
   Baixa imagem (PNG) ou copia o texto pronto para WhatsApp.
   ════════════════════════════════════════════════════════════════ */

function EventoShare({ culto, blocos, onClose }) {
  const logo = (typeof cexImg === 'function') ? cexImg('igreja-logo') : null;
  const igreja = (S.IGREJA && S.IGREJA.nome) || 'CE.X Service';
  const accent = getComputedStyle(document.body).getPropertyValue('--olive').trim() || '#7A9E3F';
  const accentDeep = getComputedStyle(document.body).getPropertyValue('--olive-deep').trim() || '#4F6B26';

  const recorL = culto.recorrencia && culto.recorrencia !== 'unico'
    ? ({ semanal: 'Toda semana', quinzenal: 'A cada 15 dias', mensal: 'Todo mês' })[culto.recorrencia] : null;

  /* programação a partir do cronograma; senão, quem conduz (líderes) */
  const passos = (culto.cronograma || []).filter((s) => s.item);
  const responsaveis = [];
  (blocos || []).forEach(({ t }) => {
    const lider = S.PESSOAS.find((p) => (p.lider || []).includes(t.id));
    responsaveis.push({ tid: t.id, time: t.nome, quem: lider ? lider.nome : 'Equipe' });
  });

  const baixar = () => {
    const node = document.getElementById('evt-art');
    if (!node || !window.htmlToImage) { cexToast('Exportação indisponível agora.', 'warn'); return; }
    window.htmlToImage.toPng(node, { pixelRatio: 3, cacheBust: true }).then((url) => {
      const a = document.createElement('a'); a.href = url; a.download = 'evento-' + culto.nome.toLowerCase().replace(/\s+/g, '-') + '.png'; a.click();
      cexToast('Arte baixada. É só compartilhar nos grupos.');
    }).catch(() => cexToast('Não consegui exportar agora.', 'warn'));
  };

  const copiarTexto = () => {
    const L = [];
    L.push('◆ ' + culto.nome.toUpperCase());
    L.push(culto.dia + (culto.data ? ' · ' + culto.data : '') + ' · ' + culto.hora);
    L.push('◇ ' + culto.local + (recorL ? ' · ' + recorL : ''));
    if ((blocos || []).length) {
      L.push('');
      L.push('Equipes: ' + blocos.map(({ t }) => t.nome).join(', '));
    }
    if (passos.length) {
      L.push('');
      L.push('Programação:');
      passos.slice(0, 14).forEach((s) => { const r = s.resp ? pById(s.resp) : null; L.push((s.hora ? s.hora + '  ' : '') + s.item + (r ? '  — ' + r.nome.split(' ')[0] : '')); });
    }
    const louvores = S.setlist ? S.setlist(culto.id) : [];
    if (louvores && louvores.length) {
      L.push('');
      L.push('Repertório: ' + louvores.map((x) => x.titulo + (x.tom ? ' (' + x.tom + ')' : '')).join(', '));
    }
    L.push('');
    L.push('Te esperamos. Traga alguém. →');
    L.push(igreja + ' · Service');
    const txt = L.join('\n');
    const done = () => cexToast('Texto copiado. Cole no WhatsApp da equipe.');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(done).catch(() => { window.prompt('Copie o texto do evento:', txt); });
    } else { window.prompt('Copie o texto do evento:', txt); }
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="evt2-wrap" onClick={(e) => e.stopPropagation()}>
        <div className="evt2-stage">
          <div className="evt2-art" id="evt-art" style={{ '--evt-accent': accent, '--evt-deep': accentDeep }}>
            <div className="evt2-bg"></div>

            <div className="evt2-head">
              {logo ? <img className="evt2-logo" src={logo} alt={igreja} /> : <div className="evt2-logo-txt">{igreja}</div>}
              <div className="evt2-kicker">{culto.tipo || 'Celebração'}</div>
            </div>

            <div className="evt2-hero">
              <div className="evt2-dia">{culto.dia}{culto.data ? ' · ' + culto.data : ''}</div>
              <div className="evt2-nome">{culto.nome}</div>
              <div className="evt2-hora">{culto.hora}</div>
              <div className="evt2-local">◇ {culto.local}{recorL ? ' · ' + recorL : ''}</div>
            </div>

            {passos.length > 0 ? (
              <div className="evt2-prog">
                <div className="evt2-prog-t">Programação</div>
                <div className="evt2-prog-list">
                  {passos.slice(0, 7).map((s, i) => { const r = s.resp ? pById(s.resp) : null; return (
                    <div className="evt2-prog-row" key={i}>
                      <span className="evt2-prog-h">{s.hora || '—'}</span>
                      <span className="evt2-prog-i">{s.item}{r ? <small className="evt2-prog-r"> · {r.nome.split(' ')[0]}</small> : null}</span>
                    </div>
                  ); })}
                </div>
                {(blocos || []).length > 0 && (
                  <div className="evt2-equipes">{blocos.map(({ t }) => <span className="evt2-eqchip" key={t.id}>{t.nome.split(' ')[0]}</span>)}</div>
                )}
              </div>
            ) : responsaveis.length > 0 ? (
              <div className="evt2-prog">
                <div className="evt2-prog-t">Quem conduz</div>
                <div className="evt2-prog-list">
                  {responsaveis.slice(0, 6).map((r, i) => (
                    <div className="evt2-prog-row" key={i}>
                      <span className="evt2-prog-ic"><TeamMark t={tById(r.tid) || { id: '' }} size={15} /></span>
                      <span className="evt2-prog-i">{r.time}</span>
                      <span className="evt2-prog-q">{r.quem.split(' ').slice(0, 2).join(' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <div className="evt2-spacer"></div>}

            <div className="evt2-foot">
              <div className="evt2-cta">Te esperamos. Traga alguém. →</div>
              <div className="evt2-sig">{igreja} · Service</div>
            </div>
          </div>
        </div>

        <div className="evt2-side">
          <div className="evt2-side-t">Setup da celebração</div>
          <div className="evt2-side-s">Story 1080×1920 pronta para os grupos, com programação, equipes e repertório. Usa o logo da igreja e a cor escolhida em Configurações.</div>
          <button className="btn btn-pri" style={{ width: '100%', justifyContent: 'center' }} onClick={baixar}>↓ Baixar imagem</button>
          <button className="btn btn-sec" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }} onClick={copiarTexto}>◇ Copiar texto p/ WhatsApp</button>
          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }} onClick={onClose}>Fechar</button>
          <div className="evt2-side-tip">A imagem traz o card; o texto traz a programação completa para colar na conversa.</div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { EventoShare });
