import type { AuthData, Env } from '../../_types'
import { parseBazarBody } from '../../_bazar'
import { notify } from '../../_notify'
import { error, json, newId, readJson } from '../../_utils'

// PUT /api/bazar/:id  { member_id, date, amount, lines?: [{ item, price }] }
// Same body as POST. The entry is updated and its lines are REPLACED (old ones deleted,
// new ones inserted) in one batch. Send no lines to remove all details and use the amount.
export const onRequestPut: PagesFunction<Env, 'id', AuthData> = async ({ request, env, params, waitUntil }) => {
  const id = String(params.id)
  const parsed = parseBazarBody(await readJson(request))
  if (!parsed.ok) return error(parsed.message)
  const { member_id, date, amount_cents, items } = parsed.value

  const entry = await env.DB.prepare('SELECT 1 AS found FROM bazar_entries WHERE id = ?').bind(id).first()
  if (!entry) return error('Entry not found.', 404)
  const member = await env.DB.prepare('SELECT 1 AS found FROM members WHERE id = ?').bind(member_id).first()
  if (!member) return error('Member not found.', 404)

  const amount = amount_cents / 100
  const savedItems = items.map((item) => ({ id: newId(), item_name: item.item_name, price: item.cents / 100 }))

  await env.DB.batch([
    env.DB
      .prepare('UPDATE bazar_entries SET member_id = ?, date = ?, amount = ? WHERE id = ?')
      .bind(member_id, date, amount, id),
    env.DB.prepare('DELETE FROM bazar_items WHERE entry_id = ?').bind(id),
    ...savedItems.map((item) =>
      env.DB
        .prepare('INSERT INTO bazar_items (id, entry_id, item_name, price) VALUES (?, ?, ?, ?)')
        .bind(item.id, id, item.item_name, item.price),
    ),
  ])

  waitUntil(notify(env, 'bazar'))
  return json({ entry: { id, member_id, date, amount, items: savedItems } })
}

// DELETE /api/bazar/:id  (its lines are deleted with it: ON DELETE CASCADE)
export const onRequestDelete: PagesFunction<Env, 'id', AuthData> = async ({ env, params, waitUntil }) => {
  const result = await env.DB.prepare('DELETE FROM bazar_entries WHERE id = ?').bind(String(params.id)).run()
  if (result.meta.changes === 0) return error('Entry not found.', 404)

  waitUntil(notify(env, 'bazar'))
  return json({ ok: true })
}