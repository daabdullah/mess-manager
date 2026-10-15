import { useState } from 'react'
import { Package, Users, Wallet } from 'lucide-react'
import { useAccessories } from '@/lib/accessories'
import { getOrGive } from '@/lib/calc'
import { formatTaka } from '@/lib/format'
import { useMembers, useMyMemberId } from '@/lib/members'
import { useMonth } from '@/lib/month'
import { buildSummary, useSummary } from '@/lib/summary'
import { ErrorState, Loading } from '@/components/States'
import { Select } from '@/components/ui/select'
import { Stat } from '@/components/ui/stat'

// The month total and the equal share per member, at the top of the page.
// Everyone shares the cost equally: active members, plus any inactive member who paid
// for an accessory this month (so their payment is counted too).
export default function AccessoriesTotals() {
  const { month } = useMonth()
  const accessories = useAccessories(month)
  const members = useMembers()

  const items = accessories.data ?? []
  const ready = !!accessories.data && !!members.data

  const payers = new Set(items.map((a) => a.paid_by))
  const memberCount = (members.data ?? []).filter((m) => m.active || payers.has(m.id)).length
  // Added up in whole paisa, so the total never shows float noise.
  const total = items.reduce((sum, a) => sum + Math.round(a.amount * 100), 0) / 100
  const share = memberCount > 0 ? total / memberCount : 0

  return (
    <section className="space-y-3">
      {accessories.isError && !accessories.data && <ErrorState error={accessories.error} onRetry={() => void accessories.refetch()} />}
      {members.isError && !members.data && <ErrorState error={members.error} onRetry={() => void members.refetch()} />}
      {!ready && !accessories.isError && !members.isError && <Loading />}
      {ready && (
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Month total" value={formatTaka(total)} icon={Package} tone="purple" />
          <Stat label="Members" value={String(memberCount)} icon={Users} tone="teal" />
          <Stat label="Per member" value={memberCount > 0 ? formatTaka(share) : '–'} icon={Wallet} tone="blue" />
        </div>
      )}
    </section>
  )
}

const ME_KEY = 'mm-my-member'
const readMe = () => {
  try {
    return localStorage.getItem(ME_KEY) ?? ''
  } catch {
    return ''
  }
}

// Three cards in one row for the chosen member: paid, will give, will get.
// Bazar page: give/get = bazar paid - meal cost. Accessories page: give/get = paid - equal share.
export function MyBalanceCards({ kind }: { kind: 'bazar' | 'accessories' }) {
  const { month } = useMonth()
  const query = useSummary(month)
  const myMemberId = useMyMemberId()
  const [picked, setPicked] = useState<string | null>(null)
  // Default = the logged-in member; anyone can still pick another name.
  const meId = picked ?? (myMemberId || readMe())

  if (query.isPending) return <Loading />
  if (query.isError && !query.data) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />

  const { rows } = buildSummary(query.data!, month)
  if (rows.length === 0) return null

  const me = rows.find((r) => r.memberId === meId)
  const choose = (id: string) => {
    setPicked(id)
    try {
      localStorage.setItem(ME_KEY, id)
    } catch {
      // not saved in this browser, still works for now
    }
  }

  const paid = me ? (kind === 'bazar' ? me.bazarPaid : me.accessoriesPaid) : 0
  const net = me ? (kind === 'bazar' ? me.mealBalance : me.accessoriesNet) : 0
  const { direction, amount } = getOrGive(net)
  const give = direction === 'give' ? amount : 0
  const get = direction === 'get' ? amount : 0

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
        <label htmlFor="my-member" className="type-sub font-medium text-muted-foreground">
          Showing for
        </label>
        <Select id="my-member" className="sm:max-w-64" value={me ? me.memberId : ''} onChange={(e) => choose(e.target.value)}>
          <option value="">Choose yourself</option>
          {rows.map((r) => (
            <option key={r.memberId} value={r.memberId}>
              {r.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Stat label={kind === 'bazar' ? 'I paid' : 'I paid'} value={me ? formatTaka(paid) : '–'} />
        <Stat label="Will give" value={me ? formatTaka(give) : '–'} valueClass={give > 0 ? 'text-danger' : ''} />
        <Stat label="Will get" value={me ? formatTaka(get) : '–'} valueClass={get > 0 ? 'text-success' : ''} />
      </div>
    </section>
  )
}
