'use server'
import { cookies, headers } from 'next/headers'
import { createHash, randomBytes, timingSafeEqual, pbkdf2Sync } from 'crypto'
import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '../../lib/supabase'
import type { DbMetricEvent } from '../../lib/types'
import { ensureMaterialTranslations } from '../../lib/material-translation-service'

export type AdminRole = 'master' | 'admin'
export type AdminSession = {
  id: string
  username: string
  name: string
  role: AdminRole
  isMaster: boolean
}
export type AdminUser = {
  id: string
  username: string
  name: string
  role: AdminRole
  active: boolean
  created_at?: string
  hasPassword: boolean
}
export type StudioTemplate = {
  id: string
  module: 'documentos' | 'slides' | 'design'
  name: string
  description: string
  status: 'Ativo' | 'Rascunho'
  payload: Record<string, unknown>
  created_by?: string | null
  created_by_username?: string | null
  created_at?: string
}
export type AdminMetrics = {
  series30: number[]
  kpis: {
    visitas: number
    visitasDelta: number
    cliquesComprar: number
    cliquesDelta: number
    listaEspera: number
    listaDelta: number
    capturas: number
    capturasDelta: number
  }
  funil: { label: string; value: number }[]
  origem: { label: string; value: number; color: string }[]
  materialViews: Record<string, number>
  materialBuyClicks: Record<string, number>
  materialPurchases: Record<string, number>
  cursoViews: Record<string, number>
  cursoWaitlist: Record<string, number>
}

const MASTER_USERNAME = 'jonatas_machado'
const MASTER_PASSWORD = 'limaza022216.'

const sessionToken = (id: string, username: string, hash: string) =>
  createHash('sha256').update(`${id}:${username}:${hash}`).digest('hex')

const hashPassword = (password: string, salt = randomBytes(16).toString('hex')) => ({
  salt,
  hash: pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex'),
})

const verifyPassword = (password: string, salt: string, expected: string) => {
  const actual = hashPassword(password, salt).hash
  try {
    return timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'))
  } catch {
    return false
  }
}

async function ensureMasterAdmin() {
  const db = supabaseAdmin()
  const { data, error } = await db
    .from('admin_users')
    .select('id, username')
    .eq('username', MASTER_USERNAME)
    .maybeSingle()
  if (error) throw error
  if (data) return

  const pw = hashPassword(MASTER_PASSWORD)
  const { error: insertError } = await db.from('admin_users').insert({
    username: MASTER_USERNAME,
    name: 'Jonatas Machado',
    role: 'master',
    active: true,
    password_salt: pw.salt,
    password_hash: pw.hash,
  })
  if (insertError) throw insertError
}

async function getAdminByUsername(username: string) {
  await ensureMasterAdmin()
  const { data, error } = await supabaseAdmin()
    .from('admin_users')
    .select('id, username, name, role, active, password_salt, password_hash')
    .eq('username', username.trim().toLowerCase())
    .maybeSingle()
  if (error) throw error
  return data as (Omit<AdminUser, 'hasPassword'> & { password_salt: string | null; password_hash: string | null }) | null
}

async function requireAdmin(): Promise<AdminSession> {
  const session = await checkAuth()
  if (!session) throw new Error('Acesso administrativo expirado.')
  return session
}

async function requireMaster(): Promise<AdminSession> {
  const session = await requireAdmin()
  if (!session.isMaster) throw new Error('Somente o administrador master pode executar esta ação.')
  return session
}

async function canEditOwned(table: string, idColumn: string, id: string, admin: AdminSession) {
  if (admin.isMaster || !id) return true
  const { data, error } = await supabaseAdmin()
    .from(table)
    .select('created_by')
    .eq(idColumn, id)
    .maybeSingle()
  if (error) throw error
  return !data || (data as { created_by?: string | null }).created_by === admin.id
}

async function confirmRowExists(table: string, column: string, value: string, message: string) {
  const { data, error } = await supabaseAdmin()
    .from(table)
    .select(column)
    .eq(column, value)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error(message)
}

