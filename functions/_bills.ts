import { isMonth } from './_month'

// Validation shared by the /api/bills routes.

const MAX_TAKA = 10_000_000

// Fixed shares carry forward: for each bill and member, the latest row at or before the month
// applies, until a later month sets a new one. A row with fixed_amount = -1 means "back to the
// equal split from this month on" (needed to end a carried-over share). Bind the month once.
export const FIXED_CLEARED = -1
export const EFFECTIVE_FIXED_SQL = `SELECT f.bill_id, f.member_id, f.fixed_amount FROM bill_fixed_shares f
  WHERE f.fixed_amount >= 0
    AND f.month = (SELECT MAX(x.month) FROM bill_fixed_shares x WHERE x.bill_id = f.bill_id AND x.member_id = f.member_id AND x.month <= ?)`

export interface BillRow {
  id: string
  name: string
}

// A bill name: text, spaces trimmed (and doubled spaces squeezed), 1 to 60 characters.
export function cleanBillName(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const name = value.trim().replace(/\s+/g, ' ')
  return name.length >= 1 && name.length <= 60 ? name : null
}

// Bill and fixed amounts are whole taka (the split works in whole taka), 0 to 10,000,000.
export function parseWholeTaka(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_TAKA ? value : null
}

// 'YYYY-MM-01' from a request body. Anything else: null.
export function parseMonthField(value: unknown): string | null {
  return typeof value === 'string' && isMonth(value) ? value : null
}