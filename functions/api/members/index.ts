import type { AuthData, Env } from '../../_types'
import { checkPassword, hashPassword, normalizeEmail } from '../../_auth'
import { cleanName, toMember, type MemberRow } from '../../_members'
import { notify } from '../../_notify'
import { error, json, newId, readJson } from '../../_utils'

export const onRequestGet: PagesFunction<Env, string, AuthData> = async ({ env }) => {
  const { results } = await env.DB
    .prepare(
      `SELECT m.id, m.name, m.active, m.created_at, u.email
       FROM members m LEFT JOIN users u ON u.member_id = m.id
       ORDER BY m.name COLLATE NOCASE, m.created_at`,
    )
    .all<MemberRow>()
  return json({ members: results.map(toMember) })
}

// POST { name, email, password } adds a member AND their login in one step (a member always has a login).
// One member = one account: if the name already belongs to an inactive member, that same member comes back
// (with their kept history and login). A member without a login (added before this feature) gets one here.
export const onRequestPost: PagesFunction<Env, string, AuthData> = async ({ request, env, waitUntil }) => {
  const body = await readJson<{ name?: unknown; email?: unknown; password?: unknown }>(request)
  const name = cleanName(body?.name)
  if (!name) return error('Please enter a name (1 to 60 characters).')

  const existing = await env.DB
    .prepare('SELECT id, name, active, created_at FROM members WHERE name = ? COLLATE NOCASE')
    .bind(name)
    .first<MemberRow>()
  const hasLogin = existing
    ? !!(await env.DB.prepare('SELECT 1 AS found FROM users WHERE member_id = ?').bind(existing.id).first())
    : false
  if (existing && existing.active === 1 && hasLogin) return error('A member with this name already exists.', 409)

  const memberId = existing?.id ?? newId()
  const statements: D1PreparedStatement[] = []

  if (!existing) {
    statements.push(env.DB.prepare('INSERT INTO members (id, name) VALUES (?, ?)').bind(memberId, name))
  } else if (existing.active === 0) {
    statements.push(env.DB.prepare('UPDATE members SET active = 1 WHERE id = ?').bind(memberId))
  }

  if (!hasLogin) {
    const email = normalizeEmail(body?.email)
    if (!email) return error('Please enter a valid email address for this member.')
    const password = body?.password
    const passwordError = checkPassword(password)
    if (passwordError) return error(passwordError)
    const taken = await env.DB.prepare('SELECT 1 AS found FROM users WHERE email = ?').bind(email).first()
    if (taken) return error('A user with this email already exists.', 409)

    const { hash, salt, iterations } = await hashPassword(password as string)
    statements.push(
      env.DB
        .prepare('INSERT INTO users (id, email, password_hash, password_salt, password_iterations, member_id) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(newId(), email, hash, salt, iterations, memberId),
    )
  }

  try {
    await env.DB.batch(statements) // all or nothing: never a member without a login
  } catch {
    return error('A user with this email already exists.', 409)
  }

  const row = await env.DB
    .prepare('SELECT m.id, m.name, m.active, m.created_at, u.email FROM members m LEFT JOIN users u ON u.member_id = m.id WHERE m.id = ?')
    .bind(memberId)
    .first<MemberRow>()
  if (!row) return error('Could not save the member.', 500)

  waitUntil(Promise.all([notify(env, 'members'), notify(env, 'users')]))
  return json({ member: toMember(row), restored: !!existing }, existing ? 200 : 201)
}
