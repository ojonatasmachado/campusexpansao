/* ════════════════════════════════════════════════════════════════
   CE.X ADMIN · DIVULGAÇÃO (peças prontas pra postar)
   Feed 4:5 (1080×1350) e Stories 9:16 (1080×1920) TRAVADOS na ID CE.X:
   fundo Ink dominante, título cream, ".X" oliva como marca. A cor da
   estante entra SÓ como assinatura (filete fino + etiqueta ◆).
   O preview é DOM; o download é desenhado em Canvas com os MESMOS
   números (instantâneo, sem dependência externa, funciona em qualquer
   navegador).
   ════════════════════════════════════════════════════════════════ */
const { useState: useStateSh, useRef: useRefSh, useLayoutEffect: useLayoutEffectSh } = React;

/* Tokens CE.X usados no Canvas (espelham o CSS) */
const SH = {
  ink: '#0E110D', cream: '#EDE6D3', light: '#E6E5DD', muted: '#8B8C82',
  olive: '#7A9E3F', border: '#2E3327',
  sans: 'Inter', mono: '"JetBrains Mono"',
};

/* Especificação de layout — usada IGUAL no DOM (preview) e no Canvas (export) */
const SPEC = {
  feed: {
    W: 1080, H: 1350, padX: 88, headTop: 88, midTop: 460,
    titleSize: 98, descSize: 31, descMaxW: 800, footTop: 1198,
  },
  stories: {
    W: 1080, H: 1920, padX: 88, headTop: 120, midTop: 560,
    titleSize: 110, descSize: 33, descMaxW: 820, dividerY: 1500, footRowTop: 1532,
  },
};

/* Deriva os campos da peça a partir do item */
function shareFields(item) {
  const t = item.type;
  if (t === 'curso') {
    return {
      kind: 'CURSO', etiqueta: item.level || 'CURSO', title: item.title, desc: item.desc,
      meta: [`${item.weeks} semanas`, item.mentoria ? 'Mentoria inclusa' : null, 'Ao vivo'].filter(Boolean).join(' · '),
      live: !!item.aoVivo, chip: 'Lista de espera aberta',
    };
  }
  if (t === 'mentoria') {
    return {
      kind: 'MENTORIA', etiqueta: 'Mentoria acompanhada', title: item.title, desc: item.desc,
      meta: [item.formato, item.cadencia].filter(Boolean).join(' · '),
      live: false, chip: 'Vagas limitadas',
    };
  }
  if (t === 'evento') {
    return {
      kind: 'EVENTO', etiqueta: 'Evento', title: item.title, desc: item.desc,
      meta: [item.data, item.local].filter(Boolean).join(' · '),
      live: false, chip: 'Inscrições abertas',
    };
  }
  const big = item.messages ? `${item.messages} mensagens` : (item.pages ? `${item.pages} páginas` : null);
  return {
    kind: 'MATERIAL', etiqueta: item.shelf || 'Material', title: item.title, desc: item.desc,
    meta: [big, 'Editável', item.format || 'PDF'].filter(Boolean).join(' · '),
    live: false, chip: item.price ? `R$ ${item.price}` : null,
  };
}

