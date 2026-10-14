import type { AuthData, Env } from '../_types'
import { isMonth } from '../_month'
import { notify } from '../_notify'
import { error, json, newId, readJson } from '../_utils'

// GET /api/month-status?month=YYYY-MM-01 -> { month, is_closed }
// One lookup by month (the UNIQUE index on month_status.month). No row = the month is open.
export const onRequestGet: PagesFunction<Env, string, AuthData> = async ({ request, env }) => {
  const month = new URL(request.url).searchParams.get('month')
  if (!isMonth(month)) return error('Month must look like 2026-10-01.')

  const row = await env.DB.prepare('SELECT is_closed FROM month_status WHERE month = ?').bind(month).first<{ is_closed: number }>()
  return json({ month, is_closed: row?.is_closed === 1 })
}

// PUT /api/month-status  { month, is_closed }
// Closes (true) or unlocks (false) a month. One row per month (upsert). This is a soft lock:
// it only marks the month, the other routes still accept changes.
export const onRequestPut: PagesFunction<Env, string, AuthData> = async ({ request, env, waitUntil }) => {
  const body = await readJson<{ month?: unknown; is_closed?: unknown }>(request)
  const month = typeof body?.month === 'string' ? body.month : null
  if (!isMonth(month)) return error('Month must look like 2026-10-01.')
  if (typeof body?.is_closed !== 'boolean') return error('is_closed must be true or false.')

  await env.DB
    .prepare(
      'INSERT INTO month_status (id, month, is_closed) VALUES (?, ?, ?) ON CONFLICT (month) DO UPDATE SET is_closed = excluded.is_closed',
    )
    .bind(newId(), month, body.is_closed ? 1 : 0)
    .run()

  waitUntil(notify(env, 'month_status'))
  return json({ ok: true, month, is_closed: body.is_closed })
}
