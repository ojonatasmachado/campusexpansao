import { checkAuth } from './actions'
import AdminClient from './AdminClient'

export default async function AdminPage() {
  const authed = await checkAuth()
  return <AdminClient initialAuthed={authed} />
}
