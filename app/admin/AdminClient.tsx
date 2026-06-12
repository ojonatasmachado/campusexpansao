'use client'
import { useState, useRef, useTransition, type ReactNode, type CSSProperties } from 'react'
import { loginAction, logoutAction, upsertEstante, deleteEstante, reorderEstantes, upsertMaterial, deleteMaterial, upsertCurso, deleteCurso, upsertMentoria, deleteMentoria } from './actions'
import { ESTANTE_MAP, ESTANTES } from '../lib/materiais-data'

// ── TYPES ────────────────────────────────────────────────────────────────────

type Modelo = 'A' | 'B' | 'C' | 'D'
type ItemType = 'material' | 'curso' | 'mentoria' | 'evento'

interface Material {
  id: string; type: 'material'; family: string; shelf: string; code: string
  title: string; desc: string; messages: number | null; pages: number
  format: string; price: number; hotmart: string; accent: string; image: string | null
  model: Modelo; big: number | null; bigLabel: string
  messageList: { nome: string; desc: string }[]
  paraQuem: string; beneficios: string[]; depoimento: { texto: string; autor: string }
  status: string; views: number; buyClicks: number
}
interface Curso {
  id: string; type: 'curso'; level: string; etapa: number; totalEtapas: number
  title: string; desc: string; weeks: number; mentoria: boolean; aoVivo: boolean
  mentor: string; accent: string; image: string | null; status: string; views: number
  waitlist: number; paraQuem: string; depoimento: { texto: string; autor: string }
  ementa: string[]; proximaTurma: string
}
interface Mentoria {
  id: string; type: 'mentoria'; title: string; desc: string
  formato: string; vagas: number; mentor: string; accent: string
  image: string | null; status: string; views: number; waitlist: number; cadencia: string
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
  metrics: {
    series30: number[]
    kpis: { visitas: number; visitasDelta: number; cliquesComprar: number; cliquesDelta: number; listaEspera: number; listaDelta: number; capturas: number; capturasDelta: number }
    funil: { label: string; value: number }[]
    origem: { label: string; value: number; color: string }[]
  }
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
  { key: 'evento' as const, plural: 'Eventos', singular: 'evento', arr: 'eventos' as const },
]

// ── DADOS INICIAIS ────────────────────────────────────────────────────────────

