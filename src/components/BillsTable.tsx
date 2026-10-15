import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { Pin, Receipt, Users } from 'lucide-react'
import { EmptyState, ErrorState, Loading } from '@/components/States'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Notice } from '@/components/ui/notice'
import { tbl } from '@/components/ui/table'
import { api } from '@/lib/api'
import { groupAmounts, isWholeTyping, useBills, wholeText, type Bill, type BillAmountRow } from '@/lib/bills'
import { getBillAmountForMonth, splitWithFixed, type FixedMap } from '@/lib/calc'
import { formatTaka } from '@/lib/format'
import { useMembers } from '@/lib/members'
import { useMonth } from '@/lib/month'
import { useChangeGuard } from '@/lib/monthStatus'

interface Hint {
  warn: boolean
  text: string
}

interface Plan {
  bill: Bill
  amount: number
  shares: Record<string, number> // member id -> share
  fixed: FixedMap // member id -> fixed amount (only members with one)
  hint: Hint | null
}

// One bill in the selected month: its amount, everyone's share and a hint about the split.
function makePlan(bill: Bill, history: BillAmountRow[], fixed: FixedMap, ids: string[], month: string): Plan {
  const amount = Math.round(getBillAmountForMonth(history, month))
  const shares = splitWithFixed(amount, ids, fixed)

  const fixedIds = ids.filter((id) => Object.hasOwn(fixed, id))
  const fixedTotal = fixedIds.reduce((sum, id) => sum + Math.round(fixed[id]), 0)
  const others = ids.length - fixedIds.length
  const remaining = amount - fixedTotal
  const people = `${others} ${others === 1 ? 'member' : 'members'}`

  let hint: Hint | null = null
  if (fixedIds.length > 0) {
    if (others === 0) {
      hint =
        fixedTotal === amount
          ? { warn: false, text: `${bill.name}: every member has a fixed amount.` }
          : {
              warn: true,
              text: `${bill.name}: every member has a fixed amount, adding up to ${formatTaka(fixedTotal)}, but the bill is ${formatTaka(amount)}.`,
            }
    } else if (remaining < 0) {
      hint = {
        warn: true,
        text: `${bill.name}: fixed amounts (${formatTaka(fixedTotal)}) are more than the bill (${formatTaka(amount)}), so the other ${people} get negative shares.`,
      }
    } else {
      hint = { warn: false, text: `${bill.name}: remaining ${formatTaka(remaining)} split among ${people}.` }
    }
  }
  return { bill, amount, shares, fixed, hint }
}

