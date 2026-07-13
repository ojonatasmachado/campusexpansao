import { getAdminInviteInfo } from '../../actions'
import SetupAccessClient from './SetupAccessClient'

export const dynamic = 'force-dynamic'

export default async function AdminInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invite = await getAdminInviteInfo(token)
  return <SetupAccessClient token={token} invite={invite} />
}
