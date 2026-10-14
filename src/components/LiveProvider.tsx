import { useEffect, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { startLive } from '@/lib/live'

// Keeps the live connection open while it is mounted. Wrap only the logged-in part of the app.
export default function LiveProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()

  useEffect(() => startLive(queryClient), [queryClient])

  return <>{children}</>
}