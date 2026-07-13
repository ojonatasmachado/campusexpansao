'use client'
import { useLayoutEffect, useState, useRef, useEffect, useTransition, useCallback, type ReactNode, type CSSProperties, type ClipboardEvent } from 'react'
import {
  createAdminInvite,
  regenerateAdminInvite,
  deleteAdminUser,
  deleteStudioTemplate,
  loginAction,
  logoutAction,
  reorderEstantes,
  updateAdminUser,
  upsertEstante,
  upsertMaterial,
  upsertCurso,
  upsertMentoria,
  deleteEstante,
  deleteMaterial,
  deleteCurso,
  deleteMentoria,
  upsertStudioTemplate,
  type AdminMetrics,
  type AdminSession,
  type AdminUser,
  type StudioTemplate,
} from './actions'
import { ESTANTE_MAP } from '../../lib/materiais-data'
import Logo from '../../components/Logo'
import ThemeToggle from '../../components/ThemeToggle'
import { roteiroToPdfBlob } from './lib/roteiro-to-pdf'

// ── TYPES ────────────────────────────────────────────────────────────────────

type Modelo = 'A' | 'B' | 'C' | 'D'
type ItemType = 'material' | 'curso' | 'mentoria' | 'evento'
type CatalogItemType = Exclude<ItemType, 'evento'>
type MaterialContentKind = 'word' | 'pdf' | 'ppt' | 'design'
type StudioDocumentModel = 'branco' | 'devocional' | 'aula' | 'mensagem'
type StudioMode = 'document' | 'slides' | 'design'
type MaterialMessage = { nome: string; desc: string }

interface MaterialContent {
  kind: MaterialContentKind
  name: string
  note: string
  pages?: number | null
  messages?: number | null
  slides?: number | null
  designs?: number | null
  designFormat?: 'carousel' | 'stories' | 'telao' | null
  delivery?: 'word' | 'pdf' | null
  file?: string | null
  roteiro?: string | null
  payload?: Record<string, unknown> | null
}

interface Material {
  id: string; type: 'material'; family: string; shelf: string; code: string
  title: string; desc: string; messages: number | null; pages: number
  formats: string[]; price: number; hotmart: string; accent: string; image: string | null
  model: Modelo; big: number | null; bigLabel: string
  messageList: MaterialMessage[]
  paraQuem: string; beneficios: string[]; contents: MaterialContent[]
  depoimento: { texto: string; autor: string }
  faq: { q: string; a: string }[]
  keywords: string[]
  status: string; views: number; buyClicks: number; purchases: number
}
interface Curso {
  id: string; type: 'curso'; level: string; etapa: number; totalEtapas: number
  title: string; desc: string; promessa: string; weeks: number; mentoria: boolean; aoVivo: boolean
  mentor: string; mentorBio: string; formato: string; accent: string; image: string | null
  status: string; views: number; waitlist: number
  paraQuem: string; depoimento: { texto: string; autor: string; cargo: string }
  ementa: { titulo: string; desc: string }[]; proximaTurma: string
  keywords: string[]
}
interface Mentoria {
  id: string; type: 'mentoria'; title: string; desc: string
  formato: string; vagas: number; mentor: string; accent: string
  image: string | null; status: string; views: number; waitlist: number; cadencia: string
  keywords: string[]
}
interface Evento {
  id: string; type: 'evento'; title: string; desc: string
  data: string; local: string; vagas: number; accent: string; image: string | null
  status: string; views: number; inscritos: number; hotmart: string
}
type Item = Material | Curso | Mentoria | Evento

interface EstanteAdmin {
  key: string; label: string; familia: 'ministrar' | 'liderar'
  accent: string; faixaEtaria: string
  status: 'visible' | 'hidden'; order: number
}

interface AdminData {
  materiais: Material[]; cursos: Curso[]; mentorias: Mentoria[]; eventos: Evento[]
  estantes: EstanteAdmin[]
  adminUsers: AdminUser[]
  studioTemplates: StudioTemplate[]
  metrics: AdminMetrics
}

// ── PALETA ───────────────────────────────────────────────────────────────────

const AC = {
  olive: '#7A9E3F', oliveDeep: '#4F6B26', clay: '#C5805A', wheat: '#CBA95C',
  sand: '#E2D6B4', terra: '#B5694A', amber: '#D6A23E', rust: '#9C5A33', cocoa: '#6F523A',
}
const MINISTRAR_ACCENT: Record<string, string> = {
  'Berçário': AC.wheat, 'Maternal': AC.wheat, 'Primários': AC.wheat,
  'Juniores': AC.sand, 'Adolescentes': AC.clay, 'Jovens': AC.olive, 'Igreja toda': AC.terra,
}
const LIDERAR_ACCENT: Record<string, string> = {
  'Manuais': AC.clay, 'Criar ministério': AC.terra, 'Modelos & Checklists': AC.sand, 'Montar evento': AC.wheat,
}
const LEVEL_ACCENT: Record<string, string> = {
  'Fundação': AC.wheat, 'Liderança': AC.clay, 'Multiplicação': AC.olive,
}
const SHELVES: Record<string, string[]> = {
  'Para ministrar': ['Berçário', 'Maternal', 'Primários', 'Juniores', 'Adolescentes', 'Jovens', 'Igreja toda'],
  'Para liderar': ['Manuais', 'Criar ministério', 'Modelos & Checklists', 'Montar evento'],
}
const ACCENT_NAME: Record<string, string> = {
  [AC.olive]: 'Oliva', [AC.clay]: 'Argila', [AC.wheat]: 'Trigo', [AC.sand]: 'Areia',
  [AC.terra]: 'Terracota', [AC.amber]: 'Âmbar', [AC.rust]: 'Ferrugem', [AC.cocoa]: 'Cacau',
}

function accentFor(item: Partial<Item> | null): string {
  if (!item) return AC.olive
  if (item.type === 'material') {
    const m = item as Partial<Material>
    return m.family === 'Para liderar'
      ? (LIDERAR_ACCENT[m.shelf ?? ''] ?? AC.clay)
      : (MINISTRAR_ACCENT[m.shelf ?? ''] ?? AC.olive)
  }
  if (item.type === 'curso') return LEVEL_ACCENT[(item as Partial<Curso>).level ?? ''] ?? AC.olive
  if (item.type === 'evento') return AC.terra
  return AC.olive
}

const TYPES = [
  { key: 'material' as const, plural: 'Materiais', singular: 'material', arr: 'materiais' as const },
  { key: 'curso' as const, plural: 'Cursos', singular: 'curso', arr: 'cursos' as const },
  { key: 'mentoria' as const, plural: 'Mentorias', singular: 'mentoria', arr: 'mentorias' as const },
]

// ── DADOS INICIAIS ────────────────────────────────────────────────────────────

function buildData(): AdminData {
  const series30 = Array(30).fill(0)
  return {
    materiais: [], cursos: [], mentorias: [], eventos: [], estantes: [], adminUsers: [], studioTemplates: [],
    metrics: {
      series30,
      kpis: { visitas:0,visitasDelta:0,cliquesComprar:0,cliquesDelta:0,listaEspera:0,listaDelta:0,capturas:0,capturasDelta:0 },
      funil: [{label:'Visitas ao site',value:0},{label:'Abriu um material',value:0},{label:'Clicou em comprar',value:0},{label:'Compra concluída',value:0}],
      origem: [{label:'Instagram',value:0,color:AC.olive},{label:'Direto',value:0,color:AC.wheat},{label:'Google',value:0,color:AC.clay},{label:'YouTube',value:0,color:AC.oliveDeep}],
      materialViews: {}, materialBuyClicks: {}, materialPurchases: {}, cursoViews: {}, cursoWaitlist: {},
    },
  }
}
function newItem(type: ItemType): Item {
  const base = { id: '', title: '', desc: '', image: null, status: 'Rascunho', views: 0 }
  if (type === 'material') {
    const family = 'Para ministrar', shelf = 'Juniores'
    return { ...base, type: 'material', family, shelf, code: '', messages: null, pages: 0,
      formats: ['PDF'], price: 0, hotmart: '', accent: accentFor({ type: 'material', family, shelf } as Material),
      buyClicks: 0, purchases: 0, model: 'A', big: null, bigLabel: 'mensagens', messageList: [], paraQuem: '',
      beneficios: ['Editável e pronto pra aplicar na sua igreja', 'White-label CE.X: coloque a marca do seu ministério'],
      contents: [],
      depoimento: { texto: '', autor: '' }, faq: [], keywords: [] } as Material
  }
  if (type === 'curso') {
    return { ...base, type: 'curso', level: 'Fundação', etapa: 1, totalEtapas: 6, weeks: 4,
      mentoria: true, aoVivo: true, mentor: '', mentorBio: '', formato: '', promessa: '',
      accent: accentFor({ type: 'curso', level: 'Fundação' } as Curso),
      waitlist: 0, ementa: [{ titulo: '', desc: '' }, { titulo: '', desc: '' }, { titulo: '', desc: '' }, { titulo: '', desc: '' }],
      paraQuem: '', depoimento: { texto: '', autor: '', cargo: '' },
      proximaTurma: 'Próxima turma: a definir', keywords: [] } as Curso
  }
  if (type === 'mentoria') {
    return { ...base, type: 'mentoria', formato: 'Grupo · 8 vagas', vagas: 8, mentor: '',
      cadencia: 'Encontros quinzenais · 90 min', accent: AC.olive, waitlist: 0, keywords: [] } as Mentoria
  }
  return { ...base, type: 'evento', data: '', local: '', vagas: 100, inscritos: 0,
    hotmart: '', accent: AC.terra } as Evento
}

// ── PREVIEW COMPONENTS ───────────────────────────────────────────────────────

function AutoArt({ accent, label, height = 150, big = false }: { accent: string; label?: string; height?: number; big?: boolean }) {
  return (
    <div className="pv-art" style={{ height }}>
      <div className="pv-art-grid" />
      <div className="pv-art-x" style={{ color: accent, opacity: big ? 0.16 : 0.13, fontSize: big ? 360 : 190 }}>X</div>
      {label && <div className="pv-art-mark" style={{ color: accent }}>◆ {label}</div>}
    </div>
  )
}

function CardMedia({ item, height = 150, big = false, labelOverride }: { item: Item; height?: number; big?: boolean; labelOverride?: string }) {
  const label = labelOverride ?? ((item as Material).shelf ?? (item as Curso).level ?? item.type ?? '').toUpperCase()
  if (item.image) {
    return (
      <div className="pv-art" style={{ height, backgroundImage: `url(${item.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        {label && <div className="pv-art-mark" style={{ color: '#EDE6D3', background: 'rgba(14,17,13,.55)', padding: '4px 10px', borderRadius: 100, backdropFilter: 'blur(6px)' }}>◆ {label}</div>}
      </div>
    )
  }
  return <AutoArt accent={item.accent} label={label} height={height} big={big} />
}

function matMeta(item: Material) {
  const n = item.messages
    ? `${item.messages} ${item.messages === 1 ? 'mensagem' : 'mensagens'}`
    : (item.pages ? `${item.pages} ${item.pages === 1 ? 'página' : 'páginas'}` : null)
  return [n, (item.formats ?? []).join(' · ') || 'PDF'].filter(Boolean).join(' · ')
}

function isMaterialContent(value: unknown): value is MaterialContent {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<MaterialContent>
  return (item.kind === 'word' || item.kind === 'pdf' || item.kind === 'ppt' || item.kind === 'design')
    && typeof item.name === 'string'
}

function normalizeMaterialContents(raw: unknown, fallback: string[] = []): MaterialContent[] {
  if (Array.isArray(raw) && raw.every(isMaterialContent)) {
    return raw.map((item) => ({
      kind: item.kind,
      name: item.name ?? '',
      note: item.note ?? '',
      pages: item.pages ?? null,
      messages: item.messages ?? null,
      slides: item.slides ?? null,
      designs: item.designs ?? null,
      designFormat: item.designFormat ?? null,
      delivery: item.delivery ?? null,
      file: item.file ?? null,
      roteiro: item.roteiro ?? null,
    }))
  }

  return fallback.filter(Boolean).map((name) => ({
    kind: 'pdf',
    name,
    note: '',
    pages: null,
  }))
}

function deriveMaterialContentMeta(contents: MaterialContent[]) {
  const formats = new Set<string>()
  let pages = 0
  let messages = 0
  let hasMessages = false

  contents.forEach((content) => {
    if (content.kind === 'word') {
      formats.add(content.delivery === 'word' ? 'Word' : 'PDF')
      if (content.pages) pages += content.pages
      if (content.messages) {
        messages += content.messages
        hasMessages = true
      }
    }

    if (content.kind === 'pdf') {
      formats.add('PDF')
      if (content.pages) pages += content.pages
    }

    if (content.kind === 'ppt') {
      formats.add('Slides')
    }

    if (content.kind === 'design') {
      formats.add('Design')
    }
  })

  return {
    formats: Array.from(formats),
    pages,
    messages: hasMessages ? messages : null,
  }
}

function materialContentSummary(contents: MaterialContent[], fallback: string[] = []) {
  const rows = contents
    .map((content) => content.note?.trim() || content.name.trim())
    .filter(Boolean)
  return rows.length ? rows : fallback
}

function materialContentMeta(content: MaterialContent) {
  if (content.kind === 'word') {
    return [
      content.messages ? `${content.messages} ${content.messages === 1 ? 'mensagem' : 'mensagens'}` : null,
      content.pages ? `${content.pages} ${content.pages === 1 ? 'página' : 'páginas'}` : null,
      content.delivery === 'word' ? 'Word' : 'PDF',
    ].filter(Boolean).join(' · ')
  }
  if (content.kind === 'pdf') return ['PDF', content.pages ? `${content.pages} ${content.pages === 1 ? 'página' : 'páginas'}` : null].filter(Boolean).join(' · ')
  if (content.kind === 'ppt') return ['Slides', content.slides ? `${content.slides} telas` : null].filter(Boolean).join(' · ')
  return ['Design', content.designs ? `${content.designs} ${content.designs === 1 ? 'arte' : 'artes'}` : null, designFormatLabel(content.designFormat)].filter(Boolean).join(' · ')
}

function materialContentFormatLabel(content: MaterialContent) {
  if (content.kind === 'word') return content.delivery === 'word' ? 'Word' : 'PDF'
  if (content.kind === 'pdf') return 'PDF'
  if (content.kind === 'ppt') return 'Slides'
  return 'Design'
}

function materialMessageFormatRows(contents: MaterialContent[], total: number) {
  const rows: string[] = []
  contents.forEach((content) => {
    if (content.kind !== 'word' && content.kind !== 'pdf') return
    const count = Math.max(0, content.messages ?? (content.kind === 'word' ? 1 : 0))
    for (let i = 0; i < count; i += 1) rows.push(materialContentFormatLabel(content))
  })
  return Array.from({ length: total }, (_, i) => rows[i] ?? 'Material')
}

function designFormatLabel(format?: MaterialContent['designFormat']) {
  if (format === 'stories') return 'Stories'
  if (format === 'telao') return 'Telão'
  return 'Feed'
}

function PreviewFitTitle({
  title,
  max,
  min = 12,
  color = 'var(--cream)',
  weight = 800,
  lineHeight = .92,
  letterSpacing = '-.035em',
  boxStyle,
}: {
  title: string
  max: number
  min?: number
  color?: string
  weight?: number
  lineHeight?: number
  letterSpacing?: string
  boxStyle?: CSSProperties
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const [fontSize, setFontSize] = useState(max)

  useLayoutEffect(() => {
    const box = boxRef.current
    const text = textRef.current
    if (!box || !text) return

    let frame = 0
    const fit = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const width = box.clientWidth
        const height = box.clientHeight
        if (!width || !height) return

        let lo = min
        let hi = max
        let best = min

        for (let i = 0; i < 12; i += 1) {
          const mid = (lo + hi) / 2
          text.style.fontSize = `${mid}px`

          const fitsWidth = text.scrollWidth <= width + 0.5
          const fitsHeight = text.scrollHeight <= height + 0.5

          if (fitsWidth && fitsHeight) {
            best = mid
            lo = mid
          } else {
            hi = mid
          }
        }

        text.style.fontSize = `${best}px`
        setFontSize(best)
      })
    }

    fit()

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(fit)
      : null
    resizeObserver?.observe(box)
    document.fonts?.ready.then(fit)

    return () => {
      cancelAnimationFrame(frame)
      resizeObserver?.disconnect()
    }
  }, [title, max, min])

  return (
    <div ref={boxRef} style={{
      display: 'flex',
      alignItems: 'flex-end',
      width: '100%',
      minHeight: 0,
      overflow: 'hidden',
      ...boxStyle,
    }}>
      <div ref={textRef} style={{
        width: '100%',
        fontFamily: 'var(--sans)',
        fontWeight: weight,
        fontSize,
        lineHeight,
        letterSpacing,
        color,
        overflowWrap: 'normal',
        wordBreak: 'normal',
        hyphens: 'none',
        textWrap: 'balance',
      }}>
        {title}
      </div>
    </div>
  )
}

function ModelArt({ item, height = 220 }: { item: Material; height?: number }) {
  const ac = item.accent
  const etiqueta = (item.shelf ?? '').toUpperCase()
  const title = item.title?.slice(0, 60) ?? ''
  const eb: CSSProperties = { fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 7 }
  const codeStyle: CSSProperties = { fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--subtle)', letterSpacing: '.08em' }
  const big = item.big ?? item.messages ?? item.pages ?? ''

  if (item.model === 'D') {
    const bg: CSSProperties = item.image
      ? { backgroundImage: `url(${item.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { background: `radial-gradient(120% 80% at 30% 20%, ${ac} 0%, var(--ink) 62%)` }
    return (
      <div style={{ height, position: 'relative', overflow: 'hidden', ...bg }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(14,17,13,.15),rgba(14,17,13,.9))' }} />
        <div style={{ position: 'absolute', inset: 0, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ ...eb, color: 'var(--cream-soft)' }}><span style={{ fontSize: 9 }}>◆</span>{etiqueta}</div>
          <PreviewFitTitle title={title} max={42} min={13} color="var(--white)" boxStyle={{ flex: 1, paddingTop: 18 }} />
        </div>
      </div>
    )
  }
  if (item.model === 'C') {
    return (
      <div style={{ height, padding: 20, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'var(--ink)', backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px)', backgroundSize: '100% 38px' }}>
        <div style={{ ...eb, color: 'var(--sand)' }}><span style={{ fontSize: 9 }}>◆</span>{etiqueta}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 78, lineHeight: .8, color: ac, letterSpacing: '-.05em' }}>{big}</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>{item.bigLabel ?? ''}</span>
        </div>
        <PreviewFitTitle title={title} max={28} min={11} weight={700} lineHeight={1.02} letterSpacing="-.02em" boxStyle={{ flex: 1, marginTop: 12 }} />
      </div>
    )
  }
  if (item.model === 'B') {
    return (
      <div style={{ height, display: 'flex', flexDirection: 'column', background: 'var(--ink)' }}>
        <div style={{ background: ac, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ ...eb, color: 'var(--ink)' }}><span style={{ fontSize: 9 }}>◆</span>{etiqueta}</div>
          <span style={{ ...codeStyle, color: 'rgba(14,17,13,.5)' }}>{item.code}</span>
        </div>
        <div style={{ flex: 1, padding: 20, display: 'flex', alignItems: 'stretch' }}>
          <PreviewFitTitle title={title} max={42} min={13} boxStyle={{ flex: 1 }} />
        </div>
      </div>
    )
  }
  // Modelo A
  return (
    <div style={{ height, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'var(--ink)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ ...eb, color: ac }}><span style={{ fontSize: 9 }}>◆</span>{etiqueta}</div>
        <span style={codeStyle}>{item.code}</span>
      </div>
      <PreviewFitTitle title={title} max={46} min={13} lineHeight={.9} boxStyle={{ flex: 1, paddingTop: 18 }} />
    </div>
  )
}

function MaterialCardPv({ item }: { item: Material }) {
  return (
    <div className="pv-mcard" style={{ width: 248 }}>
      <ModelArt item={item} height={280} />
      <div className="pv-mcard-foot" style={{ margin: 0, padding: '16px 20px', borderTop: '.5px solid var(--border)' }}>
        <div className="pv-mcard-meta" style={{ margin: '0 0 10px' }}>{matMeta(item)}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="pv-mcard-price">R$ {item.price}</span>
          <span className="pv-mcard-link">Ver material →</span>
        </div>
      </div>
    </div>
  )
}

function CourseCardPv({ item }: { item: Curso }) {
  return (
    <div className="pv-ccard">
      <div className="pv-ccard-core">
        <div className="pv-ccard-top">
          <span className="pv-ccard-level" style={{ color: item.accent }}>◆ {item.level}</span>
          {item.aoVivo && <span className="pv-ccard-live" style={{ background: item.accent }}>● AO VIVO</span>}
        </div>
        <div className="pv-ccard-title">{item.title}</div>
        <div className="pv-ccard-desc">{item.desc}</div>
      </div>
      <div className="pv-ccard-foot">
        <div className="pv-ccard-metarow">
          <span className="pv-dot" style={{ background: item.accent }} />
          {item.weeks} semanas{item.mentoria ? ' · Mentoria inclusa' : ''}
        </div>
        <div className="pv-ccard-botrow">
          <span style={{ color: item.accent }}>ETAPA {String(item.etapa).padStart(2, '0')}</span>
          <span className="pv-ccard-link">Detalhes →</span>
        </div>
      </div>
    </div>
  )
}

function MentoriaCardPv({ item }: { item: Mentoria }) {
  return (
    <div className="pv-ccard">
      <div className="pv-ccard-core">
        <div className="pv-ccard-top">
          <span className="pv-ccard-level" style={{ color: item.accent }}>◇ MENTORIA</span>
          <span className="pv-ccard-live" style={{ background: item.accent }}>● ACOMPANHADA</span>
        </div>
        <div className="pv-ccard-title">{item.title}</div>
        <div className="pv-ccard-desc">{item.desc}</div>
      </div>
      <div className="pv-ccard-foot">
        <div className="pv-ccard-metarow"><span className="pv-dot" style={{ background: item.accent }} />{item.formato}</div>
        <div className="pv-ccard-botrow">
          <span style={{ color: item.accent }}>{item.cadencia}</span>
          <span className="pv-ccard-link">Quero participar →</span>
        </div>
      </div>
    </div>
  )
}

function EventoCardPv({ item }: { item: Evento }) {
  return (
    <div className="pv-mcard">
      <CardMedia item={item} labelOverride="EVENTO" />
      <div className="pv-mcard-body">
        <div className="pv-mcard-eyebrow" style={{ color: item.accent }}>◆ {item.data}</div>
        <div className="pv-mcard-title">{item.title}</div>
        <div className="pv-mcard-meta">{item.local} · {item.vagas} vagas</div>
        <div className="pv-mcard-foot">
          <span className="pv-mcard-price" style={{ fontSize: 14 }}>{item.inscritos} inscritos</span>
          <span className="pv-mcard-link">Garantir vaga →</span>
        </div>
      </div>
    </div>
  )
}

function CatalogCardPreview({ item }: { item: Item }) {
  if (item.type === 'material') return <MaterialCardPv item={item} />
  if (item.type === 'curso') return <CourseCardPv item={item} />
  if (item.type === 'mentoria') return <MentoriaCardPv item={item} />
  return <EventoCardPv item={item as Evento} />
}

// ── PRÉVIA PÁGINA (iframe) ────────────────────────────────────────────────────

function PagePreview({ item }: { item: Item }) {
  const [zoom, setZoom] = useState(38)
  const m = item as Material
  const c = item as Curso
  const href = item.type === 'material' && m.id
    ? `/materiais/${m.id}`
    : item.type === 'curso' && c.id
    ? `/cursos/${c.id}`
    : null

  if (!href) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 340, color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 12, textAlign: 'center', flexDirection: 'column', gap: 10 }}>
        <span style={{ fontSize: 22 }}>◆</span>
        Salve o item primeiro para ver a prévia da página.
      </div>
    )
  }

  const scale = zoom / 100
  const BASE = 1180
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', minWidth: 36 }}>{zoom}%</span>
        <input type="range" min={25} max={75} value={zoom} onChange={e => setZoom(+e.target.value)}
          style={{ flex: 1, accentColor: 'var(--olive)' }} />
        <a href={href} target="_blank" rel="noreferrer"
          style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--olive)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
          Abrir site →
        </a>
      </div>
      {/* Container com overflow-y: auto para o iframe ser scrollável dentro da prévia */}
      <div style={{ overflowY: 'auto', overflowX: 'hidden', height: 500, width: '100%', position: 'relative', borderRadius: 8, border: '.5px solid var(--border-2)', background: 'var(--ink)' }}>
        <div style={{ width: Math.round(BASE * scale), height: Math.round(3200 * scale), position: 'relative' }}>
          <iframe
            key={href}
            src={href}
            style={{ width: BASE, height: 3200, transform: `scale(${scale})`, transformOrigin: 'top left', border: 'none', pointerEvents: 'none', position: 'absolute', top: 0, left: 0 }}
          />
        </div>
      </div>
    </div>
  )
}

// ── SLIDES DE EXPORTAÇÃO (Feed 4:5 e Stories 9:16) ───────────────────────────

const CEX_DOMAIN = 'campusexpansao.com.br'

type BaseSlideType = 'capa' | 'para-quem' | 'conteudo' | 'depoimento' | 'cta'
type SlideType = BaseSlideType | `extra-${string}`
type FeedVariant = 'ink' | 'graphite'
type TextColor = 'cream' | 'creamSoft' | 'white' | 'ink' | 'olive' | 'oliveSoft' | 'oliveDeep' | 'muted' | 'subtle'
type ArtFont = 'sans' | 'mono'
type ArtAlign = 'left'
type ArtLayoutPresetId = 'impacto' | 'contraste' | 'lista' | 'passos' | 'claro' | 'enfase' | 'cta'
type ArtSurface = 'feed' | 'stories'
type ArtSelectionFormat = { bold: boolean; italic: boolean; underline: boolean; strike: boolean; color: TextColor }
type ArtTextBox = {
  id: string
  html: string
  x: number
  y: number
  w: number
  fontSize: number
  lineHeight: number
  weight: number
  italic: boolean
  color: TextColor
  align: ArtAlign
  font: ArtFont
  letterSpacing?: number
  uppercase?: boolean
  opacity?: number
}
type StoriesState = { kicker: string; gancho: string; ponte: string; cta: string; variant: FeedVariant; elements: ArtTextBox[] }
type FeedSlideCopy = {
  variant: FeedVariant
  kicker: string
  title: string
  items: string[]
  quote: string
  author: string
  cta: string
  footer: string
  // Controles de estilo do texto principal
  titleWeight: number       // 400 | 700
  titleItalic: boolean
  titleColor: TextColor
  titleSize: number         // px at s=1 (ex: 72, 96, 118, 148)
  elements: ArtTextBox[]
}
type FeedCopies = Record<string, FeedSlideCopy>

// BRANDBOOK_V3_2_ARTS: tokens e proporcoes usados pelo editor/exportador de artes.
// Fonte de verdade: ce-x/project/CEX_BrandBook_v3.html secoes 04, 05, 09, 10, 10.5 e 11.
const ART_OLIVE = '#7A9E3F'
const ART_OLIVE_SOFT = '#94B85C'
const ART_OLIVE_DEEP = '#4F6B26'
const ART_INK = '#0E110D'
const ART_GRAPHITE = '#181B16'
const ART_CREAM = '#EDE6D3'
const ART_CREAM_SOFT = '#F6F1E0'
const ART_WHITE = '#FAFAF7'
const ART_MUTED = '#8B8C82'
const ART_SUBTLE = '#555650'
const ART_BORDER = '#2E3327'
const ART_SANS = 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
const ART_MONO = 'JetBrains Mono, SF Mono, ui-monospace, monospace'
const ART_DISPLAY_WEIGHT = 700
const ART_BODY_WEIGHT = 400

