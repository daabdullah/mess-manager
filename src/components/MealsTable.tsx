import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { eachDayOfInterval, endOfMonth, format, parseISO } from 'date-fns'
import { Users } from 'lucide-react'
import { EmptyState, ErrorState, Loading } from '@/components/States'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Notice } from '@/components/ui/notice'
import { tbl } from '@/components/ui/table'
import { api } from '@/lib/api'
import { useMeals } from '@/lib/meals'
import { useMembers } from '@/lib/members'
import { useMonth } from '@/lib/month'
import { useChangeGuard } from '@/lib/monthStatus'

const MAX_COUNT = 20

const dash = <span className={tbl.empty}>–</span>

// Lets people type up to 2 digits and up to 2 decimals: 1  0.5  2.25
const isCountTyping = (text: string) => /^\d{0,2}\.?\d{0,2}$/.test(text)

// '' -> null (no meals), '1.5' -> 1.5, '.' -> 'invalid'
function parseCount(text: string): number | null | 'invalid' {
  const t = text.trim()
  if (t === '') return null
  if (!/^(\d+\.?\d*|\.\d+)$/.test(t)) return 'invalid'
  return Number(t)
}

// hundredths -> text: 250 -> "2.5", 100 -> "1", 0 -> "0"
const fromHundredths = (h: number) => String(h / 100)

interface Target {
  date: string
  memberId: string
}

