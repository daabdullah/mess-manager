import { CircleAlert } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Loading: three shimmering bars. Pass a className for padding inside edge-to-edge cards.
export function Loading({ className }: { className?: string }) {
  return (
    <div role="status" aria-label="Loading" className={cn('space-y-3', className)}>
      <div className="skeleton h-11 rounded-xl" />
      <div className="skeleton h-11 rounded-xl" />
      <div className="skeleton h-11 w-2/3 rounded-xl" />
    </div>
  )
}

// Empty: an icon, a short title and an optional hint or link.
export function EmptyState({ icon: Icon, title, children, className }: { icon: LucideIcon; title: string; children?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center gap-1.5 px-4 py-10 text-center', className)}>
      <div className="mb-2 flex size-14 items-center justify-center rounded-full bg-fill text-muted-foreground">
        <Icon className="size-6" aria-hidden />
      </div>
      <p className="type-headline font-semibold">{title}</p>
      {children && <p className="type-sub max-w-sm text-muted-foreground">{children}</p>}
    </div>
  )
}

// Error: the message and a Try again button. (Errors from saving and deleting are shown as toasts.)
export function ErrorState({ error, onRetry, className }: { error: Error; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={cn('type-sub flex flex-wrap items-center gap-3 rounded-xl bg-danger/10 p-3', className)}>
      <CircleAlert className="size-5 shrink-0 text-danger" aria-hidden />
      <p className="min-w-0 flex-1 font-medium text-danger">{error.message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
