import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner" 

// 👇 EKLENEN IMPORT: Dashboard dosyanı sahneye çağırıyoruz
import Dashboard from "./pages/Dashboard"
import Login from "./pages/Login"
import Register from "./pages/Register"

function App() {
  return (
    <Router>
      <Toaster 
         position="top-right" 
         richColors 
         theme="light" 
         closeButton
      />

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* 👇 DÜZELTİLEN SATIR: Artık o saçma div yok, gerçek Dashboard var */}
        <Route path="/dashboard" element={<Dashboard />} />
        
        <Route path="/" element={<Login />} />
      </Routes>
    </Router>
  )
}

export default App