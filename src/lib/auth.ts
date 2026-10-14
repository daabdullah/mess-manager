import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { stopLive } from '@/lib/live'

export interface User {
  id: string
  email: string
  member_id?: string | null // the member this login belongs to
  member_name?: string | null
  created_at?: string
}

// Who is signed in. A 401 sends the user to /login (see api.ts).
export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get<{ user: User }>('/api/me')).user,
    retry: false,
  })
}

export async function logout() {
  stopLive() // close the live connection first, so it does not try to reconnect
  try {
    await api.post('/api/logout')
  } catch {
    // even if this fails, still go to the login page
  }
  // A full page load also clears all cached data.
  window.location.assign('/login')
}