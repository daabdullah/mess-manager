import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface MealRow {
  member_id: string
  date: string // 'YYYY-MM-DD'
  count: number // 0.5, 1, 2 ...
}

export async function fetchMeals(month: string): Promise<MealRow[]> {
  return (await api.get<{ meals: MealRow[] }>(`/api/meals?month=${month}`)).meals
}

// All meal rows of one month, in one call.
// Reloads by itself when the live hub reports a "meals" change.
export function useMeals(month: string) {
  return useQuery({
    queryKey: ['meals', month],
    queryFn: () => fetchMeals(month),
  })
}