import { BrowserRouter as Router, Routes, Route } from "react-router-dom"

// 👇 DÜZELTİLEN IMPORT BURASI:
// Ham "sonner" yerine, senin projenin içindeki süslü bileşeni çağırıyoruz.
import { Toaster } from "@/components/ui/sonner" 

import Login from "./pages/Login"
import Register from "./pages/Register"

function App() {
  return (
    <Router>
      {/* Bu Toaster artık Shadcn stilleriyle çalışacak */}
      <Toaster 
         position="top-right" 
         richColors 
         theme="light" 
         closeButton
      />

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<div>Dashboard Sayfası</div>} />
        <Route path="/" element={<Login />} />
      </Routes>
    </Router>
  )
}

export default App