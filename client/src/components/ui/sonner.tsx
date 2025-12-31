// src/components/ui/sonner.tsx
import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      // 🚀 MÜHÜR: Mobil cihazlarda bildirimlerin parmakla kolay kapatılması ve okunması için alt-orta konum mühürlendi
      position="bottom-center"
      toastOptions={{
        classNames: {
          // 🚀 MÜHÜR: Glassmorphism ve ResearchOS karakteristik tipografisi eklendi
          toast:
            "group toast group-[.toaster]:bg-white/[0.08] group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-white group-[.toaster]:border-white/10 group-[.toaster]:shadow-[0_20px_50px_rgba(0,0,0,0.5)] group-[.toaster]:rounded-2xl group-[.toaster]:font-bold group-[.toaster]:p-4",
          description: "group-[.toast]:text-slate-400 group-[.toast]:text-[10px] group-[.toast]:uppercase group-[.toast]:tracking-widest",
          actionButton:
            "group-[.toast]:bg-indigo-500 group-[.toast]:text-white group-[.toast]:font-black group-[.toast]:text-[10px] group-[.toast]:uppercase group-[.toast]:tracking-widest group-[.toast]:rounded-xl",
          cancelButton:
            "group-[.toast]:bg-white/10 group-[.toast]:text-slate-300 group-[.toast]:font-bold group-[.toast]:rounded-xl",
          // 🚀 MÜHÜR: Başarı, hata ve bilgi ikon renkleri Indigo temasına senkronize edildi
          success: "group-[.toast]:text-emerald-400",
          error: "group-[.toast]:text-red-400",
          info: "group-[.toast]:text-indigo-400",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }