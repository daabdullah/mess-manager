import type { AuthData, Env } from '../../_types'
import { cleanBillName, type BillRow } from '../../_bills'
import { isMonth } from '../../_month'
import { notify } from '../../_notify'
import { error, json, newId, readJson } from '../../_utils'

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

// GET /api/bills?month=YYYY-MM-01
// Everything for the screen in ONE batch of three queries:
//   bills        - all bill types
//   amounts      - every amount row with effective_month at or before the month (the history)
//   fixed        - the fixed shares of that month
export const onRequestGet: PagesFunction<Env, string, AuthData> = async ({ request, env }) => {
  const month = new URL(request.url).searchParams.get('month')
  if (!isMonth(month)) return error('Month must look like 2026-10-01.')

  const [billResult, amountResult, fixedResult] = await env.DB.batch([
    env.DB.prepare('SELECT id, name FROM bills ORDER BY created_at, rowid'),
    env.DB
      .prepare('SELECT bill_id, effective_month, amount FROM bill_amounts WHERE effective_month <= ?')
      .bind(month),
    env.DB
      .prepare('SELECT bill_id, member_id, fixed_amount FROM bill_fixed_shares WHERE month = ?')
      .bind(month),
  ])

  return json({
    bills: (billResult.results ?? []) as unknown as BillRow[],
    amounts: (amountResult.results ?? []) as unknown as AmountRow[],
    fixed: (fixedResult.results ?? []) as unknown as FixedRow[],
  })
}

// POST /api/bills  { name }  -> adds a bill type (rent, electricity, ...)
export const onRequestPost: PagesFunction<Env, string, AuthData> = async ({ request, env, waitUntil }) => {
  const body = await readJson<{ name?: unknown }>(request)
  const name = cleanBillName(body?.name)
  if (!name) return error('Please enter a bill name (1 to 60 characters).')

  const taken = await env.DB.prepare('SELECT 1 AS found FROM bills WHERE name = ? COLLATE NOCASE').bind(name).first()
  if (taken) return error('A bill with this name already exists.', 409)

  const row = await env.DB
    .prepare('INSERT INTO bills (id, name) VALUES (?, ?) RETURNING id, name')
    .bind(newId(), name)
    .first<BillRow>()
  if (!row) return error('Could not save the bill.', 500)

  waitUntil(notify(env, 'bills'))
  return json({ bill: row }, 201)
}