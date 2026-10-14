import type { Env } from '../_types'
import { createSession, fakeVerify, sessionCookie, verifyPassword } from '../_auth'
import { error, json, readJson } from '../_utils'

const WRONG = 'Wrong email or password.'

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await readJson<{ email?: unknown; password?: unknown }>(request)
  if (typeof body?.email !== 'string' || typeof body?.password !== 'string') {
    return error('Please enter your email and password.')
  }
  const email = body.email.trim().toLowerCase()
  const password = body.password

  const user = await env.DB
    .prepare('SELECT id, email, member_id, password_hash, password_salt, password_iterations FROM users WHERE email = ?')
    .bind(email)
    .first<{
      id: string
      email: string
      member_id: string | null
      password_hash: string
      password_salt: string
      password_iterations: number
    }>()

  // Exactly one hash per login, whether or not the email exists. Same message for both.
  if (!user) {
    await fakeVerify(password)
    return error(WRONG, 401)
  }
  const ok = await verifyPassword(password, {
    hash: user.password_hash,
    salt: user.password_salt,
    iterations: user.password_iterations,
  })
  if (!ok) return error(WRONG, 401)

  const token = await createSession(env.DB, user.id)
  return json({ user: { id: user.id, email: user.email, member_id: user.member_id } }, 200, {
    'Set-Cookie': sessionCookie(request, token),
  })
}