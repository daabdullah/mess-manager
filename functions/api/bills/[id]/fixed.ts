import type { AuthData, Env } from '../../../_types'
import { parseMonthField, parseWholeTaka } from '../../../_bills'
import { notify } from '../../../_notify'
import { error, json, newId, readJson } from '../../../_utils'

// PUT /api/bills/:id/fixed  { month, member_id, amount }
// Sets a fixed share for one member of this bill in that month (upsert). The rest of the
// bill is split among the other members.
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
// Removes the fixed share: the member goes back to the equal split.
export const onRequestDelete: PagesFunction<Env, 'id', AuthData> = async ({ request, env, params, waitUntil }) => {
  const url = new URL(request.url)
  const month = parseMonthField(url.searchParams.get('month'))
  if (!month) return error('Month must look like 2026-10-01.')
  const memberId = url.searchParams.get('member_id') ?? ''
  if (!memberId) return error('Please choose a member.')

  const result = await env.DB
    .prepare('DELETE FROM bill_fixed_shares WHERE bill_id = ? AND month = ? AND member_id = ?')
    .bind(String(params.id), month, memberId)
    .run()
  if (result.meta.changes === 0) return error('Fixed amount not found.', 404)

  waitUntil(notify(env, 'bills'))
  return json({ ok: true })
}