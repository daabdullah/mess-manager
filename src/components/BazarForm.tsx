import { useId, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { endOfMonth, format, parseISO } from 'date-fns'
import { Plus, Save, Trash2, Users } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState, ErrorState } from '@/components/States'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/field'
import { Notice } from '@/components/ui/notice'
import { Select } from '@/components/ui/select'
import { api } from '@/lib/api'
import type { BazarEntry } from '@/lib/bazar'
import { formatTaka } from '@/lib/format'
import { useMembers, useMyMemberId } from '@/lib/members'
import { useMonth } from '@/lib/month'
import { useChangeGuard } from '@/lib/monthStatus'
import { centsToText, isMoneyTyping, takaToText, toCents } from '@/lib/money'

interface Line {
  key: string // only for React's list keys
  item: string
  price: string
  fresh: boolean // added by the person just now: focus its item box
}

interface SavedEntry {
  id: string
  amount: number
}

const dayText = (date: Date) => format(date, 'yyyy-MM-dd')

// Today when it is inside the selected month, otherwise the 1st of that month.
function defaultDate(month: string): string {
  const today = dayText(new Date())
  return today.slice(0, 7) === month.slice(0, 7) ? today : month
}

interface BazarFormProps {
  entry?: BazarEntry // given = edit this entry (PUT), missing = add a new one (POST)
  onDone?: () => void // edit mode: called after saving or on Cancel
}

