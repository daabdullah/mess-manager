import { useId, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { endOfMonth, format, parseISO } from 'date-fns'
import { Save, Users } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState, ErrorState } from '@/components/States'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Notice } from '@/components/ui/notice'
import { Select } from '@/components/ui/select'
import { api } from '@/lib/api'
import type { Accessory } from '@/lib/accessories'
import { formatTaka } from '@/lib/format'
import { useMembers, useMyMemberId } from '@/lib/members'
import { useMonth } from '@/lib/month'
import { useChangeGuard } from '@/lib/monthStatus'
import { isMoneyTyping, takaToText, toCents } from '@/lib/money'

const dayText = (date: Date) => format(date, 'yyyy-MM-dd')

// Today when it is inside the selected month, otherwise the 1st of that month.
function defaultDate(month: string): string {
  const today = dayText(new Date())
  return today.slice(0, 7) === month.slice(0, 7) ? today : month
}

interface AccessoriesFormProps {
  accessory?: Accessory // given = edit this one (PUT), missing = add a new one (POST)
  onDone?: () => void // edit mode: called after saving or on Cancel
}

export default function AccessoriesForm({ accessory, onDone }: AccessoriesFormProps) {
  const editing = !!accessory
  const queryClient = useQueryClient()
  const { month } = useMonth()
  const members = useMembers()
  const uid = useId()
  const { confirmEdit } = useChangeGuard()

  const [date, setDate] = useState(() => accessory?.date ?? defaultDate(month))
  const [item, setItem] = useState(accessory?.item ?? '')
  const [amount, setAmount] = useState(() => (accessory ? takaToText(accessory.amount) : ''))
  const myMemberId = useMyMemberId()
  const [paidBy, setPaidBy] = useState(accessory?.paid_by ?? myMemberId)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')

  // The month changed in the top bar: move the date into that month (add mode only).
  const [dateMonth, setDateMonth] = useState(month)
  if (dateMonth !== month) {
    setDateMonth(month)
    if (!editing) setDate(defaultDate(month))
  }

  // Active members; when editing, also the current payer even if now inactive.
  const choices = (members.data ?? []).filter((m) => m.active || m.id === accessory?.paid_by)

  const save = useMutation({
    mutationFn: (body: unknown) =>
      accessory
        ? api.put<{ accessory: Accessory }>(`/api/accessories/${accessory.id}`, body)
        : api.post<{ accessory: Accessory }>('/api/accessories', body),
  })

  function edit(change: () => void) {
    setError('')
    setSaved('')
    change()
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaved('')

    const name = item.trim().replace(/\s+/g, ' ')
    if (!date) return setError('Please choose a date.')
    if (date.slice(0, 7) !== month.slice(0, 7)) {
      return setError(`The date must be in ${format(parseISO(month), 'MMMM yyyy')}. Change the month at the top to use another month.`)
    }
    if (!name) return setError('Please enter the item.')
    const payer = choices.find((m) => m.id === paidBy)
    if (!payer) return setError('Please choose who paid.')
    const cents = toCents(amount)
    if (cents === null || cents < 1) return setError('Please enter an amount above 0.')

    setError('')
    if (!(await confirmEdit())) return // closed month: ask first
    save.mutate(
      { date, item: name, amount: cents / 100, paid_by: payer.id },
      {
        onSuccess: (result) => {
          if (editing) {
            onDone?.()
          } else {
            // Clear the form but keep the date, so the next item for the same day is quick.
            setItem('')
            setAmount('')
            setPaidBy(myMemberId)
            setSaved(`Saved ${result.accessory.item}, ${formatTaka(result.accessory.amount)}.`)
          }
          // Our own screen refreshes at once; the hub refreshes the other open screens.
          void queryClient.invalidateQueries({ queryKey: ['accessories'] })
          void queryClient.invalidateQueries({ queryKey: ['summary'] })
        },
      },
    )
  }

  const form = (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
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

        <Field label="Paid by" htmlFor={`${uid}-paid`}>
          <Select id={`${uid}-paid`} value={paidBy} disabled={members.isPending} onChange={(e) => edit(() => setPaidBy(e.target.value))}>
            <option value="">{members.isPending ? 'Loading…' : 'Choose member'}</option>
            {choices.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Item" htmlFor={`${uid}-item`}>
          <Input
            id={`${uid}-item`}
            placeholder="e.g. Cleaning liquid"
            maxLength={100}
            autoComplete="off"
            value={item}
            onChange={(e) => edit(() => setItem(e.target.value))}
          />
        </Field>

        <Field label="Amount (৳)" htmlFor={`${uid}-amount`}>
          <Input
            id={`${uid}-amount`}
            inputMode="decimal"
            placeholder="0"
            maxLength={12}
            autoComplete="off"
            value={amount}
            onChange={(e) => isMoneyTyping(e.target.value) && edit(() => setAmount(e.target.value))}
          />
        </Field>
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {saved && <Notice tone="success">{saved}</Notice>}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="lg" className="flex-1 sm:flex-none" disabled={save.isPending || members.isPending}>
          <Save /> {save.isPending ? 'Saving…' : editing ? 'Save changes' : 'Save accessory'}
        </Button>
        {editing && (
          <Button type="button" variant="outline" size="lg" className="flex-1 sm:flex-none" onClick={onDone}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )

  // Editing happens inside the list, so no card around it.
  if (editing) return form

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add accessory</CardTitle>
        <CardDescription>Shared things like cleaning supplies or gas. The cost is divided equally among all members.</CardDescription>
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
