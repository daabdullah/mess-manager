import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import AppLayout from '@/components/AppLayout'
import ConfirmProvider from '@/components/ConfirmProvider'
import LiveProvider from '@/components/LiveProvider'
import MonthProvider from '@/components/MonthProvider'
import { useMe } from '@/lib/auth'

// Auth guard: shows the app only when /api/me says we are signed in.
export default function AuthLayout() {
  const me = useMe()

  if (me.isPending) {
    return (
      <div role="status" aria-label="Loading" className="flex min-h-dvh items-center justify-center">
        <span className="size-8 animate-spin rounded-full border-[3px] border-fill-2 border-t-primary" />
      </div>
    )
  }
  if (me.isError) {
    return (
      <div className="mx-auto max-w-md space-y-3 p-6">
        <Notice tone="error">{me.error.message}</Notice>
        <Button onClick={() => me.refetch()}>Try again</Button>
      </div>
    )
  }

  // Everything inside is the logged-in part: live connection, selected month, layout, pages.
  return (
    <LiveProvider>
      <MonthProvider>
        <ConfirmProvider>
          <AppLayout />
        </ConfirmProvider>
      </MonthProvider>
    </LiveProvider>
  )
}
