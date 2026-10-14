import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useMe } from '@/lib/auth'

export interface Member {
  id: string
  name: string
  active: boolean
  created_at: string
  email: string | null // the member's login
}

// All members (active and inactive), sorted by name. Shared by every page that needs members.
// Reloads by itself when the live hub reports a "members" change.
export function useMembers() {
  return useQuery({
    queryKey: ['members'],
    queryFn: async () => (await api.get<{ members: Member[] }>('/api/members')).members,
  })
}
// The member that belongs to the logged-in account ('' if this login has no member).
// Used as the default in every name filter / name dropdown.
export function useMyMemberId(): string {
  const me = useMe()
  return me.data?.member_id ?? ''
}
