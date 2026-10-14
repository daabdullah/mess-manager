import type { AuthData, Env } from '../_types'
import {
  checkPassword,
  getCookie,
  hashPassword,
  SESSION_COOKIE,
  verifyPassword,
} from '../_auth'
import { error, json, readJson } from '../_utils'

export const onRequestPost: PagesFunction<Env, string, AuthData> = async ({ request, env, data }) => {
  const body = await readJson<{ currentPassword?: unknown; newPassword?: unknown }>(request)
  if (typeof body?.currentPassword !== 'string' || !body.currentPassword) {
    return error('Please enter your current password.')
  }
  const newPassword = body.newPassword
  const passwordError = checkPassword(newPassword)
  if (passwordError) return error(passwordError)

  const user = await env.DB
    .prepare('SELECT password_hash, password_salt, password_iterations FROM users WHERE id = ?')
    .bind(data.user.id)
    .first<{ password_hash: string; password_salt: string; password_iterations: number }>()
  if (!user) return error('User not found.', 404)

  const ok = await verifyPassword(body.currentPassword, {
    hash: user.password_hash,
    salt: user.password_salt,
    iterations: user.password_iterations,
  })
  if (!ok) return error('Current password is wrong.', 400)

  const { hash, salt, iterations } = await hashPassword(newPassword as string)
  const token = getCookie(request, SESSION_COOKIE) ?? ''
  await env.DB.batch([
    env.DB
      .prepare('UPDATE users SET password_hash = ?, password_salt = ?, password_iterations = ? WHERE id = ?')
      .bind(hash, salt, iterations, data.user.id),
    // Sign out all other devices, keep this one.
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND token <> ?').bind(data.user.id, token),
  ])
  return json({ ok: true })
}