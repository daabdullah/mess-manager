import { useEffect, useRef, useState, type TouchEvent } from 'react'
import { Outlet, useLocation } from 'react-router'
import BottomNav from '@/components/BottomNav'
import MonthBanner from '@/components/MonthBanner'
import Sidebar from '@/components/Sidebar'
import TopBar from '@/components/TopBar'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { findNav } from '@/lib/nav'
import { cn } from '@/lib/utils'

const COLLAPSE_KEY = 'sidebar-collapsed'

// Pages that show one month's data (the closed-month banner belongs on these).
const MONTH_PAGES = ['/bazar', '/meals', '/accessories', '/bills', '/summary']

// Desktop (1024px+): floating glass sidebar. Phone and tablet: floating tab bar plus a drawer.
// Above every page: the sticky top bar and a large title.
export default function AppLayout() {
  const { pathname } = useLocation()
  const current = findNav(pathname)

  // ----- desktop: collapse to icons only (remembered in this browser) -----
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1'
    } catch {
      return false
    }
  })
  function toggleCollapsed() {
    setCollapsed((value) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, value ? '0' : '1')
      } catch {
        // storage blocked: the setting just won't be remembered
      }
      return !value
    })
  }

  // ----- phone/tablet: drawer -----
  // The drawer is open only for the page it was opened on, so any page change closes it.
  const [openedAt, setOpenedAt] = useState<string | null>(null)
  const drawerOpen = openedAt === pathname
  const setDrawerOpen = (open: boolean) => setOpenedAt(open ? pathname : null)

  // If the window grows to desktop size, close the drawer.
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)')
    const onChange = () => {
      if (query.matches) setOpenedAt(null)
    }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  // Swipe left on the drawer to close it.
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  function onTouchStart(e: TouchEvent) {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
  }
  function onTouchEnd(e: TouchEvent) {
    const start = touchStart.current
    touchStart.current = null
    if (!start) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    if (dx < -60 && Math.abs(dx) > Math.abs(dy) * 1.5) setDrawerOpen(false)
  }

  return (
    <div className="flex min-h-dvh text-foreground">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'sticky top-0 hidden h-dvh shrink-0 p-3 transition-[width] duration-500 ease-(--ease-ios) lg:block',
          collapsed ? 'w-[5.5rem]' : 'w-72',
        )}
      >
        <div className="glass-strong h-full overflow-hidden rounded-[2rem]">
          <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
        </div>
      </aside>

      {/* Phone/tablet drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent aria-describedby={undefined} className="lg:hidden" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <Sidebar onNavigate={() => setDrawerOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-6 lg:pb-12">
          {current && (
            <div className="rise mt-1 mb-5">
              <h1 className="type-large font-bold">{current.label}</h1>
            </div>
          )}
          {MONTH_PAGES.some((p) => pathname === p || pathname.startsWith(p + '/')) && <MonthBanner />}
          <div key={pathname} className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>

      <BottomNav onMenu={() => setDrawerOpen(true)} />
    </div>
  )
}
