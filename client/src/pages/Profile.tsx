import { useEffect, useState, type ChangeEvent, type FormEvent } from "react"
import { useNavigate } from "react-router-dom" 
import { authService } from "@/services/authService"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, User, Save, Building2, Briefcase, ArrowLeft, Sparkles } from "lucide-react"

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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])
  const [profile, setProfile] = useState<ResearcherProfile | null>(null)
  
  // 🛰️ Maliyet Kontrolü İçin Eski Biyografiyi Tutuyoruz
  const [initialBio, setInitialBio] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [profileData, deptResponse] = await Promise.all([
        authService.getProfile(),
        api.get("/api/departments/")
      ])
      setProfile(profileData)
      setInitialBio(profileData.bio) // Eski biyografiyi mühürle
      
      const rawDepts = deptResponse.data
      setDepartments(Array.isArray(rawDepts) ? rawDepts : rawDepts?.results || [])
    } catch (error) {
      toast.error("Veriler yüklenemedi.")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (!profile) return
    const { id, value } = e.target
    const finalValue = id === 'department' ? (value ? parseInt(value) : null) : value
    setProfile({ ...profile, [id]: finalValue })
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!profile) return
    
    setSaving(true)
    
    // 🧠 Dirty Check: Biyografi değiştiyse kullanıcıya AI'nın tetikleneceğini bildir
    const isBioChanged = profile.bio !== initialBio
    if (isBioChanged) {
      toast.info("Biyografi değişikliği algılandı. AI Radarı otonom olarak güncelleniyor...", {
        icon: <Sparkles className="h-4 w-4 text-blue-500" />,
        duration: 4000
      })
    }

    try {
      // Backend'deki 'perform_update' metoduna PATCH isteği fırlatılır
      await authService.updateProfile(profile.researcher_id, {
        title: profile.title,
        bio: profile.bio,
        department: profile.department,
      })
      
      toast.success("Profil ve Yetenek Haritası mühürlendi!")
      
      // 🚀 KRİTİK: Dashboard'a dönmeden önce verileri tazelemek yerine 
      // direkt yönlendiriyoruz, Dashboard zaten useEffect ile taze veriyi çekecek.
      setTimeout(() => {
        navigate("/dashboard")
      }, 1000)
    } catch (error) {
      toast.error("Güncelleme başarısız. AI motoruyla bağlantı kurulamadı.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="animate-spin h-10 w-10 text-blue-600" /></div>
  if (!profile) return <div className="p-8 text-center text-red-500 font-bold">Uçuş verileri (Profil) yüklenemedi.</div>

  return (
    <div className="min-h-screen bg-gray-50/30 py-10 px-4">
      <div className="container mx-auto max-w-2xl">
        <Button variant="ghost" className="mb-6 hover:bg-white rounded-xl transition-all" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Dashboard'a Dön
        </Button>
        
        <Card className="shadow-xl border-none ring-1 ring-gray-200 rounded-[2rem] overflow-hidden">
          <CardHeader className="bg-white border-b border-gray-100 pb-8">
            <CardTitle className="flex items-center gap-3 text-2xl font-bold text-slate-900">
              <div className="p-2 bg-blue-50 rounded-lg"><User className="h-6 w-6 text-blue-600" /></div>
              Profil Düzenle
            </CardTitle>
            <CardDescription className="text-slate-500 font-medium">
              Bilgileriniz değiştiğinde AI Radarı ve Öneriler otonom olarak güncellenir.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-8">
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-sm font-semibold text-slate-700">Ad Soyad</Label>
                  <Input id="full_name" value={profile.full_name} disabled className="bg-gray-50 border-gray-200 rounded-xl cursor-not-allowed font-medium" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-semibold text-slate-700">Unvan</Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input id="title" className="pl-9 rounded-xl border-gray-200 focus:ring-blue-500" value={profile.title || ""} onChange={handleInputChange} placeholder="Örn: Senior Researcher" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="department" className="text-sm font-semibold text-slate-700">Bölüm / Branş</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <select 
                    id="department"
                    className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-9 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 appearance-none transition-all"
                    value={profile.department || ""}
                    onChange={handleInputChange}
                  >
                    <option value="">Bölüm Seçiniz...</option>
                    {departments.map((d) => (
                      <option key={d.department_id} value={d.department_id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="bio" className="text-sm font-semibold text-slate-700">Biyografi (AI Analiz Kaynağı)</Label>
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">AI Powered</span>
                </div>
                <Textarea 
                  id="bio" 
                  value={profile.bio || ""} 
                  className="min-h-[150px] rounded-2xl border-gray-200 focus:ring-blue-500 resize-none p-4 leading-relaxed" 
                  onChange={handleInputChange} 
                  placeholder="Yeteneklerinizi ve projelerinizi anlatın. Gemini bu metinden yeteneklerinizi otonom olarak çıkaracaktır..."
                />
              </div>

              <Button type="submit" className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg shadow-lg shadow-blue-200 transition-all active:scale-[0.98]" disabled={saving}>
                {saving ? (
                  <><Loader2 className="animate-spin mr-2 h-5 w-5" /> Mühürleniyor...</>
                ) : (
                  <><Save className="mr-2 h-5 w-5" /> Kaydet ve AI'yı Tetikle</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}