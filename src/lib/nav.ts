import { KeyRound, LayoutDashboard, Package, Receipt, ShoppingBasket, Users, UtensilsCrossed, type LucideIcon } from 'lucide-react'
import type { Tone } from '@/components/ui/icon-tile'

export interface NavItem {
  to: string
  label: string
  subtitle: string
  icon: LucideIcon
  tone: Tone
  primary?: boolean // shown in the phone tab bar (the rest live under "Menu")
}

// The one menu used by the sidebar, the drawer and the phone tab bar.
export const navItems: NavItem[] = [
  { to: '/summary', label: 'Summary', subtitle: 'Who gets and who gives this month', icon: LayoutDashboard, tone: 'blue', primary: true },
  { to: '/bazar', label: 'Bazar', subtitle: 'Shopping trips and what everyone spent', icon: ShoppingBasket, tone: 'green', primary: true },
  { to: '/meals', label: 'Meals', subtitle: 'Daily meal count for each member', icon: UtensilsCrossed, tone: 'orange', primary: true },
  { to: '/accessories', label: 'Accessories', subtitle: 'Shared things for the house', icon: Package, tone: 'purple', primary: true },
  { to: '/bills', label: 'Bills', subtitle: 'Rent, utilities and how they are split', icon: Receipt, tone: 'pink' },
  { to: '/members', label: 'Members', subtitle: 'People who share the house', icon: Users, tone: 'teal' },
  { to: '/users', label: 'Users', subtitle: 'Accounts, password and glass look', icon: KeyRound, tone: 'gray' },
]

export const findNav = (pathname: string) => navItems.find((item) => pathname === item.to || pathname.startsWith(item.to + '/'))
