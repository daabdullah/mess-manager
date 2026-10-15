import { useSyncExternalStore } from 'react'

// Theme (light / dark) and performance (lite / full). Both are saved in this browser and
// written on <html> as data-theme and data-perf, which index.css reads.
export type ThemePref = 'system' | 'light' | 'dark'
export type PerfPref = 'auto' | 'lite' | 'full'

const THEME_KEY = 'mm-theme'
const PERF_KEY = 'mm-perf'
const EVENT = 'mm-appearance'

function read<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key)
    return allowed.includes(v as T) ? (v as T) : fallback
  } catch {
    return fallback
  }
}

function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // storage blocked: it still works until the page is closed
  }
}

export const readThemePref = () => read<ThemePref>(THEME_KEY, ['system', 'light', 'dark'], 'system')
export const readPerfPref = () => read<PerfPref>(PERF_KEY, ['auto', 'lite', 'full'], 'auto')

const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches

export const resolveTheme = (pref: ThemePref): 'light' | 'dark' => (pref === 'system' ? (systemDark() ? 'dark' : 'light') : pref)

// Phones with little memory or few CPU cores, or users who asked for less motion, get Lite.
export function isLowEnd(): boolean {
  const nav = navigator as Navigator & { deviceMemory?: number }
  const lowMemory = typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4
  const fewCores = typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 4
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  return lowMemory || fewCores || reduceMotion
}

export const resolvePerf = (pref: PerfPref): 'lite' | 'full' => (pref === 'auto' ? (isLowEnd() ? 'lite' : 'full') : pref)

function paint() {
  const root = document.documentElement
  const theme = resolveTheme(readThemePref())
  root.dataset.theme = theme
  root.dataset.perf = resolvePerf(readPerfPref())
  const color = theme === 'dark' ? '#000000' : '#f2f2f7'
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    m.removeAttribute('media')
    m.setAttribute('content', color)
  })
  window.dispatchEvent(new Event(EVENT))
}

export function setThemePref(pref: ThemePref) {
  save(THEME_KEY, pref)
  paint()
}

export function setPerfPref(pref: PerfPref) {
  save(PERF_KEY, pref)
  paint()
}

// Call once before the first render so there is no flash of the wrong theme.
export function initAppearance() {
  paint()
  // "System" follows the device when it switches between light and dark.
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (readThemePref() === 'system') paint()
  })
}

const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb)
  return () => window.removeEventListener(EVENT, cb)
}

export const useTheme = () => useSyncExternalStore(subscribe, () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light', () => 'light')
export const useLite = () => useSyncExternalStore(subscribe, () => document.documentElement.dataset.perf === 'lite', () => false)
