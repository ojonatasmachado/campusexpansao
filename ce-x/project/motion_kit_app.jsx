// motion_kit_app.jsx
// App shell — renders the Motion Kit page with all 10 components.
// Each component card has: live preview + play/pause + scrubber + spec + when-to-use + sound cue option + code snippet.

const { useState, useRef, useEffect, useCallback } = React;
const C = cxColors;
const F = cxFont;

// ──────────────────────────────────────────────────────────────────────────
// SCENE REGISTRY
// ──────────────────────────────────────────────────────────────────────────
const SCENES = [
  {
    id: 'title-card',
    name: '01 · Title Card',
    role: 'Abertura · alta retenção',
    duration: 3.5,
    component: TitleCard,
    when: 'Use nos 3 primeiros segundos do Reel. Hook que prende — palavra-chave em itálico oliva, micro-animações que dão "vida" sem ruído.',
    sound: 'whoosh suave + pop sutil na palavra-chave',
    soundDefault: true,
    code: '<TitleCard />  // 3.5s · cor de fundo: ink',
  },
  {
    id: 'lower-third',
    name: '02 · Lower Third',
    role: 'Faixa de tópico',
    duration: 5,
    component: LowerThird,
    when: 'Use para introduzir o tópico ou marco do reel. Aparece sobre o vídeo (fundo transparente), por isso o backdrop blur.',
    sound: 'tick discreto na entrada',
    soundDefault: false,
    code: '<LowerThird />  // 5s · backdrop transparente',
  },
  {
    id: 'big-number',
    name: '03 · Big Number',
    role: 'Estatística com contagem',
    duration: 4.5,
    component: BigNumber,
    when: 'Use sempre que citar um dado, percentual, quantidade. O número conta de 0 até o valor — força visual.',
    sound: 'tick rítmico durante a contagem + thud no final',
    soundDefault: true,
    code: '<BigNumber target={73} suffix="%" />  // 4.5s',
  },
  {
    id: 'versiculo',
    name: '04 · Versículo',
    role: 'Citação bíblica',
    duration: 6.5,
    component: Versiculo,
    when: 'Use quando ler a Escritura. Reveal palavra-por-palavra dá ritmo de leitura. Palavras-chave ficam em peso 700.',
    sound: 'silêncio (preserva voz)',
    soundDefault: false,
    code: '<Versiculo />  // 6.5s · texto: Mateus 9.38',
  },
  {
    id: 'lista',
    name: '05 · Lista Numerada',
    role: 'Construção item a item',
    duration: 10,
    component: ListaNumerada,
    when: 'Use quando enumerar pontos. Cada item entra sincronizado com a fala — 1,4s por item por padrão.',
    sound: 'tick por item',
    soundDefault: true,
    code: '<ListaNumerada items={[...]} />  // ~1.4s por item',
  },
  {
    id: 'pull-quote',
    name: '06 · Pull Quote',
    role: 'Frase de impacto',
    duration: 4.5,
    component: PullQuote,
    when: 'Use para uma frase forte — princípio, slogan, declaração. Fundo creme cria intervalo editorial.',
    sound: 'silêncio (frase fala por si)',
    soundDefault: false,
    code: '<PullQuote />  // 4.5s · fundo creme',
  },
  {
    id: 'antes-depois',
    name: '07 · Antes / Depois',
    role: 'Comparação editorial',
    duration: 5,
    component: AntesDepois,
    when: 'Use para mostrar contraste. Card 1 entra pela esquerda (antes/esforço), card 2 entra pela direita (depois/estrutura).',
    sound: 'whoosh em cada card',
    soundDefault: true,
    code: '<AntesDepois />  // 5s',
  },
  {
    id: 'highlight',
    name: '08 · Highlight Word',
    role: 'Palavra-chave em destaque',
    duration: 4.5,
    component: HighlightWord,
    when: 'Use no meio de uma frase, quando você quer destacar UMA palavra. A palavra entra grande, em itálico oliva, com underline desenhando.',
    sound: 'whoosh + underline draw',
    soundDefault: true,
    code: '<HighlightWord />  // 4.5s',
  },
  {
    id: 'transicao',
    name: '09 · Transição X',
    role: 'Varredura entre tópicos',
    duration: 1.5,
    component: TransicaoX,
    when: 'Use entre seções do reel (Tópico A → Tópico B). Curta, 1.5s, dá ritmo e identidade.',
    sound: 'whoosh forte',
    soundDefault: true,
    code: '<TransicaoX />  // 1.5s',
  },
  {
    id: 'end-card',
    name: '10 · End Card / CTA',
    role: 'Encerramento marcante',
    duration: 5,
    component: EndCard,
    when: 'Use nos últimos 3-5 segundos. Tagline + handle + CTA. Fundo oliva força contraste com o que veio antes.',
    sound: 'thud + click final',
    soundDefault: true,
    code: '<EndCard />  // 5s · fundo olive',
  },
];

