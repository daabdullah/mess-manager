import type { LucideIcon } from 'lucide-react'
import { IconTile, type Tone } from '@/components/ui/icon-tile'
import { cn } from '@/lib/utils'

// A small number card: label on top, big value below, optional icon.
export function Stat({ label, value, valueClass, icon, tone }: { label: string; value: string; valueClass?: string; icon?: LucideIcon; tone?: Tone }) {
  return (
    <div className="surface min-w-0 rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="type-sub truncate text-muted-foreground">{label}</p>
        {icon && <IconTile icon={icon} tone={tone} size="sm" />}
      </div>
      <p className={cn('type-headline mt-2 truncate font-semibold tabular-nums sm:type-title', valueClass)}>{value}</p>
    </div>
  )
}
