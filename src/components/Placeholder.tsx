import { format, parseISO } from 'date-fns'
import { useMonth } from '@/lib/month'

// Temporary empty page body, replaced when each page is built.
export default function Placeholder({ name }: { name: string }) {
  const { month } = useMonth()
  return (
    <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
      {name} for {format(parseISO(month), 'MMMM yyyy')} will appear here.
    </div>
  )
}