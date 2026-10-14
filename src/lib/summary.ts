import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Bill, BillAmountRow, FixedShareRow } from '@/lib/bills'
import { calcMonthSummary, getBillAmountForMonth, splitWithFixed, type FixedMap, type MemberSummary, type MonthSummary } from '@/lib/calc'

// What GET /api/summary returns: small totals, not every entry.
export interface SummaryData {
  members: { id: string; name: string; active: boolean }[]
  bazar: { member_id: string; amount: number }[] // month total per member
  meals: { member_id: string; count: number }[] // month total per member
  accessories: { paid_by: string; amount: number }[] // month total per payer
  bills: Bill[]
  amounts: BillAmountRow[] // each bill's amount history up to the month
  fixed: FixedShareRow[] // fixed shares of the month
}

// One call for the whole page. Key is ['summary', month]: the live hub reloads it on every topic.
export function useSummary(month: string) {
  return useQuery({
    queryKey: ['summary', month],
    queryFn: () => api.get<SummaryData>(`/api/summary?month=${month}`),
  })
}

export interface SummaryRow extends MemberSummary {
  name: string
  active: boolean
  accessoriesPaid: number
}

export interface BillSplit {
  bill: Bill
  amount: number
  shares: Record<string, number> // member id -> share
  warn: boolean // shares do not add up to the bill, or someone has a negative share
}

export interface SummaryView {
  summary: MonthSummary
  rows: SummaryRow[] // one per member taking part, in name order
  billSplits: BillSplit[]
  accessoriesTotal: number
  accessoryShare: number
}

const round2 = (n: number) => Math.round(n * 100) / 100 + 0

// Who takes part: active members, plus inactive members who have something this month
// (bazar, meals, an accessory they paid, or a fixed bill share). Same idea as the Bills page.
export function buildSummary(data: SummaryData, month: string): SummaryView {
  const used = new Set<string>()
  for (const r of data.bazar) used.add(r.member_id)
  for (const r of data.meals) used.add(r.member_id)
  for (const r of data.accessories) used.add(r.paid_by)
  for (const r of data.fixed) used.add(r.member_id)
  const people = data.members.filter((m) => m.active || used.has(m.id))
  const ids = people.map((m) => m.id)

  const history = new Map<string, BillAmountRow[]>()
  for (const row of data.amounts) history.set(row.bill_id, [...(history.get(row.bill_id) ?? []), row])
  const fixedByBill = new Map<string, FixedMap>()
  for (const f of data.fixed) fixedByBill.set(f.bill_id, { ...(fixedByBill.get(f.bill_id) ?? {}), [f.member_id]: f.fixed_amount })

  const summary = calcMonthSummary({
    month,
    memberIds: ids,
    bazar: data.bazar,
    meals: data.meals,
    accessories: data.accessories,
    bills: data.bills.map((b) => ({ amounts: history.get(b.id) ?? [], fixed: fixedByBill.get(b.id) })),
  })

  const paid = new Map<string, number>()
  for (const a of data.accessories) paid.set(a.paid_by, (paid.get(a.paid_by) ?? 0) + a.amount)
  const accessoriesTotal = round2(ids.reduce((sum, id) => sum + (paid.get(id) ?? 0), 0))
  const accessoryShare = ids.length > 0 ? round2(accessoriesTotal / ids.length) : 0

  const rows = summary.members.map((m, i): SummaryRow => ({
    ...m,
    name: people[i].name,
    active: people[i].active,
    accessoriesPaid: round2(paid.get(m.memberId) ?? 0),
  }))

  // The same split the Bills page shows, so the numbers match.
  const billSplits = data.bills.map((bill): BillSplit => {
    const amount = Math.round(getBillAmountForMonth(history.get(bill.id) ?? [], month))
    const shares = splitWithFixed(amount, ids, fixedByBill.get(bill.id) ?? {})
    const sum = ids.reduce((total, id) => total + shares[id], 0)
    return { bill, amount, shares, warn: sum !== amount || ids.some((id) => shares[id] < 0) }
  })

  return { summary, rows, billSplits, accessoriesTotal, accessoryShare }
}

// Meals can be 0.5 etc: 62 or 62.5 (never long decimals).
const mealFormat = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 })
export const formatMeals = (n: number) => mealFormat.format(n)

export const sumOf = (values: number[]) => round2(values.reduce((a, b) => a + b, 0))
