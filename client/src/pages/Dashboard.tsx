// src/pages/Dashboard.tsx - Eksiksiz ve Mühürlenmiş Versiyon
import { useEffect, useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { authService } from "@/services/authService"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card" 
import { LogOut, User, Briefcase, Building2, Loader2, Settings, BrainCircuit, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

// Otonom Bileşenler
import SuggestedPartners from "@/components/ui/SuggestedPartners";
import SkillUpdateForm from "@/components/ui/SkillUpdateForm";
import IncomingRequests from "@/components/ui/IncomingRequests";
import ProjectTeamList from "@/components/ui/ProjectTeamList";

// --- Arayüz Tanımlamaları ---

interface Suggestion {
  researcher_id: number;
  full_name: string;
  department_name: string;
  score: number;
  match_reasons: string[];
  is_complementary: boolean;
}

interface UserProject {
  project_id: number;
  title: string;
  status: string;
  my_role: string;
  group_members: any[];
}

interface UserProfile {
  researcher_id: number;
  full_name: string;
  email: string;
  title: string | null;
  role: string;
  department: number | null;
  department_name: string | null; 
  skills: Record<string, number> | null; // 🛡️ Array riskini JSON ile kilitledik
  suggestions?: Suggestion[]; 
  received_requests?: any[];
  projects?: UserProject[];
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // 🛰️ Otonom Veri Çekme Mekanizması
  useEffect(() => { fetchProfile() }, [])

  const fetchProfile = async () => {
    setIsRefreshing(true)
    try {
      // Backend /api/researchers/me/ üzerinden taze AI verilerini (yeni skills ve suggestions) çeker
      const data = await authService.getProfile()
      console.log("🚀 Otonom Sistem Verisi Yenilendi:", data);
      setProfile(data)
    } catch (error: any) {
      if (error.response?.status === 401) {
        authService.logout(); navigate("/login"); return;
      }
      toast.error("Profil bilgileri senkronize edilemedi.")
    } finally { 
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  // 📊 Radar Chart Veri Hazırlığı
  const prepareChartData = () => {
    // 🛡️ Hata Payı: Skills yoksa veya dizi gelmişse boş dön
    if (!profile?.skills || Array.isArray(profile.skills)) return [];
    
    return Object.entries(profile.skills).map(([key, value]) => ({
      subject: key,
      A: value,
      fullMark: 100,
    }));
  };

  const handleLogout = () => { 
    authService.logout(); 
    navigate("/login"); 
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
      {/* 1. KATMAN: ÜST BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl">
             <User className="h-6 w-6 text-white" /> {/* 🛡️ Linting hatası giderildi */}
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              Genel Bakış {isRefreshing && <Sparkles className="h-5 w-5 text-blue-500 animate-pulse" />}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm font-medium">
              Sistem Durumu: <span className="text-green-600">Otonom Senkronize</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild size="sm" className="rounded-xl shadow-sm hover:bg-white transition-all">
            <Link to="/profile"><Settings className="mr-2 h-4 w-4" /> Profili Düzenle</Link>
          </Button>
          <Button variant="destructive" onClick={handleLogout} size="sm" className="rounded-xl shadow-md active:scale-95">
            <LogOut className="mr-2 h-4 w-4" /> Çıkış
          </Button>
        </div>
      </div>

      {/* 2. KATMAN: GELEN TALEPLER */}
      <IncomingRequests 
        requests={profile?.received_requests || []} 
        onRefresh={fetchProfile} 
      />

      {/* 3. KATMAN: AKTİF MÜRETTEBAT */}
      <div className="mb-8">
        <ProjectTeamList projects={profile?.projects || []} />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* SOL KOLON: KİMLİK */}
        <div className="space-y-6">
          <Card className="shadow-sm border-none ring-1 ring-gray-200 rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-white border-b border-gray-100 pb-4">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Araştırmacı Kimliği</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-slate-900">{profile?.full_name}</div>
              <p className="text-sm text-muted-foreground mb-4 font-medium">{profile?.email}</p>
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <div className="flex items-center text-sm font-medium">
                  <Briefcase className="mr-2 h-4 w-4 text-blue-500" />
                  <span className="text-slate-700">{profile?.title || "Unvan Belirtilmemiş"}</span>
                </div>
                <div className="flex items-center text-sm font-medium">
                  <Building2 className="mr-2 h-4 w-4 text-indigo-500" />
                  <span className="text-slate-700">{profile?.department_name}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-none ring-1 ring-blue-100 bg-blue-50/30 rounded-[2rem]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-600">Erişim Seviyesi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-blue-900 capitalize tracking-tight">{profile?.role}</div>
            </CardContent>
          </Card>
        </div>

        {/* SAĞ KOLON: YETENEK ANALİZİ VE SLIDER */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card className="shadow-sm border-none ring-1 ring-gray-200 rounded-[2rem] overflow-hidden bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-gray-50">
                <CardTitle className="text-sm font-bold text-slate-700 uppercase">Yetenek Dağılımı</CardTitle>
                <BrainCircuit className="h-5 w-5 text-blue-500" />
              </CardHeader>
              <CardContent className="h-[350px] pt-6">
                {/* 🛡️ HATA ÇÖZÜMÜ: width/height -1 hatasını önlemek için ResponsiveContainer mühürlendi */}
                <div className="w-full h-full min-h-[300px]">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} />
                        <Radar 
                          name="Yetenek" 
                          dataKey="A" 
                          stroke="#2563eb" 
                          fill="#3b82f6" 
                          fillOpacity={0.5} 
                          animationBegin={0}
                          animationDuration={1000}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-400 text-sm font-medium italic">
                      Yetenekler biyografiden ayıklanıyor...
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 🛰️ SLIDER PANELI: Biyografi değiştiğinde state'in resetlenmesi için key mühürlendi */}
            {profile?.skills && (
              <SkillUpdateForm 
                key={JSON.stringify(profile.skills)} // 🚀 KRİTİK: Biyografi değiştiğinde slider state'ini zorla yeniler!
                initialSkills={profile.skills} 
                onUpdateSuccess={fetchProfile} 
              />
            )}
          </div>
        </div>

        {/* ALT BÖLÜM: PARTNER ÖNERİLERİ */}
        <div className="col-span-full pt-8 mt-4 border-t border-gray-200">
          <SuggestedPartners suggestions={profile?.suggestions || []} />
        </div>
      </div>
    </div>
  )
}