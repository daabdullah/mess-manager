import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import LiveDot from '@/components/LiveDot'
import MonthPicker from '@/components/MonthPicker'
import ThemeToggle from '@/components/ThemeToggle'
import { findNav } from '@/lib/nav'
import { cn } from '@/lib/utils'

// Sticky bar: month picker and live dot. It turns to glass and shows the page title once you scroll.
export default function TopBar() {
  const { pathname } = useLocation()
  const title = findNav(pathname)?.label ?? 'Mess Manager'
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={cn('sticky top-0 z-30 pt-[env(safe-area-inset-top)] transition-[background-color,box-shadow] duration-300', scrolled ? 'glass-bar' : 'bg-transparent')}>
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 sm:px-6">
        <p
          aria-hidden={!scrolled}
          className={cn(
            'type-headline min-w-0 flex-1 truncate font-semibold transition-[opacity,transform] duration-300 ease-(--ease-ios)',
            scrolled ? 'translate-y-0 opacity-100' : 'translate-y-1.5 opacity-0',
          )}
        >
          {title}
        </p>
        <MonthPicker />
        <LiveDot />
        <ThemeToggle />
      </div>
    </header>
  )
}
