import type { AuthData, Env } from '../../_types'
import { parseAccessoryBody, type AccessoryRow } from '../../_accessories'
import { isMonth, nextMonth } from '../../_month'
import { notify } from '../../_notify'
import { error, json, newId, readJson } from '../../_utils'

// GET /api/accessories?month=YYYY-MM-01 -> { accessories: [{ id, date, item, amount, paid_by }] }
// One indexed query (idx_accessories_date) for the whole month.
export const onRequestGet: PagesFunction<Env, string, AuthData> = async ({ request, env }) => {
  const month = new URL(request.url).searchParams.get('month')
  if (!isMonth(month)) return error('Month must look like 2026-10-01.')

  const { results } = await env.DB
    .prepare('SELECT id, date, item, amount, paid_by FROM accessories WHERE date >= ? AND date < ? ORDER BY date, rowid')
    .bind(month, nextMonth(month))
    .all<AccessoryRow>()
  return json({ accessories: results })
}

// POST /api/accessories  { date, item, amount, paid_by }
export const onRequestPost: PagesFunction<Env, string, AuthData> = async ({ request, env, waitUntil }) => {
  const parsed = parseAccessoryBody(await readJson(request))
  if (!parsed.ok) return error(parsed.message)
  const { date, item, amount, paid_by } = parsed.value

  const member = await env.DB.prepare('SELECT 1 AS found FROM members WHERE id = ?').bind(paid_by).first()
  if (!member) return error('Member not found.', 404)

  const row = await env.DB
    .prepare('INSERT INTO accessories (id, date, item, amount, paid_by) VALUES (?, ?, ?, ?, ?) RETURNING id, date, item, amount, paid_by')
    .bind(newId(), date, item, amount, paid_by)
    .first<AccessoryRow>()
  if (!row) return error('Could not save the accessory.', 500)

  waitUntil(notify(env, 'accessories'))
  return json({ accessory: row }, 201)
}