import type { AuthData, Env } from '../_types'
import { json } from '../_utils'

// The middleware already looked up the session, so this costs nothing extra.
export const onRequestGet: PagesFunction<Env, string, AuthData> = async ({ data }) => {
  return json({ user: data.user })
}