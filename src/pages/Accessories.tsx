import AccessoriesForm from '@/components/AccessoriesForm'
import AccessoriesList from '@/components/AccessoriesList'
import AccessoriesTotals, { MyBalanceCards } from '@/components/AccessoriesTotals'

export default function Accessories() {
  return (
    <div className="space-y-6">
      <MyBalanceCards kind="accessories" />
      <AccessoriesTotals />
      <AccessoriesForm />
      <AccessoriesList />
    </div>
  )
}