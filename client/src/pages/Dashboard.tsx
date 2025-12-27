import { useEffect, useMemo, useState, useRef } from "react"
import { Link, useNavigate } from "react-router-dom"
import { createPortal } from "react-dom"

import { authService } from "@/services/authService"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import {
  Atom,
  Bell,
  FolderKanban,
  LayoutDashboard,
  Loader2,
  LogOut,
  Search,
  Settings,
  ShieldCheck,
  Users,
  Sparkles,
  Trash2,
} from "lucide-react"

import { toast } from "sonner"
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts"

// Components
import SkillUpdateForm from "@/components/ui/SkillUpdateForm"
import CollaborationReviewModal from "@/components/ui/CollaborationReviewModal"

export default function Dashboard() {
  const navigate = useNavigate()

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
      const width = 350
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
    <div className="h-screen overflow-hidden bg-[#0b1020] text-slate-100 font-sans">
      <div className="relative h-full flex overflow-hidden">
        {/* SIDEBAR */}
        <aside className="w-64 shrink-0 hidden md:flex flex-col border-r border-white/10 bg-white/[0.03] backdrop-blur-xl">
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

          <nav className="flex-1 p-4 space-y-2">
            <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" to="/dashboard" active />
            <NavItem icon={<FolderKanban size={18} />} label="Project" to="/projects" />
            <NavItem icon={<Users size={18} />} label="Users" to="/users" /> 
            <NavItem icon={<Settings size={18} />} label="Settings" to="/profile" />
          </nav>

          <div className="p-4 border-t border-white/10">
            <button
              onClick={() => {
                authService.logout()
                navigate("/login")
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/10 text-slate-300/70 hover:text-red-300 transition hover:bg-red-500/5"
            >
              <LogOut size={18} />
              <span className="text-xs font-black uppercase tracking-widest">Shut Down System</span>
            </button>
          </div>
        </aside>

        <section className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <header className="h-20 px-8 border-b border-white/10 bg-[#0b1020]/55 backdrop-blur-xl flex items-center justify-between">
            <div className="relative w-[440px] hidden sm:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300/60" size={18} />
              <input
                type="text"
                placeholder="Search the system..."
                className="w-full bg-white/[0.05] border border-white/10 rounded-2xl py-3 pl-11 text-sm outline-none placeholder:text-slate-500"
              />
            </div>

            <div className="flex items-center gap-6 ml-auto">
              <Button
                onClick={fetchProfile}
                variant="secondary"
                className="hidden md:inline-flex rounded-2xl bg-white/[0.06] text-slate-100 border border-white/10 hover:bg-white/[0.09] font-black text-xs uppercase tracking-widest px-6 h-11"
              >
                {isRefreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2 text-indigo-300" />
                )}
                Refresh
              </Button>

              <div className="relative">
                <button
                  ref={bellBtnRef}
                  onClick={() => setShowNotifications((v) => !v)}
                  className="relative p-2 text-slate-300/70 hover:text-indigo-200 transition"
                  aria-label="Notifications"
                >
                  <Bell size={22} />
                  {profile?.notifications?.length > 0 && (
                    <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(129,140,248,0.8)]" />
                  )}
                </button>
              </div>

              <div className="text-right hidden sm:block">
                <p className="text-sm font-black text-white">{profile?.full_name}</p>
                <p className="text-[10px] font-black text-indigo-200 uppercase mt-1 tracking-widest">
                  {profile?.title || "Researcher"}
                </p>
              </div>

              <Link
                to="/profile"
                className="h-12 w-12 bg-white/[0.06] rounded-2xl border border-white/10 flex items-center justify-center text-white font-black hover:scale-[1.03] transition shadow-sm"
              >
                {profile?.full_name?.charAt(0) ?? "U"}
              </Link>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto px-8 py-8">
            <div className="max-w-[1200px] mx-auto space-y-8 pb-4">
              <div>
                <h2 className="text-4xl font-black text-white tracking-tighter">
                  Station <span className="text-indigo-300">Center</span>
                </h2>
                <div className="text-emerald-400 text-[10px] font-black uppercase flex items-center gap-2 mt-2 tracking-widest">
                  <ShieldCheck size={16} /> System: Synchronized
                </div>
              </div>

              <div className="grid grid-cols-12 gap-8">
                {/* SKILL MATRIX */}
                <div className="col-span-12 lg:col-span-8">
                  <Card className="bg-white/[0.05] border-white/10 rounded-[3rem] overflow-hidden shadow-2xl">
                    <CardHeader className="p-8 border-b border-white/10 flex flex-row justify-between items-center bg-white/[0.01]">
                      <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                        Skill Matrix
                      </CardTitle>
                      <Atom size={18} className="text-indigo-400" />
                    </CardHeader>
                    <CardContent className="h-[480px] p-8">
                      {/* 🚀 AI ANALİZ DURUMU KONTROLÜ */}
                      {profile?.is_analyzing ? (
                        <div className="h-full flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-500">
                          <Loader2 className="h-12 w-12 animate-spin text-indigo-400" />
                          <div className="text-center space-y-1">
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-300 animate-pulse">
                              AI is Analyzing Your Bio...
                            </p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                              Extracting skills and matching scores
                            </p>
                          </div>
                        </div>
                      ) : chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={chartData}>
                            <PolarGrid stroke="rgba(255,255,255,0.1)" />
                            <PolarAngleAxis
                              dataKey="subject"
                              tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 900 }}
                            />
                            <Radar dataKey="A" stroke="#818cf8" strokeWidth={3} fill="#818cf8" fillOpacity={0.15} />
                          </RadarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center italic text-slate-500 font-bold text-sm">
                          Skill data is being synchronized...
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* SKILL UPDATE */}
                <div className="col-span-12 lg:col-span-4">
                  <div className="rounded-[3rem] border border-white/10 bg-white/[0.05] p-2 shadow-2xl overflow-hidden">
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
        </section>
      </div>

      {showNotifications &&
        notifPos &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[9998]" onClick={() => setShowNotifications(false)} />

            <div
              className="fixed z-[9999] w-[350px] bg-[#0f172a] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
              style={{ top: notifPos.top, left: notifPos.left }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-white/10 bg-white/[0.02] font-black uppercase text-[10px] tracking-widest flex justify-between items-center">
                Notifications
                <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-bold">
                  LIVE
                </span>
              </div>

              <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                {profile?.notifications?.length > 0 ? (
                  profile.notifications.map((n: any) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        if (n.request_id) setSelectedRequest(n)
                        setShowNotifications(false)
                      }}
                      className={`p-4 border-b border-white/5 hover:bg-white/[0.05] cursor-pointer transition ${
                        n.is_actionable ? "border-l-2 border-l-indigo-500" : ""
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-[10px] font-black text-indigo-400 uppercase">{n.title}</p>
                        <button onClick={(e) => handleDeleteNotification(e, n.id)} className="text-slate-500 hover:text-red-400">
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <p className="text-xs text-slate-300">{n.message}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-10 text-center opacity-40 text-[10px] font-black uppercase italic">No Notifications</div>
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

function NavItem({
  icon,
  label,
  active = false,
  to,
}: {
  icon: React.ReactNode
  label: string
  active?: boolean
  to?: string
}) {
  const cls = `w-full flex items-center gap-4 px-5 py-4 rounded-[1.5rem] transition-all border ${
    active
      ? "bg-indigo-500/15 text-white border-indigo-400/20 shadow-lg"
      : "text-slate-400 border-transparent hover:border-white/10 hover:bg-white/[0.05] hover:text-white"
  }`

  const content = (
    <>
      <span className={active ? "text-white" : "text-slate-500"}>{icon}</span>
      <span className="text-[10px] font-black uppercase tracking-[0.2em]">{label}</span>
    </>
  )

  return to ? (
    <Link to={to} className={cls}>
      {content}
    </Link>
  ) : (
    <button type="button" className={cls}>
      {content}
    </button>
  )
}