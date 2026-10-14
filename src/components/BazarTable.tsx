import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ShoppingBasket } from 'lucide-react'
import BazarDayDialog from '@/components/BazarDayDialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { tbl } from '@/components/ui/table'
import { useBazar } from '@/lib/bazar'
import { formatTaka } from '@/lib/format'
import { useMembers } from '@/lib/members'
import { useMonth } from '@/lib/month'
import { EmptyState, ErrorState, Loading } from '@/components/States'

const dash = <span className={tbl.empty}>–</span>

// Dates as rows, members as columns, each cell = that day's sum for that member,
// plus row totals (right) and column totals (bottom). Tap a row to open that day.
export default function BazarTable() {
  const { month } = useMonth()
  const bazar = useBazar(month)
  const members = useMembers()
  const [openDay, setOpenDay] = useState<string | null>(null)

  const entries = bazar.data ?? []
  const allMembers = members.data ?? []
  const nameOf = (id: string) => allMembers.find((m) => m.id === id)?.name ?? 'Unknown'

  // Columns: active members, plus inactive ones who have entries this month.
  const withEntries = new Set(entries.map((e) => e.member_id))
  const columns = allMembers.filter((m) => m.active || withEntries.has(m.id))
  const days = [...new Set(entries.map((e) => e.date))].sort()

  const cellSum = new Map<string, number>() // 'date|memberId' -> sum
  const rowSum = new Map<string, number>()
  const colSum = new Map<string, number>()
  let grand = 0
  for (const e of entries) {
    cellSum.set(`${e.date}|${e.member_id}`, (cellSum.get(`${e.date}|${e.member_id}`) ?? 0) + e.amount)
    rowSum.set(e.date, (rowSum.get(e.date) ?? 0) + e.amount)
    colSum.set(e.member_id, (colSum.get(e.member_id) ?? 0) + e.amount)
    grand += e.amount
  }

  const monthName = format(parseISO(month), 'MMMM yyyy')
  const ready = bazar.data && members.data

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bazar in {monthName}</CardTitle>
        <CardDescription>
          {ready && entries.length > 0
            ? `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}, ${formatTaka(grand)} in total. Tap a day to see, edit or delete its entries.`
            : 'Each cell is what a member spent on that day.'}
        </CardDescription>
      </CardHeader>
      <CardContent flush>
        {(bazar.isPending || members.isPending) && <Loading className="px-(--pad)" />}
        {bazar.isError && !bazar.data && <ErrorState error={bazar.error} onRetry={() => void bazar.refetch()} className="mx-(--pad)" />}
        {members.isError && !members.data && <ErrorState error={members.error} onRetry={() => void members.refetch()} className="mx-(--pad)" />}
        {ready && entries.length === 0 && (
          <EmptyState icon={ShoppingBasket} title={`No bazar in ${monthName} yet`}>
            Add the first entry in the form above.
          </EmptyState>
        )}

        {ready && entries.length > 0 && (
          <div className={`${tbl.scroll} border-t`}>
            <table className={tbl.table}>
              <thead>
                <tr>
                  <th className={tbl.thFirst}>Date</th>
                  {columns.map((m) => (
                    <th key={m.id} className={`${tbl.th} min-w-20`}>
                      {m.name}
                    </th>
                  ))}
                  <th className={`${tbl.th} min-w-20 text-foreground`}>Total</th>
                </tr>
              </thead>
              <tbody>
                {days.map((day) => (
                  <tr key={day} className={tbl.tr}>
                    <th scope="row" className={tbl.rowHead}>
                      <button type="button" className={`${tbl.cellBtn} text-left`} onClick={() => setOpenDay(day)}>
                        {format(parseISO(day), 'd MMM, EEE')}
                      </button>
                    </th>
                    {columns.map((m) => {
                      const sum = cellSum.get(`${day}|${m.id}`)
                      return (
                        <td key={m.id} className={tbl.tdBare}>
                          <button type="button" className={`${tbl.cellBtn} text-right`} onClick={() => setOpenDay(day)}>
                            {sum ? formatTaka(sum) : dash}
                          </button>
                        </td>
                      )
                    })}
                    <td className={`${tbl.tdBare} font-semibold`}>
                      <button type="button" className={`${tbl.cellBtn} text-right`} onClick={() => setOpenDay(day)}>
                        {formatTaka(rowSum.get(day))}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" className={tbl.footHead}>
                    Total
                  </th>
                  {columns.map((m) => (
                    <td key={m.id} className={tbl.footTd}>
                      {colSum.has(m.id) ? formatTaka(colSum.get(m.id)) : dash}
                    </td>
                  ))}
                  <td className={tbl.footTd}>{formatTaka(grand)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>

      <BazarDayDialog
        date={openDay}
        entries={entries.filter((e) => e.date === openDay)}
        memberName={nameOf}
        onClose={() => setOpenDay(null)}
      />
    </Card>
  )
}
