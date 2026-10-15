import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { setThemePref, useTheme } from '@/lib/appearance'

// One tap switches between light and dark (saved on this device).
export default function ThemeToggle() {
  const theme = useTheme()
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <Button variant="outline" size="icon" aria-label={`Switch to ${next} mode`} onClick={() => setThemePref(next)}>
      {theme === 'dark' ? <Sun /> : <Moon />}
    </Button>
  )
}
