import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { endOfMonth, format, parseISO, subDays } from 'date-fns'
import { Copy, Save, Users } from 'lucide-react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { EmptyState, ErrorState, Loading } from '@/components/States'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/field'
import { Notice } from '@/components/ui/notice'
import { Avatar } from '@/components/ui/avatar'
import { api } from '@/lib/api'
import { fetchMeals, useMeals } from '@/lib/meals'
import { useMembers } from '@/lib/members'
import { useMonth } from '@/lib/month'
import { useChangeGuard } from '@/lib/monthStatus'

interface SaveBody {
  date: string
  rows: { member_id: string; count: number | null }[] // null = empty = no meals
}

const dayText = (date: Date) => format(date, 'yyyy-MM-dd')

// Today when it is inside the selected month, otherwise the 1st of that month.
function defaultDate(month: string): string {
  const today = dayText(new Date())
  return today.slice(0, 7) === month.slice(0, 7) ? today : month
}

// Lets people type up to 2 digits and up to 2 decimals: 1  0.5  2.25
const isCountTyping = (text: string) => /^\d{0,2}\.?\d{0,2}$/.test(text)

// '' -> null (no meals), '1.5' -> 1.5, '.' -> 'invalid'
function parseCount(text: string): number | null | 'invalid' {
  const t = text.trim()
  if (t === '') return null
  if (!/^(\d+\.?\d*|\.\d+)$/.test(t)) return 'invalid'
  return Number(t)
}

