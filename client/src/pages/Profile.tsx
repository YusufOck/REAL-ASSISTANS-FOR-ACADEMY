import { useEffect, useState, type ChangeEvent, type FormEvent } from "react" // 'type' eklendi
import { useNavigate } from "react-router-dom" // Navigate için bu şart!
import { authService } from "@/services/authService"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, User, Save, Building2, Briefcase, ArrowLeft } from "lucide-react"

// Arayüz isimlerini JSON yanıtınla tam uyumlu hale getirdik
interface ResearcherProfile {
  researcher_id: number
  full_name: string
  email: string
  title: string | null
  bio: string | null
  department: number | null // Burası 'department' olmalı!
  role: string
}

interface Department {
  department_id: number
  name: string
}

export default function Profile() {
  const navigate = useNavigate() // Navigate hatasını bu satır çözer
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])
  const [profile, setProfile] = useState<ResearcherProfile | null>(null)

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
    // Seçim kutusu ise sayıya çevir, değilse olduğu gibi bırak
    const finalValue = id === 'department' ? (value ? parseInt(value) : null) : value
    setProfile({ ...profile, [id]: finalValue })
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    try {
      await authService.updateProfile(profile.researcher_id, {
        title: profile.title,
        bio: profile.bio,
        department: profile.department, // Artık hata vermez
      })
      toast.success("Profil başarıyla güncellendi!")
      
      // Mesajı okuması için kısa bir bekleme ve yönlendirme
      setTimeout(() => {
        navigate("/dashboard")
      }, 1500)
    } catch (error) {
      toast.error("Güncelleme başarısız.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-blue-500" /></div>
  if (!profile) return <div className="p-8 text-center">Profil yüklenemedi.</div>

  return (
    <div className="container mx-auto py-10 max-w-2xl px-4">
      <Button variant="ghost" className="mb-4 pl-0" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Dashboard'a Dön
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User className="h-6 w-6" /> Profil Düzenle</CardTitle>
          <CardDescription>Bilgilerinizi güncelleyin.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="full_name">Ad Soyad</Label>
              <Input id="full_name" value={profile.full_name} disabled className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Unvan</Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="title" className="pl-9" value={profile.title || ""} onChange={handleInputChange} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Bölüm</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <select 
                  id="department"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-9 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
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
              <Label htmlFor="bio">Biyografi</Label>
              <Textarea id="bio" value={profile.bio || ""} className="min-h-[120px]" onChange={handleInputChange} />
            </div>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
              Kaydet
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}