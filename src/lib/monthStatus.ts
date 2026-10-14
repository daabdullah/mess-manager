import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useConfirm, type ConfirmOptions } from '@/lib/confirm'
import { useMonth } from '@/lib/month'

export interface MonthStatus {
  month: string
  is_closed: boolean
}

const statusKey = (month: string) => ['month_status', month] as const
const fetchStatus = (month: string) => api.get<MonthStatus>(`/api/month-status?month=${month}`)

// Is this month closed? One tiny call per month, shared by every page (key ['month_status', month]).
// Reloads by itself when the live hub reports a "month_status" change.
export function useMonthStatus(month: string) {
  return useQuery({ queryKey: statusKey(month), queryFn: () => fetchStatus(month) })
}

// Close or unlock a month. The hub refreshes the other open screens.
export function useSetMonthClosed() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (v: { month: string; closed: boolean }) => api.put('/api/month-status', { month: v.month, is_closed: v.closed }),
    onSuccess: (_data, v) => {
      const name = format(parseISO(v.month), 'MMMM yyyy')
      toast.success(v.closed ? `${name} is closed.` : `${name} is unlocked.`)
      return queryClient.invalidateQueries({ queryKey: ['month_status'] })
    },
  })
}

// The soft lock. Nothing is blocked: in a closed month people just have to say "yes, really" first.
//   confirmEdit()        - for saves: asks only when the selected month is closed
//   confirmDelete(opts)  - for deletes: always asks, and adds a closed-month warning when needed
export function useChangeGuard() {
  const confirm = useConfirm()
  const queryClient = useQueryClient()
  const { month } = useMonth()

  const isClosed = useCallback(async () => {
    try {
      const status = await queryClient.ensureQueryData({ queryKey: statusKey(month), queryFn: () => fetchStatus(month) })
      return status.is_closed
    } catch {
      return false // could not check: do not get in the way, the save shows its own error if the network is down
    }
  }, [queryClient, month])

  const note = `${format(parseISO(month), 'MMMM yyyy')} is closed (settled). Changing it changes the final amounts.`

  const confirmEdit = useCallback(async () => {
    if (!(await isClosed())) return true
    return confirm({ title: 'This month is closed', description: `${note}\n\nSave this change anyway?`, confirmLabel: 'Save anyway' })
  }, [isClosed, confirm, note])

  const confirmDelete = useCallback(
    async (options: ConfirmOptions) => {
      const closed = await isClosed()
      const description = [options.description, closed ? note : ''].filter(Boolean).join('\n\n')
      return confirm({ destructive: true, confirmLabel: 'Delete', ...options, description })
    },
    [isClosed, confirm, note],
  )

  return { confirmEdit, confirmDelete }
}
