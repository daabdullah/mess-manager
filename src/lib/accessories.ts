import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface Accessory {
  id: string
  date: string // 'YYYY-MM-DD'
  item: string
  amount: number
  paid_by: string // member id
}

// All accessories of one month, in one call.
// Reloads by itself when the live hub reports an "accessories" change.
export function useAccessories(month: string) {
  return useQuery({
    queryKey: ['accessories', month],
    queryFn: async () => (await api.get<{ accessories: Accessory[] }>(`/api/accessories?month=${month}`)).accessories,
  })
}