// Part 2: a Bill x Member table of shares. Tap a cell to set or remove a fixed amount.
export default function BillsTable() {
  const { month } = useMonth()
  const bills = useBills(month)
  const members = useMembers()
  const [target, setTarget] = useState<{ billId: string; memberId: string } | null>(null)

  const data = bills.data
  const ready = !!data && !!members.data

  // Columns: active members, plus inactive ones who have a fixed share this month.
  const fixedMembers = new Set((data?.fixed ?? []).map((f) => f.member_id))
  const columns = (members.data ?? []).filter((m) => m.active || fixedMembers.has(m.id))
  const ids = columns.map((m) => m.id)

  const history = groupAmounts(data?.amounts ?? [])
  const fixedByBill = new Map<string, FixedMap>()
  for (const f of data?.fixed ?? []) {
    const map = fixedByBill.get(f.bill_id) ?? {}
    map[f.member_id] = f.fixed_amount
    fixedByBill.set(f.bill_id, map)
  }

  const plans = (data?.bills ?? []).map((bill) => makePlan(bill, history.get(bill.id) ?? [], fixedByBill.get(bill.id) ?? {}, ids, month))

  const rowTotal = (plan: Plan) => ids.reduce((sum, id) => sum + plan.shares[id], 0)
  const colTotal = (id: string) => plans.reduce((sum, plan) => sum + plan.shares[id], 0)
  const grand = plans.reduce((sum, plan) => sum + rowTotal(plan), 0)

  const monthName = format(parseISO(month), 'MMMM yyyy')
  const targetPlan = target ? plans.find((p) => p.bill.id === target.billId) : undefined
  const targetMember = target ? columns.find((m) => m.id === target.memberId) : undefined
  const hints = plans.filter((p) => p.hint)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Who pays what in {monthName}</CardTitle>
      </CardHeader>
      <CardContent flush>
        {(bills.isPending || members.isPending) && <Loading className="px-(--pad)" />}
        {bills.isError && !bills.data && <ErrorState error={bills.error} onRetry={() => void bills.refetch()} className="mx-(--pad)" />}
        {members.isError && !members.data && <ErrorState error={members.error} onRetry={() => void members.refetch()} className="mx-(--pad)" />}
        {ready && plans.length === 0 && (
          <EmptyState icon={Receipt} title="No bills to split yet">
            Add a bill above to see who pays what.
          </EmptyState>
        )}
        {ready && plans.length > 0 && columns.length === 0 && (
          <EmptyState icon={Users} title="No active members yet">
            Add members on the Members page to split the bills.
          </EmptyState>
        )}

        {ready && plans.length > 0 && columns.length > 0 && (
          <>
            <div className={`${tbl.scroll} max-h-[70dvh] border-t`}>
              <table className={tbl.table}>
                <thead>
                  <tr>
                    <th className={tbl.thFirst}>Bill</th>
                    {columns.map((m) => (
                      <th key={m.id} className={`${tbl.th} min-w-20`}>
                        {m.name}
                      </th>
                    ))}
                    <th className={`${tbl.th} min-w-20 text-foreground`}>Bill total</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan) => (
                    <tr key={plan.bill.id} className={tbl.tr}>
                      <th scope="row" className={tbl.rowHead}>
                        <div className={tbl.rowHeadPad}>{plan.bill.name}</div>
                      </th>
                      {columns.map((m) => {
                        const isFixed = Object.hasOwn(plan.fixed, m.id)
                        return (
                          <td key={m.id} className={tbl.tdBare}>
                            <button
                              type="button"
                              className={`${tbl.cellBtn} flex items-center justify-end gap-1 ${isFixed ? 'font-semibold text-primary' : ''}`}
                              aria-label={`${m.name}, ${plan.bill.name}: ${isFixed ? 'change fixed amount' : 'set a fixed amount'}`}
                              onClick={() => setTarget({ billId: plan.bill.id, memberId: m.id })}
                            >
                              {isFixed && <Pin className="size-3" aria-hidden />}
                              {formatTaka(plan.shares[m.id])}
                            </button>
                          </td>
                        )
                      })}
                      <td className={`${tbl.td} font-semibold`}>{formatTaka(rowTotal(plan))}</td>
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
                        {formatTaka(colTotal(m.id))}
                      </td>
                    ))}
                    <td className={tbl.footTd}>{formatTaka(grand)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {hints.length > 0 && (
              <div className="space-y-2 px-(--pad) pt-4">
                {hints.map((p) => (
                  <Notice key={p.bill.id} tone={p.hint?.warn ? 'warning' : 'info'}>
                    {p.hint?.text}
                  </Notice>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>

      <Dialog open={target !== null} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent size="sm">
          {target && targetPlan && targetMember && (
            <FixedEditor
              key={`${target.billId}|${target.memberId}`}
              billId={target.billId}
              billName={targetPlan.bill.name}
              memberId={target.memberId}
              memberName={targetMember.name}
              month={month}
              fixed={Object.hasOwn(targetPlan.fixed, target.memberId) ? targetPlan.fixed[target.memberId] : undefined}
              share={targetPlan.shares[target.memberId]}
              onClose={() => setTarget(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

interface FixedEditorProps {
  billId: string
  billName: string
  memberId: string
  memberName: string
  month: string
  fixed: number | undefined // saved fixed amount, undefined = none
  share: number // what the member pays now
  onClose: () => void
}

// The small form inside the dialog: a fixed amount for one member and one bill in this month.
function FixedEditor({ billId, billName, memberId, memberName, month, fixed, share, onClose }: FixedEditorProps) {
  const queryClient = useQueryClient()
  const { confirmEdit } = useChangeGuard()
  const [text, setText] = useState(fixed === undefined ? '' : wholeText(fixed))
  const [error, setError] = useState('')

  const save = useMutation({
    // amount null = remove the fixed amount (back to the equal split)
    mutationFn: (amount: number | null) =>
      amount === null
        ? api.delete(`/api/bills/${billId}/fixed?month=${month}&member_id=${memberId}`)
        : api.put(`/api/bills/${billId}/fixed`, { month, member_id: memberId, amount }),
    onSuccess: async () => {
      // Our own screen refreshes at once; the hub refreshes the other open screens.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bills'] }),
        queryClient.invalidateQueries({ queryKey: ['summary'] }),
      ])
      onClose()
    },
  })

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (text.trim() === '') return setError('Enter an amount (0 is allowed), or use the button to remove the fixed amount.')
    setError('')
    if (!(await confirmEdit())) return // closed month: ask first
    save.mutate(Number(text))
  }

  async function onUseEqualShare() {
    setError('')
    if (!(await confirmEdit())) return
    save.mutate(null)
  }

  return (
    <>
      <DialogTitle>
        {memberName} · {billName}
      </DialogTitle>
      <DialogDescription>
        {format(parseISO(month), 'MMMM yyyy')}. Now pays {formatTaka(share)}
        {fixed === undefined ? ' (equal share)' : ' (fixed)'}. It stays the same in later months until someone changes it.
      </DialogDescription>

      <form onSubmit={onSubmit} className="mt-5 space-y-3" noValidate>
        <Input
          className="type-title h-14 text-center tabular-nums"
          inputMode="numeric"
          placeholder="0"
          maxLength={8}
          autoComplete="off"
          aria-label={`Fixed amount for ${memberName}`}
          autoFocus
          onFocus={(e) => e.target.select()}
          disabled={save.isPending}
          value={text}
          onChange={(e) => {
            if (!isWholeTyping(e.target.value)) return
            setError('')
            setText(e.target.value)
          }}
        />
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="lg" className="flex-1" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save fixed amount'}
          </Button>
          {fixed !== undefined && (
            <Button type="button" variant="outline" size="lg" className="flex-1" disabled={save.isPending} onClick={onUseEqualShare}>
              Use equal share
            </Button>
          )}
        </div>
      </form>
    </>
  )
}