function artSafeBounds(canvasW: number, canvasH: number) {
  if (canvasW === 1080 && canvasH === 1920) return { x: 80, top: 250, bottom: 310 }
  if (canvasW === 1080 && canvasH === 1350) return { x: 96, top: 120, bottom: 120 }
  return { x: 96, top: 96, bottom: 96 }
}

const SLIDE_VARIANTS: Record<BaseSlideType, FeedVariant> = {
  'capa': 'ink', 'para-quem': 'graphite', 'conteudo': 'ink', 'depoimento': 'graphite', 'cta': 'ink',
}

// ART_LAYOUT_PRESETS: modelos prontos do editor de artes. Claude Design pode começar por aqui.
const ART_LAYOUT_PRESETS: { id: ArtLayoutPresetId; label: string }[] = [
  { id: 'impacto', label: 'Impacto' },
  { id: 'contraste', label: 'Contraste' },
  { id: 'lista', label: 'Lista' },
  { id: 'passos', label: 'Passos' },
  { id: 'claro', label: 'Claro' },
  { id: 'enfase', label: 'Ênfase' },
  { id: 'cta', label: 'CTA' },
]
const ART_LAYOUT_PRESET_CYCLE: ArtLayoutPresetId[] = ['impacto', 'contraste', 'lista', 'passos', 'claro', 'enfase', 'cta']
const ART_TEXT_COLOR: Record<ArtTextBox['color'], string> = {
  cream: ART_CREAM,
  creamSoft: ART_CREAM_SOFT,
  white: ART_WHITE,
  ink: ART_INK,
  olive: ART_OLIVE,
  oliveSoft: ART_OLIVE_SOFT,
  oliveDeep: ART_OLIVE_DEEP,
  muted: ART_MUTED,
  subtle: ART_SUBTLE,
}
const ART_COLOR_OPTIONS: { key: TextColor; label: string }[] = [
  { key: 'white', label: 'Branco' },
  { key: 'cream', label: 'Creme' },
  { key: 'creamSoft', label: 'Creme suave' },
  { key: 'olive', label: 'Oliva' },
  { key: 'oliveSoft', label: 'Oliva claro' },
  { key: 'oliveDeep', label: 'Oliva profundo' },
  { key: 'muted', label: 'Cinza' },
  { key: 'subtle', label: 'Cinza baixo' },
  { key: 'ink', label: 'Tinta' },
]

function cloneArtElements(elements: ArtTextBox[]) {
  return elements.map(box => ({ ...box }))
}

function cloneFeedCopy(copy: FeedSlideCopy): FeedSlideCopy {
  return {
    ...copy,
    items: [...copy.items],
    elements: cloneArtElements(copy.elements),
  }
}

function cloneFeedCopies(copies: FeedCopies): FeedCopies {
  return Object.fromEntries(Object.entries(copies).map(([key, copy]) => [key, cloneFeedCopy(copy)])) as FeedCopies
}

function duplicateFeedCopy(copy: FeedSlideCopy, suffix: string): FeedSlideCopy {
  return {
    ...cloneFeedCopy(copy),
    elements: copy.elements.map((box, index) => ({ ...box, id: `${box.id}-${suffix}-${index}` })),
  }
}

function cloneStoriesState(story: StoriesState): StoriesState {
  return { ...story, elements: cloneArtElements(story.elements) }
}

function duplicateStoriesState(story: StoriesState, suffix: string): StoriesState {
  return { ...cloneStoriesState(story), elements: story.elements.map((box, index) => ({ ...box, id: `${box.id}-${suffix}-${index}` })) }
}

function artFormatFromBox(box: ArtTextBox | undefined, variant: FeedVariant): ArtSelectionFormat {
  const color = box?.color ?? (variant === 'graphite' ? 'ink' : 'cream')
  return {
    bold: (box?.weight ?? ART_BODY_WEIGHT) >= ART_DISPLAY_WEIGHT,
    italic: box?.italic ?? false,
    underline: false,
    strike: false,
    color,
  }
}

function normalizeCssColor(value: string) {
  const color = value.trim().toLowerCase()
  if (color.startsWith('#')) {
    const hex = color.slice(1)
    if (hex.length === 3) return `#${hex.split('').map(char => `${char}${char}`).join('')}`.toUpperCase()
    return color.toUpperCase()
  }
  const rgb = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!rgb) return color.toUpperCase()
  return `#${[rgb[1], rgb[2], rgb[3]].map(part => Number(part).toString(16).padStart(2, '0')).join('')}`.toUpperCase()
}

function textColorFromCss(value: string, fallback: TextColor): TextColor {
  const normalized = normalizeCssColor(value)
  const found = ART_COLOR_OPTIONS.find(option => normalizeCssColor(ART_TEXT_COLOR[option.key]) === normalized)
  return found?.key ?? fallback
}

function artSelectionNode(editable: HTMLElement, boxId: string) {
  const selection = window.getSelection()
  const currentRange = selection?.rangeCount ? selection.getRangeAt(0) : null
  if (currentRange && editable.contains(currentRange.commonAncestorContainer)) return currentRange.startContainer
  if (artSavedRange && artSavedBoxId === boxId && editable.ownerDocument.contains(artSavedRange.commonAncestorContainer)) {
    return artSavedRange.startContainer
  }
  return null
}

function artFormatFromSelection(editable: HTMLElement, box: ArtTextBox, variant: FeedVariant): ArtSelectionFormat {
  const base = artFormatFromBox(box, variant)
  const node = artSelectionNode(editable, box.id)
  const element = node instanceof Element ? node : node?.parentElement
  if (!element || !editable.contains(element)) return base
  const computed = window.getComputedStyle(element)
  const numericWeight = computed.fontWeight === 'bold' ? 700 : Number.parseInt(computed.fontWeight, 10)
  const decoration = computed.textDecorationLine || computed.textDecoration || ''
  return {
    bold: Number.isFinite(numericWeight) ? numericWeight >= 600 : base.bold,
    italic: computed.fontStyle.includes('italic') || computed.fontStyle.includes('oblique'),
    underline: decoration.includes('underline'),
    strike: decoration.includes('line-through'),
    color: textColorFromCss(computed.color, base.color),
  }
}

function plainToArtHtml(text: string) {
  return String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
}

function artBox(id: string, html: string, patch: Partial<ArtTextBox> = {}): ArtTextBox {
  return {
    id,
    html: plainToArtHtml(html),
    x: 96,
    y: 560,
    w: 850,
    fontSize: 112,
    lineHeight: .94,
    weight: ART_BODY_WEIGHT,
    italic: false,
    color: 'cream',
    align: 'left',
    font: 'sans',
    ...patch,
  }
}

function artRichBox(id: string, html: string, patch: Partial<ArtTextBox> = {}): ArtTextBox {
  return { ...artBox(id, '', patch), html }
}

function cloneArtBox(box: ArtTextBox): ArtTextBox {
  return {
    ...box,
    id: `${box.id}-c${Date.now().toString(36)}`,
    x: box.x + 34,
    y: box.y + 34,
  }
}

function clampArtBox(box: ArtTextBox, canvasW: number, canvasH: number): ArtTextBox {
  const safe = artSafeBounds(canvasW, canvasH)
  const w = Math.max(120, Math.min(box.w, canvasW - safe.x * 2))
  const hGuess = Math.max(90, box.fontSize * box.lineHeight * 2.1)
  return {
    ...box,
    w,
    x: Math.max(safe.x, Math.min(box.x, canvasW - safe.x - w)),
    y: Math.max(safe.top, Math.min(box.y, canvasH - safe.bottom - hGuess)),
  }
}

function styleForArtBox(box: ArtTextBox, s = 1): CSSProperties {
  return {
    position: 'absolute',
    left: box.x * s,
    top: box.y * s,
    width: box.w * s,
    fontFamily: box.font === 'mono' ? ART_MONO : ART_SANS,
    fontSize: box.fontSize * s,
    lineHeight: box.lineHeight,
    fontWeight: box.weight,
    fontStyle: box.italic ? 'italic' : 'normal',
    color: ART_TEXT_COLOR[box.color],
    textAlign: 'left',
    letterSpacing: box.letterSpacing != null ? `${box.letterSpacing}em` : '-.04em',
    textTransform: box.uppercase ? 'uppercase' : 'none',
    opacity: box.opacity ?? 1,
    wordBreak: 'normal',
    overflowWrap: 'break-word',
    whiteSpace: 'normal',
    zIndex: 5,
  }
}

function parseArtText(html: string, baseColor?: string): ReactNode {
  if (!html) return null

  const isHtml = /<[a-z][\s\S]*>/i.test(html)
  if (!isHtml) {
    const parts = html.split(/(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|\n)/g).filter(Boolean)
    return parts.map((part, i) => {
      if (part === '\n') return <br key={i} />
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} style={{ fontWeight: ART_DISPLAY_WEIGHT }}>{part.slice(2, -2)}</strong>
      if (part.startsWith('*') && part.endsWith('*')) return <em key={i} style={{ fontStyle: 'italic', fontWeight: ART_DISPLAY_WEIGHT, color: ART_OLIVE }}>{part.slice(1, -1)}</em>
      if (part.startsWith('_') && part.endsWith('_')) return <em key={i} style={{ fontStyle: 'italic', color: baseColor }}>{part.slice(1, -1)}</em>
      return part
    })
  }

  function parseNode(node: ChildNode, key: number): ReactNode {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || ''
    if (node.nodeType !== Node.ELEMENT_NODE) return null
    const el = node as HTMLElement
    const tag = el.tagName.toLowerCase()
    const children = Array.from(el.childNodes).map((c, i) => parseNode(c, i))
    if (tag === 'br') return <br key={key} />
    if (tag === 'div' || tag === 'p') return <span key={key}>{children}<br /></span>

    const style: CSSProperties = {}
    if (el.style.fontWeight) style.fontWeight = el.style.fontWeight
    if (el.style.fontStyle) style.fontStyle = el.style.fontStyle
    if (el.style.color) style.color = el.style.color
    if (el.style.fontSize) style.fontSize = el.style.fontSize
    if (el.style.lineHeight) style.lineHeight = el.style.lineHeight
    if (el.style.textDecoration) style.textDecoration = el.style.textDecoration
    if (el.style.display) style.display = el.style.display

    if (tag === 'b' || tag === 'strong') style.fontWeight = style.fontWeight || ART_DISPLAY_WEIGHT
    if (tag === 'i' || tag === 'em') style.fontStyle = style.fontStyle || 'italic'
    if (tag === 'u') style.textDecoration = style.textDecoration || 'underline'

    const hasStyle = Object.keys(style).length > 0
    if (!hasStyle) return <span key={key}>{children}</span>
    return <span key={key} style={style}>{children}</span>
  }

  if (typeof document === 'undefined') return html
  const div = document.createElement('div')
  div.innerHTML = html
  return <>{Array.from(div.childNodes).map((n, i) => parseNode(n, i))}</>
}

function buildFeedSlides(item: Item): SlideType[] {
  const slides: SlideType[] = ['capa']
  if (item.type === 'material') {
    const m = item as Material
    if (m.paraQuem?.trim()) slides.push('para-quem')
    if ((m.beneficios ?? []).some(b => b?.trim())) slides.push('conteudo')
  }
  slides.push('cta')
  return slides
}

const STYLE_DEFAULTS = { titleWeight: ART_DISPLAY_WEIGHT, titleItalic: false, titleColor: 'cream' as TextColor, titleSize: 118 }

function buildBlankFeedCopy(title = 'Novo texto', variant: FeedVariant = 'ink'): FeedSlideCopy {
  return {
    variant,
    kicker: '',
    title,
    items: [],
    quote: '',
    author: '',
    cta: '',
    footer: `@campus.expansao · ${CEX_DOMAIN}`,
    ...STYLE_DEFAULTS,
    titleWeight: 400,
    elements: [
      artBox(`extra-title-${Date.now().toString(36)}`, title, { x: 96, y: 520, w: 850, fontSize: 104, lineHeight: .96, weight: ART_BODY_WEIGHT, color: variant === 'graphite' ? 'ink' : 'cream' }),
    ],
  }
}

function artUniqueId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function cleanArtText(value: unknown, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function highlightWord(value: string) {
  const words = value.replace(/[.?!,;:]+$/g, '').split(/\s+/).filter(Boolean)
  if (!words.length) return 'clareza'
  return words.slice(-Math.min(2, words.length)).join(' ')
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function artDataFromItem(item: Item) {
  const material = item.type === 'material' ? item as Material : null
  const curso = item.type === 'curso' ? item as Curso : null
  const title = cleanArtText(item.title, 'Novo material')
  const desc = cleanArtText(item.desc, 'Uma ferramenta para servir com mais clareza.')
  const category = cleanArtText(material?.shelf ?? curso?.level ?? item.type, 'CE.X')
  const paraQuem = cleanArtText(material?.paraQuem ?? curso?.paraQuem, desc)
  const benefits = material?.beneficios?.filter(b => b?.trim()).slice(0, 4) ?? []
  const list = benefits.length ? benefits : ['o que fazer', 'como fazer', 'a quem responder', 'quando pedir ajuda']
  const quote = cleanArtText(curso?.depoimento?.texto, paraQuem)
  const cta = item.type === 'material' && material?.price ? `R$ ${material.price} →` : item.type === 'curso' ? 'Entrar na lista →' : 'Ver agora →'
  const footer = `@campus.expansao · ${CEX_DOMAIN}`
  return { title, desc, category, paraQuem, list, quote, cta, footer }
}

function buildPresetElements(item: Item, preset: ArtLayoutPresetId, surface: ArtSurface, sequence = 1): ArtTextBox[] {
  const data = artDataFromItem(item)
  const story = surface === 'stories'
  const y = (feedY: number, storyY: number) => story ? storyY : feedY
  const fs = (feedSize: number, storySize: number) => story ? storySize : feedSize
  const id = (name: string) => artUniqueId(`${surface}-${preset}-${name}`)
  const lineList = data.list.slice(0, 4).map(line => `◆ ${line}`).join('\n')

  if (preset === 'contraste') {
    const green = highlightWord(data.paraQuem)
    return [
      artBox(id('category'), data.category, { x: 96, y: y(290, 420), w: 760, font: 'mono', fontSize: fs(15, 24), lineHeight: 1.2, weight: 500, color: 'olive', letterSpacing: .18, uppercase: true }),
      artRichBox(id('title'), `${plainToArtHtml(data.paraQuem)}<br><span style="color:${ART_OLIVE};font-style:italic;font-weight:${ART_DISPLAY_WEIGHT}">${plainToArtHtml(green)}.</span>`, { x: 96, y: y(400, 620), w: 900, fontSize: fs(100, 132), lineHeight: .94, weight: ART_DISPLAY_WEIGHT, color: 'cream' }),
      artBox(id('support'), data.desc, { x: 96, y: y(900, 1390), w: 820, fontSize: fs(38, 54), lineHeight: 1.18, weight: ART_BODY_WEIGHT, italic: true, color: 'muted', opacity: .86 }),
    ]
  }

  if (preset === 'lista') {
    return [
      artBox(id('title'), cleanArtText(data.desc, 'Ela não sabe direito:'), { x: 96, y: y(330, 470), w: 880, fontSize: fs(104, 126), lineHeight: .96, weight: ART_DISPLAY_WEIGHT, color: 'cream' }),
      artBox(id('list'), lineList, { x: 96, y: y(650, 930), w: 880, fontSize: fs(58, 72), lineHeight: 1.45, weight: ART_DISPLAY_WEIGHT, color: 'cream', letterSpacing: -.02 }),
    ]
  }

  if (preset === 'passos') {
    return [
      artBox(id('number'), `${sequence}.`, { x: 96, y: y(300, 500), w: 430, fontSize: fs(280, 330), lineHeight: .82, weight: ART_DISPLAY_WEIGHT, color: 'olive' }),
      artBox(id('title'), sequence === 1 ? 'Função' : sequence === 2 ? 'Sentido' : sequence === 3 ? 'Direção' : data.category, { x: 96, y: y(650, 930), w: 820, fontSize: fs(132, 158), lineHeight: .9, weight: ART_DISPLAY_WEIGHT, color: 'cream' }),
      artBox(id('question'), data.desc, { x: 96, y: y(850, 1220), w: 850, fontSize: fs(58, 72), lineHeight: 1.35, weight: ART_BODY_WEIGHT, italic: true, color: 'muted' }),
    ]
  }

  if (preset === 'claro') {
    return [
      artBox(id('number'), `${sequence}.`, { x: 96, y: y(290, 480), w: 420, fontSize: fs(260, 320), lineHeight: .82, weight: ART_DISPLAY_WEIGHT, color: 'olive' }),
      artBox(id('title'), sequence === 1 ? 'Clareza' : data.category, { x: 96, y: y(610, 860), w: 820, fontSize: fs(126, 152), lineHeight: .9, weight: ART_DISPLAY_WEIGHT, color: 'ink' }),
      artBox(id('question'), data.paraQuem, { x: 96, y: y(830, 1160), w: 820, fontSize: fs(56, 70), lineHeight: 1.35, weight: ART_BODY_WEIGHT, italic: true, color: 'muted' }),
    ]
  }

  if (preset === 'enfase') {
    const green = highlightWord(data.title)
    const titleLead = data.title.replace(new RegExp(`${escapeRegExp(green)}[.?!,;:]*$`, 'i'), '').trim()
    return [
      artRichBox(id('title'), `${plainToArtHtml(titleLead || data.title)}<br><span style="color:${ART_OLIVE};font-style:italic;font-weight:${ART_DISPLAY_WEIGHT}">${plainToArtHtml(green)}.</span>`, { x: 96, y: y(340, 540), w: 900, fontSize: fs(104, 134), lineHeight: .95, weight: ART_DISPLAY_WEIGHT, color: 'cream' }),
      artBox(id('support'), data.desc, { x: 96, y: y(970, 1390), w: 820, fontSize: fs(46, 62), lineHeight: 1.22, weight: ART_BODY_WEIGHT, italic: true, color: 'muted' }),
    ]
  }

  if (preset === 'cta') {
    return [
      artBox(id('title'), data.title, { x: 96, y: y(380, 560), w: 860, fontSize: fs(102, 126), lineHeight: .96, weight: ART_DISPLAY_WEIGHT, color: 'cream' }),
      artBox(id('cta'), data.cta, { x: 96, y: y(760, 1080), w: 760, fontSize: fs(108, 138), lineHeight: .94, weight: ART_DISPLAY_WEIGHT, italic: true, color: 'olive' }),
      artBox(id('footer'), data.footer, { x: 96, y: y(1160, 1600), w: 840, font: 'mono', fontSize: fs(20, 28), lineHeight: 1.2, weight: 500, color: 'muted', letterSpacing: .06 }),
    ]
  }

  return [
    artBox(id('category'), data.category, { x: 96, y: y(330, 500), w: 760, font: 'mono', fontSize: fs(15, 24), lineHeight: 1.2, weight: 500, color: 'olive', letterSpacing: .18, uppercase: true }),
    artBox(id('title'), data.title, { x: 96, y: y(455, 670), w: 900, fontSize: fs(118, 144), lineHeight: .94, weight: ART_DISPLAY_WEIGHT, color: 'cream' }),
    artBox(id('support'), data.desc, { x: 96, y: y(920, 1320), w: 820, fontSize: fs(72, 88), lineHeight: 1, weight: ART_DISPLAY_WEIGHT, color: 'muted', opacity: .78 }),
  ]
}

function buildFeedPresetCopy(item: Item, preset: ArtLayoutPresetId, sequence = 1): FeedSlideCopy {
  const data = artDataFromItem(item)
  const variant: FeedVariant = preset === 'claro' ? 'graphite' : 'ink'
  return {
    variant,
    kicker: data.category,
    title: data.title,
    items: data.list,
    quote: data.quote,
    author: '',
    cta: data.cta,
    footer: data.footer,
    ...STYLE_DEFAULTS,
    titleColor: variant === 'graphite' ? 'ink' : 'cream',
    elements: buildPresetElements(item, preset, 'feed', sequence),
  }
}

function buildFeedCopies(item: Item): FeedCopies {
  return {
    capa: buildFeedPresetCopy(item, 'impacto', 1),
    'para-quem': buildFeedPresetCopy(item, 'contraste', 2),
    conteudo: buildFeedPresetCopy(item, 'lista', 3),
    depoimento: buildFeedPresetCopy(item, 'enfase', 4),
    cta: buildFeedPresetCopy(item, 'cta', 5),
  }
}

function buildStoryState(item: Item, variant: FeedVariant = 'ink', preset: ArtLayoutPresetId = 'impacto', sequence = 1): StoriesState {
  const data = artDataFromItem(item)
  const resolvedVariant = preset === 'claro' ? 'graphite' : variant
  return {
    kicker: data.category,
    gancho: data.title,
    ponte: data.desc,
    cta: data.cta,
    variant: resolvedVariant,
    elements: buildPresetElements(item, preset, 'stories', sequence),
  }
}

function useWindowWidth() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)
  useEffect(() => {
    const h = () => setW(window.innerWidth)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return w
}

function ArtLogo({ size = 40, dark = false, s = 1 }: { size?: number; dark?: boolean; s?: number }) {
  const base = dark ? ART_INK : ART_WHITE
  const accent = dark ? ART_OLIVE_DEEP : ART_OLIVE
  return (
    <span style={{ fontFamily: ART_SANS, fontWeight: ART_DISPLAY_WEIGHT, fontSize: size * s, letterSpacing: '-.045em', color: base, lineHeight: 1, display: 'block' }}>
      CE<span style={{ color: accent }}>.</span><span style={{ color: accent, fontStyle: 'normal', fontWeight: ART_DISPLAY_WEIGHT }}>X</span>
    </span>
  )
}

function ArtSlideShell({ w, h, s, variant, counter, total, children, safeZone = false }: {
  w: number
  h: number
  s: number
  variant: FeedVariant
  counter?: number
  total?: number
  children: ReactNode
  safeZone?: boolean
}) {
  const isLight = variant === 'graphite'
  const bg = isLight ? ART_CREAM : ART_INK
  const dotColor = isLight ? 'rgba(14,17,13,.09)' : 'rgba(255,255,255,.035)'
  const counterStr = counter != null && total != null ? `${String(counter).padStart(2, '0')} / ${String(total).padStart(2, '0')}` : undefined
  const safe = artSafeBounds(w, h)
  return (
    <div style={{ width: w * s, height: h * s, position: 'relative', overflow: 'hidden', background: bg, fontFamily: ART_SANS }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 5 * s, background: ART_OLIVE, zIndex: 8 }} />
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, backgroundImage: `radial-gradient(circle, ${dotColor} ${1.35 * s}px, transparent ${1.35 * s}px)`, backgroundSize: `${30 * s}px ${30 * s}px`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', right: -52 * s, bottom: -80 * s, fontFamily: ART_SANS, fontWeight: 300, fontStyle: 'italic', fontSize: Math.round(w * .72) * s, lineHeight: .7, color: isLight ? 'rgba(14,17,13,.055)' : 'rgba(122,158,63,.07)', zIndex: 2, pointerEvents: 'none', whiteSpace: 'nowrap' }}>X</div>
      <div style={{ position: 'absolute', left: 96 * s, top: 64 * s, zIndex: 9 }}>
        <ArtLogo size={38} dark={isLight} s={s} />
      </div>
      {counterStr && (
        <div style={{ position: 'absolute', right: 96 * s, top: 66 * s, zIndex: 9, fontFamily: ART_MONO, fontSize: 16 * s, letterSpacing: '.16em', color: ART_OLIVE }}>
          {counterStr}
        </div>
      )}
      <div style={{ position: 'absolute', inset: 0, zIndex: 6 }}>
        {children}
      </div>
      {safeZone && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: safe.bottom * s, zIndex: 4, borderTop: `1.5px dashed rgba(122,158,63,.22)`, background: 'repeating-linear-gradient(45deg, rgba(122,158,63,.022) 0 14px, transparent 14px 28px)', pointerEvents: 'none' }} />
      )}
    </div>
  )
}

function ArtTextBoxView({ box, s = 1 }: { box: ArtTextBox; s?: number }) {
  return (
    <div style={styleForArtBox(box, s)}>
      {parseArtText(box.html, ART_TEXT_COLOR[box.color])}
    </div>
  )
}

