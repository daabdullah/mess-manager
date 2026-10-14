import type { AuthData, Env } from '../_types'
import { isMonth, nextMonth } from '../_month'
import { error, json } from '../_utils'

interface MemberRow {
  id: string
  name: string
  active: number // 0 or 1 in the database
}
interface BazarTotal {
  member_id: string
  amount: number
}
interface MealTotal {
  member_id: string
  count: number
}
interface AccessoryTotal {
  paid_by: string
  amount: number
}
interface BillRow {
  id: string
  name: string
}
interface AmountRow {
  bill_id: string
  effective_month: string
  amount: number
}
interface FixedRow {
  bill_id: string
  member_id: string
  fixed_amount: number
}

// GET /api/summary?month=YYYY-MM-01
// Everything calcMonthSummary needs, in ONE db.batch of 7 small queries:
//   members      - everyone (the screen decides who takes part)
//   bazar        - SUM of the month's bazar per member
//   meals        - SUM of the month's meals per member
//   accessories  - SUM of the month's accessories per payer
//   bills        - all bill types
//   amounts      - each bill's amount history (effective_month at or before the month)
//   fixed        - the fixed shares of that month
// The sums are done in SQL (rounded to 2 decimals to drop float noise), so the response
// has one row per member, not one row per entry. Date queries use the date indexes.
export const onRequestGet: PagesFunction<Env, string, AuthData> = async ({ request, env }) => {
  const month = new URL(request.url).searchParams.get('month')
  if (!isMonth(month)) return error('Month must look like 2026-10-01.')
  const end = nextMonth(month)

  const [members, bazar, meals, accessories, bills, amounts, fixed] = await env.DB.batch([
    env.DB.prepare('SELECT id, name, active FROM members ORDER BY name COLLATE NOCASE, created_at'),
    env.DB
      .prepare(
        'SELECT member_id, ROUND(SUM(amount), 2) AS amount FROM bazar_entries WHERE date >= ? AND date < ? GROUP BY member_id',
      )
      .bind(month, end),
    env.DB
      .prepare('SELECT member_id, ROUND(SUM(count), 2) AS count FROM meals WHERE date >= ? AND date < ? GROUP BY member_id')
      .bind(month, end),
    env.DB
      .prepare(
        'SELECT paid_by, ROUND(SUM(amount), 2) AS amount FROM accessories WHERE date >= ? AND date < ? GROUP BY paid_by',
      )
      .bind(month, end),
    env.DB.prepare('SELECT id, name FROM bills ORDER BY created_at, rowid'),
    env.DB.prepare('SELECT bill_id, effective_month, amount FROM bill_amounts WHERE effective_month <= ?').bind(month),
    env.DB.prepare('SELECT bill_id, member_id, fixed_amount FROM bill_fixed_shares WHERE month = ?').bind(month),
  ])

  return json({
    members: ((members.results ?? []) as unknown as MemberRow[]).map((m) => ({
      id: m.id,
      name: m.name,
      active: m.active === 1,
    })),
    bazar: (bazar.results ?? []) as unknown as BazarTotal[],
    meals: (meals.results ?? []) as unknown as MealTotal[],
    accessories: (accessories.results ?? []) as unknown as AccessoryTotal[],
    bills: (bills.results ?? []) as unknown as BillRow[],
    amounts: (amounts.results ?? []) as unknown as AmountRow[],
    fixed: (fixed.results ?? []) as unknown as FixedRow[],
  })
}
