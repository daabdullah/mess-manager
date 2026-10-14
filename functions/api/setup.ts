import type { Env } from '../_types'
import { checkPassword, createSession, hashPassword, normalizeEmail, sessionCookie } from '../_auth'
import { cleanName } from '../_members'
import { error, json, newId, readJson } from '../_utils'

// Creates the very first member and their login together. Only works while the users table is empty.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await readJson<{ name?: unknown; email?: unknown; password?: unknown }>(request)
  const name = cleanName(body?.name)
  if (!name) return error('Please enter your name (1 to 60 characters).')
  const email = normalizeEmail(body?.email)
  if (!email) return error('Please enter a valid email address.')
  const password = body?.password
  const passwordError = checkPassword(password)
  if (passwordError) return error(passwordError)

  const existing = await env.DB.prepare('SELECT 1 AS found FROM users LIMIT 1').first()
  if (existing) return error('Setup is already done. Please sign in.', 403)

  const memberId = newId()
  const id = newId()
  const { hash, salt, iterations } = await hashPassword(password as string)

  // One batch = all or nothing. The WHERE NOT EXISTS makes sure two quick requests cannot both create a first user.
  const results = await env.DB.batch([
    env.DB.prepare('INSERT INTO members (id, name) SELECT ?, ? WHERE NOT EXISTS (SELECT 1 FROM users)').bind(memberId, name),
    env.DB
      .prepare(
        `INSERT INTO users (id, email, password_hash, password_salt, password_iterations, member_id)
         SELECT ?, ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM users)`,
      )
      .bind(id, email, hash, salt, iterations, memberId),
  ])
  if (results[1].meta.changes !== 1) return error('Setup is already done. Please sign in.', 403)

  const token = await createSession(env.DB, id)
  return json({ user: { id, email, member_id: memberId } }, 201, { 'Set-Cookie': sessionCookie(request, token) })
}
