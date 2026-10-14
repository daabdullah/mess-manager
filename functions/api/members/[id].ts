import type { AuthData, Env } from '../../_types'
import { cleanName, toMember, type MemberRow } from '../../_members'
import { isRealDate, nextMonth } from '../../_month'
import { notify } from '../../_notify'
import { error, json, readJson } from '../../_utils'

// Rename and/or switch active on or off. Send only what changes: { name } or { active } or both.
export const onRequestPut: PagesFunction<Env, 'id', AuthData> = async ({ request, env, params, waitUntil }) => {
  const id = String(params.id)
  const body = await readJson<{ name?: unknown; active?: unknown }>(request)
  if (!body) return error('Invalid request.')

  let name: string | null = null
  if (body.name !== undefined) {
    name = cleanName(body.name)
    if (!name) return error('Please enter a name (1 to 60 characters).')
  }
  let active: number | null = null
  if (body.active !== undefined) {
    if (typeof body.active !== 'boolean') return error('Active must be true or false.')
    active = body.active ? 1 : 0
  }
  if (name === null && active === null) return error('Nothing to change.')

  if (name !== null) {
    const taken = await env.DB
      .prepare('SELECT 1 AS found FROM members WHERE name = ? COLLATE NOCASE AND id <> ?')
      .bind(name, id)
      .first()
    if (taken) return error('A member with this name already exists.', 409)
  }

  const row = await env.DB
    .prepare(
      'UPDATE members SET name = COALESCE(?, name), active = COALESCE(?, active) WHERE id = ? RETURNING id, name, active, created_at',
    )
    .bind(name, active, id)
    .first<MemberRow>()
  if (!row) return error('Member not found.', 404)

  waitUntil(notify(env, 'members'))
  return json({ member: toMember(row) })
}

// DELETE /api/members/:id?mode=keep_until|keep_month|all&date=YYYY-MM-DD
//   keep_until - keep the member's data before `date`; delete `date` and everything after it.
//                The member stays (inactive) so the kept history still shows.
//   keep_month - keep the member's data of earlier months; delete the whole month of `date` and later.
//                The member stays (inactive).
//   all        - delete the member, their login and all their data in every month (no date needed).
// "Their data" = bazar entries (and items), meals, accessories they paid, fixed bill shares.
export const onRequestDelete: PagesFunction<Env, 'id', AuthData> = async ({ request, env, params, data, waitUntil }) => {
  const id = String(params.id)
  const url = new URL(request.url)
  const mode = url.searchParams.get('mode')
  const date = url.searchParams.get('date') ?? ''

  if (mode !== 'keep_until' && mode !== 'keep_month' && mode !== 'all') return error('Choose what to delete.')
  if (mode !== 'all' && !isRealDate(date)) return error('Please choose a valid date.')

  const exists = await env.DB.prepare('SELECT 1 AS found FROM members WHERE id = ?').bind(id).first()
  if (!exists) return error('Member not found.', 404)

  // Deleting your own member would delete the login you are using.
  if (mode === 'all' && (await env.DB.prepare('SELECT 1 AS found FROM users WHERE id = ? AND member_id = ?').bind(data.user.id, id).first())) {
    return error('You cannot delete your own member. Ask another member to do it.')
  }

  // dateFrom: entries dated on/after this are deleted. monthFrom: fixed bill shares of this month and later are deleted.
  let dateFrom = '0000-01-01'
  let monthFrom = '0000-01-01'
  if (mode !== 'all') {
    const monthStart = `${date.slice(0, 7)}-01`
    if (mode === 'keep_month') {
      dateFrom = monthStart
      monthFrom = monthStart
    } else {
      dateFrom = date
      // Bill shares are per month: keep the leave month's share (they lived there till the day before),
      // unless the leave date is the 1st, then that month has none of their days.
      monthFrom = date.endsWith('-01') ? monthStart : nextMonth(monthStart)
    }
  }

  await env.DB.batch([
    env.DB
      .prepare('DELETE FROM bazar_items WHERE entry_id IN (SELECT id FROM bazar_entries WHERE member_id = ? AND date >= ?)')
      .bind(id, dateFrom),
    env.DB.prepare('DELETE FROM bazar_entries WHERE member_id = ? AND date >= ?').bind(id, dateFrom),
    env.DB.prepare('DELETE FROM meals WHERE member_id = ? AND date >= ?').bind(id, dateFrom),
    env.DB.prepare('DELETE FROM accessories WHERE paid_by = ? AND date >= ?').bind(id, dateFrom),
    env.DB.prepare('DELETE FROM bill_fixed_shares WHERE member_id = ? AND month >= ?').bind(id, monthFrom),
    // the login goes only with option 3; options 1 and 2 keep the member (inactive) and their login
    ...(mode === 'all'
      ? [env.DB.prepare('DELETE FROM users WHERE member_id = ?').bind(id), env.DB.prepare('DELETE FROM members WHERE id = ?').bind(id)]
      : [env.DB.prepare('UPDATE members SET active = 0 WHERE id = ?').bind(id)]),
  ])

  waitUntil(Promise.all(['members', 'bazar', 'meals', 'accessories', 'bills'].map((topic) => notify(env, topic))))
  return json({ ok: true })
}
