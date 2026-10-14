// Taka with Bangladeshi digit grouping: 1,234  12,345  1,23,456  12,34,567
// (en-IN grouping is the same lakh/crore style). Whole amounts have no decimals,
// others always show two: ৳1,250  ৳1,250.50
const grouping = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
const grouping2 = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function formatTaka(amount: number | null | undefined): string {
  const value = Number(amount)
  if (!Number.isFinite(value)) return '৳0'
  const cents = Math.round(Math.abs(value) * 100)
  const text = cents % 100 === 0 ? grouping.format(cents / 100) : grouping2.format(cents / 100)
  return `${value < 0 && cents !== 0 ? '-' : ''}৳${text}`
}