// ──────────────────────────────────────────────────────────────────────────
// SCENE CARD — preview + controls per component
// ──────────────────────────────────────────────────────────────────────────
function SceneCard({ scene }) {
  const Component = scene.component;
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [sound, setSound] = useState(scene.soundDefault);
  const lastTickRef = useRef(performance.now());
  const rafRef = useRef(null);

  // Playback loop
  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    lastTickRef.current = performance.now();
    const loop = (now) => {
      const dt = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      setTime((t) => {
        const next = t + dt;
        if (next >= scene.duration) {
          return 0; // loop
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => rafRef.current && cancelAnimationFrame(rafRef.current);
  }, [playing, scene.duration]);

  const togglePlay = () => setPlaying((p) => !p);
  const reset = () => { setTime(0); setPlaying(false); };

  // Stage scaling — 1080×1920 inside ~320×570 frame
  const stageW = 1080, stageH = 1920;
  const previewW = 360;
  const previewH = previewW * (stageH / stageW);

  return (
    <article style={{
      background: C.graphite,
      border: `0.5px solid ${C.border2}`,
      borderRadius: 14,
      overflow: 'hidden',
      display: 'grid',
      gridTemplateColumns: `${previewW + 40}px 1fr`,
      gap: 32,
      padding: 28,
      minHeight: previewH + 60,
    }}>
      {/* Preview frame (9:16 stage scaled) */}
      <div>
        <div style={{
          width: previewW,
          height: previewH,
          background: '#000',
          borderRadius: 10,
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '0 18px 60px rgba(0,0,0,0.5)',
          border: `0.5px solid ${C.border2}`,
        }}>
          {/* Scaled stage */}
          <div style={{
            width: stageW,
            height: stageH,
            transform: `scale(${previewW/stageW})`,
            transformOrigin: 'top left',
            position: 'absolute',
            top: 0, left: 0,
          }}>
            <TimelineContext.Provider value={{ time, duration: scene.duration, playing }}>
              <Component />
            </TimelineContext.Provider>
          </div>

          {/* Safe-zone hint overlay (toggleable later if needed) */}
          <div style={{
            position:'absolute',
            top: 250 * (previewW/stageW),
            left: 80 * (previewW/stageW),
            right: 80 * (previewW/stageW),
            bottom: 310 * (previewW/stageW),
            border: `1px dashed rgba(122,158,63,0.18)`,
            pointerEvents:'none',
          }}/>
        </div>

        {/* Transport controls */}
        <div style={{
          width: previewW,
          marginTop: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <button
            onClick={togglePlay}
            style={{
              width: 40, height: 40,
              borderRadius: '50%',
              background: C.olive,
              color: C.ink,
              border: 'none',
              fontFamily: F.sans,
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              flexShrink: 0,
            }}>{playing ? '❚❚' : '▶'}</button>
          <button
            onClick={reset}
            style={{
              width: 32, height: 32,
              borderRadius: '50%',
              background: 'transparent',
              color: C.muted,
              border: `1px solid ${C.border2}`,
              cursor: 'pointer',
              fontSize: 14,
              flexShrink: 0,
            }}>↺</button>
          <input
            type="range"
            min={0}
            max={scene.duration}
            step={0.01}
            value={time}
            onChange={(e) => { setPlaying(false); setTime(parseFloat(e.target.value)); }}
            style={{ flex: 1, accentColor: C.olive }}
          />
          <span style={{
            fontFamily: F.mono,
            fontSize: 11,
            color: C.muted,
            minWidth: 64,
            textAlign: 'right',
          }}>{time.toFixed(1)}s / {scene.duration}s</span>
        </div>
      </div>

      {/* Info panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
        <div>
          <div style={{
            fontFamily: F.mono,
            fontSize: 11,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: C.olive,
            marginBottom: 6,
            fontWeight: 500,
          }}>{scene.role}</div>
          <div style={{
            fontFamily: F.sans,
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: '-0.025em',
            lineHeight: 1.1,
            color: C.white,
          }}>{scene.name}</div>
        </div>

        {/* Metadata strip */}
        <div style={{
          display:'grid',
          gridTemplateColumns:'repeat(3, max-content)',
          gap: 24,
          padding: '12px 0',
          borderTop: `0.5px solid ${C.border}`,
          borderBottom: `0.5px solid ${C.border}`,
        }}>
          <Meta k="Duração" v={`${scene.duration}s`} />
          <Meta k="Formato" v="9:16 · 1080×1920" />
          <Meta k="Easing" v="ease-out (back/cubic)" />
        </div>

        <div>
          <div style={{
            fontFamily: F.mono,
            fontSize: 10,
            letterSpacing:'0.14em',
            textTransform:'uppercase',
            color: C.muted,
            marginBottom: 8,
          }}>— Quando usar</div>
          <div style={{
            fontFamily: F.sans,
            fontSize: 14,
            lineHeight: 1.65,
            color: C.light,
            maxWidth: 520,
          }}>{scene.when}</div>
        </div>

        {/* Sound cue toggle */}
        <div style={{
          display:'flex', alignItems:'center', gap: 14,
          padding: '14px 18px',
          background: C.ink,
          border: `0.5px solid ${C.border}`,
          borderRadius: 8,
          maxWidth: 520,
        }}>
          <button
            onClick={() => setSound(s => !s)}
            style={{
              width: 36, height: 20,
              borderRadius: 10,
              background: sound ? C.olive : C.border2,
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 0.2s',
              flexShrink: 0,
            }}>
            <span style={{
              position:'absolute',
              top: 2, left: sound ? 18 : 2,
              width: 16, height: 16,
              borderRadius: '50%',
              background: sound ? C.ink : C.muted,
              transition: 'left 0.2s',
            }}/>
          </button>
          <div style={{ flex:1 }}>
            <div style={{
              fontFamily: F.mono,
              fontSize: 10,
              letterSpacing:'0.14em',
              textTransform:'uppercase',
              color: sound ? C.olive : C.muted,
              fontWeight: 500,
              marginBottom: 2,
            }}>Sound cue · {sound ? 'on' : 'off'}</div>
            <div style={{
              fontFamily: F.sans,
              fontSize: 13,
              color: C.muted,
              lineHeight: 1.5,
            }}>{scene.sound}</div>
          </div>
        </div>

        {/* Code snippet (collapsible) */}
        <div>
          <button
            onClick={() => setShowCode(s => !s)}
            style={{
              background:'transparent',
              border:'none',
              color: C.olive,
              fontFamily: F.mono,
              fontSize: 11,
              letterSpacing:'0.14em',
              textTransform:'uppercase',
              cursor: 'pointer',
              padding: 0,
              fontWeight: 500,
            }}>{showCode ? '— ocultar código' : '— ver código'}</button>
          {showCode && (
            <pre style={{
              marginTop: 10,
              padding: '14px 18px',
              background: C.ink,
              border: `0.5px solid ${C.border}`,
              borderRadius: 8,
              fontFamily: F.mono,
              fontSize: 12,
              color: C.oliveSoft,
              overflowX: 'auto',
              maxWidth: 520,
            }}>{scene.code}</pre>
          )}
        </div>
      </div>
    </article>
  );
}

function Meta({ k, v }) {
  return (
    <div>
      <div style={{
        fontFamily: F.mono,
        fontSize: 9,
        letterSpacing:'0.14em',
        textTransform:'uppercase',
        color: C.subtle,
        marginBottom: 2,
      }}>{k}</div>
      <div style={{
        fontFamily: F.sans,
        fontSize: 13,
        color: C.light,
        fontWeight: 500,
      }}>{v}</div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// PAGE
// ──────────────────────────────────────────────────────────────────────────
function App() {
  return (
    <div style={{ minHeight:'100vh', background: C.ink, color: C.white }}>
      {/* HEADER */}
      <header style={{
        padding: '80px 64px 60px',
        maxWidth: 1400,
        margin: '0 auto',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* X watermark */}
        <div style={{
          position:'absolute',
          right: -80, bottom: -120,
          fontFamily: F.sans,
          fontStyle: 'italic',
          fontWeight: 300,
          fontSize: 560,
          lineHeight: 0.8,
          color: C.olive,
          opacity: 0.06,
          pointerEvents: 'none',
          letterSpacing:'-0.08em',
          userSelect:'none',
        }}>X</div>

        <div style={{ position:'relative', zIndex: 1 }}>
          <div style={{
            fontFamily: F.mono,
            fontSize: 11,
            letterSpacing:'0.20em',
            textTransform:'uppercase',
            color: C.olive,
            marginBottom: 28,
            display:'flex', alignItems:'center', gap: 14,
            fontWeight: 500,
          }}>
            <span style={{ display:'inline-flex', gap: 4 }}>
              <span style={{ width:5, height:5, background:C.olive, borderRadius:'50%' }}/>
              <span style={{ width:5, height:5, background:C.olive, borderRadius:'50%', opacity:0.55 }}/>
              <span style={{ width:5, height:5, background:C.olive, borderRadius:'50%', opacity:0.25 }}/>
            </span>
            Motion Kit v1.0 · Biblioteca de animações
          </div>
          <h1 style={{
            fontFamily: F.sans,
            fontSize: 96,
            fontWeight: 700,
            letterSpacing:'-0.05em',
            lineHeight: 0.95,
            marginBottom: 32,
            display:'flex', alignItems:'baseline',
            color: C.white,
          }}>CE<span style={{ color:C.olive }}>.</span><span style={{ color:C.olive }}>X</span></h1>
          <p style={{
            fontFamily: F.sans,
            fontSize: 22,
            color: C.light,
            lineHeight: 1.5,
            maxWidth: 680,
            paddingLeft: 22,
            borderLeft: `2px solid ${C.olive}`,
          }}>
            Dez animações construídas na identidade CE.X para usar em Reels.<br/>
            Cada componente <span style={{ fontStyle:'italic', color: C.olive, fontWeight: 700 }}>entra do zero</span> sincronizado com sua fala.
          </p>

          <div style={{
            marginTop: 56,
            display:'grid',
            gridTemplateColumns:'repeat(4, max-content)',
            gap: 48,
            paddingTop: 28,
            borderTop: `0.5px solid ${C.border2}`,
          }}>
            <Stat n="10" label="Componentes" />
            <Stat n="9:16" label="Formato fixo" />
            <Stat n="1080" label="× 1920 px" />
            <Stat n="Inter" label="Tipografia única" />
          </div>
        </div>
      </header>

      {/* PRINCÍPIOS */}
      <section style={{ padding:'80px 64px 0', maxWidth: 1400, margin:'0 auto' }}>
        <SectionHead num="01" title="Princípios" em="de movimento" />
        <div style={{
          display:'grid',
          gridTemplateColumns:'repeat(4, 1fr)',
          gap: 16,
          marginTop: 32,
        }}>
          <Principle n="01" h="Construção, não decoração"
            d="Cada elemento entra no momento em que a fala precisa dele. Sem animação ornamental." />
          <Principle n="02" h="Editorial, sem ruído"
            d="Tipografia respira. Easing ease-out (back/cubic) para naturalidade. Sem bounces exagerados." />
          <Principle n="03" h="Cor com economia"
            d="Oliva (#7A9E3F) só em palavra-chave ou destaque. Fundo é sempre Ink ou Creme." />
          <Principle n="04" h="Itálico = agir divino"
            d="O itálico nunca é decorativo. Marca o que escapa ao nosso controle — o X da equação." />
        </div>
      </section>

      {/* COMPONENTES */}
      <section style={{ padding:'80px 64px 0', maxWidth: 1400, margin:'0 auto' }}>
        <SectionHead num="02" title="Componentes" em="essenciais" />
        <p style={{
          fontFamily: F.sans,
          fontSize: 15,
          color: C.muted,
          lineHeight: 1.7,
          maxWidth: 640,
          marginTop: 14,
        }}>
          Cada card abaixo é um componente independente. Toque ▶ para ver a animação rodar do zero. Arraste o scrubber para inspecionar quadro a quadro.
        </p>

        <div style={{
          display:'flex',
          flexDirection:'column',
          gap: 20,
          marginTop: 40,
        }}>
          {SCENES.map(scene => <SceneCard key={scene.id} scene={scene} />)}
        </div>
      </section>

      {/* FLUXO DE USO */}
      <section style={{ padding:'120px 64px 0', maxWidth: 1400, margin:'0 auto' }}>
        <SectionHead num="03" title="Fluxo" em="de produção" />
        <div style={{
          marginTop: 32,
          display:'grid',
          gridTemplateColumns:'repeat(4, 1fr)',
          gap: 16,
        }}>
          <FlowStep n="01" h="Você grava"
            d="Faça o reel falando como sempre. Não precisa marcar pausa pra animação." />
          <FlowStep n="02" h="Envia pro Claude"
            d="Mande o vídeo + uma breve nota do que é (tópico, série, intenção)." />
          <FlowStep n="03" h="Claude analisa"
            d="Identifica picos da fala, estatísticas, citações bíblicas, palavras-chave." />
          <FlowStep n="04" h="Animações sincronizadas"
            d="Cada elemento entra no momento exato — usando os 10 componentes desta biblioteca." />
        </div>
      </section>

      {/* TONE / NÃO FAZER */}
      <section style={{ padding:'120px 64px 0', maxWidth: 1400, margin:'0 auto' }}>
        <SectionHead num="04" title="Limites" em="inegociáveis" />
        <div style={{
          marginTop: 32,
          display:'grid',
          gridTemplateColumns:'1fr 1fr',
          gap: 16,
        }}>
          <RuleCard kind="yes" h="Faça">
            <li>Anime palavras-chave em itálico oliva</li>
            <li>Use ease-out — entrada acelera e desacelera natural</li>
            <li>Sincronize a animação ao tempo da fala</li>
            <li>Respeite as margens seguras (250px topo, 310px base)</li>
            <li>Entre do zero — não pré-construa</li>
          </RuleCard>
          <RuleCard kind="no" h="Não faça">
            <li>Animar emoji ou stickers</li>
            <li>Bounces exagerados (ease back só para entradas curtas)</li>
            <li>Mais de uma palavra destacada por frase</li>
            <li>Trocar tipografia ou cor fora da paleta</li>
            <li>Animações que duram mais que a fala</li>
          </RuleCard>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        marginTop: 140,
        padding: '80px 64px 64px',
        borderTop: `0.5px solid ${C.border2}`,
        maxWidth: 1400,
        margin: '140px auto 0',
        display:'flex',
        justifyContent:'space-between',
        alignItems:'flex-end',
      }}>
        <div style={{
          fontFamily: F.sans,
          fontSize: 64,
          fontWeight: 700,
          letterSpacing:'-0.05em',
          lineHeight: 1,
          color: C.white,
          display:'inline-flex', alignItems:'baseline',
        }}>CE<span style={{color:C.olive}}>.</span><span style={{color:C.olive}}>X</span></div>
        <div style={{ textAlign:'right' }}>
          <div style={{
            fontFamily: F.mono,
            fontSize: 10,
            letterSpacing:'0.16em',
            textTransform:'uppercase',
            color: C.subtle,
            marginBottom: 6,
          }}>Motion Kit</div>
          <div style={{
            fontFamily: F.mono,
            fontSize: 13,
            color: C.olive,
            letterSpacing:'0.04em',
          }}>v1.0 · 2026</div>
        </div>
      </footer>
    </div>
  );
}

// Atoms
function Stat({ n, label }) {
  return (
    <div>
      <div style={{
        fontFamily: F.sans,
        fontSize: 44,
        fontWeight: 700,
        letterSpacing:'-0.04em',
        color: C.white,
        lineHeight: 1,
      }}>{n}</div>
      <div style={{
        fontFamily: F.mono,
        fontSize: 10,
        letterSpacing:'0.14em',
        textTransform:'uppercase',
        color: C.muted,
        marginTop: 8,
      }}>{label}</div>
    </div>
  );
}

function SectionHead({ num, title, em }) {
  return (
    <div style={{
      display:'grid',
      gridTemplateColumns:'120px 1fr',
      gap: 32,
      alignItems:'baseline',
      paddingBottom: 24,
      borderBottom: `0.5px solid ${C.border2}`,
    }}>
      <div style={{
        fontFamily: F.mono,
        fontSize: 12,
        color: C.olive,
        letterSpacing:'0.08em',
      }}>§ {num}</div>
      <h2 style={{
        fontFamily: F.sans,
        fontSize: 56,
        fontWeight: 700,
        letterSpacing:'-0.04em',
        lineHeight: 0.95,
        color: C.white,
      }}>{title} <span style={{ fontStyle:'italic', color: C.olive }}>{em}</span></h2>
    </div>
  );
}

function Principle({ n, h, d }) {
  return (
    <div style={{
      background: C.graphite,
      border: `0.5px solid ${C.border2}`,
      borderRadius: 14,
      padding: 28,
    }}>
      <div style={{
        fontFamily: F.mono,
        fontSize: 11,
        color: C.olive,
        letterSpacing:'0.08em',
        marginBottom: 16,
        fontWeight: 500,
      }}>— {n}</div>
      <div style={{
        fontFamily: F.sans,
        fontSize: 22,
        fontWeight: 700,
        letterSpacing:'-0.025em',
        lineHeight: 1.15,
        color: C.white,
        marginBottom: 12,
      }}>{h}</div>
      <div style={{
        fontFamily: F.sans,
        fontSize: 13,
        color: C.muted,
        lineHeight: 1.65,
      }}>{d}</div>
    </div>
  );
}

function FlowStep({ n, h, d }) {
  return (
    <div style={{
      position: 'relative',
      paddingTop: 30,
      borderTop: `1px solid ${C.olive}`,
    }}>
      <div style={{
        position: 'absolute',
        top: -6, left: 0,
        width: 10, height: 10,
        background: C.olive,
        borderRadius: '50%',
      }}/>
      <div style={{
        fontFamily: F.mono,
        fontSize: 11,
        color: C.olive,
        letterSpacing:'0.08em',
        marginBottom: 14,
        fontWeight: 500,
      }}>STEP {n}</div>
      <div style={{
        fontFamily: F.sans,
        fontSize: 24,
        fontWeight: 700,
        letterSpacing:'-0.025em',
        lineHeight: 1.15,
        color: C.white,
        marginBottom: 10,
      }}>{h}</div>
      <div style={{
        fontFamily: F.sans,
        fontSize: 14,
        color: C.muted,
        lineHeight: 1.65,
      }}>{d}</div>
    </div>
  );
}

function RuleCard({ kind, h, children }) {
  const accent = kind === 'yes' ? C.olive : '#FF6B6B';
  return (
    <div style={{
      background: C.graphite,
      border: `0.5px solid ${C.border2}`,
      borderLeft: `2px solid ${accent}`,
      borderRadius: 14,
      padding: '32px 36px',
    }}>
      <div style={{
        fontFamily: F.mono,
        fontSize: 11,
        color: accent,
        letterSpacing:'0.14em',
        textTransform:'uppercase',
        marginBottom: 18,
        fontWeight: 500,
      }}>— {h}</div>
      <ul style={{
        listStyle:'none',
        display:'flex',
        flexDirection:'column',
        gap: 10,
      }}>
        {React.Children.map(children, (child) => (
          <li style={{
            fontFamily: F.sans,
            fontSize: 15,
            color: C.light,
            lineHeight: 1.55,
            paddingLeft: 22,
            position:'relative',
          }}>
            <span style={{
              position:'absolute',
              left: 0, top: 0,
              color: accent,
              fontFamily: F.mono,
              fontWeight: 500,
            }}>{kind === 'yes' ? '+' : '×'}</span>
            {child.props.children}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Render
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
