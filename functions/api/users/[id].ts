import type { AuthData, Env } from '../../_types'
import { notify } from '../../_notify'
import { error, json } from '../../_utils'

export const onRequestDelete: PagesFunction<Env, 'id', AuthData> = async ({ env, params, data, waitUntil }) => {
  const id = String(params.id)
  if (id === data.user.id) return error('You cannot delete your own account.', 400)

  // A login that belongs to a member goes away together with the member (Members page), never alone.
  const linked = await env.DB.prepare('SELECT 1 AS found FROM users WHERE id = ? AND member_id IS NOT NULL').bind(id).first()
  if (linked) return error('This login belongs to a member. Delete the member instead.', 400)

  // Their sessions are removed too (ON DELETE CASCADE).
  const result = await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run()
  if (result.meta.changes === 0) return error('User not found.', 404)

  waitUntil(notify(env, 'users'))
  return json({ ok: true })
}