import { format, parseISO } from 'date-fns'
import { Calculator, Receipt, ShoppingBasket, Users, UtensilsCrossed } from 'lucide-react'
import CloseMonthCard from '@/components/CloseMonthCard'
import { EmptyState, ErrorState, Loading } from '@/components/States'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Notice } from '@/components/ui/notice'
import { Stat } from '@/components/ui/stat'
import { tbl } from '@/components/ui/table'
import { getOrGive } from '@/lib/calc'
import { formatTaka } from '@/lib/format'
import { useMonth } from '@/lib/month'
import { buildSummary, formatMeals, sumOf, useSummary, type SummaryRow } from '@/lib/summary'

// "Get ৳1,200" / "Give ৳340" / "Settled", with the colour to match.
function finalOf(value: number) {
  const { direction, amount } = getOrGive(value)
  if (direction === 'get') return { label: 'Will get', tone: 'success' as const, color: 'text-success', amount }
  if (direction === 'give') return { label: 'Will give', tone: 'danger' as const, color: 'text-danger', amount }
  return { label: 'Settled', tone: 'neutral' as const, color: 'text-muted-foreground', amount: 0 }
}

function MemberCard({ row }: { row: SummaryRow }) {
  const final = finalOf(row.final)
  const lines: [string, string][] = [
    ['Bazar', formatTaka(row.bazarPaid)],
    ['Meals', formatMeals(row.meals)],
    ['Meal cost', formatTaka(row.mealCost)],
    ['Bills', formatTaka(row.billsShare)],
  ]
  return (
    <div className="surface min-w-0 rounded-3xl p-4">
      <div className="flex items-center gap-2.5">
        <Avatar name={row.name} size="sm" />
        <p className="type-body min-w-0 flex-1 truncate font-semibold">{row.name}</p>
        {!row.active && <Badge>Inactive</Badge>}
      </div>
      <div className="mt-4 space-y-1">
        <Badge tone={final.tone}>{final.label}</Badge>
        <p className={`type-title truncate font-semibold tabular-nums ${final.color}`}>{formatTaka(final.amount)}</p>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2.5 border-t pt-3">
        {lines.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="type-foot text-muted-foreground">{label}</dt>
            <dd className="type-sub truncate font-medium tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export default function Summary() {
  const { month } = useMonth()
  const query = useSummary(month)
  const monthName = format(parseISO(month), 'MMMM yyyy')

  if (query.isPending) return <Loading />
  if (query.isError && !query.data) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />

  const { summary, rows, billSplits } = buildSummary(query.data!, month)

  if (rows.length === 0) {
    return (
      <Card>
        <EmptyState icon={Users} title="No members yet">
          Add members on the Members page to see the summary for {monthName}.
        </EmptyState>
      </Card>
    )
  }

  const warnBills = billSplits.filter((b) => b.warn)
  const total = (pick: (r: SummaryRow) => number) => sumOf(rows.map(pick))

  return (
    <div className="space-y-5">
      {/* Top cards */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Bazar" value={formatTaka(summary.totalBazar)} icon={ShoppingBasket} tone="green" />
          <Stat label="Meals" value={formatMeals(summary.totalMeals)} icon={UtensilsCrossed} tone="orange" />
          <Stat label="Meal rate" value={formatTaka(summary.mealRate)} icon={Calculator} tone="blue" />
          <Stat label="Bills" value={formatTaka(summary.totalBills)} icon={Receipt} tone="pink" />
        </div>
        {summary.totalMeals === 0 && summary.totalBazar > 0 && <Notice tone="warning">No meals recorded in {monthName}, so the meal rate is ৳0.</Notice>}
      </div>

      {/* One card per member */}
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => (
          <MemberCard key={row.memberId} row={row} />
        ))}
      </div>

      <CloseMonthCard />

      {/* Bazar vs meal cost per member */}
      <Card>
        <CardHeader>
          <CardTitle>Bazar and meals</CardTitle>
        </CardHeader>
        <CardContent flush>
          <div className={`${tbl.scroll} border-t`}>
            <table className={tbl.table}>
              <thead>
                <tr>
                  <th className={tbl.thFirst}>Member</th>
                  <th className={tbl.th}>Bazar</th>
                  <th className={tbl.th}>Meals</th>
                  <th className={tbl.th}>Meal ৳</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.memberId} className={tbl.tr}>
                    <th scope="row" className={`${tbl.rowHead} ${tbl.rowHeadPad}`}>
                      {r.name}
                    </th>
                    <td className={tbl.td}>{formatTaka(r.bazarPaid)}</td>
                    <td className={tbl.td}>{formatMeals(r.meals)}</td>
                    <td className={`${tbl.td} font-medium`}>{formatTaka(r.mealCost)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" className={tbl.footHead}>
                    Total
                  </th>
                  <td className={tbl.footTd}>{formatTaka(summary.totalBazar)}</td>
                  <td className={tbl.footTd}>{formatMeals(summary.totalMeals)}</td>
                  <td className={tbl.footTd}>{formatTaka(total((r) => r.mealCost))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Final amounts */}
      <Card>
        <CardHeader>
          <CardTitle>Final amounts</CardTitle>
        </CardHeader>
        <CardContent flush>
          <div className={`${tbl.scroll} border-t`}>
            <table className={tbl.table}>
              <thead>
                <tr>
                  <th className={tbl.thFirst}>Member</th>
                  <th className={tbl.th}>Meal bal.</th>
                  <th className={tbl.th}>Access.</th>
                  <th className={tbl.th}>Bills</th>
                  <th className={`${tbl.th} text-foreground`}>Final</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.memberId} className={tbl.tr}>
                    <th scope="row" className={`${tbl.rowHead} ${tbl.rowHeadPad}`}>
                      {r.name}
                    </th>
                    <td className={tbl.td}>{formatTaka(r.mealBalance)}</td>
                    <td className={tbl.td}>{formatTaka(r.accessoriesNet)}</td>
                    <td className={tbl.td}>{formatTaka(r.billsShare)}</td>
                    <td className={`${tbl.td} font-bold ${finalOf(r.final).color}`}>{formatTaka(r.final)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" className={tbl.footHead}>
                    Total
                  </th>
                  <td className={tbl.footTd}>{formatTaka(total((r) => r.mealBalance))}</td>
                  <td className={tbl.footTd}>{formatTaka(total((r) => r.accessoriesNet))}</td>
                  <td className={tbl.footTd}>{formatTaka(total((r) => r.billsShare))}</td>
                  <td className={tbl.footTd}>{formatTaka(total((r) => r.final))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Each bill's split */}
      <Card>
        <CardHeader>
          <CardTitle>Bills split</CardTitle>
        </CardHeader>
        <CardContent flush>
          {billSplits.length === 0 ? (
            <EmptyState icon={Receipt} title="No bills yet" className="py-6">
              Add bills on the Bills page.
            </EmptyState>
          ) : (
            <>
              <div className={`${tbl.scroll} border-t`}>
                <table className={tbl.table}>
                  <thead>
                    <tr>
                      <th className={tbl.thFirst}>Bill</th>
                      {rows.map((r) => (
                        <th key={r.memberId} className={tbl.th}>
                          {r.name}
                        </th>
                      ))}
                      <th className={`${tbl.th} text-foreground`}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billSplits.map((b) => (
                      <tr key={b.bill.id} className={tbl.tr}>
                        <th scope="row" className={`${tbl.rowHead} ${tbl.rowHeadPad}`}>
                          {b.bill.name}
                        </th>
                        {rows.map((r) => (
                          <td key={r.memberId} className={tbl.td}>
                            {formatTaka(b.shares[r.memberId])}
                          </td>
                        ))}
                        <td className={`${tbl.td} font-semibold`}>{formatTaka(b.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th scope="row" className={tbl.footHead}>
                        Total
                      </th>
                      {rows.map((r) => (
                        <td key={r.memberId} className={tbl.footTd}>
                          {formatTaka(r.billsShare)}
                        </td>
                      ))}
                      <td className={tbl.footTd}>{formatTaka(summary.totalBills)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              {warnBills.length > 0 && (
                <div className="space-y-2 px-(--pad) pt-4">
                  {warnBills.map((b) => (
                    <Notice key={b.bill.id} tone="warning">
                      {b.bill.name}: shares do not add up or one is negative. Check its fixed amounts on Bills.
                    </Notice>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
