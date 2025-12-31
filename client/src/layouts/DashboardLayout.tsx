// src/layouts/DashboardLayout.tsx
import { useState, useEffect } from "react"
import { Outlet, useLocation } from "react-router-dom"
import Sidebar from "@/components/ui/Sidebar" // Dashboard içindeki sidebar'ı buraya taşıyacağız

export default function DashboardLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { pathname } = useLocation()

  // Sayfa değiştiğinde mobil menüyü otomatik kapat
  useEffect(() => {
    setIsMobileMenuOpen(false)
    window.scrollTo(0, 0) // Scroll reset mühürlendi
  }, [pathname])

  return (
    <div className="h-screen overflow-hidden bg-[#0b1020] text-slate-100 font-sans flex">
      {/* Buraya Dashboard.tsx içindeki <aside> ve mobil menü mantığını koymalısın */}
      <Sidebar isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />
      
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden relative">
        {/* Sayfa içerikleri buraya render edilecek */}
        <Outlet context={{ setIsMobileMenuOpen }} />
      </main>
    </div>
  )
}