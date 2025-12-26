// src/pages/Dashboard.tsx
import { useEffect, useMemo, useState, useRef } from "react" 
import { Link, useNavigate } from "react-router-dom"

import { authService } from "@/services/authService"
import { api } from "@/lib/api" // 🚀 HATAYI ÇÖZEN IMPORT
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import {
  Atom,
  Bell,
  BookOpen,
  FolderKanban,
  LayoutDashboard,
  Loader2,
  LogOut,
  Search,
  Settings,
  ShieldCheck,
  Trophy,
  Users,
  Sparkles,
} from "lucide-react"

import { toast } from "sonner"
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts"

// Components
import SuggestedPartners from "@/components/ui/SuggestedPartners"
import SkillUpdateForm from "@/components/ui/SkillUpdateForm"
import ProjectTeamList from "@/components/ui/ProjectTeamList"
import CollaborationReviewModal from "@/components/ui/CollaborationReviewModal" // 🚀 MODAL IMPORTU

// Types
interface Suggestion { researcher_id: number; full_name: string; department_name: string; score: number; match_reasons: string[]; is_complementary: boolean; }
interface UserProject { project_id: number; title: string; status: string; my_role: string; group_members: any[]; }
interface UserProfile { researcher_id: number; full_name: string; email: string; title: string | null; role: string; department: number | null; department_name: string | null; skills: any; suggestions?: Suggestion[]; received_requests?: any[]; projects?: UserProject[]; notifications?: any[]; }

export default function Dashboard() {
  const navigate = useNavigate()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // 🚀 YENİ STATE'LER: Bildirim paneli ve seçilen inceleme talebi
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  // ✅ LIVE radar için: dashboard seviyesinde “draft skills”
  const [skillsDraft, setSkillsDraft] = useState<Record<string, number>>({})
  
  // 🛡️ OTONOM KİLİT: Çift isteği engelleyen kilit mekanizması
  const isFetching = useRef(false);

  useEffect(() => {
    fetchProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchProfile = async () => {
    if (isFetching.current) return;
    isFetching.current = true;

    setIsRefreshing(true)
    try {
      const data = await authService.getProfile()
      setProfile(data)
      
      if (data?.skills) {
        let cleanSkills = {};
        if (Array.isArray(data.skills)) {
          cleanSkills = data.skills.find((i: any) => typeof i === 'object' && i !== null) || {};
        } else {
          cleanSkills = data.skills;
        }
        setSkillsDraft(cleanSkills);
      }
      
    } catch (error: any) {
      if (error.response?.status === 401) {
        authService.logout(); navigate("/login"); return;
      }
      toast.error("Profil bilgileri senkronize edilemedi.")
    } finally {
      setLoading(false)
      setIsRefreshing(false)
      isFetching.current = false;
    }
  }

  // 🚀 YANIT FONKSİYONU: Kabul/Red işlemini fırlatır
  const handleRespond = async (requestId: number, status: string, msg: string) => {
    try {
      await api.post("/api/researchers/respond-request/", {
        request_id: requestId,
        status: status,
        response_message: msg
      });
      toast.success(status === 'accepted' ? "İş birliği onaylandı!" : "İstek reddedildi.");
      fetchProfile(); // 🔄 Sayfayı otonom tazele
      setSelectedRequest(null);
    } catch (error: any) {
      toast.error("İşlem başarısız: " + (error.response?.data?.detail || "Sunucu hatası"));
    }
  }

  const chartData = useMemo(() => {
    const s = skillsDraft
    if (!s || typeof s !== "object" || Array.isArray(s)) return []
    return Object.entries(s).map(([key, value]) => ({
      subject: key,
      A: Number(value),
      fullMark: 100,
    }))
  }, [skillsDraft])

  const handleLogout = () => {
    authService.logout(); navigate("/login"); toast.info("Oturum kapatıldı.")
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0b1020]">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-400" />
      </div>
    )
  }

  const themeOverride =
    "[&_.bg-white]:!bg-white/[0.06] " +
    "[&_.bg-slate-50]:!bg-white/[0.05] " +
    "[&_.bg-gray-50]:!bg-white/[0.05] " +
    "[&_.border-slate-100]:!border-white/10 " +
    "[&_.border-gray-100]:!border-white/10 " +
    "[&_.border-slate-200]:!border-white/10 " +
    "[&_.border-gray-200]:!border-white/10 " +
    "[&_.text-slate-900]:!text-slate-100 " +
    "[&_.text-gray-900]:!text-slate-100 " +
    "[&_.text-slate-800]:!text-slate-100 " +
    "[&_.text-gray-800]:!text-slate-100 " +
    "[&_.text-slate-700]:!text-slate-200/85 " +
    "[&_.text-gray-700]:!text-slate-200/85 " +
    "[&_.text-slate-600]:!text-slate-200/75 " +
    "[&_.text-gray-600]:!text-slate-200/75 " +
    "[&_.text-slate-500]:!text-slate-200/65 " +
    "[&_.text-gray-500]:!text-slate-200/65 " +
    "[&_.text-slate-400]:!text-slate-200/55 " +
    "[&_.text-gray-400]:!text-slate-200/55 " +
    "[&_.rounded-full]:!border-white/10 " +
    "[&_.rounded-full]:!bg-white/[0.06] " +
    "[&_.rounded-full]:!text-slate-200/80 " +
    "[&_.shadow-sm]:!shadow-none"

  return (
    <div className="h-screen overflow-hidden bg-[#0b1020] text-slate-100 font-sans">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/12 via-transparent to-transparent" />
        <div className="absolute -top-24 -right-24 h-[520px] w-[520px] rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-[520px] w-[520px] rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <div className="relative h-full flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 shrink-0 hidden md:flex flex-col border-r border-white/10 bg-white/[0.03] backdrop-blur-xl overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-500/15 p-2.5 rounded-2xl border border-indigo-400/20">
                <Atom className="h-6 w-6 text-indigo-200" />
              </div>
              <div className="leading-tight">
                <div className="text-lg font-black tracking-tight text-white">ResearchOS</div>
                <div className="text-xs font-semibold text-slate-300/70">Dashboard</div>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-hidden">
            <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" active />
            <NavItem icon={<FolderKanban size={18} />} label="Project" />
            <NavItem icon={<Trophy size={18} />} label="Accomments" />
            <NavItem icon={<BookOpen size={18} />} label="Deepgoes" />
            <NavItem icon={<Users size={18} />} label="Users" />
            <NavItem icon={<Settings size={18} />} label="Settings" to="/profile" />
          </nav>

          <div className="p-4 border-t border-white/10">
            <button type="button" onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/10 text-slate-300/70 hover:text-red-300 hover:border-red-400/20 hover:bg-red-500/5 transition">
              <LogOut size={18} />
              <span className="text-xs font-black uppercase tracking-widest">Sistemi Kapat</span>
            </button>
          </div>
        </aside>

        <section className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
          <header className="shrink-0 sticky top-0 z-30 h-20 px-5 sm:px-8 border-b border-white/10 bg-[#0b1020]/55 backdrop-blur-xl flex items-center justify-between">
            <div className="relative w-[320px] sm:w-[440px] hidden sm:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300/60" size={18} />
              <input type="text" placeholder="Sistemde ara..." className="w-full bg-white/[0.05] border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400/30 transition placeholder:text-slate-300/40" />
            </div>

            <div className="flex items-center gap-4 sm:gap-6 ml-auto">
              <Button onClick={fetchProfile} variant="secondary" className="hidden md:inline-flex rounded-2xl bg-white/[0.06] text-slate-100 border border-white/10 hover:bg-white/[0.09] font-black text-xs uppercase tracking-widest">
                {isRefreshing ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Yenileniyor</> : <><Sparkles className="h-4 w-4 mr-2 text-indigo-300" /> Yenile</>}
              </Button>

              {/* 🔔 BİLDİRİM MERKEZİ PANELİ */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-2xl text-slate-300/70 hover:text-indigo-200 hover:bg-white/[0.06] transition"
                  aria-label="Notifications"
                >
                  <Bell size={22} />
                  {profile?.notifications && profile.notifications.length > 0 && (
                    <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-indigo-500 rounded-full border-2 border-[#0b1020] animate-pulse shadow-[0_0_10px_rgba(129,140,248,0.8)]" />
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-4 w-[350px] bg-[#0f172a] border border-white/10 rounded-[2rem] shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="p-5 border-b border-white/10 bg-white/[0.02] flex justify-between items-center">
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-100">Bildirimler</h4>
                      <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-bold">CANLI</span>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                      {profile?.notifications && profile.notifications.length > 0 ? (
                        profile.notifications.map((n: any) => (
                          <div 
                            key={n.id} 
                            onClick={() => {
                              if (n.request_id) setSelectedRequest(n); // Sadece isteği olan bildirimler açılır
                              setShowNotifications(false);
                            }}
                            className={`p-4 border-b border-white/5 hover:bg-white/[0.08] transition-colors cursor-pointer ${n.request_id ? 'border-l-2 border-l-indigo-500' : ''}`}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">{n.title}</p>
                              <span className="text-[9px] text-slate-500 font-bold">{n.created_at}</span>
                            </div>
                            <p className="text-xs text-slate-200/80 leading-relaxed">{n.message}</p>
                          </div>
                        ))
                      ) : (
                        <div className="p-10 text-center opacity-40">
                          <Bell size={32} className="mx-auto mb-3 text-slate-500" />
                          <p className="text-[10px] font-black uppercase tracking-tighter">Bildirim Yok</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="h-8 w-px bg-white/10 hidden sm:block" />

              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-black text-white leading-tight">{profile?.full_name}</p>
                  <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mt-1">{profile?.title || "Researcher"}</p>
                </div>
                <Link to="/profile" className="h-12 w-12 bg-white/[0.06] rounded-2xl border border-white/10 flex items-center justify-center text-white font-black text-lg hover:scale-[1.03] transition shadow-sm" title="Profile">
                  {profile?.full_name?.charAt(0) ?? "U"}
                </Link>
              </div>
            </div>
          </header>

          <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-5 sm:px-8 py-6">
            <div className="max-w-[1500px] mx-auto space-y-6 pb-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">İstasyon <span className="text-indigo-300">Merkezi</span></h2>
                  <p className="text-slate-300/65 font-semibold text-sm mt-2 flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-300" />
                    Sistem: {isRefreshing ? "Senkronize ediliyor..." : "Senkronize"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 xl:col-span-8 space-y-6 min-w-0">
                  <Card className="bg-white/[0.05] border-white/10 rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.35)] overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between p-6 border-b border-white/10">
                      <CardTitle className="text-xs font-black uppercase tracking-[0.35em] text-slate-200/70">Yetenek Matrisi</CardTitle>
                      <Atom size={18} className="text-indigo-200" />
                    </CardHeader>
                    <CardContent className="h-[420px] p-6">
                      {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                            <PolarGrid stroke="rgba(255,255,255,0.12)" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: "rgba(226,232,240,0.75)", fontSize: 12, fontWeight: 800 }} />
                            <Radar name="Skill" dataKey="A" stroke="#a5b4fc" strokeWidth={2} fill="#818cf8" fillOpacity={0.18} />
                          </RadarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full w-full rounded-2xl border border-dashed border-white/15 bg-white/[0.03] flex items-center justify-center text-sm text-slate-200/70 font-semibold text-center px-4 italic">Yetenek verisi biyografiden ayıklanıyor veya henüz tanımlanmadı...</div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className={`bg-white/[0.05] border-white/10 rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.35)] overflow-hidden ${themeOverride}`}>
                    <CardHeader className="p-6 border-b border-white/10">
                      <CardTitle className="text-xs font-black uppercase tracking-[0.35em] text-slate-200/70">Aktif Operasyonlar</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <ProjectTeamList projects={profile?.projects || []} />
                    </CardContent>
                  </Card>
                </div>

                <div className="col-span-12 xl:col-span-4 space-y-6 min-w-0">
                  <Card className={`bg-white/[0.05] border-white/10 rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.35)] overflow-hidden ${themeOverride}`}>
                    <CardHeader className="p-6 border-b border-white/10">
                      <CardTitle className="text-xs font-black uppercase tracking-[0.35em] text-slate-200/70">Partner Önerileri</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <SuggestedPartners suggestions={profile?.suggestions || []} />
                    </CardContent>
                  </Card>

                  <div className="rounded-[2rem] border border-white/10 bg-white/[0.05] shadow-[0_10px_40px_rgba(0,0,0,0.35)] overflow-hidden">
                    <div className="p-3">
                      <SkillUpdateForm initialSkills={skillsDraft} onSkillsChange={setSkillsDraft} onUpdateSuccess={fetchProfile} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </section>
      </div>

      {/* 🏝️ YÜZEN ADA (REVIEW MODAL): Bir bildirim seçildiğinde otonom açılır */}
      {selectedRequest && (
        <CollaborationReviewModal 
          request={selectedRequest} 
          onClose={() => setSelectedRequest(null)} 
          onRespond={handleRespond} 
        />
      )}
    </div>
  )
}

function NavItem({ icon, label, active = false, to }: { icon: React.ReactNode; label: string; active?: boolean; to?: string }) {
  const cls = [ "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition border text-left", active ? "bg-indigo-500/12 text-white border-indigo-400/20 shadow-[0_0_0_1px_rgba(129,140,248,0.15)]" : "bg-transparent text-slate-200/70 border-transparent hover:border-white/10 hover:bg-white/[0.04] hover:text-white" ].join(" ")
  const content = ( <> <span className={active ? "text-indigo-200" : "text-slate-200/60"}>{icon}</span> <span className="text-xs font-black uppercase tracking-widest">{label}</span> </> )
  if (to) return ( <Link to={to} className={cls}>{content}</Link> )
  return ( <button type="button" className={cls}>{content}</button> )
}