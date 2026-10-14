export interface Env {
  DB: D1Database
  HUB: DurableObjectNamespace
}

// The logged-in user, put on `data` by functions/api/_middleware.ts
export interface AuthUser {
  id: string
  email: string
  member_id: string | null // the member this login belongs to, if any
}
export type AuthData = { user: AuthUser }