import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { BillAmount } from '@/lib/calc'

export interface Bill {
  id: string
  name: string
}

export interface BillAmountRow extends BillAmount {
  bill_id: string
}

export interface FixedShareRow {
  bill_id: string
  member_id: string
  fixed_amount: number
}

export interface BillsData {
  bills: Bill[]
  amounts: BillAmountRow[] // history: every amount with effective_month at or before the month
  fixed: FixedShareRow[] // fixed shares of the month
}

// Bills, their amount history and the month's fixed shares, in one call.
// Reloads by itself when the live hub reports a "bills" change.
export function useBills(month: string) {
  return useQuery({
    queryKey: ['bills', month],
    queryFn: () => api.get<BillsData>(`/api/bills?month=${month}`),
  })
}

// bill id -> that bill's amount history
export function groupAmounts(rows: BillAmountRow[]): Map<string, BillAmountRow[]> {
  const map = new Map<string, BillAmountRow[]>()
  for (const row of rows) {
    const list = map.get(row.bill_id) ?? []
    list.push(row)
    map.set(row.bill_id, list)
  }
  return map
}

// The history row that applies to a month (latest effective_month at or before it), or null.
// Used to tell "saved for this month" from "carried over from an earlier month".
export function latestRow(history: BillAmount[], month: string): BillAmount | null {
  let best: BillAmount | null = null
  for (const row of history) {
    if (row.effective_month > month) continue
    if (!best || row.effective_month > best.effective_month) best = row
  }
  return best
}

export const wholeText = (taka: number) => String(Math.round(taka))

// Lets people type whole taka only (digits).
export const isWholeTyping = (text: string) => /^\d{0,8}$/.test(text)