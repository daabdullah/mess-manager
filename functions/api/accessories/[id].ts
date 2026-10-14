import type { AuthData, Env } from '../../_types'
import { parseAccessoryBody, type AccessoryRow } from '../../_accessories'
import { notify } from '../../_notify'
import { error, json, readJson } from '../../_utils'

// PUT /api/accessories/:id  { date, item, amount, paid_by }  (same body as POST)
export const onRequestPut: PagesFunction<Env, 'id', AuthData> = async ({ request, env, params, waitUntil }) => {
  const parsed = parseAccessoryBody(await readJson(request))
  if (!parsed.ok) return error(parsed.message)
  const { date, item, amount, paid_by } = parsed.value

  const member = await env.DB.prepare('SELECT 1 AS found FROM members WHERE id = ?').bind(paid_by).first()
  if (!member) return error('Member not found.', 404)

  const row = await env.DB
    .prepare('UPDATE accessories SET date = ?, item = ?, amount = ?, paid_by = ? WHERE id = ? RETURNING id, date, item, amount, paid_by')
    .bind(date, item, amount, paid_by, String(params.id))
    .first<AccessoryRow>()
  if (!row) return error('Accessory not found.', 404)

  waitUntil(notify(env, 'accessories'))
  return json({ accessory: row })
}

// DELETE /api/accessories/:id
export const onRequestDelete: PagesFunction<Env, 'id', AuthData> = async ({ env, params, waitUntil }) => {
  const result = await env.DB.prepare('DELETE FROM accessories WHERE id = ?').bind(String(params.id)).run()
  if (result.meta.changes === 0) return error('Accessory not found.', 404)

  waitUntil(notify(env, 'accessories'))
  return json({ ok: true })
}