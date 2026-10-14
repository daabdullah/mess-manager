import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { Package, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import AccessoriesForm from '@/components/AccessoriesForm'
import { EmptyState, ErrorState, Loading } from '@/components/States'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { IconTile } from '@/components/ui/icon-tile'
import { api } from '@/lib/api'
import { useAccessories, type Accessory } from '@/lib/accessories'
import { formatTaka } from '@/lib/format'
import { useMembers } from '@/lib/members'
import { useMonth } from '@/lib/month'
import { useChangeGuard } from '@/lib/monthStatus'

// The month's accessories, oldest day first. Each row can be edited (form opens in place) or deleted.
export default function AccessoriesList() {
  const queryClient = useQueryClient()
  const { month } = useMonth()
  const accessories = useAccessories(month)
  const members = useMembers()
  const [editingId, setEditingId] = useState<string | null>(null)
  const { confirmDelete } = useChangeGuard()

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/accessories/${id}`),
    onSuccess: () => {
      toast.success('Accessory deleted.')
      void queryClient.invalidateQueries({ queryKey: ['accessories'] })
      void queryClient.invalidateQueries({ queryKey: ['summary'] })
    },
  })

  const nameOf = (id: string) => (members.data ?? []).find((m) => m.id === id)?.name ?? 'Unknown'

  async function onDelete(a: Accessory) {
    const ok = await confirmDelete({
      title: `Delete "${a.item}"?`,
      description: `${formatTaka(a.amount)}, paid by ${nameOf(a.paid_by)}. This cannot be undone.`,
    })
    if (ok) remove.mutate(a.id)
  }

  const list = accessories.data ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accessories in {format(parseISO(month), 'MMMM yyyy')}</CardTitle>
        <CardDescription>
          {accessories.data ? `${list.length} ${list.length === 1 ? 'item' : 'items'}.` : 'Everything bought for the house this month.'}
        </CardDescription>
      </CardHeader>
      <CardContent flush>
        {accessories.isPending && <Loading className="px-(--pad)" />}
        {accessories.isError && !accessories.data && <ErrorState error={accessories.error} onRetry={() => void accessories.refetch()} className="mx-(--pad)" />}
        {accessories.data && list.length === 0 && (
          <EmptyState icon={Package} title="No accessories this month">
            Add the first one in the form above.
          </EmptyState>
        )}

        {list.length > 0 && (
          <ul className="divide-y border-t">
            {list.map((a) => (
              <li key={a.id} className={editingId === a.id ? 'bg-card-2 px-(--pad) py-5' : 'px-(--pad) py-3'}>
                {editingId === a.id ? (
                  <AccessoriesForm accessory={a} onDone={() => setEditingId(null)} />
                ) : (
                  <div className="flex items-center gap-3">
                    <IconTile icon={Package} tone="purple" size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="type-body truncate font-medium">{a.item}</p>
                      <p className="type-sub truncate text-muted-foreground">
                        {format(parseISO(a.date), 'EEE, d MMM')} · paid by {nameOf(a.paid_by)}
                      </p>
                    </div>
                    <p className="type-body font-semibold tabular-nums">{formatTaka(a.amount)}</p>
                    <div className="flex">
                      <Button variant="ghost" size="icon-sm" aria-label={`Edit ${a.item}`} disabled={remove.isPending} onClick={() => setEditingId(a.id)}>
                        <Pencil />
                      </Button>
                      <Button variant="ghost-destructive" size="icon-sm" aria-label={`Delete ${a.item}`} disabled={remove.isPending} onClick={() => onDelete(a)}>
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
