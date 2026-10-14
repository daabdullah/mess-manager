// Helpers shared by the /api/members routes.

export interface MemberRow {
  id: string
  name: string
  active: number // 0 or 1 in the database
  created_at: string
  email?: string | null // the member's login email (from the users table)
}

// What the API sends to the browser: active is a real true/false.
export function toMember(row: MemberRow) {
  return { id: row.id, name: row.name, active: row.active === 1, created_at: row.created_at, email: row.email ?? null }
}

// A member name: text, spaces trimmed (and doubled spaces squeezed), 1 to 60 characters.
export function cleanName(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const name = value.trim().replace(/\s+/g, ' ')
  return name.length >= 1 && name.length <= 60 ? name : null
}