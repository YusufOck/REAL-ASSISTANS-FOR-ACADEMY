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
    <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center p-6 relative overflow-hidden font-sans">
      
      {/* 🌌 BACKGROUND "SHOW" AREA: Cyber Orbit & Energy Flow */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        
        {/* 1. Base Gradient That Adds Depth */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-950/50 via-[#020617] to-[#020617]" />
        
        {/* 2. Rotating Giant Energy Rings (Orbits) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] border-[1px] border-blue-500/30 rounded-[50%] skew-y-12 animate-[spin_20s_linear_infinite] blur-[2px] opacity-40" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] border-[1px] border-purple-500/30 rounded-[50%] -skew-x-12 animate-[spin_15s_linear_reverse_infinite] blur-[2px] opacity-40" />

        {/* 3. Main Light Sources (Nebula Effect) */}
        <div className="absolute top-[-20%] -left-[10%] w-[800px] h-[800px] bg-blue-600/20 rounded-full blur-[150px] animate-pulse-slow mix-blend-screen" />
        <div className="absolute bottom-[-20%] -right-[10%] w-[800px] h-[800px] bg-purple-600/20 rounded-full blur-[150px] animate-pulse-slow animation-delay-2000 mix-blend-screen" />
        
        {/* 4. Sliding Data Stream Lines */}
        <div className="absolute inset-0 bg-[url('/assets/grid-pattern.png')] opacity-[0.05] bg-repeat mix-blend-overlay animate-[pulse_4s_ease-in-out_infinite]"></div>
        <div className="absolute h-px w-full top-1/4 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-30 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
        <div className="absolute h-px w-full bottom-1/4 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent opacity-30 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite_1.5s]" />
      </div>

      {/* 🏝️ GLASS ISLAND: Login Panel (Interacts with the background) */}
      <div className="relative z-10 w-full max-w-[480px] bg-white/[0.02] backdrop-blur-3xl rounded-[3rem] border border-white/10 shadow-[0_0_100px_rgba(59,130,246,0.25)] p-12 animate-in zoom-in-95 duration-1000">
        
        {/* Panel Edge Glow */}
        <div className="absolute -inset-[1px] bg-gradient-to-br from-blue-500/30 via-transparent to-purple-500/30 rounded-[3rem] -z-10 blur-sm opacity-70" />

        <div className="text-center mb-12">
          <div className="relative inline-flex items-center justify-center w-20 h-20 bg-blue-500/10 rounded-3xl mb-6 border border-blue-400/20 shadow-inner group overflow-hidden">
            <Atom className="h-12 w-12 text-blue-400 group-hover:rotate-180 transition-transform duration-1000 relative z-10" />
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/40 to-purple-600/40 blur-xl opacity-40 animate-pulse" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter mb-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-100 via-white to-indigo-200">
            ResearchOS
          </h1>
          <div className="flex items-center justify-center gap-2 opacity-80">
            <ShieldCheck size={14} className="text-blue-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-300">Intelligence Portal</span>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-8">
          <div className="space-y-3">
            <Label className="text-blue-300/50 ml-1 text-[10px] uppercase tracking-[0.3em] font-black">Authentication</Label>
            <div className="relative group">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400/60 group-focus-within:text-blue-400 transition-colors" />
              <Input 
                type="email" 
                placeholder="Email Address" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-16 pl-14 bg-black/30 border-white/5 rounded-2xl focus:ring-blue-500/30 focus:border-blue-500/50 transition-all placeholder:text-slate-600 text-white shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <Label className="text-blue-300/50 text-[10px] uppercase tracking-[0.3em] font-black">Security Key</Label>
              <Link to="/forgot-password" 
                className="text-[9px] text-blue-400/70 hover:text-blue-300 transition-colors uppercase font-black"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative group">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400/60 group-focus-within:text-blue-400 transition-colors" />
              <Input 
                type="password" 
                placeholder="********" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-16 pl-14 bg-black/30 border-white/5 rounded-2xl focus:ring-blue-500/30 focus:border-blue-500/50 transition-all placeholder:text-slate-600 text-white shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]"
              />
            </div>
          </div>

          <Button 
            type="submit"
            disabled={isLoading}
            className="w-full h-16 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 bg-[length:200%_auto] hover:bg-right transition-all duration-700 text-white font-black rounded-2xl shadow-[0_0_50px_rgba(37,99,235,0.4)] active:scale-95 group border border-blue-400/20 relative overflow-hidden"
          >
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <div className="absolute inset-0 bg-white/20 skew-x-12 -translate-x-full group-hover:translate-x-[200%] transition-transform duration-1000" />
                <div className="flex items-center justify-center gap-3 relative z-10">
                  <span className="text-lg tracking-tight">Connect to the System</span>
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </div>
              </>
            )}
          </Button>
        </form>

        <div className="mt-12 text-center">
          <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest">
            Not a member yet?{" "}
            <Link to="/register" className="text-blue-400 hover:text-white transition-all ml-1 underline-offset-8 decoration-blue-500/30 underline">
              Start Registration
            </Link>
          </p>
        </div>
      </div>

      {/* Corner Ornament */}
      <div className="absolute bottom-12 right-12 opacity-50 animate-pulse">
        <Sparkles className="w-12 h-12 text-blue-400/50" />
      </div>
    </div>
  )
}
