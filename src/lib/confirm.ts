import { createContext, useContext } from 'react'

export interface ConfirmOptions {
  title: string
  description?: string // blank lines make new paragraphs
  confirmLabel?: string // default "Confirm"
  destructive?: boolean // red button, for deletes
}

export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

export const ConfirmContext = createContext<ConfirmFn | null>(null)

// const confirm = useConfirm();  if (await confirm({ title: 'Delete X?', destructive: true })) { ... }
export function useConfirm(): ConfirmFn {
  const fn = useContext(ConfirmContext)
  if (!fn) throw new Error('useConfirm must be used inside <ConfirmProvider>')
  return fn
}
