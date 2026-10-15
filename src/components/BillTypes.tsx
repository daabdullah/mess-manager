import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { Plus, Receipt, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState, ErrorState, Loading } from '@/components/States'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { IconTile } from '@/components/ui/icon-tile'
import { Input } from '@/components/ui/input'
import { Notice } from '@/components/ui/notice'
import { api } from '@/lib/api'
import { groupAmounts, isWholeTyping, latestRow, useBills, wholeText, type Bill, type BillAmountRow } from '@/lib/bills'
import { getBillAmountForMonth } from '@/lib/calc'
import { useMonth } from '@/lib/month'
import { useChangeGuard } from '@/lib/monthStatus'

const MAX_NAME = 60

// Part 1: add or delete bill types, and set each bill's amount for the selected month.
export default function BillTypes() {
  const queryClient = useQueryClient()
  const { month } = useMonth()
  const bills = useBills(month)
  const [name, setName] = useState('')

  const add = useMutation({
    mutationFn: (billName: string) => api.post('/api/bills', { name: billName }),
    onSuccess: () => {
      setName('')
      // Our own screen refreshes at once; the hub refreshes the other open screens.
      void queryClient.invalidateQueries({ queryKey: ['bills'] })
      void queryClient.invalidateQueries({ queryKey: ['summary'] })
    },
  })

  function onAdd(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed) add.mutate(trimmed)
  }

  const list = bills.data?.bills ?? []
  const history = groupAmounts(bills.data?.amounts ?? [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly bills</CardTitle>
      </CardHeader>
      <CardContent flush className="space-y-2">
        <form onSubmit={onAdd} className="flex gap-2 px-(--pad) pb-2">
          <Input
            className="flex-1"
            placeholder="Bill name, e.g. Rent"
            aria-label="Bill name"
            maxLength={MAX_NAME}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button type="submit" size="lg" className="type-body h-11" disabled={add.isPending || !name.trim()}>
            <Plus /> Add
          </Button>
        </form>

        {bills.isPending && <Loading className="px-(--pad)" />}
        {bills.isError && !bills.data && <ErrorState error={bills.error} onRetry={() => void bills.refetch()} className="mx-(--pad)" />}
        {bills.data && list.length === 0 && (
          <EmptyState icon={Receipt} title="No bills yet">
            Add the first bill above, like Rent or Electricity.
          </EmptyState>
        )}

        {list.length > 0 && (
          <ul className="divide-y border-t">
            {list.map((bill) => (
              <BillRow key={bill.id} bill={bill} history={history.get(bill.id) ?? []} month={month} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

interface BillRowProps {
  bill: Bill
  history: BillAmountRow[]
  month: string
}

function BillRow({ bill, history, month }: BillRowProps) {
  const queryClient = useQueryClient()
  const { confirmEdit, confirmDelete } = useChangeGuard()
  const [text, setText] = useState<string | null>(null) // null = the person has not typed
  const [error, setError] = useState('')

  // The amount that applies this month, and which month it comes from.
  const amount = getBillAmountForMonth(history, month)
  const source = latestRow(history, month)
  const carriedOver = source !== null && source.effective_month !== month // a suggestion, not saved for this month
  const serverText = source ? wholeText(amount) : ''
  const shown = text ?? serverText
  const canSave = (text !== null && text !== serverText) || carriedOver

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['bills'] }),
      queryClient.invalidateQueries({ queryKey: ['summary'] }),
    ])

  const save = useMutation({
    mutationFn: (taka: number) => api.put(`/api/bills/${bill.id}/amount`, { month, amount: taka }),
    onMutate: () => setError(''),
    onSuccess: async () => {
      setText(null)
      await refresh()
    },
  })

  const remove = useMutation({
    mutationFn: () => api.delete(`/api/bills/${bill.id}`),
    onSuccess: () => {
      toast.success(`${bill.name} deleted.`)
      return refresh()
    },
  })

  async function onSave(e: FormEvent) {
    e.preventDefault()
    if (shown.trim() === '') return setError('Enter an amount (0 is allowed).')
    if (!(await confirmEdit())) return // closed month: ask first
    save.mutate(Number(shown))
  }

  async function onDelete() {
    const ok = await confirmDelete({
      title: `Delete ${bill.name}?`,
      description: 'Its amounts in every month and all its fixed shares are deleted too, so the shares of past months change. This cannot be undone.',
    })
    if (ok) remove.mutate()
  }

  const busy = save.isPending || remove.isPending

  let note = 'No amount yet.'
  if (source) {
    note =
      source.effective_month === month
        ? 'Set for this month.'
        : `Suggested from ${format(parseISO(source.effective_month), 'MMM yyyy')}. Press Save to set it for this month.`
  }

  return (
    <li className="px-(--pad) py-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
        <IconTile icon={Receipt} tone="pink" size="md" />
        <div className="min-w-0 flex-1 basis-36">
          <p className="type-body truncate font-medium">{bill.name}</p>
          <p className="type-sub text-muted-foreground">{note}</p>
        </div>
        <form onSubmit={onSave} className="flex items-center gap-2" noValidate>
          <span className="type-body text-muted-foreground">৳</span>
          <Input
            className="w-28 text-right tabular-nums"
            inputMode="numeric"
            placeholder="0"
            maxLength={8}
            autoComplete="off"
            aria-label={`${bill.name} amount for this month`}
            disabled={busy}
            value={shown}
            onChange={(e) => {
              if (!isWholeTyping(e.target.value)) return
              setError('')
              setText(e.target.value)
            }}
          />
          <Button type="submit" disabled={busy || !canSave}>
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
          <Button type="button" variant="ghost-destructive" size="icon" aria-label={`Delete ${bill.name}`} disabled={busy} onClick={onDelete}>
            <Trash2 />
          </Button>
        </form>
      </div>
      {error && <Notice tone="error" className="mt-3">{error}</Notice>}
    </li>
  )
}
