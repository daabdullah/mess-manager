import { Menu } from 'lucide-react'
import { NavLink, useLocation } from 'react-router'
import { navItems } from '@/lib/nav'
import { cn } from '@/lib/utils'

const tab = 'press type-cap relative z-10 flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-full px-1 py-1.5 font-medium outline-none transition-colors duration-300'

// Phone and tablet: a floating glass tab bar. A drop of glass slides between the tabs like liquid.
export default function BottomNav({ onMenu }: { onMenu: () => void }) {
  const { pathname } = useLocation()
  const tabs = navItems.filter((item) => item.primary)
  const found = tabs.findIndex((item) => pathname === item.to || pathname.startsWith(item.to + '/'))
  const active = found === -1 ? tabs.length : found // the last slot is Menu
  const slots = tabs.length + 1

  return (
    <nav
      aria-label="Main"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
    >
      <div className="glass pointer-events-auto relative flex w-full max-w-md items-center rounded-full p-1.5">
        {/* the liquid drop */}
        <span
          aria-hidden
          className="glass-pill absolute top-1.5 bottom-1.5 left-1.5 rounded-full bg-primary/10 transition-transform duration-[650ms] ease-(--ease-spring)"
          style={{ width: `calc((100% - 0.75rem) / ${slots})`, transform: `translateX(${active * 100}%)` }}
        />
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => cn(tab, isActive ? 'text-primary' : 'text-muted-foreground')}>
            <Icon className="size-5" />
            <span className="max-w-full truncate">{label}</span>
          </NavLink>
        ))}
        <button type="button" onClick={onMenu} aria-label="Open menu" className={cn(tab, active === tabs.length ? 'text-primary' : 'text-muted-foreground')}>
          <Menu className="size-5" />
          <span>Menu</span>
        </button>
      </div>
    </nav>
  )
}
