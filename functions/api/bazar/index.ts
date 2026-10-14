import type { AuthData, Env } from '../../_types'
import { parseBazarBody } from '../../_bazar'
import { notify } from '../../_notify'
import { error, json, newId, readJson } from '../../_utils'

interface EntryRow {
  id: string
  member_id: string
  date: string
  amount: number
}
interface ItemRow {
  id: string
  entry_id: string
  item_name: string
  price: number
}

// 'YYYY-MM-01' and a real month.
function isMonth(value: string | null): value is string {
  return !!value && /^\d{4}-(0[1-9]|1[0-2])-01$/.test(value) && value >= '2000-01-01' && value <= '2100-12-01'
}

// '2026-12-01' -> '2027-01-01' (plain text compare then finds every date in the month)
function nextMonth(month: string): string {
  const year = Number(month.slice(0, 4))
  const m = Number(month.slice(5, 7))
  return m === 12 ? `${year + 1}-01-01` : `${month.slice(0, 5)}${String(m + 1).padStart(2, '0')}-01`
}

// GET /api/bazar?month=YYYY-MM-01
// Everything for the month in ONE call: two queries in one batch (entries, then all their lines).
export const onRequestGet: PagesFunction<Env, string, AuthData> = async ({ request, env }) => {
  const month = new URL(request.url).searchParams.get('month')
  if (!isMonth(month)) return error('Month must look like 2026-10-01.')
  const end = nextMonth(month)

  const [entryResult, itemResult] = await env.DB.batch([
    env.DB
      .prepare('SELECT id, member_id, date, amount FROM bazar_entries WHERE date >= ? AND date < ? ORDER BY date, rowid')
      .bind(month, end),
    env.DB
      .prepare(
        `SELECT i.id, i.entry_id, i.item_name, i.price
         FROM bazar_items i JOIN bazar_entries e ON e.id = i.entry_id
         WHERE e.date >= ? AND e.date < ? ORDER BY i.rowid`,
      )
      .bind(month, end),
  ])

  const itemsByEntry = new Map<string, { id: string; item_name: string; price: number }[]>()
  for (const item of (itemResult.results ?? []) as unknown as ItemRow[]) {
    const list = itemsByEntry.get(item.entry_id) ?? []
    list.push({ id: item.id, item_name: item.item_name, price: item.price })
    itemsByEntry.set(item.entry_id, list)
  }

  const entries = ((entryResult.results ?? []) as unknown as EntryRow[]).map((entry) => ({
    ...entry,
    items: itemsByEntry.get(entry.id) ?? [],
  }))
  return json({ entries })
}

// POST /api/bazar  { member_id, date, amount, lines?: [{ item, price }] }
// Saves one entry and its detail lines together. With lines, the amount is their sum
// (the amount sent is ignored); without lines, the amount sent is used.
export const onRequestPost: PagesFunction<Env, string, AuthData> = async ({ request, env, waitUntil }) => {
  const parsed = parseBazarBody(await readJson(request))
  if (!parsed.ok) return error(parsed.message)
  const { member_id, date, amount_cents, items } = parsed.value

  const member = await env.DB.prepare('SELECT 1 AS found FROM members WHERE id = ?').bind(member_id).first()
  if (!member) return error('Member not found.', 404)

  const entryId = newId()
  const amount = amount_cents / 100
  const savedItems = items.map((item) => ({ id: newId(), item_name: item.item_name, price: item.cents / 100 }))

  // One batch = one transaction: the entry and all its lines are saved, or none of them.
  await env.DB.batch([
    env.DB
      .prepare('INSERT INTO bazar_entries (id, member_id, date, amount) VALUES (?, ?, ?, ?)')
      .bind(entryId, member_id, date, amount),
    ...savedItems.map((item) =>
      env.DB
        .prepare('INSERT INTO bazar_items (id, entry_id, item_name, price) VALUES (?, ?, ?, ?)')
        .bind(item.id, entryId, item.item_name, item.price),
    ),
  ])

  waitUntil(notify(env, 'bazar'))
  return json({ entry: { id: entryId, member_id, date, amount, items: savedItems } }, 201)
}