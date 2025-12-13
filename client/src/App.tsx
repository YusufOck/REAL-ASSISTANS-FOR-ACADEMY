import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner" // <-- Bildirim kutusu
import Login from "@/pages/Login"
import Register from "@/pages/Register"
import Dashboard from "@/pages/Dashboard" // <-- Yeni sayfa

function App() {
  return (
    <BrowserRouter>
      {/* Sayfalar */}
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} /> {/* <-- Yeni Rota */}
      </Routes>
      
      {/* Bildirimlerin Görüneceği Yer (Görünmez ama gereklidir) */}
      <Toaster position="top-right" richColors />
    </BrowserRouter>
  )
}

export default App