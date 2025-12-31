// src/App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner" 
import DashboardLayout from "./layouts/DashboardLayout" // Yeni eklendi

import LandingPage from "./pages/LandingPage"
import Dashboard from "./pages/Dashboard"
import Login from "./pages/Login"
import Register from "./pages/Register"
import Profile from "./pages/Profile"
import ResearcherDetail from "./pages/ResearcherDetail"
import Projects from "./pages/Projects" 
import UsersPage from "./pages/UsersPage"

function App() {
  return (
    <Router>
      <Toaster 
          // 🚀 MÜHÜR: Mobil uyumlu pozisyon (Küçük ekranda bottom-center, büyükte top-right)
          position={window.innerWidth < 768 ? "bottom-center" : "top-right"} 
          richColors 
          theme="dark" // Sistem temasına uygun karanlık mod
          closeButton
      />

      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* 🛡️ PROTECTED DASHBOARD ROUTES (Layout Sarmalı) */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} /> 
          <Route path="/users" element={<UsersPage />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/researcher/:id" element={<ResearcherDetail />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App