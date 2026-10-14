import type { AuthData, Env } from '../_types'
import { deleteExpiredSessions, getCookie, getSession, SESSION_COOKIE } from '../_auth'
import { error } from '../_utils'

const PUBLIC_PATHS = new Set(['/api/login', '/api/setup', '/api/setup-status'])

export const onRequest: PagesFunction<Env, string, AuthData> = async (context) => {
  const { request, env, next, data, waitUntil } = context
  const path = new URL(request.url).pathname.replace(/\/+$/, '')

  try {
    if (PUBLIC_PATHS.has(path)) return await next()

    const token = getCookie(request, SESSION_COOKIE)
    const user = token ? await getSession(env.DB, token) : null
    if (!user) return error('Please sign in.', 401)
    data.user = user

    // Clean up expired sessions now and then (about 1 request in 50), not on every request.
    if (Math.random() < 0.02) waitUntil(deleteExpiredSessions(env.DB).catch(() => {}))

    return await next()
  } catch (err) {
    console.error(err)
    return error('Something went wrong on the server.', 500)
  }
}