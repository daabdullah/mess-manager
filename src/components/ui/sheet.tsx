import * as React from 'react'
import { Dialog as SheetPrimitive } from 'radix-ui'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

// Floating glass drawer that slides in from the left (phone and tablet menu).
function Sheet(props: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title data-slot="sheet-title" className={cn('type-headline font-semibold', className)} {...props} />
}

function SheetContent({ className, children, ...props }: React.ComponentProps<typeof SheetPrimitive.Content>) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay data-slot="sheet-overlay" className="dialog-overlay" />
      <SheetPrimitive.Content data-slot="sheet-content" className={cn('drawer-panel glass-strong', className)} {...props}>
        {children}
        <SheetPrimitive.Close
          aria-label="Close menu"
          className="press absolute top-4 right-4 flex size-9 items-center justify-center rounded-full bg-fill text-muted-foreground outline-none hover:bg-fill-2 hover:text-foreground"
        >
          <X className="size-4" />
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  )
}

export { Sheet, SheetContent, SheetTitle }
