import { format, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMonth } from '@/lib/month'
import { cn } from '@/lib/utils'

const arrow = 'press flex size-8 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-fill hover:text-foreground'

// Compact month picker: < Oct 2026 >. Tap the name to jump back to the current month.
export default function MonthPicker() {
  const { month, isCurrentMonth, prevMonth, nextMonth, goToCurrentMonth } = useMonth()
  const date = parseISO(month)

  return (
    <div className="glass flex shrink-0 items-center rounded-full p-0.5">
      <button type="button" onClick={prevMonth} aria-label="Previous month" className={arrow}>
        <ChevronLeft className="size-4" />
      </button>
      <button
        type="button"
        onClick={goToCurrentMonth}
        title={isCurrentMonth ? 'Current month' : 'Go to current month'}
        className={cn(
          'press type-sub h-8 rounded-full px-2 font-semibold whitespace-nowrap tabular-nums outline-none hover:bg-fill',
          !isCurrentMonth && 'text-primary',
        )}
      >
        <span className="sm:hidden">{format(date, 'MMM yyyy')}</span>
        <span className="hidden sm:inline">{format(date, 'MMMM yyyy')}</span>
      </button>
      <button type="button" onClick={nextMonth} aria-label="Next month" className={arrow}>
        <ChevronRight className="size-4" />
      </button>
    </div>
  )
}
