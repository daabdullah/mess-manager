import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO, subDays } from 'date-fns'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import { useMembers, type Member } from '@/lib/members'
import { useChangeGuard } from '@/lib/monthStatus'
import { cn } from '@/lib/utils'

type Mode = 'keep_until' | 'keep_month' | 'all'

// Deleting a member also changes these lists, so they are refreshed afterwards.
const AFTER_DELETE = ['members', 'bazar', 'meals', 'accessories', 'bills', 'summary']

const fmt = (iso: string, pattern: string) => format(parseISO(iso), pattern)

export default function DeleteMemberDialog({ member, onClose }: { member: Member; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { confirmDelete } = useChangeGuard()
  const members = useMembers()
  const [mode, setMode] = useState<Mode>('keep_until')
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))

  const remove = useMutation({
    mutationFn: () => api.delete(`/api/members/${member.id}?mode=${mode}&date=${date}`),
    onSuccess: async () => {
      toast.success(mode === 'all' ? 'Member and all data deleted.' : 'Member removed. Earlier data is kept.')
      await Promise.all(AFTER_DELETE.map((key) => queryClient.invalidateQueries({ queryKey: [key] })))
      onClose()
    },
  })

  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(parseISO(date).getTime())
  const needsDate = mode !== 'all'
  const canSubmit = !remove.isPending && (!needsDate || validDate) && members.data !== undefined

  const options: { value: Mode; title: string; text: string }[] = [
    {
      value: 'keep_until',
      title: 'Keep previous data',
      text: validDate
        ? `Keeps all data till ${fmt(format(subDays(parseISO(date), 1), 'yyyy-MM-dd'), 'd MMM yyyy')}. Deletes data from ${fmt(date, 'd MMM yyyy')} onward.`
        : 'Keeps all data before the chosen date and deletes the rest.',
    },
    {
      value: 'keep_month',
      title: 'Keep previous months, delete this month too',
      text: validDate
        ? `Keeps data of months before ${fmt(date, 'MMMM yyyy')}. Deletes all of ${fmt(date, 'MMMM yyyy')} (and later) too.`
        : 'Keeps data of earlier months and deletes the whole chosen month.',
    },
    {
      value: 'all',
      title: 'Delete all historical data',
      text: 'Deletes the member, their login and all their data in every month. This cannot be undone.',
    },
  ]

  async function submit() {
    if (mode === 'all') {
      const ok = await confirmDelete({
        title: `Delete all data of ${member.name}?`,
        description: 'Their login, bazar, meals, accessories and fixed bill shares in every month will be deleted. This cannot be undone.',
        confirmLabel: 'Delete everything',
      })
      if (!ok) return
    }
    remove.mutate()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !remove.isPending && onClose()}>
      <DialogContent size="md">
        <DialogTitle>Delete {member.name}</DialogTitle>
        <DialogDescription>
          Choose what happens to their data. Kept data stays in the old months, and they stay as one inactive member with their login.
        </DialogDescription>

        <div role="radiogroup" aria-label="What to delete" className="mt-4 space-y-2">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={mode === o.value}
              disabled={remove.isPending}
              onClick={() => setMode(o.value)}
              className={cn(
                'block w-full rounded-2xl border p-3 text-left outline-none transition-colors',
                mode === o.value ? 'border-primary bg-primary/10' : 'border-transparent bg-fill hover:bg-fill-2',
              )}
            >
              <span className={cn('type-body block font-medium', o.value === 'all' && 'text-danger')}>{o.title}</span>
              <span className="type-sub mt-0.5 block text-muted-foreground">{o.text}</span>
            </button>
          ))}
        </div>

        {needsDate && (
          <div className="mt-4 space-y-1.5">
            <Label htmlFor="delete-member-date">Deleted on</Label>
            <Input id="delete-member-date" type="date" value={date} disabled={remove.isPending} onChange={(e) => setDate(e.target.value)} />
          </div>
        )}

        {remove.isError && <p className="type-sub mt-3 text-danger">{remove.error.message}</p>}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" size="lg" className="sm:h-10 sm:text-[0.9375rem]" disabled={remove.isPending} onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" size="lg" className="sm:h-10 sm:text-[0.9375rem]" disabled={!canSubmit} onClick={() => void submit()}>
            {remove.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