async function confirmRowDeleted(table: string, column: string, value: string, message: string) {
  const { data, error } = await supabaseAdmin()
    .from(table)
    .select(column)
    .eq(column, value)
    .maybeSingle()
  if (error) throw error
  if (data) throw new Error(message)
}

function emptyAdminMetrics(): AdminMetrics {
  return {
    series30: Array(30).fill(0),
    kpis: { visitas: 0, visitasDelta: 0, cliquesComprar: 0, cliquesDelta: 0, listaEspera: 0, listaDelta: 0, capturas: 0, capturasDelta: 0 },
    funil: [
      { label: 'Visitas ao site', value: 0 },
      { label: 'Abriu um material', value: 0 },
      { label: 'Clicou em comprar', value: 0 },
      { label: 'Compra concluída', value: 0 },
    ],
    origem: [
      { label: 'Instagram', value: 0, color: '#7A9E3F' },
      { label: 'Direto', value: 0, color: '#CBA95C' },
      { label: 'Google', value: 0, color: '#C5805A' },
      { label: 'YouTube', value: 0, color: '#4F6B26' },
    ],
    materialViews: {},
    materialBuyClicks: {},
    materialPurchases: {},
    cursoViews: {},
    cursoWaitlist: {},
  }
}

function deltaPercent(current: number, previous: number) {
  if (!previous) return current ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

function dateDaysAgo(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function sourceLabel(source: string | null | undefined) {
  const value = (source ?? 'direto').toLowerCase()
  if (value.includes('instagram') || value === 'ig') return 'Instagram'
  if (value.includes('google')) return 'Google'
  if (value.includes('youtube') || value.includes('youtu')) return 'YouTube'
  if (value === 'direto' || value === 'direct') return 'Direto'
  return 'Outros'
}

function metricEventInWindow(event: Pick<DbMetricEvent, 'created_at'>, start: Date, end: Date) {
  const createdAt = event.created_at ? new Date(event.created_at) : null
  return Boolean(createdAt && createdAt >= start && createdAt < end)
}

function countByTarget(
  events: Pick<DbMetricEvent, 'event_name' | 'created_at' | 'material_id' | 'curso_slug'>[],
  eventName: string,
  start: Date,
  end: Date,
  target: 'material_id' | 'curso_slug'
) {
  return events
    .filter((event) => event.event_name === eventName && metricEventInWindow(event, start, end))
    .reduce<Record<string, number>>((acc, event) => {
      const id = event[target]
      if (!id) return acc
      acc[id] = (acc[id] ?? 0) + 1
      return acc
    }, {})
}

function countComprasByMaterial(
  compras: { material_id: string | null; purchased_at: string | null }[],
  start: Date,
  end: Date
) {
  return compras.reduce<Record<string, number>>((acc, compra) => {
    const purchasedAt = compra.purchased_at ? new Date(compra.purchased_at) : null
    if (!compra.material_id || !purchasedAt || purchasedAt < start || purchasedAt >= end) return acc
    acc[compra.material_id] = (acc[compra.material_id] ?? 0) + 1
    return acc
  }, {})
}

export async function loginAction(username: string, pw: string): Promise<boolean> {
  const admin = await getAdminByUsername(username)
  if (!admin || !admin.active) return false
  if (!admin.password_salt || !admin.password_hash) return false // conta ainda pendente de configuração (convite não usado)
  if (!verifyPassword(pw, admin.password_salt, admin.password_hash)) return false
  ;(await cookies()).set('adm', sessionToken(admin.id, admin.username, admin.password_hash), {
    httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === 'production', path: '/',
  })
  ;(await cookies()).set('adm_uid', admin.id, {
    httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === 'production', path: '/',
  })
  return true
}

export async function logoutAction(): Promise<void> {
  ;(await cookies()).delete('adm')
  ;(await cookies()).delete('adm_uid')
}

export async function checkAuth(): Promise<AdminSession | null> {
  await ensureMasterAdmin()
  const cookieStore = await cookies()
  const uid = cookieStore.get('adm_uid')?.value
  const c = cookieStore.get('adm')?.value
  if (!uid || !c) return null
  const { data, error } = await supabaseAdmin()
    .from('admin_users')
    .select('id, username, name, role, active, password_hash')
    .eq('id', uid)
    .maybeSingle()
  if (error || !data || !data.active) return null
  const expected = sessionToken(data.id, data.username, data.password_hash)
  if (c !== expected) return null
  return {
    id: data.id,
    username: data.username,
    name: data.name,
    role: data.role as AdminRole,
    isMaster: data.role === 'master',
  }
}

// ── MÉTRICAS ────────────────────────────────────────────────────────────────

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const admin = await requireAdmin()
  const empty = emptyAdminMetrics()
  const now = new Date()
  const currentStart = dateDaysAgo(30)
  const previousStart = dateDaysAgo(60)

  try {
    const db = supabaseAdmin()
    const [{ data: eventsData, error: eventsError }, { data: comprasData, error: comprasError }] = await Promise.all([
      db
        .from('metric_events')
        .select('event_name, created_at, traffic_source, material_id, curso_slug')
        .gte('created_at', previousStart.toISOString())
        .lt('created_at', now.toISOString()),
      db
        .from('compras')
        .select('material_id, status, purchased_at')
        .gte('purchased_at', previousStart.toISOString())
        .lt('purchased_at', now.toISOString()),
    ])

    if (eventsError) throw eventsError
    if (comprasError) throw comprasError

    let ownedMaterialIds: string[] | null = null
    let ownedCursoSlugs: string[] | null = null

    if (!admin.isMaster) {
      const [{ data: ownedMaterials, error: materialsError }, { data: ownedCursos, error: cursosError }] = await Promise.all([
        db.from('materiais').select('id').eq('created_by', admin.id),
        db.from('cursos').select('slug').eq('created_by', admin.id),
      ])
      if (materialsError) throw materialsError
      if (cursosError) throw cursosError
      ownedMaterialIds = (ownedMaterials ?? []).map((row) => String(row.id))
      ownedCursoSlugs = (ownedCursos ?? []).map((row) => String(row.slug))
    }

    const events = ((eventsData ?? []) as Pick<DbMetricEvent, 'event_name' | 'created_at' | 'traffic_source' | 'material_id' | 'curso_slug'>[])
      .filter((event) => {
        if (admin.isMaster) return true
        return Boolean(
          (event.material_id && ownedMaterialIds?.includes(event.material_id)) ||
          (event.curso_slug && ownedCursoSlugs?.includes(event.curso_slug))
        )
      })

    const compras = ((comprasData ?? []) as { material_id: string | null; status: string | null; purchased_at: string | null }[])
      .filter((compra) => {
        if (compra.status !== 'Liberado') return false
        if (admin.isMaster) return true
        return Boolean(compra.material_id && ownedMaterialIds?.includes(compra.material_id))
      })

    const countEvents = (name: string, start: Date, end: Date) =>
      events.filter((event) => event.event_name === name && metricEventInWindow(event, start, end)).length

    const countCompras = (start: Date, end: Date) =>
      compras.filter((compra) => {
        const purchasedAt = compra.purchased_at ? new Date(compra.purchased_at) : null
        return purchasedAt && purchasedAt >= start && purchasedAt < end
      }).length

    const visitas = countEvents('page_view', currentStart, now)
    const visitasPrev = countEvents('page_view', previousStart, currentStart)
    const cliquesComprar = countEvents('buy_click', currentStart, now)
    const cliquesComprarPrev = countEvents('buy_click', previousStart, currentStart)
    const listaEspera = countEvents('waitlist_click', currentStart, now)
    const listaEsperaPrev = countEvents('waitlist_click', previousStart, currentStart)
    const capturas = countEvents('lead_capture', currentStart, now)
    const capturasPrev = countEvents('lead_capture', previousStart, currentStart)
    const materiaisAbertos = countEvents('material_view', currentStart, now)
    const comprasConcluidas = countCompras(currentStart, now)

    const days = Array.from({ length: 30 }, (_, index) => {
      const date = new Date()
      date.setHours(0, 0, 0, 0)
      date.setDate(date.getDate() - (29 - index))
      return dayKey(date)
    })
    const series30 = days.map((key) =>
      events.filter((event) => event.event_name === 'page_view' && event.created_at?.slice(0, 10) === key).length
    )

    const sourceCounts = events
      .filter((event) => event.event_name === 'page_view' && metricEventInWindow(event, currentStart, now))
      .reduce<Record<string, number>>((acc, event) => {
        const label = sourceLabel(event.traffic_source)
        acc[label] = (acc[label] ?? 0) + 1
        return acc
      }, {})
    const sourceTotal = Object.values(sourceCounts).reduce((sum, value) => sum + value, 0)

    const origem = [
      { label: 'Instagram', color: '#7A9E3F' },
      { label: 'Direto', color: '#CBA95C' },
      { label: 'Google', color: '#C5805A' },
      { label: 'YouTube', color: '#4F6B26' },
      { label: 'Outros', color: '#B5694A' },
    ].map((row) => ({ ...row, value: sourceTotal ? Math.round(((sourceCounts[row.label] ?? 0) / sourceTotal) * 100) : 0 }))

    return {
      series30,
      kpis: {
        visitas,
        visitasDelta: deltaPercent(visitas, visitasPrev),
        cliquesComprar,
        cliquesDelta: deltaPercent(cliquesComprar, cliquesComprarPrev),
        listaEspera,
        listaDelta: deltaPercent(listaEspera, listaEsperaPrev),
        capturas,
        capturasDelta: deltaPercent(capturas, capturasPrev),
      },
      funil: [
        { label: 'Visitas ao site', value: visitas },
        { label: 'Abriu um material', value: materiaisAbertos },
        { label: 'Clicou em comprar', value: cliquesComprar },
        { label: 'Compra concluída', value: comprasConcluidas },
      ],
      origem,
      materialViews: countByTarget(events, 'material_view', currentStart, now, 'material_id'),
      materialBuyClicks: countByTarget(events, 'buy_click', currentStart, now, 'material_id'),
      materialPurchases: countComprasByMaterial(compras, currentStart, now),
      cursoViews: countByTarget(events, 'curso_view', currentStart, now, 'curso_slug'),
      cursoWaitlist: countByTarget(events, 'waitlist_click', currentStart, now, 'curso_slug'),
    }
  } catch (error) {
    console.error('Erro ao buscar métricas do admin', error)
    return empty
  }
}

// ── ADMIN USERS ──────────────────────────────────────────────────────────────

export async function getAdminUsers() {
  await requireMaster()
  const { data, error } = await supabaseAdmin()
    .from('admin_users')
    .select('id, username, name, role, active, created_at, password_hash')
    .order('created_at')
  if (error) throw error
  return (data ?? []).map((row) => {
    const { password_hash, ...rest } = row as { password_hash: string | null } & Omit<AdminUser, 'hasPassword'>
    return { ...rest, hasPassword: Boolean(password_hash) } as AdminUser
  })
}

async function siteBaseUrl() {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

function generateSetupToken() {
  const token = randomBytes(32).toString('hex')
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
  return { token, tokenHash, expiresAt }
}

// Cria o acesso SEM senha e devolve um link de configuração de uso único
// (válido por 48h). O master compartilha o link por fora; quem escolhe a
// senha é o próprio convidado, na página /admin/convite/[token].
export async function createAdminInvite(input: { username: string; name: string; role: AdminRole }) {
  const master = await requireMaster()
  const username = input.username.trim().toLowerCase()
  if (!username) throw new Error('Usuário é obrigatório.')
  const { token, tokenHash, expiresAt } = generateSetupToken()
  const { data, error } = await supabaseAdmin().from('admin_users').insert({
    username,
    name: input.name.trim() || username,
    role: input.role,
    active: true,
    password_salt: null,
    password_hash: null,
    setup_token_hash: tokenHash,
    setup_token_expires_at: expiresAt,
    created_by: master.id,
    created_by_username: master.username,
  }).select('id').single()
  if (error) throw error
  if (!data?.id) throw new Error('O acesso não foi confirmado no banco.')
  revalidatePath('/admin')
  return { setupUrl: `${await siteBaseUrl()}/admin/convite/${token}` }
}

// Gera um novo link de configuração pra um acesso já existente (onboarding
// que não foi concluído, ou reset de senha sem o master ficar sabendo a nova).
export async function regenerateAdminInvite(id: string) {
  await requireMaster()
  const { token, tokenHash, expiresAt } = generateSetupToken()
  const { error } = await supabaseAdmin().from('admin_users').update({
    setup_token_hash: tokenHash,
    setup_token_expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  }).eq('id', id)
  if (error) throw error
  await confirmRowExists('admin_users', 'id', id, 'O acesso não foi confirmado no banco.')
  revalidatePath('/admin')
  return { setupUrl: `${await siteBaseUrl()}/admin/convite/${token}` }
}

// ── sem autenticação: usadas pela página pública /admin/convite/[token] ──────

export async function getAdminInviteInfo(token: string): Promise<{ name: string; username: string } | null> {
  if (!token) return null
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const { data, error } = await supabaseAdmin()
    .from('admin_users')
    .select('name, username, setup_token_expires_at')
    .eq('setup_token_hash', tokenHash)
    .maybeSingle()
  if (error || !data) return null
  if (!data.setup_token_expires_at || new Date(data.setup_token_expires_at) < new Date()) return null
  return { name: data.name, username: data.username }
}

export async function completeAdminSetup(token: string, password: string): Promise<boolean> {
  if (!token || !password || password.length < 8) return false
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const { data, error } = await supabaseAdmin()
    .from('admin_users')
    .select('id, username, setup_token_expires_at, active')
    .eq('setup_token_hash', tokenHash)
    .maybeSingle()
  if (error || !data || !data.active) return false
  if (!data.setup_token_expires_at || new Date(data.setup_token_expires_at) < new Date()) return false

  const pw = hashPassword(password)
  const { error: updateError } = await supabaseAdmin().from('admin_users').update({
    password_salt: pw.salt,
    password_hash: pw.hash,
    setup_token_hash: null,
    setup_token_expires_at: null,
    updated_at: new Date().toISOString(),
  }).eq('id', data.id)
  if (updateError) return false

  ;(await cookies()).set('adm', sessionToken(data.id, data.username, pw.hash), {
    httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === 'production', path: '/',
  })
  ;(await cookies()).set('adm_uid', data.id, {
    httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === 'production', path: '/',
  })
  return true
}

export async function updateAdminUser(input: { id: string; name: string; role: AdminRole; active: boolean; password?: string }) {
  await requireMaster()
  const current = await requireAdmin()
  if (input.id === current.id && input.role !== 'master') throw new Error('O master não pode retirar seus próprios poderes.')
  const patch: Record<string, unknown> = {
    name: input.name.trim(),
    role: input.role,
    active: input.id === current.id ? true : input.active,
    updated_at: new Date().toISOString(),
  }
  if (input.password?.trim()) {
    const pw = hashPassword(input.password.trim())
    patch.password_salt = pw.salt
    patch.password_hash = pw.hash
  }
  const { error } = await supabaseAdmin().from('admin_users').update(patch).eq('id', input.id)
  if (error) throw error
  await confirmRowExists('admin_users', 'id', input.id, 'O acesso não foi confirmado no banco.')
  revalidatePath('/admin')
}

export async function deleteAdminUser(id: string) {
  const current = await requireMaster()
  if (id === current.id) throw new Error('O master não pode excluir seu próprio acesso.')
  const { error } = await supabaseAdmin().from('admin_users').delete().eq('id', id)
  if (error) throw error
  await confirmRowDeleted('admin_users', 'id', id, 'O acesso ainda existe no banco.')
  revalidatePath('/admin')
}

// ── ESTANTES ─────────────────────────────────────────────────────────────────

export async function getEstantes() {
  await requireAdmin()
  const { data, error } = await supabaseAdmin()
    .from('estantes').select('*').order('ord')
  if (error) throw error
  return data
}

export async function upsertEstante(e: {
  key: string; label: string; familia: string
  accent: string; faixa_etaria: string; status: string; ord: number
}) {
  await requireMaster()
  const { error } = await supabaseAdmin().from('estantes').upsert(e, { onConflict: 'key' })
  if (error) throw error
  await confirmRowExists('estantes', 'key', e.key, 'A estante não foi confirmada no banco.')
  revalidatePath('/'); revalidatePath('/materiais'); revalidatePath('/admin')
}

export async function deleteEstante(key: string) {
  await requireMaster()
  const { error } = await supabaseAdmin().from('estantes').delete().eq('key', key)
  if (error) throw error
  await confirmRowDeleted('estantes', 'key', key, 'A estante ainda existe no banco.')
  revalidatePath('/'); revalidatePath('/materiais'); revalidatePath('/admin')
}

export async function reorderEstantes(keys: string[]) {
  await requireMaster()
  const db = supabaseAdmin()
  const results = await Promise.all(keys.map((key, i) =>
    db.from('estantes').update({ ord: i }).eq('key', key)
  ))
  const failed = results.find((result) => result.error)
  if (failed?.error) throw failed.error
  revalidatePath('/'); revalidatePath('/materiais'); revalidatePath('/admin')
}

// ── MATERIAIS ────────────────────────────────────────────────────────────────

export async function getMateriais() {
  const admin = await requireAdmin()
  let query = supabaseAdmin().from('materiais').select('*').order('created_at')
  if (!admin.isMaster) query = query.eq('created_by', admin.id)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function upsertMaterial(m: Record<string, unknown>) {
  const admin = await requireAdmin()
  const id = String(m.id ?? '')
  if (!(await canEditOwned('materiais', 'id', id, admin))) throw new Error('Você só pode editar materiais criados por você.')
  const db = supabaseAdmin()
  const material: Record<string, unknown> = {
    ...m,
    created_by: admin.isMaster && m.created_by ? m.created_by : admin.id,
    created_by_username: admin.isMaster && m.created_by_username ? m.created_by_username : admin.username,
    updated_at: new Date().toISOString(),
  }
  const confirmSaved = async () => {
    const { data, error: confirmError } = await db
      .from('materiais')
      .select('id')
      .eq('id', material.id)
      .maybeSingle()
    if (confirmError) throw confirmError
    if (!data) throw new Error('O material não foi confirmado no banco.')
  }
  const { error } = await db.from('materiais').upsert(material, { onConflict: 'id' })
  if (error && 'contents' in m && error.message.toLowerCase().includes('contents')) {
    const legacyMaterial = { ...material }
    delete legacyMaterial.contents
    const retry = await db.from('materiais').upsert(legacyMaterial, { onConflict: 'id' })
    if (retry.error) throw retry.error
    await confirmSaved()
    await ensureMaterialTranslations(material)
    revalidatePath('/'); revalidatePath('/materiais'); revalidatePath('/admin')
    return
  }
  if (error) throw error
  await confirmSaved()
  await ensureMaterialTranslations(material)
  revalidatePath('/'); revalidatePath('/materiais'); revalidatePath('/admin')
}

export async function deleteMaterial(id: string) {
  const admin = await requireAdmin()
  if (!(await canEditOwned('materiais', 'id', id, admin))) throw new Error('Você só pode excluir materiais criados por você.')
  const { error } = await supabaseAdmin().from('materiais').delete().eq('id', id)
  if (error) throw error
  await confirmRowDeleted('materiais', 'id', id, 'O material ainda existe no banco.')
  revalidatePath('/'); revalidatePath('/materiais'); revalidatePath('/admin')
}

// ── MENTORIAS ────────────────────────────────────────────────────────────────

export async function getMentorias() {
  const admin = await requireAdmin()
  let query = supabaseAdmin().from('mentorias').select('*').order('created_at')
  if (!admin.isMaster) query = query.eq('created_by', admin.id)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function upsertMentoria(m: Record<string, unknown>) {
  const admin = await requireAdmin()
  const id = String(m.id ?? '')
  if (!(await canEditOwned('mentorias', 'id', id, admin))) throw new Error('Você só pode editar mentorias criadas por você.')
  const { error } = await supabaseAdmin().from('mentorias').upsert({
    ...m,
    created_by: admin.isMaster && m.created_by ? m.created_by : admin.id,
    created_by_username: admin.isMaster && m.created_by_username ? m.created_by_username : admin.username,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' })
  if (error) throw error
  await confirmRowExists('mentorias', 'id', id, 'A mentoria não foi confirmada no banco.')
  revalidatePath('/'); revalidatePath('/cursos'); revalidatePath('/admin')
}

export async function deleteMentoria(id: string) {
  const admin = await requireAdmin()
  if (!(await canEditOwned('mentorias', 'id', id, admin))) throw new Error('Você só pode excluir mentorias criadas por você.')
  const { error } = await supabaseAdmin().from('mentorias').delete().eq('id', id)
  if (error) throw error
  await confirmRowDeleted('mentorias', 'id', id, 'A mentoria ainda existe no banco.')
  revalidatePath('/'); revalidatePath('/cursos'); revalidatePath('/admin')
}

// ── CURSOS ───────────────────────────────────────────────────────────────────

export async function getCursos() {
  const admin = await requireAdmin()
  let query = supabaseAdmin().from('cursos').select('*').order('num')
  if (!admin.isMaster) query = query.eq('created_by', admin.id)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function upsertCurso(c: Record<string, unknown>) {
  const admin = await requireAdmin()
  const slug = String(c.slug ?? '')
  if (!(await canEditOwned('cursos', 'slug', slug, admin))) throw new Error('Você só pode editar cursos criados por você.')
  const { error } = await supabaseAdmin().from('cursos').upsert({
    ...c,
    created_by: admin.isMaster && c.created_by ? c.created_by : admin.id,
    created_by_username: admin.isMaster && c.created_by_username ? c.created_by_username : admin.username,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'slug' })
  if (error) throw error
  await confirmRowExists('cursos', 'slug', slug, 'O curso não foi confirmado no banco.')
  revalidatePath('/'); revalidatePath('/cursos'); revalidatePath('/admin')
}

export async function deleteCurso(slug: string) {
  const admin = await requireAdmin()
  if (!(await canEditOwned('cursos', 'slug', slug, admin))) throw new Error('Você só pode excluir cursos criados por você.')
  const { error } = await supabaseAdmin().from('cursos').delete().eq('slug', slug)
  if (error) throw error
  await confirmRowDeleted('cursos', 'slug', slug, 'O curso ainda existe no banco.')
  revalidatePath('/'); revalidatePath('/cursos'); revalidatePath('/admin')
}

// ── STUDIO TEMPLATES ─────────────────────────────────────────────────────────

export async function getStudioTemplates() {
  await requireMaster()
  const { data, error } = await supabaseAdmin()
    .from('studio_templates')
    .select('*')
    .order('module')
    .order('created_at')
  if (error) throw error
  return data as StudioTemplate[]
}

export async function upsertStudioTemplate(t: StudioTemplate) {
  const admin = await requireMaster()
  const { error } = await supabaseAdmin().from('studio_templates').upsert({
    ...t,
    created_by: t.created_by ?? admin.id,
    created_by_username: t.created_by_username ?? admin.username,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' })
  if (error) throw error
  await confirmRowExists('studio_templates', 'id', t.id, 'O modelo do Studio não foi confirmado no banco.')
  revalidatePath('/admin'); revalidatePath(`/studio/${t.module}`)
}

export async function deleteStudioTemplate(id: string) {
  await requireMaster()
  const { error } = await supabaseAdmin().from('studio_templates').delete().eq('id', id)
  if (error) throw error
  await confirmRowDeleted('studio_templates', 'id', id, 'O modelo do Studio ainda existe no banco.')
  revalidatePath('/admin')
}
