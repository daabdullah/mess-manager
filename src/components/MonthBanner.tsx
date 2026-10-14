import { format, parseISO } from 'date-fns'
import { Lock, LockOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IconTile } from '@/components/ui/icon-tile'
import { useMonth } from '@/lib/month'
import { useMonthStatus, useSetMonthClosed } from '@/lib/monthStatus'

// Shown on top of the month pages when the selected month is closed. Unlock is here.
export default function MonthBanner() {
  const { month } = useMonth()
  const status = useMonthStatus(month)
  const setClosed = useSetMonthClosed()

  if (!status.data?.is_closed) return null

  return (
    <div role="status" className="rise surface mb-5 flex flex-wrap items-center gap-3 rounded-2xl p-3 pl-4">
      <IconTile icon={Lock} tone="orange" size="md" />
      <p className="type-sub min-w-0 flex-1 basis-56 text-muted-foreground">
        <span className="type-body block font-semibold text-foreground">{format(parseISO(month), 'MMMM yyyy')} is closed</span>
        You can still change it, but you will be asked to confirm every change.
      </p>
      <Button variant="secondary" size="sm" disabled={setClosed.isPending} onClick={() => setClosed.mutate({ month, closed: false })}>
        <LockOpen /> {setClosed.isPending ? 'Unlocking…' : 'Unlock'}
      </Button>
    </div>
  )
}
