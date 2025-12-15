import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { authService } from "@/services/authService"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { LogOut, User, Briefcase, Building2, Loader2 } from "lucide-react"
import { toast } from "sonner"

// Profil verisinin tipi (Kabaca)
interface UserProfile {
  researcher_id: number
  full_name: string
  email: string
  title: string
  role: string
  department_id: number
  bio: string
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const data = await authService.getProfile()
      setProfile(data)
    } catch (error) {
      console.error("Profil çekilemedi:", error)
      toast.error("Oturum süreniz dolmuş olabilir.")
      // Hata alırsa login'e at (Güvenlik önlemi)
      authService.logout()
      navigate("/login")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    authService.logout()
    navigate("/login")
    toast.info("Çıkış yapıldı.")
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Üst Bar */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Hoş geldin, {profile?.full_name}</p>
        </div>
        <Button variant="outline" onClick={handleLogout} className="text-red-600 hover:text-red-700 hover:bg-red-50">
          <LogOut className="mr-2 h-4 w-4" />
          Çıkış Yap
        </Button>
      </div>

      {/* İçerik Kartları */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        
        {/* Profil Kartı */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kimlik Bilgileri</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile?.full_name}</div>
            <p className="text-xs text-muted-foreground">{profile?.email}</p>
            <div className="mt-4 flex flex-col gap-2">
                <div className="flex items-center text-sm text-gray-600">
                    <Briefcase className="mr-2 h-4 w-4" />
                    {profile?.title || "Unvan Yok"}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                    <Building2 className="mr-2 h-4 w-4" />
                    Bölüm ID: {profile?.department_id}
                </div>
            </div>
          </CardContent>
        </Card>

        {/* Diğer Kartlar (Örnek) */}
        <Card>
          <CardHeader>
             <CardTitle className="text-sm font-medium">Rol</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold capitalize">{profile?.role}</div>
             <CardDescription>Sistemdeki yetki seviyeniz.</CardDescription>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}