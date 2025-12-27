import {
  useEffect,
  useState,
  useRef,
  type ChangeEvent,
  type FormEvent,
} from "react"
import { useNavigate } from "react-router-dom"
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
} from "lucide-react"

/* ================= TYPES ================= */

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

/* ================= COMPONENT ================= */

export default function Profile() {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])
  const [profile, setProfile] = useState<ResearcherProfile | null>(null)

  const [initialBio, setInitialBio] = useState<string | null>(null)
  const isFetching = useRef(false)

  /* ================= FETCH ================= */

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

  /* ================= HANDLERS ================= */

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

      toast.success("Profile and status information updated.")
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
        <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
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
    <div className="min-h-screen bg-[#0b1020] text-slate-100 px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6 text-slate-300 hover:text-white hover:bg-white/[0.05] rounded-xl"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card className="bg-white/[0.08] border border-white/15 rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.45)] overflow-hidden">
          <CardHeader className="border-b border-white/10 p-8">
            <CardTitle className="flex items-center gap-3 text-2xl font-black text-slate-50">
              <div className="p-2 bg-indigo-500/15 rounded-xl border border-indigo-400/20">
                <User className="h-6 w-6 text-indigo-300" />
              </div>
              Profile Settings
            </CardTitle>
            <CardDescription className="text-slate-300/85 mt-2">
              Your status and expertise information are listed in the System Directory based on this data.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8">
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-widest text-slate-300">
                    Full Name
                  </Label>
                  <Input
                    value={profile.full_name}
                    disabled
                    className="bg-white/[0.04] border-white/10 text-slate-400 rounded-xl cursor-not-allowed"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-widest text-slate-300">
                    Academic Status
                  </Label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                    <select
                      id="role"
                      value={profile.role}
                      onChange={handleInputChange}
                      className="w-full h-11 bg-white/[0.06] border border-white/15 rounded-xl px-9 text-sm text-slate-50 focus:ring-2 focus:ring-indigo-500/30 outline-none appearance-none"
                    >
                      <option value="academician" className="bg-[#1e293b]">
                        Academician / Researcher
                      </option>
                      <option value="student" className="bg-[#1e293b]">
                        Student
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-widest text-slate-300">
                    Title
                  </Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                    <Input
                      id="title"
                      value={profile.title || ""}
                      onChange={handleInputChange}
                      placeholder="e.g. Assistant Professor"
                      className="pl-9 bg-white/[0.06] border-white/15 text-slate-50 placeholder:text-slate-400 rounded-xl focus:ring-indigo-500/30"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-widest text-slate-300">
                    Department
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                    <select
                      id="department"
                      value={profile.department || ""}
                      onChange={handleInputChange}
                      className="w-full h-11 bg-white/[0.06] border border-white/15 rounded-xl px-9 text-sm text-slate-50 focus:ring-2 focus:ring-indigo-500/30 outline-none appearance-none"
                    >
                      <option value="">Select Department...</option>
                      {departments.map((d) => (
                        <option
                          key={d.department_id}
                          value={d.department_id}
                          className="bg-[#1e293b]"
                        >
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-widest text-slate-300">
                    Biography (AI Source)
                  </Label>
                  <span className="text-[10px] bg-indigo-500/15 text-indigo-300 px-2 py-0.5 rounded-full font-black tracking-tighter">
                    AI READY
                  </span>
                </div>
                <Textarea
                  id="bio"
                  value={profile.bio || ""}
                  onChange={handleInputChange}
                  placeholder="Describe your research areas..."
                  className="min-h-[150px] bg-white/[0.06] border-white/15 text-slate-50 rounded-2xl resize-none focus:ring-indigo-500/30 p-4"
                />
              </div>

              <Button
                type="submit"
                disabled={saving}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 font-black tracking-wide shadow-lg hover:from-indigo-500 hover:to-purple-500 transition-all active:scale-[0.98]"
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin mr-2 h-5 w-5" />
                    Updating
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-5 w-5" />
                    Seal Profile
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
