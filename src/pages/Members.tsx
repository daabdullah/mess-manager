import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Pencil, Plus, Trash2, Users, X } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState, ErrorState, Loading } from '@/components/States'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import DeleteMemberDialog from '@/components/DeleteMemberDialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { api } from '@/lib/api'
import { useMembers, type Member } from '@/lib/members'
import { cn } from '@/lib/utils'

const MAX_NAME = 60

export default function Members() {
  const queryClient = useQueryClient()
  const members = useMembers()
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [deleting, setDeleting] = useState<Member | null>(null)

  const refreshMembers = () => queryClient.invalidateQueries({ queryKey: ['members'] })

  const add = useMutation({
    mutationFn: (v: { name: string; email: string; password: string }) => api.post<{ restored?: boolean }>('/api/members', v),
    onSuccess: (data) => {
      setNewName('')
      setNewEmail('')
      setNewPassword('')
      toast.success(data.restored ? 'This member already existed, so the same member is active again with their old history.' : 'Member and login added.')
      return refreshMembers()
    },
  })
  const rename = useMutation({
    mutationFn: (v: { id: string; name: string }) => api.put(`/api/members/${v.id}`, { name: v.name }),
    onSuccess: refreshMembers,
  })
  const setActive = useMutation({
    mutationFn: (v: { id: string; active: boolean }) => api.put(`/api/members/${v.id}`, { active: v.active }),
    onSuccess: refreshMembers,
  })
  const busy = add.isPending || rename.isPending || setActive.isPending

  function onAdd(e: FormEvent) {
    e.preventDefault()
    const name = newName.trim()
    if (name) add.mutate({ name, email: newEmail, password: newPassword })
  }

  const list = members.data ?? []

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Add a member</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onAdd} className="grid gap-2 sm:grid-cols-2">
            <Input placeholder="Name" aria-label="Member name" maxLength={MAX_NAME} value={newName} onChange={(e) => setNewName(e.target.value)} />
            <Input type="email" placeholder="Email (login)" aria-label="Member email" autoComplete="off" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            <Input type="password" placeholder="Password (8+ characters)" aria-label="Member password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <Button type="submit" className="h-11 px-5" disabled={busy || !newName.trim()}>
              <Plus /> Add
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent flush>
          {members.isPending && <Loading className="px-(--pad)" />}
          {members.isError && !members.data && <ErrorState error={members.error} onRetry={() => void members.refetch()} className="mx-(--pad)" />}
          {members.data && list.length === 0 && (
            <EmptyState icon={Users} title="No members yet" className="py-6">
              Add the first member above.
            </EmptyState>
          )}
          {list.length > 0 && (
            <ul className="divide-y border-t">
              {list.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  busy={busy}
                  onRename={(name) => rename.mutateAsync({ id: member.id, name })}
                  onToggle={(active) => setActive.mutate({ id: member.id, active })}
                  onDelete={() => setDeleting(member)}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {deleting && <DeleteMemberDialog member={deleting} onClose={() => setDeleting(null)} />}
    </div>
  )
}

interface MemberRowProps {
  member: Member
  busy: boolean
  onRename: (name: string) => Promise<unknown>
  onToggle: (active: boolean) => void
  onDelete: () => void
}

function MemberRow({ member, busy, onRename, onToggle, onDelete }: MemberRowProps) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(member.name)

  function startEdit() {
    setName(member.name)
    setEditing(true)
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    const next = name.trim()
    if (!next || next === member.name) {
      setEditing(false)
      return
    }
    try {
      await onRename(next)
      setEditing(false)
    } catch {
      // the page shows the error; stay in edit mode so the name can be fixed
    }
  }

  if (editing) {
    return (
      <li className="bg-card-2 px-(--pad)">
        <form onSubmit={save} className="flex items-center gap-2 py-3">
          <Input
            autoFocus
            className="flex-1"
            aria-label="New name"
            maxLength={MAX_NAME}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
          />
          <Button type="submit" size="icon-lg" aria-label="Save name" disabled={busy}>
            <Check className="size-5" />
          </Button>
          <Button type="button" variant="outline" size="icon-lg" aria-label="Cancel" onClick={() => setEditing(false)}>
            <X className="size-5" />
          </Button>
        </form>
      </li>
    )
  }

  return (
    <li className="flex items-center gap-3 px-(--pad) py-3">
      <Avatar name={member.name} size="md" className={cn(!member.active && 'opacity-50 grayscale')} />
      <div className="min-w-0 flex-1">
        <p className={cn('type-body truncate font-medium', !member.active && 'text-muted-foreground')}>{member.name}</p>
        {member.email && <p className="type-foot truncate text-muted-foreground">{member.email}</p>}
        {!member.active && <Badge className="mt-0.5">Inactive</Badge>}
      </div>
      <Switch checked={member.active} disabled={busy} onCheckedChange={onToggle} aria-label={`${member.name} is active`} />
      <div className="flex">
        <Button variant="ghost" size="icon-sm" aria-label={`Rename ${member.name}`} disabled={busy} onClick={startEdit}>
          <Pencil />
        </Button>
        <Button variant="ghost-destructive" size="icon-sm" aria-label={`Delete ${member.name}`} disabled={busy} onClick={onDelete}>
          <Trash2 />
        </Button>
      </div>
    </li>
  )
}
