import { createClient } from '@supabase/supabase-js'

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Cliente público — usado no site para leitura
export const supabase = createClient(url, anon)

// Cliente administrativo — usado APENAS em Server Actions (service_role bypassa RLS)
export function supabaseAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY não definida')
  return createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
}
