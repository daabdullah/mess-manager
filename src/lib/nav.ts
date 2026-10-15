import { KeyRound, LayoutDashboard, Package, Receipt, ShoppingBasket, Users, UtensilsCrossed, type LucideIcon } from 'lucide-react'
import type { Tone } from '@/components/ui/icon-tile'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  tone: Tone
  primary?: boolean // shown in the phone tab bar (the rest live under "Menu")
}

// The one menu used by the sidebar, the drawer and the phone tab bar.
export const navItems: NavItem[] = [
  { to: '/summary', label: 'Summary', icon: LayoutDashboard, tone: 'blue', primary: true },
  { to: '/bazar', label: 'Bazar', icon: ShoppingBasket, tone: 'green', primary: true },
  { to: '/meals', label: 'Meals', icon: UtensilsCrossed, tone: 'orange', primary: true },
  { to: '/accessories', label: 'Accessories', icon: Package, tone: 'purple', primary: true },
  { to: '/bills', label: 'Bills', icon: Receipt, tone: 'pink' },
  { to: '/members', label: 'Members', icon: Users, tone: 'teal' },
  { to: '/users', label: 'Users', icon: KeyRound, tone: 'gray' },
]

export const findNav = (pathname: string) => navItems.find((item) => pathname === item.to || pathname.startsWith(item.to + '/'))
