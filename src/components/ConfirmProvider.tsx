import { useCallback, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { AlertDialog } from 'radix-ui'
import { Button } from '@/components/ui/button'
import { ConfirmContext, type ConfirmFn, type ConfirmOptions } from '@/lib/confirm'

// One confirmation dialog for the whole app. Phone: slides up from the bottom. Larger screens: centered.
export default function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((ok: boolean) => void) | null>(null)

  const confirm = useCallback<ConfirmFn>((next) => {
    resolver.current?.(false) // a dialog that is still open is answered "no"
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
      setOptions(next)
    })
  }, [])

  function answer(ok: boolean) {
    resolver.current?.(ok)
    resolver.current = null
    setOptions(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog.Root open={options !== null} onOpenChange={(open) => !open && answer(false)}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="dialog-overlay" />
          <AlertDialog.Content className="dialog-panel glass-strong p-6" style={{ '--dialog-w': '24rem' } as CSSProperties}>
            <AlertDialog.Title className="type-title font-semibold">{options?.title}</AlertDialog.Title>
            <AlertDialog.Description className="type-body mt-2 whitespace-pre-line text-muted-foreground">
              {options?.description ?? ''}
            </AlertDialog.Description>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <AlertDialog.Cancel asChild>
                <Button variant="outline" size="lg" className="sm:h-10 sm:text-[0.9375rem]">
                  Cancel
                </Button>
              </AlertDialog.Cancel>
              <Button variant={options?.destructive ? 'destructive' : 'default'} size="lg" className="sm:h-10 sm:text-[0.9375rem]" onClick={() => answer(true)}>
                {options?.confirmLabel ?? 'Confirm'}
              </Button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </ConfirmContext.Provider>
  )
}
