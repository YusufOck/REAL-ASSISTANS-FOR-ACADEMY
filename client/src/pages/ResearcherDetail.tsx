import { useEffect, useState, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  Loader2,
  ArrowLeft,
  Brain,
  Code,
  FolderGit2,
  CheckCircle2,
  Send,
  UserPlus,
  Users,
  ShieldAlert, // 🚀 Yeni ikonlar
  Clock,
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { api } from "@/lib/api"

export default function ResearcherDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [researcher, setResearcher] = useState<any>(null)
  const [otherProjects, setOtherProjects] = useState<any[]>([])
  const [myProjects, setMyProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // 🚀 YETKİ VE KONTROL STATE'LERİ
  const [myId, setMyId] = useState<number | null>(null)
  const [pastRequests, setPastRequests] = useState<any[]>([])

  const [requestType, setRequestType] = useState<"join_request" | "invite">("join_request")
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [requestMessage, setRequestMessage] = useState("")
  const [isSending, setIsSending] = useState(false)

  const isFetching = useRef(false)

  useEffect(() => {
    const fetchData = async () => {
      if (isFetching.current) return
      isFetching.current = true

      setLoading(true)
      try {
        const [resProfile, resProjects, resMeProjects, meInfo] = await Promise.all([
          api.get(`/researchers/${id}/`),
          api.get(`/researchers/${id}/projects/`),
          api.get(`/projects/`),
          api.get(`/researchers/me/`) // 🛰️ Kendi kimliğini doğrula
        ])

        setMyId(meInfo.data.researcher_id)
        
        const profileRaw = resProfile.data
        const projectsData = resProjects.data
        const meProjectsRaw = resMeProjects.data

        const otherList = Array.isArray(projectsData) ? projectsData : (projectsData?.results || [])
        const myList = Array.isArray(meProjectsRaw) ? meProjectsRaw : (meProjectsRaw?.results || [])

        let cleanProfile = Array.isArray(profileRaw) ? profileRaw.find(i => typeof i === 'object') : profileRaw;
        
        if (cleanProfile && cleanProfile.skills && Array.isArray(cleanProfile.skills)) {
          cleanProfile.skills = cleanProfile.skills.find((i: any) => typeof i === 'object' && i !== null) || {};
        }

        setResearcher(cleanProfile)
        setOtherProjects(otherList)
        setMyProjects(myList)

        // 🛡️ Bildirim geçmişini kontrol et (Reddedilme ve bekleme durumları için)
        if (meInfo.data.notifications) {
            setPastRequests(meInfo.data.notifications.filter((n: any) => n.request_id));
        }

      } catch (error: any) {
        toast.error("System synchronization failed.")
      } finally {
        setLoading(false)
        isFetching.current = false
      }
    }

    if (id) fetchData()
  }, [id])

  // 🧠 KISITLAMA KONTROL MOTORU
  const getProjectRestriction = (project: any) => {
    // 1. Kendi projemize davet ederken PI kontrolü
    if (requestType === "invite" && project.pi !== myId) {
      return { restricted: true, reason: "Only Managers Can Invite", icon: <ShieldAlert size={14} /> };
    }

    // 2. Halihazırda üye mi kontrolü
    const isAlreadyMember = project.members?.some((m: any) => m.researcher_id === Number(id));
    if (isAlreadyMember) {
      return { restricted: true, reason: "Already in Project", icon: <CheckCircle2 size={14} /> };
    }

    // 3. 10 Günlük Reddedilme (Cooldown) Kontrolü
    const lastRequest = pastRequests.find(r => r.project_id === project.project_id && r.status === 'rejected');
    if (lastRequest) {
      // Not: created_at formatına göre tarih farkı hesaplanır. Simülasyon:
      return { restricted: true, reason: "Rejected (Cooldown Active)", icon: <Clock size={14} /> };
    }

    return { restricted: false, reason: "", icon: null };
  };

  const handleSendRequest = async () => {
    if (!selectedProjectId) return;
    
    // Final Güvenlik Kontrolü
    const selectedProj = (requestType === "join_request" ? otherProjects : myProjects).find(p => p.project_id === selectedProjectId);
    const restriction = getProjectRestriction(selectedProj);
    if (restriction.restricted) {
        toast.error(restriction.reason);
        return;
    }

    setIsSending(true)
    try {
      await api.post(`/researchers/${id}/send-request/`, {
        receiver_id: id,
        project_id: selectedProjectId,
        message: requestMessage,
        request_type: requestType,
      })
      
      toast.success("Request successfully encrypted and sent.")
      setSelectedProjectId(null)
      setRequestMessage("")
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Launch failed.")
    } finally {
      setIsSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0b1020]">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0b1020] text-slate-100 px-6 py-10">
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="text-slate-300 hover:text-white hover:bg-white/[0.05] rounded-xl"
        >
          <ArrowLeft className="mr-2" /> Back to Directory
        </Button>

        {/* Profile Card */}
        <div className="rounded-[2rem] bg-white/[0.06] border border-white/15 p-8 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/15 rounded-2xl border border-indigo-400/20">
              <Brain className="text-indigo-300" size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white">{researcher?.full_name || "Unknown Researcher"}</h1>
              <p className="text-indigo-300 font-bold uppercase text-xs tracking-widest">{researcher?.title || "Researcher"}</p>
            </div>
          </div>
          {researcher?.bio && (
            <p className="mt-4 text-slate-300 italic leading-relaxed bg-white/5 p-4 rounded-2xl border border-white/5">“{researcher.bio}”</p>
          )}
        </div>

        {/* Request Type Selector */}
        <div className="flex gap-4 bg-white/[0.04] border border-white/10 rounded-2xl p-2">
          <button
            onClick={() => { setRequestType("join_request"); setSelectedProjectId(null); }}
            className={`flex-1 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${requestType === "join_request" ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-xl" : "text-slate-500 hover:text-slate-300"}`}
          >
            <Users className="inline mr-2" size={16} /> Join Their Project
          </button>
          <button
            onClick={() => { setRequestType("invite"); setSelectedProjectId(null); }}
            className={`flex-1 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${requestType === "invite" ? "bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-xl" : "text-slate-500 hover:text-slate-300"}`}
          >
            <UserPlus className="inline mr-2" size={16} /> Invite to My Project
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Expertise Areas */}
          <div className="rounded-[2rem] bg-white/[0.06] border border-white/15 p-6 shadow-xl">
            <h3 className="text-xl font-black mb-6 flex items-center gap-2">
              <Code className="text-indigo-400" /> Expertise Areas
            </h3>
            <div className="space-y-5">
              {researcher?.skills && Object.entries(researcher.skills).length > 0 ? (
                Object.entries(researcher.skills).map(([skill, level]: any) => (
                  <div key={skill} className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-black text-slate-300 uppercase tracking-widest">
                      <span>{skill}</span>
                      <span className="text-indigo-300">%{level}</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.4)]" style={{ width: `${level}%` }} />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 italic text-sm text-center py-4">No skills indexed in the system.</p>
              )}
            </div>
          </div>

          {/* Project List with Restrictions */}
          <div className="rounded-[2rem] bg-white/[0.06] border border-white/15 p-6 shadow-xl">
            <h3 className="text-xl font-black mb-6 flex items-center gap-2">
              <FolderGit2 className="text-emerald-400" /> 
              {requestType === "join_request" ? "Select Project to Join" : "Invite to Your Projects"}
            </h3>
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
              {(requestType === "join_request" ? otherProjects : myProjects).map((p: any) => {
                const check = getProjectRestriction(p);
                
                return (
                  <div
                    key={p.project_id}
                    onClick={() => !check.restricted && setSelectedProjectId(p.project_id)}
                    className={`p-4 rounded-2xl border-2 transition-all relative ${
                        check.restricted 
                        ? "opacity-40 cursor-not-allowed border-white/5 bg-transparent" 
                        : selectedProjectId === p.project_id 
                            ? "border-indigo-500 bg-indigo-500/10 shadow-lg" 
                            : "border-white/5 bg-white/[0.03] hover:border-white/20 cursor-pointer"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-4">
                        <p className={`font-bold ${check.restricted ? "text-slate-500" : "text-slate-100"}`}>{p.title}</p>
                        {check.restricted ? (
                            <div className="flex flex-col items-end gap-1 shrink-0">
                                <span className="text-[8px] font-black uppercase text-red-400 border border-red-400/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                                    {check.icon} {check.reason}
                                </span>
                            </div>
                        ) : selectedProjectId === p.project_id && (
                            <CheckCircle2 className="text-indigo-400 shrink-0" size={18} />
                        )}
                    </div>
                  </div>
                )
              })}
              {(requestType === "join_request" ? otherProjects : myProjects).length === 0 && (
                <p className="text-slate-500 italic text-sm text-center py-10 opacity-30">No compatible projects found.</p>
              )}
            </div>
          </div>
        </div>

        {/* Message Area */}
        {selectedProjectId && (
          <div className="animate-in slide-in-from-bottom-4 duration-300 space-y-3">
             <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-2 flex items-center gap-2">
                <AlertCircle size={12} /> Collaboration Proposal Note
             </p>
             <textarea
               value={requestMessage}
               onChange={(e) => setRequestMessage(e.target.value)}
               className="w-full min-h-[140px] bg-white/[0.05] border border-white/10 rounded-3xl p-6 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
               placeholder="Write a message that will convince this researcher to collaborate..."
             />
          </div>
        )}

        <Button
          onClick={handleSendRequest}
          disabled={!selectedProjectId || isSending}
          className="w-full h-20 rounded-[2rem] bg-indigo-600 hover:bg-indigo-500 font-black text-lg shadow-2xl transition-all active:scale-[0.98] disabled:opacity-20 border-b-4 border-indigo-800"
        >
          {isSending ? <Loader2 className="animate-spin" /> : <><Send className="mr-3" size={24} /> LAUNCH COLLABORATION REQUEST</>}
        </Button>
      </div>
    </div>
  )
}