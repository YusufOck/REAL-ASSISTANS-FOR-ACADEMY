import { useEffect, useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { authService } from "@/services/authService"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { LogOut, User, Briefcase, Building2, Loader2, Settings, BrainCircuit } from "lucide-react"
import { toast } from "sonner"
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

// --- YENİ: Bileşeni içe aktar ---
import SuggestedPartners from "@/components/ui/SuggestedPartners";

// --- GÜNCELLEME: Interface'e suggestions alanını ekle ---
interface Suggestion {
  researcher_id: number;
  full_name: string;
  department_name: string;
  score: number;
  match_reasons: string[];
  is_complementary: boolean;
}

interface UserProfile {
  researcher_id: number;
  full_name: string;
  email: string;
  title: string | null;
  role: string;
  department: number | null;
  department_name: string | null; 
  skills: Record<string, number> | string[] | null;
  // Backend'den gelen partner önerileri
  suggestions?: Suggestion[]; 
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
      if (error.response?.status === 401) {
        authService.logout()
        navigate("/login")
        return
      }
      toast.error("Profil bilgileri yüklenemedi.")
    } finally {
      setLoading(false)
    }
  }

  const prepareChartData = () => {
    if (!profile?.skills) return [];
    if (!Array.isArray(profile.skills)) {
      return Object.entries(profile.skills).map(([key, value]) => ({
        subject: key,
        A: value,
        fullMark: 100,
      }));
    }
    return profile.skills.map(skill => ({
      subject: skill,
      A: 80,
      fullMark: 100,
    }));
  };

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

  const chartData = prepareChartData();

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

        {/* Yetenek Analizi (Radar Chart) */}
        <Card className="col-span-full lg:col-span-2 shadow-sm border-none ring-1 ring-gray-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-sm font-medium">Yetenek Dağılımı</CardTitle>
              <CardDescription>Biyografinizden AI ile analiz edildi</CardDescription>
            </div>
            <BrainCircuit className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="h-[300px] pt-4">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Radar
                    name="Uzmanlık"
                    dataKey="A"
                    stroke="#2563eb"
                    fill="#3b82f6"
                    fillOpacity={0.6}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm space-y-2">
                <p>Henüz yetenek analizi yapılmamış.</p>
                <Button variant="link" asChild className="text-blue-600">
                  <Link to="/profile">Profilini güncelle</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* --- YENİ: Partner Önerileri Bölümü --- */}
        <div className="col-span-full">
          <SuggestedPartners suggestions={profile?.suggestions || []} />
        </div>
      </div>
    </div>
  )
}