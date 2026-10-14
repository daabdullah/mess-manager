// Money in the forms is typed as text and handled in whole paisa (integers),
// so sums never show float noise.

// "12", "12.5", "12.50", "12." -> paisa. Empty or not a number -> null.
export function toCents(text: string): number | null {
  const match = /^(\d*)(?:\.(\d{0,2}))?$/.exec(text.trim())
  if (!match || (match[1] === '' && !match[2])) return null
  return Number(match[1] || '0') * 100 + Number((match[2] ?? '').padEnd(2, '0'))
}

// paisa -> text for an input: 125000 -> "1250", 125050 -> "1250.50"
export function centsToText(cents: number): string {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2)
}

// A number from the API (taka, maybe with decimals) -> input text: 120.8 -> "120.80"
export function takaToText(taka: number): string {
  return centsToText(Math.round(taka * 100))
}

// Lets people type only digits with up to 2 decimals.
export function isMoneyTyping(text: string): boolean {
  return /^\d*\.?\d{0,2}$/.test(text)
}