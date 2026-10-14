import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import BazarForm from '@/components/BazarForm'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { api } from '@/lib/api'
import type { BazarEntry } from '@/lib/bazar'
import { formatTaka } from '@/lib/format'
import { useChangeGuard } from '@/lib/monthStatus'

interface Props {
  date: string | null // 'YYYY-MM-DD' of the open day, null = closed
  entries: BazarEntry[] // that day's entries
  memberName: (id: string) => string
  onClose: () => void
}

// A panel with one day's entries and their details.
// Each entry can be edited (form opens in place) or deleted.
export default function BazarDayDialog({ date, entries, memberName, onClose }: Props) {
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const { confirmDelete } = useChangeGuard()

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/bazar/${id}`),
    onSuccess: () => {
      toast.success('Entry deleted.')
      void queryClient.invalidateQueries({ queryKey: ['bazar'] })
      void queryClient.invalidateQueries({ queryKey: ['summary'] })
    },
  })

  async function onDelete(entry: BazarEntry) {
    const ok = await confirmDelete({
      title: `Delete ${memberName(entry.member_id)}'s entry of ${formatTaka(entry.amount)}?`,
      description: 'Its item details are deleted too. This cannot be undone.',
    })
    if (ok) remove.mutate(entry.id)
  }

  function onOpenChange(open: boolean) {
    if (open) return
    setEditingId(null)
    onClose()
  }

  const total = entries.reduce((sum, entry) => sum + entry.amount, 0)

  return (
    <Dialog open={date !== null} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        {date && (
          <>
            <div className="mb-5">
              <DialogTitle>{format(parseISO(date), 'EEEE, d MMMM')}</DialogTitle>
              <DialogDescription>
                {entries.length} {entries.length === 1 ? 'entry' : 'entries'} · {formatTaka(total)} in total
              </DialogDescription>
            </div>

            {entries.length === 0 && <p className="type-body py-4 text-muted-foreground">No entries on this day.</p>}

            <ul className="space-y-3">
              {entries.map((entry) => (
                <li key={entry.id} className="surface rounded-2xl p-4">
                  {editingId === entry.id ? (
                    <BazarForm entry={entry} onDone={() => setEditingId(null)} />
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <Avatar name={memberName(entry.member_id)} size="sm" />
                        <p className="type-body min-w-0 flex-1 truncate font-medium">{memberName(entry.member_id)}</p>
                        <p className="type-body font-semibold tabular-nums">{formatTaka(entry.amount)}</p>
                        <div className="flex">
                          <Button variant="ghost" size="icon-sm" aria-label="Edit entry" disabled={remove.isPending} onClick={() => setEditingId(entry.id)}>
                            <Pencil />
                          </Button>
                          <Button variant="ghost-destructive" size="icon-sm" aria-label="Delete entry" disabled={remove.isPending} onClick={() => onDelete(entry)}>
                            <Trash2 />
                          </Button>
                        </div>
                      </div>
                      {entry.items.length > 0 && (
                        <ul className="type-sub mt-3 divide-y border-t">
                          {entry.items.map((item) => (
                            <li key={item.id} className="flex justify-between gap-3 py-2">
                              <span className="min-w-0 break-words">{item.item_name}</span>
                              <span className="shrink-0 text-muted-foreground tabular-nums">{formatTaka(item.price)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
