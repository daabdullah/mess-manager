import type { AuthData, Env } from '../../_types'
import { json } from '../../_utils'

// Logins are created on the Members page (a member and their login are added together),
// so this route only lists them.
export const onRequestGet: PagesFunction<Env, string, AuthData> = async ({ env }) => {
  const { results } = await env.DB
    .prepare(
      `SELECT u.id, u.email, u.member_id, u.created_at, m.name AS member_name
       FROM users u LEFT JOIN members m ON m.id = u.member_id
       ORDER BY u.created_at, u.email`,
    )
    .all()
  return json({ users: results })
}
