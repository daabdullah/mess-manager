import type { Env } from '../_types'
import { json } from '../_utils'

// Tells the Login page whether to show "Create first account".
export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const row = await env.DB.prepare('SELECT 1 AS found FROM users LIMIT 1').first()
  return json({ needsSetup: !row })
}