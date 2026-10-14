import { useState, type CSSProperties } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Notice } from '@/components/ui/notice'
import { DEFAULT_TINT, applyTint, readTint, saveTint } from '@/lib/glass'

// The Liquid Glass transparency slider: ultra clear on the left, fully tinted on the right.
export default function AppearanceCard() {
  const [tint, setTint] = useState(readTint)
  const deviceWantsLess = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-transparency: reduce)').matches

  function change(next: number) {
    setTint(next)
    applyTint(next)
    saveTint(next)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Liquid Glass</CardTitle>
        <CardDescription>How see-through the glass is. Clear looks lightest; tinted is easiest to read. Saved on this device.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
            onChange={(e) => change(Number(e.target.value) / 100)}
          />
          <div className="type-foot flex justify-between text-muted-foreground">
            <span>Clear</span>
            <span>Tinted</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => change(0)}>
            Ultra clear
          </Button>
          <Button variant="outline" size="sm" onClick={() => change(DEFAULT_TINT)}>
            Default
          </Button>
          <Button variant="outline" size="sm" onClick={() => change(1)}>
            Fully tinted
          </Button>
        </div>
        {deviceWantsLess && <Notice tone="info">Your device asks for less transparency, so the glass stays tinted.</Notice>}
      </CardContent>
    </Card>
  )
}
