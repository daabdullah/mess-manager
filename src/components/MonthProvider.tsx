import { useMemo, useState, type ReactNode } from 'react'
import { addMonths, format, parseISO, subMonths } from 'date-fns'
import { MonthContext } from '@/lib/month'

const toMonth = (date: Date) => format(date, 'yyyy-MM-01')

// Holds the selected month for the whole logged-in app. Starts on the current month.
export default function MonthProvider({ children }: { children: ReactNode }) {
  const [month, setMonth] = useState(() => toMonth(new Date()))

  const value = useMemo(
    () => ({
      month,
      isCurrentMonth: month === toMonth(new Date()),
      prevMonth: () => setMonth((m) => toMonth(subMonths(parseISO(m), 1))),
      nextMonth: () => setMonth((m) => toMonth(addMonths(parseISO(m), 1))),
      goToCurrentMonth: () => setMonth(toMonth(new Date())),
    }),
    [month],
  )

  return <MonthContext.Provider value={value}>{children}</MonthContext.Provider>
}