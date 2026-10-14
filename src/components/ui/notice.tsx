import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const tones = {
  error: { icon: CircleAlert, cls: 'bg-danger/10 text-danger' },
  success: { icon: CircleCheck, cls: 'bg-success/10 text-success' },
  warning: { icon: TriangleAlert, cls: 'bg-warning/12 text-warning' },
  info: { icon: Info, cls: 'bg-primary/10 text-primary' },
}

// A short coloured message: errors, "saved", warnings and hints.
export function Notice({ tone = 'info', children, className }: { tone?: keyof typeof tones; children: ReactNode; className?: string }) {
  const { icon: Icon, cls } = tones[tone]
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cn('type-sub rise flex items-start gap-2.5 rounded-xl px-3.5 py-2.5 font-medium backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_0_0_1px_rgba(255,255,255,0.2)]', cls, className)}>
      <Icon className="mt-px size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
