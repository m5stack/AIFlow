import { createContext, useContext } from 'react'

export interface ConfirmDialogOptions {
  title: string
  description: string
  itemName: string
  confirmLabel: string
}

export type ConfirmDialogFn = (options: ConfirmDialogOptions) => Promise<boolean>

export const ConfirmDialogContext = createContext<ConfirmDialogFn | null>(null)

export function useConfirmDialog(): ConfirmDialogFn {
  const confirm = useContext(ConfirmDialogContext)
  if (!confirm) {
    throw new Error('useConfirmDialog must be used within ConfirmDialogProvider')
  }
  return confirm
}
