import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { authService } from "@/services/authService";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Atom,
  UserPlus,
  Loader2,
  Mail,
  User,
  Building2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ChevronDown, // 🚀 Yeni eklendi
} from "lucide-react";

export default function Register() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [departments, setDepartments] = useState<{ department_id: number; name: string }[]>([]);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    confirmPassword: "",
    department_id: "",
  });

  // 🛡️ MANTIK KORUNDU: Fetch Departments
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await api.get("/departments/");
        const rawData = response.data;
        const list = Array.isArray(rawData) ? rawData : rawData?.results || [];
        setDepartments(list);
      } catch (error) {
        console.error("Departments could not be loaded:", error);
        setDepartments([]);
        toast.error("Could not retrieve department list.");
      }
    };
    fetchDepartments();
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  // 🛡️ MANTIK KORUNDU: Registration Process
  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.full_name || !formData.email || !formData.password || !formData.department_id) {
      toast.warning("Please fill in all fields.");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    setIsLoading(true);
    try {
      await authService.onboard({
        full_name: formData.full_name,
        email: formData.email,
        password: formData.password,
        department_id: parseInt(formData.department_id),
        role: "student",
      });

      toast.success("Registration Successful!", {
        description: "Your profile and account have been created. You can sign in now.",
      });

      setTimeout(() => navigate("/login"), 1500);
    } catch (error: any) {
      console.error("Registration Error:", error);
      const errorMsg = error.response?.data?.detail || "Registration failed.";
      toast.error("An Error Occurred", { description: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // 🚀 MÜHÜR: Padding ve Taşma Kontrolü
    <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center p-4 md:p-6 relative overflow-hidden font-sans">
      
      {/* 🌌 BACKGROUND "SHOW" AREA */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-950/50 via-[#020617] to-[#020617]" />
        
        {/* Orbits - Mobilde ölçeklendi */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] md:w-[1000px] h-[400px] md:h-[600px] border-[1px] border-blue-500/20 rounded-[50%] skew-y-12 animate-[spin_30s_linear_infinite] blur-[1px] opacity-30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] md:w-[900px] h-[500px] md:h-[900px] border-[1px] border-purple-500/20 rounded-[50%] -skew-x-12 animate-[spin_25s_linear_reverse_infinite] blur-[1px] opacity-30" />

        <div className="absolute top-[-20%] -left-[10%] w-[400px] md:w-[800px] h-[400px] md:h-[800px] bg-blue-600/10 rounded-full blur-[100px] md:blur-[150px] mix-blend-screen" />
        <div className="absolute bottom-[-20%] -right-[10%] w-[400px] md:w-[800px] h-[400px] md:h-[800px] bg-purple-600/10 rounded-full blur-[100px] md:blur-[150px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('/assets/grid-pattern.png')] opacity-[0.03] bg-repeat mix-blend-overlay"></div>
      </div>

      {/* 🏝️ GLASS ISLAND: Registration Panel */}
      {/* 🚀 MÜHÜR: Padding (p-6 md:p-10) ve border-radius responsive yapıldı */}
      <div className="relative z-10 w-full max-w-[550px] bg-white/[0.02] backdrop-blur-3xl rounded-[2.5rem] md:rounded-[3rem] border border-white/10 shadow-[0_0_100px_rgba(168,85,247,0.15)] p-6 md:p-10 animate-in zoom-in-95 duration-1000">
        
        <div className="absolute -inset-[1px] bg-gradient-to-br from-purple-500/20 via-transparent to-blue-500/20 rounded-[2.5rem] md:rounded-[3rem] -z-10 blur-sm opacity-70" />

        <div className="text-center mb-8 md:mb-10">
          <div className="relative inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 bg-purple-500/10 rounded-2xl md:rounded-3xl mb-4 border border-purple-400/20 shadow-inner group overflow-hidden">
            <Atom className="w-8 h-8 md:w-10 md:h-10 text-purple-400 group-hover:rotate-180 transition-transform duration-1000 relative z-10" />
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-600/40 to-blue-600/40 blur-xl opacity-40 animate-pulse" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter mb-2 bg-clip-text text-transparent bg-gradient-to-r from-purple-100 via-white to-blue-200 uppercase italic">
            ResearchOS
          </h1>
          <div className="flex items-center justify-center gap-2 opacity-80">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] text-purple-300">
              Registration Portal
            </span>
          </div>
        </div>

        <form onSubmit={handleRegister} className="space-y-5 md:space-y-6">
          {/* FULL NAME */}
          <div className="space-y-2">
            <Label htmlFor="full_name" className="text-purple-300/50 ml-1 text-[9px] md:text-[10px] uppercase tracking-[0.3em] font-black">
              Identity Information
            </Label>
            <div className="relative group">
              <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-purple-400/60 group-focus-within:text-purple-400 transition-colors" />
              <Input
                id="full_name"
                placeholder="Full Name"
                required
                onChange={handleChange}
                className="h-12 md:h-14 pl-14 bg-black/30 border-white/5 rounded-xl md:rounded-2xl focus:ring-purple-500/20 focus:border-purple-500/40 transition-all placeholder:text-slate-600 text-white shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] text-sm"
              />
            </div>
          </div>

          {/* EMAIL */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-purple-300/50 ml-1 text-[9px] md:text-[10px] uppercase tracking-[0.3em] font-black">
              Contact Channel
            </Label>
            <div className="relative group">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-purple-400/60 group-focus-within:text-purple-400 transition-colors" />
              <Input
                id="email"
                type="email"
                placeholder="example@mail.com"
                required
                onChange={handleChange}
                className="h-12 md:h-14 pl-14 bg-black/30 border-white/5 rounded-xl md:rounded-2xl focus:ring-purple-500/20 focus:border-purple-500/40 transition-all placeholder:text-slate-600 text-white shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] text-sm"
              />
            </div>
          </div>

          {/* DEPARTMENT SELECTION */}
          <div className="space-y-2">
            <Label htmlFor="department_id" className="text-purple-300/50 ml-1 text-[9px] md:text-[10px] uppercase tracking-[0.3em] font-black">
              Academic Unit
            </Label>
            <div className="relative group">
              <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-purple-400/60 group-focus-within:text-purple-400 transition-colors z-10" />
              <select
                id="department_id"
                className="flex h-12 md:h-14 w-full appearance-none rounded-xl md:rounded-2xl border border-white/5 bg-black/30 pl-14 pr-10 text-xs md:text-sm focus:ring-purple-500/20 focus:border-purple-500/40 disabled:cursor-not-allowed text-white shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] transition-all cursor-pointer font-bold"
                onChange={handleChange}
                required
              >
                <option value="" className="bg-[#0f172a] text-slate-500">Select Department...</option>
                {departments.map((dep) => (
                  <option key={dep.department_id} value={dep.department_id} className="bg-[#0f172a] text-white">
                    {dep.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-purple-400/60">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* PASSWORDS - 🚀 MÜHÜR: Mobilde alt alta, sm sonrası yan yana */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-purple-300/50 ml-1 text-[9px] md:text-[10px] uppercase tracking-[0.3em] font-black">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="******"
                required
                onChange={handleChange}
                className="h-12 md:h-14 px-4 bg-black/30 border-white/5 rounded-xl md:rounded-2xl focus:ring-purple-500/20 text-center tracking-widest text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-purple-300/50 ml-1 text-[9px] md:text-[10px] uppercase tracking-[0.3em] font-black">
                Confirm
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="******"
                required
                onChange={handleChange}
                className="h-12 md:h-14 px-4 bg-black/30 border-white/5 rounded-xl md:rounded-2xl focus:ring-purple-500/20 text-center tracking-widest text-sm"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-14 md:h-16 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-[length:200%_auto] hover:bg-right transition-all duration-700 text-white font-black rounded-xl md:rounded-2xl shadow-[0_0_40px_rgba(168,85,247,0.3)] active:scale-95 group border border-purple-400/20 relative overflow-hidden mt-4"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" />
            ) : (
              <>
                <div className="absolute inset-0 bg-white/20 skew-x-12 -translate-x-full group-hover:translate-x-[200%] transition-transform duration-1000" />
                <div className="flex items-center justify-center gap-3 relative z-10">
                  <UserPlus className="w-5 h-5 md:w-6 md:h-6" />
                  <span className="text-sm md:text-base tracking-widest uppercase">Seal & Onboard</span>
                  <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </>
            )}
          </Button>
        </form>

        <div className="mt-8 text-center border-t border-white/5 pt-6">
          <p className="text-slate-500 text-[10px] md:text-[11px] font-bold uppercase tracking-widest">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-purple-400 hover:text-white transition-all ml-1 underline underline-offset-4 decoration-purple-500/30"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>

      {/* Corner Ornament - Mobilde gizlendi */}
      <div className="hidden lg:block absolute bottom-12 left-12 opacity-30 animate-pulse">
        <Sparkles className="w-12 h-12 text-purple-400/50" />
      </div>
    </div>
  );
}