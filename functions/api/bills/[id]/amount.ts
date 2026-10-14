import type { AuthData, Env } from '../../../_types'
import { parseMonthField, parseWholeTaka } from '../../../_bills'
import { notify } from '../../../_notify'
import { error, json, newId, readJson } from '../../../_utils'

// PUT /api/bills/:id/amount  { month: 'YYYY-MM-01', amount }
// Saves the bill's amount from that month on. One row per bill and month (upsert), so saving
// again changes it. Only this month's row is touched: earlier months never change, and a
// later month that has its own amount keeps it.
export const onRequestPut: PagesFunction<Env, 'id', AuthData> = async ({ request, env, params, waitUntil }) => {
  const id = String(params.id)
  const body = await readJson<{ month?: unknown; amount?: unknown }>(request)

  const month = parseMonthField(body?.month)
  if (!month) return error('Month must look like 2026-10-01.')
  const amount = parseWholeTaka(body?.amount)
  if (amount === null) return error('Please enter a whole amount in taka (0 or more).')

  const bill = await env.DB.prepare('SELECT 1 AS found FROM bills WHERE id = ?').bind(id).first()
  if (!bill) return error('Bill not found.', 404)

  await env.DB
    .prepare(
      'INSERT INTO bill_amounts (id, bill_id, effective_month, amount) VALUES (?, ?, ?, ?) ON CONFLICT (bill_id, effective_month) DO UPDATE SET amount = excluded.amount',
    )
    .bind(newId(), id, month, amount)
    .run()

  waitUntil(notify(env, 'bills'))
  return json({ ok: true, bill_id: id, effective_month: month, amount })
}