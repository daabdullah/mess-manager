import type { AuthData, Env } from '../../../_types'
import { FIXED_CLEARED, parseMonthField, parseWholeTaka } from '../../../_bills'
import { notify } from '../../../_notify'
import { error, json, newId, readJson } from '../../../_utils'

// PUT /api/bills/:id/fixed  { month, member_id, amount }
// Sets a fixed share for one member of this bill from that month on (upsert). It carries
// into later months until a later month sets a new one. The rest of the bill is split
// among the other members.
export const onRequestPut: PagesFunction<Env, 'id', AuthData> = async ({ request, env, params, waitUntil }) => {
  const id = String(params.id)
  const body = await readJson<{ month?: unknown; member_id?: unknown; amount?: unknown }>(request)

  const month = parseMonthField(body?.month)
  if (!month) return error('Month must look like 2026-10-01.')
  const memberId = typeof body?.member_id === 'string' ? body.member_id.trim() : ''
  if (!memberId || memberId.length > 100) return error('Please choose a member.')
  const amount = parseWholeTaka(body?.amount)
  if (amount === null) return error('Please enter a whole amount in taka (0 or more).')

  const bill = await env.DB.prepare('SELECT 1 AS found FROM bills WHERE id = ?').bind(id).first()
  if (!bill) return error('Bill not found.', 404)
  const member = await env.DB.prepare('SELECT 1 AS found FROM members WHERE id = ?').bind(memberId).first()
  if (!member) return error('Member not found.', 404)

  await env.DB
    .prepare(
      'INSERT INTO bill_fixed_shares (id, bill_id, month, member_id, fixed_amount) VALUES (?, ?, ?, ?, ?) ON CONFLICT (bill_id, month, member_id) DO UPDATE SET fixed_amount = excluded.fixed_amount',
    )
    .bind(newId(), id, month, memberId, amount)
    .run()

  waitUntil(notify(env, 'bills'))
  return json({ ok: true, bill_id: id, month, member_id: memberId, fixed_amount: amount })
}

// DELETE /api/bills/:id/fixed?month=YYYY-MM-01&member_id=...
// Ends the fixed share from that month on: the member goes back to the equal split. Earlier
// months keep their share. If the share was carried over from an earlier month, a "cleared"
// row (-1) stops it here.
export const onRequestDelete: PagesFunction<Env, 'id', AuthData> = async ({ request, env, params, waitUntil }) => {
  const url = new URL(request.url)
  const month = parseMonthField(url.searchParams.get('month'))
  if (!month) return error('Month must look like 2026-10-01.')
  const memberId = url.searchParams.get('member_id') ?? ''
  if (!memberId) return error('Please choose a member.')
  const id = String(params.id)

  // The share that applies now (latest row at or before the month).
  const current = await env.DB
    .prepare('SELECT month, fixed_amount FROM bill_fixed_shares WHERE bill_id = ? AND member_id = ? AND month <= ? ORDER BY month DESC LIMIT 1')
    .bind(id, memberId, month)
    .first<{ month: string; fixed_amount: number }>()
  if (!current || current.fixed_amount < 0) return error('Fixed amount not found.', 404)

  // Is there an earlier fixed share that would otherwise carry into this month?
  const earlier = await env.DB
    .prepare('SELECT fixed_amount FROM bill_fixed_shares WHERE bill_id = ? AND member_id = ? AND month < ? ORDER BY month DESC LIMIT 1')
    .bind(id, memberId, month)
    .first<{ fixed_amount: number }>()
  const needsMarker = !!earlier && earlier.fixed_amount >= 0

  if (needsMarker) {
    await env.DB
      .prepare(
        'INSERT INTO bill_fixed_shares (id, bill_id, month, member_id, fixed_amount) VALUES (?, ?, ?, ?, ?) ON CONFLICT (bill_id, month, member_id) DO UPDATE SET fixed_amount = excluded.fixed_amount',
      )
      .bind(newId(), id, month, memberId, FIXED_CLEARED)
      .run()
  } else {
    await env.DB.prepare('DELETE FROM bill_fixed_shares WHERE bill_id = ? AND month = ? AND member_id = ?').bind(id, month, memberId).run()
  }

  waitUntil(notify(env, 'bills'))
  return json({ ok: true })
}
