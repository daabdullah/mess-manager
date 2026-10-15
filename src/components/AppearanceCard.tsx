import { useState, type CSSProperties } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Notice } from '@/components/ui/notice'
import { readPerfPref, readThemePref, setPerfPref, setThemePref, useLite, type PerfPref, type ThemePref } from '@/lib/appearance'
import { DEFAULT_TINT, applyTint, readTint, saveTint } from '@/lib/glass'

const THEMES: [ThemePref, string][] = [
  ['system', 'System'],
  ['light', 'Light'],
  ['dark', 'Dark'],
]
const PERFS: [PerfPref, string][] = [
  ['auto', 'Auto'],
  ['lite', 'Lite'],
  ['full', 'Full'],
]

function Choice<T extends string>({ label, options, value, onPick }: { label: string; options: [T, string][]; value: T; onPick: (v: T) => void }) {
  return (
    <div className="space-y-2">
      <p className="type-sub font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(([id, name]) => (
          <Button key={id} variant={value === id ? 'default' : 'outline'} size="sm" aria-pressed={value === id} onClick={() => onPick(id)}>
            {name}
          </Button>
        ))}
      </div>
    </div>
  )
}

// Theme (light / dark), performance (lite / full) and the Liquid Glass transparency slider.
export default function AppearanceCard() {
  const [theme, setTheme] = useState(readThemePref)
  const [perf, setPerf] = useState(readPerfPref)
  const [tint, setTint] = useState(readTint)
  const lite = useLite()
  const deviceWantsLess = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-transparency: reduce)').matches

  function changeTint(next: number) {
    setTint(next)
    applyTint(next)
    saveTint(next)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <Choice
          label="Mode"
          options={THEMES}
          value={theme}
          onPick={(v) => {
            setTheme(v)
            setThemePref(v)
          }}
        />
        <Choice
          label="Performance"
          options={PERFS}
          value={perf}
          onPick={(v) => {
            setPerf(v)
            setPerfPref(v)
          }}
        />
        {lite ? (
          <Notice tone="info">Lite is on: no blur or animation, so the app stays smooth on this phone.</Notice>
        ) : (
          <div className="space-y-4">
            <p className="type-sub font-medium text-muted-foreground">Liquid Glass</p>
            <div className="space-y-1">
              <input
                type="range"
                className="glass-range"
                min={0}
                max={100}
                step={1}
                value={Math.round(tint * 100)}
                style={{ '--p': `${tint * 100}%` } as CSSProperties}
                aria-label="Liquid Glass transparency, from clear to tinted"
                onChange={(e) => changeTint(Number(e.target.value) / 100)}
              />
              <div className="type-foot flex justify-between text-muted-foreground">
                <span>Clear</span>
                <span>Tinted</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => changeTint(0)}>
                Ultra clear
              </Button>
              <Button variant="outline" size="sm" onClick={() => changeTint(DEFAULT_TINT)}>
                Default
              </Button>
              <Button variant="outline" size="sm" onClick={() => changeTint(1)}>
                Fully tinted
              </Button>
            </div>
            {deviceWantsLess && <Notice tone="info">Your device asks for less transparency, so the glass stays tinted.</Notice>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
