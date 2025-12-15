import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { authService } from "@/services/authService"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { LogOut, User, Briefcase, Building2, Loader2 } from "lucide-react"
import { toast } from "sonner"

// Profil verisinin tipi
interface UserProfile {
  researcher_id: number
  full_name: string
  email: string
  title: string
  role: string
  department_id: number
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
      // Eğer hata 401 (Unauthorized) ise token bitmiştir
      toast.error("Profil bilgileri alınamadı.")
      // Test aşamasında hemen logout yapmasın, hatayı görelim diye yorum satırı yapıyorum:
      // authService.logout() 
      // navigate("/login")
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
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-500">Profiliniz yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Üst Bar */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Hoş geldin, <span className="font-semibold text-gray-900">{profile?.full_name || "Araştırmacı"}</span>
          </p>
        </div>
        <Button variant="outline" onClick={handleLogout} className="text-red-600 border-red-200 hover:bg-red-50">
          <LogOut className="mr-2 h-4 w-4" />
          Güvenli Çıkış
        </Button>
      </div>

      {/* İçerik Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        
        {/* Kart 1: Profil Özeti */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Kullanıcı Bilgileri</CardTitle>
            <User className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-gray-900 mb-1">{profile?.full_name}</div>
            <p className="text-xs text-gray-500 mb-4">{profile?.email}</p>
            
            <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="flex items-center text-sm text-gray-600">
                    <Briefcase className="mr-2 h-4 w-4 text-blue-500" />
                    <span className="font-medium">{profile?.title || "Unvan Belirtilmemiş"}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                    <Building2 className="mr-2 h-4 w-4 text-indigo-500" />
                    <span>Bölüm ID: {profile?.department_id}</span>
                </div>
            </div>
          </CardContent>
        </Card>

        {/* Kart 2: Rol Durumu */}
        <Card className="shadow-sm bg-blue-50/50 border-blue-100">
          <CardHeader className="pb-2">
             <CardTitle className="text-sm font-medium text-blue-600">Sistem Rolü</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="text-3xl font-bold text-blue-900 capitalize">{profile?.role || "user"}</div>
             <CardDescription className="text-blue-600/80 mt-1">Aktif Hesap</CardDescription>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}