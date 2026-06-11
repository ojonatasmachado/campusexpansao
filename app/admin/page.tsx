import { checkAuth, getEstantes, getMateriais, getCursos, getMentorias } from './actions'
import AdminClient from './AdminClient'

export default async function AdminPage() {
  const authed = await checkAuth()
  if (!authed) return <AdminClient initialAuthed={false} initialData={null} />

  const [estantes, materiais, cursos, mentorias] = await Promise.all([
    getEstantes(), getMateriais(), getCursos(), getMentorias(),
  ])

  return <AdminClient initialAuthed={true} initialData={{ estantes, materiais, cursos, mentorias }} />
}
