import { useEffect, useState, useRef } from "react"
import { useParams, useNavigate, useOutletContext } from "react-router-dom" // 🚀 useOutletContext eklendi
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
  ShieldAlert,
  Clock,
  AlertCircle,
  Menu // 🚀 Menu eklendi
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { api } from "@/lib/api"

export default function ResearcherDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  // 🚀 MÜHÜR: Layout'tan gelen mobil menü kontrolü
  const { setIsMobileMenuOpen } = useOutletContext<{ setIsMobileMenuOpen: (v: boolean) => void }>();

  const [researcher, setResearcher] = useState<any>(null)
  const [otherProjects, setOtherProjects] = useState<any[]>([])
  const [myProjects, setMyProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [myId, setMyId] = useState<number | null>(null)
  const [pastRequests, setPastRequests] = useState<any[]>([])

  const [requestType, setRequestType] = useState<"join_request" | "invite">("join_request")
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [requestMessage, setRequestMessage] = useState("")
  const [isSending, setIsSending] = useState(false)

  const isFetching = useRef(false)

  // 🛡️ MANTIK KORUNDU: Veri Çekme İşlemi
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
          api.get(`/researchers/me/`)
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

  // 🛡️ MANTIK KORUNDU: Kısıtlama Motoru
  const getProjectRestriction = (project: any) => {
    if (requestType === "invite" && project.pi !== myId) {
      return { restricted: true, reason: "Only Managers Can Invite", icon: <ShieldAlert className="w-3 h-3 md:w-4 md:h-4" /> };
    }

    const isAlreadyMember = project.members?.some((m: any) => m.researcher_id === Number(id));
    if (isAlreadyMember) {
      return { restricted: true, reason: "Already in Project", icon: <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4" /> };
    }

    const lastRequest = pastRequests.find(r => r.project_id === project.project_id && r.status === 'rejected');
    if (lastRequest) {
      return { restricted: true, reason: "Rejected (Cooldown Active)", icon: <Clock className="w-3 h-3 md:w-4 md:h-4" /> };
    }

    return { restricted: false, reason: "", icon: null };
  };

  // 🛡️ MANTIK KORUNDU: Talep Gönderme
  const handleSendRequest = async () => {
    if (!selectedProjectId) return;
    
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
        <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0b1020] text-slate-100 px-4 md:px-6 py-6 md:py-10 flex-1 overflow-y-auto custom-scrollbar">
      <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500">
        
        {/* HEADER BAR: 🚀 MÜHÜR: Hamburger Menü ve Geri Butonu Senkronizasyonu */}
        <div className="flex justify-between items-center mb-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-slate-400 hover:text-white hover:bg-white/[0.05] rounded-xl px-3 h-11"
          >
            <ArrowLeft className="mr-2 w-4 h-4 md:w-5 md:h-5" /> 
            <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">Back to Directory</span>
          </Button>

          {/* Mobil Menü Butonu */}
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-3 bg-white/5 rounded-xl border border-white/10 text-indigo-300 active:scale-95 transition-all shadow-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Profile Card */}
        <div className="rounded-[2rem] md:rounded-[2.5rem] bg-white/[0.06] border border-white/15 p-6 md:p-10 shadow-2xl backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
             <Brain className="w-32 h-32 md:w-48 md:h-48 text-indigo-400" />
          </div>
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left relative z-10">
            <div className="p-4 bg-indigo-500/15 rounded-3xl border border-indigo-400/20 shadow-inner">
              <Brain className="text-indigo-300 w-8 h-8 md:w-10 md:h-10" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight uppercase italic truncate">{researcher?.full_name || "Researcher"}</h1>
              <p className="text-indigo-400 font-bold uppercase text-[10px] md:text-xs tracking-[0.2em] mt-2">{researcher?.title || "Staff Researcher"}</p>
            </div>
          </div>
          {researcher?.bio && (
            <p className="mt-6 text-slate-300 italic text-sm leading-relaxed bg-white/[0.03] p-5 rounded-2xl border border-white/5 relative z-10">
              “{researcher.bio}”
            </p>
          )}
        </div>

        {/* Request Type Selector */}
        <div className="flex flex-col sm:flex-row gap-3 bg-white/[0.04] border border-white/10 rounded-[1.5rem] p-2">
          <button
            onClick={() => { setRequestType("join_request"); setSelectedProjectId(null); }}
            className={`flex-1 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${requestType === "join_request" ? "bg-indigo-500 text-white shadow-xl" : "text-slate-500 hover:bg-white/5"}`}
          >
            <Users className="w-4 h-4" /> Join Project
          </button>
          <button
            onClick={() => { setRequestType("invite"); setSelectedProjectId(null); }}
            className={`flex-1 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${requestType === "invite" ? "bg-purple-600 text-white shadow-xl" : "text-slate-500 hover:bg-white/5"}`}
          >
            <UserPlus className="w-4 h-4" /> Invite Peer
          </button>
        </div>

        {/* Grids */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {/* Expertise Areas */}
          <div className="rounded-[2rem] bg-white/[0.04] border border-white/10 p-6 md:p-8 shadow-xl h-full flex flex-col">
            <h3 className="text-lg font-black mb-6 flex items-center gap-3 uppercase italic shrink-0">
              <Code className="text-indigo-400 w-5 h-5" /> Expertise Silhouette
            </h3>
            <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-1">
              {researcher?.skills && Object.entries(researcher.skills).length > 0 ? (
                Object.entries(researcher.skills).map(([skill, level]: any) => (
                  <div key={skill} className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <span>{skill}</span>
                      <span className="text-indigo-400">%{level}</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all duration-1000" style={{ width: `${level}%` }} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center opacity-30 text-[10px] font-black uppercase italic tracking-widest">No skill matrix synchronized</div>
              )}
            </div>
          </div>

          {/* Project List */}
          <div className="rounded-[2rem] bg-white/[0.04] border border-white/10 p-6 md:p-8 shadow-xl h-full flex flex-col">
            <h3 className="text-lg font-black mb-6 flex items-center gap-3 uppercase italic shrink-0">
              <FolderGit2 className="text-emerald-400 w-5 h-5" /> 
              {requestType === "join_request" ? "Select Target" : "Source Project"}
            </h3>
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar flex-1">
              {(requestType === "join_request" ? otherProjects : myProjects).map((p: any) => {
                const check = getProjectRestriction(p);
                return (
                  <div
                    key={p.project_id}
                    onClick={() => !check.restricted && setSelectedProjectId(p.project_id)}
                    className={`p-4 rounded-xl border-2 transition-all relative ${
                        check.restricted 
                        ? "opacity-40 cursor-not-allowed border-white/5" 
                        : selectedProjectId === p.project_id 
                            ? "border-indigo-500 bg-indigo-500/10" 
                            : "border-white/5 bg-white/[0.03] hover:border-white/20 cursor-pointer"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-4">
                        <p className={`text-xs font-bold leading-snug ${check.restricted ? "text-slate-500" : "text-white"}`}>{p.title}</p>
                        {check.restricted ? (
                            <span className="shrink-0 text-[7px] font-black uppercase text-red-400 border border-red-400/20 px-1.5 py-0.5 rounded flex items-center gap-1">
                                {check.icon} RESTRCTD
                            </span>
                        ) : selectedProjectId === p.project_id && (
                            <CheckCircle2 className="text-indigo-400 shrink-0 w-4 h-4" />
                        )}
                    </div>
                  </div>
                )
              })}
              {(requestType === "join_request" ? otherProjects : myProjects).length === 0 && (
                <div className="py-20 text-center opacity-20 text-[10px] font-black uppercase italic tracking-[0.2em]">No nodes detected</div>
              )}
            </div>
          </div>
        </div>

        {/* Message Area */}
        {selectedProjectId && (
          <div className="animate-in slide-in-from-bottom-4 duration-300 space-y-4 pt-4">
             <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                <AlertCircle className="w-3 h-3" /> Collaboration Proposal Pitch
             </p>
             <textarea
               value={requestMessage}
               onChange={(e) => setRequestMessage(e.target.value)}
               className="w-full min-h-[150px] bg-white/[0.05] border border-white/10 rounded-[2rem] p-6 text-sm text-slate-100 placeholder:text-slate-600 focus:ring-2 ring-indigo-500/20 outline-none transition-all resize-none shadow-inner"
               placeholder="Write a message to synchronize research objectives..."
             />
          </div>
        )}

        <Button
          onClick={handleSendRequest}
          disabled={!selectedProjectId || isSending}
          className="w-full h-16 md:h-20 rounded-[2rem] bg-indigo-500 hover:bg-indigo-600 font-black text-sm md:text-lg uppercase tracking-[0.15em] shadow-2xl transition-all active:scale-[0.98] disabled:opacity-20 border-b-4 border-indigo-800"
        >
          {isSending ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Send className="mr-3 w-5 h-5 md:w-6 md:h-6" /> Launch Operation</>}
        </Button>
      </div>
    </div>
  )
}