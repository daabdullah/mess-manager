import type { AuthUser } from './_types'

export const PBKDF2_ITERATIONS = 20000 // low on purpose: free plan = 10 ms CPU per request
export const SESSION_COOKIE = 'session'
export const SESSION_DAYS = 30
export const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_LENGTH = 200

const encoder = new TextEncoder()

// ---------- small helpers ----------

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

// Compares every byte, so the time does not reveal where the first difference is.
function safeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

// ---------- passwords (PBKDF2-SHA256) ----------

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)
  return new Uint8Array(bits)
}

export interface StoredPassword {
  hash: string
  salt: string
  iterations: number
}

// New random salt for every password.
export async function hashPassword(password: string): Promise<StoredPassword> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await derive(password, salt, PBKDF2_ITERATIONS)
  return { hash: toHex(hash), salt: toHex(salt), iterations: PBKDF2_ITERATIONS }
}

// Uses the iteration count stored with the user, so old users keep working if the constant changes.
export async function verifyPassword(password: string, stored: StoredPassword): Promise<boolean> {
  const derived = await derive(password, fromHex(stored.salt), stored.iterations)
  return safeEqual(derived, fromHex(stored.hash))
}

// Used when the email does not exist, so "unknown email" takes as long as "wrong password".
export async function fakeVerify(password: string): Promise<void> {
  await derive(password, new Uint8Array(16), PBKDF2_ITERATIONS)
}

// ---------- validation ----------

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
  return email
}

// Returns an error message, or null when the password is fine.
export function checkPassword(value: unknown): string | null {
  if (typeof value !== 'string' || value.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
  }
  if (value.length > MAX_PASSWORD_LENGTH) return 'Password is too long.'
  return null
}

// ---------- sessions ----------

export async function createSession(db: D1Database, userId: string): Promise<string> {
  const token = toHex(crypto.getRandomValues(new Uint8Array(32)))
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400 * 1000).toISOString()
  await db
    .prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(token, userId, expiresAt)
    .run()
  return token
}

// One indexed query: finds the session and its user, ignores expired sessions.
export async function getSession(db: D1Database, token: string): Promise<AuthUser | null> {
  const row = await db
    .prepare(
      'SELECT u.id AS id, u.email AS email, u.member_id AS member_id FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?',
    )
    .bind(token, new Date().toISOString())
    .first<AuthUser>()
  return row ?? null
}

export async function deleteSession(db: D1Database, token: string): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run()
}

export async function deleteExpiredSessions(db: D1Database): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(new Date().toISOString()).run()
}

// ---------- cookies ----------

export function getCookie(request: Request, name: string): string | null {
  const header = request.headers.get('Cookie')
  if (!header) return null
  for (const part of header.split(';')) {
    const i = part.indexOf('=')
    if (i < 0) continue
    if (part.slice(0, i).trim() === name) return part.slice(i + 1).trim()
  }
  return null
}

function buildCookie(request: Request, value: string, maxAgeSeconds: number): string {
  const parts = [`${SESSION_COOKIE}=${value}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAgeSeconds}`]
  // Secure only on https, so login also works on http://localhost
  if (new URL(request.url).protocol === 'https:') parts.push('Secure')
  return parts.join('; ')
}

export function sessionCookie(request: Request, token: string): string {
  return buildCookie(request, token, SESSION_DAYS * 86400)
}

export function clearSessionCookie(request: Request): string {
  return buildCookie(request, '', 0)
}