export default function MealsForm() {
  const queryClient = useQueryClient()
  const { month } = useMonth()
  const members = useMembers()
  const meals = useMeals(month)
  const { confirmEdit } = useChangeGuard()

  const [date, setDate] = useState(() => defaultDate(month))
  // Only the boxes the person changed. Every other box shows the saved value for the date.
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [copying, setCopying] = useState(false)

  // The month changed in the top bar: move the date into that month and drop unsaved edits.
  const [dateMonth, setDateMonth] = useState(month)
  if (dateMonth !== month) {
    setDateMonth(month)
    setDate(defaultDate(month))
    setEdits({})
    setError('')
    setNote('')
  }

  const active = (members.data ?? []).filter((m) => m.active)
  const ready = !!members.data && !!meals.data

  // Saved counts of the chosen date (member id -> count).
  const saved = new Map<string, number>()
  for (const row of meals.data ?? []) if (row.date === date) saved.set(row.member_id, row.count)

  const shown = (id: string) => edits[id] ?? (saved.has(id) ? String(saved.get(id)) : '')

  const totalHundredths = active.reduce((sum, m) => {
    const count = parseCount(shown(m.id))
    return typeof count === 'number' ? sum + Math.round(count * 100) : sum
  }, 0)

  const save = useMutation({
    mutationFn: (body: SaveBody) => api.put('/api/meals', body),
    onSuccess: async (_data, body) => {
      // Our own screen refreshes at once; the hub refreshes the other open screens.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['meals'] }),
        queryClient.invalidateQueries({ queryKey: ['summary'] }),
      ])
      setEdits({}) // the boxes now show what the server has
      setNote(`Saved meals for ${format(parseISO(body.date), 'EEE, d MMM')}.`)
    },
  })

  const busy = save.isPending || copying

  function edit(change: () => void) {
    setError('')
    setNote('')
    change()
  }

  function setAll(count: number) {
    edit(() => setEdits(Object.fromEntries(active.map((m) => [m.id, String(count)]))))
  }

  // Fills the boxes with the day before. For the 1st of a month that is the last day of the
  // previous month, which is loaded once with the same query key ['meals', month].
  async function copyPrevious() {
    setError('')
    setNote('')
    if (!date) return
    const prev = subDays(parseISO(date), 1)
    const prevDate = dayText(prev)
    const prevMonth = `${prevDate.slice(0, 7)}-01`
    const label = format(prev, 'EEE, d MMM')

    setCopying(true)
    try {
      const rows =
        prevMonth === month
          ? (meals.data ?? [])
          : await queryClient.fetchQuery({ queryKey: ['meals', prevMonth], queryFn: () => fetchMeals(prevMonth) })
      const counts = new Map(rows.filter((r) => r.date === prevDate).map((r) => [r.member_id, r.count]))
      if (counts.size === 0) {
        setNote(`No meals were saved on ${label}.`)
      } else {
        setEdits(Object.fromEntries(active.map((m) => [m.id, counts.has(m.id) ? String(counts.get(m.id)) : ''])))
        setNote(`Copied from ${label}. Press Save to keep it.`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load the previous day.')
    } finally {
      setCopying(false)
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setNote('')
    if (!date) return setError('Please choose a date.')
    if (date.slice(0, 7) !== month.slice(0, 7)) {
      return setError(`The date must be in ${format(parseISO(month), 'MMMM yyyy')}. Change the month at the top to use another month.`)
    }

    const rows: SaveBody['rows'] = []
    for (const m of active) {
      const count = parseCount(shown(m.id))
      if (count === 'invalid') return setError(`Enter a number for ${m.name}, or leave it empty.`)
      rows.push({ member_id: m.id, count })
    }

    setError('')
    if (!(await confirmEdit())) return // closed month: ask first
    save.mutate({ date, rows })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meals</CardTitle>
        <CardDescription>How many meals each member had on a day. Use decimals for part of a meal, like 0.5. Empty or 0 means none.</CardDescription>
      </CardHeader>
      <CardContent>
        {members.isError && !members.data && <ErrorState error={members.error} onRetry={() => void members.refetch()} />}
        {meals.isError && !meals.data && <ErrorState error={meals.error} onRetry={() => void meals.refetch()} />}
        {members.data && active.length === 0 && (
          <EmptyState icon={Users} title="No active members yet" className="py-4">
            <Link to="/members" className="font-medium text-primary underline-offset-4 hover:underline">Add a member</Link> first.
          </EmptyState>
        )}

        {(!members.data || active.length > 0) && (
          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            <Field label="Date" htmlFor="meals-date" className="sm:max-w-xs">
              <Input
                id="meals-date"
                type="date"
                value={date}
                min={month}
                max={dayText(endOfMonth(parseISO(month)))}
                disabled={busy}
                onChange={(e) =>
                  edit(() => {
                    setDate(e.target.value)
                    setEdits({}) // unsaved numbers belong to the old date
                  })
                }
              />
            </Field>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" disabled={!ready || busy} onClick={() => setAll(1)}>
                Set all to 1
              </Button>
              <Button type="button" variant="secondary" size="sm" disabled={!ready || busy} onClick={() => setAll(2)}>
                Set all to 2
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={!ready || busy || !date} onClick={copyPrevious}>
                <Copy /> Copy previous day
              </Button>
            </div>

            {!ready && !members.isError && !meals.isError && <Loading />}

            {ready && (
              <ul className="grid gap-3 sm:grid-cols-2">
                {active.map((m) => (
                  <li key={m.id}>
                    <label className="flex min-h-14 items-center gap-3 rounded-2xl bg-card-2 py-2 pr-2 pl-3 transition-colors focus-within:bg-fill">
                      <Avatar name={m.name} size="sm" />
                      <span className="type-body min-w-0 flex-1 truncate font-medium">{m.name}</span>
                      <Input
                        className="w-24 text-right tabular-nums"
                        inputMode="decimal"
                        placeholder="0"
                        maxLength={5}
                        autoComplete="off"
                        aria-label={`Meals for ${m.name}`}
                        disabled={busy}
                        value={shown(m.id)}
                        onChange={(e) => isCountTyping(e.target.value) && edit(() => setEdits((cur) => ({ ...cur, [m.id]: e.target.value })))}
                      />
                    </label>
                  </li>
                ))}
              </ul>
            )}

            {ready && (
              <p className="type-body text-muted-foreground">
                Total meals: <span className="font-semibold text-foreground tabular-nums">{totalHundredths / 100}</span>
              </p>
            )}

            {error && <Notice tone="error">{error}</Notice>}
            {note && <Notice tone="success">{note}</Notice>}

            <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={!ready || busy || !date}>
              <Save /> {save.isPending ? 'Saving…' : 'Save day'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}