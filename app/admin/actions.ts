'use server'
import { cookies } from 'next/headers'
import { createHash } from 'crypto'
import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '../lib/supabase'

const token = (pw: string) =>
  createHash('sha256').update(pw).digest('hex').slice(0, 32)

export async function loginAction(pw: string): Promise<boolean> {
  const correct = process.env.ADMIN_PASSWORD ?? 'cex2026'
  if (pw !== correct) return false
  ;(await cookies()).set('adm', token(correct), {
    httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === 'production', path: '/',
  })
  return true
}

export async function logoutAction(): Promise<void> {
  ;(await cookies()).delete('adm')
}

export async function checkAuth(): Promise<boolean> {
  const correct = process.env.ADMIN_PASSWORD ?? 'cex2026'
  const c = (await cookies()).get('adm')
  return c?.value === token(correct)
}

// ── ESTANTES ─────────────────────────────────────────────────────────────────

export async function getEstantes() {
  const { data, error } = await supabaseAdmin()
    .from('estantes').select('*').order('ord')
  if (error) throw error
  return data
}

export async function upsertEstante(e: {
  key: string; label: string; familia: string
  accent: string; faixa_etaria: string; status: string; ord: number
}) {
  const { error } = await supabaseAdmin().from('estantes').upsert(e, { onConflict: 'key' })
  if (error) throw error
  revalidatePath('/materiais'); revalidatePath('/admin')
}

export async function deleteEstante(key: string) {
  const { error } = await supabaseAdmin().from('estantes').delete().eq('key', key)
  if (error) throw error
  revalidatePath('/materiais'); revalidatePath('/admin')
}

export async function reorderEstantes(keys: string[]) {
  const db = supabaseAdmin()
  await Promise.all(keys.map((key, i) =>
    db.from('estantes').update({ ord: i }).eq('key', key)
  ))
  revalidatePath('/materiais')
}

// ── MATERIAIS ────────────────────────────────────────────────────────────────

export async function getMateriais() {
  const { data, error } = await supabaseAdmin()
    .from('materiais').select('*').order('created_at')
  if (error) throw error
  return data
}

export async function upsertMaterial(m: Record<string, unknown>) {
  const { error } = await supabaseAdmin().from('materiais').upsert(m, { onConflict: 'id' })
  if (error) throw error
  revalidatePath('/materiais'); revalidatePath('/admin')
}

export async function deleteMaterial(id: string) {
  const { error } = await supabaseAdmin().from('materiais').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/materiais'); revalidatePath('/admin')
}

// ── MENTORIAS ────────────────────────────────────────────────────────────────

export async function getMentorias() {
  const { data, error } = await supabaseAdmin()
    .from('mentorias').select('*').order('created_at')
  if (error) throw error
  return data
}

export async function upsertMentoria(m: Record<string, unknown>) {
  const { error } = await supabaseAdmin().from('mentorias').upsert(m, { onConflict: 'id' })
  if (error) throw error
  revalidatePath('/cursos'); revalidatePath('/admin')
}

export async function deleteMentoria(id: string) {
  const { error } = await supabaseAdmin().from('mentorias').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/cursos'); revalidatePath('/admin')
}

// ── CURSOS ───────────────────────────────────────────────────────────────────

export async function getCursos() {
  const { data, error } = await supabaseAdmin()
    .from('cursos').select('*').order('num')
  if (error) throw error
  return data
}

export async function upsertCurso(c: Record<string, unknown>) {
  const { error } = await supabaseAdmin().from('cursos').upsert(c, { onConflict: 'slug' })
  if (error) throw error
  revalidatePath('/cursos'); revalidatePath('/admin')
}

export async function deleteCurso(slug: string) {
  const { error } = await supabaseAdmin().from('cursos').delete().eq('slug', slug)
  if (error) throw error
  revalidatePath('/cursos'); revalidatePath('/admin')
}