function FeedSlide({ item, type, counter, total, s = 1, copy }: {
  item: Item; type: string; counter?: number; total?: number; s?: number; copy?: FeedSlideCopy
}) {
  const m = item as Material
  const W = 1080 * s
  const H = 1350 * s
  const p = Math.round(90 * s)
  const pb = Math.round(84 * s)
  const topPad = Math.round(64 * s)
  const variant = copy?.variant ?? SLIDE_VARIANTS[type as BaseSlideType] ?? 'ink'
  const isLight = variant === 'graphite'
  const bg = isLight ? ART_CREAM : ART_INK
  const textMuted = isLight ? ART_SUBTLE : ART_MUTED
  const borderColor = isLight ? 'rgba(14,17,13,.14)' : ART_BORDER
  const dotColor = isLight ? 'rgba(14,17,13,.09)' : 'rgba(255,255,255,.035)'
  const counterStr = counter != null && total != null ? `${String(counter).padStart(2, '0')}/${String(total).padStart(2, '0')}` : undefined

  const outer: CSSProperties = { width: W, height: H, position: 'relative', overflow: 'hidden', fontFamily: ART_SANS, background: bg, boxSizing: 'border-box' }
  const inner: CSSProperties = { position: 'absolute', inset: 0, zIndex: 2, padding: `${topPad}px ${p}px ${pb}px ${p + Math.round(4 * s)}px`, display: 'flex', flexDirection: 'column' }
  const body: CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }

  const leftLine = <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: Math.round(4 * s), background: ART_OLIVE, zIndex: 3 }} />
  const dotGrid = <div style={{ position: 'absolute', inset: 0, zIndex: 1, backgroundImage: `radial-gradient(circle, ${dotColor} ${1.5 * s}px, transparent ${1.5 * s}px)`, backgroundSize: `${30 * s}px ${30 * s}px`, pointerEvents: 'none' }} />
  const watermarkX = (
    <div style={{ position: 'absolute', right: -46 * s, bottom: -150 * s, fontFamily: ART_SANS, fontWeight: 300, fontStyle: 'italic', fontSize: 780 * s, lineHeight: .7, color: isLight ? 'rgba(14,17,13,.06)' : 'rgba(122,158,63,.07)', zIndex: 0, pointerEvents: 'none', whiteSpace: 'nowrap' }}>X</div>
  )
  const topChrome = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <ArtLogo size={38} dark={isLight} s={s} />
      {counterStr && <span style={{ fontFamily: ART_MONO, fontSize: 20 * s, letterSpacing: '.16em', color: ART_OLIVE_DEEP }}>{counterStr}</span>}
    </div>
  )

  // Resolve cor do texto a partir do controle de cor
  const colorMap = ART_TEXT_COLOR
  const titleFontWeight = copy?.titleWeight ?? ART_DISPLAY_WEIGHT
  const titleFontStyle = (copy?.titleItalic ?? false) ? 'italic' : 'normal'
  const titleFontSize = (copy?.titleSize ?? 118) * s
  const titleFontColor = colorMap[copy?.titleColor ?? 'cream']
  const titleStyle: CSSProperties = { fontFamily: ART_SANS, fontWeight: titleFontWeight, fontStyle: titleFontStyle, fontSize: titleFontSize, lineHeight: .96, letterSpacing: '-.04em', color: titleFontColor, margin: 0 }

  const renderKicker = (text: string) => (
    <div style={{ fontFamily: ART_MONO, fontSize: 22 * s, letterSpacing: '.18em', textTransform: 'uppercase', color: ART_OLIVE, marginBottom: 36 * s }}>{text}</div>
  )

  if (copy?.elements?.length) {
    return (
      <ArtSlideShell w={1080} h={1350} s={s} variant={variant} counter={counter} total={total}>
        {copy.elements.map(box => <ArtTextBoxView key={box.id} box={box} s={s} />)}
      </ArtSlideShell>
    )
  }

  if (type === 'capa') {
    return (
      <div style={outer}>
        {leftLine}{dotGrid}{watermarkX}
        <div style={inner}>
          {topChrome}
          <div style={body}>
            {(copy?.kicker || m.shelf) && renderKicker(copy?.kicker || m.shelf || '')}
            <h2 style={titleStyle}>{parseArtText(copy?.title || item.title, titleFontColor)}</h2>
          </div>
        </div>
      </div>
    )
  }

  if (type === 'para-quem') {
    return (
      <div style={outer}>
        {leftLine}{dotGrid}{watermarkX}
        <div style={inner}>
          {topChrome}
          <div style={body}>
            {copy?.kicker && renderKicker(copy.kicker)}
            <h2 style={titleStyle}>{parseArtText(copy?.title || m.paraQuem || 'Pra quem é esse material?', titleFontColor)}</h2>
          </div>
        </div>
      </div>
    )
  }

  if (type === 'conteudo') {
    const bens = (copy?.items ?? (m.beneficios ?? [])).filter(b => b?.trim()).slice(0, 4)
    const itemSize = (copy?.titleSize ?? 58) * s
    const itemWeight = copy?.titleWeight ?? ART_DISPLAY_WEIGHT
    const itemColor = colorMap[copy?.titleColor ?? 'cream']
    return (
      <div style={outer}>
        {leftLine}{dotGrid}{watermarkX}
        <div style={inner}>
          {topChrome}
          <div style={body}>
            {renderKicker(copy?.kicker || 'O QUE VEM DENTRO')}
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {bens.map((b, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 30 * s, fontFamily: ART_SANS, fontWeight: itemWeight, fontSize: itemSize, letterSpacing: '-.02em', color: itemColor, padding: `${22 * s}px 0`, borderTop: `1.5px solid ${borderColor}`, ...(i === bens.length - 1 ? { borderBottom: `1.5px solid ${borderColor}` } : {}) }}>
                  <span style={{ color: ART_OLIVE, fontWeight: 500, flexShrink: 0, fontSize: 24 * s }}>◆</span>
                  <span>{parseArtText(b, itemColor)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    )
  }

  if (type === 'depoimento') {
    const quoteSize = (copy?.titleSize ?? 44) * s
    const quoteWeight = copy?.titleWeight ?? ART_DISPLAY_WEIGHT
    const quoteStyle = (copy?.titleItalic ?? true) ? 'italic' : 'normal'
    const quoteColor = colorMap[copy?.titleColor ?? 'cream']
    return (
      <div style={outer}>
        {leftLine}{dotGrid}{watermarkX}
        <div style={inner}>
          {topChrome}
          <div style={body}>
            <div style={{ fontSize: 96 * s, lineHeight: .7, color: ART_OLIVE, fontWeight: ART_DISPLAY_WEIGHT, marginBottom: 30 * s }}>&ldquo;</div>
            <div style={{ fontFamily: ART_SANS, fontSize: quoteSize, fontWeight: quoteWeight, fontStyle: quoteStyle, lineHeight: 1.3, color: quoteColor, maxWidth: 860 * s }}>
              {parseArtText(copy?.quote || 'Escreva o texto principal aqui.', quoteColor)}
            </div>
            {copy?.author && (
              <div style={{ marginTop: 36 * s, fontFamily: ART_MONO, fontSize: 14 * s, letterSpacing: '.1em', color: textMuted, textTransform: 'uppercase' }}>
                {copy.author}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // CTA / fecho
  const ctaSize = (copy?.titleSize ?? 104) * s
  const ctaWeight = copy?.titleWeight ?? ART_DISPLAY_WEIGHT
  const ctaColor = colorMap[copy?.titleColor ?? 'cream']
  return (
    <div style={outer}>
      {leftLine}{dotGrid}{watermarkX}
      <div style={inner}>
        {topChrome}
        <div style={body}>
          <h2 style={{ fontFamily: ART_SANS, fontWeight: ctaWeight, fontSize: ctaSize, lineHeight: .96, letterSpacing: '-.04em', color: ctaColor, margin: `0 0 ${38 * s}px` }}>
            {parseArtText(copy?.title || item.title, ctaColor)}
          </h2>
          <div style={{ width: 96 * s, height: 5 * s, background: ART_OLIVE, borderRadius: 2 * s, margin: `0 0 ${38 * s}px` }} />
          <h2 style={{ fontFamily: ART_SANS, fontWeight: ctaWeight, fontSize: ctaSize, lineHeight: .96, letterSpacing: '-.04em', color: ART_OLIVE, fontStyle: 'italic', margin: 0 }}>
            {parseArtText(copy?.cta || ((m.price) ? `R$ ${m.price} →` : `Ver →`))}
          </h2>
        </div>
        <div style={{ fontFamily: ART_MONO, fontSize: 22 * s, letterSpacing: '.06em', color: isLight ? ART_OLIVE_DEEP : ART_OLIVE }}>
          {copy?.footer || `@campus.expansao · ${CEX_DOMAIN}`}
        </div>
      </div>
    </div>
  )
}

function StoriesSlide({ st, s = 1 }: { st: StoriesState; s?: number }) {
  const bg = st.variant === 'graphite' ? ART_GRAPHITE : ART_INK
  const W = 1080 * s
  const H = 1920 * s

  if (st.elements?.length) {
    return (
      <ArtSlideShell w={1080} h={1920} s={s} variant={st.variant} safeZone>
        {st.elements.map(box => <ArtTextBoxView key={box.id} box={box} s={s} />)}
      </ArtSlideShell>
    )
  }

  return (
    <div style={{ width: W, height: H, position: 'relative', overflow: 'hidden', background: bg, fontFamily: ART_SANS }}>
      {/* Filete oliva 5px topo */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 5 * s, background: ART_OLIVE, zIndex: 3 }} />
      {/* Marca d'agua X gigante */}
      <div style={{ position: 'absolute', right: -46 * s, bottom: 120 * s, fontFamily: ART_SANS, fontWeight: 300, fontStyle: 'italic', fontSize: 740 * s, lineHeight: .7, color: 'rgba(122,158,63,.06)', zIndex: 0, pointerEvents: 'none', whiteSpace: 'nowrap' }}>X</div>
      {/* Inner: padding 100 88 360 */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 2, padding: `${100 * s}px ${88 * s}px ${360 * s}px`, display: 'flex', flexDirection: 'column' }}>
        {/* Logo */}
        <div><ArtLogo size={44} s={s} /></div>
        {/* Mid: kicker + gancho + ponte */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {st.kicker && (
            <div style={{ fontFamily: ART_MONO, fontSize: 26 * s, letterSpacing: '.16em', textTransform: 'uppercase', color: ART_OLIVE, marginBottom: 42 * s }}>
              {st.kicker}
            </div>
          )}
          <h2 style={{ fontFamily: ART_SANS, fontWeight: ART_DISPLAY_WEIGHT, fontSize: 138 * s, lineHeight: .95, letterSpacing: '-.04em', color: ART_CREAM_SOFT, margin: 0 }}>
            {parseArtText(st.gancho)}
          </h2>
          {st.ponte && (
            <p style={{ fontFamily: ART_SANS, fontStyle: 'italic', fontWeight: 400, fontSize: 46 * s, lineHeight: 1.3, color: ART_MUTED, marginTop: 46 * s, maxWidth: 860 * s, marginBottom: 0 }}>
              {parseArtText(st.ponte)}
            </p>
          )}
        </div>
        {/* CTA pill */}
        <div style={{ display: 'flex' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', background: ART_OLIVE, color: ART_INK, fontFamily: ART_SANS, fontWeight: ART_DISPLAY_WEIGHT, fontSize: 48 * s, letterSpacing: '-.015em', padding: `${32 * s}px ${50 * s}px`, borderRadius: 16 * s }}>
            {parseArtText(st.cta || 'ARRASTA PRA CIMA ↑')}
          </div>
        </div>
      </div>
      {/* Zona segura 310px (referencia visual) */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 310 * s, zIndex: 1, borderTop: `1.5px dashed rgba(122,158,63,.30)`, background: 'repeating-linear-gradient(45deg, rgba(122,158,63,.025) 0 14px, transparent 14px 28px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 22 * s, pointerEvents: 'none' }}>
        <span style={{ fontFamily: ART_MONO, fontSize: 18 * s, letterSpacing: '.14em', color: 'rgba(139,140,130,.7)' }}>
          AREA DA UI DO INSTAGRAM · MANTENHA LIVRE
        </span>
      </div>
    </div>
  )
}

// ── FEED PREVIEW + DOWNLOAD ───────────────────────────────────────────────────

async function downloadAsPng(element: HTMLElement, filename: string) {
  const html2canvas = (await import('html2canvas')).default
  const canvas = await html2canvas(element, { scale: 1, backgroundColor: ART_INK, useCORS: true, logging: false })
  const link = document.createElement('a')
  link.download = filename
  link.href = canvas.toDataURL('image/png')
  link.click()
}

let artSavedRange: Range | null = null
let artSavedBoxId = ''

function saveArtSelection(editable: HTMLElement, boxId: string) {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return
  const range = sel.getRangeAt(0)
  if (!editable.contains(range.commonAncestorContainer)) return
  artSavedRange = range.cloneRange()
  artSavedBoxId = boxId
  window.dispatchEvent(new Event('art-selection-change'))
}

function restoreArtSelection(editable: HTMLElement, boxId: string) {
  const sel = window.getSelection()
  const currentRange = sel?.rangeCount ? sel.getRangeAt(0) : null
  if (currentRange && editable.contains(currentRange.commonAncestorContainer) && !currentRange.collapsed) return true
  if (!artSavedRange || artSavedBoxId !== boxId) return false
  if (!editable.ownerDocument.contains(artSavedRange.commonAncestorContainer)) return false
  editable.focus()
  sel?.removeAllRanges()
  try {
    sel?.addRange(artSavedRange.cloneRange())
  } catch {
    return false
  }
  return true
}

function wrapCurrentSelection(style: string, editable: HTMLElement, boxId?: string) {
  if (boxId) restoreArtSelection(editable, boxId)
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false
  const range = sel.getRangeAt(0)
  if (!editable.contains(range.commonAncestorContainer)) return false
  const span = document.createElement('span')
  span.setAttribute('style', style)
  try {
    range.surroundContents(span)
  } catch {
    const frag = range.extractContents()
    span.appendChild(frag)
    range.insertNode(span)
  }
  const nextRange = document.createRange()
  nextRange.selectNodeContents(span)
  sel.removeAllRanges()
  sel.addRange(nextRange)
  saveArtSelection(editable, boxId ?? editable.dataset.artBoxId ?? '')
  return true
}

function EditableArtTextBox({ box, scale, selected, canvasW, canvasH, onSelect, onChange, onPatch }: {
  box: ArtTextBox
  scale: number
  selected: boolean
  canvasW: number
  canvasH: number
  onSelect: () => void
  onChange: (html: string) => void
  onPatch: (patch: Partial<ArtTextBox>) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const skipSync = useRef(false)
  const drag = useRef<{ kind: 'move' | 'resize'; startX: number; startY: number; x: number; y: number; w: number } | null>(null)

  useEffect(() => {
    if (!ref.current || skipSync.current) return
    if (ref.current.innerHTML !== box.html) ref.current.innerHTML = box.html || ''
  }, [box.html])

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (!drag.current) return
      const dx = (event.clientX - drag.current.startX) / scale
      const dy = (event.clientY - drag.current.startY) / scale
      const draft = drag.current.kind === 'move'
        ? { ...box, x: drag.current.x + dx, y: drag.current.y + dy }
        : { ...box, w: Math.max(120, drag.current.w + dx) }
      const next = clampArtBox(draft, canvasW, canvasH)
      onPatch({ x: next.x, y: next.y, w: next.w })
    }
    const up = () => { drag.current = null }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [box, canvasH, canvasW, onPatch, scale])

  const emit = () => {
    if (!ref.current) return
    skipSync.current = true
    onChange(ref.current.innerHTML)
    saveArtSelection(ref.current, box.id)
    requestAnimationFrame(() => { skipSync.current = false })
  }

  const pasteText = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault()
    const text = event.clipboardData.getData('text/plain')
    document.execCommand('insertHTML', false, plainToArtHtml(text))
    emit()
  }

  return (
    <div style={{ ...styleForArtBox(box, scale), outline: selected ? `${2 * scale}px solid ${ART_OLIVE}` : '1px solid transparent', outlineOffset: 5 * scale, minHeight: Math.max(38, box.fontSize * box.lineHeight) * scale, cursor: 'text' }} onMouseDown={onSelect}>
      <div
        ref={ref}
        data-art-editable="true"
        data-art-box-id={box.id}
        contentEditable
        suppressContentEditableWarning
        onFocus={onSelect}
        onInput={emit}
        onMouseUp={() => ref.current && saveArtSelection(ref.current, box.id)}
        onKeyUp={() => ref.current && saveArtSelection(ref.current, box.id)}
        onPaste={pasteText}
        style={{ outline: 'none', minHeight: '1em' }}
      />
      {selected && (
        <button
          type="button"
          title="Mover caixa"
          onPointerDown={event => {
            event.preventDefault()
            event.stopPropagation()
            onSelect()
            drag.current = { kind: 'move', startX: event.clientX, startY: event.clientY, x: box.x, y: box.y, w: box.w }
          }}
          style={{
            position: 'absolute', left: -2 * scale, top: -32 * scale,
            width: 28 * scale, height: 28 * scale, borderRadius: 6 * scale,
            border: `${1.5 * scale}px solid ${ART_OLIVE}`, background: ART_INK,
            color: ART_OLIVE, fontFamily: ART_MONO, fontSize: 12 * scale,
            cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ◇
        </button>
      )}
      {selected && (
        <button
          type="button"
          title="Redimensionar caixa"
          onPointerDown={event => {
            event.preventDefault()
            event.stopPropagation()
            onSelect()
            drag.current = { kind: 'resize', startX: event.clientX, startY: event.clientY, x: box.x, y: box.y, w: box.w }
          }}
          style={{
            position: 'absolute', right: -10 * scale, bottom: -10 * scale,
            width: 20 * scale, height: 20 * scale, borderRadius: 4 * scale,
            border: `${1.5 * scale}px solid ${ART_OLIVE}`, background: ART_INK,
            color: ART_OLIVE, fontFamily: ART_MONO, fontSize: 10 * scale,
            cursor: 'nwse-resize', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        />
      )}
    </div>
  )
}

function EditableArtCanvas({ w, h, scale, variant, counter, total, safeZone, elements, selectedId, onSelectedId, onElementsChange }: {
  w: number
  h: number
  scale: number
  variant: FeedVariant
  counter?: number
  total?: number
  safeZone?: boolean
  elements: ArtTextBox[]
  selectedId: string
  onSelectedId: (id: string) => void
  onElementsChange: (elements: ArtTextBox[]) => void
}) {
  const updateBox = (id: string, patch: Partial<ArtTextBox>) => {
    onElementsChange(elements.map(box => box.id === id ? clampArtBox({ ...box, ...patch }, w, h) : box))
  }
  return (
    <ArtSlideShell w={w} h={h} s={scale} variant={variant} counter={counter} total={total} safeZone={safeZone}>
      {elements.map(box => (
        <EditableArtTextBox
          key={box.id}
          box={box}
          scale={scale}
          selected={selectedId === box.id}
          canvasW={w}
          canvasH={h}
          onSelect={() => onSelectedId(box.id)}
          onChange={html => updateBox(box.id, { html })}
          onPatch={patch => updateBox(box.id, patch)}
        />
      ))}
    </ArtSlideShell>
  )
}

function ArtToolbar({ box, onPatch, onAdd, onUndo, canUndo, onApplyPreset, variant, onVariantChange, onDownload, downloading, downloadLabel }: {
  box?: ArtTextBox
  onPatch: (patch: Partial<ArtTextBox>) => void
  onAdd: () => void
  onUndo: () => void
  canUndo: boolean
  onApplyPreset?: (preset: ArtLayoutPresetId) => void
  variant: FeedVariant
  onVariantChange: (variant: FeedVariant) => void
  onDownload: () => void
  downloading: boolean
  downloadLabel: string
}) {
  const presetMenuRef = useRef<HTMLDivElement>(null)
  const colorMenuRef = useRef<HTMLDivElement>(null)
  const [presetMenuOpen, setPresetMenuOpen] = useState(false)
  const [colorMenuOpen, setColorMenuOpen] = useState(false)
  const [selectionFormat, setSelectionFormat] = useState<ArtSelectionFormat>(() => artFormatFromBox(box, variant))

  const refreshSelectionFormat = useCallback(() => {
    if (!box) {
      setSelectionFormat(artFormatFromBox(undefined, variant))
      return
    }
    const editable = document.querySelector(`[data-art-box-id="${box.id}"]`) as HTMLElement | null
    setSelectionFormat(editable ? artFormatFromSelection(editable, box, variant) : artFormatFromBox(box, variant))
  }, [box, variant])

  useEffect(() => {
    if (!presetMenuOpen && !colorMenuOpen) return
    const closeOnOutside = (event: PointerEvent) => {
      const target = event.target as Node
      if (!presetMenuRef.current?.contains(target)) setPresetMenuOpen(false)
      if (!colorMenuRef.current?.contains(target)) setColorMenuOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPresetMenuOpen(false)
        setColorMenuOpen(false)
      }
    }
    document.addEventListener('pointerdown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [presetMenuOpen, colorMenuOpen])

  useEffect(() => {
    const scheduleRefresh = () => requestAnimationFrame(refreshSelectionFormat)
    scheduleRefresh()
    document.addEventListener('selectionchange', scheduleRefresh)
    window.addEventListener('art-selection-change', scheduleRefresh)
    window.addEventListener('keyup', scheduleRefresh)
    window.addEventListener('mouseup', scheduleRefresh)
    return () => {
      document.removeEventListener('selectionchange', scheduleRefresh)
      window.removeEventListener('art-selection-change', scheduleRefresh)
      window.removeEventListener('keyup', scheduleRefresh)
      window.removeEventListener('mouseup', scheduleRefresh)
    }
  }, [refreshSelectionFormat])

  const syncHtml = () => {
    if (!box) return
    const editable = document.querySelector(`[data-art-box-id="${box.id}"]`) as HTMLElement | null
    if (editable) onPatch({ html: editable.innerHTML })
  }
  const applyInline = (style: string, patch: Partial<ArtTextBox>) => {
    if (!box) return
    const editable = document.querySelector(`[data-art-box-id="${box.id}"]`) as HTMLElement | null
    if (editable) {
      if (wrapCurrentSelection(style, editable, box.id)) {
        syncHtml()
        refreshSelectionFormat()
        return
      }
      editable.focus()
    }
    onPatch(patch)
    requestAnimationFrame(refreshSelectionFormat)
  }
  const toggleBold = () => {
    if (!box) return
    const editable = document.querySelector(`[data-art-box-id="${box.id}"]`) as HTMLElement | null
    if (editable && restoreArtSelection(editable, box.id)) {
      const sel = window.getSelection()
      const isBold = artFormatFromSelection(editable, box, variant).bold
      if (sel && !sel.isCollapsed && wrapCurrentSelection(`font-weight:${isBold ? ART_BODY_WEIGHT : ART_DISPLAY_WEIGHT}`, editable, box.id)) {
        syncHtml()
        saveArtSelection(editable, box.id)
        refreshSelectionFormat()
        return
      }
      document.execCommand('bold', false)
      syncHtml()
      saveArtSelection(editable, box.id)
      refreshSelectionFormat()
      return
    }
    onPatch({ weight: box.weight >= ART_DISPLAY_WEIGHT ? ART_BODY_WEIGHT : ART_DISPLAY_WEIGHT })
    requestAnimationFrame(refreshSelectionFormat)
  }
  const toggleItalic = () => {
    if (!box) return
    const editable = document.querySelector(`[data-art-box-id="${box.id}"]`) as HTMLElement | null
    if (editable && restoreArtSelection(editable, box.id)) {
      const sel = window.getSelection()
      const isItalic = artFormatFromSelection(editable, box, variant).italic
      if (sel && !sel.isCollapsed && wrapCurrentSelection(`font-style:${isItalic ? 'normal' : 'italic'}`, editable, box.id)) {
        syncHtml()
        saveArtSelection(editable, box.id)
        refreshSelectionFormat()
        return
      }
      document.execCommand('italic', false)
      syncHtml()
      saveArtSelection(editable, box.id)
      refreshSelectionFormat()
      return
    }
    onPatch({ italic: !(selectionFormat.italic || box.italic) })
    requestAnimationFrame(refreshSelectionFormat)
  }
  const toggleDecoration = (kind: 'underline' | 'line-through') => {
    if (!box) return
    const editable = document.querySelector(`[data-art-box-id="${box.id}"]`) as HTMLElement | null
    const isActive = kind === 'underline' ? selectionFormat.underline : selectionFormat.strike
    if (editable && restoreArtSelection(editable, box.id)) {
      const sel = window.getSelection()
      if (sel && !sel.isCollapsed && wrapCurrentSelection(`text-decoration:${isActive ? 'none' : kind}`, editable, box.id)) {
        syncHtml()
        saveArtSelection(editable, box.id)
        refreshSelectionFormat()
        return
      }
    }
    applyInline(`text-decoration:${isActive ? 'none' : kind}`, {})
  }
  const insertInline = (html: string) => {
    if (!box) return
    const editable = document.querySelector(`[data-art-box-id="${box.id}"]`) as HTMLElement | null
    if (!editable) return
    restoreArtSelection(editable, box.id)
    document.execCommand('insertHTML', false, html)
    syncHtml()
    saveArtSelection(editable, box.id)
    refreshSelectionFormat()
  }
  const disabled = !box
  const applyPreset = (preset: ArtLayoutPresetId) => {
    if (!onApplyPreset) return
    onApplyPreset(preset)
    setPresetMenuOpen(false)
  }
  const currentColor = selectionFormat.color
  const selectColor = (color: TextColor) => {
    applyInline(`color:${ART_TEXT_COLOR[color]}`, { color })
    setColorMenuOpen(false)
    requestAnimationFrame(refreshSelectionFormat)
  }
  const tool = (content: ReactNode, fn: () => void, active?: boolean, title?: string, color?: string) => (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={event => { event.preventDefault(); fn() }}
      style={{
        height: 34, minWidth: 34, padding: '0 9px', borderRadius: 6,
        border: `1.5px solid ${active ? ART_OLIVE : 'var(--border-2)'}`,
        background: active ? 'rgba(122,158,63,.16)' : 'var(--ink)',
        color: color ?? (active ? ART_OLIVE : 'var(--cream)'),
        fontFamily: ART_SANS, fontSize: 13, fontWeight: ART_DISPLAY_WEIGHT,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? .42 : 1,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {content}
    </button>
  )
  const divider = <span style={{ width: 1, height: 24, background: 'var(--border-2)', display: 'inline-block', margin: '0 2px' }} />

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, width: '100%', minHeight: 42, overflow: 'visible', background: 'rgba(0,0,0,.18)', border: '.5px solid var(--border-2)', borderRadius: 9, padding: 5 }}>
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        title="Voltar última ação"
        style={{ height: 34, padding: '0 10px', borderRadius: 6, border: '.5px solid var(--border-2)', background: 'var(--ink)', color: canUndo ? 'var(--cream)' : 'var(--subtle)', fontFamily: ART_SANS, fontWeight: ART_DISPLAY_WEIGHT, fontSize: 12, cursor: canUndo ? 'pointer' : 'not-allowed', opacity: canUndo ? 1 : .42, whiteSpace: 'nowrap' }}
      >
        Voltar
      </button>
      <button
        type="button"
        onClick={onAdd}
        title="Adicionar caixa de texto"
        style={{ height: 34, minWidth: 40, padding: '0 10px', borderRadius: 6, border: '.5px solid var(--border-2)', background: ART_OLIVE, color: ART_INK, fontFamily: ART_SANS, fontWeight: ART_DISPLAY_WEIGHT, fontSize: 13, cursor: 'pointer' }}
      >
        T+
      </button>
      {onApplyPreset && (
        <div
          ref={presetMenuRef}
          style={{ position: 'relative', flexShrink: 0 }}
        >
          <button
            type="button"
            title="Aplicar modelo pronto"
            aria-haspopup="menu"
            aria-expanded={presetMenuOpen}
            className="btn btn-secondary btn-sm"
            onClick={() => setPresetMenuOpen(open => !open)}
            style={{
              height: 34, padding: '0 12px', borderRadius: 6,
              border: `1.5px solid ${presetMenuOpen ? ART_OLIVE : 'var(--border-2)'}`,
              background: presetMenuOpen ? 'rgba(122,158,63,.16)' : 'var(--ink)',
              color: presetMenuOpen ? ART_OLIVE : 'var(--cream)',
              fontFamily: ART_MONO, fontSize: 10, fontWeight: 500,
              letterSpacing: '.12em', textTransform: 'uppercase',
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            <span style={{ color: ART_OLIVE }}>◆</span>
            Modelos
          </button>
          {presetMenuOpen && (
            <div
              role="menu"
              aria-label="Modelos prontos"
              style={{
                position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 30,
                width: 250, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6,
                padding: 8, border: '.5px solid var(--border-2)',
                borderRadius: 'var(--r-md)', background: 'var(--graphite)',
                boxShadow: '0 18px 48px rgba(0,0,0,.34)',
              }}
            >
              {ART_LAYOUT_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  role="menuitem"
                  className="btn btn-secondary btn-sm"
                  onClick={() => applyPreset(preset.id)}
                  style={{
                    height: 34, justifyContent: 'flex-start', padding: '0 10px',
                    borderRadius: 6, border: '.5px solid var(--border-2)',
                    background: 'var(--ink)', color: 'var(--cream)',
                    fontFamily: ART_MONO, fontSize: 10, fontWeight: 500,
                    letterSpacing: '.1em', textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ color: ART_OLIVE }}>◆</span>
                  {preset.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {divider}
      {tool('B', toggleBold, selectionFormat.bold, selectionFormat.bold ? 'Remover negrito' : 'Negrito')}
      {tool(<span style={{ fontStyle: 'italic' }}>I</span>, toggleItalic, selectionFormat.italic, selectionFormat.italic ? 'Remover itálico' : 'Itálico')}
      {tool(<span style={{ textDecoration: 'underline' }}>U</span>, () => toggleDecoration('underline'), selectionFormat.underline, selectionFormat.underline ? 'Remover sublinhado' : 'Sublinhar')}
      {tool(<span style={{ textDecoration: 'line-through' }}>S</span>, () => toggleDecoration('line-through'), selectionFormat.strike, selectionFormat.strike ? 'Remover tachado' : 'Tachado')}
      {divider}
      <div ref={colorMenuRef} style={{ position: 'relative', flexShrink: 0 }}>
        <button
          type="button"
          title="Cor da fonte"
          disabled={disabled}
          onMouseDown={event => {
            event.preventDefault()
            if (!disabled) setColorMenuOpen(open => !open)
          }}
          style={{
            height: 34, minWidth: 42, padding: '0 9px', borderRadius: 6,
            border: `1.5px solid ${colorMenuOpen ? ART_OLIVE : 'var(--border-2)'}`,
            background: colorMenuOpen ? 'rgba(122,158,63,.16)' : 'var(--ink)',
            color: colorMenuOpen ? ART_OLIVE : 'var(--cream)',
            fontFamily: ART_SANS, fontSize: 13, fontWeight: ART_DISPLAY_WEIGHT,
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? .42 : 1,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 }}>
            A
            <span style={{ width: 18, height: 3, borderRadius: 2, background: ART_TEXT_COLOR[currentColor], border: currentColor === 'ink' ? '.5px solid var(--border-2)' : 'none', marginTop: 2 }} />
          </span>
        </button>
        {colorMenuOpen && (
          <div
            role="menu"
            aria-label="Cores da fonte"
            style={{
              position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 30,
              width: 218, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6,
              padding: 8, border: '.5px solid var(--border-2)',
              borderRadius: 'var(--r-md)', background: 'var(--graphite)',
              boxShadow: '0 18px 48px rgba(0,0,0,.34)',
            }}
          >
            {ART_COLOR_OPTIONS.map(option => {
              const active = option.key === currentColor
              return (
                <button
                  key={option.key}
                  type="button"
                  role="menuitem"
                  title={option.label}
                  onMouseDown={event => {
                    event.preventDefault()
                    selectColor(option.key)
                  }}
                  style={{
                    height: 34, borderRadius: 6,
                    border: `1.5px solid ${active ? ART_OLIVE : 'var(--border-2)'}`,
                    background: active ? 'rgba(122,158,63,.16)' : 'var(--ink)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <span style={{ width: 18, height: 18, borderRadius: '50%', background: ART_TEXT_COLOR[option.key], border: option.key === 'ink' ? '.5px solid var(--border-2)' : 'none', boxShadow: active ? `0 0 0 3px rgba(122,158,63,.18)` : 'none' }} />
                </button>
              )
            })}
          </div>
        )}
      </div>
      {divider}
      {tool('A+', () => applyInline('font-size:1.16em;line-height:.95', { fontSize: Math.min(180, (box?.fontSize ?? 80) + 10) }), false, 'Aumentar fonte')}
      {tool('A-', () => applyInline('font-size:.86em;line-height:1.05', { fontSize: Math.max(24, (box?.fontSize ?? 80) - 10) }), false, 'Diminuir fonte')}
      {tool('Aa', () => onPatch({ uppercase: !box?.uppercase }), box?.uppercase, 'Maiúsculas e minúsculas')}
      {tool('Limpar', () => applyInline(`font-weight:${ART_BODY_WEIGHT};font-style:normal;text-decoration:none;color:inherit;font-size:1em;line-height:1`, { weight: ART_BODY_WEIGHT, italic: false, uppercase: false, fontSize: 76, lineHeight: 1, color: variant === 'graphite' ? 'ink' : 'cream' }), false, 'Limpar formatação')}
      {divider}
      {tool('Ln', () => insertInline('<br>'), false, 'Quebra de linha')}
      {tool('◆', () => insertInline('◆ '), false, 'Marcador', ART_OLIVE)}
      {tool('→', () => insertInline('→'), false, 'Seta')}
      {divider}
      <button type="button" onClick={() => onVariantChange(variant === 'ink' ? 'graphite' : 'ink')} style={{ height: 34, padding: '0 10px', borderRadius: 6, border: '.5px solid var(--border-2)', background: 'var(--ink)', color: 'var(--muted)', fontFamily: ART_SANS, fontWeight: ART_DISPLAY_WEIGHT, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
        {variant === 'ink' ? 'Escuro' : 'Claro'}
      </button>
      <button type="button" onClick={onDownload} disabled={downloading} style={{ height: 34, marginLeft: 'auto', padding: '0 12px', borderRadius: 6, border: 'none', background: ART_OLIVE, color: ART_INK, fontFamily: ART_SANS, fontWeight: ART_DISPLAY_WEIGHT, fontSize: 12, cursor: downloading ? 'wait' : 'pointer', whiteSpace: 'nowrap', opacity: downloading ? .65 : 1 }}>
        {downloading ? 'Baixando...' : downloadLabel}
      </button>
    </div>
  )
}

function FeedPreview({ item, initialPreset }: { item: Item; initialPreset?: ArtLayoutPresetId }) {
  const [active, setActive] = useState(0)
  const [downloading, setDownloading] = useState(false)
  const [slides, setSlides] = useState<SlideType[]>(() => buildFeedSlides(item))
  const [copies, setCopies] = useState<FeedCopies>(() => {
    const base = buildFeedCopies(item)
    const initialSlides = buildFeedSlides(item)
    const firstSlide = initialSlides[0] ?? 'capa'
    if (initialPreset) base[firstSlide] = buildFeedPresetCopy(item, initialPreset, 1)
    return base
  })
  const [selectedId, setSelectedId] = useState('')
  const [history, setHistory] = useState<{ copies: FeedCopies; slides: SlideType[]; active: number; selectedId: string }[]>([])
  const [hoveredThumb, setHoveredThumb] = useState<number | null>(null)
  const slideIdSeq = useRef(0)
  const exportRef = useRef<HTMLDivElement>(null)
  const centerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.38)
  const activeType = slides[Math.min(active, slides.length - 1)] ?? 'capa'
  const activeCopy = copies[activeType] ?? buildBlankFeedCopy('Novo texto')
  const activeElements = activeCopy.elements
  const selectedBoxId = activeElements.some(el => el.id === selectedId) ? selectedId : activeElements[0]?.id ?? ''

  useEffect(() => {
    const el = centerRef.current
    if (!el) return
    const obs = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      const s = Math.min((width - 32) / 1080, (height - 56) / 1350)
      setScale(Math.max(0.18, Math.min(0.6, s)))
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const pushHistory = () => {
    setHistory(prev => [...prev.slice(-23), { copies: cloneFeedCopies(copies), slides: [...slides], active, selectedId }])
  }
  const undo = () => {
    const last = history[history.length - 1]
    if (!last) return
    setCopies(cloneFeedCopies(last.copies))
    setSlides([...last.slides])
    setActive(last.active)
    setSelectedId(last.selectedId)
    setHistory(prev => prev.slice(0, -1))
  }

  const updateActive = (patch: Partial<FeedSlideCopy>, record = true) => {
    if (record) pushHistory()
    setCopies(prev => ({ ...prev, [activeType]: { ...(prev[activeType] ?? activeCopy), ...patch } }))
  }
  const setActiveElements = (elements: ArtTextBox[], record = true) => updateActive({ elements }, record)
  const clipboardRef = useRef<ArtTextBox | null>(null)
  const patchSelected = (patch: Partial<ArtTextBox>) => {
    setActiveElements(activeElements.map(box => box.id === selectedBoxId ? clampArtBox({ ...box, ...patch }, 1080, 1350) : box))
  }
  const addBox = () => {
    const next = artBox(`box-${Date.now().toString(36)}`, 'Novo texto', { x: 120, y: 650, w: 760, fontSize: 82, lineHeight: .96, weight: 400, color: activeCopy.variant === 'graphite' ? 'ink' : 'cream' })
    setActiveElements([...activeElements, next])
    setSelectedId(next.id)
  }
  const removeBox = () => {
    if (activeElements.length <= 1) return
    const next = activeElements.filter(el => el.id !== selectedBoxId)
    setActiveElements(next)
    setSelectedId(next[0]?.id ?? '')
  }
  const nextSlideId = () => {
    slideIdSeq.current += 1
    return `extra-${slides.length}-${slideIdSeq.current}` as SlideType
  }
  const addSlide = () => {
    pushHistory()
    const id = nextSlideId()
    const preset = ART_LAYOUT_PRESET_CYCLE[slides.length % ART_LAYOUT_PRESET_CYCLE.length]
    const nextCopy = buildFeedPresetCopy(item, preset, slides.length + 1)
    setCopies(prev => ({ ...prev, [id]: nextCopy }))
    setSlides(prev => {
      const next = [...prev]
      next.splice(active + 1, 0, id)
      return next
    })
    setActive(active + 1)
    setSelectedId(nextCopy.elements[0]?.id ?? '')
  }
  const applyPreset = (preset: ArtLayoutPresetId) => {
    const nextCopy = buildFeedPresetCopy(item, preset, active + 1)
    updateActive(nextCopy)
    setSelectedId(nextCopy.elements[0]?.id ?? '')
  }
  const duplicateSlide = (index: number) => {
    const sourceId = slides[index]
    const sourceCopy = copies[sourceId]
    if (!sourceCopy) return
    pushHistory()
    const id = nextSlideId()
    const nextCopy = duplicateFeedCopy(sourceCopy, id)
    setCopies(prev => ({ ...prev, [id]: nextCopy }))
    setSlides(prev => {
      const next = [...prev]
      next.splice(index + 1, 0, id)
      return next
    })
    setActive(index + 1)
    setSelectedId(nextCopy.elements[0]?.id ?? '')
  }
  const removeSlideAt = (index: number) => {
    if (slides.length <= 1) return
    pushHistory()
    const removeId = slides[index]
    const nextSlides = slides.filter((_, slideIndex) => slideIndex !== index)
    setSlides(nextSlides)
    setCopies(prev => {
      const next = { ...prev }
      delete next[removeId]
      return next
    })
    const nextIndex = Math.max(0, Math.min(index, nextSlides.length - 1))
    setActive(nextIndex)
    const nextId = nextSlides[nextIndex]
    setSelectedId((copies[nextId]?.elements ?? [])[0]?.id ?? '')
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isTyping = !!target?.closest('[contenteditable="true"], input, textarea, select')
      if (isTyping) return
      const selected = activeElements.find(el => el.id === selectedBoxId)
      const key = event.key.toLowerCase()
      if ((event.metaKey || event.ctrlKey) && key === 'c' && selected) {
        event.preventDefault()
        clipboardRef.current = selected
      }
      if ((event.metaKey || event.ctrlKey) && key === 'v' && clipboardRef.current) {
        event.preventDefault()
        const next = clampArtBox(cloneArtBox(clipboardRef.current), 1080, 1350)
        setActiveElements([...activeElements, next])
        setSelectedId(next.id)
      }
      if ((event.key === 'Backspace' || event.key === 'Delete') && selected && activeElements.length > 1) {
        event.preventDefault()
        removeBox()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeElements, selectedBoxId])

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const container = exportRef.current
      if (!container) return
      const slug = (item as Material).id ?? item.title.toLowerCase().replace(/\s+/g, '-')
      for (let i = 0; i < slides.length; i++) {
        const el = container.children[i] as HTMLElement
        if (!el) continue
        await downloadAsPng(el, `${slug}-feed-${i + 1}.png`)
        await new Promise(r => setTimeout(r, 300))
      }
    } finally {
      setDownloading(false)
    }
  }

  const THUMB_S = 0.038
  const TW = Math.round(1080 * THUMB_S)
  const TH = Math.round(1350 * THUMB_S)
  const windowWidth = useWindowWidth()
  const isMobile = windowWidth < 900

  const renderThumbBtn = (t: SlideType, i: number) => {
    const isActive = active === i
    const showActions = isMobile ? isActive : hoveredThumb === i
    return (
      <div
        key={`${t}-${i}`}
        onMouseEnter={() => setHoveredThumb(i)}
        onMouseLeave={() => setHoveredThumb(null)}
        style={{ width: TW + 4, position: 'relative', flexShrink: 0 }}
      >
        <button onClick={() => setActive(i)}
          style={{ width: TW + 4, height: TH + 18, padding: 0, background: 'var(--ink)', border: `2px solid ${isActive ? ART_OLIVE : 'rgba(255,255,255,.12)'}`, borderRadius: 5, cursor: 'pointer', overflow: 'hidden', flexShrink: 0, boxSizing: 'border-box' }}>
          <div style={{ width: TW, height: TH, position: 'relative', overflow: 'hidden', borderRadius: 3 }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: 1080, height: 1350, transform: `scale(${THUMB_S})`, transformOrigin: 'top left', pointerEvents: 'none' }}>
              <FeedSlide item={item} type={t} counter={i + 1} total={slides.length} s={1} copy={copies[t]} />
            </div>
          </div>
          <div style={{ height: 14, lineHeight: '14px', fontFamily: ART_MONO, fontSize: 8, color: isActive ? ART_OLIVE : 'var(--muted)', padding: 0, background: 'var(--ink)', textAlign: 'center' }}>
            {String(i + 1).padStart(2, '0')}
          </div>
        </button>
        {showActions && (
          <div style={{ position: 'absolute', left: isMobile ? 0 : 'calc(100% + 6px)', top: isMobile ? 'calc(100% + 4px)' : 0, zIndex: 24, display: 'grid', gap: 4, width: 78 }}>
            <button type="button" onClick={event => { event.stopPropagation(); duplicateSlide(i) }} style={{ height: 23, borderRadius: 5, border: '.5px solid var(--border-2)', background: 'var(--graphite)', color: 'var(--cream)', fontFamily: ART_MONO, fontSize: 9, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer' }}>Duplicar</button>
            <button type="button" disabled={slides.length <= 1} onClick={event => { event.stopPropagation(); removeSlideAt(i) }} style={{ height: 23, borderRadius: 5, border: '.5px solid var(--border-2)', background: 'var(--ink)', color: slides.length > 1 ? 'var(--muted)' : 'var(--subtle)', fontFamily: ART_MONO, fontSize: 9, letterSpacing: '.08em', textTransform: 'uppercase', cursor: slides.length > 1 ? 'pointer' : 'not-allowed', opacity: slides.length > 1 ? 1 : .48 }}>Excluir</button>
          </div>
        )}
      </div>
    )
  }

  const renderAddThumbBtn = () => (
    <button type="button" onClick={addSlide} title="Adicionar imagem ao carrossel"
      style={{ width: TW + 4, height: TH + 18, padding: 0, background: 'var(--ink)', border: '1.5px dashed var(--border-2)', borderRadius: 5, color: ART_OLIVE, cursor: 'pointer', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, boxSizing: 'border-box' }}>
      <span style={{ fontFamily: ART_SANS, fontWeight: ART_DISPLAY_WEIGHT, fontSize: 18, lineHeight: 1 }}>+</span>
      <span style={{ fontFamily: ART_MONO, fontSize: 7, letterSpacing: '.08em', textTransform: 'uppercase' }}>nova</span>
      </button>
  )

  const toolbar = (
    <ArtToolbar
      box={activeElements.find(el => el.id === selectedBoxId)}
      onPatch={patchSelected}
      onAdd={addBox}
      onUndo={undo}
      canUndo={history.length > 0}
      onApplyPreset={applyPreset}
      variant={activeCopy.variant}
      onVariantChange={variant => updateActive({ variant })}
      onDownload={handleDownload}
      downloading={downloading}
      downloadLabel={`Baixar ${slides.length} slides`}
    />
  )

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', overflow: 'hidden' }}>
        {toolbar}
        <div style={{ display: 'flex', gap: 6, overflow: 'visible', padding: '2px 0 58px' }}>
          {slides.map((t, i) => renderThumbBtn(t, i))}
          {renderAddThumbBtn()}
        </div>
        <div ref={centerRef} style={{ width: '100%', flex: 1, minHeight: 260, position: 'relative', background: 'rgba(0,0,0,.3)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 12, left: 12, width: Math.round(1080 * scale), height: Math.round(1350 * scale), overflow: 'hidden', borderRadius: 3 }}>
            <EditableArtCanvas w={1080} h={1350} scale={scale} variant={activeCopy.variant} counter={active + 1} total={slides.length} elements={activeElements} selectedId={selectedBoxId} onSelectedId={setSelectedId} onElementsChange={setActiveElements} />
          </div>
        </div>
        <div ref={exportRef} style={{ position: 'fixed', left: -9999, top: 0, pointerEvents: 'none' }}>
          {slides.map((t, i) => <FeedSlide key={i} item={item} type={t} counter={i + 1} total={slides.length} s={1} copy={copies[t]} />)}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {toolbar}
      <div style={{ display: 'flex', gap: 0, flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <div style={{ width: TW + 10, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 5, paddingRight: 8, overflow: 'visible' }}>
          {slides.map((t, i) => renderThumbBtn(t, i))}
          {renderAddThumbBtn()}
        </div>
        <div ref={centerRef} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0, background: 'rgba(0,0,0,.25)', borderRadius: 10, border: '.5px solid var(--border-2)', padding: 12, overflow: 'hidden' }}>
          <div style={{ width: Math.round(1080 * scale), height: Math.round(1350 * scale), position: 'relative', overflow: 'hidden', borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,.5)' }}>
            <EditableArtCanvas w={1080} h={1350} scale={scale} variant={activeCopy.variant} counter={active + 1} total={slides.length} elements={activeElements} selectedId={selectedBoxId} onSelectedId={setSelectedId} onElementsChange={setActiveElements} />
          </div>
        </div>
      </div>
      <div ref={exportRef} style={{ position: 'fixed', left: -9999, top: 0, pointerEvents: 'none' }}>
        {slides.map((t, i) => <FeedSlide key={i} item={item} type={t} counter={i + 1} total={slides.length} s={1} copy={copies[t]} />)}
      </div>
    </div>
  )
}

function StoriesPreview({ item, initialPreset }: { item: Item; initialPreset?: ArtLayoutPresetId }) {
  const m = item as Material
  const [active, setActive] = useState(0)
  const [downloading, setDownloading] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [storySlides, setStorySlides] = useState<StoriesState[]>(() => [buildStoryState(item, 'ink', initialPreset ?? 'impacto')])
  const [history, setHistory] = useState<{ storySlides: StoriesState[]; active: number; selectedId: string }[]>([])
  const [hoveredThumb, setHoveredThumb] = useState<number | null>(null)
  const storyIdSeq = useRef(0)
  const exportRef = useRef<HTMLDivElement>(null)
  const centerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.28)
  const windowWidth = useWindowWidth()
  const isMobile = windowWidth < 900
  const activeIndex = Math.max(0, Math.min(active, storySlides.length - 1))
  const st = storySlides[activeIndex] ?? buildStoryState(item)
  const activeElements = st.elements
  const selectedBoxId = activeElements.some(el => el.id === selectedId) ? selectedId : activeElements[0]?.id ?? ''

  useEffect(() => {
    const el = centerRef.current
    if (!el) return
    const obs = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      const s = Math.min((width - 32) / 1080, (height - 56) / 1920)
      setScale(Math.max(0.15, Math.min(0.5, s)))
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const pushHistory = () => {
    setHistory(prev => [...prev.slice(-23), { storySlides: storySlides.map(cloneStoriesState), active, selectedId }])
  }
  const undo = () => {
    const last = history[history.length - 1]
    if (!last) return
    setStorySlides(last.storySlides.map(cloneStoriesState))
    setActive(last.active)
    setSelectedId(last.selectedId)
    setHistory(prev => prev.slice(0, -1))
  }

  const updateStory = (patch: Partial<StoriesState>, record = true) => {
    if (record) pushHistory()
    setStorySlides(prev => prev.map((story, index) => index === activeIndex ? { ...story, ...patch } : story))
  }
  const setStoryElements = (elements: ArtTextBox[], record = true) => updateStory({ elements }, record)
  const clipboardRef = useRef<ArtTextBox | null>(null)
  const patchSelected = (patch: Partial<ArtTextBox>) => {
    setStoryElements(activeElements.map(box => box.id === selectedBoxId ? clampArtBox({ ...box, ...patch }, 1080, 1920) : box))
  }
  const addBox = () => {
    const next = artBox(`story-box-${Date.now().toString(36)}`, 'Novo texto', { x: 88, y: 860, w: 820, fontSize: 104, lineHeight: .95, weight: 400, color: st.variant === 'graphite' ? 'ink' : 'cream' })
    setStoryElements([...activeElements, next])
    setSelectedId(next.id)
  }
  const removeBox = () => {
    if (activeElements.length <= 1) return
    const next = activeElements.filter(el => el.id !== selectedBoxId)
    setStoryElements(next)
    setSelectedId(next[0]?.id ?? '')
  }
  const nextStorySuffix = () => {
    storyIdSeq.current += 1
    return `${storySlides.length}-${storyIdSeq.current}`
  }
  const addStory = () => {
    pushHistory()
    const preset = ART_LAYOUT_PRESET_CYCLE[storySlides.length % ART_LAYOUT_PRESET_CYCLE.length]
    const nextStory = buildStoryState(item, st.variant, preset, storySlides.length + 1)
    setStorySlides(prev => {
      const next = [...prev]
      next.splice(activeIndex + 1, 0, nextStory)
      return next
    })
    setActive(activeIndex + 1)
    setSelectedId(nextStory.elements[0]?.id ?? '')
  }
  const applyStoryPreset = (preset: ArtLayoutPresetId) => {
    const nextStory = buildStoryState(item, st.variant, preset, activeIndex + 1)
    updateStory(nextStory)
    setSelectedId(nextStory.elements[0]?.id ?? '')
  }
  const duplicateStory = (index: number) => {
    const source = storySlides[index]
    if (!source) return
    pushHistory()
    const nextStory = duplicateStoriesState(source, nextStorySuffix())
    setStorySlides(prev => {
      const next = [...prev]
      next.splice(index + 1, 0, nextStory)
      return next
    })
    setActive(index + 1)
    setSelectedId(nextStory.elements[0]?.id ?? '')
  }
  const removeStoryAt = (index: number) => {
    if (storySlides.length <= 1) return
    pushHistory()
    const nextSlides = storySlides.filter((_, storyIndex) => storyIndex !== index)
    const nextIndex = Math.max(0, Math.min(index, nextSlides.length - 1))
    setStorySlides(nextSlides)
    setActive(nextIndex)
    setSelectedId(nextSlides[nextIndex]?.elements[0]?.id ?? '')
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isTyping = !!target?.closest('[contenteditable="true"], input, textarea, select')
      if (isTyping) return
      const selected = activeElements.find(el => el.id === selectedBoxId)
      const key = event.key.toLowerCase()
      if ((event.metaKey || event.ctrlKey) && key === 'c' && selected) {
        event.preventDefault()
        clipboardRef.current = selected
      }
      if ((event.metaKey || event.ctrlKey) && key === 'v' && clipboardRef.current) {
        event.preventDefault()
        const next = clampArtBox(cloneArtBox(clipboardRef.current), 1080, 1920)
        setStoryElements([...activeElements, next])
        setSelectedId(next.id)
      }
      if ((event.key === 'Backspace' || event.key === 'Delete') && selected && activeElements.length > 1) {
        event.preventDefault()
        removeBox()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeElements, selectedBoxId])

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const container = exportRef.current
      if (!container) return
      const slug = m.id ?? item.title.toLowerCase().replace(/\s+/g, '-')
      for (let i = 0; i < storySlides.length; i++) {
        const el = container.children[i] as HTMLElement
        if (!el) continue
        await downloadAsPng(el, `${slug}-stories-${i + 1}.png`)
        await new Promise(r => setTimeout(r, 300))
      }
    } finally {
      setDownloading(false)
    }
  }

  const THUMB_S = 0.028
  const TW = Math.round(1080 * THUMB_S)
  const TH = Math.round(1920 * THUMB_S)

  const renderThumbBtn = (story: StoriesState, i: number) => {
    const isActive = activeIndex === i
    const showActions = isMobile ? isActive : hoveredThumb === i
    return (
      <div
        key={i}
        onMouseEnter={() => setHoveredThumb(i)}
        onMouseLeave={() => setHoveredThumb(null)}
        style={{ width: TW + 4, position: 'relative', flexShrink: 0 }}
      >
        <button onClick={() => setActive(i)}
          style={{ width: TW + 4, height: TH + 18, padding: 0, background: 'var(--ink)', border: `2px solid ${isActive ? ART_OLIVE : 'rgba(255,255,255,.12)'}`, borderRadius: 5, cursor: 'pointer', overflow: 'hidden', flexShrink: 0, boxSizing: 'border-box' }}>
          <div style={{ width: TW, height: TH, position: 'relative', overflow: 'hidden', borderRadius: 3 }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: 1080, height: 1920, transform: `scale(${THUMB_S})`, transformOrigin: 'top left', pointerEvents: 'none' }}>
              <StoriesSlide st={story} s={1} />
            </div>
          </div>
          <div style={{ height: 14, lineHeight: '14px', fontFamily: ART_MONO, fontSize: 8, color: isActive ? ART_OLIVE : 'var(--muted)', padding: 0, background: 'var(--ink)', textAlign: 'center' }}>
            {String(i + 1).padStart(2, '0')}
          </div>
        </button>
        {showActions && (
          <div style={{ position: 'absolute', left: isMobile ? 0 : 'calc(100% + 6px)', top: isMobile ? 'calc(100% + 4px)' : 0, zIndex: 24, display: 'grid', gap: 4, width: 78 }}>
            <button type="button" onClick={event => { event.stopPropagation(); duplicateStory(i) }} style={{ height: 23, borderRadius: 5, border: '.5px solid var(--border-2)', background: 'var(--graphite)', color: 'var(--cream)', fontFamily: ART_MONO, fontSize: 9, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer' }}>Duplicar</button>
            <button type="button" disabled={storySlides.length <= 1} onClick={event => { event.stopPropagation(); removeStoryAt(i) }} style={{ height: 23, borderRadius: 5, border: '.5px solid var(--border-2)', background: 'var(--ink)', color: storySlides.length > 1 ? 'var(--muted)' : 'var(--subtle)', fontFamily: ART_MONO, fontSize: 9, letterSpacing: '.08em', textTransform: 'uppercase', cursor: storySlides.length > 1 ? 'pointer' : 'not-allowed', opacity: storySlides.length > 1 ? 1 : .48 }}>Excluir</button>
          </div>
        )}
      </div>
    )
  }

  const renderAddThumbBtn = () => (
    <button type="button" onClick={addStory} title="Adicionar story"
      style={{ width: TW + 4, height: TH + 18, padding: 0, background: 'var(--ink)', border: '1.5px dashed var(--border-2)', borderRadius: 5, color: ART_OLIVE, cursor: 'pointer', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, boxSizing: 'border-box' }}>
      <span style={{ fontFamily: ART_SANS, fontWeight: ART_DISPLAY_WEIGHT, fontSize: 18, lineHeight: 1 }}>+</span>
      <span style={{ fontFamily: ART_MONO, fontSize: 7, letterSpacing: '.08em', textTransform: 'uppercase' }}>nova</span>
      </button>
  )

  const toolbar = (
    <ArtToolbar
      box={activeElements.find(el => el.id === selectedBoxId)}
      onPatch={patchSelected}
      onAdd={addBox}
      onUndo={undo}
      canUndo={history.length > 0}
      onApplyPreset={applyStoryPreset}
      variant={st.variant}
      onVariantChange={variant => updateStory({ variant })}
      onDownload={handleDownload}
      downloading={downloading}
      downloadLabel={`Baixar ${storySlides.length} stories`}
    />
  )

  const renderPreviewBox = (style?: CSSProperties) => (
    <div ref={centerRef} style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.25)', borderRadius: 10, border: '.5px solid var(--border-2)', padding: 12, overflow: 'hidden', ...style }}>
      <div style={{ width: Math.round(1080 * scale), height: Math.round(1920 * scale), position: 'relative', overflow: 'hidden', borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,.5)' }}>
        <EditableArtCanvas w={1080} h={1920} scale={scale} variant={st.variant} safeZone elements={activeElements} selectedId={selectedBoxId} onSelectedId={setSelectedId} onElementsChange={setStoryElements} />
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', height: isMobile ? 'auto' : '100%', minHeight: 0, overflow: 'hidden' }}>
      {toolbar}
      {isMobile && (
        <div style={{ display: 'flex', gap: 6, overflow: 'visible', padding: '2px 0 58px' }}>
          {storySlides.map((story, i) => renderThumbBtn(story, i))}
          {renderAddThumbBtn()}
        </div>
      )}
      {!isMobile && (
        <div style={{ display: 'flex', gap: 0, flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div style={{ width: TW + 10, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 5, paddingRight: 8, overflow: 'visible' }}>
            {storySlides.map((story, i) => renderThumbBtn(story, i))}
            {renderAddThumbBtn()}
          </div>
          {renderPreviewBox()}
        </div>
      )}
      {isMobile && renderPreviewBox({ height: '60vw', minHeight: 260, flex: 'none' })}
      <div ref={exportRef} style={{ position: 'fixed', left: -9999, top: 0, pointerEvents: 'none' }}>
        {storySlides.map((story, i) => <StoriesSlide key={i} st={story} s={1} />)}
      </div>
    </div>
  )
}

// ── MODAL DE DIVULGAÇÃO CE.X ──────────────────────────────────────────────────

function ArtesModal({ item, initialTab, initialPreset, onClose }: { item: Item; initialTab: ArtSurface; initialPreset?: ArtLayoutPresetId; onClose: () => void }) {
  const [tab, setTab] = useState<ArtSurface>(initialTab)
  const isMobile = useWindowWidth() < 900

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', padding: 24,
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: 'var(--graphite)', border: '.5px solid var(--border-2)',
        borderRadius: 16, width: '100%', maxWidth: 1200, height: 'calc(100vh - 48px)',
        padding: 24, display: 'flex', flexDirection: 'column', gap: 16,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--olive)', letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 4 }}>
              ◆ Divulgação CE.X
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--cream)', letterSpacing: '-.02em', maxWidth: 760, lineHeight: 1.25 }}>
              {item.title}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: '.5px solid var(--border-2)', borderRadius: 8, color: 'var(--muted)', cursor: 'pointer', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CloseIcon size={16} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: 'var(--ink)', border: '.5px solid var(--border-2)', borderRadius: 8, padding: 3, gap: 3 }}>
          {(['feed', 'stories'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', border: 'none', borderRadius: 6, padding: '8px 0', cursor: 'pointer', transition: 'all .15s', background: tab === t ? 'var(--olive)' : 'transparent', color: tab === t ? 'var(--ink)' : 'var(--muted)', fontWeight: tab === t ? 700 : 400 }}>
              {t === 'feed' ? 'Carrossel 4:5' : 'Stories 9:16'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: isMobile ? 'auto' : 'hidden' }}>
          {tab === 'feed' && <FeedPreview item={item} initialPreset={initialPreset} />}
          {tab === 'stories' && <StoriesPreview item={item} initialPreset={initialPreset} />}
        </div>

        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--subtle)', textAlign: 'center', letterSpacing: '.06em' }}>
          Artes para o mentor divulgar este material com a identidade CE.X · campusexpansao.com.br
        </div>
      </div>
    </div>
  )
}

// ── DASHBOARD ────────────────────────────────────────────────────────────────

function Delta({ v }: { v: number }) {
  const up = v >= 0
  return <span className={`kpi-delta ${up ? 'up' : 'down'}`}>{up ? '▲' : '▼'} {Math.abs(v)}%</span>
}

function KpiCard({ label, value, delta, sub }: { label: string; value: string; delta: number; sub: string }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-foot"><Delta v={delta} /><span className="kpi-sub">{sub}</span></div>
    </div>
  )
}

function VisitsChart({ series }: { series: number[] }) {
  const w = 760, h = 200, pad = 8
  const max = Math.max(...series), min = Math.min(...series)
  const x = (i: number) => pad + (i * (w - pad * 2)) / (series.length - 1)
  const y = (v: number) => h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2 - 18)
  const line = series.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const area = `${line} L${x(series.length - 1).toFixed(1)},${h} L${x(0).toFixed(1)},${h} Z`
  const peak = series.indexOf(max)
  const fmt = (n: number) => n.toLocaleString('pt-BR')
  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">Visitas ao site · últimos 30 dias</span>
        <span className="panel-meta">{fmt(series.reduce((a, b) => a + b, 0))} no período</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="chart" preserveAspectRatio="none">
        <defs>
          <linearGradient id="vg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7A9E3F" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#7A9E3F" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((g, i) => <line key={i} x1="0" x2={w} y1={h * g} y2={h * g} className="chart-grid" />)}
        <path d={area} fill="url(#vg)" />
        <path d={line} fill="none" stroke="#7A9E3F" strokeWidth="2" />
        <circle cx={x(peak)} cy={y(max)} r="3.5" fill="#94B85C" />
      </svg>
    </div>
  )
}

function Funnel({ steps }: { steps: { label: string; value: number }[] }) {
  const top = steps[0]?.value ?? 0
  const fmt = (n: number) => n.toLocaleString('pt-BR')
  return (
    <div className="panel">
      <div className="panel-head"><span className="panel-title">Funil de conversão</span></div>
      <div className="funnel">
        {steps.map((s, i) => {
          const previous = steps[i - 1]?.value ?? 0
          const pct = top ? (s.value / top) * 100 : 0
          const conv = i === 0 ? (top ? 100 : 0) : (previous ? (s.value / previous) * 100 : 0)
          return (
            <div className="funnel-row" key={i}>
              <div className="funnel-meta">
                <span className="funnel-label">{s.label}</span>
                <span className="funnel-val">{fmt(s.value)} {i > 0 && <em>· {conv.toFixed(0)}%</em>}</span>
              </div>
              <div className="funnel-track"><div className="funnel-fill" style={{ width: `${pct}%` }} /></div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Origem({ rows }: { rows: { label: string; value: number; color: string }[] }) {
  return (
    <div className="panel">
      <div className="panel-head"><span className="panel-title">Origem do tráfego</span></div>
      <div className="origem">
        {rows.map((r, i) => (
          <div className="origem-row" key={i}>
            <span className="origem-label">{r.label}</span>
            <div className="origem-track"><div className="origem-fill" style={{ width: `${r.value}%`, background: r.color }} /></div>
            <span className="origem-val">{r.value}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TopItens({ items }: { items: Item[] }) {
  const fmt = (n: number) => n.toLocaleString('pt-BR')
  const top = [...items].sort((a, b) => b.views - a.views).slice(0, 6)
  const maxV = top[0]?.views ?? 1
  return (
    <div className="panel">
      <div className="panel-head"><span className="panel-title">Itens mais vistos</span><span className="panel-meta">30 dias</span></div>
      <div className="toplist">
        {top.map((it, i) => (
          <div className="top-row" key={it.id}>
            <span className="top-rank">{String(i + 1).padStart(2, '0')}</span>
            <div className="top-main">
              <div className="top-title">{it.title}</div>
              <div className="top-bar"><div style={{ width: `${(it.views / maxV) * 100}%`, background: it.accent }} /></div>
            </div>
            <span className="top-views">{fmt(it.views)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ListaEspera({ cursos }: { cursos: Curso[] }) {
  const fmt = (n: number) => n.toLocaleString('pt-BR')
  const rows = [...cursos].sort((a, b) => b.waitlist - a.waitlist).slice(0, 4)
  return (
    <div className="panel">
      <div className="panel-head"><span className="panel-title">Lista de espera · cursos</span></div>
      <div className="toplist">
        {rows.map((c) => (
          <div className="top-row" key={c.id}>
            <span className="le-tag" style={{ color: c.accent, borderColor: c.accent }}>◆ {c.level}</span>
            <div className="top-main"><div className="top-title">{c.title}</div></div>
            <span className="top-views" style={{ color: c.accent }}>{fmt(c.waitlist)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MaterialFunnel({ materiais }: { materiais: Material[] }) {
  const fmt = (n: number) => n.toLocaleString('pt-BR')
  const rows = [...materiais]
    .filter((m) => m.status === 'Publicado' && (m.views > 0 || m.buyClicks > 0 || m.purchases > 0))
    .sort((a, b) => b.purchases - a.purchases || b.views - a.views)
  return (
    <div className="panel">
      <div className="panel-head"><span className="panel-title">Materiais em venda</span><span className="panel-meta">30 dias</span></div>
      <div className="mf-table">
        <div className="mf-row mf-head">
          <span>Material</span>
          <span className="mf-num">Visualizou</span>
          <span className="mf-num">Clicou em comprar</span>
          <span className="mf-num">Comprou</span>
          <span className="mf-num">Conversão</span>
        </div>
        {rows.map((m) => {
          const conv = m.views ? (m.purchases / m.views) * 100 : 0
          return (
            <div className="mf-row" key={m.id}>
              <span className="mf-title">{m.title}</span>
              <span className="mf-num" data-label="Visualizou">{fmt(m.views)}</span>
              <span className="mf-num" data-label="Clicou em comprar">{fmt(m.buyClicks)}</span>
              <span className="mf-num mf-purchases" data-label="Comprou">{fmt(m.purchases)}</span>
              <span className="mf-num mf-conv" data-label="Conversão">{conv.toFixed(1)}%</span>
            </div>
          )
        })}
        {!rows.length && (
          <div className="wb-empty">Nenhum material publicado com movimento nos últimos 30 dias.</div>
        )}
      </div>
    </div>
  )
}

function Dashboard({ data }: { data: AdminData }) {
  const m = data.metrics
  const fmt = (n: number) => n.toLocaleString('pt-BR')
  const allItems: Item[] = [...data.materiais, ...data.cursos, ...data.mentorias, ...data.eventos]
  return (
    <div className="dash">
      <div className="kpi-row">
        <KpiCard label="Visitas (30d)" value={fmt(m.kpis.visitas)} delta={m.kpis.visitasDelta} sub="vs. período anterior" />
        <KpiCard label="Cliques em comprar" value={fmt(m.kpis.cliquesComprar)} delta={m.kpis.cliquesDelta} sub="checkout" />
        <KpiCard label="Lista de espera" value={fmt(m.kpis.listaEspera)} delta={m.kpis.listaDelta} sub="cursos ao vivo" />
        <KpiCard label="Capturas de e-mail" value={fmt(m.kpis.capturas)} delta={m.kpis.capturasDelta} sub="capturas de e-mail" />
      </div>
      <VisitsChart series={m.series30} />
      <div className="dash-2col">
        <Funnel steps={m.funil} />
        <Origem rows={m.origem} />
      </div>
      <MaterialFunnel materiais={data.materiais} />
      <div className="dash-2col">
        <TopItens items={allItems} />
        <ListaEspera cursos={data.cursos} />
      </div>
    </div>
  )
}

// ── EDITOR ───────────────────────────────────────────────────────────────────

function Field({ label, hint, children, req }: { label: string; hint?: string; children: ReactNode; req?: boolean }) {
  return (
    <div className="fld">
      <label className="fld-label">{label}{req && <span className="fld-req"> ◆</span>}</label>
      {children}
      {hint && <div className="fld-hint">{hint}</div>}
    </div>
  )
}

function SectionHead({ mark, opt }: { mark: string; opt?: string }) {
  return (
    <div className="ed-sec">
      <span className="ed-sec-mark">◆ {mark}</span>
      <span className="ed-sec-line" />
      {opt && <span className="ed-sec-opt">{opt}</span>}
    </div>
  )
}

function AccentLock({ value, name }: { value: string; name: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--ink)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-sm)', padding: '11px 14px' }}>
      <span style={{ width: 26, height: 26, borderRadius: 6, background: value, flexShrink: 0, border: '.5px solid rgba(255,255,255,.14)' }} />
      <span style={{ fontSize: 14, color: 'var(--light)', fontWeight: 600 }}>{name}</span>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--subtle)', marginLeft: 'auto' }}>{value}</span>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--subtle)', letterSpacing: '.08em' }}>◆ TRAVADA</span>
    </div>
  )
}

function ListField({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const set = (i: number, v: string) => { const a = [...value]; a[i] = v; onChange(a) }
  const add = () => onChange([...value, ''])
  const del = (i: number) => onChange(value.filter((_, k) => k !== i))
  return (
    <div className="ementa">
      {value.map((e, i) => (
        <div className="ementa-row" key={i}>
          <span className="ementa-num">→</span>
          <input className="inp" value={e} onChange={(ev) => set(i, ev.target.value)} placeholder={placeholder} />
          <button className="ementa-del" onClick={() => del(i)}><CloseIcon size={12} /></button>
        </div>
      ))}
      <button className="btn-ghost-add" onClick={add}>+ Adicionar item</button>
    </div>
  )
}

function CloseIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true"
      fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M5 5l14 14" />
      <path d="M19 5L5 19" />
    </svg>
  )
}

function DocumentTextIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v5h5" />
      <path d="M9 12h6" />
      <path d="M9 16h6" />
      <path d="M9 8h2" />
    </svg>
  )
}

function PdfFileIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v5h5" />
      <path d="M8.5 15h7" />
      <path d="M8.5 12h4.5" />
      <path d="M9 18h2" />
      <path d="M14 18h1" />
    </svg>
  )
}

function SlidesIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5h16v11H4z" />
      <path d="M8 20h8" />
      <path d="M12 16v4" />
      <path d="M8 9h8" />
      <path d="M8 12h5" />
    </svg>
  )
}

function DesignIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 8h8" />
      <path d="M8 16h5" />
      <path d="M16 12l2 2" />
      <path d="M6 18l5-5" />
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 15V4" />
      <path d="M7 9l5-5 5 5" />
      <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  )
}

function MaterialContentsField({
  value,
  onChange,
  messageList,
  onMessageListChange,
  materialId,
}: {
  value: MaterialContent[]
  onChange: (v: MaterialContent[]) => void
  messageList: MaterialMessage[]
  onMessageListChange: (v: MaterialMessage[]) => void
  materialId: string
}) {
  const contents = value ?? []
  const [active, setActive] = useState(0)
  const [addOpen, setAddOpen] = useState(false)
  const [studioSetupOpen, setStudioSetupOpen] = useState(false)
  const [studioOpen, setStudioOpen] = useState(false)
  const [studioMode, setStudioMode] = useState<StudioMode>('document')
  const [deliveryOpen, setDeliveryOpen] = useState(false)
  const [savingDelivery, setSavingDelivery] = useState<'word' | 'pdf' | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [editingContentIndex, setEditingContentIndex] = useState<number | null>(null)
  const [studioDraft, setStudioDraft] = useState<{ name: string; note: string; model: StudioDocumentModel }>({
    name: '',
    note: '',
    model: 'branco',
  })
  const studioFrameRef = useRef<HTMLIFrameElement | null>(null)
  const syncMessageFromContent = (contentIndex: number, content: MaterialContent) => {
    if (content.kind !== 'word') return
    const messageIndex = contents.slice(0, contentIndex + 1).filter((item) => item.kind === 'word').length - 1
    const nextMessages = [...(messageList ?? [])]
    nextMessages[messageIndex] = {
      nome: content.name,
      desc: content.note,
    }
    onMessageListChange(nextMessages)
  }
  const set = (i: number, patch: Partial<MaterialContent>) => {
    const next = [...contents]
    next[i] = { ...next[i], ...patch }
    onChange(next)
    syncMessageFromContent(i, next[i])
  }
  const openDocumentEditor = () => {
    setAddOpen(false)
    setStudioMode('document')
    setStudioDraft({ name: '', note: '', model: 'branco' })
    setEditingContentIndex(null)
    setStudioSetupOpen(true)
  }
  const [slidesChoiceOpen, setSlidesChoiceOpen] = useState(false)
  const openSlidesEditor = () => {
    setAddOpen(false)
    setPptxImportError(null)
    setSlidesChoiceOpen(true)
  }
  const startBlankSlides = () => {
    setSlidesChoiceOpen(false)
    setStudioMode('slides')
    setStudioDraft({ name: '', note: '', model: 'branco' })
    setEditingContentIndex(null)
    setStudioSetupOpen(true)
  }
  const openDesignEditor = () => {
    setAddOpen(false)
    setStudioMode('design')
    setStudioDraft({ name: '', note: '', model: 'branco' })
    setEditingContentIndex(null)
    setStudioSetupOpen(true)
  }
  const pptxInputRef = useRef<HTMLInputElement | null>(null)
  const [pptxImporting, setPptxImporting] = useState(false)
  const [pptxImportError, setPptxImportError] = useState<string | null>(null)
  const openPptxImport = () => {
    setPptxImportError(null)
    pptxInputRef.current?.click()
  }
  const handlePptxFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPptxImporting(true)
    setPptxImportError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/studio/import-pptx', { method: 'POST', body: formData })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.pages) throw new Error(data?.error || 'Falha ao importar o arquivo.')
      window.localStorage.setItem('cex_studio_slides_seed', JSON.stringify({
        format: 'slide',
        current: 0,
        accent: '#7A9E3F',
        pages: data.pages,
        full: true,
      }))
      window.localStorage.removeItem('cex_studio_slides_v2')
      if (Array.isArray(data.warnings) && data.warnings.length) {
        console.warn('Avisos da importação de PowerPoint:', data.warnings)
      }
      setAddOpen(false)
      setSlidesChoiceOpen(false)
      setStudioMode('slides')
      setStudioDraft({ name: file.name.replace(/\.pptx$/i, ''), note: '', model: 'branco' })
      setEditingContentIndex(null)
      setStudioOpen(true)
    } catch (err) {
      setPptxImportError(err instanceof Error ? err.message : 'Falha ao importar o arquivo.')
    } finally {
      setPptxImporting(false)
    }
  }
  const openExistingVisualEditor = (index: number) => {
    const item = contents[index]
    if (!item || (item.kind !== 'design' && item.kind !== 'ppt')) return
    const mode: StudioMode = item.kind === 'design' ? 'design' : 'slides'
    const seedKey = mode === 'design' ? 'cex_studio_art_seed' : 'cex_studio_slides_seed'
    const draftKey = mode === 'design' ? 'cex_studio_art_v2' : 'cex_studio_slides_v2'
    try {
      if (item.payload) {
        window.localStorage.setItem(seedKey, JSON.stringify({ ...item.payload, full: true }))
      } else {
        window.localStorage.removeItem(seedKey)
      }
      window.localStorage.removeItem(draftKey)
    } catch {
      // O editor ainda abre; apenas sem seed caso o browser bloqueie o storage.
    }
    setStudioMode(mode)
    setStudioDraft({ name: item.name, note: item.note, model: 'branco' })
    setEditingContentIndex(index)
    setDetailsOpen(false)
    setStudioOpen(true)
  }
  const startStudioDocument = () => {
    if (!studioDraft.name.trim()) return
    if (studioMode === 'slides') {
      try {
        window.localStorage.setItem('cex_studio_slides_seed', JSON.stringify({
          title: studioDraft.name.trim(),
          subtitle: studioDraft.note.trim(),
          category: 'Campus Expansão',
          accent: '#7A9E3F',
          handle: '@suaigreja',
        }))
        window.localStorage.removeItem('cex_studio_slides_v2')
      } catch {
        // O editor ainda abre; apenas sem seed inicial caso o browser bloqueie o storage.
      }
    }
    if (studioMode === 'design') {
      try {
        window.localStorage.setItem('cex_studio_art_seed', JSON.stringify({
          title: studioDraft.name.trim(),
          subtitle: studioDraft.note.trim(),
          category: 'Campus Expansão',
          format: 'carousel',
          handle: '@suaigreja',
        }))
        window.localStorage.removeItem('cex_studio_art_v2')
      } catch {
        // O editor ainda abre; apenas sem seed inicial caso o browser bloqueie o storage.
      }
    }
    setStudioSetupOpen(false)
    setStudioOpen(true)
  }
  const handleStudioLoad = () => {
    if (studioMode !== 'document') return
    const target = studioFrameRef.current?.contentWindow
    if (!target) return
    window.setTimeout(() => {
      target.postMessage({ type: 'cex-studio-load', payload: studioDraft }, window.location.origin)
    }, 80)
  }
  const saveStudioToMaterial = async (delivery: 'word' | 'pdf') => {
    const frameDoc = studioFrameRef.current?.contentDocument
    const editor = frameDoc?.getElementById('editor')
    const docTitle = frameDoc?.getElementById('docTitle') as HTMLInputElement | null
    const text = editor?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0
    const pages = text ? Math.max(1, Math.ceil(words / 430)) : null
    const title = studioDraft.name.trim() || docTitle?.value.trim() || 'Documento de texto'
    const roteiroHtml = editor?.innerHTML ?? ''
    const nextContent: MaterialContent = {
      kind: 'word',
      name: title,
      note: studioDraft.note.trim(),
      pages,
      messages: 1,
      delivery,
      roteiro: roteiroHtml,
    }

    if (delivery === 'pdf') {
      setSavingDelivery('pdf')
      try {
        const blob = await roteiroToPdfBlob(title, roteiroHtml)
        const form = new FormData()
        form.append('file', blob, `${title}.pdf`)
        form.append('materialId', materialId)
        const res = await fetch('/api/admin/materiais/pdf-upload', { method: 'POST', body: form })
        const data = await res.json().catch(() => null)
        if (!res.ok) throw new Error((data && data.error) || 'Erro ao gerar o PDF.')
        nextContent.file = data.url
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Não foi possível gerar o PDF automaticamente. O roteiro foi salvo mesmo assim.')
      } finally {
        setSavingDelivery(null)
      }
    }

    const nextContents = [...contents, nextContent]
    onChange(nextContents)
    onMessageListChange([...(messageList ?? []), { nome: nextContent.name, desc: nextContent.note }])
    setActive(contents.length)
    setDeliveryOpen(false)
    setStudioOpen(false)
  }
  const saveSlidesToMaterial = () => {
    const frameWindow = studioFrameRef.current?.contentWindow
    let slides = 1
    let payload: Record<string, unknown> | null = null
    try {
      const raw = frameWindow?.localStorage.getItem('cex_studio_slides_v2') ?? window.localStorage.getItem('cex_studio_slides_v2')
      const state = raw ? JSON.parse(raw) as { pages?: unknown[] } : null
      slides = Math.max(1, Array.isArray(state?.pages) ? state.pages.length : 1)
      payload = state && Array.isArray(state.pages) && state.pages.length ? (state as Record<string, unknown>) : null
    } catch {
      slides = 1
    }
    const nextContent: MaterialContent = {
      kind: 'ppt',
      name: studioDraft.name.trim() || 'Apresentação',
      note: studioDraft.note.trim(),
      slides,
      payload,
    }
    if (editingContentIndex != null && contents[editingContentIndex]?.kind === 'ppt') {
      const next = [...contents]
      next[editingContentIndex] = nextContent
      onChange(next)
      setActive(editingContentIndex)
    } else {
      onChange([...contents, nextContent])
      setActive(contents.length)
    }
    setEditingContentIndex(null)
    setStudioOpen(false)
  }
  const saveDesignToMaterial = () => {
    const frameWindow = studioFrameRef.current?.contentWindow
    let designs = 1
    let designFormat: MaterialContent['designFormat'] = 'carousel'
    let payload: Record<string, unknown> | null = null
    try {
      const raw = frameWindow?.localStorage.getItem('cex_studio_art_v2') ?? window.localStorage.getItem('cex_studio_art_v2')
      const state = raw ? JSON.parse(raw) as { pages?: unknown[]; format?: MaterialContent['designFormat'] } : null
      designs = Math.max(1, Array.isArray(state?.pages) ? state.pages.length : 1)
      designFormat = state?.format === 'stories' || state?.format === 'telao' ? state.format : 'carousel'
      payload = state && Array.isArray(state.pages) && state.pages.length ? (state as Record<string, unknown>) : null
    } catch {
      designs = 1
      designFormat = 'carousel'
    }
    const nextContent: MaterialContent = {
      kind: 'design',
      name: studioDraft.name.trim() || 'Arte do material',
      note: studioDraft.note.trim(),
      designs,
      designFormat,
      payload,
    }
    if (editingContentIndex != null && contents[editingContentIndex]?.kind === 'design') {
      const next = [...contents]
      next[editingContentIndex] = nextContent
      onChange(next)
      setActive(editingContentIndex)
    } else {
      onChange([...contents, nextContent])
      setActive(contents.length)
    }
    setEditingContentIndex(null)
    setStudioOpen(false)
  }
  const del = (i: number) => {
    onChange(contents.filter((_, k) => k !== i))
    if (contents[i]?.kind === 'word') {
      const messageIndex = contents.slice(0, i + 1).filter((item) => item.kind === 'word').length - 1
      onMessageListChange((messageList ?? []).filter((_, k) => k !== messageIndex))
    }
    setActive(Math.max(0, i - 1))
    setDetailsOpen(false)
  }
  const meta = deriveMaterialContentMeta(contents)
  const activeContent = contents[active]

  return (
    <div className="wb">
      <div className="wb-head">
        <div className="wb-eyebrow" style={{ color: 'var(--olive)' }}>◆ O QUE O COMPRADOR RECEBE</div>
        <div className={`wb-status ${contents.length ? 'building' : ''}`}>
          <span className="wb-dot" />
          {contents.length ? `${contents.length} ${contents.length === 1 ? 'conteúdo' : 'conteúdos'}` : 'Nada ainda'}
        </div>
      </div>
      <div className="wb-totals">
        <div className="wb-tot"><b>{contents.length || '-'}</b><span>conteúdos</span></div>
        <div className="wb-tot"><b>{meta.pages || '-'}</b><span>páginas</span></div>
        <div className="wb-tot"><b>{meta.messages || '-'}</b><span>mensagens</span></div>
        <div className="wb-tot wb-tot-fmt"><b>{meta.formats.length ? meta.formats.join(' · ') : '-'}</b><span>formatos</span></div>
      </div>
      <div className="wb-grid">
        <div
          className={`piece add ${addOpen ? 'is-open' : ''}`}
          role="button"
          tabIndex={0}
          onClick={() => setAddOpen((v) => !v)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setAddOpen((v) => !v)
            }
          }}
        >
          <div className="add-inner">
            <span className="add-plus">+</span>
            <span className="add-tt">Adicionar material</span>
          </div>
        </div>
        {contents.map((content, i) => (
          <button
            key={i}
            className="piece"
            type="button"
            onClick={() => {
              setActive(i)
              setDetailsOpen(true)
            }}
            style={{ borderColor: active === i ? 'var(--olive)' : undefined, textAlign: 'left' }}
          >
            <span className="piece-edge" style={{ background: 'var(--olive)' }} />
            <div className="piece-cover">
              <span className="piece-tag">{content.kind === 'word' ? (content.delivery === 'word' ? 'WORD' : 'PDF') : content.kind === 'pdf' ? 'PDF' : content.kind === 'ppt' ? 'SLIDES' : 'DESIGN'}</span>
              <div className="piece-big">
                <b>{content.messages ?? content.pages ?? content.slides ?? content.designs ?? '-'}</b>
                <span>{content.messages ? 'msgs' : content.pages ? 'págs' : content.slides ? 'telas' : content.designs ? 'artes' : ''}</span>
              </div>
            </div>
            <div className="piece-foot">
              <div className="piece-tt">{content.name || 'Conteúdo sem nome'}</div>
              <div className="piece-sub">{materialContentMeta(content) || 'definir'}</div>
            </div>
          </button>
        ))}
      </div>
      {contents.length === 0 && (
        <div className="wb-empty">Cada peça adicionada vira uma linha na lista que o comprador vê. Nome, descrição e metadados alimentam a página de venda.</div>
      )}
      {addOpen && (
        <div className="modal-bg" onClick={() => setAddOpen(false)}>
          <div className="cmodal cmodal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="cmodal-head">
              <div>
                <div className="cmodal-eyebrow">◆ Novo conteúdo</div>
                <div className="cmodal-title">O que você quer adicionar?</div>
              </div>
              <button className="cmodal-x" type="button" onClick={() => setAddOpen(false)}>Fechar</button>
            </div>
            <div className="cmodal-body">
              <div className="chooser chooser-content">
                <button className="chooser-opt" type="button" onClick={openDocumentEditor}>
                  <span className="chooser-ic" aria-hidden="true"><DocumentTextIcon /></span>
                  <span className="chooser-tt">Documento de texto</span>
                  <span className="chooser-sb">Escreva aqui ou cole. Escolha Word ou PDF ao salvar.</span>
                </button>
                <button className="chooser-opt" type="button" onClick={openSlidesEditor}>
                  <span className="chooser-ic" aria-hidden="true"><SlidesIcon /></span>
                  <span className="chooser-tt">Apresentação</span>
                  <span className="chooser-sb">Crie apresentações específicas para o seu produto ou comece por um modelo.</span>
                </button>
                <button className="chooser-opt" type="button" onClick={openDesignEditor}>
                  <span className="chooser-ic" aria-hidden="true"><DesignIcon /></span>
                  <span className="chooser-tt">Design</span>
                  <span className="chooser-sb">Crie artes específicas para o seu produto.</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {slidesChoiceOpen && (
        <div className="modal-bg" onClick={() => setSlidesChoiceOpen(false)}>
          <div className="cmodal cmodal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="cmodal-head">
              <div>
                <div className="cmodal-eyebrow">◆ Apresentação</div>
                <div className="cmodal-title">Como você quer começar?</div>
              </div>
              <button className="cmodal-x" type="button" onClick={() => setSlidesChoiceOpen(false)}>Fechar</button>
            </div>
            <div className="cmodal-body">
              <div className="chooser chooser-content">
                <button className="chooser-opt" type="button" onClick={openPptxImport} disabled={pptxImporting}>
                  <span className="chooser-ic" aria-hidden="true"><UploadIcon /></span>
                  <span className="chooser-tt">{pptxImporting ? 'Importando…' : 'Importar PowerPoint'}</span>
                  <span className="chooser-sb">Suba um .pptx pronto e edite os slides aqui. Texto, imagens e formas simples viram editáveis; o que não der pra migrar (gráfico, SmartArt, tabela complexa) fica marcado no slide pra você revisar.</span>
                </button>
                <button className="chooser-opt" type="button" onClick={startBlankSlides}>
                  <span className="chooser-ic" aria-hidden="true"><SlidesIcon /></span>
                  <span className="chooser-tt">Construir um modelo novo</span>
                  <span className="chooser-sb">Comece do zero ou por um dos layouts prontos do Studio.</span>
                </button>
              </div>
              {pptxImportError && (
                <div className="wb-empty" style={{ color: 'var(--rust, #9C5A33)', marginTop: 12 }}>{pptxImportError}</div>
              )}
              <input
                ref={pptxInputRef}
                type="file"
                accept=".pptx"
                hidden
                onChange={handlePptxFile}
              />
            </div>
          </div>
        </div>
      )}
      {studioSetupOpen && (
        <div className="modal-bg" onClick={() => setStudioSetupOpen(false)}>
          <div className="cmodal" onClick={(e) => e.stopPropagation()}>
            <div className="cmodal-head">
              <div>
                <div className="cmodal-eyebrow">◆ {studioMode === 'slides' ? 'Apresentação' : studioMode === 'design' ? 'Design' : 'Documento de texto'}</div>
                <div className="cmodal-title">{studioMode === 'slides' ? 'Dados da apresentação' : studioMode === 'design' ? 'Dados da arte' : 'Dados da mensagem'}</div>
              </div>
              <button className="cmodal-x" type="button" onClick={() => setStudioSetupOpen(false)}>Fechar</button>
            </div>
            <div className="cmodal-body">
              <Field label={studioMode === 'slides' ? 'Nome da apresentação' : studioMode === 'design' ? 'Nome da arte' : 'Nome da mensagem'}>
                <input
                  className="inp"
                  value={studioDraft.name}
                  onChange={(e) => setStudioDraft((draft) => ({ ...draft, name: e.target.value }))}
                  placeholder={studioMode === 'slides' ? 'Ex: Encontro de líderes' : studioMode === 'design' ? 'Ex: Divulgação da série Firmes' : 'Ex: Quem é Jesus de verdade?'}
                  autoFocus
                />
              </Field>
              <Field label="Descrição para a landing page">
                <textarea
                  className="inp ta"
                  value={studioDraft.note}
                  onChange={(e) => setStudioDraft((draft) => ({ ...draft, note: e.target.value }))}
                  placeholder={studioMode === 'slides' ? 'Uma frase curta explicando o que essa apresentação entrega.' : studioMode === 'design' ? 'Uma frase curta explicando onde essa arte será usada.' : 'Uma frase curta explicando o que essa mensagem entrega.'}
                />
              </Field>
              {studioMode === 'document' && (
                <Field label="Modelo">
                  <select
                    className="inp"
                    value={studioDraft.model}
                    onChange={(e) => setStudioDraft((draft) => ({ ...draft, model: e.target.value as StudioDocumentModel }))}
                  >
                    <option value="branco">Nenhum</option>
                    <option value="devocional">Devocional</option>
                    <option value="aula">Aula / Plano</option>
                    <option value="mensagem">Mensagem</option>
                  </select>
                </Field>
              )}
              <div className="cmodal-actions">
                <button className="btn-ghost-add" type="button" onClick={() => setStudioSetupOpen(false)}>Cancelar</button>
                <button className="btn-pri" type="button" onClick={startStudioDocument} disabled={!studioDraft.name.trim()} style={{ opacity: studioDraft.name.trim() ? 1 : 0.45 }}>
                  {studioMode === 'slides' ? 'Abrir Slides' : studioMode === 'design' ? 'Abrir Design' : 'Abrir Studio'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {studioOpen && (
        <div className="studio-bg" role="dialog" aria-modal="true" aria-label={studioMode === 'slides' ? 'CE.X Studio Slides' : studioMode === 'design' ? 'CE.X Studio Design' : 'CE.X Studio Documentos'}>
          <div className="studio-shell">
            <div className="studio-head">
              <div>
                <div className="studio-kicker">◆ CE.X Studio</div>
                <div className="studio-title">{studioMode === 'slides' ? 'Slide' : studioMode === 'design' ? 'Design' : 'Documentos'}</div>
              </div>
              <div className="studio-actions">
                <button className="studio-save" type="button" onClick={studioMode === 'slides' ? saveSlidesToMaterial : studioMode === 'design' ? saveDesignToMaterial : () => setDeliveryOpen(true)}>Salvar no material</button>
                <button className="studio-close" type="button" onClick={() => { setStudioOpen(false); setEditingContentIndex(null) }}>Fechar Studio</button>
              </div>
            </div>
            <iframe
              ref={studioFrameRef}
              onLoad={handleStudioLoad}
              className="studio-frame"
              src={studioMode === 'slides' ? '/studio/slides?context=mentor' : studioMode === 'design' ? '/studio/design?context=mentor' : '/studio/documentos?context=mentor'}
              title={studioMode === 'slides' ? 'CE.X Studio Slides' : studioMode === 'design' ? 'CE.X Studio Design' : 'CE.X Studio Documentos'}
              allowFullScreen
            />
          </div>
        </div>
      )}
      {deliveryOpen && (
        <div className="modal-bg studio-modal-bg" onClick={() => setDeliveryOpen(false)}>
          <div className="cmodal" onClick={(e) => e.stopPropagation()}>
            <div className="cmodal-head">
              <div>
                <div className="cmodal-eyebrow">◆ Entrega ao comprador</div>
                <div className="cmodal-title">Como esse documento será vendido?</div>
              </div>
              <button className="cmodal-x" type="button" onClick={() => setDeliveryOpen(false)}>Fechar</button>
            </div>
            <div className="cmodal-body">
              <div className="chooser delivery-chooser">
                <button className="chooser-opt" type="button" disabled={!!savingDelivery} onClick={() => saveStudioToMaterial('word')}>
                  <span className="chooser-ic" aria-hidden="true"><DocumentTextIcon /></span>
                  <span className="chooser-tt">Word</span>
                  <span className="chooser-sb">O comprador recebe como material editável.</span>
                </button>
                <button className="chooser-opt" type="button" disabled={!!savingDelivery} onClick={() => saveStudioToMaterial('pdf')}>
                  <span className="chooser-ic" aria-hidden="true"><PdfFileIcon /></span>
                  <span className="chooser-tt">{savingDelivery === 'pdf' ? 'Gerando PDF…' : 'PDF'}</span>
                  <span className="chooser-sb">O comprador vê e compra como PDF. O mentor continua editando no Studio.</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {detailsOpen && activeContent && (
        <div className="modal-bg" onClick={() => setDetailsOpen(false)}>
          <div className="cmodal" onClick={(e) => e.stopPropagation()}>
            <div className="cmodal-head">
              <div>
                <div className="cmodal-eyebrow">◆ Conteúdo {String(active + 1).padStart(2, '0')}</div>
                <div className="cmodal-title">Detalhes do material</div>
              </div>
              <button className="cmodal-x" type="button" onClick={() => setDetailsOpen(false)}>Fechar</button>
            </div>
            <div className="cmodal-body">
              <div className="ed-2col">
                <Field label="Tipo">
                  <select className="inp" value={activeContent.kind} onChange={(e) => set(active, { kind: e.target.value as MaterialContentKind })}>
                    <option value="word">Texto</option>
                    <option value="pdf">PDF</option>
                    <option value="ppt">Slides</option>
                    <option value="design">Design</option>
                  </select>
                </Field>
                <Field label="Nome deste conteúdo">
                  <input className="inp" value={activeContent.name} onChange={(e) => set(active, { name: e.target.value })} placeholder="Ex: Quem é Jesus de verdade?" />
                </Field>
              </div>
              <Field label="Descrição">
                <textarea className="inp ta" value={activeContent.note} onChange={(e) => set(active, { note: e.target.value })} placeholder="Uma linha para o comprador saber o que está levando." />
              </Field>
              <div className="ed-3col">
                {activeContent.kind === 'word' && (
                  <>
                    <AutoMeta label="Mensagens" value={activeContent.messages ?? 0} hint="automático" />
                    <AutoMeta label="Páginas" value={activeContent.pages ?? 0} hint="automático" />
                    <Field label="Entrega"><select className="inp" value={activeContent.delivery ?? 'pdf'} onChange={(e) => set(active, { delivery: e.target.value as 'word' | 'pdf' })}><option value="word">Word</option><option value="pdf">PDF</option></select></Field>
                  </>
                )}
                {activeContent.kind === 'pdf' && (
                  <>
                    <Field label="Material"><input className="inp" value={activeContent.file ?? ''} onChange={(e) => set(active, { file: e.target.value })} /></Field>
                    <AutoMeta label="Páginas" value={activeContent.pages ?? 0} hint="automático" />
                    <div />
                  </>
                )}
                {activeContent.kind === 'ppt' && (
                  <>
                    <Field label="Telas"><input className="inp" type="number" min="0" value={activeContent.slides ?? ''} onChange={(e) => set(active, { slides: e.target.value ? +e.target.value : null })} /></Field>
                    <div />
                    <div />
                  </>
                )}
                {activeContent.kind === 'design' && (
                  <>
                    <Field label="Artes"><input className="inp" type="number" min="0" value={activeContent.designs ?? ''} onChange={(e) => set(active, { designs: e.target.value ? +e.target.value : null })} /></Field>
                    <Field label="Formato"><select className="inp" value={activeContent.designFormat ?? 'carousel'} onChange={(e) => set(active, { designFormat: e.target.value as MaterialContent['designFormat'] })}><option value="carousel">Feed</option><option value="stories">Stories</option><option value="telao">Telão</option></select></Field>
                    <div />
                  </>
                )}
              </div>
              <div className="cmodal-actions">
                <button className="lnk-danger" type="button" onClick={() => del(active)}>Remover conteúdo</button>
                {(activeContent.kind === 'design' || activeContent.kind === 'ppt') && (
                  <button className="btn-ghost-add" type="button" onClick={() => openExistingVisualEditor(active)}>
                    {activeContent.kind === 'design' ? 'Editar arte no Studio' : 'Editar apresentação no Studio'}
                  </button>
                )}
                <button className="btn-pri" type="button" onClick={() => setDetailsOpen(false)}>Concluir</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AutoMeta({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="auto-meta">
      <span>{label}</span>
      <b>{value}</b>
      {hint && <em>{hint}</em>}
    </div>
  )
}

function MessageListField({ count, value, accent, formats, onChange }: { count: number; value: MaterialMessage[]; accent: string; formats: string[]; onChange: (v: MaterialMessage[]) => void }) {
  const rows = Math.max(count || 0, value.length)
  const get = (i: number) => value[i] || { nome: '', desc: '' }
  const set = (i: number, patch: Partial<{ nome: string; desc: string }>) => {
    const a = Array.from({ length: rows }, (_, k) => ({ ...get(k) }))
    a[i] = { ...a[i], ...patch }
    onChange(a)
  }
  if (rows === 0) return <div className="fld-hint">Adicione documentos ou PDFs no conteúdo para listar os materiais inclusos.</div>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: rows }).map((_, i) => {
        const r = get(i)
        return (
          <div key={i} style={{ border: '1px solid var(--border-2)', borderRadius: 'var(--r-sm)', padding: '12px 14px', background: 'var(--ink)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: accent }}>{String(i + 1).padStart(2, '0')}</span>
              <span className="msg-format">{formats[i] ?? 'Material'}</span>
              <input className="inp" style={{ flex: 1 }} value={r.nome} onChange={(e) => set(i, { nome: e.target.value })} placeholder={`Nome da mensagem ${i + 1}`} />
            </div>
            <input className="inp" value={r.desc} onChange={(e) => set(i, { desc: e.target.value })} placeholder="Breve descrição (uma linha)" />
          </div>
        )
      })}
    </div>
  )
}

function DepoimentoField({ value, onChange, showCargo }: { value: { texto: string; autor: string; cargo?: string }; onChange: (v: { texto: string; autor: string; cargo?: string }) => void; showCargo?: boolean }) {
  const v = value || { texto: '', autor: '', cargo: '' }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <textarea className="inp ta" value={v.texto} onChange={(e) => onChange({ ...v, texto: e.target.value })} placeholder="O que essa pessoa disse depois de usar..." />
      <input className="inp" value={v.autor} onChange={(e) => onChange({ ...v, autor: e.target.value })} placeholder="Nome" />
      {showCargo && (
        <input className="inp" value={v.cargo ?? ''} onChange={(e) => onChange({ ...v, cargo: e.target.value })} placeholder="Igreja / cargo (ex: Pr. Ricardo · Igreja Batista Renovo)" />
      )}
    </div>
  )
}

function TagsField({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState('')
  const add = (raw: string) => {
    const current = new Set(value.map(t => t.toLowerCase()))
    const tags = raw
      .split(/[\s,]+/)
      .map(t => t.trim().toLowerCase())
      .filter(t => t && !current.has(t))
    if (tags.length) onChange([...value, ...tags])
    setInput('')
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, minHeight: 32 }}>
        {value.map((tag, i) => (
          <span key={i} style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.06em', background: 'var(--graphite)', border: '1px solid var(--border-2)', borderRadius: 100, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--light)' }}>
            {tag}
            <button aria-label={`Remover ${tag}`} onClick={() => onChange(value.filter((_, k) => k !== i))} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0, lineHeight: 1, fontSize: 12 }}>x</button>
          </span>
        ))}
        {value.length === 0 && <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--subtle)' }}>Nenhuma palavra-chave ainda</span>}
      </div>
      <input
        className="inp" value={input}
        placeholder="Digite uma palavra e pressione espaço, Enter ou vírgula"
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',' || e.key === ' ') { e.preventDefault(); add(input) } }}
        onBlur={() => { if (input.trim()) add(input) }}
      />
    </div>
  )
}

function FaqField({ value, onChange }: { value: { q: string; a: string }[]; onChange: (v: { q: string; a: string }[]) => void }) {
  const set = (i: number, patch: Partial<{ q: string; a: string }>) => {
    const a = [...value]; a[i] = { ...a[i], ...patch }; onChange(a)
  }
  const add = () => onChange([...value, { q: '', a: '' }])
  const del = (i: number) => onChange(value.filter((_, k) => k !== i))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {value.map((f, i) => (
        <div key={i} style={{ border: '1px solid var(--border-2)', borderRadius: 'var(--r-sm)', padding: '12px 14px', background: 'var(--ink)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '.08em' }}>PERGUNTA {i + 1}</span>
            <button className="ementa-del" onClick={() => del(i)}><CloseIcon size={12} /></button>
          </div>
          <input className="inp" value={f.q} onChange={e => set(i, { q: e.target.value })} placeholder="Pergunta..." style={{ marginBottom: 8 }} />
          <textarea className="inp ta" value={f.a} onChange={e => set(i, { a: e.target.value })} placeholder="Resposta..." />
        </div>
      ))}
      <button className="btn-ghost-add" onClick={add}>+ Adicionar pergunta</button>
    </div>
  )
}

function EmentaField({ value, onChange }: { value: { titulo: string; desc: string }[]; onChange: (v: { titulo: string; desc: string }[]) => void }) {
  const set = (i: number, patch: Partial<{ titulo: string; desc: string }>) => {
    const a = [...value]; a[i] = { ...a[i], ...patch }; onChange(a)
  }
  const add = () => onChange([...value, { titulo: '', desc: '' }])
  const del = (i: number) => onChange(value.filter((_, k) => k !== i))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {value.map((e, i) => (
        <div key={i} style={{ border: '1px solid var(--border-2)', borderRadius: 'var(--r-sm)', padding: '12px 14px', background: 'var(--ink)' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <span className="ementa-num">S{i + 1}</span>
            <input className="inp" style={{ flex: 1 }} value={e.titulo} onChange={(ev) => set(i, { titulo: ev.target.value })} placeholder={`Título da semana ${i + 1}`} />
            <button className="ementa-del" onClick={() => del(i)}><CloseIcon size={12} /></button>
          </div>
          <input className="inp" value={e.desc} onChange={(ev) => set(i, { desc: ev.target.value })} placeholder="Descrição breve (o que o aluno aprende e leva)" />
        </div>
      ))}
      <button className="btn-ghost-add" onClick={add}>+ Adicionar semana</button>
    </div>
  )
}

function Editor({ item, onSave, onCancel }: { item: Item; onSave: (d: Item) => Promise<void>; onCancel: () => void }) {
  const [d, setD] = useState<Item>({ ...item })
  const [mode, setMode] = useState<'card' | 'pagina'>('card')
  const [divulgacaoOpen, setDivulgacaoOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const set = <K extends keyof Item>(k: K, v: Item[K]) => setD((prev) => ({ ...prev, [k]: v }))
  const accent = accentFor(d)
  const accentName = ACCENT_NAME[accent] ?? ''
  const dv = { ...d, accent }
  const m = d as Material
  const c = d as Curso
  const men = d as Mentoria
  const ev = d as Evento
  const keywordItem = d.type !== 'evento' ? d as Material | Curso | Mentoria : null
  const setFamily = (fam: string) => setD((prev) => ({ ...prev, family: fam, shelf: (SHELVES[fam] ?? [])[0] ?? (prev as Material).shelf } as Item))
  const handleSave = async () => {
    if (isSaving) return
    setIsSaving(true)
    setSaveError('')
    try {
      await onSave(dv)
    } catch (error) {
      console.error('Erro ao salvar:', error)
      setSaveError(error instanceof Error ? error.message : 'Não foi possível salvar no banco. Tente novamente.')
      setIsSaving(false)
    }
  }
  const openDivulgacaoStudio = () => {
    if (d.type !== 'material') return
    try {
      window.localStorage.setItem('cex_studio_divulgacao_seed', JSON.stringify({
        title: d.title,
        description: d.desc,
        category: m.shelf || m.family || 'Campus Expansão',
        audience: m.paraQuem,
        messages: m.messageList ?? [],
        format: 'carousel',
        handle: '@campusexpansao',
      }))
      window.localStorage.removeItem('cex_studio_divulgacao_v1')
      window.localStorage.removeItem('cex_studio_divulgacao_v2')
      window.localStorage.removeItem('cex_studio_divulgacao_v3')
    } catch {
      // O Studio ainda abre; apenas sem seed inicial caso o browser bloqueie o storage.
    }
    setDivulgacaoOpen(true)
  }
  const isNew = !item.id
  const setMaterialContents = (contents: MaterialContent[]) => {
    const meta = deriveMaterialContentMeta(contents)
    setD((prev) => {
      if (prev.type !== 'material') return prev
      return {
        ...prev,
        contents,
        formats: meta.formats.length ? meta.formats : (prev.formats ?? []),
        pages: meta.pages,
        messages: meta.messages,
        big: prev.big ?? meta.messages ?? meta.pages,
        bigLabel: meta.messages ? 'mensagens' : 'páginas',
      }
    })
  }

  return (
    <div className="editor">
      <div className="ed-form">
        <div className="ed-formhead">
          <div className="ed-headrow">
            <div className="ed-eyebrow" style={{ color: accent }}>◆ {d.type.toUpperCase()}</div>
            {d.type === 'material' && m.code && (
              <span className="codebadge"><b>{m.code}</b><span className="sys">código interno</span></span>
            )}
          </div>
          <input className="ed-titleinput" value={d.title} placeholder={d.type === 'material' ? 'Nome do material' : 'Título do item'}
            onChange={(e) => set('title', e.target.value as never)} />
          {d.type === 'material' && (
            <div className="ed-hero-hint">O produto agora nasce pelo que ele entrega. Monte os conteúdos, confira a prévia e publique quando estiver pronto.</div>
          )}
        </div>
        {d.type !== 'material' && <Field label="Descrição curta" hint="Uma linha. Aparece no card e no topo da página.">
          <textarea className="inp ta" value={d.desc} onChange={(e) => set('desc', e.target.value as never)} />
        </Field>}

        {d.type === 'material' && <>
          <Field label="Descrição do material" req hint="Resumo curto para card, landing page e artes de divulgação.">
            <textarea className="inp ta" value={d.desc} onChange={(e) => set('desc', e.target.value as never)} placeholder="Resumo do produto para o comprador." />
          </Field>

          <Field label="Para quem é" req hint="Nomeie quem mais se beneficia deste material e qual dor ele resolve.">
            <textarea className="inp ta" value={m.paraQuem ?? ''} onChange={(e) => set('paraQuem' as never, e.target.value as never)} placeholder="Pra líder que..." />
          </Field>

          <SectionHead mark="Onde fica na loja" opt="obrigatório" />
          <div className="fld-hint section-copy">Escolha a família e a estante. A estante define a cor do card e onde o material aparece no catálogo.</div>
          <div className="ed-2col">
            <Field label="Família" req>
              <select className="inp" value={m.family} onChange={(e) => setFamily(e.target.value)}>
                <option>Para ministrar</option><option>Para liderar</option>
              </select>
            </Field>
            <Field label="Estante" req hint="A cor vem da estante e fica travada pela identidade visual.">
              <select className="inp" value={m.shelf} onChange={(e) => set('shelf' as never, e.target.value as never)}>
                {(SHELVES[m.family] ?? [m.shelf]).map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          <SectionHead mark="Conteúdo" opt="obrigatório" />
          <div className="fld-hint section-copy">Adicione documentos, PDFs, slides ou designs. Esses itens alimentam os formatos vendidos e o que o comprador recebe.</div>
          <MaterialContentsField
            value={m.contents ?? []}
            onChange={setMaterialContents}
            messageList={m.messageList ?? []}
            onMessageListChange={(v) => set('messageList' as never, v as never)}
            materialId={m.id}
          />

          <SectionHead mark="Materiais inclusos" opt="obrigatório" />
          <div className="fld-hint section-copy">Edite o nome e a descrição de cada item que aparece na landing page. O formato vem do conteúdo criado.</div>
          {m.messages != null && m.messages > 0 && (
            <Field label={m.messages === 1 ? 'Material incluso' : 'Materiais inclusos'} req>
              <MessageListField count={m.messages} value={m.messageList ?? []} accent={accent} formats={materialMessageFormatRows(m.contents ?? [], m.messages)} onChange={(v) => set('messageList' as never, v as never)} />
            </Field>
          )}

          <SectionHead mark="Venda" opt="obrigatório" />
          <div className="fld-hint section-copy">Defina o preço, status de publicação e o link de checkout usado no botão de compra.</div>
          <div className="ed-2col">
            <Field label="Preço (R$)" req><input className="inp" type="number" value={m.price} onChange={(e) => set('price' as never, +e.target.value as never)} /></Field>
            <Field label="Status" req>
              <select className="inp" value={d.status} onChange={(e) => set('status', e.target.value as never)}>
                <option>Publicado</option><option>Rascunho</option>
              </select>
            </Field>
          </div>
          <Field label="Link de checkout" req hint="Botão COMPRAR da página de detalhe.">
            <input className="inp" value={m.hotmart} onChange={(e) => set('hotmart' as never, e.target.value as never)} placeholder="https://checkout.stripe.com/..." />
          </Field>

          <SectionHead mark="FAQ" opt="opcional" />
          <div className="fld-hint section-copy">Perguntas frequentes ajudam o comprador a entender o uso do material antes da compra.</div>
          <Field label="Perguntas frequentes">
            <FaqField value={m.faq ?? []} onChange={(v) => set('faq' as never, v as never)} />
          </Field>

          <SectionHead mark="Palavras-chave" opt="opcional" />
          <div className="fld-hint section-copy">Use termos de busca e análise. Ao pressionar espaço, cada palavra vira uma tag.</div>
          <Field label="Palavras-chave">
            <TagsField value={m.keywords ?? []} onChange={(v) => set('keywords' as never, v as never)} />
          </Field>

          <SectionHead mark="Divulgação CE.X" opt="opcional" />
          <div className="fld-hint section-copy">Gere artes oficiais para o mentor divulgar este material. O conteúdo vem preenchido com nome, descrição, público e materiais inclusos.</div>
          <div className="promo-panel">
            <div className="promo-copy">
              <span className="promo-kicker">Carrossel 1080 x 1350 · Stories 1080 x 1920</span>
              <strong>Crie peças de divulgação no padrão CE.X</strong>
              <span>Use variações da marca para postar no Instagram sem liberar estilos fora do brandbook.</span>
            </div>
            <button className="btn-pri" type="button" onClick={openDivulgacaoStudio}>Abrir Divulgação</button>
          </div>
        </>}

        {d.type === 'curso' && <>
          <div className="ed-2col">
            <Field label="Nível">
              <select className="inp" value={c.level} onChange={(e) => set('level' as never, e.target.value as never)}>
                <option>Fundação</option><option>Liderança</option><option>Multiplicação</option>
              </select>
            </Field>
            <Field label="Status">
              <select className="inp" value={d.status} onChange={(e) => set('status', e.target.value as never)}>
                <option>Publicado</option><option>Rascunho</option>
              </select>
            </Field>
          </div>
          <div className="ed-3col">
            <Field label="Etapa nº"><input className="inp" type="number" value={c.etapa} onChange={(e) => set('etapa' as never, +e.target.value as never)} /></Field>
            <Field label="Semanas"><input className="inp" type="number" value={c.weeks} onChange={(e) => set('weeks' as never, +e.target.value as never)} /></Field>
          </div>
          <Field label="Promessa" hint="Frase de impacto. Aparece no hero da landing page (diferente da descrição curta).">
            <textarea className="inp ta" value={c.promessa ?? ''} onChange={(e) => set('promessa' as never, e.target.value as never)} placeholder="Construa o alicerce que sustenta tudo que Deus quer fazer..." />
          </Field>
          <Field label="Pra quem é">
            <textarea className="inp ta" value={c.paraQuem ?? ''} onChange={(e) => set('paraQuem' as never, e.target.value as never)} placeholder="Pra líder que..." />
          </Field>
          <Field label="Próxima turma"><input className="inp" value={c.proximaTurma} onChange={(e) => set('proximaTurma' as never, e.target.value as never)} placeholder="Julho 2026" /></Field>
          <Field label="Ementa semana a semana" hint="Título e descrição de cada encontro.">
            <EmentaField value={c.ementa} onChange={(v) => set('ementa' as never, v as never)} />
          </Field>
          <Field label="Como é (formato)" hint="Descreve como funciona o curso: ao vivo, gravação, WhatsApp etc.">
            <textarea className="inp ta" value={c.formato ?? ''} onChange={(e) => set('formato' as never, e.target.value as never)} placeholder="4 encontros ao vivo de 2h · mentoria em grupo por WhatsApp · materiais editáveis..." />
          </Field>
          <div className="ed-2col">
            <Field label="Mentor / condutor"><input className="inp" value={c.mentor} onChange={(e) => set('mentor' as never, e.target.value as never)} /></Field>
            <Field label="Status" hint=" "><div /></Field>
          </div>
          <Field label="Bio do mentor" hint="Aparece no card do mentor na landing page.">
            <textarea className="inp ta" value={c.mentorBio ?? ''} onChange={(e) => set('mentorBio' as never, e.target.value as never)} placeholder="Fundador da CE.X. Formou mais de 2 mil líderes..." />
          </Field>
          <Field label="Depoimento">
            <DepoimentoField value={c.depoimento} onChange={(v) => set('depoimento' as never, v as never)} showCargo />
          </Field>
        </>}

        {d.type === 'mentoria' && <>
          <Field label="Formato"><input className="inp" value={men.formato} onChange={(e) => set('formato' as never, e.target.value as never)} /></Field>
          <Field label="Cadência"><input className="inp" value={men.cadencia} onChange={(e) => set('cadencia' as never, e.target.value as never)} /></Field>
          <div className="ed-2col">
            <Field label="Mentor"><input className="inp" value={men.mentor} onChange={(e) => set('mentor' as never, e.target.value as never)} /></Field>
            <Field label="Status">
              <select className="inp" value={d.status} onChange={(e) => set('status', e.target.value as never)}>
                <option>Publicado</option><option>Rascunho</option>
              </select>
            </Field>
          </div>
        </>}

        {d.type === 'evento' && <>
          <div className="ed-2col">
            <Field label="Data"><input className="inp" value={ev.data} onChange={(e) => set('data' as never, e.target.value as never)} /></Field>
            <Field label="Local"><input className="inp" value={ev.local} onChange={(e) => set('local' as never, e.target.value as never)} /></Field>
          </div>
          <div className="ed-2col">
            <Field label="Vagas"><input className="inp" type="number" value={ev.vagas} onChange={(e) => set('vagas' as never, +e.target.value as never)} /></Field>
            <Field label="Status">
              <select className="inp" value={d.status} onChange={(e) => set('status', e.target.value as never)}>
                <option>Publicado</option><option>Rascunho</option>
              </select>
            </Field>
          </div>
          <Field label="Link de inscrição">
            <input className="inp" value={ev.hotmart ?? ''} onChange={(e) => set('hotmart' as never, e.target.value as never)} placeholder="https://checkout.stripe.com/..." />
          </Field>
        </>}

        {d.type !== 'material' && (
          <Field label="Cor de acento" hint="Travada: cada estante / nível tem sua cor.">
            <AccentLock value={accent} name={accentName} />
          </Field>
        )}
        {keywordItem && d.type !== 'material' && (
          <Field label="Palavras-chave" hint="Para buscas e análises. Digite uma palavra e pressione espaço para transformar em tag.">
            <TagsField value={keywordItem.keywords ?? []} onChange={(v) => set('keywords' as never, v as never)} />
          </Field>
        )}

        <div className="ed-actions">
          {saveError && <div className="ed-save-error" role="alert">{saveError}</div>}
          <button className="btn-pri" onClick={handleSave} disabled={isSaving} style={{ opacity: isSaving ? 0.55 : 1 }}>
            {isSaving ? 'Salvando...' : isNew ? 'Criar item' : 'Salvar alterações'}
          </button>
          <button className="btn-sec" onClick={onCancel} disabled={isSaving} style={{ opacity: isSaving ? 0.55 : 1 }}>Cancelar</button>
        </div>
      </div>

      <div className="ed-preview">
        <div className="ed-prevbar">
          <span className="ed-prevtitle">Prévia ao vivo</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className="seg">
              {(['card', 'pagina'] as const).map((m) => (
                <button key={m} className={`seg-btn${mode === m ? ' on' : ''}`} onClick={() => setMode(m)}>
                  {m === 'card' ? 'Card' : 'Página'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="ed-prevstage">
          {mode === 'card' && <div className="prev-center"><CatalogCardPreview item={dv} /></div>}
          {mode === 'pagina' && <div style={{ width: '100%' }}><PagePreview item={dv} /></div>}
        </div>
        {d.status === 'Rascunho' && <div className="ed-draftnote">◆ Em rascunho. Não aparece no site até publicar.</div>}
      </div>

      {divulgacaoOpen && (
        <div className="studio-bg" role="dialog" aria-modal="true" aria-label="CE.X Studio Divulgação">
          <div className="studio-shell">
            <button className="studio-float-close" type="button" onClick={() => setDivulgacaoOpen(false)}>Fechar Studio</button>
            <iframe
              className="studio-frame"
              src="/studio/divulgacao"
              title="CE.X Studio Divulgação"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ── SHELL ────────────────────────────────────────────────────────────────────

type Route = { screen: 'dashboard' } | { screen: 'list'; type: CatalogItemType } | { screen: 'shelves' } | { screen: 'users' } | { screen: 'studio' }

function Login() {
  const [username, setUsername] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState(false)
  const [pending, startTransition] = useTransition()

  const submit = () => {
    startTransition(async () => {
      const ok = await loginAction(username, pw)
      if (ok) {
        window.location.reload()
      } else {
        setErr(true)
        setTimeout(() => setErr(false), 600)
      }
    })
  }

  return (
    <div className="login">
      <div className="login-grid" />
      <div className="login-x">X</div>
      <div className={`login-card${err ? ' shake' : ''}`}>
        <div className="login-theme">
          <ThemeToggle compact />
        </div>
        <div className="login-logo"><Logo /></div>
        <div className="login-eyebrow">◆ PAINEL INTERNO</div>
        <h1 className="login-title">Área restrita</h1>
        <p className="login-sub">Gestão de materiais, cursos, mentorias, usuários e módulos do Studio.</p>
        <input className="login-input" type="text" value={username} placeholder="Usuário"
          autoFocus autoComplete="username" onChange={(e) => setUsername(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
        <input className="login-input" type="password" value={pw} placeholder="Senha de acesso"
          autoComplete="current-password" onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
        <button className="login-btn" onClick={submit} disabled={pending}>
          {pending ? 'Verificando...' : 'Entrar →'}
        </button>
      </div>
      <div className="login-foot">CE.X · Campus Expansão · campusexpansao.com</div>
    </div>
  )
}

// ── SHELVES ───────────────────────────────────────────────────────────────────

const ACCENT_OPTIONS: { key: string; hex: string; name: string }[] = [
  { key: 'sand',  hex: '#E2D6B4', name: 'Areia'     },
  { key: 'wheat', hex: '#CBA95C', name: 'Trigo'     },
  { key: 'amber', hex: '#D6A23E', name: 'Âmbar'     },
  { key: 'clay',  hex: '#C5805A', name: 'Barro'     },
  { key: 'terra', hex: '#B5694A', name: 'Terracota' },
  { key: 'rust',  hex: '#9C5A33', name: 'Ferrugem'  },
  { key: 'cocoa', hex: '#6F523A', name: 'Cacau'     },
  { key: 'olive', hex: '#7A9E3F', name: 'Oliva'     },
]

function ShelfEditor({ estante, onSave, onCancel }: { estante: EstanteAdmin | null; onSave: (e: EstanteAdmin) => Promise<void>; onCancel: () => void }) {
  const isNew = !estante
  const [form, setForm] = useState<EstanteAdmin>(() => estante ?? {
    key: `estante-${Date.now()}`, label: '', familia: 'ministrar',
    accent: AC.wheat, faixaEtaria: '', status: 'visible', order: 999,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const set = <K extends keyof EstanteAdmin>(k: K, v: EstanteAdmin[K]) => setForm(f => ({ ...f, [k]: v }))
  const valid = form.label.trim().length > 0
  const handleSave = async () => {
    if (!valid || isSaving) return
    setIsSaving(true)
    setSaveError('')
    try {
      await onSave(form)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Não foi possível salvar a estante no banco.')
      setIsSaving(false)
    }
  }

  return (
    <div className="modal-bg" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">{isNew ? 'Nova estante' : `Editar · ${estante!.label}`}</div>

        <div className="fld">
          <label className="fld-label">Nome da estante <span className="fld-req">◆</span></label>
          <input className="inp" value={form.label} onChange={e => set('label', e.target.value)} placeholder="ex: Casais" />
        </div>

        <div className="fld">
          <label className="fld-label">Família</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['ministrar', 'liderar'] as const).map(f => (
              <button key={f} onClick={() => set('familia', f)}
                style={{ flex: 1, padding: '10px 14px', borderRadius: 'var(--r-sm)', border: `1px solid ${form.familia === f ? form.accent : 'var(--border-2)'}`, background: form.familia === f ? 'var(--graphite)' : 'var(--ink)', color: form.familia === f ? 'var(--cream)' : 'var(--muted)', fontFamily: 'inherit', fontSize: 13, cursor: 'pointer', transition: 'all .15s' }}>
                Para {f}
              </button>
            ))}
          </div>
        </div>

        <div className="fld">
          <label className="fld-label">Subtítulo / faixa etária</label>
          <input className="inp" value={form.faixaEtaria} onChange={e => set('faixaEtaria', e.target.value)} placeholder="ex: 26 a 40 anos" />
          <div className="fld-hint">Aparece embaixo do nome da estante no site.</div>
        </div>

        <div className="fld">
          <label className="fld-label">Cor de acento</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
            {ACCENT_OPTIONS.map(a => (
              <button key={a.key} title={a.name} onClick={() => set('accent', a.hex)}
                style={{ width: 36, height: 36, borderRadius: 8, background: a.hex, border: form.accent === a.hex ? '2px solid var(--cream)' : '2px solid transparent', cursor: 'pointer', outline: form.accent === a.hex ? `2px solid ${a.hex}` : 'none', outlineOffset: 2, transition: 'all .15s' }} />
            ))}
          </div>
          <div className="fld-hint">Oliva (verde) deve ser reservada para Jovens e a marca. Máx 15% da peça.</div>
        </div>

        <div className="modal-acts">
          {saveError && <div className="ed-save-error" role="alert">{saveError}</div>}
          <button className="btn-pri" onClick={handleSave} disabled={!valid || isSaving} style={{ opacity: valid && !isSaving ? 1 : 0.4 }}>
            {isSaving ? 'Salvando...' : isNew ? 'Criar estante' : 'Salvar alterações'}
          </button>
          <button className="btn-sec" onClick={onCancel} disabled={isSaving} style={{ opacity: isSaving ? 0.55 : 1 }}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}

function ShelvesView({ estantes, materiais, onSave, onToggle, onDelete, onReorder }:{
  estantes: EstanteAdmin[]
  materiais: Material[]
  onSave: (e: EstanteAdmin) => Promise<void>
  onToggle: (key: string) => Promise<void>
  onDelete: (key: string) => Promise<void>
  onReorder: (orderedKeys: string[]) => Promise<void>
}) {
  const [editing, setEditing] = useState<EstanteAdmin | 'new' | null>(null)
  const [toDelete, setToDelete] = useState<EstanteAdmin | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const dragKey = useRef<string | null>(null)
  const sorted = [...estantes].sort((a, b) => a.order - b.order)

  const countFor = (key: string) => materiais.filter(m => m.shelf === estantes.find(e => e.key === key)?.label).length

  const handleDragStart = (key: string) => { dragKey.current = key }
  const handleDragOver = (e: React.DragEvent, key: string) => { e.preventDefault(); setDragOver(key) }
  const handleDrop = (targetKey: string) => {
    if (!dragKey.current || dragKey.current === targetKey) { setDragOver(null); return }
    const from = sorted.findIndex(e => e.key === dragKey.current)
    const to   = sorted.findIndex(e => e.key === targetKey)
    if (from < 0 || to < 0) { setDragOver(null); return }
    const next = [...sorted]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    void onReorder(next.map(e => e.key)).catch(() => undefined)
    dragKey.current = null
    setDragOver(null)
  }
  const handleDragEnd = () => { dragKey.current = null; setDragOver(null) }

  return (
    <div className="listview">
      {editing === 'new' && (
        <ShelfEditor estante={null} onSave={async e => { await onSave(e); setEditing(null) }} onCancel={() => setEditing(null)} />
      )}
      {editing && editing !== 'new' && (
        <ShelfEditor estante={editing} onSave={async e => { await onSave(e); setEditing(null) }} onCancel={() => setEditing(null)} />
      )}
      {toDelete && (
        <div className="modal-bg" onClick={() => setToDelete(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Excluir estante &ldquo;{toDelete.label}&rdquo;?</div>
            <p className="modal-text">
              {countFor(toDelete.key) > 0
                ? `Esta estante tem ${countFor(toDelete.key)} material(is). Mova ou exclua esses materiais antes de remover a estante.`
                : 'Esta ação remove a estante do catálogo e não pode ser desfeita.'}
            </p>
            <div className="modal-acts">
              <button className="btn-danger" disabled={countFor(toDelete.key) > 0} style={{ opacity: countFor(toDelete.key) > 0 ? 0.45 : 1 }} onClick={async () => { try { await onDelete(toDelete.key); setToDelete(null) } catch {} }}>Excluir estante</button>
              <button className="btn-sec" onClick={() => setToDelete(null)}>Manter</button>
            </div>
          </div>
        </div>
      )}

      <div className="lv-toolbar">
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>{sorted.length} estante{sorted.length !== 1 ? 's' : ''} · arraste para reordenar</div>
        <button className="btn-pri" onClick={() => setEditing('new')}>+ Nova estante</button>
      </div>

      <div className="lv-list">
        {sorted.map((e) => {
          const n = countFor(e.key)
          const isDragTarget = dragOver === e.key
          return (
            <div
              key={e.key}
              className="row shelf-row"
              draggable
              onDragStart={() => handleDragStart(e.key)}
              onDragOver={(ev) => handleDragOver(ev, e.key)}
              onDrop={() => handleDrop(e.key)}
              onDragEnd={handleDragEnd}
              style={{
                opacity: e.status === 'hidden' ? 0.45 : 1,
                transition: 'all .15s',
                cursor: 'grab',
                borderTop: isDragTarget ? `2px solid ${e.accent}` : '2px solid transparent',
                marginTop: isDragTarget ? -2 : 0,
              }}
            >
              {/* Handle de drag */}
              <div className="shelf-drag" aria-label="Arrastar estante">⠿</div>
              <div className="row-chip" style={{ background: e.accent, flexShrink: 0 }}>
                <span style={{ color: '#0E110D', fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700 }}>◆</span>
              </div>
              <div className="row-main">
                <div className="row-title" style={{ color: e.status === 'hidden' ? 'var(--subtle)' : 'var(--cream)' }}>
                  {e.label}
                  {e.status === 'hidden' && <span style={{ marginLeft: 8, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '.08em' }}>OCULTA</span>}
                </div>
                <div className="row-cat">Para {e.familia} · {e.faixaEtaria || 'sem subtítulo'}</div>
              </div>
              <span className="shelf-count">
                {n} item{n !== 1 ? 's' : ''}
              </span>
              <div className="row-acts">
                <button className="row-btn" onClick={() => { void onToggle(e.key).catch(() => undefined) }}>
                  {e.status === 'visible' ? 'Ocultar' : 'Mostrar'}
                </button>
                <button className="row-btn" onClick={() => setEditing(e)}>Editar</button>
                <button className="row-btn danger" onClick={() => setToDelete(e)}>Excluir</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Sidebar({ route, go, counts, onLogout, admin }: { route: Route; go: (r: Route) => void; counts: Record<string, number>; onLogout: () => void; admin: AdminSession }) {
  const isOn = (r: Route) => r.screen === route.screen && (r.screen !== 'list' || (route.screen === 'list' && r.type === route.type))
  return (
    <aside className="adm-sb">
      <div>
        <div className="adm-sb-logo"><Logo /></div>
        <div className="adm-sb-sub">Painel interno</div>
        <nav className="adm-sb-nav">
          <button className={`adm-sb-link${route.screen === 'dashboard' ? ' on' : ''}`} onClick={() => go({ screen: 'dashboard' })}>
            <span className="adm-sb-ic">◆</span> Painel
          </button>
          <div className="adm-sb-group">Catálogo</div>
          {TYPES.map((t) => (
            <button key={t.key} className={`adm-sb-link${isOn({ screen: 'list', type: t.key }) ? ' on' : ''}`} onClick={() => go({ screen: 'list', type: t.key })}>
              <span className="adm-sb-ic">◇</span> {t.plural}
              <span className="adm-sb-count">{counts[t.key]}</span>
            </button>
          ))}
          {admin.isMaster && (
            <>
              <button className={`adm-sb-link${route.screen === 'shelves' ? ' on' : ''}`} onClick={() => go({ screen: 'shelves' })}>
                <span className="adm-sb-ic">◇</span> Estantes
                <span className="adm-sb-count">{counts.estante}</span>
              </button>
              <div className="adm-sb-group">Admin</div>
              <button className={`adm-sb-link${route.screen === 'users' ? ' on' : ''}`} onClick={() => go({ screen: 'users' })}>
                <span className="adm-sb-ic">◇</span> Acessos
                <span className="adm-sb-count">{counts.users}</span>
              </button>
              <button className={`adm-sb-link${route.screen === 'studio' ? ' on' : ''}`} onClick={() => go({ screen: 'studio' })}>
                <span className="adm-sb-ic">◇</span> Studio
                <span className="adm-sb-count">{counts.templates}</span>
              </button>
            </>
          )}
        </nav>
      </div>
      <div className="adm-sb-bottom">
        <div className="adm-theme-row">
          <ThemeToggle />
        </div>
        <div className="adm-userbox">
          <strong>{admin.name || admin.username}</strong>
          <span>{admin.isMaster ? 'Master' : 'Admin'} · {admin.username}</span>
        </div>
        <a className="adm-sb-link" href="/" target="_blank" rel="noreferrer"><span className="adm-sb-ic">→</span> Ver o site</a>
        <button className="adm-sb-link" onClick={onLogout}><span className="adm-sb-ic">→</span> Sair</button>
      </div>
    </aside>
  )
}

function Row({ item, onEdit, onDelete }: { item: Item; onEdit: () => void; onDelete: () => void }) {
  const cat = item.type === 'material' ? `${(item as Material).family} · ${(item as Material).shelf}`
    : item.type === 'curso' ? `${(item as Curso).level} · Etapa ${String((item as Curso).etapa).padStart(2, '0')}`
    : item.type === 'mentoria' ? (item as Mentoria).formato
    : `${(item as Evento).data ?? 'Sem data'} · ${(item as Evento).local ?? ''}`
  const right = item.type === 'material' ? `R$ ${(item as Material).price}`
    : item.type === 'curso' ? `${(item as Curso).weeks} sem`
    : item.type === 'mentoria' ? `${(item as Mentoria).vagas} vagas`
    : `${(item as Evento).vagas} vagas`
  const desc = item.desc?.trim()
  return (
    <div className="row">
      <div className="row-chip" style={{ background: item.image ? `url(${item.image}) center/cover` : 'var(--ink)' }}>
        {!item.image && <span style={{ color: item.accent }}>X</span>}
      </div>
      <div className="row-main">
        <div className="row-title">{item.title || <em className="row-untitled">Sem título</em>}</div>
        {desc && <div className="row-desc">{desc}</div>}
        <div className="row-cat">{cat}</div>
      </div>
      <span className={`pill ${item.status === 'Publicado' ? 'pub' : 'draft'}`}>{item.status}</span>
      <span className="row-views">{item.views.toLocaleString('pt-BR')} <em>views</em></span>
      <span className="row-right">{right}</span>
      <div className="row-acts">
        <button className="row-btn" onClick={onEdit}>Editar</button>
        <button className="row-btn danger" onClick={onDelete}>Excluir</button>
      </div>
    </div>
  )
}

function ListView({ type, items, onNew, onEdit, onDelete }: { type: CatalogItemType; items: Item[]; onNew: () => void; onEdit: (i: Item) => void; onDelete: (i: Item) => void }) {
  const meta = TYPES.find((t) => t.key === type)!
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('Todos')
  const filters = type === 'material' ? ['Todos', 'Para ministrar', 'Para liderar']
    : type === 'curso' ? ['Todos', 'Fundação', 'Liderança', 'Multiplicação']
    : ['Todos', 'Publicado', 'Rascunho']
  const shown = items.filter((it) => {
    const haystack = [
      it.title,
      it.desc,
      it.type === 'material' ? (it as Material).code : null,
      it.type === 'material' ? (it as Material).shelf : null,
      it.type === 'material' ? (it as Material).family : null,
      it.type === 'curso' ? (it as Curso).level : null,
      it.type !== 'evento' ? ((it as Material | Curso | Mentoria).keywords ?? []).join(' ') : null,
    ].filter(Boolean).join(' ').toLowerCase()
    const okQ = !q || haystack.includes(q.toLowerCase())
    if (filter === 'Todos') return okQ
    if (type === 'material') return okQ && (it as Material).family === filter
    if (type === 'curso') return okQ && (it as Curso).level === filter
    return okQ && it.status === filter
  })
  return (
    <div className="listview">
      <div className="lv-toolbar">
        <input className="lv-search" placeholder={`Buscar em ${meta.plural.toLowerCase()}...`} value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="lv-filters">
          {filters.map((f) => <button key={f} className={`chip${filter === f ? ' on' : ''}`} onClick={() => setFilter(f)}>{f}</button>)}
        </div>
        <button className="btn-pri" onClick={onNew}>+ Novo {meta.singular}</button>
      </div>
      <div className="lv-count">{shown.length} {shown.length === 1 ? 'item' : 'itens'}</div>
      <div className="lv-list">
        {shown.length === 0 && <div className="lv-empty">Nenhum item. Clique em <em>+ Novo {meta.singular}</em> para criar.</div>}
        {shown.map((it) => <Row key={it.id} item={it} onEdit={() => onEdit(it)} onDelete={() => onDelete(it)} />)}
      </div>
    </div>
  )
}

function Confirm({ item, onYes, onNo }: { item: Item; onYes: () => void; onNo: () => void }) {
  return (
    <div className="modal-bg" onClick={onNo}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Excluir &ldquo;{item.title || 'item sem título'}&rdquo;?</div>
        <p className="modal-text">Some do catálogo do site. Esta ação não pode ser desfeita.</p>
        <div className="modal-acts">
          <button className="btn-danger" onClick={onYes}>Excluir</button>
          <button className="btn-sec" onClick={onNo}>Manter</button>
        </div>
      </div>
    </div>
  )
}

function InviteLinkModal({ url, onDone }: { url: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // clipboard indisponível: o link já está selecionável no campo abaixo.
    }
  }
  return (
    <div className="modal-bg" onClick={onDone}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">◆ Link de configuração pronto</div>
        <p className="section-copy" style={{ marginBottom: 14 }}>
          Envie esse link pro mentor por WhatsApp, e-mail ou como preferir. Ele funciona uma
          única vez e expira em 48h. Só quem abrir o link escolhe a senha — você não vai saber
          qual é.
        </p>
        <div className="fld">
          <input className="inp" value={url} readOnly onFocus={(e) => e.target.select()} />
        </div>
        <div className="modal-acts">
          <button className="btn-pri" onClick={copy}>{copied ? 'Copiado ✓' : 'Copiar link'}</button>
          <button className="btn-sec" onClick={onDone}>Concluído</button>
        </div>
      </div>
    </div>
  )
}

function AdminUsersView({
  users,
  currentAdmin,
  onCreateInvite,
  onRegenerateInvite,
  onUpdate,
  onDelete,
}: {
  users: AdminUser[]
  currentAdmin: AdminSession
  onCreateInvite: (input: { username: string; name: string; role: 'master' | 'admin' }) => Promise<string | undefined>
  onRegenerateInvite: (id: string) => Promise<string | undefined>
  onUpdate: (input: { id: string; name: string; role: 'master' | 'admin'; active: boolean; password?: string }) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [editing, setEditing] = useState<AdminUser | 'new' | null>(null)
  const [form, setForm] = useState({ username: '', name: '', password: '', role: 'admin' as 'master' | 'admin', active: true })
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [inviteLink, setInviteLink] = useState<string | null>(null)

  const openNew = () => {
    setForm({ username: '', name: '', password: '', role: 'admin', active: true })
    setFormError('')
    setIsSaving(false)
    setEditing('new')
  }
  const openEdit = (user: AdminUser) => {
    setForm({ username: user.username, name: user.name, password: '', role: user.role, active: user.active })
    setFormError('')
    setIsSaving(false)
    setEditing(user)
  }
  const save = async () => {
    if (!editing || isSaving) return
    setIsSaving(true)
    setFormError('')
    try {
      if (editing === 'new') {
        const url = await onCreateInvite({ username: form.username, name: form.name, role: form.role })
        setEditing(null)
        if (url) setInviteLink(url)
      } else {
        await onUpdate({ id: editing.id, name: form.name, role: form.role, active: form.active, password: form.password || undefined })
        setEditing(null)
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Não foi possível salvar o acesso no banco.')
      setIsSaving(false)
    }
  }
  const regenerate = async (user: AdminUser) => {
    setFormError('')
    try {
      const url = await onRegenerateInvite(user.id)
      if (url) setInviteLink(url)
    } catch {
      // erro já é reportado pelo failAdminAction do chamador (adminError global).
    }
  }
  const closeInviteLink = () => {
    setInviteLink(null)
    window.location.reload()
  }

  return (
    <div className="listview">
      {inviteLink && <InviteLinkModal url={inviteLink} onDone={closeInviteLink} />}
      {editing && (
        <div className="modal-bg" onClick={() => setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{editing === 'new' ? 'Novo acesso' : `Editar ${editing.username}`}</div>
            <div className="fld">
              <label className="fld-label">Usuário</label>
              <input className="inp" value={form.username} disabled={editing !== 'new'} onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))} placeholder="nome_sobrenome" />
            </div>
            <div className="fld">
              <label className="fld-label">Nome</label>
              <input className="inp" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            {editing === 'new' ? (
              <div className="fld-hint" style={{ marginBottom: 14 }}>
                Sem senha aqui: ao salvar, você recebe um link de configuração de uso único pra
                enviar ao mentor. Quem escolhe a senha é ele.
              </div>
            ) : (
              <div className="fld">
                <label className="fld-label">Nova senha</label>
                <input className="inp" type="password" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Deixe em branco para manter" />
                <div className="fld-hint">Prefere não digitar a senha dele? Feche e use &ldquo;Gerar link&rdquo; na lista.</div>
              </div>
            )}
            <div className="ed-2col">
              <Field label="Poderes">
                <select className="inp" value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value as 'master' | 'admin' }))}>
                  <option value="admin">Admin de produtos</option>
                  <option value="master">Master</option>
                </select>
              </Field>
              <Field label="Status">
                <select className="inp" value={form.active ? 'active' : 'inactive'} onChange={(e) => setForm(f => ({ ...f, active: e.target.value === 'active' }))}>
                  <option value="active">Ativo</option>
                  <option value="inactive">Bloqueado</option>
                </select>
              </Field>
            </div>
            <div className="modal-acts">
              {formError && <div className="ed-save-error" role="alert">{formError}</div>}
              <button className="btn-pri" onClick={save} disabled={isSaving || (editing === 'new' && !form.username.trim())} style={{ opacity: isSaving || (editing === 'new' && !form.username.trim()) ? .45 : 1 }}>
                {isSaving ? 'Salvando...' : editing === 'new' ? 'Criar e gerar link' : 'Salvar acesso'}
              </button>
              <button className="btn-sec" onClick={() => setEditing(null)} disabled={isSaving} style={{ opacity: isSaving ? 0.55 : 1 }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className="lv-toolbar">
        <div className="section-copy">Crie acessos para quem pode cadastrar produtos. Admin comum vê, edita e exclui somente o que criou.</div>
        <button className="btn-pri" onClick={openNew}>+ Novo acesso</button>
      </div>
      <div className="lv-list">
        {users.map((user) => (
          <div className="row admin-row" key={user.id}>
            <div className="row-chip"><span style={{ color: user.role === 'master' ? 'var(--olive)' : 'var(--wheat)' }}>{user.role === 'master' ? 'M' : 'A'}</span></div>
            <div className="row-main">
              <div className="row-title">{user.name || user.username}</div>
              <div className="row-cat">{user.username} · {user.role === 'master' ? 'Master' : 'Admin de produtos'}</div>
            </div>
            {!user.hasPassword && <span className="pill draft">Aguardando configuração</span>}
            <span className={`pill ${user.active ? 'pub' : 'draft'}`}>{user.active ? 'Ativo' : 'Bloqueado'}</span>
            <div className="row-acts">
              <button className="row-btn" onClick={() => regenerate(user)}>{user.hasPassword ? 'Gerar link' : 'Reenviar link'}</button>
              <button className="row-btn" onClick={() => openEdit(user)}>Editar</button>
              <button className="row-btn danger" disabled={user.id === currentAdmin.id} onClick={() => { void onDelete(user.id).catch(() => undefined) }}>Excluir</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StudioTemplatesView({
  templates,
  onSave,
  onDelete,
}: {
  templates: StudioTemplate[]
  onSave: (template: StudioTemplate) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const emptyTemplate = (): StudioTemplate => ({
    id: `tpl-${Date.now()}`,
    module: 'documentos',
    name: '',
    description: '',
    status: 'Rascunho',
    payload: { modelId: 'branco' },
  })
  const [editing, setEditing] = useState<StudioTemplate | null>(null)
  const [payloadText, setPayloadText] = useState('{}')
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const baseOptions = (module: StudioTemplate['module']) => {
    if (module === 'slides') return [
      { id: 'capa', label: 'Capa' },
      { id: 'titulo', label: 'Título' },
    ]
    if (module === 'design') return [
      { id: 'manchete', label: 'Manchete' },
      { id: 'cartaz', label: 'Cartaz' },
      { id: 'editorial', label: 'Editorial' },
      { id: 'convite', label: 'Convite' },
    ]
    return [
      { id: 'branco', label: 'Nenhum' },
      { id: 'devocional', label: 'Devocional' },
      { id: 'aula', label: 'Aula / Plano' },
      { id: 'mensagem', label: 'Mensagem' },
    ]
  }
  const setEditingPayload = (payload: Record<string, unknown>) => {
    setEditing(t => t ? { ...t, payload } : t)
    setPayloadText(JSON.stringify(payload, null, 2))
  }
  const openEditor = (module: StudioTemplate['module']) => {
    window.open(`/studio/${module === 'documentos' ? 'documentos' : module}?context=template-admin`, '_blank', 'noopener,noreferrer')
  }
  const start = (template?: StudioTemplate) => {
    const next = template ?? emptyTemplate()
    setFormError('')
    setIsSaving(false)
    setEditing(next)
    setPayloadText(JSON.stringify(next.payload ?? {}, null, 2))
  }
  const save = async () => {
    if (!editing || isSaving) return
    let payload: Record<string, unknown> = {}
    try {
      payload = JSON.parse(payloadText || '{}') as Record<string, unknown>
    } catch {
      setFormError('O JSON do modelo está inválido.')
      return
    }
    setIsSaving(true)
    setFormError('')
    try {
      await onSave({ ...editing, payload })
      setEditing(null)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Não foi possível salvar o modelo no banco.')
      setIsSaving(false)
    }
  }
  const moduleLabel = (module: StudioTemplate['module']) => module === 'documentos' ? 'Documentos' : module === 'slides' ? 'Slides' : 'Design'

  return (
    <div className="listview">
      {editing && (
        <div className="modal-bg" onClick={() => setEditing(null)}>
          <div className="modal studio-template-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{editing.name ? `Editar ${editing.name}` : 'Novo modelo do Studio'}</div>
            <div className="ed-2col">
              <Field label="Módulo">
                <select className="inp" value={editing.module} onChange={(e) => {
                  const nextModule = e.target.value as StudioTemplate['module']
                  const first = baseOptions(nextModule)[0]?.id
                  setEditing(t => t ? { ...t, module: nextModule, payload: { ...t.payload, modelId: first } } : t)
                  setPayloadText(JSON.stringify({ ...(editing.payload ?? {}), modelId: first }, null, 2))
                }}>
                  <option value="documentos">Documentos</option>
                  <option value="slides">Slides</option>
                  <option value="design">Design</option>
                </select>
              </Field>
              <Field label="Status">
                <select className="inp" value={editing.status} onChange={(e) => setEditing(t => t ? { ...t, status: e.target.value as StudioTemplate['status'] } : t)}>
                  <option>Ativo</option>
                  <option>Rascunho</option>
                </select>
              </Field>
            </div>
            <Field label="Modelo base" hint="Esse é o modelo real que aparece para o comprador. Excluir ou rascunhar aqui remove da lista dele.">
              <select
                className="inp"
                value={String(editing.payload?.modelId ?? baseOptions(editing.module)[0]?.id ?? '')}
                onChange={(e) => setEditingPayload({ ...(editing.payload ?? {}), modelId: e.target.value })}
              >
                {baseOptions(editing.module).map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </Field>
            <Field label="Nome do modelo">
              <input className="inp" value={editing.name} onChange={(e) => setEditing(t => t ? { ...t, name: e.target.value } : t)} />
            </Field>
            <Field label="Descrição">
              <textarea className="inp ta" value={editing.description} onChange={(e) => setEditing(t => t ? { ...t, description: e.target.value } : t)} />
            </Field>
            <Field label="Payload técnico do modelo" hint="Base para ligar os editores aos templates do comprador. Pode guardar estrutura, ids e variações.">
              <textarea className="inp ta code-ta" value={payloadText} onChange={(e) => setPayloadText(e.target.value)} />
            </Field>
            <div className="modal-acts">
              {formError && <div className="ed-save-error" role="alert">{formError}</div>}
              <button className="btn-pri" onClick={save} disabled={isSaving || !editing.name.trim()} style={{ opacity: !isSaving && editing.name.trim() ? 1 : .45 }}>
                {isSaving ? 'Salvando...' : 'Salvar modelo'}
              </button>
              <button className="btn-sec" onClick={() => setEditing(null)} disabled={isSaving} style={{ opacity: isSaving ? 0.55 : 1 }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className="studio-admin-hero">
        <div>
          <div className="adm-top-crumb">◆ CE.X Studio</div>
          <h2>Manutenção dos modelos</h2>
          <p>Área master para acessar os módulos e cadastrar os templates que depois serão consumidos pelos compradores.</p>
        </div>
        <button className="btn-pri" onClick={() => start()}>+ Novo modelo</button>
      </div>

      <div className="studio-module-grid">
        {(['documentos', 'slides', 'design'] as StudioTemplate['module'][]).map((module) => (
          <button className="studio-module-card" key={module} onClick={() => openEditor(module)}>
            <span>◆ {moduleLabel(module)}</span>
            <strong>Abrir módulo</strong>
            <em>{templates.filter(t => t.module === module).length} modelo(s) cadastrados</em>
          </button>
        ))}
      </div>

      <div className="lv-list">
        {templates.length === 0 && <div className="lv-empty">Nenhum modelo cadastrado ainda.</div>}
        {templates.map((template) => (
          <div className="row admin-row" key={template.id}>
            <div className="row-chip"><span style={{ color: 'var(--olive)' }}>X</span></div>
            <div className="row-main">
              <div className="row-title">{template.name}</div>
              <div className="row-desc">{template.description}</div>
              <div className="row-cat">{moduleLabel(template.module)} · criado por {template.created_by_username ?? 'master'}</div>
            </div>
            <span className={`pill ${template.status === 'Ativo' ? 'pub' : 'draft'}`}>{template.status}</span>
            <div className="row-acts">
              <button className="row-btn" onClick={() => start(template)}>Editar</button>
              <button className="row-btn danger" onClick={() => { void onDelete(template.id).catch(() => undefined) }}>Excluir</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── MAIN ─────────────────────────────────────────────────────────────────────

type InitialData = {
  estantes: EstanteAdmin[]
  materiais: Material[]
  cursos: Curso[]
  mentorias: Mentoria[]
  adminUsers: AdminUser[]
  studioTemplates: StudioTemplate[]
  metrics: AdminMetrics
} | null

export default function AdminClient({ initialAuthed, initialAdmin, initialData }: { initialAuthed: boolean; initialAdmin: AdminSession | null; initialData: InitialData }) {
  const [authed, setAuthed] = useState(initialAuthed)
  const [admin, setAdmin] = useState<AdminSession | null>(initialAdmin)
  const [data, setData] = useState<AdminData>(() => {
    if (initialData) {
      // Map DB rows → admin types
      const estantes: EstanteAdmin[] = (initialData.estantes as unknown as Record<string, unknown>[]).map((e) => ({
        key: e.key as string, label: e.label as string,
        familia: e.familia as 'ministrar' | 'liderar',
        accent: e.accent as string, faixaEtaria: (e.faixa_etaria as string) ?? '',
        status: (e.status as 'visible' | 'hidden') ?? 'visible',
        order: (e.ord as number) ?? 0,
      }))
      const initialMetrics = initialData.metrics ?? buildData().metrics
      const materiais: Material[] = (initialData.materiais as unknown as Record<string, unknown>[]).map((m) => {
        const conteudo = (m.conteudo as string[]) ?? []
        const contents = normalizeMaterialContents(m.contents, conteudo)
        const meta = deriveMaterialContentMeta(contents)
        const id = m.id as string
        return {
          id, type: 'material' as const,
          family: m.familia === 'ministrar' ? 'Para ministrar' : 'Para liderar',
          shelf: estantes.find(e => e.key === m.estante)?.label ?? (m.estante as string),
          code: (m.code as string) ?? '', title: m.titulo as string, desc: m.promessa as string,
          messages: meta.messages ?? ((m.mensagens as number | null) ?? null),
          pages: meta.pages || ((m.paginas as number) ?? 0),
          formats: meta.formats.length ? meta.formats : ((m.formatos as string[]) ?? ['PDF']),
          price: parseInt(((m.preco as string) ?? '0').replace(/\D/g, ''), 10),
          hotmart: (m.hotmart_url as string) ?? '', accent: accentFor({ type: 'material', family: m.familia === 'ministrar' ? 'Para ministrar' : 'Para liderar', shelf: estantes.find(e => e.key === m.estante)?.label ?? '' } as Material),
          image: null, model: (m.model as Modelo) ?? 'A',
          big: m.big ? parseInt(m.big as string, 10) : null,
          bigLabel: (m.big_label as string) ?? '',
          messageList: (m.mensagens_lista as { nome: string; desc: string }[]) ?? conteudo.map(c => ({ nome: c, desc: '' })),
          paraQuem: (m.pra_quem as string) ?? '',
          beneficios: conteudo,
          contents,
          depoimento: (m.depoimento as { texto: string; autor: string }) ?? { texto: '', autor: '' },
          faq: (m.faq as { q: string; a: string }[]) ?? [],
          keywords: (m.keywords as string[]) ?? [],
          status: (m.status as string) ?? 'Publicado',
          views: initialMetrics.materialViews[id] ?? 0,
          buyClicks: initialMetrics.materialBuyClicks[id] ?? 0,
          purchases: initialMetrics.materialPurchases[id] ?? 0,
        }
      })
      const NIVEL_LABEL: Record<string, string> = { fundacao: 'Fundação', lideranca: 'Liderança', multiplicacao: 'Multiplicação' }
      const NIVEL_AC: Record<string, string> = { fundacao: AC.wheat, lideranca: AC.clay, multiplicacao: AC.olive }
      const cursos: Curso[] = (initialData.cursos as unknown as Record<string, unknown>[]).map((c) => {
        const id = c.slug as string
        return {
          id, type: 'curso' as const,
          level: NIVEL_LABEL[c.nivel as string] ?? (c.nivel as string),
          etapa: parseInt(c.num as string, 10), totalEtapas: 6,
          title: c.title as string, desc: (c.desc_text as string) ?? '',
          promessa: (c.promessa as string) ?? '',
          weeks: ((c.ementa as unknown[]) ?? []).length,
          mentoria: true, aoVivo: true,
          mentor: (c.mentor as string) ?? '', mentorBio: (c.mentor_bio as string) ?? '',
          formato: (c.formato as string) ?? '',
          accent: NIVEL_AC[c.nivel as string] ?? AC.olive,
          image: null, status: (c.status as string) ?? 'Publicado',
          views: initialMetrics.cursoViews[id] ?? 0,
          waitlist: initialMetrics.cursoWaitlist[id] ?? 0,
          paraQuem: (c.pra_quem as string) ?? '',
          depoimento: {
            texto: ((c.depoimento as Record<string,string>)?.texto) ?? '',
            autor: ((c.depoimento as Record<string,string>)?.autor) ?? '',
            cargo: ((c.depoimento as Record<string,string>)?.cargo) ?? '',
          },
          ementa: ((c.ementa as {titulo:string; desc:string}[]) ?? []).map(e => ({ titulo: e.titulo ?? '', desc: e.desc ?? '' })),
          proximaTurma: (c.turma as string) ?? '',
          keywords: (c.keywords as string[]) ?? [],
        }
      })
      const mentorias: Mentoria[] = (initialData.mentorias as unknown as Record<string, unknown>[]).map((m) => ({
        id: m.id as string, type: 'mentoria' as const,
        title: m.title as string, desc: (m.desc_text as string) ?? '',
        formato: (m.formato as string) ?? '', vagas: (m.vagas as number) ?? 0,
        mentor: (m.mentor as string) ?? '', accent: (m.accent as string) ?? AC.olive,
        image: null, status: (m.status as string) ?? 'Publicado',
        views: 0, waitlist: (m.waitlist as number) ?? 0,
        cadencia: (m.cadencia as string) ?? '',
        keywords: (m.keywords as string[]) ?? [],
      }))
      return {
        materiais, cursos, mentorias, eventos: [], estantes,
        adminUsers: initialData.adminUsers ?? [],
        studioTemplates: initialData.studioTemplates ?? [],
        metrics: initialMetrics,
      }
    }
    return buildData()
  })
  const [route, setRoute] = useState<Route>({ screen: 'dashboard' })
  const [editing, setEditing] = useState<Item | null>(null)
  const [confirm, setConfirm] = useState<Item | null>(null)
  const [adminError, setAdminError] = useState('')
  const [, startTransition] = useTransition()

  if (!authed || !admin) return <Login />

  const arrKey = (type: CatalogItemType) => TYPES.find((t) => t.key === type)!.arr
  const typePlural = (type: ItemType) => TYPES.find((t) => t.key === type)?.plural ?? 'Itens'
  const failAdminAction = (error: unknown, fallback: string) => {
    const message = error instanceof Error ? error.message : fallback
    setAdminError(message)
    return error instanceof Error ? error : new Error(message)
  }
  const counts = {
    material: data.materiais.length, curso: data.cursos.length,
    mentoria: data.mentorias.length, evento: data.eventos.length,
    estante: data.estantes.length,
    users: data.adminUsers.length,
    templates: data.studioTemplates.length,
  }

  const go = (r: Route) => {
    if (!admin.isMaster && (r.screen === 'shelves' || r.screen === 'users' || r.screen === 'studio')) return
    setEditing(null); setRoute(r)
  }

  const save = async (d: Item) => {
    setAdminError('')
    if (d.type === 'evento') throw new Error('Eventos não têm tabela própria. Cadastre esse conteúdo como material em uma estante de eventos.')
    const key = arrKey(d.type)
    const saving = d.id ? d : { ...d, id: `${d.type}-${Date.now()}` } as Item
    if (saving.type === 'material') {
      const m = saving as Material
      const contentSummary = materialContentSummary(m.contents ?? [], m.beneficios ?? [])
      await upsertMaterial({
        id: m.id, familia: m.family === 'Para ministrar' ? 'ministrar' : 'liderar',
        estante: Object.entries(ESTANTE_MAP).find(([,v]) => v.label === m.shelf)?.[0] ?? m.shelf,
        model: m.model, etiqueta: m.shelf, titulo: m.title, code: m.code || null,
        big: m.big ? String(m.big) : null, big_label: m.bigLabel || null,
        promessa: m.desc, mensagens: m.messages, paginas: m.pages,
        formatos: (m.formats ?? []).filter(Boolean),
        preco: `R$ ${m.price}`, hotmart_url: m.hotmart,
        colecoes: [], pra_quem: m.paraQuem,
        conteudo: contentSummary,
        contents: m.contents ?? [],
        mensagens_lista: m.messageList ?? [],
        como_usar: '', faq: m.faq ?? [],
        keywords: m.keywords ?? [],
        status: m.status,
      })
    } else if (saving.type === 'curso') {
      const c = saving as Curso
      const NIVEL_KEY: Record<string,string> = { 'Fundação':'fundacao','Liderança':'lideranca','Multiplicação':'multiplicacao' }
      await upsertCurso({
        slug: c.id, num: String(c.etapa).padStart(2,'0'),
        nivel: NIVEL_KEY[c.level] ?? 'fundacao',
        title: c.title, desc_text: c.desc, dur: `${c.weeks} semanas`,
        promessa: c.promessa || c.desc, pra_quem: c.paraQuem,
        ementa: c.ementa.map((e, i) => ({ semana: i + 1, titulo: e.titulo, desc: e.desc })),
        formato: c.formato || '', mentor: c.mentor, mentor_bio: c.mentorBio || '',
        depoimento: c.depoimento, turma: c.proximaTurma,
        keywords: c.keywords ?? [],
        status: c.status,
      })
    } else if (saving.type === 'mentoria') {
      const men = saving as Mentoria
      await upsertMentoria({
        id: men.id || `mentoria-${Date.now()}`,
        title: men.title, desc_text: men.desc, formato: men.formato,
        vagas: men.vagas, mentor: men.mentor, accent: men.accent,
        cadencia: men.cadencia, status: men.status, waitlist: men.waitlist,
        keywords: men.keywords ?? [],
      })
    }
    setData((prev) => {
      const arr = prev[key] as Item[]
      if (d.id) return { ...prev, [key]: arr.map((x) => (x.id === d.id ? saving : x)) }
      return { ...prev, [key]: [saving, ...arr] }
    })
    setEditing(null)
  }

  const doDelete = async (it: Item) => {
    setAdminError('')
    if (it.type === 'evento') throw failAdminAction(new Error('Eventos não têm tabela própria no site.'), 'Eventos não têm tabela própria no site.')
    const key = arrKey(it.type)
    try {
      if (it.type === 'material') await deleteMaterial(it.id)
      else if (it.type === 'curso') await deleteCurso(it.id)
      else if (it.type === 'mentoria') await deleteMentoria(it.id)
      setData((prev) => ({ ...prev, [key]: (prev[key] as Item[]).filter((x) => x.id !== it.id) }))
      setConfirm(null)
    } catch (error) {
      throw failAdminAction(error, 'Não foi possível excluir o item no banco.')
    }
  }

  const saveShelf = async (e: EstanteAdmin) => {
    setAdminError('')
    try {
      const current = data.estantes.find(x => x.key === e.key)
      const maxOrder = Math.max(-1, ...data.estantes.map(x => x.order))
      const saving = current ? e : { ...e, order: maxOrder + 1 }
      await upsertEstante({ key: saving.key, label: saving.label, familia: saving.familia, accent: saving.accent, faixa_etaria: saving.faixaEtaria, status: saving.status, ord: saving.order })
      setData(prev => {
      const exists = prev.estantes.find(x => x.key === e.key)
      if (exists) return { ...prev, estantes: prev.estantes.map(x => x.key === e.key ? saving : x) }
      return { ...prev, estantes: [...prev.estantes, saving] }
      })
    } catch (error) {
      throw failAdminAction(error, 'Não foi possível salvar a estante no banco.')
    }
  }

  const toggleShelf = async (key: string) => {
    setAdminError('')
    try {
      const shelf = data.estantes.find(e => e.key === key)
      if (!shelf) return
      const saving = { ...shelf, status: (shelf.status === 'visible' ? 'hidden' : 'visible') as 'visible'|'hidden' }
      await upsertEstante({ key: saving.key, label: saving.label, familia: saving.familia, accent: saving.accent, faixa_etaria: saving.faixaEtaria, status: saving.status, ord: saving.order })
      setData(prev => ({ ...prev, estantes: prev.estantes.map(e => e.key === key ? saving : e) }))
    } catch (error) {
      throw failAdminAction(error, 'Não foi possível alterar a visibilidade da estante no banco.')
    }
  }

  const deleteShelf = async (key: string) => {
    setAdminError('')
    try {
      await deleteEstante(key)
      setData(prev => ({
        ...prev,
        estantes: prev.estantes.filter(e => e.key !== key).map((e, i) => ({ ...e, order: i })),
      }))
    } catch (error) {
      throw failAdminAction(error, 'Não foi possível excluir a estante no banco.')
    }
  }

  const reorderShelves = async (orderedKeys: string[]) => {
    setAdminError('')
    try {
      await reorderEstantes(orderedKeys)
      setData(prev => {
      const map = Object.fromEntries(prev.estantes.map(e => [e.key, e]))
      const reordered = orderedKeys.map((key, i) => ({ ...map[key], order: i }))
      return { ...prev, estantes: reordered }
      })
    } catch (error) {
      throw failAdminAction(error, 'Não foi possível reordenar as estantes no banco.')
    }
  }

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction()
      setAdmin(null)
      setAuthed(false)
    })
  }

  const createInvite = async (input: { username: string; name: string; role: 'master' | 'admin' }) => {
    setAdminError('')
    try {
      const { setupUrl } = await createAdminInvite(input)
      return setupUrl
    } catch (error) {
      throw failAdminAction(error, 'Não foi possível criar o acesso no banco.')
    }
  }

  const regenerateInvite = async (id: string) => {
    setAdminError('')
    try {
      const { setupUrl } = await regenerateAdminInvite(id)
      return setupUrl
    } catch (error) {
      throw failAdminAction(error, 'Não foi possível gerar o link no banco.')
    }
  }

  const updateUser = async (input: { id: string; name: string; role: 'master' | 'admin'; active: boolean; password?: string }) => {
    setAdminError('')
    try {
      await updateAdminUser(input)
      setData(prev => ({ ...prev, adminUsers: prev.adminUsers.map(user => user.id === input.id ? { ...user, name: input.name, role: input.role, active: input.active } : user) }))
    } catch (error) {
      throw failAdminAction(error, 'Não foi possível atualizar o acesso no banco.')
    }
  }

  const removeUser = async (id: string) => {
    setAdminError('')
    try {
      await deleteAdminUser(id)
      setData(prev => ({ ...prev, adminUsers: prev.adminUsers.filter(user => user.id !== id) }))
    } catch (error) {
      throw failAdminAction(error, 'Não foi possível excluir o acesso no banco.')
    }
  }

  const saveStudioTemplate = async (template: StudioTemplate) => {
    setAdminError('')
    try {
      await upsertStudioTemplate(template)
      setData(prev => {
        const exists = prev.studioTemplates.some(item => item.id === template.id)
        return { ...prev, studioTemplates: exists ? prev.studioTemplates.map(item => item.id === template.id ? template : item) : [template, ...prev.studioTemplates] }
      })
    } catch (error) {
      throw failAdminAction(error, 'Não foi possível salvar o modelo do Studio no banco.')
    }
  }

  const removeStudioTemplate = async (id: string) => {
    setAdminError('')
    try {
      await deleteStudioTemplate(id)
      setData(prev => ({ ...prev, studioTemplates: prev.studioTemplates.filter(item => item.id !== id) }))
    } catch (error) {
      throw failAdminAction(error, 'Não foi possível excluir o modelo do Studio no banco.')
    }
  }

  const currentType = route.screen === 'list' ? route.type : 'material'
  const pageTitle = editing
    ? (editing.id ? 'Editar item' : 'Novo item')
    : route.screen === 'dashboard' ? 'Painel de métricas'
    : route.screen === 'shelves' ? 'Estantes'
    : route.screen === 'users' ? 'Acessos'
    : route.screen === 'studio' ? 'CE.X Studio'
    : typePlural(currentType)

  return (
    <div className="adm">
      <Sidebar route={route} go={go} counts={counts} onLogout={handleLogout} admin={admin} />
      <main className="adm-main">
        <header className="adm-top">
          <div>
            <div className="adm-top-crumb">CE.X · PAINEL{editing ? ' · ' + typePlural(editing.type).toUpperCase() : ''}</div>
            <h1 className="adm-top-title">{pageTitle}</h1>
          </div>
          {editing && <button className="btn-sec" onClick={() => setEditing(null)}>← Voltar à lista</button>}
        </header>
        <div className="adm-content">
          {adminError && (
            <div className="adm-save-alert" role="alert">
              <span>{adminError}</span>
              <button type="button" onClick={() => setAdminError('')}>Fechar</button>
            </div>
          )}
          {editing ? (
            <Editor item={editing} onSave={save} onCancel={() => setEditing(null)} />
          ) : route.screen === 'dashboard' ? (
            <Dashboard data={data} />
          ) : route.screen === 'shelves' ? (
            <ShelvesView
              estantes={data.estantes}
              materiais={data.materiais}
              onSave={saveShelf}
              onToggle={toggleShelf}
              onDelete={deleteShelf}
              onReorder={reorderShelves}
            />
          ) : route.screen === 'users' && admin.isMaster ? (
            <AdminUsersView
              users={data.adminUsers}
              currentAdmin={admin}
              onCreateInvite={createInvite}
              onRegenerateInvite={regenerateInvite}
              onUpdate={updateUser}
              onDelete={removeUser}
            />
          ) : route.screen === 'studio' && admin.isMaster ? (
            <StudioTemplatesView
              templates={data.studioTemplates}
              onSave={saveStudioTemplate}
              onDelete={removeStudioTemplate}
            />
          ) : (
            <ListView type={currentType} items={data[arrKey(currentType)] as Item[]}
              onNew={() => setEditing(newItem(currentType))}
              onEdit={setEditing}
              onDelete={(it) => setConfirm(it)} />
          )}
        </div>
      </main>
      {confirm && <Confirm item={confirm} onYes={() => { void doDelete(confirm).catch(() => undefined) }} onNo={() => setConfirm(null)} />}
    </div>
  )
}
