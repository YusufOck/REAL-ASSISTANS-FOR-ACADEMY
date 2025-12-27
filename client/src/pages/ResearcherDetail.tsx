// src/pages/ResearcherDetail.tsx
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { api } from "@/lib/api" // 🛰️ API Instance integrated

export default function ResearcherDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [researcher, setResearcher] = useState<any>(null)
  const [otherProjects, setOtherProjects] = useState<any[]>([])
  const [myProjects, setMyProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [requestType, setRequestType] = useState<"join_request" | "invite">("join_request")
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [requestMessage, setRequestMessage] = useState("")
  const [isSending, setIsSending] = useState(false)

  // 🛡️ AUTONOMOUS LOCK: Prevents duplicate requests
  const isFetching = useRef(false)

  useEffect(() => {
    const fetchData = async () => {
      if (isFetching.current) return
      isFetching.current = true

      setLoading(true)
      try {
        // 🛰️ DATA STATION: /researchers/me/ yerine direkt /projects/ endpoint'ini mühürledik.
        const [resProfile, resProjects, resMeProjects] = await Promise.all([
          api.get(`/researchers/${id}/`),
          api.get(`/researchers/${id}/projects/`),
          api.get(`/projects/`), // 🚀 GÜNCELLEME: Kendi projelerini tam liste olarak buradan çekiyoruz
        ])

        const profileRaw = resProfile.data
        const projectsData = resProjects.data
        const meProjectsData = resMeProjects.data // 🛡️ Bu veri artık tüm projelerini içerir

        // 🛡️ DATA SYNC: "Expertise Areas" sealing block
        let cleanProfile = Array.isArray(profileRaw) ? profileRaw.find(i => typeof i === 'object') : profileRaw;
        
        if (cleanProfile && cleanProfile.skills && Array.isArray(cleanProfile.skills)) {
          cleanProfile.skills = cleanProfile.skills.find((i: any) => typeof i === 'object' && i !== null) || {};
        }

        setResearcher(cleanProfile)
        setOtherProjects(projectsData)
        // 🚀 GÜNCELLEME: meData.projects yerine direkt gelen projeler listesini mühürle
        setMyProjects(meProjectsData || [])
      } catch (error: any) {
        toast.error("Data could not be synchronized. System error (500).")
      } finally {
        setLoading(false)
        isFetching.current = false
      }
    }

    if (id) fetchData()
  }, [id])

  const handleSendRequest = async () => {
    if (!selectedProjectId) return
    setIsSending(true)
    try {
      await api.post(`/researchers/${id}/send-request/`, {
        receiver_id: id,
        project_id: selectedProjectId,
        message: requestMessage,
        request_type: requestType,
      })
      
      toast.success("Collaboration request launched.")
      setSelectedProjectId(null)
      setRequestMessage("")
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Request could not be sent.")
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
          <ArrowLeft className="mr-2" /> Go Back
        </Button>

        {/* Profile Card */}
        <div className="rounded-[2rem] bg-white/[0.06] border border-white/15 p-8 shadow-[0_10px_40px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/15 rounded-2xl border border-indigo-400/20">
              <Brain className="text-indigo-300" size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white">{researcher?.full_name || "Unknown Researcher"}</h1>
              <p className="text-indigo-300 font-bold">{researcher?.title || "Researcher"}</p>
            </div>
          </div>
          {researcher?.bio && (
            <p className="mt-4 text-slate-200/80 italic leading-relaxed">“{researcher.bio}”</p>
          )}
        </div>

        {/* Request Type Selector */}
        <div className="flex gap-4 bg-white/[0.04] border border-white/10 rounded-2xl p-2">
          <button
            onClick={() => { setRequestType("join_request"); setSelectedProjectId(null); }}
            className={`flex-1 py-3 rounded-xl font-black transition ${requestType === "join_request" ? "bg-indigo-500/20 text-indigo-300 shadow-lg shadow-indigo-500/10" : "text-slate-400 hover:text-white"}`}
          >
            <Users className="inline mr-2" size={18} /> Join Their Project
          </button>
          <button
            onClick={() => { setRequestType("invite"); setSelectedProjectId(null); }}
            className={`flex-1 py-3 rounded-xl font-black transition ${requestType === "invite" ? "bg-purple-500/20 text-purple-300 shadow-lg shadow-purple-500/10" : "text-slate-400 hover:text-white"}`}
          >
            <UserPlus className="inline mr-2" size={18} /> Invite to My Project
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
                      <div className="h-full bg-indigo-500 transition-all duration-700" style={{ width: `${level}%` }} />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 italic text-sm text-center py-4">This researcher hasn't sealed their skills yet.</p>
              )}
            </div>
          </div>

          {/* Project List */}
          <div className="rounded-[2rem] bg-white/[0.06] border border-white/15 p-6 shadow-xl">
            <h3 className="text-xl font-black mb-6 flex items-center gap-2">
              <FolderGit2 className="text-emerald-400" /> 
              {requestType === "join_request" ? "Projects You Can Join" : "Projects You Can Invite Them To"}
            </h3>
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
              {(requestType === "join_request" ? otherProjects : myProjects).map((p: any) => (
                <div
                  key={p.project_id}
                  onClick={() => setSelectedProjectId(p.project_id)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${selectedProjectId === p.project_id ? "border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/5" : "border-white/5 bg-white/[0.03] hover:border-white/20"}`}
                >
                  {selectedProjectId === p.project_id && <CheckCircle2 className="absolute top-4 right-4 text-indigo-400" size={18} />}
                  <p className="font-bold text-slate-100 pr-8">{p.title}</p>
                </div>
              ))}
              {(requestType === "join_request" ? otherProjects : myProjects).length === 0 && (
                <p className="text-slate-500 italic text-sm text-center py-10">No projects available to display.</p>
              )}
            </div>
          </div>
        </div>

        {/* Message Area */}
        {selectedProjectId && (
          <div className="animate-in slide-in-from-bottom-4 duration-300">
            <textarea
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              className="w-full min-h-[140px] bg-white/[0.05] border border-white/10 rounded-3xl p-6 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 transition-all"
              placeholder="Add a note for the collaboration..."
            />
          </div>
        )}

        <Button
          onClick={handleSendRequest}
          disabled={!selectedProjectId || isSending}
          className="w-full h-16 rounded-[1.5rem] bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 font-black text-lg shadow-2xl transition-all active:scale-[0.98] disabled:opacity-30"
        >
          {isSending ? <Loader2 className="animate-spin" /> : <><Send className="mr-2" size={20} /> SEND COLLABORATION REQUEST</>}
        </Button>
      </div>
    </div>
  )
}