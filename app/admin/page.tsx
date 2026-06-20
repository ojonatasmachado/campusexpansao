import { checkAuth, getAdminUsers, getEstantes, getMateriais, getCursos, getMentorias, getStudioTemplates } from './actions'
import AdminClient from './AdminClient'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const admin = await checkAuth()
  if (!admin) return <AdminClient initialAuthed={false} initialAdmin={null} initialData={null} />

  const [estantes, materiais, cursos, mentorias] = await Promise.all([
    getEstantes(), getMateriais(), getCursos(), getMentorias(),
  ])
  const [adminUsers, studioTemplates] = admin.isMaster
    ? await Promise.all([getAdminUsers(), getStudioTemplates()])
    : [[], []]

  return <AdminClient
    initialAuthed={true}
    initialAdmin={admin}
    initialData={{ estantes, materiais, cursos, mentorias, adminUsers, studioTemplates }}
  />
}
