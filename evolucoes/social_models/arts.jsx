/* ════════════════════════════════════════════════════════════════
   CE.X · MODELOS DE ARTE SOCIAL (base: posts reais do @campusexpansao.x)
   Carrossel 4:5 (1080×1350) e Stories 9:16 (1080×1920).
   Estilo expressivo: Inter peso 800 GIGANTE preenchendo o quadro,
   palavra-chave em itálico oliva, filete oliva no topo, marca d'água
   X/CE.X, números gigantes oliva nos passos, variação em cream.
   ════════════════════════════════════════════════════════════════ */

/* Logo CE.X — cor controlada pela classe de variante no slide-pai */
function Logo({ size }) {
  return (
    <span className="csx-logo" style={{ fontSize: size }}>CE<span className="dot">.</span><span className="x">X</span></span>
  );
}

/* ── CARROSSEL · um slide 4:5 ──
   chrome fixo (filete + logo + contador + marca d'água); corpo via children */
function CSlide({ variant = 'ink', counter, wm = 'x', children }) {
  return (
    <div className={`csx ${variant}`}>
      <div className="csx-rule"></div>
      <div className={`csx-wm ${wm === 'word' ? 'word' : ''}`}>{wm === 'word' ? <>CE<span className="x">.X</span></> : 'X'}</div>
      <div className="csx-inner">
        <div className="csx-top">
          <Logo size={40} />
          {counter && <span className="csx-counter">{counter}</span>}
        </div>
        <div className="csx-body">{children}</div>
      </div>
    </div>
  );
}

/* ── STORIES · frame ÚNICO focado em conversão ──
   gancho gigante + ponte + CTA em pílula, acima da zona da UI do Instagram */
function SStory({ variant = 'ink', kicker, children, bridge, cta }) {
  return (
    <div className={`stx ${variant}`}>
      <div className="stx-rule"></div>
      <div className="stx-wm">X</div>
      <div className="stx-inner">
        <div className="stx-top"><Logo size={44} /></div>
        <div className="stx-mid">
          {kicker && <div className="stx-kicker">{kicker}</div>}
          {children}
          {bridge && <p className="stx-bridge">{bridge}</p>}
        </div>
        <div className="stx-cta-wrap">
          <div className="stx-pill">{cta}</div>
        </div>
      </div>
      {/* guia da zona reservada à UI do Instagram (referência, não faz parte da arte) */}
      <div className="stx-safe"><span>ÁREA DA UI DO INSTAGRAM · MANTENHA LIVRE</span></div>
    </div>
  );
}

Object.assign(window, { Logo, CSlide, SStory });
