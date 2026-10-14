import { createContext, useContext } from 'react'

export interface MonthContextValue {
  month: string // 'YYYY-MM-01'
  isCurrentMonth: boolean
  prevMonth: () => void
  nextMonth: () => void
  goToCurrentMonth: () => void
}

export const MonthContext = createContext<MonthContextValue | null>(null)

// The month chosen in the top bar. Use it as the second part of query keys: [topic, month].
export function useMonth(): MonthContextValue {
  const value = useContext(MonthContext)
  if (!value) throw new Error('useMonth must be used inside <MonthProvider>')
  return value
}