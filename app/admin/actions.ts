'use server'
import { cookies } from 'next/headers'
import { createHash } from 'crypto'

const token = (pw: string) =>
  createHash('sha256').update(pw).digest('hex').slice(0, 32)

export async function loginAction(pw: string): Promise<boolean> {
  const correct = process.env.ADMIN_PASSWORD ?? 'cex2026'
  if (pw !== correct) return false
  ;(await cookies()).set('adm', token(correct), {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
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
