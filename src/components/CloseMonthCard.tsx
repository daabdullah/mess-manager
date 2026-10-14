import { format, parseISO } from 'date-fns'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { IconTile } from '@/components/ui/icon-tile'
import { useConfirm } from '@/lib/confirm'
import { useMonth } from '@/lib/month'
import { useMonthStatus, useSetMonthClosed } from '@/lib/monthStatus'

// "Close month" for the Summary page. Only shown while the month is open (the banner has Unlock).
export default function CloseMonthCard() {
  const { month } = useMonth()
  const status = useMonthStatus(month)
  const setClosed = useSetMonthClosed()
  const confirm = useConfirm()
  const monthName = format(parseISO(month), 'MMMM yyyy')

  if (!status.data || status.data.is_closed) return null

  async function onClose() {
    const ok = await confirm({
      title: `Close ${monthName}?`,
      description: 'This marks the month as settled. Nothing is blocked: anyone can still change it, but will be asked to confirm first. You can unlock it at any time.',
      confirmLabel: 'Close month',
    })
    if (ok) setClosed.mutate({ month, closed: true })
  }

  return (
    <Card size="sm">
      <CardContent className="flex flex-wrap items-center gap-3">
        <IconTile icon={Lock} tone="orange" size="md" />
        <p className="type-sub min-w-0 flex-1 basis-56 text-muted-foreground">
          <span className="type-body block font-semibold text-foreground">Everyone has paid up?</span>
          Close {monthName} to mark it as settled.
        </p>
        <Button variant="secondary" disabled={setClosed.isPending} onClick={onClose}>
          <Lock /> {setClosed.isPending ? 'Closing…' : 'Close month'}
        </Button>
      </CardContent>
    </Card>
  )
}
