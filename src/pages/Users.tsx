import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import AppearanceCard from '@/components/AppearanceCard'
import { ErrorState, Loading } from '@/components/States'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Notice } from '@/components/ui/notice'
import { api } from '@/lib/api'
import { useMe, type User } from '@/lib/auth'
import { useConfirm } from '@/lib/confirm'

export default function Users() {
  const queryClient = useQueryClient()
  const me = useMe()
  const confirm = useConfirm()
  const users = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<{ users: User[] }>('/api/users'),
  })

  // ----- delete user -----
  const deleteUser = useMutation({
    mutationFn: (id: string) => api.delete(`/api/users/${id}`),
    onSuccess: () => {
      toast.success('User deleted.')
      return queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
  async function onDelete(user: User) {
    const ok = await confirm({
      title: `Delete ${user.email}?`,
      description: 'They will not be able to sign in any more.',
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (ok) deleteUser.mutate(user.id)
  }

  // ----- change my password -----
  const [currentPassword, setCurrentPassword] = useState('')
  const [myNewPassword, setMyNewPassword] = useState('')
  const [myConfirm, setMyConfirm] = useState('')
  const [pwMessage, setPwMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const changePassword = useMutation({
    mutationFn: (v: { currentPassword: string; newPassword: string }) => api.post('/api/change-password', v),
    onSuccess: () => {
      setCurrentPassword('')
      setMyNewPassword('')
      setMyConfirm('')
      setPwMessage({ tone: 'success', text: 'Password changed. Other devices were signed out.' })
    },
  })
  function onChangePassword(e: FormEvent) {
    e.preventDefault()
    setPwMessage(null)
    if (myNewPassword !== myConfirm) {
      setPwMessage({ tone: 'error', text: 'The new passwords do not match.' })
      return
    }
    changePassword.mutate({ currentPassword, newPassword: myNewPassword })
  }

  return (
    <div className="space-y-5">
      <AppearanceCard />

      <Card>
        <CardHeader>
          <CardTitle>People who can sign in</CardTitle>
        </CardHeader>
        <CardContent flush>
          {users.isPending && <Loading className="px-(--pad)" />}
          {users.isError && !users.data && <ErrorState error={users.error} onRetry={() => void users.refetch()} className="mx-(--pad)" />}
          {users.data && (
            <ul className="divide-y border-t">
              {users.data.users.map((u) => (
                <li key={u.id} className="flex items-center gap-3 px-(--pad) py-3">
                  <Avatar name={u.email} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="type-body flex items-center gap-2 font-medium">
                      <span className="truncate">{u.email}</span>
                      {u.id === me.data?.id && <Badge tone="info">You</Badge>}
                    </p>
                    <p className="type-sub text-muted-foreground">
                      {u.member_name ? `Member: ${u.member_name}` : 'No member'} · Added {u.created_at?.slice(0, 10)}
                    </p>
                  </div>
                  <Button
                    variant="ghost-destructive"
                    size="icon-sm"
                    aria-label={`Delete ${u.email}`}
                    disabled={u.id === me.data?.id || !!u.member_id || deleteUser.isPending}
                    onClick={() => onDelete(u)}
                  >
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change my password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onChangePassword} className="space-y-4">
            <Field label="Current password" htmlFor="current-password">
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </Field>
            <Field label="New password (at least 8 characters)" htmlFor="my-new-password">
              <Input
                id="my-new-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={myNewPassword}
                onChange={(e) => setMyNewPassword(e.target.value)}
              />
            </Field>
            <Field label="Confirm new password" htmlFor="my-confirm">
              <Input id="my-confirm" type="password" autoComplete="new-password" required value={myConfirm} onChange={(e) => setMyConfirm(e.target.value)} />
            </Field>
            {pwMessage && <Notice tone={pwMessage.tone}>{pwMessage.text}</Notice>}
            <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={changePassword.isPending}>
              {changePassword.isPending ? 'Saving…' : 'Change password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
