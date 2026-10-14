import { cn } from '@/lib/utils'

const colors = ['#007aff', '#34c759', '#ff9500', '#af52de', '#ff2d55', '#32ade6', '#5856d6', '#ff6b35']
const sizes = { sm: 'size-8 type-sub', md: 'size-10 type-body', lg: 'size-12 type-headline' }

// A coloured circle with the first letter of the name. The colour is always the same for a name.
export function Avatar({ name, size = 'md', className }: { name: string; size?: keyof typeof sizes; className?: string }) {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.codePointAt(0)!) >>> 0
  const color = colors[hash % colors.length]
  const initial = [...name.trim()][0]?.toUpperCase() ?? '?'
  return (
    <span
      aria-hidden
      style={{ backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.35), rgba(255,255,255,0) 55%), linear-gradient(150deg, ${color}, color-mix(in srgb, ${color} 72%, black))` }}
      className={cn('flex shrink-0 items-center justify-center rounded-full font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_3px_8px_-2px_rgba(0,0,0,0.25)]', sizes[size], className)}
    >
      {initial}
    </span>
  )
}
