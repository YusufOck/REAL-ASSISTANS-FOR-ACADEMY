import { useEffect, useState, type ChangeEvent, type FormEvent } from "react" // 'type' kelimesi eklendi
import { authService } from "@/services/authService"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, User, Save, Building2, Briefcase } from "lucide-react" // Kullanılmayan 'FileText' çıkarıldı

// Tip tanımlamaları
interface ResearcherProfile {
  researcher_id: number
  full_name: string
  title: string | null
  bio: string | null
  department_id: number | string
  role: string
}

interface Department {
  department_id: number
  name: string
}

export default function Profile() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])
  const [profile, setProfile] = useState<ResearcherProfile | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [profileData, deptData] = await Promise.all([
        authService.getProfile(),
        api.get("/api/departments/")
      ])
      setProfile(profileData)
      
      // 'map is not a function' hatasını engellemek için kontrol
      const rawDepts = deptData.data
      const deptList = Array.isArray(rawDepts) ? rawDepts : rawDepts?.results || []
      setDepartments(deptList)
    } catch (error) {
      console.error("Veri çekme hatası:", error)
      toast.error("Profil bilgileri alınamadı.")
    } finally {
      setLoading(false)
    }
  }

  // TypeScript 'e' parametresi için tip tanımlaması
  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (!profile) return
    const { id, value } = e.target
    setProfile({ ...profile, [id]: value })
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    try {
      await authService.updateProfile(profile.researcher_id, {
        full_name: profile.full_name,
        title: profile.title,
        bio: profile.bio,
        department_id: profile.department_id,
        role: profile.role
      })
      toast.success("Profil başarıyla güncellendi!")
    } catch (error) {
      toast.error("Güncelleme başarısız.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-blue-500" /></div>
  if (!profile) return <div className="p-10 text-center">Profil yüklenemedi. Lütfen tekrar giriş yapın.</div>

  return (
    <div className="container mx-auto py-10 max-w-2xl px-4">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <User className="h-6 w-6 text-blue-500" /> Profil Bilgileri
          </CardTitle>
          <CardDescription>Akademik bilgilerinizi buradan güncelleyebilirsiniz.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="full_name">Ad Soyad</Label>
              <Input id="full_name" value={profile.full_name} onChange={handleInputChange} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Unvan</Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input id="title" className="pl-9" value={profile.title || ""} placeholder="Örn: Junior Researcher" onChange={handleInputChange} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department_id">Bölüm</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                <select 
                  id="department_id"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-9 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={profile.department_id || ""}
                  onChange={handleInputChange}
                >
                  <option value="">Bölüm Seçiniz...</option>
                  {departments.map((d) => ( // Artık burada patlamayacak
                    <option key={d.department_id} value={d.department_id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Biyografi</Label>
              <Textarea id="bio" value={profile.bio || ""} className="min-h-[120px]" onChange={handleInputChange} />
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={saving}>
              {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
              Değişiklikleri Kaydet
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}