import {
  useEffect,
  useState,
  useRef,
  type ChangeEvent,
  type FormEvent,
} from "react"
import { useNavigate, useOutletContext } from "react-router-dom" // 🚀 useOutletContext eklendi
import { authService } from "@/services/authService"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { toast } from "sonner"
import {
  Loader2,
  User,
  Save,
  Building2,
  Briefcase,
  ArrowLeft,
  Sparkles,
  GraduationCap,
  ChevronDown,
  Menu, // 🚀 Menu eklendi
} from "lucide-react"

interface ResearcherProfile {
  researcher_id: number
  full_name: string
  email: string
  title: string | null
  bio: string | null
  department: number | null
  role: string
}

interface Department {
  department_id: number
  name: string
}

export default function Profile() {
  const navigate = useNavigate()
  // 🚀 MÜHÜR: Layout'tan gelen mobil menü kontrolü
  const { setIsMobileMenuOpen } = useOutletContext<{ setIsMobileMenuOpen: (v: boolean) => void }>();

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])
  const [profile, setProfile] = useState<ResearcherProfile | null>(null)

  const [initialBio, setInitialBio] = useState<string | null>(null)
  const isFetching = useRef(false)

  // 🛡️ MANTIK KORUNDU: Veri çekme ve güncelleme işlemleri
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    if (isFetching.current) return
    isFetching.current = true

    try {
      const [profileData, deptResponse] = await Promise.all([
        authService.getProfile(),
        api.get("/departments/"),
      ])

      setProfile(profileData)
      setInitialBio(profileData.bio)

      const raw = deptResponse.data
      setDepartments(Array.isArray(raw) ? raw : raw?.results || [])
    } catch {
      toast.error("Failed to load profile data.")
    } finally {
      setLoading(false)
      isFetching.current = false
    }
  }

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    if (!profile) return
    const { id, value } = e.target
    const finalValue =
      id === "department" ? (value ? parseInt(value) : null) : value
    setProfile({ ...profile, [id]: finalValue })
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!profile) return

    setSaving(true)

    const isBioChanged = profile.bio !== initialBio
    if (isBioChanged) {
      toast.info("AI synchronization triggered...", {
        icon: <Sparkles className="h-4 w-4 text-indigo-400" />,
      })
    }

    try {
      await authService.updateProfile(profile.researcher_id, {
        title: profile.title,
        bio: profile.bio,
        department: profile.department,
        role: profile.role,
      })

      toast.success("Profile updated successfully.")
      setTimeout(() => navigate("/dashboard"), 900)
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Update failed.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0b1020]">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="p-10 text-center text-red-400 font-bold bg-[#0b1020] min-h-screen">
        Failed to retrieve profile data.
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0b1020] text-slate-100 px-4 py-6 md:py-12 flex-1 overflow-y-auto custom-scrollbar">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* HEADER BAR: 🚀 MÜHÜR: Hamburger Menü ve Geri Butonu */}
        <div className="flex justify-between items-center mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="text-slate-400 hover:text-white hover:bg-white/[0.05] rounded-xl px-3 h-11"
          >
            <ArrowLeft className="mr-2 w-4 h-4 md:w-5 md:h-5" />
            <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">Back to Hub</span>
          </Button>

          {/* Mobil Menü Butonu */}
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-3 bg-white/5 rounded-xl border border-white/10 text-indigo-300 active:scale-95 transition-all shadow-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        <Card className="bg-white/[0.06] border border-white/10 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden backdrop-blur-md">
          <CardHeader className="border-b border-white/5 p-6 md:p-10">
            <CardTitle className="flex items-center gap-4 text-xl md:text-2xl font-black text-white uppercase italic tracking-tighter">
              <div className="p-2.5 bg-indigo-500/15 rounded-2xl border border-indigo-400/20 shadow-inner">
                <User className="w-5 h-5 md:w-6 md:h-6 text-indigo-300" />
              </div>
              Profile <span className="text-indigo-400">Control</span>
            </CardTitle>
            <CardDescription className="text-slate-500 text-[10px] md:text-xs font-bold mt-4 leading-relaxed uppercase tracking-widest italic opacity-70">
              Your profile determines your academic identity in the System Directory and drives AI-powered expert matching.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 md:p-10">
            <form onSubmit={handleSave} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black ml-1">
                    Full Identity Name
                  </Label>
                  <Input
                    value={profile.full_name}
                    disabled
                    className="h-12 bg-white/[0.03] border-white/5 text-slate-600 rounded-xl cursor-not-allowed font-bold text-sm"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black ml-1">
                    Academic Rank Tier
                  </Label>
                  <div className="relative group">
                    <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400/60 group-focus-within:text-indigo-400 transition-colors" />
                    <select
                      id="role"
                      value={profile.role}
                      onChange={handleInputChange}
                      className="w-full h-12 bg-white/[0.05] border border-white/10 rounded-xl px-10 text-xs md:text-sm text-white focus:ring-2 focus:ring-indigo-500/20 outline-none appearance-none cursor-pointer font-bold transition-all"
                    >
                      <option value="academician" className="bg-[#0f172a]">Academician / Staff</option>
                      <option value="student" className="bg-[#0f172a]">Junior Researcher / Student</option>
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black ml-1">
                    Professional Title
                  </Label>
                  <div className="relative group">
                    <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400/60 group-focus-within:text-indigo-400 transition-colors" />
                    <Input
                      id="title"
                      value={profile.title || ""}
                      onChange={handleInputChange}
                      placeholder="e.g. Lead Researcher"
                      className="h-12 pl-10 bg-white/[0.05] border-white/10 text-white placeholder:text-slate-700 rounded-xl focus:ring-2 ring-indigo-500/20 font-bold text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black ml-1">
                    Department Unit
                  </Label>
                  <div className="relative group">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400/60 group-focus-within:text-indigo-400 transition-colors" />
                    <select
                      id="department"
                      value={profile.department || ""}
                      onChange={handleInputChange}
                      className="w-full h-12 bg-white/[0.05] border border-white/10 rounded-xl px-10 text-xs md:text-sm text-white focus:ring-2 focus:ring-indigo-500/20 outline-none appearance-none cursor-pointer font-bold transition-all"
                    >
                      <option value="" className="bg-[#0f172a]">Select Node Unit...</option>
                      {departments.map((d) => (
                        <option key={d.department_id} value={d.department_id} className="bg-[#0f172a]">
                          {d.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black ml-1">
                    Research Biography (AI Analysis Vector)
                  </Label>
                  <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-md font-black tracking-widest uppercase italic">
                    AI Index Ready
                  </span>
                </div>
                <Textarea
                  id="bio"
                  value={profile.bio || ""}
                  onChange={handleInputChange}
                  placeholder="Summarize your research objectives, methodologies, and expertise areas for the matching engine..."
                  className="min-h-[160px] bg-white/[0.04] border-white/10 text-white rounded-[1.5rem] resize-none focus:ring-2 ring-indigo-500/20 p-5 text-sm leading-relaxed custom-scrollbar placeholder:text-slate-700"
                />
              </div>

              <Button
                type="submit"
                disabled={saving}
                className="w-full h-14 md:h-16 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 transition-all active:scale-[0.98] border-b-4 border-indigo-800 text-xs md:text-sm"
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin mr-3 w-5 h-5" />
                    Synchronizing...
                  </>
                ) : (
                  <>
                    <Save className="mr-3 w-4 h-4 md:w-5 md:h-5" />
                    Seal & Sync Profile
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}