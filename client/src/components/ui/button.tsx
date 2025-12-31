import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // 🚀 MÜHÜR: active:scale-95 ve transition eklendi (Mobil dokunma hissi için)
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // 🚀 MÜHÜR: Indigo temasıyla uyumlu gölge ve gradyan desteği eklendi
        default:
          "bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 shadow-primary/20",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-white/10 bg-transparent shadow-sm hover:bg-white/5 hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-white/5 hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        // 🚀 MÜHÜR: Mobil için minimum 44px (h-11) kuralı uygulandı
        default: "h-11 px-5 py-2 md:h-12 md:px-6", 
        sm: "h-9 rounded-lg px-3 text-xs md:h-10",
        lg: "h-14 rounded-2xl px-10 text-base md:h-16",
        icon: "h-11 w-11 md:h-12 md:w-12", // İkon butonları artık mobilde daha kolay basılabilir
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }