import BillTypes from '@/components/BillTypes'
import BillsTable from '@/components/BillsTable'

export default function Bills() {
  return (
    <div className="space-y-5">
      <BillTypes />
      <BillsTable />
    </div>
  )
}