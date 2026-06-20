'use server'
import { cookies } from 'next/headers'
import { createHash, randomBytes, timingSafeEqual, pbkdf2Sync } from 'crypto'
import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '../lib/supabase'

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
  return data as (AdminUser & { password_salt: string; password_hash: string }) | null
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

export async function loginAction(username: string, pw: string): Promise<boolean> {
  const admin = await getAdminByUsername(username)
  if (!admin || !admin.active) return false
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

// ── ADMIN USERS ──────────────────────────────────────────────────────────────

export async function getAdminUsers() {
  await requireMaster()
  const { data, error } = await supabaseAdmin()
    .from('admin_users')
    .select('id, username, name, role, active, created_at')
    .order('created_at')
  if (error) throw error
  return data as AdminUser[]
}

export async function createAdminUser(input: { username: string; name: string; password: string; role: AdminRole }) {
  const master = await requireMaster()
  const username = input.username.trim().toLowerCase()
  if (!username || !input.password) throw new Error('Usuário e senha são obrigatórios.')
  const pw = hashPassword(input.password)
  const { error } = await supabaseAdmin().from('admin_users').insert({
    username,
    name: input.name.trim() || username,
    role: input.role,
    active: true,
    password_salt: pw.salt,
    password_hash: pw.hash,
    created_by: master.id,
    created_by_username: master.username,
  })
  if (error) throw error
  revalidatePath('/admin')
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
  revalidatePath('/admin')
}

export async function deleteAdminUser(id: string) {
  const current = await requireMaster()
  if (id === current.id) throw new Error('O master não pode excluir seu próprio acesso.')
  const { error } = await supabaseAdmin().from('admin_users').delete().eq('id', id)
  if (error) throw error
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
  revalidatePath('/materiais'); revalidatePath('/admin')
}

export async function deleteEstante(key: string) {
  await requireMaster()
  const { error } = await supabaseAdmin().from('estantes').delete().eq('key', key)
  if (error) throw error
  revalidatePath('/materiais'); revalidatePath('/admin')
}

export async function reorderEstantes(keys: string[]) {
  await requireMaster()
  const db = supabaseAdmin()
  await Promise.all(keys.map((key, i) =>
    db.from('estantes').update({ ord: i }).eq('key', key)
  ))
  revalidatePath('/materiais')
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
  const material: Record<string, unknown> = {
    ...m,
    created_by: admin.isMaster && m.created_by ? m.created_by : admin.id,
    created_by_username: admin.isMaster && m.created_by_username ? m.created_by_username : admin.username,
    updated_at: new Date().toISOString(),
  }
  const { error } = await supabaseAdmin().from('materiais').upsert(material, { onConflict: 'id' })
  if (error && 'contents' in m && error.message.toLowerCase().includes('contents')) {
    const legacyMaterial = { ...material }
    delete legacyMaterial.contents
    const retry = await supabaseAdmin().from('materiais').upsert(legacyMaterial, { onConflict: 'id' })
    if (retry.error) throw retry.error
    revalidatePath('/materiais'); revalidatePath('/admin')
    return
  }
  if (error) throw error
  revalidatePath('/materiais'); revalidatePath('/admin')
}

export async function deleteMaterial(id: string) {
  const admin = await requireAdmin()
  if (!(await canEditOwned('materiais', 'id', id, admin))) throw new Error('Você só pode excluir materiais criados por você.')
  const { error } = await supabaseAdmin().from('materiais').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/materiais'); revalidatePath('/admin')
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
  revalidatePath('/cursos'); revalidatePath('/admin')
}

export async function deleteMentoria(id: string) {
  const admin = await requireAdmin()
  if (!(await canEditOwned('mentorias', 'id', id, admin))) throw new Error('Você só pode excluir mentorias criadas por você.')
  const { error } = await supabaseAdmin().from('mentorias').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/cursos'); revalidatePath('/admin')
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
  revalidatePath('/cursos'); revalidatePath('/admin')
}

export async function deleteCurso(slug: string) {
  const admin = await requireAdmin()
  if (!(await canEditOwned('cursos', 'slug', slug, admin))) throw new Error('Você só pode excluir cursos criados por você.')
  const { error } = await supabaseAdmin().from('cursos').delete().eq('slug', slug)
  if (error) throw error
  revalidatePath('/cursos'); revalidatePath('/admin')
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
  revalidatePath('/admin')
}

export async function deleteStudioTemplate(id: string) {
  await requireMaster()
  const { error } = await supabaseAdmin().from('studio_templates').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/admin')
}