// Rows are every day of the month, columns are members. Each cell is one member's meals on
// one day, with row totals (right) and column totals (bottom). Tap a cell to change or clear it.
export default function MealsTable() {
  const { month } = useMonth()
  const meals = useMeals(month)
  const members = useMembers()
  const [target, setTarget] = useState<Target | null>(null)

  const rows = meals.data ?? []
  const allMembers = members.data ?? []
  const ready = !!meals.data && !!members.data

  // Columns: active members, plus inactive ones who have meals this month.
  const withMeals = new Set(rows.map((r) => r.member_id))
  const columns = allMembers.filter((m) => m.active || withMeals.has(m.id))

  const start = parseISO(month)
  const days = eachDayOfInterval({ start, end: endOfMonth(start) }).map((d) => format(d, 'yyyy-MM-dd'))
  const today = format(new Date(), 'yyyy-MM-dd')

  // Totals are added up in hundredths (whole numbers), so 0.1 + 0.2 never shows as 0.30000000000000004.
  const count = new Map<string, number>() // 'date|memberId' -> hundredths
  const rowSum = new Map<string, number>()
  const colSum = new Map<string, number>()
  let grand = 0
  for (const r of rows) {
    const h = Math.round(r.count * 100)
    count.set(`${r.date}|${r.member_id}`, h)
    rowSum.set(r.date, (rowSum.get(r.date) ?? 0) + h)
    colSum.set(r.member_id, (colSum.get(r.member_id) ?? 0) + h)
    grand += h
  }

  const monthName = format(start, 'MMMM yyyy')
  const targetMember = target ? allMembers.find((m) => m.id === target.memberId) : undefined
  const targetCount = target ? count.get(`${target.date}|${target.memberId}`) : undefined

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meals in {monthName}</CardTitle>
      </CardHeader>
      <CardContent flush>
        {(meals.isPending || members.isPending) && <Loading className="px-(--pad)" />}
        {meals.isError && !meals.data && <ErrorState error={meals.error} onRetry={() => void meals.refetch()} className="mx-(--pad)" />}
        {members.isError && !members.data && <ErrorState error={members.error} onRetry={() => void members.refetch()} className="mx-(--pad)" />}
        {ready && columns.length === 0 && (
          <EmptyState icon={Users} title="No members yet">
            Add members on the Members page to record meals.
          </EmptyState>
        )}

        {ready && columns.length > 0 && (
          <div className={`${tbl.scroll} max-h-[70dvh] border-t`}>
            <table className={tbl.table}>
              <thead>
                <tr>
                  <th className={tbl.thFirst}>Date</th>
                  {columns.map((m) => (
                    <th key={m.id} className={`${tbl.th} min-w-16`}>
                      {m.name}
                    </th>
                  ))}
                  <th className={`${tbl.th} min-w-16 text-foreground`}>Total</th>
                </tr>
              </thead>
              <tbody>
                {days.map((day) => (
                  <tr key={day} className={tbl.tr}>
                    <th scope="row" className={tbl.rowHead}>
                      <div className={`${tbl.rowHeadPad} ${day === today ? 'text-primary' : ''}`}>{format(parseISO(day), 'd MMM, EEE')}</div>
                    </th>
                    {columns.map((m) => {
                      const h = count.get(`${day}|${m.id}`)
                      return (
                        <td key={m.id} className={tbl.tdBare}>
                          <button
                            type="button"
                            className={`${tbl.cellBtn} text-right`}
                            aria-label={`${m.name}, ${format(parseISO(day), 'd MMM')}: change meals`}
                            onClick={() => setTarget({ date: day, memberId: m.id })}
                          >
                            {h === undefined ? dash : fromHundredths(h)}
                          </button>
                        </td>
                      )
                    })}
                    <td className={`${tbl.td} font-semibold`}>{rowSum.has(day) ? fromHundredths(rowSum.get(day)!) : dash}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" className={tbl.footHead}>
                    Total
                  </th>
                  {columns.map((m) => (
                    <td key={m.id} className={tbl.footTd}>
                      {colSum.has(m.id) ? fromHundredths(colSum.get(m.id)!) : dash}
                    </td>
                  ))}
                  <td className={tbl.footTd}>{fromHundredths(grand)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={target !== null} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent size="sm">
          {target && (
            <CellEditor
              key={`${target.date}|${target.memberId}`}
              date={target.date}
              memberId={target.memberId}
              memberName={targetMember?.name ?? 'Member'}
              current={targetCount}
              onClose={() => setTarget(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

interface CellEditorProps extends Target {
  memberName: string
  current: number | undefined // saved hundredths, undefined = no row
  onClose: () => void
}

// The small form inside the dialog: one number for one member and one date.
function CellEditor({ date, memberId, memberName, current, onClose }: CellEditorProps) {
  const queryClient = useQueryClient()
  const { confirmEdit } = useChangeGuard()
  const [text, setText] = useState(current === undefined ? '' : fromHundredths(current))
  const [error, setError] = useState('')

  const save = useMutation({
    // count null = clear: the server removes the row
    mutationFn: (count: number | null) => api.put('/api/meals', { date, rows: [{ member_id: memberId, count }] }),
    onSuccess: async () => {
      // Our own screen refreshes at once; the hub refreshes the other open screens.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['meals'] }),
        queryClient.invalidateQueries({ queryKey: ['summary'] }),
      ])
      onClose()
    },
  })

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const value = parseCount(text)
    if (value === 'invalid') return setError('Enter a number, or use Clear.')
    if (value !== null && value > MAX_COUNT) return setError(`At most ${MAX_COUNT} meals.`)
    setError('')
    if (!(await confirmEdit())) return // closed month: ask first
    save.mutate(value)
  }

  async function onClear() {
    setError('')
    if (!(await confirmEdit())) return
    save.mutate(null)
  }

  return (
    <>
      <DialogTitle>{memberName}</DialogTitle>
      <DialogDescription>{format(parseISO(date), 'EEEE, d MMMM yyyy')}</DialogDescription>

      <form onSubmit={onSubmit} className="mt-5 space-y-3" noValidate>
        <Input
          className="type-title h-14 text-center tabular-nums"
          inputMode="decimal"
          placeholder="0"
          maxLength={5}
          autoComplete="off"
          aria-label={`Meals for ${memberName}`}
          autoFocus
          onFocus={(e) => e.target.select()}
          disabled={save.isPending}
          value={text}
          onChange={(e) => {
            if (!isCountTyping(e.target.value)) return
            setError('')
            setText(e.target.value)
          }}
        />
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex gap-2">
          <Button type="submit" size="lg" className="flex-1" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
          {current !== undefined && (
            <Button type="button" variant="outline" size="lg" className="flex-1" disabled={save.isPending} onClick={onClear}>
              Clear
            </Button>
          )}
        </div>
      </form>
    </>
  )
}
