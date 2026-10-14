import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "press inline-flex shrink-0 select-none items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap outline-none disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary bg-[linear-gradient(180deg,rgba(255,255,255,0.32),rgba(255,255,255,0)_60%)] text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-1px_0_rgba(0,0,0,0.08),0_8px_18px_-8px_color-mix(in_srgb,var(--primary)_80%,transparent)] hover:brightness-110",
        secondary:
          "bg-primary/12 text-primary shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--primary)_24%,transparent),inset_0_1px_0_rgba(255,255,255,0.45)] backdrop-blur-md hover:bg-primary/20",
        outline: "glass-pill text-foreground hover:brightness-105",
        ghost: "text-foreground hover:bg-fill",
        "ghost-destructive": "text-danger hover:bg-danger/12",
        destructive:
          "bg-danger/12 text-danger shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--danger)_24%,transparent),inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-md hover:bg-danger/20",
        link: "rounded-md text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "type-body h-10 px-4",
        xs: "type-foot h-7 px-2.5",
        sm: "type-sub h-8 px-3.5",
        lg: "type-headline h-12 px-6",
        icon: "size-10",
        "icon-xs": "size-7",
        "icon-sm": "size-8",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
