import type { AuthData, Env } from '../../_types'
import { notify } from '../../_notify'
import { error, json } from '../../_utils'

// DELETE /api/bills/:id
// Deletes the bill type. Its amounts (every month) and fixed shares go with it (ON DELETE CASCADE).
export const onRequestDelete: PagesFunction<Env, 'id', AuthData> = async ({ env, params, waitUntil }) => {
  const result = await env.DB.prepare('DELETE FROM bills WHERE id = ?').bind(String(params.id)).run()
  if (result.meta.changes === 0) return error('Bill not found.', 404)

  waitUntil(notify(env, 'bills'))
  return json({ ok: true })
}