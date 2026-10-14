// Money calculations for Mess Manager. Plain functions: no UI, no database.
// Money is in whole taka where a split is needed (bills). Meal and accessory
// results are rounded to 2 decimals (paisa) so the screen never shows float noise.

export type FixedMap = Record<string, number> // memberId -> fixed amount

const round2 = (n: number) => Math.round(n * 100) / 100 + 0 // "+ 0" turns -0 into 0
const num = (n: unknown) => (Number.isFinite(Number(n)) ? Number(n) : 0)

// ---------------------------------------------------------------------------
// 1) Split a total: fixed amounts first, the rest equally among the others.
// ---------------------------------------------------------------------------
// Whole taka, and the shares always add up to the total. The leftover taka go to
// the first members (in the order of memberIds), so 5000 / 3 = 1667, 1667, 1666.
// Notes: if everyone has a fixed amount, nothing is left to split and the shares are
// just the fixed amounts. If the fixed amounts are more than the total, the others get
// negative shares (the totals still add up), so the screen should warn about it.
export function splitWithFixed(total: number, memberIds: string[], fixedMap: FixedMap = {}): Record<string, number> {
  const ids = [...new Set(memberIds)]
  const result: Record<string, number> = {}
  const others: string[] = []
  let remainder = Math.round(num(total))

  for (const id of ids) {
    if (Object.hasOwn(fixedMap, id) && Number.isFinite(fixedMap[id])) {
      const fixed = Math.round(fixedMap[id])
      result[id] = fixed
      remainder -= fixed
    } else {
      others.push(id)
    }
  }

  if (others.length > 0) {
    const base = Math.floor(remainder / others.length)
    let extra = remainder - base * others.length // 0 .. others.length - 1
    for (const id of others) {
      result[id] = base + (extra > 0 ? 1 : 0)
      if (extra > 0) extra -= 1
    }
  }
  return result
}

// ---------------------------------------------------------------------------
// 2) The amount of a bill in a month: the latest amount whose effective month
//    is at or before that month. Months are 'YYYY-MM-01', so plain text
//    comparison orders them correctly. No amount yet = 0.
// ---------------------------------------------------------------------------
export interface BillAmount {
  effective_month: string
  amount: number
}

export function getBillAmountForMonth(history: BillAmount[], month: string): number {
  let best: BillAmount | null = null
  for (const row of history) {
    if (row.effective_month > month) continue
    if (!best || row.effective_month > best.effective_month) best = row
  }
  return best ? num(best.amount) : 0
}

// ---------------------------------------------------------------------------
// 3) The monthly summary / settlement.
// ---------------------------------------------------------------------------
// Input rows use the same field names as the API / database rows, so they can be
// passed in as they are.
export interface BazarRow {
  member_id: string
  amount: number
}
export interface MealRow {
  member_id: string
  count: number
}
export interface AccessoryRow {
  paid_by: string
  amount: number
}
export interface BillInput {
  amounts: BillAmount[] // the bill's amount history
  fixed?: FixedMap // fixed shares of this bill in this month
}

export interface SummaryInput {
  month: string // 'YYYY-MM-01'
  memberIds: string[] // everyone who takes part in this month's settlement
  bazar: BazarRow[]
  meals: MealRow[]
  accessories: AccessoryRow[]
  bills: BillInput[]
}

export interface MemberSummary {
  memberId: string
  bazarPaid: number
  meals: number
  mealCost: number // meals x meal rate
  mealBalance: number // bazar paid - meal cost
  accessoriesNet: number // paid by them - equal share
  billsShare: number
  final: number // mealBalance + accessoriesNet - billsShare. Positive = will get, negative = will give
}

export interface MonthSummary {
  totalBazar: number
  totalMeals: number
  mealRate: number // total bazar / total meals (0 when there are no meals)
  totalBills: number
  members: MemberSummary[] // same order as memberIds
}

// Rows of people who are not in memberIds are ignored everywhere (also in the totals),
// so the meal balances add up to zero, and so do the accessory nets. Pass every member
// who has any entry this month. The finals add up to minus the total bills (the house
// pays the bills to outsiders, so the members together "give" that much).
// The meal rate is used unrounded for the costs, so no money is lost; the rate in the
// result is only rounded for showing. Each number is rounded to 2 decimals, so when the
// rate is not a round number the meal balances can differ from zero by a few paisa.
export function calcMonthSummary(input: SummaryInput): MonthSummary {
  const ids = [...new Set(input.memberIds)]
  const zero = () => Object.fromEntries(ids.map((id) => [id, 0])) as Record<string, number>

  const bazarPaid = zero()
  const meals = zero()
  const accessoriesPaid = zero()
  const billsShare = zero()

  for (const row of input.bazar) if (row.member_id in bazarPaid) bazarPaid[row.member_id] += num(row.amount)
  for (const row of input.meals) if (row.member_id in meals) meals[row.member_id] += num(row.count)
  for (const row of input.accessories) if (row.paid_by in accessoriesPaid) accessoriesPaid[row.paid_by] += num(row.amount)

  const sum = (values: Record<string, number>) => ids.reduce((total, id) => total + values[id], 0)
  const totalBazar = sum(bazarPaid)
  const totalMeals = sum(meals)
  const mealRate = totalMeals > 0 ? totalBazar / totalMeals : 0
  const accessoryShare = ids.length > 0 ? sum(accessoriesPaid) / ids.length : 0

  // Bills: each bill is split on its own (fixed shares first), then added up per member.
  let totalBills = 0
  for (const bill of input.bills) {
    const amount = Math.round(getBillAmountForMonth(bill.amounts, input.month))
    totalBills += amount
    const shares = splitWithFixed(amount, ids, bill.fixed ?? {})
    for (const id of ids) billsShare[id] += shares[id]
  }

  const members = ids.map((id): MemberSummary => {
    const mealCost = round2(meals[id] * mealRate)
    const mealBalance = round2(round2(bazarPaid[id]) - mealCost)
    const accessoriesNet = round2(accessoriesPaid[id] - accessoryShare)
    return {
      memberId: id,
      bazarPaid: round2(bazarPaid[id]),
      meals: round2(meals[id]),
      mealCost,
      mealBalance,
      accessoriesNet,
      billsShare: billsShare[id],
      final: round2(mealBalance + accessoriesNet - billsShare[id]),
    }
  })

  return {
    totalBazar: round2(totalBazar),
    totalMeals: round2(totalMeals),
    mealRate: round2(mealRate),
    totalBills,
    members,
  }
}
// Turns a signed balance into "get" / "give" / "even" plus a positive amount for showing.
export interface GetOrGive {
  direction: 'get' | 'give' | 'even'
  amount: number // never negative
}

export function getOrGive(value: number): GetOrGive {
  const rounded = round2(num(value))
  return {
    direction: rounded > 0 ? 'get' : rounded < 0 ? 'give' : 'even',
    amount: Math.abs(rounded),
  }
}