// motion_components.jsx
// 10 reusable scene components for CE.X Reels.
// Each is a function returning JSX. Used inside <Stage width={1080} height={1920} duration={X}>.

// Brand tokens (mirror motion_kit.html :root vars)
const cxColors = {
  ink:       '#0E110D',
  graphite:  '#181B16',
  border:    '#25291F',
  border2:   '#2E3327',
  olive:     '#7A9E3F',
  oliveSoft: '#94B85C',
  oliveDeep: '#4F6B26',
  cream:     '#EDE6D3',
  white:     '#FAFAF7',
  light:     '#E6E5DD',
  muted:     '#8B8C82',
  subtle:    '#555650',
};

const cxFont = {
  sans: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  mono: "'SF Mono', 'Fira Code', ui-monospace, monospace",
};

// ─── Helpers ───────────────────────────────────────────────────────────────
// Word-by-word reveal: returns array of {word, t} where t is delay (s) when word appears.
function splitWords(text, perWord = 0.08) {
  return text.split(' ').map((w, i) => ({ word: w, t: i * perWord }));
}

// Common atoms: brand watermark X, dot pattern, safe-zone hint
function WatermarkX({ opacity = 0.06 }) {
  return (
    <div style={{
      position: 'absolute',
      bottom: -240, right: -120,
      fontFamily: cxFont.sans,
      fontStyle: 'italic',
      fontWeight: 300,
      fontSize: 1800,
      lineHeight: 0.8,
      color: cxColors.olive,
      opacity,
      pointerEvents: 'none',
      userSelect: 'none',
      letterSpacing: '-0.08em',
    }}>X</div>
  );
}

function DotPattern({ opacity = 0.35 }) {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      backgroundImage: 'radial-gradient(circle, rgba(122,158,63,0.25) 2px, transparent 2px)',
      backgroundSize: '32px 32px',
      maskImage: 'linear-gradient(135deg, black 0%, transparent 60%)',
      WebkitMaskImage: 'linear-gradient(135deg, black 0%, transparent 60%)',
      opacity,
      pointerEvents: 'none',
    }} />
  );
}

function FieldLines() {
  return (
    <div style={{
      position: 'absolute',
      left: 0, right: 0, bottom: 0,
      height: '40%',
      backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent 22px, rgba(122,158,63,0.32) 22px, rgba(122,158,63,0.32) 23px)',
      maskImage: 'linear-gradient(to top, black 0%, transparent 95%)',
      WebkitMaskImage: 'linear-gradient(to top, black 0%, transparent 95%)',
      pointerEvents: 'none',
    }} />
  );
}

