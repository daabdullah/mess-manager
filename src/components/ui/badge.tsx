import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'
import { cn } from '@/lib/utils'

const badgeVariants = cva('type-foot inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 font-medium whitespace-nowrap backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_0_0_1px_rgba(255,255,255,0.18)]', {
  variants: {
    tone: {
      neutral: 'bg-fill text-muted-foreground',
      info: 'bg-primary/12 text-primary',
      success: 'bg-success/12 text-success',
      danger: 'bg-danger/12 text-danger',
      warning: 'bg-warning/15 text-warning',
    },
  },
  defaultVariants: { tone: 'neutral' },
})

export function Badge({ tone, className, ...props }: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />
}
