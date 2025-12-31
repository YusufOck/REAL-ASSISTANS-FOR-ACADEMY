import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    // 🚀 MÜHÜR: rounded-3xl (daha yumuşak köşeler) ve glassmorphism efektleri eklendi
    className={cn(
      "rounded-[2rem] md:rounded-[2.5rem] border border-white/10 bg-white/[0.03] backdrop-blur-md text-slate-100 shadow-2xl transition-all duration-300 hover:bg-white/[0.05]",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    // 🚀 MÜHÜR: Mobilde p-5, desktopta p-8 (Responsive Padding)
    className={cn("flex flex-col space-y-2 p-5 md:p-8 border-b border-white/5", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    // 🚀 MÜHÜR: Font-black ve tracking eklendi
    className={cn("font-black leading-tight tracking-tight text-white uppercase italic", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  // 🚀 MÜHÜR: Padding hiyerarşisi düzenlendi
  <div ref={ref} className={cn("p-5 md:p-8 pt-6 md:pt-8", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-5 md:p-8 pt-0 border-t border-white/5 mt-4", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }