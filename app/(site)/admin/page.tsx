import { checkAuth, getAdminMetrics, getAdminUsers, getEstantes, getMateriais, getCursos, getMentorias, getStudioTemplates } from './actions'
import { getServiceOrgs, getServiceMetrics, type ServiceMetrics } from './service-ops-actions'
import AdminClient from './AdminClient'

export const dynamic = 'force-dynamic'

const EMPTY_SERVICE_METRICS: ServiceMetrics = {
  signupsByWeek: [],
  statusBreakdown: { pago: 0, trial: 0, vencendo: 0, expirado: 0, semAssinatura: 0 },
  churn: { converted: 0, expired: 0, resolved: 0, conversionRate: null, churnRate: null },
}

export default async function AdminPage() {
  const admin = await checkAuth()
  if (!admin) return <AdminClient initialAuthed={false} initialAdmin={null} initialData={null} />

  const [estantes, materiais, cursos, mentorias, metrics] = await Promise.all([
    getEstantes(), getMateriais(), getCursos(), getMentorias(), getAdminMetrics(),
  ])
  const [adminUsers, studioTemplates, serviceOrgs, serviceMetrics] = admin.isMaster
    ? await Promise.all([getAdminUsers(), getStudioTemplates(), getServiceOrgs(), getServiceMetrics()])
    : [[], [], [], EMPTY_SERVICE_METRICS]

  return <AdminClient
    initialAuthed={true}
    initialAdmin={admin}
    initialData={{ estantes, materiais, cursos, mentorias, adminUsers, studioTemplates, serviceOrgs, serviceMetrics, metrics }}
  />
}
