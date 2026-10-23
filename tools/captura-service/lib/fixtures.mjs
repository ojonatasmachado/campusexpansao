// Preparação de dados de teste. Nunca altera a instância compartilhada.
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_LOCAL } from './config.mjs';

export async function prepararRascunhoEscala() {
  const projeto = process.env.CAPTURA_DESCARTAVEL;
  if (!projeto) return; // modo direto: a pessoa prepara as fixtures antes
  const url = new URL(SUPABASE_LOCAL);
  if (!/^cex-rls-[a-f0-9]{12}$/.test(projeto) || url.hostname !== '127.0.0.1' || url.port === '54321') throw new Error('Preparação de escala exige o projeto descartável da captura.');
  const chave = process.env.CAPTURA_SERVICE_ROLE_KEY;
  if (!chave) throw new Error('Chave do ambiente descartável ausente.');
  const db = createClient(SUPABASE_LOCAL, chave, { auth: { persistSession: false, autoRefreshToken: false } }).schema('service');
  // Uma fixture determinística, reposta antes de cada aparelho. Publicar no
  // celular não pode esgotar o rascunho necessário ao teste no desktop.
  const { data, error } = await db.from('roster_assignments').update({ rascunho: true }).eq('id', 'ca9e0800-0000-4000-8000-000000000012').select('id');
  if (error || data?.length !== 1) throw new Error('Fixture de rascunho da escala ausente ou indisponível.');
}
