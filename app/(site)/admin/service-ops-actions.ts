'use server'
import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '../../lib/supabase'
import { requireMaster } from './actions'

export type ServiceOrgRow = {
  organizationId: string
  name: string
  slug: string | null
  createdAt: string
  city: string | null
  doc: string | null
  churchCount: number
  peopleCount: number
  loginCount: number
  subStatus: string | null
  currentPeriodEnd: string | null
  providerRef: string | null
  notes: string | null
}

type ServiceOrgSummaryRpcRow = {
  organization_id: string
  name: string
  slug: string | null
  created_at: string
  city: string | null
  doc: string | null
  church_count: number
  people_count: number
  login_count: number
  sub_status: string | null
  current_period_end: string | null
  provider_ref: string | null
  notes: string | null
}

export type ServiceOrgHistoryEntry = {
  occurredAt: string
  action: 'insert' | 'update' | 'delete'
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
}

type ServiceOrgHistoryRpcRow = {
  occurred_at: string
  action: 'insert' | 'update' | 'delete'
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
}

/* billing não é schema exposto ao PostgREST (só backend escreve, ver
   0003_billing.sql), então tudo aqui passa por RPC em core (0028_service_ops_admin.sql),
   nunca por .schema("billing").from(...) direto.

   Falha graciosamente (loga e volta []) em vez de derrubar a página inteira
   do /admin: até a migration 0028 ser aplicada no banco, a função RPC ainda
   não existe, e isso não pode quebrar Materiais/Cursos/Estantes que vivem
   na mesma página. */
export async function getServiceOrgs(): Promise<ServiceOrgRow[]> {
  await requireMaster()
  const { data, error } = await supabaseAdmin().schema('core').rpc('service_org_summary')
  if (error) {
    console.error('getServiceOrgs: falhou (migration 0028 aplicada?)', error)
    return []
  }
  return ((data ?? []) as ServiceOrgSummaryRpcRow[]).map((row) => ({
    organizationId: row.organization_id,
    name: row.name,
    slug: row.slug,
    createdAt: row.created_at,
    city: row.city,
    doc: row.doc,
    churchCount: row.church_count,
    peopleCount: row.people_count,
    loginCount: row.login_count,
    subStatus: row.sub_status,
    currentPeriodEnd: row.current_period_end,
    providerRef: row.provider_ref,
    notes: row.notes,
  }))
}

export async function getServiceOrgHistory(organizationId: string): Promise<ServiceOrgHistoryEntry[]> {
  await requireMaster()
  const { data, error } = await supabaseAdmin().schema('core').rpc('service_org_history', { p_organization_id: organizationId })
  if (error) {
    console.error('getServiceOrgHistory: falhou', error)
    return []
  }
  return ((data ?? []) as ServiceOrgHistoryRpcRow[]).map((row) => ({
    occurredAt: row.occurred_at,
    action: row.action,
    before: row.before,
    after: row.after,
  }))
}

export type ServiceMetrics = {
  signupsByWeek: { weekStart: string; count: number }[]
  statusBreakdown: { pago: number; trial: number; vencendo: number; expirado: number; semAssinatura: number }
  churn: { converted: number; expired: number; resolved: number; conversionRate: number | null; churnRate: number | null }
}

const EMPTY_METRICS: ServiceMetrics = {
  signupsByWeek: [],
  statusBreakdown: { pago: 0, trial: 0, vencendo: 0, expirado: 0, semAssinatura: 0 },
  churn: { converted: 0, expired: 0, resolved: 0, conversionRate: null, churnRate: null },
}

export async function getServiceMetrics(): Promise<ServiceMetrics> {
  await requireMaster()
  const { data, error } = await supabaseAdmin().schema('core').rpc('service_metrics')
  if (error) {
    console.error('getServiceMetrics: falhou (migration 0030 aplicada?)', error)
    return EMPTY_METRICS
  }
  const raw = data as {
    signups_by_week: { week_start: string; count: number }[]
    status_breakdown: { pago: number; trial: number; vencendo: number; expirado: number; sem_assinatura: number }
    churn: { converted: number; expired: number; resolved: number; conversion_rate: number | null; churn_rate: number | null }
  } | null
  if (!raw) return EMPTY_METRICS
  return {
    signupsByWeek: raw.signups_by_week.map((w) => ({ weekStart: w.week_start, count: w.count })),
    statusBreakdown: {
      pago: raw.status_breakdown.pago,
      trial: raw.status_breakdown.trial,
      vencendo: raw.status_breakdown.vencendo,
      expirado: raw.status_breakdown.expirado,
      semAssinatura: raw.status_breakdown.sem_assinatura,
    },
    churn: {
      converted: raw.churn.converted,
      expired: raw.churn.expired,
      resolved: raw.churn.resolved,
      conversionRate: raw.churn.conversion_rate,
      churnRate: raw.churn.churn_rate,
    },
  }
}

export async function extendServiceTrial(organizationId: string, newPeriodEnd: string, notes?: string) {
  await requireMaster()
  const { error } = await supabaseAdmin().schema('core').rpc('service_extend_trial', {
    p_organization_id: organizationId,
    p_new_period_end: newPeriodEnd,
    p_notes: notes || null,
  })
  if (error) throw error
  revalidatePath('/admin')
}

export async function bulkExtendServiceTrials(organizationIds: string[], newPeriodEnd: string, notes?: string) {
  await requireMaster()
  const db = supabaseAdmin()
  const results = await Promise.all(
    organizationIds.map((id) =>
      db.schema('core').rpc('service_extend_trial', { p_organization_id: id, p_new_period_end: newPeriodEnd, p_notes: notes || null }),
    ),
  )
  const failed = results.find((r) => r.error)
  if (failed?.error) throw failed.error
  revalidatePath('/admin')
}

export async function expireServiceOrgNow(organizationId: string) {
  await requireMaster()
  const { error } = await supabaseAdmin().schema('core').rpc('service_expire_org_now', { p_organization_id: organizationId })
  if (error) throw error
  revalidatePath('/admin')
}
