import * as React from 'react'
import { Switch as SwitchPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'

// iOS style on/off toggle.
function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'inline-flex h-[31px] w-[51px] shrink-0 items-center rounded-full outline-none transition-colors duration-300 ease-(--ease-ios) disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[#34c759] data-[state=unchecked]:bg-fill-2 dark:data-[state=checked]:bg-[#30d158] shadow-[inset_0_2px_4px_rgba(0,0,0,0.12),inset_0_0_0_1px_var(--glass-border)]',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-[27px] rounded-full bg-[linear-gradient(180deg,#fff,#f1f1f4)] shadow-[0_3px_8px_rgba(0,0,0,0.28),inset_0_1px_0_#fff] transition-transform duration-300 ease-(--ease-spring) data-[state=checked]:translate-x-[22px] data-[state=unchecked]:translate-x-0.5" />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
