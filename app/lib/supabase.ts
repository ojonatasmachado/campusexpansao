import { createClient } from '@supabase/supabase-js'

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Cliente público: usado no site para leitura
// db.schema: 'cex' → todo .from(...) daqui aponta pro schema da loja CE.X por
// padrão (ver AGENTS.md §0/§11 e HANDOFF - Banco de Dados). Precisa de
// .schema("core"|"service") explícito pra sair desse padrão (ex: rotas que
// tocam o Service, como create-account).
export const supabase = createClient(url, anon, { db: { schema: 'cex' } })

// Cliente administrativo: usado APENAS em Server Actions (service_role bypassa RLS)
export function supabaseAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY não definida')
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema: 'cex' },
  })
}
