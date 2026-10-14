// Liquid Glass transparency, like the iOS 27 slider. 0 = ultra clear, 1 = fully tinted.
// The CSS reads --tint from <html> (see index.css). The choice is saved in this browser.
const KEY = 'mm-glass-tint'

export const DEFAULT_TINT = 0.25

const clamp = (n: number) => Math.min(1, Math.max(0, n))

export function readTint(): number {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === null) return DEFAULT_TINT
    const n = Number(saved)
    return Number.isFinite(n) ? clamp(n) : DEFAULT_TINT
  } catch {
    return DEFAULT_TINT
  }
}

export function applyTint(tint: number) {
  document.documentElement.style.setProperty('--tint', String(clamp(tint)))
}

export function saveTint(tint: number) {
  try {
    localStorage.setItem(KEY, String(clamp(tint)))
  } catch {
    // storage blocked: it still works until the page is closed
  }
}

// Call once before the first render so there is no flash of the wrong glass.
export function initGlass() {
  applyTint(readTint())
}
