import { useEffect, useState } from "react"
import { useNavigate, Link } from "react-router-dom" // Link eklendi
import { authService } from "@/services/authService"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LogOut, User, Briefcase, Building2, Loader2, Settings } from "lucide-react" // Settings eklendi
import { toast } from "sonner"


interface UserProfile {
  researcher_id: number;
  full_name: string;
  email: string;
  title: string | null;
  role: string;
  department: number | null;
  department_name: string | null; 
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
    } catch (error: any) {
      console.error("Profil çekilemedi:", error)
      
      // 401 Hatası: Token bitmiş demektir. "Tırt" mesajlar yerine direkt login'e şutla.
      if (error.response?.status === 401) {
        authService.logout()
        navigate("/login")
        return // Aşağıdaki toast'un çalışmasını engelleriz
      }
      
      toast.error("Profil bilgileri yüklenemedi.")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    authService.logout()
    navigate("/login")
    toast.info("Oturum kapatıldı.")
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8">
      {/* Üst Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Genel Bakış</h1>
          <p className="text-muted-foreground mt-1">
            Hoş geldin, <span className="font-semibold text-foreground">{profile?.full_name || "Araştırmacı"}</span>
          </p>
        </div>
        <div className="flex gap-2">
          {/* PROFİLE GİTME BUTONU: Burası kritik, kullanıcı bilgilerini doldurmalı! */}
          <Button variant="outline" asChild>
            <Link to="/profile">
              <Settings className="mr-2 h-4 w-4" /> Profili Düzenle
            </Link>
          </Button>
          <Button variant="destructive" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" /> Çıkış
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Kullanıcı Kartı */}
        <Card className="shadow-sm border-none ring-1 ring-gray-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Araştırmacı Kimliği</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile?.full_name}</div>
            <p className="text-sm text-muted-foreground mb-4">{profile?.email}</p>
            
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center text-sm">
                <Briefcase className="mr-2 h-4 w-4 text-blue-500" />
                <span className={profile?.title ? "text-foreground font-medium" : "text-orange-500 italic"}>
                  {profile?.title || "Unvan Belirtilmemiş"}
                </span>
              </div>
              <div className="flex items-center text-sm">
                <Building2 className="mr-2 h-4 w-4 text-indigo-500" />
                <span className="text-muted-foreground">
                  Bölüm: <span className="text-foreground font-medium">{profile?.department_name || "Atanmamış"}</span>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rol Kartı */}
        <Card className="shadow-sm border-none ring-1 ring-blue-100 bg-blue-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Erişim Seviyesi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900 capitalize">{profile?.role}</div>
            <div className="mt-2 inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
              Hesap Doğrulandı
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}