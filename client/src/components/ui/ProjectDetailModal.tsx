// src/components/ui/ProjectDetailModal.tsx
import { useState, useEffect } from "react"
import { X, Calendar, Wallet, UserPlus, Info, Building2, ShieldCheck, Loader2 } from "lucide-react" // 🚀 ShieldCheck & Loader2 eklendi
import ProjectSuggestionsModal from "./ProjectSuggestionsModal"
import { api } from "@/lib/api"

export default function ProjectDetailModal({ project, onClose, onUpdate }: any) {
  // 🛡️ CRITICAL: Django ChoiceField expects UPPERCASE.
  const [phase, setPhase] = useState(project.phase?.toUpperCase() || 'PLANNING')
  const [showSuggestions, setShowSuggestions] = useState(false)
  
  // 🚀 YETKİ KONTROLÜ: Mevcut kullanıcıyı ve PI durumunu takip eder
  const [myId, setMyId] = useState<number | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

  const members = project.members || [] 
  const fundingList = project.funding || []

  // 🛰️ STEP 1: Oturum açmış kullanıcının ID'sini doğrula
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await api.get("/researchers/me/");
        setMyId(res.data.researcher_id);
      } catch (err) {
        console.error("Auth check failed:", err);
      } finally {
        setCheckingAuth(false);
      }
    };
    fetchMe();
  }, []);

  // 🛡️ MÜHÜR: Kullanıcı bu projenin yöneticisi mi?
  const isPI = myId === project.pi;

  const updatePhase = async (newPhase: string) => {
    // Sadece PI olanlar faz değişikliği yapabilir
    if (!isPI) return;

    try {
      const uppercasePhase = newPhase.toUpperCase()
      await api.patch(`/projects/${project.project_id}/`, { 
        phase: uppercasePhase 
      })
      setPhase(uppercasePhase)
      onUpdate()
    } catch (err: any) { 
      console.error("Status could not be updated:", err.response?.data || err.message) 
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in">
      <div className="w-full max-w-2xl bg-[#0f172a] border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
        
        {/* Header Section */}
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <div className="space-y-1">
             <h3 className="text-2xl font-black text-white tracking-tight">{project.title}</h3>
             {!checkingAuth && !isPI && (
               <div className="flex items-center gap-2 text-indigo-400 font-black text-[9px] uppercase tracking-widest opacity-70">
                 <ShieldCheck size={12} /> Restricted Access (Read-Only)
               </div>
             )}
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
          
          {/* Project Summary */}
          <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-3">
             <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
               <Info size={12} className="text-indigo-400" /> Project Topic
             </div>
             <p className="text-sm text-slate-300 italic leading-relaxed">
               "{project.summary || 'Summary not provided.'}"
             </p>
          </div>

          {/* Date and Budget Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 bg-white/5 rounded-[2rem] space-y-1 border border-white/5">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Start Date</p>
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Calendar size={14} className="text-indigo-400" /> {project.created_at ? new Date(project.created_at).toLocaleDateString() : "27.12.2025"}
              </div>
            </div>
            <div className="p-5 bg-white/5 rounded-[2rem] space-y-1 border border-emerald-500/10">
              <p className="text-[9px] font-black text-emerald-500/50 uppercase tracking-widest">Estimated Budget</p>
              <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
                <Wallet size={14} /> ${project.estimated_budget || "0"}
              </div>
            </div>
          </div>

          {/* Institutional Support */}
          {fundingList.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Institutional Support</p>
              {fundingList.map((f: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <Building2 size={16} className="text-emerald-400" />
                    <span className="text-xs text-white font-bold">{f.agency_name || "Scholarship/Support"}</span>
                  </div>
                  <span className="text-xs text-emerald-400 font-black">${f.amount}</span>
                </div>
              ))}
            </div>
          )}

          {/* Project Phase Control */}
          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 text-center">Operational Status</p>
            <div className={`flex gap-2 p-1.5 bg-white/5 rounded-[2rem] ${!isPI ? 'opacity-50 pointer-events-none' : ''}`}>
              {['PLANNING', 'ACTIVE', 'COMPLETED'].map(p => (
                <button 
                  key={p}
                  onClick={() => updatePhase(p)}
                  className={`flex-1 py-3 rounded-[1.5rem] text-[10px] font-black uppercase transition-all ${
                    phase === p 
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            {!isPI && !checkingAuth && <p className="text-[8px] text-center font-bold text-slate-600 uppercase tracking-widest">Only project manager can change status</p>}
          </div>

          {/* Project Crew Section */}
          <div className="space-y-4">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Project Crew</p>
            <div className="space-y-2">
              {members.length > 0 ? members.map((m: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center p-4 bg-white/[0.02] border border-white/5 rounded-2xl group transition-all">
                   <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs font-black">
                        {m.full_name ? m.full_name[0] : '?'}
                      </div>
                      <span className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">{m.full_name}</span>
                   </div>
                   <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${m.role?.includes('Investigator') ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-500/10 text-slate-500'}`}>
                      {m.role?.includes('Investigator') ? 'MANAGER' : 'MEMBER'}
                   </div>
                </div>
              )) : (
                <div className="py-8 text-center bg-white/[0.01] border border-dashed border-white/5 rounded-2xl">
                  <p className="text-[10px] text-slate-600 font-bold uppercase tracking-tighter">No crew assigned yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* 🚀 ACTION: AI-Assisted Participant Button or Protected State */}
          {checkingAuth ? (
            <div className="w-full h-16 flex items-center justify-center opacity-40">
                <Loader2 className="animate-spin text-indigo-500" />
            </div>
          ) : isPI ? (
            <button 
              onClick={() => setShowSuggestions(true)}
              className="w-full h-16 rounded-[1.5rem] bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white border border-indigo-500/20 font-black tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 shadow-xl"
            >
              <UserPlus size={18} /> ADD PARTICIPANT (AI-ASSISTED)
            </button>
          ) : (
            <div className="w-full h-16 flex items-center justify-center bg-white/5 border border-white/10 rounded-[1.5rem] text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] opacity-60">
                <ShieldCheck size={18} className="mr-3 opacity-50" /> Read-Only Mode (Principal Investigator access required)
            </div>
          )}
        </div>
      </div>

      {/* Suggestions Modal */}
      {showSuggestions && (
        <ProjectSuggestionsModal 
          project={project} 
          onClose={() => setShowSuggestions(false)} 
          onAdded={onUpdate} 
        />
      )}
    </div>
  )
}