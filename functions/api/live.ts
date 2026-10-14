import type { AuthData, Env } from '../_types'
import { error } from '../_utils'

// Browsers open a WebSocket here. The session middleware has already checked the login.
// We pass the connection on to the one Hub instance.
export const onRequestGet: PagesFunction<Env, string, AuthData> = async ({ request, env }) => {
  if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
    return error('Expected a WebSocket connection.', 426)
  }
  const stub = env.HUB.get(env.HUB.idFromName('main'))
  return stub.fetch(request)
}