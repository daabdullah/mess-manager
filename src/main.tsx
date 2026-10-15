import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { CSSProperties } from 'react'
import { initAppearance } from '@/lib/appearance'
import { initGlass } from '@/lib/glass'
import { initLiquidGlow } from '@/lib/glow'
import { Toaster, toast } from 'sonner'
import './index.css'
import App from './App.tsx'

// No timers, no polling: data only reloads when the live hub says so.
// Errors: a failed save or delete shows a toast (one place for the whole app). A failed reload
// of data that is already on screen shows a toast too; a first load that fails shows a message
// with a Try again button on the page itself.
const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error) => toast.error(error.message),
  }),
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.state.data !== undefined) toast.error(error.message)
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      refetchInterval: false,
    },
  },
})

initAppearance()
initGlass()
initLiquidGlow()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        position="top-center"
        theme="system"
        toastOptions={{ className: 'glass-toast' }}
        style={
          {
            '--normal-bg': 'var(--glass-strong-bg)',
            '--normal-border': 'var(--glass-border)',
            '--normal-text': 'var(--foreground)',
            '--success-bg': 'var(--glass-strong-bg)',
            '--success-text': 'var(--success)',
            '--success-border': 'var(--glass-border)',
            '--error-bg': 'var(--glass-strong-bg)',
            '--error-text': 'var(--danger)',
            '--error-border': 'var(--glass-border)',
            '--border-radius': '20px',
            fontFamily: 'var(--font-sans)',
          } as CSSProperties
        }
      />
    </QueryClientProvider>
  </StrictMode>,
)