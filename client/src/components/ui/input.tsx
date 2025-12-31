import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // 🚀 MÜHÜR: Yükseklik h-11 (44px) ve h-12 (48px) geçişiyle Touch Target mühürlendi
          // 🚀 MÜHÜR: text-base (16px) ile iOS otomatik yakınlaştırma (zoom) hatası engellendi
          "flex h-11 md:h-12 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2 text-base font-bold text-white shadow-inner transition-all backdrop-blur-md placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50 disabled:cursor-not-allowed disabled:opacity-50 file:border-0 file:bg-transparent file:text-sm file:font-black",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }