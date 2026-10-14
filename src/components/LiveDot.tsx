import { useLiveStatus } from '@/lib/live'
import { cn } from '@/lib/utils'

// Green = live, grey = reconnecting.
export default function LiveDot() {
  const live = useLiveStatus() === 'live'
  const label = live ? 'Live' : 'Reconnecting…'
  return (
    <span role="status" title={label} className="glass type-foot flex h-9 shrink-0 items-center gap-2 rounded-full px-3 font-medium text-muted-foreground">
      <span className="relative flex size-2">
        {live && <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#34c759] opacity-60" />}
        <span className={cn('relative inline-flex size-2 rounded-full transition-colors duration-500', live ? 'bg-[#34c759]' : 'bg-tertiary')} />
      </span>
      <span className="hidden sm:inline">{label}</span>
    </span>
  )
}
