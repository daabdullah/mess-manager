import * as React from "react"
import { ChevronsUpDown } from "lucide-react"
import { cn } from "cn"

// A native select (best on phones) with the same look as Input. className goes on the wrapper.
function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className={cn("relative w-full min-w-0", className)}>
      <select
        data-slot="select"
        className="glass-field type-body h-11 w-full min-w-0 appearance-none rounded-xl pr-10 pl-3.5 transition-[outline-color] duration-200 ease-(--ease-ios) outline-offset-0 focus-visible:outline-[3px] focus-visible:outline-primary/50 disabled:cursor-not-allowed disabled:opacity-50 [&>option]:bg-card [&>option]:text-foreground"
        {...props}
      >
        {children}
      </select>
      <ChevronsUpDown aria-hidden className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-tertiary" />
    </div>
  )
}

export { Select }