// Tiny CE.X mark for corner use
function CexMark({ size = 36, color = cxColors.white, accent = cxColors.olive }) {
  return (
    <span style={{
      fontFamily: cxFont.sans,
      fontWeight: 700,
      fontSize: size,
      letterSpacing: '-0.05em',
      color, lineHeight: 1,
      display: 'inline-flex',
      alignItems: 'baseline',
    }}>
      CE<span style={{ color: accent }}>.</span><span style={{ color: accent }}>X</span>
    </span>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 01 — TITLE CARD (opening — high retention, 0–3s)
// ────────────────────────────────────────────────────────────────────────────
function TitleCard() {
  return (
    <div style={{ position:'absolute', inset:0, background: cxColors.ink, overflow:'hidden' }}>
      <WatermarkX />

      {/* Top: small CE.X mark — slides in from top */}
      <Sprite start={0.2} end={3.5}>
        {({ localTime }) => {
          const t = Easing.easeOutCubic(clamp(localTime/0.6, 0, 1));
          return (
            <div style={{
              position:'absolute',
              top: 120 - (1-t)*40, left: 80,
              opacity: t,
            }}>
              <CexMark size={42} />
            </div>
          );
        }}
      </Sprite>

      {/* Eyebrow tag — slides in from left */}
      <Sprite start={0.4} end={3.5}>
        {({ localTime }) => {
          const t = Easing.easeOutCubic(clamp(localTime/0.5, 0, 1));
          return (
            <div style={{
              position:'absolute',
              top: 760, left: 80,
              opacity: t,
              transform:`translateX(${(1-t)*-40}px)`,
              fontFamily: cxFont.mono,
              fontSize: 28,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: cxColors.olive,
              fontWeight: 500,
            }}>
              <span style={{ marginRight:14 }}>—</span>Aula em 60 segundos
            </div>
          );
        }}
      </Sprite>

      {/* Main title — word by word reveal */}
      <div style={{
        position:'absolute',
        top: 820, left: 80, right: 80,
        fontFamily: cxFont.sans,
        fontSize: 168,
        fontWeight: 700,
        letterSpacing: '-0.05em',
        lineHeight: 0.94,
        color: cxColors.white,
      }}>
        {['A', 'maioria', 'das', 'igrejas', 'não', 'tem'].map((w, i) => (
          <Sprite key={i} start={0.6 + i*0.12} end={3.5}>
            {({ localTime }) => {
              const t = Easing.easeOutBack(clamp(localTime/0.5, 0, 1));
              return (
                <span style={{
                  display:'inline-block',
                  opacity: t,
                  transform:`translateY(${(1-t)*30}px)`,
                  marginRight: '0.28em',
                }}>{w}</span>
              );
            }}
          </Sprite>
        ))}
        <br/>
        <Sprite start={1.4} end={3.5}>
          {({ localTime }) => {
            const t = Easing.easeOutBack(clamp(localTime/0.55, 0, 1));
            return (
              <span style={{
                display:'inline-block',
                opacity: t,
                fontStyle:'italic',
                color: cxColors.olive,
                transform:`translateY(${(1-t)*30}px)`,
              }}>problema</span>
            );
          }}
        </Sprite>
        <Sprite start={1.7} end={3.5}>
          {({ localTime }) => {
            const t = Easing.easeOutBack(clamp(localTime/0.55, 0, 1));
            return (
              <span style={{
                display:'inline-block',
                opacity: t,
                marginLeft: '0.22em',
                transform:`translateY(${(1-t)*30}px)`,
              }}>de fé.</span>
            );
          }}
        </Sprite>
      </div>

      {/* Bottom line + CTA */}
      <Sprite start={2.2} end={3.5}>
        {({ localTime }) => {
          const t = Easing.easeOutCubic(clamp(localTime/0.6, 0, 1));
          return (
            <>
              <div style={{
                position:'absolute', left:80, bottom:240,
                width: 80 * t, height: 3, background: cxColors.olive,
              }} />
              <div style={{
                position:'absolute', left:180, bottom:228,
                fontFamily: cxFont.mono,
                fontSize: 26, color: cxColors.muted,
                letterSpacing:'0.06em',
                opacity: t,
              }}>continue assistindo →</div>
            </>
          );
        }}
      </Sprite>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 02 — LOWER THIRD (topic bar)
// ────────────────────────────────────────────────────────────────────────────
function LowerThird() {
  return (
    <div style={{ position:'absolute', inset:0, background:'transparent' }}>
      {/* Backdrop blur (faux) — slides up from bottom */}
      <Sprite start={0.0} end={5}>
        {({ localTime }) => {
          const t = Easing.easeOutBack(clamp(localTime/0.55, 0, 1));
          return (
            <div style={{
              position:'absolute',
              left: 60, right: 60,
              bottom: 220 - (1-t)*60,
              opacity: t,
              padding: '36px 40px',
              background: 'rgba(14,17,13,0.85)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: 16,
              borderLeft: `6px solid ${cxColors.olive}`,
              boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
            }}>
              <div style={{
                fontFamily: cxFont.mono,
                fontSize: 22,
                letterSpacing:'0.18em',
                textTransform:'uppercase',
                color: cxColors.olive,
                marginBottom: 12,
                fontWeight: 500,
              }}>— Princípio 02</div>
              <div style={{
                fontFamily: cxFont.sans,
                fontSize: 72,
                fontWeight: 700,
                letterSpacing:'-0.035em',
                lineHeight: 1,
                color: cxColors.white,
              }}>
                Estrutura é honrar <span style={{ fontStyle:'italic', color: cxColors.olive }}>o agir</span> de Deus.
              </div>
            </div>
          );
        }}
      </Sprite>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 03 — BIG NUMBER REVEAL (statistic)
// ────────────────────────────────────────────────────────────────────────────
function BigNumber({ target = 73, suffix = '%' }) {
  return (
    <div style={{ position:'absolute', inset:0, background: cxColors.ink, overflow:'hidden' }}>
      <DotPattern opacity={0.35} />

      {/* Eyebrow */}
      <Sprite start={0.2} end={4.5}>
        {({ localTime }) => {
          const t = Easing.easeOutCubic(clamp(localTime/0.5, 0, 1));
          return (
            <div style={{
              position:'absolute',
              top:520, left:80,
              opacity: t,
              transform:`translateY(${(1-t)*20}px)`,
              fontFamily: cxFont.mono,
              fontSize: 26,
              color: cxColors.olive,
              letterSpacing:'0.18em',
              textTransform:'uppercase',
              fontWeight:500,
            }}>
              — Dado da pesquisa
            </div>
          );
        }}
      </Sprite>

      {/* Number — counts up from 0 to target */}
      <Sprite start={0.5} end={4.5}>
        {({ localTime }) => {
          const t = Easing.easeOutExpo(clamp(localTime/1.4, 0, 1));
          const value = Math.round(target * t);
          return (
            <div style={{
              position:'absolute',
              top:600, left:80, right:80,
              fontFamily: cxFont.sans,
              fontSize: 420,
              fontWeight: 700,
              letterSpacing:'-0.07em',
              lineHeight: 0.9,
              color: cxColors.olive,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {value}<span style={{ fontStyle:'italic', color: cxColors.oliveSoft }}>{suffix}</span>
            </div>
          );
        }}
      </Sprite>

      {/* Context line */}
      <Sprite start={1.8} end={4.5}>
        {({ localTime }) => {
          const t = Easing.easeOutCubic(clamp(localTime/0.6, 0, 1));
          return (
            <div style={{
              position:'absolute',
              top:1180, left:80, right:80,
              opacity: t,
              transform:`translateY(${(1-t)*30}px)`,
              fontFamily: cxFont.sans,
              fontSize: 68,
              fontWeight: 500,
              letterSpacing:'-0.025em',
              lineHeight: 1.05,
              color: cxColors.white,
            }}>
              das equipes ministeriais<br/>relatam <span style={{ fontStyle:'italic', color:cxColors.olive }}>dependência</span><br/>de 1 ou 2 pessoas-chave.
            </div>
          );
        }}
      </Sprite>

      {/* Source footnote */}
      <Sprite start={2.4} end={4.5}>
        {({ localTime }) => {
          const t = Easing.easeOutCubic(clamp(localTime/0.5, 0, 1));
          return (
            <div style={{
              position:'absolute',
              left:80, bottom:200,
              opacity: t * 0.7,
              fontFamily: cxFont.mono,
              fontSize: 24,
              color: cxColors.muted,
              letterSpacing:'0.04em',
            }}>
              fonte · pesquisa interna CE.X · 2025
            </div>
          );
        }}
      </Sprite>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 04 — VERSÍCULO BÍBLICO (word by word, editorial)
// ────────────────────────────────────────────────────────────────────────────
function Versiculo() {
  const text = 'Rogai, pois, ao Senhor da seara que mande trabalhadores para a sua seara.';
  const words = splitWords(text, 0.18);

  return (
    <div style={{ position:'absolute', inset:0, background: cxColors.ink, overflow:'hidden' }}>
      <WatermarkX opacity={0.08} />
      <FieldLines />

      {/* Eyebrow */}
      <Sprite start={0.1} end={6.5}>
        {({ localTime }) => {
          const t = Easing.easeOutCubic(clamp(localTime/0.6, 0, 1));
          return (
            <div style={{
              position:'absolute',
              top: 360, left:80,
              opacity: t,
              fontFamily: cxFont.mono,
              fontSize: 26,
              letterSpacing:'0.18em',
              color: cxColors.olive,
              textTransform:'uppercase',
              fontWeight:500,
            }}>— Mateus 9.38</div>
          );
        }}
      </Sprite>

      {/* Verse — word by word with fade + italic */}
      <div style={{
        position:'absolute',
        top: 440, left:80, right:80,
        fontFamily: cxFont.sans,
        fontSize: 90,
        fontWeight: 500,
        fontStyle:'italic',
        letterSpacing:'-0.025em',
        lineHeight: 1.15,
        color: cxColors.cream,
      }}>
        {words.map((w, i) => (
          <Sprite key={i} start={0.6 + w.t} end={6.5}>
            {({ localTime }) => {
              const t = Easing.easeOutCubic(clamp(localTime/0.45, 0, 1));
              return (
                <span style={{
                  display:'inline-block',
                  opacity: t,
                  transform:`translateY(${(1-t)*14}px)`,
                  marginRight:'0.25em',
                  color: /trabalhadores/i.test(w.word) ? cxColors.olive : 'inherit',
                  fontWeight: /trabalhadores/i.test(w.word) ? 700 : 500,
                }}>{w.word}</span>
              );
            }}
          </Sprite>
        ))}
      </div>

      {/* Bottom CE.X mark */}
      <Sprite start={4.2} end={6.5}>
        {({ localTime }) => {
          const t = Easing.easeOutCubic(clamp(localTime/0.6, 0, 1));
          return (
            <div style={{
              position:'absolute',
              left:80, bottom:200,
              opacity: t,
            }}>
              <CexMark size={42} />
            </div>
          );
        }}
      </Sprite>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 05 — LISTA NUMERADA (constrói item a item)
// ────────────────────────────────────────────────────────────────────────────
function ListaNumerada({
  title = 'Sinais de equipe',
  emphasis = 'sem sistema',
  items = [
    'Tudo depende de uma pessoa só',
    'Reuniões repetem o que ficou em aberto',
    'Cresceu sem que o processo crescesse',
    'Líderes vivem apagando incêndio',
    'O que funciona não está documentado',
  ],
}) {
  return (
    <div style={{ position:'absolute', inset:0, background: cxColors.ink, overflow:'hidden' }}>
      <WatermarkX opacity={0.05} />

      {/* Title — fades in */}
      <Sprite start={0.0} end={items.length * 1.4 + 3}>
        {({ localTime }) => {
          const t = Easing.easeOutCubic(clamp(localTime/0.6, 0, 1));
          return (
            <div style={{
              position:'absolute',
              top:200, left:80, right:80,
              opacity: t,
              transform:`translateY(${(1-t)*20}px)`,
              fontFamily: cxFont.sans,
              fontSize: 88,
              fontWeight: 700,
              letterSpacing:'-0.035em',
              lineHeight: 1,
              color: cxColors.white,
            }}>
              {title}<br/>
              <span style={{ fontStyle:'italic', color: cxColors.olive }}>{emphasis}.</span>
            </div>
          );
        }}
      </Sprite>

      {/* Items — appear one by one with index ticker */}
      {items.map((item, i) => (
        <Sprite key={i} start={1.0 + i*1.4} end={items.length * 1.4 + 3}>
          {({ localTime }) => {
            const t = Easing.easeOutBack(clamp(localTime/0.5, 0, 1));
            return (
              <div style={{
                position:'absolute',
                top: 600 + i*180, left:80, right:80,
                opacity: t,
                transform:`translateX(${(1-t)*-50}px)`,
                display:'grid',
                gridTemplateColumns: '120px 1fr',
                gap: 32,
                alignItems:'baseline',
              }}>
                <div style={{
                  fontFamily: cxFont.sans,
                  fontWeight: 700,
                  fontStyle:'italic',
                  fontSize: 100,
                  color: cxColors.olive,
                  letterSpacing:'-0.04em',
                  lineHeight: 1,
                }}>0{i+1}</div>
                <div style={{
                  fontFamily: cxFont.sans,
                  fontSize: 48,
                  fontWeight: 500,
                  letterSpacing:'-0.02em',
                  lineHeight: 1.2,
                  color: cxColors.light,
                  paddingTop: 18,
                }}>{item}</div>
              </div>
            );
          }}
        </Sprite>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 06 — PULL QUOTE (frase forte centralizada)
// ────────────────────────────────────────────────────────────────────────────
function PullQuote() {
  return (
    <div style={{ position:'absolute', inset:0, background: cxColors.cream, overflow:'hidden' }}>
      {/* Big italic open quote */}
      <Sprite start={0.0} end={4.5}>
        {({ localTime }) => {
          const t = Easing.easeOutBack(clamp(localTime/0.6, 0, 1));
          return (
            <div style={{
              position:'absolute',
              top: 460, left: 80,
              opacity: t,
              fontFamily: cxFont.sans,
              fontStyle:'italic',
              fontWeight: 300,
              fontSize: 480,
              lineHeight: 0.7,
              color: cxColors.olive,
              transform:`scale(${0.6 + 0.4*t})`,
              transformOrigin:'left top',
            }}>"</div>
          );
        }}
      </Sprite>

      {/* Quote text */}
      <div style={{
        position:'absolute',
        top: 760, left:80, right:80,
        fontFamily: cxFont.sans,
        fontSize: 120,
        fontWeight: 700,
        letterSpacing:'-0.04em',
        lineHeight: 1,
        color: cxColors.ink,
      }}>
        {['Preparamos', 'trabalhadores.'].map((w, i) => (
          <Sprite key={'a'+i} start={0.5 + i*0.25} end={4.5}>
            {({ localTime }) => {
              const t = Easing.easeOutCubic(clamp(localTime/0.5, 0, 1));
              return (
                <span style={{
                  display:'inline-block',
                  opacity: t,
                  transform:`translateY(${(1-t)*24}px)`,
                  marginRight:'0.22em',
                }}>{w}</span>
              );
            }}
          </Sprite>
        ))}
        <br/>
        <Sprite start={1.4} end={4.5}>
          {({ localTime }) => {
            const t = Easing.easeOutCubic(clamp(localTime/0.6, 0, 1));
            return (
              <span style={{
                display:'inline-block',
                opacity: t,
                transform:`translateY(${(1-t)*24}px)`,
                fontStyle:'italic',
                fontWeight: 700,
                color: cxColors.oliveDeep,
              }}>Deus prepara a colheita.</span>
            );
          }}
        </Sprite>
      </div>

      {/* Attribution */}
      <Sprite start={2.5} end={4.5}>
        {({ localTime }) => {
          const t = Easing.easeOutCubic(clamp(localTime/0.5, 0, 1));
          return (
            <div style={{
              position:'absolute',
              left:80, bottom:200,
              opacity: t,
              display:'flex', alignItems:'center', gap:18,
            }}>
              <div style={{ width: 80, height: 3, background: cxColors.oliveDeep }}/>
              <div style={{
                fontFamily: cxFont.mono,
                fontSize: 26,
                letterSpacing:'0.14em',
                textTransform:'uppercase',
                color: cxColors.oliveDeep,
                fontWeight: 500,
              }}>Princípio CE.X</div>
            </div>
          );
        }}
      </Sprite>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 07 — ANTES / DEPOIS (dois cards comparando)
// ────────────────────────────────────────────────────────────────────────────
function AntesDepois() {
  return (
    <div style={{ position:'absolute', inset:0, background: cxColors.ink, overflow:'hidden' }}>
      <DotPattern opacity={0.25} />

      {/* Title */}
      <Sprite start={0} end={5}>
        {({ localTime }) => {
          const t = Easing.easeOutCubic(clamp(localTime/0.6, 0, 1));
          return (
            <div style={{
              position:'absolute',
              top:180, left:80, right:80,
              opacity: t,
              fontFamily: cxFont.sans,
              fontSize: 80,
              fontWeight: 700,
              letterSpacing:'-0.035em',
              lineHeight: 1,
              color: cxColors.white,
            }}>
              Esforço <span style={{fontStyle:'italic', color: cxColors.olive}}>vs.</span> Estrutura
            </div>
          );
        }}
      </Sprite>

      {/* Card 1 — slides in from left */}
      <Sprite start={0.5} end={5}>
        {({ localTime }) => {
          const t = Easing.easeOutBack(clamp(localTime/0.6, 0, 1));
          return (
            <div style={{
              position:'absolute',
              top:480, left:60, right:60,
              opacity: t,
              transform:`translateX(${(1-t)*-80}px)`,
              padding: '48px 44px',
              background: cxColors.graphite,
              borderRadius: 18,
              borderLeft: `4px solid ${cxColors.muted}`,
            }}>
              <div style={{
                fontFamily: cxFont.mono,
                fontSize: 26,
                color: cxColors.muted,
                letterSpacing:'0.18em',
                textTransform:'uppercase',
                marginBottom: 14,
                fontWeight:500,
              }}>Antes — Esforço</div>
              <div style={{
                fontFamily: cxFont.sans,
                fontSize: 64,
                fontWeight: 600,
                letterSpacing:'-0.025em',
                lineHeight: 1.05,
                color: cxColors.light,
              }}>
                Tudo depende<br/>de <span style={{ color: cxColors.muted }}>uma pessoa.</span>
              </div>
            </div>
          );
        }}
      </Sprite>

      {/* Card 2 — slides in from right */}
      <Sprite start={1.3} end={5}>
        {({ localTime }) => {
          const t = Easing.easeOutBack(clamp(localTime/0.6, 0, 1));
          return (
            <div style={{
              position:'absolute',
              top:1080, left:60, right:60,
              opacity: t,
              transform:`translateX(${(1-t)*80}px)`,
              padding: '48px 44px',
              background: cxColors.graphite,
              borderRadius: 18,
              borderLeft: `4px solid ${cxColors.olive}`,
            }}>
              <div style={{
                fontFamily: cxFont.mono,
                fontSize: 26,
                color: cxColors.olive,
                letterSpacing:'0.18em',
                textTransform:'uppercase',
                marginBottom: 14,
                fontWeight:500,
              }}>Depois — Estrutura</div>
              <div style={{
                fontFamily: cxFont.sans,
                fontSize: 64,
                fontWeight: 700,
                letterSpacing:'-0.025em',
                lineHeight: 1.05,
                color: cxColors.white,
              }}>
                O processo <span style={{ fontStyle:'italic', color: cxColors.olive }}>sustenta</span> as pessoas.
              </div>
            </div>
          );
        }}
      </Sprite>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 08 — HIGHLIGHT WORD (palavra-chave entra sobre frase)
// ────────────────────────────────────────────────────────────────────────────
function HighlightWord() {
  return (
    <div style={{ position:'absolute', inset:0, background: cxColors.ink, overflow:'hidden' }}>
      <WatermarkX />

      <div style={{
        position:'absolute',
        top: 600, left: 80, right: 80,
        fontFamily: cxFont.sans,
        fontSize: 130,
        fontWeight: 700,
        letterSpacing:'-0.04em',
        lineHeight: 1.05,
        color: cxColors.white,
      }}>
        {/* Words enter sequentially */}
        {['Não', 'falta', 'fé.'].map((w, i) => (
          <Sprite key={'p1'+i} start={0.2 + i*0.25} end={4.5}>
            {({ localTime }) => {
              const t = Easing.easeOutCubic(clamp(localTime/0.45, 0, 1));
              return (
                <span style={{
                  display:'inline-block',
                  opacity: t,
                  transform:`translateY(${(1-t)*20}px)`,
                  marginRight:'0.25em',
                }}>{w}</span>
              );
            }}
          </Sprite>
        ))}
        <br/>
        {['Falta'].map((w, i) => (
          <Sprite key={'p2'+i} start={1.4 + i*0.25} end={4.5}>
            {({ localTime }) => {
              const t = Easing.easeOutCubic(clamp(localTime/0.45, 0, 1));
              return (
                <span style={{
                  display:'inline-block',
                  opacity: t,
                  transform:`translateY(${(1-t)*20}px)`,
                  marginRight:'0.25em',
                }}>{w}</span>
              );
            }}
          </Sprite>
        ))}

        {/* The highlighted word — bigger, italic olive, scales up + underline draws */}
        <Sprite start={1.9} end={4.5}>
          {({ localTime }) => {
            const t = Easing.easeOutBack(clamp(localTime/0.55, 0, 1));
            const underlineT = Easing.easeOutCubic(clamp((localTime-0.5)/0.6, 0, 1));
            return (
              <span style={{
                position:'relative',
                display:'inline-block',
                opacity: t,
                transform:`scale(${0.6 + 0.4*t})`,
                transformOrigin:'left center',
                fontStyle:'italic',
                color: cxColors.olive,
                fontWeight: 700,
                marginRight:'0.25em',
              }}>
                estrutura.
                <span style={{
                  position:'absolute',
                  left: 0, right: 0, bottom: -10,
                  height: 10,
                  background: cxColors.olive,
                  transform:`scaleX(${underlineT})`,
                  transformOrigin:'left',
                  borderRadius: 6,
                }}/>
              </span>
            );
          }}
        </Sprite>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 09 — TRANSIÇÃO X (varredura entre tópicos)
// ────────────────────────────────────────────────────────────────────────────
function TransicaoX() {
  return (
    <div style={{ position:'absolute', inset:0, background: cxColors.ink, overflow:'hidden' }}>
      {/* X enters huge, scales to center, then exits */}
      <Sprite start={0} end={1.5}>
        {({ localTime, duration }) => {
          // 0 - 0.5: enters from right scaling
          // 0.5 - 1.0: holds + flashes color
          // 1.0 - 1.5: leaves to left
          let x = 0, scale = 1, opacity = 1, color = cxColors.olive;
          if (localTime < 0.5) {
            const t = Easing.easeOutCubic(clamp(localTime/0.5, 0, 1));
            x = (1-t) * 1400;
            scale = 0.5 + 0.5*t;
            opacity = t;
          } else if (localTime > 1.0) {
            const t = Easing.easeInCubic(clamp((localTime-1.0)/0.5, 0, 1));
            x = -t * 1400;
            scale = 1.0 - 0.3*t;
            opacity = 1 - t;
          }
          return (
            <div style={{
              position:'absolute',
              inset: 0,
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <div style={{
                fontFamily: cxFont.sans,
                fontSize: 1600,
                fontWeight: 700,
                fontStyle:'italic',
                color,
                opacity,
                transform:`translateX(${x}px) scale(${scale})`,
                letterSpacing:'-0.08em',
                lineHeight: 0.85,
              }}>X</div>
            </div>
          );
        }}
      </Sprite>

      {/* Tiny eyebrow label that flashes during peak */}
      <Sprite start={0.45} end={1.05}>
        {({ localTime }) => {
          const t = Easing.easeOutCubic(clamp(localTime/0.3, 0, 1));
          return (
            <div style={{
              position:'absolute',
              top: 1200, left:0, right:0,
              textAlign:'center',
              opacity: t,
              fontFamily: cxFont.mono,
              fontSize: 36,
              letterSpacing:'0.22em',
              textTransform:'uppercase',
              color: cxColors.olive,
              fontWeight: 500,
            }}>Próximo ponto</div>
          );
        }}
      </Sprite>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 10 — END CARD / CTA
// ────────────────────────────────────────────────────────────────────────────
function EndCard() {
  return (
    <div style={{ position:'absolute', inset:0, background: cxColors.olive, overflow:'hidden' }}>
      {/* Big X watermark in dark */}
      <Sprite start={0} end={5}>
        {({ localTime }) => {
          const t = Easing.easeOutCubic(clamp(localTime/0.8, 0, 1));
          return (
            <div style={{
              position:'absolute',
              right: -120, bottom: -240,
              fontFamily: cxFont.sans,
              fontStyle:'italic',
              fontWeight: 300,
              fontSize: 1800,
              lineHeight: 0.8,
              color: cxColors.ink,
              opacity: t * 0.10,
              pointerEvents:'none',
              letterSpacing:'-0.08em',
            }}>X</div>
          );
        }}
      </Sprite>

      {/* CE.X big mark — enters scaled */}
      <Sprite start={0.2} end={5}>
        {({ localTime }) => {
          const t = Easing.easeOutBack(clamp(localTime/0.7, 0, 1));
          return (
            <div style={{
              position:'absolute',
              top: 480, left:80, right:80,
              opacity: t,
              transform: `scale(${0.7 + 0.3*t})`,
              transformOrigin:'left top',
              fontFamily: cxFont.sans,
              fontSize: 280,
              fontWeight: 700,
              letterSpacing:'-0.06em',
              lineHeight: 0.9,
              color: cxColors.ink,
            }}>
              CE<span style={{ opacity: 0.4 }}>.</span><span>X</span>
            </div>
          );
        }}
      </Sprite>

      {/* Tagline */}
      <Sprite start={1.0} end={5}>
        {({ localTime }) => {
          const t = Easing.easeOutCubic(clamp(localTime/0.6, 0, 1));
          return (
            <div style={{
              position:'absolute',
              top:880, left:80, right:80,
              opacity: t,
              transform:`translateY(${(1-t)*20}px)`,
              fontFamily: cxFont.sans,
              fontSize: 76,
              fontWeight: 700,
              letterSpacing:'-0.03em',
              lineHeight: 1.1,
              color: cxColors.ink,
            }}>
              Preparamos<br/>trabalhadores<br/>para a <span style={{ fontStyle:'italic' }}>Grande Comissão.</span>
            </div>
          );
        }}
      </Sprite>

      {/* CTA */}
      <Sprite start={2.2} end={5}>
        {({ localTime }) => {
          const t = Easing.easeOutBack(clamp(localTime/0.55, 0, 1));
          return (
            <div style={{
              position:'absolute',
              left:80, bottom:240,
              opacity: t,
              transform:`translateY(${(1-t)*20}px)`,
              padding:'24px 36px',
              background: cxColors.ink,
              color: cxColors.olive,
              borderRadius: 12,
              fontFamily: cxFont.sans,
              fontSize: 36,
              fontWeight: 700,
              letterSpacing:'-0.01em',
              display:'inline-flex',
              alignItems:'center',
              gap: 14,
            }}>
              Siga @campusexpansao <span>→</span>
            </div>
          );
        }}
      </Sprite>
    </div>
  );
}

// Export to window for the app shell
Object.assign(window, {
  TitleCard, LowerThird, BigNumber, Versiculo, ListaNumerada,
  PullQuote, AntesDepois, HighlightWord, TransicaoX, EndCard,
  cxColors, cxFont, WatermarkX, DotPattern, FieldLines, CexMark,
  splitWords,
});