function buildData(): AdminData {
  const series30 = Array(30).fill(0)
  return {
    materiais: [], cursos: [], mentorias: [], eventos: [], estantes: [],
    metrics: {
      series30,
      kpis: { visitas:0,visitasDelta:0,cliquesComprar:0,cliquesDelta:0,listaEspera:0,listaDelta:0,capturas:0,capturasDelta:0 },
      funil: [{label:'Visitas ao site',value:0},{label:'Abriu um material',value:0},{label:'Clicou em comprar',value:0},{label:'Compra concluída',value:0}],
      origem: [{label:'Instagram',value:0,color:AC.olive},{label:'Direto',value:0,color:AC.wheat},{label:'Google',value:0,color:AC.clay},{label:'YouTube',value:0,color:AC.oliveDeep}],
    },
  }
}
function newItem(type: ItemType): Item {
  const base = { id: '', title: '', desc: '', image: null, status: 'Rascunho', views: 0 }
  if (type === 'material') {
    const family = 'Para ministrar', shelf = 'Juniores'
    return { ...base, type: 'material', family, shelf, code: '', messages: null, pages: 0,
      format: 'PDF', price: 0, hotmart: '', accent: accentFor({ type: 'material', family, shelf } as Material),
      buyClicks: 0, model: 'A', big: null, bigLabel: 'mensagens', messageList: [], paraQuem: '',
      beneficios: ['Editável e pronto pra aplicar na sua igreja', 'White-label CE.X: coloque a marca do seu ministério'],
      depoimento: { texto: '', autor: '' } } as Material
  }
  if (type === 'curso') {
    return { ...base, type: 'curso', level: 'Fundação', etapa: 1, totalEtapas: 6, weeks: 4,
      mentoria: true, aoVivo: true, mentor: '',
      accent: accentFor({ type: 'curso', level: 'Fundação' } as Curso),
      waitlist: 0, ementa: ['', '', '', ''], paraQuem: '',
      depoimento: { texto: '', autor: '' }, proximaTurma: 'Próxima turma: a definir' } as Curso
  }
  if (type === 'mentoria') {
    return { ...base, type: 'mentoria', formato: 'Grupo · 8 vagas', vagas: 8, mentor: '',
      cadencia: 'Encontros quinzenais · 90 min', accent: AC.olive, waitlist: 0 } as Mentoria
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
  const n = item.messages ? `${item.messages} mensagens` : (item.pages ? `${item.pages} páginas` : null)
  return [n, 'Editável', item.format || 'PDF'].filter(Boolean).join(' · ')
}

function ModelArt({ item, height = 220 }: { item: Material; height?: number }) {
  const ac = item.accent
  const etiqueta = (item.shelf ?? '').toUpperCase()
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
          <div style={{ fontFamily: 'var(--sans)', fontWeight: 800, fontSize: 38, lineHeight: .92, letterSpacing: '-.035em', color: 'var(--white)', textWrap: 'balance' } as CSSProperties}>{item.title}</div>
        </div>
      </div>
    )
  }
  if (item.model === 'C') {
    return (
      <div style={{ height, padding: 20, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'var(--ink)', backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px)', backgroundSize: '100% 38px' }}>
        <div style={{ ...eb, color: 'var(--sand)' }}><span style={{ fontSize: 9 }}>◆</span>{etiqueta}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontFamily: 'var(--sans)', fontWeight: 800, fontSize: 78, lineHeight: .8, color: ac, letterSpacing: '-.05em' }}>{big}</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>{item.bigLabel ?? ''}</span>
        </div>
        <div style={{ fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 24, lineHeight: 1, letterSpacing: '-.02em', color: 'var(--cream)' }}>{item.title}</div>
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
        <div style={{ flex: 1, padding: 20, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ fontFamily: 'var(--sans)', fontWeight: 800, fontSize: 38, lineHeight: .92, letterSpacing: '-.035em', color: 'var(--cream)', textWrap: 'balance' } as CSSProperties}>{item.title}</div>
        </div>
      </div>
    )
  }
  return (
    <div style={{ height, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'var(--ink)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ ...eb, color: ac }}><span style={{ fontSize: 9 }}>◆</span>{etiqueta}</div>
        <span style={codeStyle}>{item.code}</span>
      </div>
      <div style={{ fontFamily: 'var(--sans)', fontWeight: 800, fontSize: 44, lineHeight: .9, letterSpacing: '-.035em', color: 'var(--cream)', textWrap: 'balance' } as CSSProperties}>{item.title}</div>
    </div>
  )
}

function MaterialCardPv({ item }: { item: Material }) {
  return (
    <div className="pv-mcard" style={{ width: 300 }}>
      <ModelArt item={item} height={220} />
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

function DetailPreview({ item }: { item: Item }) {
  const isMaterial = item.type === 'material'
  const isCurso = item.type === 'curso'
  const isMentoria = item.type === 'mentoria'
  const isEvento = item.type === 'evento'
  const m = item as Material
  const c = item as Curso
  const men = item as Mentoria
  const ev = item as Evento
  const meta = [m.messages ? `${m.messages} mensagens` : null, m.pages ? `${m.pages} páginas` : null, m.format].filter(Boolean).join(' · ')

  return (
    <div className="pv-detail">
      <div className="pv-detail-nav">
        <span className="pv-detail-logo">CE<span className="pv-ol">.X</span></span>
        <span className="pv-detail-navlinks">Início · Materiais · Cursos · Sobre</span>
      </div>
      {isMaterial ? <ModelArt item={m} height={180} /> : <CardMedia item={item} height={180} big labelOverride={c.level ?? item.type} />}
      <div className="pv-detail-body">
        <div className="pv-detail-eyebrow" style={{ color: item.accent }}>
          {isCurso ? `◆ ${c.level} · ETAPA ${String(c.etapa).padStart(2, '0')} DE ${c.totalEtapas}` :
           isMentoria ? '◇ MENTORIA ACOMPANHADA' :
           isEvento ? `◆ ${ev.data}` : `◆ ${m.shelf}`}
          {isCurso && <span className="pv-ccard-live" style={{ background: item.accent, marginLeft: 10 }}>● AO VIVO</span>}
        </div>
        <h1 className="pv-detail-title">{item.title}</h1>
        <p className="pv-detail-promise">{item.desc}</p>

        {isMaterial && <>
          {m.paraQuem && <><div className="pv-detail-sec">◆ Pra quem é</div><p className="pv-detail-promise" style={{ fontSize: 13 }}>{m.paraQuem}</p></>}
          <div className="pv-detail-sec">◆ O que vem dentro</div>
          <ul className="pv-detail-list"><li>{meta}</li>{(m.beneficios ?? []).filter(Boolean).map((b, i) => <li key={i}>{b}</li>)}</ul>
          {(m.messageList ?? []).some(x => x?.nome) && <>
            <div className="pv-detail-sec">◆ As {m.messages} mensagens</div>
            <ul className="pv-detail-list">{m.messageList.filter(x => x?.nome).map((x, i) => (
              <li key={i}><span style={{ color: item.accent, fontFamily: 'var(--mono)', marginRight: 8 }}>{String(i + 1).padStart(2, '0')}</span>
                <strong style={{ color: 'var(--cream)' }}>{x.nome}</strong>
                {x.desc ? <span style={{ color: 'var(--muted)' }}> — {x.desc}</span> : null}
              </li>
            ))}</ul>
          </>}
          {m.depoimento?.texto && (
            <div style={{ borderLeft: `2px solid ${item.accent}`, paddingLeft: 14, margin: '20px 0', fontSize: 13, color: 'var(--light)', lineHeight: 1.6 }}>
              &ldquo;{m.depoimento.texto}&rdquo;
              {m.depoimento.autor && <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>{m.depoimento.autor}</div>}
            </div>
          )}
          <div className="pv-detail-buybar">
            <span className="pv-detail-price">R$ {m.price}</span>
            <span className="pv-detail-buy">COMPRAR →</span>
          </div>
          <div className="pv-detail-hot">Hotmart: <code>{m.hotmart}</code></div>
        </>}

        {isCurso && <>
          {c.paraQuem && <><div className="pv-detail-sec">◆ Pra quem é</div><p className="pv-detail-promise" style={{ fontSize: 13 }}>{c.paraQuem}</p></>}
          <div className="pv-detail-sec">◆ Ementa por semana</div>
          <ul className="pv-detail-list">{c.ementa.map((e, i) => <li key={i}><span style={{ color: item.accent, fontFamily: 'var(--mono)', marginRight: 8 }}>S{i + 1}</span>{e}</li>)}</ul>
          <div className="pv-detail-buybar">
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>{c.proximaTurma}</span>
            <span className="pv-detail-buy" style={{ background: item.accent }}>Entrar na lista de espera →</span>
          </div>
        </>}

        {isMentoria && <>
          <div className="pv-detail-sec">◆ Como funciona</div>
          <ul className="pv-detail-list"><li>{men.formato}</li><li>{men.cadencia}</li><li>Conduzida por {men.mentor}</li></ul>
          <div className="pv-detail-buybar">
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>Vagas limitadas</span>
            <span className="pv-detail-buy" style={{ background: item.accent }}>Quero ser mentorado →</span>
          </div>
        </>}

        {isEvento && <>
          <div className="pv-detail-sec">◆ O evento</div>
          <ul className="pv-detail-list"><li>{ev.data}</li><li>{ev.local}</li><li>{ev.vagas} vagas · {ev.inscritos} inscritos</li></ul>
          <div className="pv-detail-buybar">
            <span className="pv-detail-price" style={{ fontSize: 18 }}>Inscrições abertas</span>
            <span className="pv-detail-buy">Garantir vaga →</span>
          </div>
        </>}
      </div>
    </div>
  )
}

function BannerPreview({ item }: { item: Item }) {
  const isMaterial = item.type === 'material'
  const isCurso = item.type === 'curso'
  const m = item as Material
  const c = item as Curso
  const tag = isCurso ? c.level : isMaterial ? m.shelf : item.type === 'mentoria' ? 'Mentoria' : 'Evento'
  const model = isMaterial ? (m.model ?? 'A') : 'A'
  const big = m.big ?? m.messages ?? m.pages
  const bgStyle: CSSProperties | undefined = (model === 'D' && isMaterial)
    ? (item.image
        ? { backgroundImage: `url(${item.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : { background: `radial-gradient(120% 80% at 28% 18%, ${item.accent} 0%, var(--ink) 60%)` })
    : undefined
  return (
    <div className="pv-banner" style={bgStyle}>
      {model === 'D' && isMaterial && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(14,17,13,.2),rgba(14,17,13,.85))' }} />}
      <div className="pv-art-grid" />
      {model !== 'D' && <div className="pv-banner-x" style={{ color: item.accent }}>X</div>}
      <div className="pv-banner-top">
        <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.06em' }}>CE<span style={{ color: 'var(--olive)' }}>.X</span></span>
        {isCurso && <span className="pv-ccard-live" style={{ background: item.accent }}>● AO VIVO</span>}
      </div>
      <div className="pv-banner-mid">
        {model === 'B'
          ? <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: item.accent, color: 'var(--ink)', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', padding: '6px 10px', borderRadius: 4, marginBottom: 14 }}>◆ {String(tag).toUpperCase()}</div>
          : <div className="pv-banner-eyebrow" style={{ color: item.accent }}>◆ {String(tag).toUpperCase()}</div>}
        {model === 'C' && big != null && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
            <span style={{ fontFamily: 'var(--sans)', fontWeight: 800, fontSize: 80, lineHeight: .8, color: item.accent, letterSpacing: '-.05em' }}>{big}</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>{m.bigLabel ?? ''}</span>
          </div>
        )}
        <div className="pv-banner-title">{item.title}</div>
        <div className="pv-banner-desc">{item.desc}</div>
      </div>
      <div className="pv-banner-bot">
        <span>{isMaterial ? `PDF EDITÁVEL · R$ ${m.price}` : isCurso ? `${c.weeks} SEMANAS · MENTORIA INCLUSA` : item.type === 'mentoria' ? String((item as Mentoria).formato).toUpperCase() : String((item as Evento).data).toUpperCase()}</span>
        <span style={{ color: item.accent }}>{isMaterial ? 'campusexpansao.com →' : isCurso ? 'LISTA DE ESPERA ABERTA →' : 'INSCREVA-SE →'}</span>
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
  const top = steps[0].value
  const fmt = (n: number) => n.toLocaleString('pt-BR')
  return (
    <div className="panel">
      <div className="panel-head"><span className="panel-title">Funil de conversão</span></div>
      <div className="funnel">
        {steps.map((s, i) => {
          const pct = (s.value / top) * 100
          const conv = i === 0 ? 100 : (s.value / steps[i - 1].value) * 100
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

function Dashboard({ data }: { data: AdminData }) {
  const m = data.metrics
  const fmt = (n: number) => n.toLocaleString('pt-BR')
  const allItems: Item[] = [...data.materiais, ...data.cursos, ...data.mentorias, ...data.eventos]
  return (
    <div className="dash">
      <div className="kpi-row">
        <KpiCard label="Visitas (30d)" value={fmt(m.kpis.visitas)} delta={m.kpis.visitasDelta} sub="vs. período anterior" />
        <KpiCard label="Cliques em comprar" value={fmt(m.kpis.cliquesComprar)} delta={m.kpis.cliquesDelta} sub="Hotmart" />
        <KpiCard label="Lista de espera" value={fmt(m.kpis.listaEspera)} delta={m.kpis.listaDelta} sub="cursos ao vivo" />
        <KpiCard label="Capturas de e-mail" value={fmt(m.kpis.capturas)} delta={m.kpis.capturasDelta} sub="capturas de e-mail" />
      </div>
      <VisitsChart series={m.series30} />
      <div className="dash-2col">
        <Funnel steps={m.funil} />
        <Origem rows={m.origem} />
      </div>
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

function ModelField({ value, onChange, accent }: { value: Modelo; onChange: (v: Modelo) => void; accent: string }) {
  const opts = [
    { k: 'A' as Modelo, n: 'Tipográfico', d: 'Título gigante é a arte' },
    { k: 'B' as Modelo, n: 'Bloco', d: 'Faixa de cor cheia' },
    { k: 'C' as Modelo, n: 'Número', d: 'O número vende' },
    { k: 'D' as Modelo, n: 'Foto', d: 'Usa a imagem de capa' },
  ]
  return (
    <div className="ed-2col" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {opts.map((o) => (
        <button key={o.k} onClick={() => onChange(o.k)}
          style={{ textAlign: 'left', padding: '12px 14px', borderRadius: 'var(--r-sm)', border: `1px solid ${value === o.k ? accent : 'var(--border-2)'}`, background: value === o.k ? 'var(--olive-dim)' : 'var(--ink)', transition: 'all .15s', cursor: 'pointer', fontFamily: 'inherit' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: value === o.k ? accent : 'var(--muted)' }}>{o.k}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--light)' }}>{o.n}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--subtle)' }}>{o.d}</div>
        </button>
      ))}
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
          <button className="ementa-del" onClick={() => del(i)}>✕</button>
        </div>
      ))}
      <button className="btn-ghost-add" onClick={add}>+ Adicionar item</button>
    </div>
  )
}

function MessageListField({ count, value, accent, onChange }: { count: number; value: { nome: string; desc: string }[]; accent: string; onChange: (v: { nome: string; desc: string }[]) => void }) {
  const rows = Math.max(count || 0, value.length)
  const get = (i: number) => value[i] || { nome: '', desc: '' }
  const set = (i: number, patch: Partial<{ nome: string; desc: string }>) => {
    const a = Array.from({ length: rows }, (_, k) => ({ ...get(k) }))
    a[i] = { ...a[i], ...patch }
    onChange(a)
  }
  if (rows === 0) return <div className="fld-hint">Defina <em>Mensagens</em> acima para detalhar cada uma.</div>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: rows }).map((_, i) => {
        const r = get(i)
        return (
          <div key={i} style={{ border: '1px solid var(--border-2)', borderRadius: 'var(--r-sm)', padding: '12px 14px', background: 'var(--ink)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: accent }}>{String(i + 1).padStart(2, '0')}</span>
              <input className="inp" style={{ flex: 1 }} value={r.nome} onChange={(e) => set(i, { nome: e.target.value })} placeholder={`Nome da mensagem ${i + 1}`} />
            </div>
            <input className="inp" value={r.desc} onChange={(e) => set(i, { desc: e.target.value })} placeholder="Breve descrição (uma linha)" />
          </div>
        )
      })}
    </div>
  )
}

function DepoimentoField({ value, onChange }: { value: { texto: string; autor: string }; onChange: (v: { texto: string; autor: string }) => void }) {
  const v = value || { texto: '', autor: '' }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <textarea className="inp ta" value={v.texto} onChange={(e) => onChange({ ...v, texto: e.target.value })} placeholder="O que essa pessoa disse depois de usar..." />
      <input className="inp" value={v.autor} onChange={(e) => onChange({ ...v, autor: e.target.value })} placeholder="Nome · igreja / cargo" />
    </div>
  )
}

function ImageField({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) onChange(URL.createObjectURL(f))
  }
  return (
    <div className="imgfield">
      <div className="imgdrop" onClick={() => inputRef.current?.click()}>
        {value ? <img src={value} alt="" className="imgthumb" /> : <span>Arraste uma imagem ou <em>clique para enviar</em></span>}
      </div>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={pick} />
      <div className="imgactions">
        {value && <button className="lnk-danger" onClick={() => onChange(null)}>Remover imagem</button>}
        <span className="fld-hint" style={{ margin: 0 }}>Sem imagem, usa a <em>arte automática CE.X</em>.</span>
      </div>
    </div>
  )
}

function EmentaField({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const set = (i: number, v: string) => { const a = [...value]; a[i] = v; onChange(a) }
  const add = () => onChange([...value, ''])
  const del = (i: number) => onChange(value.filter((_, k) => k !== i))
  return (
    <div className="ementa">
      {value.map((e, i) => (
        <div className="ementa-row" key={i}>
          <span className="ementa-num">S{i + 1}</span>
          <input className="inp" value={e} onChange={(ev) => set(i, ev.target.value)} placeholder={`O que se aprende na semana ${i + 1}`} />
          <button className="ementa-del" onClick={() => del(i)}>✕</button>
        </div>
      ))}
      <button className="btn-ghost-add" onClick={add}>+ Adicionar semana</button>
    </div>
  )
}

function Editor({ item, onSave, onCancel }: { item: Item; onSave: (d: Item) => void; onCancel: () => void }) {
  const [d, setD] = useState<Item>({ ...item })
  const [mode, setMode] = useState<'card' | 'pagina' | 'banner'>('card')
  const set = <K extends keyof Item>(k: K, v: Item[K]) => setD((prev) => ({ ...prev, [k]: v }))
  const accent = accentFor(d)
  const accentName = ACCENT_NAME[accent] ?? ''
  const dv = { ...d, accent }
  const m = d as Material
  const c = d as Curso
  const men = d as Mentoria
  const ev = d as Evento
  const setFamily = (fam: string) => setD((prev) => ({ ...prev, family: fam, shelf: (SHELVES[fam] ?? [])[0] ?? (prev as Material).shelf } as Item))
  const isNew = !item.id

  return (
    <div className="editor">
      <div className="ed-form">
        <div className="ed-formhead">
          <div className="ed-eyebrow" style={{ color: accent }}>◆ {d.type.toUpperCase()}</div>
          <input className="ed-titleinput" value={d.title} placeholder="Título do item"
            onChange={(e) => set('title', e.target.value as never)} />
        </div>
        <Field label="Descrição curta" hint="Uma linha. Aparece no card e no topo da página.">
          <textarea className="inp ta" value={d.desc} onChange={(e) => set('desc', e.target.value as never)} />
        </Field>

        {d.type === 'material' && <>
          <div className="ed-2col">
            <Field label="Família">
              <select className="inp" value={m.family} onChange={(e) => setFamily(e.target.value)}>
                <option>Para ministrar</option><option>Para liderar</option>
              </select>
            </Field>
            <Field label="Estante" hint="Define a cor do card (travada).">
              <select className="inp" value={m.shelf} onChange={(e) => set('shelf' as never, e.target.value as never)}>
                {(SHELVES[m.family] ?? [m.shelf]).map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          <div className="ed-3col">
            <Field label="Código"><input className="inp" value={m.code} onChange={(e) => set('code' as never, e.target.value as never)} /></Field>
            <Field label="Mensagens"><input className="inp" type="number" value={m.messages ?? ''} onChange={(e) => set('messages' as never, (e.target.value ? +e.target.value : null) as never)} /></Field>
            <Field label="Páginas"><input className="inp" type="number" value={m.pages} onChange={(e) => set('pages' as never, +e.target.value as never)} /></Field>
          </div>
          <div className="ed-2col">
            <Field label="Preço (R$)" req><input className="inp" type="number" value={m.price} onChange={(e) => set('price' as never, +e.target.value as never)} /></Field>
            <Field label="Status">
              <select className="inp" value={d.status} onChange={(e) => set('status', e.target.value as never)}>
                <option>Publicado</option><option>Rascunho</option>
              </select>
            </Field>
          </div>
          <Field label="Link da Hotmart" req hint="Botão COMPRAR da página de detalhe.">
            <input className="inp" value={m.hotmart} onChange={(e) => set('hotmart' as never, e.target.value as never)} placeholder="https://pay.hotmart.com/..." />
          </Field>
          <Field label="Modelo do card / banner" hint="Muda o layout na prévia.">
            <ModelField value={m.model ?? 'A'} accent={accent} onChange={(v) => set('model' as never, v as never)} />
          </Field>
          {m.messages != null && m.messages > 0 && (
            <Field label={`Detalhe das ${m.messages} mensagens`}>
              <MessageListField count={m.messages} value={m.messageList ?? []} accent={accent} onChange={(v) => set('messageList' as never, v as never)} />
            </Field>
          )}
          <Field label="Pra quem é" hint="Uma frase que nomeia a dor.">
            <textarea className="inp ta" value={m.paraQuem ?? ''} onChange={(e) => set('paraQuem' as never, e.target.value as never)} placeholder="Pra líder que..." />
          </Field>
          <Field label="O que vem dentro">
            <ListField value={m.beneficios ?? []} onChange={(v) => set('beneficios' as never, v as never)} placeholder="Um benefício do material" />
          </Field>
          <Field label="Depoimento">
            <DepoimentoField value={m.depoimento} onChange={(v) => set('depoimento' as never, v as never)} />
          </Field>
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
            <Field label="de (total)"><input className="inp" type="number" value={c.totalEtapas} onChange={(e) => set('totalEtapas' as never, +e.target.value as never)} /></Field>
            <Field label="Semanas"><input className="inp" type="number" value={c.weeks} onChange={(e) => set('weeks' as never, +e.target.value as never)} /></Field>
          </div>
          <Field label="Mentor / condutor"><input className="inp" value={c.mentor} onChange={(e) => set('mentor' as never, e.target.value as never)} /></Field>
          <Field label="Próxima turma"><input className="inp" value={c.proximaTurma} onChange={(e) => set('proximaTurma' as never, e.target.value as never)} /></Field>
          <Field label="Ementa por semana"><EmentaField value={c.ementa} onChange={(v) => set('ementa' as never, v as never)} /></Field>
          <Field label="Pra quem é">
            <textarea className="inp ta" value={c.paraQuem ?? ''} onChange={(e) => set('paraQuem' as never, e.target.value as never)} placeholder="Pra líder que..." />
          </Field>
          <Field label="Depoimento">
            <DepoimentoField value={c.depoimento} onChange={(v) => set('depoimento' as never, v as never)} />
          </Field>
          <div className="fld">
            <label className="fld-label">Selo AO VIVO</label>
            <div className={`tgl${c.aoVivo ? ' on' : ''}`} onClick={() => set('aoVivo' as never, !c.aoVivo as never)} />
          </div>
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
          <Field label="Link de inscrição (Hotmart)">
            <input className="inp" value={ev.hotmart ?? ''} onChange={(e) => set('hotmart' as never, e.target.value as never)} placeholder="https://pay.hotmart.com/..." />
          </Field>
        </>}

        <Field label="Cor de acento" hint="Travada: cada estante / nível tem sua cor.">
          <AccentLock value={accent} name={accentName} />
        </Field>
        <Field label="Imagem de capa">
          <ImageField value={d.image} onChange={(v) => set('image', v as never)} />
        </Field>

        <div className="ed-actions">
          <button className="btn-pri" onClick={() => onSave(dv)}>{isNew ? 'Criar item' : 'Salvar alterações'}</button>
          <button className="btn-sec" onClick={onCancel}>Cancelar</button>
        </div>
      </div>

      <div className="ed-preview">
        <div className="ed-prevbar">
          <span className="ed-prevtitle">Prévia ao vivo</span>
          <div className="seg">
            {(['card', 'pagina', 'banner'] as const).map((m) => (
              <button key={m} className={`seg-btn${mode === m ? ' on' : ''}`} onClick={() => setMode(m)}>
                {m === 'card' ? 'Card' : m === 'pagina' ? 'Página' : 'Banner'}
              </button>
            ))}
          </div>
        </div>
        <div className="ed-prevstage">
          {mode === 'card' && <div className="prev-center"><CatalogCardPreview item={dv} /></div>}
          {mode === 'pagina' && <div className="prev-scale"><DetailPreview item={dv} /></div>}
          {mode === 'banner' && <div className="prev-center"><BannerPreview item={dv} /></div>}
        </div>
        {d.status === 'Rascunho' && <div className="ed-draftnote">◆ Em rascunho. Não aparece no site até publicar.</div>}
      </div>
    </div>
  )
}

// ── SHELL ────────────────────────────────────────────────────────────────────

type Route = { screen: 'dashboard' } | { screen: 'list'; type: ItemType } | { screen: 'shelves' }

function Login() {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState(false)
  const [pending, startTransition] = useTransition()

  const submit = () => {
    startTransition(async () => {
      const ok = await loginAction(pw)
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
        <div className="login-logo">CE<span className="ol">.X</span></div>
        <div className="login-eyebrow">◆ PAINEL INTERNO</div>
        <h1 className="login-title">Área restrita</h1>
        <p className="login-sub">Gestão de materiais, cursos, mentorias e eventos. Acesso só por este endereço.</p>
        <input className="login-input" type="password" value={pw} placeholder="Senha de acesso"
          autoFocus onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
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

function ShelfEditor({ estante, onSave, onCancel }: { estante: EstanteAdmin | null; onSave: (e: EstanteAdmin) => void; onCancel: () => void }) {
  const isNew = !estante
  const [form, setForm] = useState<EstanteAdmin>(estante ?? {
    key: `estante-${Date.now()}`, label: '', familia: 'ministrar',
    accent: AC.wheat, faixaEtaria: '', status: 'visible', order: 999,
  })
  const set = <K extends keyof EstanteAdmin>(k: K, v: EstanteAdmin[K]) => setForm(f => ({ ...f, [k]: v }))
  const valid = form.label.trim().length > 0

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
          <button className="btn-pri" onClick={() => valid && onSave(form)} disabled={!valid} style={{ opacity: valid ? 1 : 0.4 }}>
            {isNew ? 'Criar estante' : 'Salvar alterações'}
          </button>
          <button className="btn-sec" onClick={onCancel}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}

function ShelvesView({ estantes, materiais, onSave, onToggle, onDelete, onReorder }:{
  estantes: EstanteAdmin[]
  materiais: Material[]
  onSave: (e: EstanteAdmin) => void
  onToggle: (key: string) => void
  onDelete: (key: string) => void
  onReorder: (orderedKeys: string[]) => void
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
    onReorder(next.map(e => e.key))
    dragKey.current = null
    setDragOver(null)
  }
  const handleDragEnd = () => { dragKey.current = null; setDragOver(null) }

  return (
    <div className="listview">
      {editing === 'new' && (
        <ShelfEditor estante={null} onSave={e => { onSave(e); setEditing(null) }} onCancel={() => setEditing(null)} />
      )}
      {editing && editing !== 'new' && (
        <ShelfEditor estante={editing} onSave={e => { onSave(e); setEditing(null) }} onCancel={() => setEditing(null)} />
      )}
      {toDelete && (
        <div className="modal-bg" onClick={() => setToDelete(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Excluir estante &ldquo;{toDelete.label}&rdquo;?</div>
            <p className="modal-text">Os materiais desta estante não serão excluídos, mas ficarão sem estante atribuída. Esta ação não pode ser desfeita.</p>
            <div className="modal-acts">
              <button className="btn-danger" onClick={() => { onDelete(toDelete.key); setToDelete(null) }}>Excluir estante</button>
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
                <button className="row-btn" onClick={() => onToggle(e.key)}>
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

function Sidebar({ route, go, counts, onLogout }: { route: Route; go: (r: Route) => void; counts: Record<string, number>; onLogout: () => void }) {
  const isOn = (r: Route) => r.screen === route.screen && (r.screen !== 'list' || (route.screen === 'list' && r.type === route.type))
  return (
    <aside className="adm-sb">
      <div>
        <div className="adm-sb-logo">CE<span className="ol">.X</span></div>
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
          <button className={`adm-sb-link${route.screen === 'shelves' ? ' on' : ''}`} onClick={() => go({ screen: 'shelves' })}>
            <span className="adm-sb-ic">◇</span> Estantes
            <span className="adm-sb-count">{counts.estante}</span>
          </button>
        </nav>
      </div>
      <div className="adm-sb-bottom">
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
  return (
    <div className="row">
      <div className="row-chip" style={{ background: item.image ? `url(${item.image}) center/cover` : 'var(--ink)' }}>
        {!item.image && <span style={{ color: item.accent }}>X</span>}
      </div>
      <div className="row-main">
        <div className="row-title">{item.title || <em className="row-untitled">Sem título</em>}</div>
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

function ListView({ type, items, onNew, onEdit, onDelete }: { type: ItemType; items: Item[]; onNew: () => void; onEdit: (i: Item) => void; onDelete: (i: Item) => void }) {
  const meta = TYPES.find((t) => t.key === type)!
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('Todos')
  const filters = type === 'material' ? ['Todos', 'Para ministrar', 'Para liderar']
    : type === 'curso' ? ['Todos', 'Fundação', 'Liderança', 'Multiplicação']
    : ['Todos', 'Publicado', 'Rascunho']
  const shown = items.filter((it) => {
    const okQ = !q || (it.title ?? '').toLowerCase().includes(q.toLowerCase())
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

// ── MAIN ─────────────────────────────────────────────────────────────────────

type InitialData = { estantes: EstanteAdmin[]; materiais: Material[]; cursos: Curso[]; mentorias: Mentoria[] } | null

export default function AdminClient({ initialAuthed, initialData }: { initialAuthed: boolean; initialData: InitialData }) {
  const [authed, setAuthed] = useState(initialAuthed)
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
      const materiais: Material[] = (initialData.materiais as unknown as Record<string, unknown>[]).map((m) => ({
        id: m.id as string, type: 'material' as const,
        family: m.familia === 'ministrar' ? 'Para ministrar' : 'Para liderar',
        shelf: estantes.find(e => e.key === m.estante)?.label ?? (m.estante as string),
        code: (m.code as string) ?? '', title: m.titulo as string, desc: m.promessa as string,
        messages: (m.mensagens as number | null) ?? null, pages: (m.paginas as number) ?? 0,
        format: ((m.formatos as string[]) ?? []).join(', '),
        price: parseInt(((m.preco as string) ?? '0').replace(/\D/g, ''), 10),
        hotmart: (m.hotmart_url as string) ?? '', accent: accentFor({ type: 'material', family: m.familia === 'ministrar' ? 'Para ministrar' : 'Para liderar', shelf: estantes.find(e => e.key === m.estante)?.label ?? '' } as Material),
        image: null, model: (m.model as Modelo) ?? 'A',
        big: m.big ? parseInt(m.big as string, 10) : null,
        bigLabel: (m.big_label as string) ?? '',
        messageList: ((m.conteudo as string[]) ?? []).map(c => ({ nome: c, desc: '' })),
        paraQuem: (m.pra_quem as string) ?? '',
        beneficios: ['Editável e pronto pra aplicar', 'White-label: coloque a marca do seu ministério'],
        depoimento: { texto: '', autor: '' },
        status: (m.status as string) ?? 'Publicado',
        views: 0, buyClicks: 0,
      }))
      const NIVEL_LABEL: Record<string, string> = { fundacao: 'Fundação', lideranca: 'Liderança', multiplicacao: 'Multiplicação' }
      const NIVEL_AC: Record<string, string> = { fundacao: AC.wheat, lideranca: AC.clay, multiplicacao: AC.olive }
      const cursos: Curso[] = (initialData.cursos as unknown as Record<string, unknown>[]).map((c) => ({
        id: c.slug as string, type: 'curso' as const,
        level: NIVEL_LABEL[c.nivel as string] ?? (c.nivel as string),
        etapa: parseInt(c.num as string, 10), totalEtapas: 6,
        title: c.title as string, desc: c.desc_text as string,
        weeks: ((c.ementa as unknown[]) ?? []).length,
        mentoria: true, aoVivo: true, mentor: (c.mentor as string) ?? '',
        accent: NIVEL_AC[c.nivel as string] ?? AC.olive,
        image: null, status: (c.status as string) ?? 'Publicado',
        views: 0, waitlist: 0,
        paraQuem: (c.pra_quem as string) ?? '',
        depoimento: { texto: ((c.depoimento as Record<string,string>)?.texto) ?? '', autor: ((c.depoimento as Record<string,string>)?.autor) ?? '' },
        ementa: ((c.ementa as {titulo:string}[]) ?? []).map(e => e.titulo),
        proximaTurma: (c.turma as string) ?? '',
      }))
      const mentorias: Mentoria[] = (initialData.mentorias as unknown as Record<string, unknown>[]).map((m) => ({
        id: m.id as string, type: 'mentoria' as const,
        title: m.title as string, desc: (m.desc_text as string) ?? '',
        formato: (m.formato as string) ?? '', vagas: (m.vagas as number) ?? 0,
        mentor: (m.mentor as string) ?? '', accent: (m.accent as string) ?? AC.olive,
        image: null, status: (m.status as string) ?? 'Publicado',
        views: 0, waitlist: (m.waitlist as number) ?? 0,
        cadencia: (m.cadencia as string) ?? '',
      }))
      const series30 = Array(30).fill(0)
      return {
        materiais, cursos, mentorias, eventos: [], estantes,
        metrics: { series30, kpis: { visitas:0,visitasDelta:0,cliquesComprar:0,cliquesDelta:0,listaEspera:0,listaDelta:0,capturas:0,capturasDelta:0 }, funil:[{label:'Visitas ao site',value:0},{label:'Abriu um material',value:0},{label:'Clicou em comprar',value:0},{label:'Compra concluída',value:0}], origem:[{label:'Instagram',value:0,color:AC.olive},{label:'Direto',value:0,color:AC.wheat},{label:'Google',value:0,color:AC.clay},{label:'YouTube',value:0,color:AC.oliveDeep}] },
      }
    }
    return buildData()
  })
  const [route, setRoute] = useState<Route>({ screen: 'dashboard' })
  const [editing, setEditing] = useState<Item | null>(null)
  const [confirm, setConfirm] = useState<Item | null>(null)
  const [, startTransition] = useTransition()

  if (!authed) return <Login />

  const arrKey = (type: ItemType) => TYPES.find((t) => t.key === type)!.arr
  const counts = {
    material: data.materiais.length, curso: data.cursos.length,
    mentoria: data.mentorias.length, evento: data.eventos.length,
    estante: data.estantes.length,
  }

  const go = (r: Route) => { setEditing(null); setRoute(r) }

  const save = (d: Item) => {
    const key = arrKey(d.type)
    // Optimistic update
    setData((prev) => {
      const arr = prev[key] as Item[]
      if (d.id) return { ...prev, [key]: arr.map((x) => (x.id === d.id ? d : x)) }
      const withId = { ...d, id: `${d.type}-${Date.now()}` }
      return { ...prev, [key]: [withId, ...arr] }
    })
    setEditing(null)
    // Persist to Supabase
    startTransition(async () => {
      try {
        if (d.type === 'material') {
          const m = d as Material
          await upsertMaterial({
            id: m.id, familia: m.family === 'Para ministrar' ? 'ministrar' : 'liderar',
            estante: Object.entries(ESTANTE_MAP).find(([,v]) => v.label === m.shelf)?.[0] ?? m.shelf,
            model: m.model, etiqueta: m.shelf, titulo: m.title, code: m.code || null,
            big: m.big ? String(m.big) : null, big_label: m.bigLabel || null,
            promessa: m.desc, mensagens: m.messages, paginas: m.pages,
            formatos: m.format.split(', ').filter(Boolean),
            preco: `R$ ${m.price}`, hotmart_url: m.hotmart,
            colecoes: [], pra_quem: m.paraQuem,
            conteudo: m.messageList.map(x => x.nome),
            como_usar: '', faq: [], status: m.status,
          })
        } else if (d.type === 'curso') {
          const c = d as Curso
          const NIVEL_KEY: Record<string,string> = { 'Fundação':'fundacao','Liderança':'lideranca','Multiplicação':'multiplicacao' }
          await upsertCurso({
            slug: c.id, num: String(c.etapa).padStart(2,'0'),
            nivel: NIVEL_KEY[c.level] ?? 'fundacao',
            title: c.title, desc_text: c.desc, dur: `${c.weeks} semanas`,
            promessa: c.desc, pra_quem: c.paraQuem,
            ementa: c.ementa.map((t,i) => ({ semana: i+1, titulo: t, desc: '' })),
            formato: '', mentor: c.mentor, mentor_bio: '',
            depoimento: c.depoimento, turma: c.proximaTurma, status: c.status,
          })
        } else if (d.type === 'mentoria') {
          const men = d as Mentoria
          await upsertMentoria({
            id: men.id || `mentoria-${Date.now()}`,
            title: men.title, desc_text: men.desc, formato: men.formato,
            vagas: men.vagas, mentor: men.mentor, accent: men.accent,
            cadencia: men.cadencia, status: men.status, waitlist: men.waitlist,
          })
        }
      } catch (err) { console.error('Erro ao salvar:', err) }
    })
  }

  const doDelete = (it: Item) => {
    const key = arrKey(it.type)
    setData((prev) => ({ ...prev, [key]: (prev[key] as Item[]).filter((x) => x.id !== it.id) }))
    setConfirm(null)
    startTransition(async () => {
      try {
        if (it.type === 'material') await deleteMaterial(it.id)
        else if (it.type === 'curso') await deleteCurso(it.id)
        else if (it.type === 'mentoria') await deleteMentoria(it.id)
      } catch (err) { console.error('Erro ao excluir:', err) }
    })
  }

  const saveShelf = (e: EstanteAdmin) => {
    setData(prev => {
      const exists = prev.estantes.find(x => x.key === e.key)
      if (exists) return { ...prev, estantes: prev.estantes.map(x => x.key === e.key ? e : x) }
      const maxOrder = Math.max(-1, ...prev.estantes.map(x => x.order))
      return { ...prev, estantes: [...prev.estantes, { ...e, order: maxOrder + 1 }] }
    })
    startTransition(async () => {
      try {
        await upsertEstante({ key: e.key, label: e.label, familia: e.familia, accent: e.accent, faixa_etaria: e.faixaEtaria, status: e.status, ord: e.order })
      } catch (err) { console.error('Erro ao salvar estante:', err) }
    })
  }

  const toggleShelf = (key: string) => {
    setData(prev => {
      const updated = prev.estantes.map(e => e.key === key ? { ...e, status: (e.status === 'visible' ? 'hidden' : 'visible') as 'visible'|'hidden' } : e)
      const shelf = updated.find(e => e.key === key)!
      startTransition(async () => {
        try { await upsertEstante({ key: shelf.key, label: shelf.label, familia: shelf.familia, accent: shelf.accent, faixa_etaria: shelf.faixaEtaria, status: shelf.status, ord: shelf.order }) }
        catch (err) { console.error('Erro ao ocultar estante:', err) }
      })
      return { ...prev, estantes: updated }
    })
  }

  const deleteShelf = (key: string) => {
    setData(prev => ({
      ...prev,
      estantes: prev.estantes.filter(e => e.key !== key).map((e, i) => ({ ...e, order: i })),
    }))
    startTransition(async () => {
      try { await deleteEstante(key) } catch (err) { console.error('Erro ao excluir estante:', err) }
    })
  }

  const reorderShelves = (orderedKeys: string[]) => {
    setData(prev => {
      const map = Object.fromEntries(prev.estantes.map(e => [e.key, e]))
      const reordered = orderedKeys.map((key, i) => ({ ...map[key], order: i }))
      startTransition(async () => {
        try { await reorderEstantes(orderedKeys) }
        catch (err) { console.error('Erro ao reordenar:', err) }
      })
      return { ...prev, estantes: reordered }
    })
  }

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction()
      setAuthed(false)
    })
  }

  const currentType = route.screen === 'list' ? route.type : 'material'
  const pageTitle = editing
    ? (editing.id ? 'Editar item' : 'Novo item')
    : route.screen === 'dashboard' ? 'Painel de métricas'
    : route.screen === 'shelves' ? 'Estantes'
    : TYPES.find((t) => t.key === currentType)!.plural

  return (
    <div className="adm">
      <Sidebar route={route} go={go} counts={counts} onLogout={handleLogout} />
      <main className="adm-main">
        <header className="adm-top">
          <div>
            <div className="adm-top-crumb">CE.X · PAINEL{editing ? ' · ' + TYPES.find((t) => t.key === editing.type)!.plural.toUpperCase() : ''}</div>
            <h1 className="adm-top-title">{pageTitle}</h1>
          </div>
          {editing && <button className="btn-sec" onClick={() => setEditing(null)}>← Voltar à lista</button>}
        </header>
        <div className="adm-content">
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
          ) : (
            <ListView type={currentType} items={data[arrKey(currentType)] as Item[]}
              onNew={() => setEditing(newItem(currentType))}
              onEdit={setEditing}
              onDelete={(it) => setConfirm(it)} />
          )}
        </div>
      </main>
      {confirm && <Confirm item={confirm} onYes={() => doDelete(confirm)} onNo={() => setConfirm(null)} />}
    </div>
  )
}
