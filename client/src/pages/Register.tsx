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

  // 🛡️ BACKEND LOGIC: Fetch Departments (Kept Exactly)
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

  // 🛡️ BACKEND LOGIC: Registration Process (Kept Exactly)
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
    <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center p-6 relative overflow-x-hidden font-sans">
      {/* 🌌 BACKGROUND "SHOW" AREA: Same theme as the Login page */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-950/50 via-[#020617] to-[#020617]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] border-[1px] border-blue-500/30 rounded-[50%] skew-y-12 animate-[spin_20s_linear_infinite] blur-[2px] opacity-40" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] border-[1px] border-purple-500/30 rounded-[50%] -skew-x-12 animate-[spin_15s_linear_reverse_infinite] blur-[2px] opacity-40" />
        <div className="absolute top-[-20%] -left-[10%] w-[800px] h-[800px] bg-blue-600/20 rounded-full blur-[150px] animate-pulse-slow mix-blend-screen" />
        <div className="absolute bottom-[-20%] -right-[10%] w-[800px] h-[800px] bg-purple-600/20 rounded-full blur-[150px] animate-pulse-slow animation-delay-2000 mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('/assets/grid-pattern.png')] opacity-[0.05] bg-repeat mix-blend-overlay animate-[pulse_4s_ease-in-out_infinite]"></div>
      </div>

      {/* 🏝️ GLASS ISLAND: Registration Panel */}
      <div className="relative z-10 w-full max-w-[550px] bg-white/[0.02] backdrop-blur-3xl rounded-[3rem] border border-white/10 shadow-[0_0_100px_rgba(168,85,247,0.25)] p-10 animate-in zoom-in-95 duration-1000">
        {/* Panel Edge Glow (Purple Accent) */}
        <div className="absolute -inset-[1px] bg-gradient-to-br from-purple-500/30 via-transparent to-blue-500/30 rounded-[3rem] -z-10 blur-sm opacity-70" />

        <div className="text-center mb-10">
          <div className="relative inline-flex items-center justify-center w-16 h-16 bg-purple-500/10 rounded-3xl mb-4 border border-purple-400/20 shadow-inner group overflow-hidden">
            <Atom className="h-10 w-10 text-purple-400 group-hover:rotate-180 transition-transform duration-1000 relative z-10" />
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-600/40 to-blue-600/40 blur-xl opacity-40 animate-pulse" />
          </div>
          <h1 className="text-3xl font-black tracking-tighter mb-2 bg-clip-text text-transparent bg-gradient-to-r from-purple-100 via-white to-blue-200">
            ResearchOS
          </h1>
          <div className="flex items-center justify-center gap-2 opacity-80">
            <ShieldCheck size={14} className="text-purple-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-purple-300">
              ResearchOS Registration
            </span>
          </div>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          {/* FULL NAME */}
          <div className="space-y-2">
            <Label htmlFor="full_name" className="text-purple-300/50 ml-1 text-[10px] uppercase tracking-[0.3em] font-black">
              Identity Information
            </Label>
            <div className="relative group">
              <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400/60 group-focus-within:text-purple-400 transition-colors" />
              <Input
                id="full_name"
                placeholder="Full Name"
                required
                onChange={handleChange}
                className="h-14 pl-14 bg-black/30 border-white/5 rounded-2xl focus:ring-purple-500/30 focus:border-purple-500/50 transition-all placeholder:text-slate-600 text-white shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]"
              />
            </div>
          </div>

          {/* EMAIL */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-purple-300/50 ml-1 text-[10px] uppercase tracking-[0.3em] font-black">
              Contact Channel
            </Label>
            <div className="relative group">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400/60 group-focus-within:text-purple-400 transition-colors" />
              <Input
                id="email"
                type="email"
                placeholder="example@mail.com"
                required
                onChange={handleChange}
                className="h-14 pl-14 bg-black/30 border-white/5 rounded-2xl focus:ring-purple-500/30 focus:border-purple-500/50 transition-all placeholder:text-slate-600 text-white shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]"
              />
            </div>
          </div>

          {/* DEPARTMENT SELECTION */}
          <div className="space-y-2">
            <Label htmlFor="department_id" className="text-purple-300/50 ml-1 text-[10px] uppercase tracking-[0.3em] font-black">
              Academic Unit
            </Label>
            <div className="relative group">
              <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400/60 group-focus-within:text-purple-400 transition-colors z-10" />
              <select
                id="department_id"
                className="flex h-14 w-full appearance-none rounded-2xl border border-white/5 bg-black/30 pl-14 pr-10 text-sm focus-visible:outline-none focus:ring-purple-500/30 focus:border-purple-500/50 disabled:cursor-not-allowed disabled:opacity-50 text-white shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] transition-all"
                onChange={handleChange}
                required
              >
                <option value="" className="bg-slate-900 text-slate-400">
                  Select Department...
                </option>
                {departments.map((dep) => (
                  <option key={dep.department_id} value={dep.department_id} className="bg-slate-900 text-white">
                    {dep.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-purple-400/60">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
          </div>

          {/* PASSWORDS */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-purple-300/50 ml-1 text-[10px] uppercase tracking-[0.3em] font-black">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="******"
                required
                onChange={handleChange}
                className="h-14 px-4 bg-black/30 border-white/5 rounded-2xl focus:ring-purple-500/30 focus:border-purple-500/50 transition-all placeholder:text-slate-600 text-white shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] text-center tracking-widest"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-purple-300/50 ml-1 text-[10px] uppercase tracking-[0.3em] font-black">
                Confirm
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="******"
                required
                onChange={handleChange}
                className="h-14 px-4 bg-black/30 border-white/5 rounded-2xl focus:ring-purple-500/30 focus:border-purple-500/50 transition-all placeholder:text-slate-600 text-white shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] text-center tracking-widest"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-16 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-[length:200%_auto] hover:bg-right transition-all duration-700 text-white font-black rounded-2xl shadow-[0_0_50px_rgba(168,85,247,0.4)] active:scale-95 group border border-purple-400/20 relative overflow-hidden mt-8"
          >
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <div className="absolute inset-0 bg-white/20 skew-x-12 -translate-x-full group-hover:translate-x-[200%] transition-transform duration-1000" />
                <div className="flex items-center justify-center gap-3 relative z-10">
                  <UserPlus className="w-6 h-6" />
                  <span className="text-lg tracking-tight">Complete Registration</span>
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </div>
              </>
            )}
          </Button>
        </form>

        <div className="mt-10 text-center border-t border-white/5 pt-8">
          <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-purple-400 hover:text-white transition-all ml-1 underline-offset-8 decoration-purple-500/30 underline"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>

      {/* Corner Ornament */}
      <div className="absolute bottom-12 left-12 opacity-50 animate-pulse">
        <Sparkles className="w-12 h-12 text-purple-400/50" />
      </div>
    </div>
  );
}