export default function BazarForm({ entry, onDone }: BazarFormProps) {
  const editing = !!entry
  const queryClient = useQueryClient()
  const { month } = useMonth()
  const members = useMembers()
  const uid = useId()
  const { confirmEdit } = useChangeGuard()

  const myMemberId = useMyMemberId()
  const [memberId, setMemberId] = useState(entry?.member_id ?? myMemberId)
  const [date, setDate] = useState(() => entry?.date ?? defaultDate(month))
  const [amount, setAmount] = useState(() => (entry && entry.items.length === 0 ? takaToText(entry.amount) : ''))
  const [lines, setLines] = useState<Line[]>(() =>
    (entry?.items ?? []).map((i) => ({ key: i.id, item: i.item_name, price: takaToText(i.price), fresh: false })),
  )
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')
  const lineCounter = useRef(0)

  // The month changed in the top bar: move the date into that month (add mode only).
  const [dateMonth, setDateMonth] = useState(month)
  if (dateMonth !== month) {
    setDateMonth(month)
    if (!editing) setDate(defaultDate(month))
  }

  // Active members; when editing, also the entry's own member even if now inactive.
  const choices = (members.data ?? []).filter((m) => m.active || m.id === entry?.member_id)
  const hasLines = lines.length > 0
  const linesTotal = lines.reduce((sum, line) => sum + (toCents(line.price) ?? 0), 0)
  // With lines the amount is always their sum and cannot be typed.
  const shownAmount = hasLines ? (linesTotal > 0 ? centsToText(linesTotal) : '') : amount

  const save = useMutation({
    mutationFn: (body: unknown) =>
      entry
        ? api.put<{ entry: SavedEntry }>(`/api/bazar/${entry.id}`, body)
        : api.post<{ entry: SavedEntry }>('/api/bazar', body),
  })

  function edit(change: () => void) {
    setError('')
    setSaved('')
    change()
  }

  function addLine() {
    lineCounter.current += 1
    const key = `new-${lineCounter.current}`
    edit(() => setLines((current) => [...current, { key, item: '', price: '', fresh: true }]))
  }

  function removeLine(key: string) {
    edit(() => {
      // Removing the last line gives the amount back to the person, starting from the old sum.
      if (lines.length === 1 && linesTotal > 0) setAmount(centsToText(linesTotal))
      setLines((current) => current.filter((line) => line.key !== key))
    })
  }

  function changeLine(key: string, field: 'item' | 'price', value: string) {
    if (field === 'price' && !isMoneyTyping(value)) return
    edit(() => setLines((current) => current.map((line) => (line.key === key ? { ...line, [field]: value } : line))))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaved('')

    const member = choices.find((m) => m.id === memberId)
    if (!member) return setError('Please choose a member.')
    if (!date) return setError('Please choose a date.')
    if (date.slice(0, 7) !== month.slice(0, 7)) {
      return setError(`The date must be in ${format(parseISO(month), 'MMMM yyyy')}. Change the month at the top to use another month.`)
    }

    const payloadLines: { item: string; price: number }[] = []
    for (let i = 0; i < lines.length; i++) {
      const item = lines[i].item.trim()
      const cents = toCents(lines[i].price)
      if (!item || cents === null || cents < 1) {
        return setError(`Line ${i + 1}: enter an item and a price above 0, or remove the line.`)
      }
      payloadLines.push({ item, price: cents / 100 })
    }

    let amountToSend = 0
    if (payloadLines.length === 0) {
      const cents = toCents(amount)
      if (cents === null || cents < 1) return setError('Please enter an amount above 0.')
      amountToSend = cents / 100
    }

    setError('')
    if (!(await confirmEdit())) return // closed month: ask first
    save.mutate(
      { member_id: member.id, date, amount: amountToSend, lines: payloadLines },
      {
        onSuccess: (result) => {
          if (editing) {
            onDone?.()
          } else {
            // Clear the form but keep the date, so the next entry for the same day is quick.
            setMemberId(myMemberId)
            setAmount('')
            setLines([])
            setSaved(`Saved ${formatTaka(result.entry.amount)} for ${member.name}.`)
          }
          // Our own screen refreshes at once; the hub refreshes the other open screens.
          void queryClient.invalidateQueries({ queryKey: ['bazar'] })
          void queryClient.invalidateQueries({ queryKey: ['summary'] })
        },
      },
    )
  }

  const form = (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Member" htmlFor={`${uid}-member`}>
          <Select id={`${uid}-member`} value={memberId} disabled={members.isPending} onChange={(e) => edit(() => setMemberId(e.target.value))}>
            <option value="">{members.isPending ? 'Loading…' : 'Choose member'}</option>
            {choices.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Date" htmlFor={`${uid}-date`}>
          <Input
            id={`${uid}-date`}
            type="date"
            value={date}
            min={month}
            max={dayText(endOfMonth(parseISO(month)))}
            onChange={(e) => edit(() => setDate(e.target.value))}
          />
        </Field>

        <Field
          label="Amount (৳)"
          htmlFor={`${uid}-amount`}
          hint={hasLines ? `Total of ${lines.length} ${lines.length === 1 ? 'item' : 'items'}` : undefined}
        >
          <Input
            id={`${uid}-amount`}
            className="read-only:text-foreground"
            inputMode="decimal"
            placeholder="0"
            maxLength={12}
            autoComplete="off"
            value={shownAmount}
            readOnly={hasLines}
            onChange={(e) => isMoneyTyping(e.target.value) && edit(() => setAmount(e.target.value))}
          />
        </Field>
      </div>

      <div className="space-y-3 rounded-2xl bg-card-2 p-4">
        <div>
          <p className="type-body font-semibold">Details (optional)</p>
          <p className="type-sub text-muted-foreground">Add the items you bought. The amount then becomes their total.</p>
        </div>

        {lines.map((line, index) => (
          <div key={line.key} className="flex items-center gap-2">
            <Input
              className="flex-1"
              placeholder="Item"
              aria-label={`Item ${index + 1}`}
              maxLength={100}
              autoFocus={line.fresh}
              value={line.item}
              onChange={(e) => changeLine(line.key, 'item', e.target.value)}
            />
            <Input
              className="w-28 shrink-0"
              placeholder="Price"
              aria-label={`Price ${index + 1}`}
              inputMode="decimal"
              maxLength={12}
              autoComplete="off"
              value={line.price}
              onChange={(e) => changeLine(line.key, 'price', e.target.value)}
            />
            <Button type="button" variant="ghost-destructive" size="icon" className="shrink-0" aria-label={`Remove item ${index + 1}`} onClick={() => removeLine(line.key)}>
              <Trash2 />
            </Button>
          </div>
        ))}

        <Button type="button" variant="secondary" onClick={addLine} disabled={lines.length >= 100}>
          <Plus /> {hasLines ? 'Add another item' : 'Add item details'}
        </Button>
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {saved && <Notice tone="success">{saved}</Notice>}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="lg" className="flex-1 sm:flex-none" disabled={save.isPending || members.isPending}>
          <Save /> {save.isPending ? 'Saving…' : editing ? 'Save changes' : 'Save entry'}
        </Button>
        {editing && (
          <Button type="button" variant="outline" size="lg" className="flex-1 sm:flex-none" onClick={onDone}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )

  // Editing happens inside the day dialog, so no card around it.
  if (editing) return form

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add bazar</CardTitle>
        <CardDescription>One entry for each shopping trip. You can add several for the same person on the same day.</CardDescription>
      </CardHeader>
      <CardContent>
        {members.isError && !members.data && <ErrorState error={members.error} onRetry={() => void members.refetch()} />}
        {members.data && choices.length === 0 && (
          <EmptyState icon={Users} title="No active members yet" className="py-4">
            <Link to="/members" className="font-medium text-primary underline-offset-4 hover:underline">Add a member</Link> first.
          </EmptyState>
        )}
        {(members.isPending || choices.length > 0) && form}
      </CardContent>
    </Card>
  )
}