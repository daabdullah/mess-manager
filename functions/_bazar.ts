// Validation shared by the /api/bazar routes (the entry form now, editing later).
// Money is handled in whole paisa (cents) so sums never show float noise.

const MAX_LINES = 100
const MAX_CENTS = 1_000_000_000 // ৳10,000,000 per entry or per line
const MAX_ITEM_LENGTH = 100

export interface BazarItemInput {
  item_name: string
  cents: number
}

export interface BazarInput {
  member_id: string
  date: string
  amount_cents: number // sum of the lines when there are lines, otherwise the amount sent
  items: BazarItemInput[]
}

export type ParsedBazar = { ok: true; value: BazarInput } | { ok: false; message: string }

// A positive number with at most 2 decimals, as whole paisa. Anything else: null.
function toCents(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null
  const cents = Math.round(value * 100)
  if (Math.abs(value * 100 - cents) > 1e-6) return null // more than 2 decimals
  return cents >= 1 && cents <= MAX_CENTS ? cents : null
}

// 'YYYY-MM-DD' and a real calendar day (no 2026-02-31).
function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '2000-01-01' || value > '2100-12-31') return false
  const d = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value
}

export function parseBazarBody(body: Record<string, unknown> | null): ParsedBazar {
  const fail = (message: string): ParsedBazar => ({ ok: false, message })
  if (!body) return fail('Invalid request.')

  const memberId = typeof body.member_id === 'string' ? body.member_id.trim() : ''
  if (!memberId || memberId.length > 100) return fail('Please choose a member.')

  const date = typeof body.date === 'string' ? body.date : ''
  if (!isRealDate(date)) return fail('Please choose a valid date.')

  // Detail lines are optional. No lines (missing or empty list) = use the amount sent.
  const rawLines = body.lines ?? []
  if (!Array.isArray(rawLines)) return fail('Lines must be a list.')
  if (rawLines.length > MAX_LINES) return fail(`Too many lines (at most ${MAX_LINES}).`)

  const items: BazarItemInput[] = []
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i] as { item?: unknown; price?: unknown } | null
    const name = typeof line?.item === 'string' ? line.item.trim().replace(/\s+/g, ' ') : ''
    if (!name || name.length > MAX_ITEM_LENGTH) {
      return fail(`Line ${i + 1}: enter an item name (1 to ${MAX_ITEM_LENGTH} characters).`)
    }
    const cents = toCents(line?.price)
    if (cents === null) return fail(`Line ${i + 1}: enter a price above 0 with at most 2 decimals.`)
    items.push({ item_name: name, cents })
  }

  let amountCents: number | null
  if (items.length > 0) {
    amountCents = items.reduce((sum, item) => sum + item.cents, 0)
    if (amountCents > MAX_CENTS) return fail('The total is too large.')
  } else {
    amountCents = toCents(body.amount)
    if (amountCents === null) return fail('Please enter an amount above 0 (at most 2 decimals).')
  }

  return { ok: true, value: { member_id: memberId, date, amount_cents: amountCents, items } }
}