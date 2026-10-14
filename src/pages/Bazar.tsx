import BazarForm from '@/components/BazarForm'
import BazarTable from '@/components/BazarTable'
import { MyBalanceCards } from '@/components/AccessoriesTotals'

export default function Bazar() {
  return (
    <div className="space-y-5">
      <MyBalanceCards kind="bazar" />
      <BazarForm />
      <BazarTable />
    </div>
  )
}