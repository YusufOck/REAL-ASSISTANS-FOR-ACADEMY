// src/App.tsx - Landing Page Entegrasyonu ve Rotalama
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner" 

// Sayfa Importları
import LandingPage from "./pages/LandingPage" // 🚀 YENİ: Vitrin Sayfası
import Dashboard from "./pages/Dashboard"
import Login from "./pages/Login"
import Register from "./pages/Register"
import Profile from "./pages/Profile"
import ResearcherDetail from "./pages/ResearcherDetail"

function App() {
  return (
    <Router>
      {/* Global Bildirim Sistemi */}
      <Toaster 
          position="top-right" 
          richColors 
          theme="light" 
          closeButton
      />

      <Routes>
        {/* --- KAMUYA AÇIK ROTALAR (Public) --- */}
        {/* Ana vitrin artık en tepede */}
        <Route path="/" element={<LandingPage />} />
        
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* --- ÖZEL ROTALAR (Private/Protected) --- */}
        {/* 🛡️ Mentor Notu: Buraya ileride AuthGuard eklenmeli */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/researcher/:id" element={<ResearcherDetail />} />

        {/* --- HATA YÖNETİMİ --- */}
        {/* Tanımlanmayan tüm yolları ana sayfaya otonom olarak yönlendir */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App