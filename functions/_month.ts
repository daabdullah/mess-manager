// Date helpers shared by the API routes.

// 'YYYY-MM-01' and a real month.
export function isMonth(value: string | null): value is string {
  return !!value && /^\d{4}-(0[1-9]|1[0-2])-01$/.test(value) && value >= '2000-01-01' && value <= '2100-12-01'
}

// '2026-12-01' -> '2027-01-01' (plain text compare then finds every date in the month)
export function nextMonth(month: string): string {
  const year = Number(month.slice(0, 4))
  const m = Number(month.slice(5, 7))
  return m === 12 ? `${year + 1}-01-01` : `${month.slice(0, 5)}${String(m + 1).padStart(2, '0')}-01`
}

// 'YYYY-MM-DD' and a real calendar day (no 2026-02-31).
export function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '2000-01-01' || value > '2100-12-31') return false
  const d = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value
}