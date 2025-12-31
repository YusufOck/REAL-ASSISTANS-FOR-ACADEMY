import { useEffect, useMemo, useState, useRef } from "react"
import { Link, useNavigate, useOutletContext } from "react-router-dom" // 🚀 useOutletContext eklendi
import { createPortal } from "react-dom"

import { authService } from "@/services/authService"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import {
  Atom,
  Bell,
  Loader2,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Menu,
} from "lucide-react"

import { toast } from "sonner"
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts"

// Components
import SkillUpdateForm from "@/components/ui/SkillUpdateForm"
import CollaborationReviewModal from "@/components/ui/CollaborationReviewModal"

export default function Dashboard() {
  const navigate = useNavigate()
  // 🚀 MÜHÜR: Layout'tan gelen menü kontrolünü yakala
  const { setIsMobileMenuOpen } = useOutletContext<{ setIsMobileMenuOpen: (v: boolean) => void }>();

  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const [showNotifications, setShowNotifications] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  
  const [skillsDraft, setSkillsDraft] = useState<Record<string, number>>({})
  const isFetching = useRef(false)

  const bellBtnRef = useRef<HTMLButtonElement | null>(null)
  const [notifPos, setNotifPos] = useState<{ top: number; left: number; width: number } | null>(null)

  useEffect(() => {
    fetchProfile()
  }, [])

  useEffect(() => {
    const calc = () => {
      if (!bellBtnRef.current) return
      const r = bellBtnRef.current.getBoundingClientRect()
      const width = window.innerWidth < 400 ? window.innerWidth - 40 : 350 
      setNotifPos({
        top: r.bottom + 14,
        left: Math.max(12, r.right - width),
        width,
      })
    }
    if (showNotifications) calc()
    window.addEventListener("resize", calc)
    window.addEventListener("scroll", calc, true)
    return () => {
      window.removeEventListener("resize", calc)
      window.removeEventListener("scroll", calc, true)
    }
  }, [showNotifications])

  const fetchProfile = async () => {
    if (isFetching.current) return
    isFetching.current = true
    setIsRefreshing(true)
    try {
      const data = await authService.getProfile()
      setProfile(data)
      if (data?.skills) {
        const cleanSkills = Array.isArray(data.skills)
          ? data.skills.find((i: any) => typeof i === "object" && i !== null) || {}
          : data.skills
        setSkillsDraft(cleanSkills)
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        authService.logout()
        navigate("/login")
        return
      }
      toast.error("Profile could not be synchronized.")
    } finally {
      setLoading(false)
      setIsRefreshing(false)
      isFetching.current = false
    }
  }

  const handleDeleteNotification = async (e: React.MouseEvent, notificationId: number) => {
    e.stopPropagation()
    try {
      await api.delete(`/notifications/${notificationId}/`)
      toast.success("Notification cleared.")
      fetchProfile()
    } catch (error) {
      toast.error("Cleanup failed.")
    }
  }

  const handleRespond = async (requestId: number, status: string, msg: string) => {
    try {
      await api.post("/researchers/respond-request/", {
        request_id: requestId,
        status: status,
        response_message: msg,
      })
      toast.success(status === "accepted" ? "Approved!" : "Rejected.")
      fetchProfile()
      setSelectedRequest(null)
    } catch (error: any) {
      toast.error("Operation failed: " + (error.response?.data?.detail || "Server error"))
    }
  }

  const chartData = useMemo(() => {
    if (!skillsDraft || typeof skillsDraft !== "object") return []
    return Object.entries(skillsDraft).map(([key, value]) => ({
      subject: key,
      A: Number(value),
      fullMark: 100,
    }))
  }, [skillsDraft])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0b1020]">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-400" />
      </div>
    )
  }

  return (
    // 🚀 MÜHÜR: Sidebar ve Aside silindi, Dashboard artık sadece içerik alanıdır.
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#0b1020] text-slate-100 font-sans">
      
      {/* Header - Layout ile uyumlu hale getirildi */}
      <header className="h-20 px-4 md:px-8 border-b border-white/10 bg-[#0b1020]/55 backdrop-blur-xl flex items-center justify-between z-30 shrink-0">
        
        {/* Hamburger Butonu - Layout'taki menüyü açar */}
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="md:hidden p-3 bg-white/5 rounded-xl border border-white/10 text-indigo-300 active:scale-95 transition-transform"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="relative w-full max-w-[440px] hidden lg:block mx-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300/60 w-4 h-4" />
          <input
            type="text"
            placeholder="Search the system..."
            className="w-full bg-white/[0.05] border border-white/10 rounded-2xl py-3 pl-11 text-sm outline-none placeholder:text-slate-500 focus:ring-2 ring-indigo-500/20 transition-all"
          />
        </div>

        <div className="flex items-center gap-3 md:gap-6 ml-auto">
          <Button
            onClick={fetchProfile}
            variant="secondary"
            className="hidden sm:inline-flex rounded-2xl bg-white/[0.06] text-slate-100 border border-white/10 hover:bg-white/[0.09] font-black text-[10px] uppercase tracking-widest px-5 h-11"
          >
            {isRefreshing ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2 text-indigo-300" />
            )}
            Refresh
          </Button>

          <button
            ref={bellBtnRef}
            onClick={() => setShowNotifications((v) => !v)}
            className="relative p-2.5 bg-white/5 rounded-xl border border-white/10 text-slate-300/70 hover:text-indigo-200 transition"
          >
            <Bell className="w-5 h-5" />
            {profile?.notifications?.length > 0 && (
              <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(129,140,248,0.8)]" />
            )}
          </button>

          <div className="text-right hidden sm:block">
            <p className="text-xs font-black text-white">{profile?.full_name}</p>
            <p className="text-[9px] font-black text-indigo-300/60 uppercase mt-0.5 tracking-widest">
              {profile?.title || "Researcher"}
            </p>
          </div>

          <Link
            to="/profile"
            className="h-11 w-11 bg-indigo-500/10 text-indigo-300 rounded-xl border border-indigo-500/20 flex items-center justify-center font-black hover:bg-indigo-500 hover:text-white transition-all shadow-sm"
          >
            {profile?.full_name?.charAt(0) ?? "U"}
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 md:py-8 custom-scrollbar">
        <div className="max-w-[1200px] mx-auto space-y-8 pb-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase italic leading-none">
                Station <span className="text-indigo-400">Center</span>
              </h2>
              <div className="text-emerald-400 text-[9px] font-black uppercase flex items-center gap-2 mt-3 tracking-[0.2em]">
                <ShieldCheck className="w-3.5 h-3.5" /> System Status: Online & Synchronized
              </div>
            </div>
            <button onClick={fetchProfile} className="sm:hidden w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">Refresh System</button>
          </div>

          <div className="grid grid-cols-12 gap-6 md:gap-8">
            {/* SKILL MATRIX */}
            <div className="col-span-12 xl:col-span-8">
              <Card className="bg-white/[0.04] border-white/10 rounded-[2.5rem] md:rounded-[3rem] overflow-hidden shadow-2xl backdrop-blur-sm">
                <CardHeader className="p-6 md:p-8 border-b border-white/5 flex flex-row justify-between items-center bg-white/[0.01]">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                    Expertise Radar
                  </CardTitle>
                  <Atom className="w-5 h-5 text-indigo-400 animate-pulse" />
                </CardHeader>
                <CardContent className="h-[350px] md:h-[480px] p-4 md:p-8">
                  {profile?.is_analyzing ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-4">
                      <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">AI Analysis in Progress...</p>
                    </div>
                  ) : chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={chartData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                        <PolarGrid stroke="rgba(255,255,255,0.05)" />
                        <PolarAngleAxis
                          dataKey="subject"
                          tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 9, fontWeight: 900 }}
                        />
                        <Radar dataKey="A" stroke="#818cf8" strokeWidth={3} fill="#818cf8" fillOpacity={0.15} />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center italic text-slate-600 font-bold text-xs uppercase tracking-widest text-center px-6">
                      No skill data detected in the database
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* SKILL UPDATE */}
            <div className="col-span-12 xl:col-span-4">
              <div className="rounded-[2.5rem] md:rounded-[3rem] border border-white/10 bg-white/[0.04] p-2 shadow-2xl overflow-hidden h-full">
                <SkillUpdateForm
                  initialSkills={skillsDraft}
                  onSkillsChange={setSkillsDraft}
                  onUpdateSuccess={fetchProfile}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Notifications Portal */}
      {showNotifications &&
        notifPos &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[9998] bg-black/20" onClick={() => setShowNotifications(false)} />
            <div
              className="fixed z-[9999] bg-[#0f172a] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
              style={{ top: notifPos.top, left: notifPos.left, width: notifPos.width }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-white/10 bg-white/[0.02] font-black uppercase text-[9px] tracking-widest flex justify-between items-center">
                System Notifications
                <span className="bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full text-[8px]">LIVE</span>
              </div>
              <div className="max-h-[300px] md:max-h-[400px] overflow-y-auto custom-scrollbar">
                {profile?.notifications?.length > 0 ? (
                  profile.notifications.map((n: any) => (
                    <div
                      key={n.notification_id || n.id}
                      onClick={() => {
                        if (n.request_id) setSelectedRequest(n)
                        setShowNotifications(false)
                      }}
                      className="p-4 border-b border-white/5 hover:bg-white/[0.05] cursor-pointer transition"
                    >
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <p className="text-[10px] font-black text-indigo-400 uppercase leading-tight">{n.title}</p>
                        <button onClick={(e) => handleDeleteNotification(e, n.notification_id || n.id)} className="text-slate-600 hover:text-red-400 shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{n.message}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-10 text-center opacity-30 text-[9px] font-black uppercase italic">No Active Records</div>
                )}
              </div>
            </div>
          </>,
          document.body
        )}

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