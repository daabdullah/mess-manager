import { NavLink, useLocation } from 'react-router'
import { LogOut, PanelLeftClose, PanelLeftOpen, UtensilsCrossed } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { IconTile } from '@/components/ui/icon-tile'
import { useMe, logout } from '@/lib/auth'
import { navItems } from '@/lib/nav'
import { cn } from '@/lib/utils'

interface SidebarProps {
  collapsed?: boolean // desktop only: icons without labels
  onToggleCollapse?: () => void // desktop only: shows the collapse button
  onNavigate?: () => void // drawer only: called when a page is picked
}

const row = 'press type-body relative z-10 flex h-11 w-full items-center gap-3 rounded-2xl px-2 font-medium outline-none'
const footRow = 'press type-sub flex h-10 w-full items-center gap-3 rounded-2xl px-3 font-medium text-muted-foreground outline-none hover:bg-fill hover:text-foreground'

// The menu itself. The desktop sidebar and the phone drawer both render this.
export default function Sidebar({ collapsed = false, onToggleCollapse, onNavigate }: SidebarProps) {
  const me = useMe()
  const { pathname } = useLocation()
  const active = navItems.findIndex((item) => pathname === item.to || pathname.startsWith(item.to + '/'))
  const email = me.data?.email ?? ''

  return (
    <div className="flex h-full flex-col">
      {/* In the drawer, leave room on the right for the close button */}
      <div className={cn('flex h-[4.5rem] shrink-0 items-center gap-3 px-5', onNavigate && 'pr-16', collapsed && 'justify-center px-0')}>
        <IconTile icon={UtensilsCrossed} tone="blue" size="lg" />
        {!collapsed && (
          <div className="min-w-0">
            <p className="type-headline truncate font-semibold">Mess Manager</p>
            <p className="type-foot truncate text-muted-foreground">Shared house costs</p>
          </div>
        )}
      </div>

      <nav className="relative flex-1 space-y-1 overflow-y-auto px-3 py-1">
        {/* a drop of glass that slides to the open page (each row is 44px + 4px gap) */}
        <span
          aria-hidden
          className="glass-pill absolute inset-x-3 top-1 h-11 rounded-2xl transition-[transform,opacity] duration-[650ms] ease-(--ease-spring)"
          style={{ transform: `translateY(${Math.max(active, 0) * 48}px)`, opacity: active === -1 ? 0 : 1 }}
        />
        {navItems.map(({ to, label, icon, tone }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                row,
                collapsed && 'justify-center px-0',
                isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              )
            }
          >
            <IconTile icon={icon} tone={tone} size="md" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="shrink-0 space-y-1 border-t p-3">
        <div className={cn('flex items-center gap-3 px-1 py-1.5', collapsed && 'justify-center px-0')} title={collapsed ? email : undefined}>
          <Avatar name={email || '?'} size="sm" />
          {!collapsed && <p className="type-sub min-w-0 flex-1 truncate font-medium">{email}</p>}
        </div>
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand menu' : 'Collapse menu'}
            aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
            className={cn(footRow, collapsed && 'justify-center px-0')}
          >
            {collapsed ? <PanelLeftOpen className="size-5 shrink-0" /> : <PanelLeftClose className="size-5 shrink-0" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        )}
        <button
          type="button"
          onClick={logout}
          title={collapsed ? 'Logout' : undefined}
          className={cn(footRow, 'hover:bg-danger/12 hover:text-danger', collapsed && 'justify-center px-0')}
        >
          <LogOut className="size-5 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  )
}
