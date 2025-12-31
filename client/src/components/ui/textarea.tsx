import * as React from "react"
import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        // 🚀 MÜHÜR: text-base (16px) ile iOS otomatik yakınlaştırma hatası tüm sistemde engellendi
        // 🚀 MÜHÜR: min-h-[120px] ile veri girişi alanı kullanıcı dostu hale getirildi
        "flex min-h-[120px] w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-base font-medium text-white shadow-inner transition-all backdrop-blur-md placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50 disabled:cursor-not-allowed disabled:opacity-50 custom-scrollbar",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }