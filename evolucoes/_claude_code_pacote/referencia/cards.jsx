/* ───────────────────────────────────────────────────────────
   CE.X · Sistema de banners dos cards
   Esqueleto fixo + miolo que varia (modelos A · B · C · D)
   ─────────────────────────────────────────────────────────── */

const cexTok = {
  ink:      '#0E110D',
  graphite: '#181B16',
  graphite2:'#14170F',
  border:   '#25291F',
  border2:  '#2E3327',
  olive:    '#7A9E3F',
  oliveSoft:'#94B85C',
  oliveDeep:'#4F6B26',
  cream:    '#EDE6D3',
  creamSoft:'#F6F1E0',
  sand:     '#C9BFA0',
  white:    '#FAFAF7',
  muted:    '#8B8C82',
  subtle:   '#555650',
  sans: "'Inter', -apple-system, sans-serif",
  mono: "'Fira Code', 'SF Mono', monospace",
};

/* ── PALETA ESTENDIDA · acentos terrosos, irmãos da oliva ──
   Mesma maturidade/dessaturação. Usados SÓ como acento (etiqueta,
   número, ◆, bloco do modelo B). Ink + Creme continuam dominando. */
const cexAccents = {
  olive: { base: '#7A9E3F', deep: '#4F6B26', name: 'Oliva' },   // núcleo / Jovens
  clay:  { base: '#B07355', deep: '#7C4B33', name: 'Argila' },  // Adolescentes
  ochre: { base: '#C0934E', deep: '#8A6630', name: 'Ocre' },    // Juniores
  pine:  { base: '#4F7264', deep: '#335147', name: 'Pinho' }, // Igreja toda
  slate: { base: '#5C7488', deep: '#3C4E5C', name: 'Ardósia' },// Para liderar
};

/* marca CE.X — CE.X tudo 700, ponto + X em oliva, sem itálico (regra da marca) */
function LogoMini({ size = 13 }) {
  return (
    <span style={{ fontFamily: cexTok.sans, fontWeight: 700, fontSize: size,
      letterSpacing: '-0.02em', color: cexTok.white, lineHeight: 1 }}>
      CE<span style={{ color: cexTok.olive }}>.X</span>
    </span>
  );
}

const CARD_W = 320;
const ART_H  = 300;
const FOOT_H = 150;

/* ── Rodapé FIXO — igual em todos os cards (a "família") ── */
function CardFooter({ meta, preco, accent = cexAccents.olive }) {
  return (
    <div style={{
      height: FOOT_H, background: cexTok.graphite, borderTop: `1px solid ${cexTok.border}`,
      padding: '22px 24px', display: 'flex', flexDirection: 'column',
      justifyContent: 'space-between', boxSizing: 'border-box',
    }}>
      <div style={{ fontFamily: cexTok.mono, fontSize: 11.5, letterSpacing: '0.03em',
        color: cexTok.muted, lineHeight: 1.5 }}>{meta}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: cexTok.sans, fontWeight: 600, fontSize: 19,
          color: cexTok.white, letterSpacing: '-0.01em' }}>{preco}</span>
        <span style={{ fontFamily: cexTok.mono, fontSize: 11, letterSpacing: '0.06em',
          color: accent.base, textTransform: 'uppercase' }}>Ver material →</span>
      </div>
    </div>
  );
}

function CardFrame({ children }) {
  return (
    <div style={{
      width: CARD_W, borderRadius: 10, overflow: 'hidden',
      border: `1px solid ${cexTok.border}`, background: cexTok.graphite,
      boxShadow: '0 1px 0 rgba(255,255,255,0.02), 0 20px 40px -28px rgba(0,0,0,0.8)',
    }}>{children}</div>
  );
}

/* etiqueta-marca: ◆ + texto mono no topo do miolo */
function Eyebrow({ children, color = cexTok.olive }) {
  return (
    <div style={{ fontFamily: cexTok.mono, fontSize: 11, letterSpacing: '0.14em',
      textTransform: 'uppercase', color, display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 9 }}>◆</span>{children}
    </div>
  );
}

/* ═══════════ MODELO A · TIPOGRÁFICO ═══════════
   Título gigante é a arte. Pro nome que já é o gancho. */
function ArtA({ etiqueta, titulo, code, accent = cexAccents.olive }) {
  return (
    <div style={{ height: ART_H, background: cexTok.ink, padding: 24, position: 'relative',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Eyebrow color={accent.base}>{etiqueta}</Eyebrow>
        <span style={{ fontFamily: cexTok.mono, fontSize: 10, color: cexTok.subtle, letterSpacing: '0.08em' }}>{code}</span>
      </div>
      <div style={{ fontFamily: cexTok.sans, fontWeight: 800, fontSize: 52, lineHeight: 0.9,
        letterSpacing: '-0.035em', color: cexTok.cream, textWrap: 'balance' }}>{titulo}</div>
    </div>
  );
}

/* ═══════════ MODELO B · BLOCO OLIVA ═══════════
   Único modelo que usa cor cheia. Texto sobre oliva = tinta escura. */
function ArtB({ etiqueta, titulo, code, accent = cexAccents.olive }) {
  return (
    <div style={{ height: ART_H, background: cexTok.ink, position: 'relative', boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: accent.base, padding: '20px 24px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: cexTok.mono, fontSize: 11, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: cexTok.ink, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 9 }}>◆</span>{etiqueta}
        </div>
        <span style={{ fontFamily: cexTok.mono, fontSize: 10, color: 'rgba(14,17,13,0.5)', letterSpacing: '0.08em' }}>{code}</span>
      </div>
      <div style={{ flex: 1, padding: 24, display: 'flex', alignItems: 'flex-end' }}>
        <div style={{ fontFamily: cexTok.sans, fontWeight: 800, fontSize: 46, lineHeight: 0.92,
          letterSpacing: '-0.035em', color: cexTok.cream, textWrap: 'balance' }}>{titulo}</div>
      </div>
    </div>
  );
}

/* ═══════════ MODELO C · NÚMERO / ÍNDICE ═══════════
   Estrutural. Pro material onde "6 encontros / 40 páginas" já atrai. */
function ArtC({ etiqueta, titulo, big, bigLabel, accent = cexAccents.olive }) {
  return (
    <div style={{ height: ART_H, background: cexTok.graphite2, padding: 24, position: 'relative',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box',
      backgroundImage: `linear-gradient(${cexTok.border} 1px, transparent 1px)`, backgroundSize: '100% 38px' }}>
      <Eyebrow color={cexTok.sand}>{etiqueta}</Eyebrow>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ fontFamily: cexTok.sans, fontWeight: 800, fontSize: 92, lineHeight: 0.8,
          color: accent.base, letterSpacing: '-0.05em' }}>{big}</span>
        <span style={{ fontFamily: cexTok.mono, fontSize: 12, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: cexTok.muted, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{bigLabel}</span>
      </div>
      <div style={{ fontFamily: cexTok.sans, fontWeight: 700, fontSize: 26, lineHeight: 1,
        letterSpacing: '-0.02em', color: cexTok.cream }}>{titulo}</div>
    </div>
  );
}

/* ═══════════ MODELO D · FOTO ═══════════
   Pra quando entrar arte/foto real. Aqui placeholder. */
function ArtD({ etiqueta, titulo, accent = cexAccents.olive }) {
  return (
    <div style={{ height: ART_H, position: 'relative', overflow: 'hidden',
      background: `radial-gradient(120% 80% at 30% 20%, ${accent.deep} 0%, ${cexTok.ink} 60%)` }}>
      {/* textura sutil */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.5,
        backgroundImage: `repeating-linear-gradient(45deg, rgba(255,255,255,0.025) 0 2px, transparent 2px 9px)` }} />
      <div style={{ position: 'absolute', inset: 0,
        background: `linear-gradient(180deg, rgba(14,17,13,0.1) 0%, rgba(14,17,13,0.9) 100%)` }} />
      <div style={{ position: 'absolute', inset: 0, padding: 24, display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', boxSizing: 'border-box' }}>
        <Eyebrow color={cexTok.creamSoft}>{etiqueta}</Eyebrow>
        <div>
          <div style={{ fontFamily: cexTok.mono, fontSize: 10, color: 'rgba(246,241,224,0.5)',
            letterSpacing: '0.1em', marginBottom: 10 }}>[ foto / arte real da igreja ]</div>
          <div style={{ fontFamily: cexTok.sans, fontWeight: 800, fontSize: 44, lineHeight: 0.92,
            letterSpacing: '-0.035em', color: cexTok.white, textWrap: 'balance' }}>{titulo}</div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════ CARD DE CURSO ═══════════
   Mesma moldura/família dos materiais, mas miolo e rodapé de CURSO:
   número = etapa da trilha · meta = semanas + ao vivo/mentoria · sem preço (turma). */
function CourseCard({ accent = 'olive', nivel, num, titulo, desc, semanas }) {
  const ac = cexAccents[accent] || cexAccents.olive;
  return (
    <CardFrame>
      {/* miolo */}
      <div style={{ height: ART_H, background: cexTok.ink, padding: 24, position: 'relative',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box',
        backgroundImage: `linear-gradient(${cexTok.border} 1px, transparent 1px)`, backgroundSize: '100% 44px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Eyebrow color={ac.base}>{nivel}</Eyebrow>
          {/* selo sólido = sinal claro de "ativo / ao vivo" */}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: ac.base,
            color: cexTok.ink, fontFamily: cexTok.mono, fontSize: 10, fontWeight: 600, letterSpacing: '0.1em',
            textTransform: 'uppercase', padding: '5px 9px', borderRadius: 4 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: cexTok.ink, display: 'inline-block' }} />
            Ao vivo
          </span>
        </div>
        <div>
          <div style={{ fontFamily: cexTok.sans, fontWeight: 800, fontSize: 30, lineHeight: 0.98,
            letterSpacing: '-0.03em', color: cexTok.cream, textWrap: 'balance', marginBottom: 12 }}>{titulo}</div>
          <div style={{ fontFamily: cexTok.sans, fontWeight: 400, fontSize: 14, lineHeight: 1.45,
            color: cexTok.sand }}>{desc}</div>
        </div>
      </div>
      {/* rodapé de curso */}
      <div style={{ height: FOOT_H, background: cexTok.graphite, borderTop: `1px solid ${cexTok.border}`,
        padding: '22px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: cexTok.mono, fontSize: 11.5,
          letterSpacing: '0.03em', color: cexTok.muted }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: ac.base, display: 'inline-block' }} />
          {semanas} semanas · Mentoria inclusa
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: cexTok.mono, fontSize: 11, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: ac.base, fontWeight: 500 }}>Etapa {num}</span>
          <span style={{ fontFamily: cexTok.mono, fontSize: 11, letterSpacing: '0.06em',
            color: cexTok.cream, textTransform: 'uppercase' }}>Detalhes →</span>
        </div>
      </div>
    </CardFrame>
  );
}

/* ── Card completo: escolhe o miolo pelo campo `model` ── */
function CardCEX({ model = 'A', accent = 'olive', ...p }) {
  const ac = cexAccents[accent] || cexAccents.olive;
  const art = {
    A: <ArtA {...p} accent={ac} />, B: <ArtB {...p} accent={ac} />,
    C: <ArtC {...p} accent={ac} />, D: <ArtD {...p} accent={ac} />,
  }[model];
  return (
    <CardFrame>
      {art}
      <CardFooter meta={p.meta} preco={p.preco} accent={ac} />
    </CardFrame>
  );
}

/* cabeçalho de estante */
function ShelfHead({ nome, count, accent = cexAccents.olive }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 22 }}>
      <span style={{ fontFamily: cexTok.mono, fontSize: 13, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: accent.base, fontWeight: 500 }}>{nome}</span>
      <span style={{ fontFamily: cexTok.mono, fontSize: 12, color: cexTok.subtle }}>{count} materiais</span>
    </div>
  );
}

Object.assign(window, { CardCEX, CourseCard, ShelfHead, LogoMini, cexTok, cexAccents, CARD_W });
