import MealsForm from '@/components/MealsForm'
import MealsTable from '@/components/MealsTable'

export default function Meals() {
  return (
    <div className="space-y-5">
      <MealsForm />
      <MealsTable />
    </div>
  )
}