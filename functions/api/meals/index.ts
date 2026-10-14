import type { AuthData, Env } from '../../_types'
import { isMonth, isRealDate, nextMonth } from '../../_month'
import { notify } from '../../_notify'
import { error, json, newId, readJson } from '../../_utils'

const MAX_ROWS = 100 // D1 allows 100 bound values per query; the member check below uses one per row
const MAX_COUNT = 20 // meals per member per day

interface MealRow {
  member_id: string
  date: string
  count: number
}

// A meal count: up to 2 decimals, 0 to 20. Empty / null / missing = 0 (remove the row).
// Returns null when the value is not acceptable.
function parseCount(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return 0
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > MAX_COUNT) return null
  const hundredths = Math.round(value * 100)
  if (Math.abs(value * 100 - hundredths) > 1e-6) return null // more than 2 decimals
  return hundredths / 100
}

// GET /api/meals?month=YYYY-MM-01 -> { meals: [{ member_id, date, count }] }
// One indexed query (idx_meals_date) for the whole month.
export const onRequestGet: PagesFunction<Env, string, AuthData> = async ({ request, env }) => {
  const month = new URL(request.url).searchParams.get('month')
  if (!isMonth(month)) return error('Month must look like 2026-10-01.')

  const { results } = await env.DB
    .prepare('SELECT member_id, date, count FROM meals WHERE date >= ? AND date < ? ORDER BY date')
    .bind(month, nextMonth(month))
    .all<MealRow>()
  return json({ meals: results })
}

// PUT /api/meals  { date, rows: [{ member_id, count }] }
// Saves a whole day. Each member's row for that date is inserted or updated (one row per
// member and day, enforced by UNIQUE (member_id, date)). An empty or 0 count removes the row.
// Members not listed in rows are left untouched.
export const onRequestPut: PagesFunction<Env, string, AuthData> = async ({ request, env, waitUntil }) => {
  const body = await readJson<{ date?: unknown; rows?: unknown }>(request)
  if (!body) return error('Invalid request.')

  const date = typeof body.date === 'string' ? body.date : ''
  if (!isRealDate(date)) return error('Please choose a valid date.')
  if (!Array.isArray(body.rows)) return error('Rows must be a list.')
  if (body.rows.length > MAX_ROWS) return error(`Too many rows (at most ${MAX_ROWS}).`)

  // member_id -> count (0 = remove). If a member is listed twice, the last row wins.
  const wanted = new Map<string, number>()
  for (const row of body.rows as ({ member_id?: unknown; count?: unknown } | null)[]) {
    const memberId = typeof row?.member_id === 'string' ? row.member_id.trim() : ''
    if (!memberId || memberId.length > 100) return error('Every row needs a member.')
    const count = parseCount(row?.count)
    if (count === null) return error(`Meal counts must be numbers from 0 to ${MAX_COUNT} with at most 2 decimals.`)
    wanted.set(memberId, count)
  }

  const toSave = [...wanted].filter(([, count]) => count > 0)
  const toRemove = [...wanted].filter(([, count]) => count === 0).map(([id]) => id)

  // Every member we save for must exist (the placeholders are only "?", values are bound).
  if (toSave.length > 0) {
    const ids = toSave.map(([id]) => id)
    const { results } = await env.DB
      .prepare(`SELECT id FROM members WHERE id IN (${ids.map(() => '?').join(', ')})`)
      .bind(...ids)
      .all<{ id: string }>()
    if (results.length !== ids.length) return error('Member not found.', 404)
  }

  const statements = [
    ...toSave.map(([memberId, count]) =>
      env.DB
        .prepare(
          'INSERT INTO meals (id, member_id, date, count) VALUES (?, ?, ?, ?) ON CONFLICT (member_id, date) DO UPDATE SET count = excluded.count',
        )
        .bind(newId(), memberId, date, count),
    ),
    ...toRemove.map((memberId) =>
      env.DB.prepare('DELETE FROM meals WHERE member_id = ? AND date = ?').bind(memberId, date),
    ),
  ]
  if (statements.length === 0) return json({ ok: true, saved: 0, removed: 0 })

  await env.DB.batch(statements)

  waitUntil(notify(env, 'meals'))
  return json({ ok: true, saved: toSave.length, removed: toRemove.length })
}