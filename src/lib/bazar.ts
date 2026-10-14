import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface BazarItem {
  id: string
  item_name: string
  price: number
}

export interface BazarEntry {
  id: string
  member_id: string
  date: string // 'YYYY-MM-DD'
  amount: number
  items: BazarItem[]
}

// All bazar entries (with their detail lines) of one month, in one call.
// Reloads by itself when the live hub reports a "bazar" change.
export function useBazar(month: string) {
  return useQuery({
    queryKey: ['bazar', month],
    queryFn: async () => (await api.get<{ entries: BazarEntry[] }>(`/api/bazar?month=${month}`)).entries,
  })
}