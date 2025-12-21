import { useEffect, useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { authService } from "@/services/authService"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card" // CardDescription'ı sildik çünkü kullanmıyorsun
import { LogOut, User, Briefcase, Building2, Loader2, Settings, BrainCircuit } from "lucide-react"
import { toast } from "sonner"
// DÜZELTME: Radar'ı sadece bir kez çağırıyoruz (image_96efa4 hatası çözüldü)
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

import SuggestedPartners from "@/components/ui/SuggestedPartners";
import SkillUpdateForm from "@/components/ui/SkillUpdateForm";

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
  suggestions?: Suggestion[]; 
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchProfile() }, [])

  const fetchProfile = async () => {
    try {
      const data = await authService.getProfile()
      setProfile(data)
    } catch (error: any) {
      if (error.response?.status === 401) {
        authService.logout(); navigate("/login"); return;
      }
      toast.error("Profil bilgileri yüklenemedi.")
    } finally { setLoading(false) }
  }

  const prepareChartData = () => {
    if (!profile?.skills || Array.isArray(profile.skills)) return [];
    return Object.entries(profile.skills).map(([key, value]) => ({
      subject: key,
      A: value,
      fullMark: 100,
    }));
  };

  const handleLogout = () => { authService.logout(); navigate("/login"); toast.info("Oturum kapatıldı.") }

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
      {/* ÜST BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Genel Bakış</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Hoş geldin, <span className="font-bold text-slate-800">{profile?.full_name}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild size="sm">
            <Link to="/profile"><Settings className="mr-2 h-4 w-4" /> Profili Düzenle</Link>
          </Button>
          <Button variant="destructive" onClick={handleLogout} size="sm">
            <LogOut className="mr-2 h-4 w-4" /> Çıkış
          </Button>
        </div>
      </div>

      {/* IZGARA DÜZENİ */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* SOL KOLON */}
        <div className="space-y-6">
          <Card className="shadow-sm border-none ring-1 ring-gray-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Araştırmacı Kimliği</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{profile?.full_name}</div>
              <p className="text-sm text-muted-foreground mb-4 font-medium">{profile?.email}</p>
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <div className="flex items-center text-sm font-medium">
                  <Briefcase className="mr-2 h-4 w-4 text-blue-500" />
                  <span>{profile?.title || "Unvan Belirtilmemiş"}</span>
                </div>
                <div className="flex items-center text-sm font-medium">
                  <Building2 className="mr-2 h-4 w-4 text-indigo-500" />
                  <span className="text-slate-700">{profile?.department_name}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-none ring-1 ring-blue-100 bg-blue-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-600">Erişim Seviyesi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-blue-900 capitalize tracking-tight">{profile?.role}</div>
            </CardContent>
          </Card>
        </div>

        {/* SAĞ TARAF: RADAR VE FORM */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card className="shadow-sm border-none ring-1 ring-gray-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Yetenek Dağılımı</CardTitle>
                <BrainCircuit className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent className="h-[300px] pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10 }} />
                    <Radar name="Yetenek" dataKey="A" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.6} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* FORM MONTAJI */}
            {profile?.skills && !Array.isArray(profile.skills) && (
              <SkillUpdateForm 
                initialSkills={profile.skills as Record<string, number>} 
                onUpdateSuccess={fetchProfile} 
              />
            )}
          </div>
        </div>

        {/* KRİTİK DÜZELTME: Partner Önerileri Artık En Soldan Başlıyor! */}
        <div className="col-span-full pt-8 mt-4 border-t border-gray-200">
          <SuggestedPartners suggestions={profile?.suggestions || []} />
        </div>
      </div>
    </div>
  )
}