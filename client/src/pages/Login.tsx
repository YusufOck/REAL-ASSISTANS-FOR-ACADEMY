import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner" 
import { authService } from "@/services/authService"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Atom, Lock, Loader2, Mail, Sparkles, ArrowRight, ShieldCheck } from "lucide-react"

export default function Login() {
  const [email, setEmail] = useState("") 
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const response = await authService.login({ email, password })
      localStorage.setItem("accessToken", response.access)
      localStorage.setItem("refreshToken", response.refresh)
      toast.success("Access Approved!", { description: "You have been sealed into the system.", duration: 2000 })
      setTimeout(() => navigate("/dashboard"), 1000)
    } catch (error: any) {
      toast.error("Login Failed", { description: "Authentication failed.", duration: 4000 })
    } finally { setIsLoading(false) }
  }

  return (
    // 🚀 MÜHÜR: Padding mobilde daraltıldı (p-4), yatayda taşmaları önlemek için overflow-hidden eklendi
    <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center p-4 md:p-6 relative overflow-hidden font-sans">
      
      {/* 🌌 BACKGROUND "SHOW" AREA */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-950/50 via-[#020617] to-[#020617]" />
        
        {/* Orbits - Mobilde ölçekleri optimize edildi */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] md:w-[1000px] h-[400px] md:h-[600px] border-[1px] border-blue-500/30 rounded-[50%] skew-y-12 animate-[spin_20s_linear_infinite] blur-[2px] opacity-40" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] md:w-[900px] h-[500px] md:h-[900px] border-[1px] border-purple-500/30 rounded-[50%] -skew-x-12 animate-[spin_15s_linear_reverse_infinite] blur-[2px] opacity-40" />

        <div className="absolute top-[-20%] -left-[10%] w-[400px] md:w-[800px] h-[400px] md:h-[800px] bg-blue-600/20 rounded-full blur-[100px] md:blur-[150px] animate-pulse-slow mix-blend-screen" />
        <div className="absolute bottom-[-20%] -right-[10%] w-[400px] md:w-[800px] h-[400px] md:h-[800px] bg-purple-600/20 rounded-full blur-[100px] md:blur-[150px] animate-pulse-slow animation-delay-2000 mix-blend-screen" />
        
        <div className="absolute inset-0 bg-[url('/assets/grid-pattern.png')] opacity-[0.05] bg-repeat mix-blend-overlay animate-[pulse_4s_ease-in-out_infinite]"></div>
      </div>

      {/* 🏝️ GLASS ISLAND: Login Panel */}
      {/* 🚀 MÜHÜR: Padding (p-8 md:p-12) ve border-radius responsive yapıldı */}
      <div className="relative z-10 w-full max-w-[480px] bg-white/[0.02] backdrop-blur-3xl rounded-[2.5rem] md:rounded-[3rem] border border-white/10 shadow-[0_0_100px_rgba(59,130,246,0.25)] p-8 md:p-12 animate-in zoom-in-95 duration-1000">
        
        <div className="absolute -inset-[1px] bg-gradient-to-br from-blue-500/30 via-transparent to-purple-500/30 rounded-[2.5rem] md:rounded-[3rem] -z-10 blur-sm opacity-70" />

        <div className="text-center mb-8 md:mb-12">
          <div className="relative inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-blue-500/10 rounded-2xl md:rounded-3xl mb-4 md:mb-6 border border-blue-400/20 shadow-inner group overflow-hidden">
            <Atom className="w-8 h-8 md:w-12 md:h-12 text-blue-400 group-hover:rotate-180 transition-transform duration-1000 relative z-10" />
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/40 to-purple-600/40 blur-xl opacity-40 animate-pulse" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter mb-2 md:mb-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-100 via-white to-indigo-200">
            ResearchOS
          </h1>
          <div className="flex items-center justify-center gap-2 opacity-80">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-blue-300">Intelligence Portal</span>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-6 md:space-y-8">
          <div className="space-y-2.5 md:space-y-3">
            <Label className="text-blue-300/50 ml-1 text-[9px] md:text-[10px] uppercase tracking-[0.3em] font-black">Authentication</Label>
            <div className="relative group">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400/60 group-focus-within:text-blue-400 transition-colors" />
              <Input 
                type="email" 
                placeholder="Email Address" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-14 md:h-16 pl-14 bg-black/30 border-white/5 rounded-xl md:rounded-2xl focus:ring-blue-500/30 focus:border-blue-500/50 transition-all placeholder:text-slate-600 text-white text-sm md:text-base"
              />
            </div>
          </div>

          <div className="space-y-2.5 md:space-y-3">
            <div className="relative group">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400/60 group-focus-within:text-blue-400 transition-colors" />
              <Input 
                type="password" 
                placeholder="Password (********)" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-14 md:h-16 pl-14 bg-black/30 border-white/5 rounded-xl md:rounded-2xl focus:ring-blue-500/30 focus:border-blue-500/50 transition-all placeholder:text-slate-600 text-white text-sm md:text-base"
              />
            </div>
          </div>

          <Button 
            type="submit"
            disabled={isLoading}
            className="w-full h-14 md:h-16 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 bg-[length:200%_auto] hover:bg-right transition-all duration-700 text-white font-black rounded-xl md:rounded-2xl shadow-[0_0_40px_rgba(37,99,235,0.3)] active:scale-95 group border border-blue-400/20 relative overflow-hidden"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" />
            ) : (
              <>
                <div className="absolute inset-0 bg-white/20 skew-x-12 -translate-x-full group-hover:translate-x-[200%] transition-transform duration-1000" />
                <div className="flex items-center justify-center gap-2 md:gap-3 relative z-10">
                  <span className="text-base md:text-lg tracking-tight uppercase">Connect to the System</span>
                  <ArrowRight className="w-5 h-5 md:w-6 md:h-6 group-hover:translate-x-1 transition-transform" />
                </div>
              </>
            )}
          </Button>
        </form>

        <div className="mt-8 md:mt-12 text-center">
          <p className="text-slate-500 text-[10px] md:text-[11px] font-bold uppercase tracking-widest">
            Not a member yet?{" "}
            <Link to="/register" className="text-blue-400 hover:text-white transition-all ml-1 underline-offset-8 decoration-blue-500/30 underline">
              Start Registration
            </Link>
          </p>
        </div>
      </div>

      {/* Corner Ornament - Mobilde gizlendi */}
      <div className="hidden md:block absolute bottom-12 right-12 opacity-50 animate-pulse">
        <Sparkles className="w-12 h-12 text-blue-400/50" />
      </div>
    </div>
  )
}