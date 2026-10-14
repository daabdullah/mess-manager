import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const tones = {
  blue: ['#4da3ff', '#007aff'],
  green: ['#5fdc82', '#2bb84f'],
  orange: ['#ffb340', '#ff9500'],
  purple: ['#c77dff', '#9b4dd6'],
  pink: ['#ff6b8b', '#ff2d55'],
  teal: ['#5ac8fa', '#32ade6'],
  gray: ['#a1a1a8', '#6e6e75'],
} as const

export type Tone = keyof typeof tones

const sizes = {
  sm: 'size-7 rounded-lg [&>svg]:size-4',
  md: 'size-9 rounded-[10px] [&>svg]:size-5',
  lg: 'size-11 rounded-xl [&>svg]:size-6',
}

// An iOS Settings style app icon: white symbol on a coloured rounded square.
export function IconTile({ icon: Icon, tone = 'blue', size = 'md', className }: { icon: LucideIcon; tone?: Tone; size?: keyof typeof sizes; className?: string }) {
  const [from, to] = tones[tone]
  return (
    <span
      aria-hidden
      style={{ backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.4), rgba(255,255,255,0) 55%), linear-gradient(160deg, ${from}, ${to})` }}
      className={cn('flex shrink-0 items-center justify-center text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.55),inset_0_-1px_0_rgba(0,0,0,0.1),0_4px_10px_-3px_rgba(0,0,0,0.25)]', sizes[size], className)}
    >
      <Icon />
    </span>
  )
}