/* ═════════ CANVAS · render fiel pra download ═════════ */
function setFont(ctx, { weight = 400, size, mono = false, ls = 0, italic = false }) {
  ctx.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${mono ? SH.mono : SH.sans}`;
  try { ctx.letterSpacing = ls + 'px'; } catch (e) {}
}
function wrapLines(ctx, text, maxW) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = []; let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function drawPiece(format, item, f, version) {
  const s = SPEC[format];
  const accent = item.accent;
  const x = s.padX;
  const title = item.title || 'Título do material';
  const cv = document.createElement('canvas');
  cv.width = s.W; cv.height = s.H;
  const ctx = cv.getContext('2d');

  // fundo Ink
  ctx.fillStyle = SH.ink; ctx.fillRect(0, 0, s.W, s.H);
  // grade sutil
  ctx.strokeStyle = 'rgba(122,158,63,0.05)'; ctx.lineWidth = 1;
  for (let gx = 0; gx <= s.W; gx += 90) { ctx.beginPath(); ctx.moveTo(gx + 0.5, 0); ctx.lineTo(gx + 0.5, s.H); ctx.stroke(); }
  for (let gy = 0; gy <= s.H; gy += 90) { ctx.beginPath(); ctx.moveTo(0, gy + 0.5); ctx.lineTo(s.W, gy + 0.5); ctx.stroke(); }
  // marca d'água X (oliva levíssimo)
  ctx.save();
  setFont(ctx, { weight: 700, size: format === 'feed' ? 760 : 720, italic: true });
  ctx.fillStyle = 'rgba(122,158,63,0.055)'; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
  ctx.fillText('X', s.W + 150, format === 'feed' ? s.H + 250 : s.H + 60);
  ctx.restore();

  ctx.textBaseline = 'top';

  // ── cabeçalho: marca CE.X + handle/live ──
  ctx.textAlign = 'left';
  setFont(ctx, { weight: 700, size: 56, ls: -2.8 });
  ctx.fillStyle = SH.cream; ctx.fillText('CE', x, s.headTop);
  const wCE = ctx.measureText('CE').width;
  ctx.fillStyle = SH.olive; ctx.fillText('.X', x + wCE, s.headTop);

  if (f.live) {
    setFont(ctx, { weight: 600, size: 20, mono: true, ls: 2 });
    const txt = '● AO VIVO'; const w = ctx.measureText(txt).width; const px = 16, py = 9;
    const chipW = w + px * 2, chipH = 20 + py * 2, cx = s.W - s.padX - chipW, cy = s.headTop;
    roundRect(ctx, cx, cy, chipW, chipH, 7); ctx.fillStyle = accent; ctx.fill();
    ctx.fillStyle = SH.ink; ctx.fillText(txt, cx + px, cy + py);
  } else {
    setFont(ctx, { weight: 400, size: 23, mono: true, ls: 2.3 });
    ctx.fillStyle = SH.muted; ctx.textAlign = 'right';
    ctx.fillText('@campus.expansao', s.W - s.padX, s.headTop + 22);
  }

  // ── miolo ──
  ctx.textAlign = 'left';
  setFont(ctx, { weight: 400, size: 25, mono: true, ls: 4.5 });
  ctx.fillStyle = accent;
  ctx.fillText('◆  ' + String(f.etiqueta).toUpperCase(), x, s.midTop);
  // filete
  ctx.fillStyle = accent; ctx.fillRect(x, s.midTop + 52, 76, 4);
  // título
  const titleTop = s.midTop + 52 + 4 + 30;
  setFont(ctx, { weight: 800, size: s.titleSize, ls: -(0.045 * s.titleSize) });
  ctx.fillStyle = SH.cream;
  const tLines = wrapLines(ctx, title, s.W - 2 * s.padX);
  const tStep = s.titleSize * 0.92;
  tLines.forEach((ln, i) => ctx.fillText(ln, x, titleTop + i * tStep));
  let y = titleTop + (tLines.length - 1) * tStep + s.titleSize;
  // descrição
  if (f.desc) {
    const descTop = y + 32;
    setFont(ctx, { weight: 400, size: s.descSize, ls: 0 });
    ctx.fillStyle = SH.light;
    const dLines = wrapLines(ctx, f.desc, s.descMaxW);
    const dStep = s.descSize * 1.45;
    dLines.forEach((ln, i) => ctx.fillText(ln, x, descTop + i * dStep));
    y = descTop + (dLines.length - 1) * dStep + s.descSize;
  }
  // chip (versão anúncio)
  if (version === 'venda' && f.chip) {
    const chipTop = y + 38;
    setFont(ctx, { weight: 700, size: 30, mono: true, ls: 0.3 });
    const w = ctx.measureText(f.chip).width, px = 24, py = 13;
    roundRect(ctx, x, chipTop, w + px * 2, 30 + py * 2, 9); ctx.fillStyle = accent; ctx.fill();
    ctx.fillStyle = SH.ink; ctx.fillText(f.chip, x + px, chipTop + py);
  }

  // ── rodapé ──
  if (format === 'feed') {
    setFont(ctx, { weight: 400, size: 22, mono: true, ls: 1.8 });
    ctx.fillStyle = SH.muted; ctx.textAlign = 'left';
    const mLines = wrapLines(ctx, String(f.meta).toUpperCase(), 560);
    mLines.forEach((ln, i) => ctx.fillText(ln, x, s.footTop + i * 22 * 1.5));
    setFont(ctx, { weight: 400, size: 25, mono: true, ls: 1 });
    ctx.textAlign = 'right';
    ctx.fillStyle = SH.olive; ctx.fillText(' →', s.W - s.padX, s.footTop);
    const wA = ctx.measureText(' →').width;
    ctx.fillStyle = SH.cream; ctx.fillText('campusexpansao.com.br', s.W - s.padX - wA, s.footTop);
  } else {
    ctx.fillStyle = SH.border; ctx.fillRect(s.padX, s.dividerY, s.W - 2 * s.padX, 1);
    setFont(ctx, { weight: 400, size: 25, mono: true, ls: 1 });
    ctx.fillStyle = SH.cream; ctx.textAlign = 'left';
    ctx.fillText('campusexpansao.com.br', x, s.footRowTop);
    setFont(ctx, { weight: 400, size: 23, mono: true, ls: 3 });
    ctx.textAlign = 'right';
    if (version === 'venda') { ctx.fillStyle = accent; ctx.fillText('SAIBA MAIS ↓', s.W - s.padX, s.footRowTop); }
    else { ctx.fillStyle = SH.muted; ctx.fillText('PERFIL NA BIO ↑', s.W - s.padX, s.footRowTop); }
  }
  try { ctx.letterSpacing = '0px'; } catch (e) {}
  return cv;
}

/* ═════════ DOM · preview (mesmos números do SPEC) ═════════ */
function CexMark({ size }) {
  return (
    <span style={{ fontFamily: 'var(--sans)', fontSize: size, fontWeight: 700, letterSpacing: '-.05em', color: 'var(--cream)', lineHeight: 1 }}>
      CE<span style={{ color: 'var(--olive)' }}>.X</span>
    </span>
  );
}

function PieceDOM({ format, item, f, version, innerRef, scale }) {
  const s = SPEC[format];
  const accent = item.accent;
  const title = item.title || 'Título do material';
  return (
    <div ref={innerRef} className="sh-piece" style={{ width: s.W, height: s.H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
      <div className="sh-grid" style={{ backgroundSize: '90px 90px' }}></div>
      <div className="sh-x" style={format === 'feed' ? { right: -150, bottom: -250, fontSize: 760 } : { right: -150, bottom: 120, fontSize: 720 }}>X</div>

      {/* cabeçalho */}
      <div style={{ position: 'absolute', left: s.padX, right: s.padX, top: s.headTop, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <CexMark size={56} />
        {f.live
          ? <span className="sh-livechip" style={{ background: accent }}>● AO VIVO</span>
          : <span style={{ fontFamily: 'var(--mono)', fontSize: 23, letterSpacing: '.1em', color: 'var(--muted)' }}>@campus.expansao</span>}
      </div>

      {/* miolo */}
      <div style={{ position: 'absolute', left: s.padX, right: s.padX, top: s.midTop }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 25, letterSpacing: '.18em', textTransform: 'uppercase', color: accent }}>◆&nbsp;&nbsp;{String(f.etiqueta).toUpperCase()}</div>
        <div style={{ width: 76, height: 4, background: accent, marginTop: 26 }}></div>
        <div style={{ fontSize: s.titleSize, fontWeight: 800, lineHeight: 0.92, letterSpacing: '-.045em', color: 'var(--cream)', marginTop: 30, textWrap: 'balance' }}>{title}</div>
        {f.desc && <div style={{ fontSize: s.descSize, lineHeight: 1.45, color: 'var(--light)', marginTop: 32, maxWidth: s.descMaxW }}>{f.desc}</div>}
        {version === 'venda' && f.chip && <div style={{ marginTop: 38 }}><span className="sh-pricechip" style={{ background: accent }}>{f.chip}</span></div>}
      </div>

      {/* rodapé */}
      {format === 'feed' ? (
        <div style={{ position: 'absolute', left: s.padX, right: s.padX, top: s.footTop, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 28 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 22, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', maxWidth: 560, lineHeight: 1.5 }}>{f.meta}</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 25, color: 'var(--cream)', whiteSpace: 'nowrap' }}>campusexpansao.com.br <span style={{ color: 'var(--olive)' }}>→</span></span>
        </div>
      ) : (
        <div style={{ position: 'absolute', left: s.padX, right: s.padX, top: s.dividerY }}>
          <div style={{ height: 1, background: 'var(--border-2)' }}></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 30 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 25, color: 'var(--cream)' }}>campusexpansao.com.br</span>
            {version === 'venda'
              ? <span style={{ fontFamily: 'var(--mono)', fontSize: 23, letterSpacing: '.14em', color: accent }}>SAIBA MAIS ↓</span>
              : <span style={{ fontFamily: 'var(--mono)', fontSize: 23, letterSpacing: '.14em', color: 'var(--muted)' }}>PERFIL NA BIO ↑</span>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═════════ PAINEL ═════════ */
function SharePanel({ item }) {
  const [format, setFormat] = useStateSh('feed');
  const [version, setVersion] = useStateSh('organico');
  const [busy, setBusy] = useStateSh(false);
  const stageRef = useRefSh(null);
  const [stageW, setStageW] = useStateSh(360);

  useLayoutEffectSh(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setStageW(Math.max(160, el.clientWidth - 40));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const f = shareFields(item);
  const H = SPEC[format].H;
  const maxH = format === 'feed' ? 540 : 660;
  const scale = Math.min(stageW / 1080, maxH / H);

  const slug = (item.title || 'peca').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40) || 'peca';

  const download = async () => {
    setBusy(true);
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const cv = drawPiece(format, item, f, version);
      const blob = await new Promise((res) => cv.toBlob(res, 'image/png'));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CEX_${f.kind}_${format === 'feed' ? 'Feed-4x5' : 'Stories-9x16'}_${slug}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (e) { console.warn('Falha ao gerar PNG', e); }
    setBusy(false);
  };

  return (
    <div className="sh-wrap">
      <div className="sh-controls">
        <div className="sh-seg2">
          <button className={format === 'feed' ? 'on' : ''} onClick={() => setFormat('feed')}>Feed 4:5</button>
          <button className={format === 'stories' ? 'on' : ''} onClick={() => setFormat('stories')}>Stories 9:16</button>
        </div>
        <div className="sh-seg2">
          <button className={version === 'organico' ? 'on' : ''} onClick={() => setVersion('organico')}>Orgânico</button>
          <button className={version === 'venda' ? 'on' : ''} onClick={() => setVersion('venda')}>Anúncio</button>
        </div>
      </div>

      <div className="sh-stage" ref={stageRef}>
        <div style={{ width: 1080 * scale, height: H * scale, position: 'relative' }}>
          <PieceDOM format={format} item={item} f={f} version={version} scale={scale} />
          {format === 'stories' && (
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 310 * scale, borderTop: '1px dashed rgba(122,158,63,.35)', background: 'repeating-linear-gradient(45deg,rgba(122,158,63,.03) 0 8px,transparent 8px 16px)', pointerEvents: 'none', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 8 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.1em', color: 'var(--subtle)' }}>ÁREA DO BOTÃO · INSTAGRAM</span>
            </div>
          )}
        </div>
      </div>

      <div className="sh-dl">
        <button className="btn-pri" onClick={download} disabled={busy}>{busy ? 'Gerando…' : `↓ Baixar PNG (${format === 'feed' ? '1080×1350' : '1080×1920'})`}</button>
      </div>

      <div className="sh-note">
        <em>◆ Travado na ID CE.X.</em> Fundo Ink, marca sempre presente. A cor da estante entra só no filete e na etiqueta.
        {version === 'venda' ? ' Versão anúncio: chip de preço + deixa pro botão do tráfego pago.' : ' Versão orgânica: leva pro perfil e pro site.'}
      </div>
    </div>
  );
}

Object.assign(window, { SharePanel, PieceDOM, drawPiece, shareFields });
