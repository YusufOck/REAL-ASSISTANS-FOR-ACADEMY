import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const labelVariants = cva(
  // 🚀 MÜHÜR: ResearchOS karakteristiği olan font-black, uppercase ve tracking eklendi
  "text-[10px] md:text-[11px] font-black leading-none uppercase tracking-[0.2em] text-slate-500 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 transition-colors"
)

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    // 🚀 MÜHÜR: Label metinlerinin seçimini (selection) engelleyerek dokunmatik cihazlarda daha stabil bir UI sağlandı
    className={cn(labelVariants(), "select-none", className)}
    {...props}
  />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }