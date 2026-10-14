import * as React from "react"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "glass-field type-body h-11 w-full min-w-0 rounded-xl px-3.5 transition-[outline-color,filter] duration-200 ease-(--ease-ios) outline-offset-0 placeholder:text-tertiary focus-visible:outline-[3px] focus-visible:outline-primary/50 disabled:cursor-not-allowed disabled:opacity-50 read-only:font-medium aria-invalid:outline-[3px] aria-invalid:outline-danger/50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
