import type { Env } from '../_types'
import { clearSessionCookie, deleteSession, getCookie, SESSION_COOKIE } from '../_auth'
import { json } from '../_utils'

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const token = getCookie(request, SESSION_COOKIE)
  if (token) await deleteSession(env.DB, token)
  return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie(request) })
}