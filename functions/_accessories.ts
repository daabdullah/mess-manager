import { isRealDate } from './_month'

// Validation shared by POST /api/accessories and PUT /api/accessories/[id].

const MAX_CENTS = 1_000_000_000 // ৳10,000,000
const MAX_ITEM_LENGTH = 100

// What the database holds and the API sends.
export interface AccessoryRow {
  id: string
  date: string
  item: string
  amount: number
  paid_by: string
}

export interface AccessoryInput {
  date: string
  item: string
  amount: number // taka, at most 2 decimals
  paid_by: string
}

export type ParsedAccessory = { ok: true; value: AccessoryInput } | { ok: false; message: string }

// A positive number with at most 2 decimals, as whole paisa. Anything else: null.
function toCents(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null
  const cents = Math.round(value * 100)
  if (Math.abs(value * 100 - cents) > 1e-6) return null // more than 2 decimals
  return cents >= 1 && cents <= MAX_CENTS ? cents : null
}

export function parseAccessoryBody(body: Record<string, unknown> | null): ParsedAccessory {
  const fail = (message: string): ParsedAccessory => ({ ok: false, message })
  if (!body) return fail('Invalid request.')

  const date = typeof body.date === 'string' ? body.date : ''
  if (!isRealDate(date)) return fail('Please choose a valid date.')

  const item = typeof body.item === 'string' ? body.item.trim().replace(/\s+/g, ' ') : ''
  if (!item || item.length > MAX_ITEM_LENGTH) return fail(`Please enter an item name (1 to ${MAX_ITEM_LENGTH} characters).`)

  const paidBy = typeof body.paid_by === 'string' ? body.paid_by.trim() : ''
  if (!paidBy || paidBy.length > 100) return fail('Please choose who paid.')

  const cents = toCents(body.amount)
  if (cents === null) return fail('Please enter an amount above 0 (at most 2 decimals).')

  return { ok: true, value: { date, item, amount: cents / 100, paid_by: paidBy } }
}