import * as React from 'react'
import { Dialog as D } from 'radix-ui'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const widths = { sm: '24rem', md: '28rem', lg: '36rem' }

const Dialog = D.Root
const DialogClose = D.Close

// One dialog for the whole app. Phone: floating sheet from the bottom. Larger screens: centered pop.
function DialogContent({
  className,
  children,
  size = 'md',
  ...props
}: Omit<React.ComponentProps<typeof D.Content>, 'style'> & { size?: keyof typeof widths }) {
  return (
    <D.Portal>
      <D.Overlay className="dialog-overlay" />
      <D.Content
        aria-describedby={undefined}
        className={cn('dialog-panel glass-strong p-5 sm:p-6', className)}
        style={{ '--dialog-w': widths[size] } as React.CSSProperties}
        {...props}
      >
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-fill-2 sm:hidden" aria-hidden />
        {children}
        <D.Close
          aria-label="Close"
          className="press absolute top-4 right-4 flex size-8 items-center justify-center rounded-full bg-fill text-muted-foreground outline-none hover:bg-fill-2 hover:text-foreground sm:top-5 sm:right-5"
        >
          <X className="size-4" />
        </D.Close>
      </D.Content>
    </D.Portal>
  )
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof D.Title>) {
  return <D.Title className={cn('type-title pr-10 font-semibold', className)} {...props} />
}

function DialogDescription({ className, ...props }: React.ComponentProps<typeof D.Description>) {
  return <D.Description className={cn('type-sub mt-1 text-muted-foreground', className)} {...props} />
}

export { Dialog, DialogClose, DialogContent, DialogTitle, DialogDescription }
