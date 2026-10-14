import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { UtensilsCrossed } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { IconTile } from '@/components/ui/icon-tile'
import { Input } from '@/components/ui/input'
import { Notice } from '@/components/ui/notice'
import { api } from '@/lib/api'
import type { User } from '@/lib/auth'

export default function Login() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const status = useQuery({
    queryKey: ['setup-status'],
    queryFn: () => api.get<{ needsSetup: boolean }>('/api/setup-status'),
    retry: false,
  })

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // No users yet: show the "Create first account" form instead of sign in.
  const isSetup = status.data?.needsSetup === true

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (isSetup && password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      const res = await api.post<{ user: User }>(isSetup ? '/api/setup' : '/api/login', isSetup ? { name, email, password } : { email, password })
      queryClient.setQueryData(['me'], res.user)
      queryClient.setQueryData(['setup-status'], { needsSetup: false })
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="rise glass-strong w-full max-w-sm rounded-[2rem] p-7">
        <div className="mb-7 flex flex-col items-center text-center">
          <IconTile icon={UtensilsCrossed} tone="blue" size="lg" className="mb-4 size-16 rounded-[1.25rem] [&>svg]:size-8" />
          <h1 className="type-large font-bold">Mess Manager</h1>
          <p className="type-body mt-1 text-muted-foreground">
            {status.isPending ? 'Loading…' : isSetup ? 'Enter your name, email and password to get started.' : 'Sign in to continue.'}
          </p>
        </div>

        {status.isError ? (
          <div className="space-y-3">
            <Notice tone="error">{status.error.message}</Notice>
            <Button size="lg" className="w-full" onClick={() => status.refetch()}>
              Try again
            </Button>
          </div>
        ) : status.isPending ? (
          <div className="space-y-3">
            <div className="skeleton h-11 rounded-xl" />
            <div className="skeleton h-11 rounded-xl" />
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            {isSetup && (
              <Field label="Your name" htmlFor="name">
                <Input id="name" autoComplete="name" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
            )}
            <Field label="Email" htmlFor="email">
              <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Password" htmlFor="password">
              <Input
                id="password"
                type="password"
                autoComplete={isSetup ? 'new-password' : 'current-password'}
                required
                minLength={isSetup ? 8 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            {isSetup && (
              <Field label="Confirm password" htmlFor="confirm" hint="At least 8 characters.">
                <Input id="confirm" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </Field>
            )}
            {error && <Notice tone="error">{error}</Notice>}
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? 'Please wait…' : isSetup ? 'Create account' : 'Sign in'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
