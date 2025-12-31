// src/components/ui/ProjectDetailModal.tsx
import { useState, useEffect } from "react"
import { X, Calendar, Wallet, UserPlus, Info, Building2, ShieldCheck, Loader2 } from "lucide-react"
import ProjectSuggestionsModal from "./ProjectSuggestionsModal"
import { api } from "@/lib/api"

export default function ProjectDetailModal({ project, onClose, onUpdate }: any) {
  const [phase, setPhase] = useState(project.phase?.toUpperCase() || 'PLANNING')
  const [showSuggestions, setShowSuggestions] = useState(false)
  
  const [myId, setMyId] = useState<number | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

  const members = project.members || [] 
  const fundingList = project.funding || []

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

  const isPI = myId === project.pi;

  const updatePhase = async (newPhase: string) => {
    if (!isPI) return;
    try {
      const uppercasePhase = newPhase.toUpperCase()
      await api.patch(`/projects/${project.project_id}/`, { 
        phase: uppercasePhase 
      })
      setPhase(uppercasePhase)
      onUpdate()
    } catch (err: any) { 
      console.error("Status update failed:", err.response?.data || err.message) 
    }
  }

  return (
    // 🚀 MÜHÜR: Mobilde padding (p-2), masaüstünde (p-4)
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-2 md:p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="w-full max-w-2xl bg-[#0f172a] border border-white/10 rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header Section - Padding responsive yapıldı */}
        <div className="p-5 md:p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <div className="space-y-1 min-w-0 flex-1">
             <h3 className="text-xl md:text-2xl font-black text-white tracking-tight truncate">{project.title}</h3>
             {!checkingAuth && !isPI && (
               <div className="flex items-center gap-2 text-indigo-400 font-black text-[8px] md:text-[9px] uppercase tracking-widest opacity-70">
                 <ShieldCheck className="w-3 h-3 md:w-4 md:h-4" /> Restricted Access (Read-Only)
               </div>
             )}
          </div>
          {/* ÇÖZÜM: X ikonundaki boyut hatası giderildi */}
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-all ml-4 active:scale-90">
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>

        {/* CONTENT - Max-height ve kaydırma alanı mobilde optimize edildi */}
        <div className="p-5 md:p-8 space-y-6 md:space-y-8 max-h-[85vh] md:max-h-[80vh] overflow-y-auto custom-scrollbar">
          
          {/* Project Summary */}
          <div className="p-5 md:p-6 bg-white/[0.02] border border-white/5 rounded-2xl md:rounded-3xl space-y-3">
             <div className="flex items-center gap-2 text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">
               <Info className="w-3 h-3 md:w-4 md:h-4 text-indigo-400" /> Project Topic
             </div>
             <p className="text-xs md:text-sm text-slate-300 italic leading-relaxed">
               "{project.summary || 'Summary not provided.'}"
             </p>
          </div>

          {/* Date and Budget - 🚀 MÜHÜR: Mobilde alt alta, sm sonrası yan yana */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <div className="p-4 md:p-5 bg-white/5 rounded-[1.5rem] md:rounded-[2rem] space-y-1 border border-white/5">
              <p className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest">Start Date</p>
              <div className="flex items-center gap-2 text-white font-bold text-xs md:text-sm">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" /> {project.created_at ? new Date(project.created_at).toLocaleDateString() : "27.12.2025"}
              </div>
            </div>
            <div className="p-4 md:p-5 bg-white/5 rounded-[1.5rem] md:rounded-[2rem] space-y-1 border border-emerald-500/10">
              <p className="text-[8px] md:text-[9px] font-black text-emerald-500/50 uppercase tracking-widest">Estimated Budget</p>
              <div className="flex items-center gap-2 text-emerald-400 font-black text-xs md:text-sm">
                <Wallet className="w-3.5 h-3.5" /> ${project.estimated_budget || "0"}
              </div>
            </div>
          </div>

          {/* Institutional Support */}
          {fundingList.length > 0 && (
            <div className="space-y-3">
              <p className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Institutional Support</p>
              <div className="grid grid-cols-1 gap-2">
                {fundingList.map((f: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center p-3 md:p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl md:rounded-2xl">
                    <div className="flex items-center gap-3 min-w-0">
                      <Building2 className="w-4 h-4 md:w-5 md:h-5 text-emerald-400 shrink-0" />
                      <span className="text-[10px] md:text-xs text-white font-bold truncate">{f.agency_name || "Support"}</span>
                    </div>
                    <span className="text-[10px] md:text-xs text-emerald-400 font-black ml-2 shrink-0">${f.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Project Phase Control */}
          <div className="space-y-4">
            <p className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Operational Status</p>
            <div className={`flex flex-wrap sm:flex-nowrap gap-2 p-1.5 bg-white/5 rounded-2xl md:rounded-[2rem] ${!isPI ? 'opacity-50 pointer-events-none' : ''}`}>
              {['PLANNING', 'ACTIVE', 'COMPLETED'].map(p => (
                <button 
                  key={p}
                  onClick={() => updatePhase(p)}
                  className={`flex-1 min-w-[80px] py-2.5 md:py-3 rounded-xl md:rounded-[1.5rem] text-[8px] md:text-[10px] font-black uppercase transition-all ${
                    phase === p 
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            {!isPI && !checkingAuth && <p className="text-[7px] md:text-[8px] text-center font-bold text-slate-600 uppercase tracking-widest">Only PI can change system status</p>}
          </div>

          {/* Project Crew Section */}
          <div className="space-y-4">
            <p className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Project Crew</p>
            <div className="space-y-2">
              {members.length > 0 ? members.map((m: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center p-3 md:p-4 bg-white/[0.02] border border-white/5 rounded-xl md:rounded-2xl group transition-all">
                   <div className="flex items-center gap-3 min-w-0">
                      <div className="h-7 w-7 md:h-8 md:w-8 rounded-lg md:rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-[10px] md:text-xs font-black shrink-0">
                        {m.full_name ? m.full_name[0] : '?'}
                      </div>
                      <span className="text-xs md:text-sm font-bold text-white group-hover:text-indigo-300 transition-colors truncate">{m.full_name}</span>
                   </div>
                   <div className={`px-2 md:px-3 py-1 rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest shrink-0 ${m.role?.includes('Investigator') ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-500/10 text-slate-500'}`}>
                      {m.role?.includes('Investigator') ? 'PI' : 'MEMBER'}
                   </div>
                </div>
              )) : (
                <div className="py-6 md:py-8 text-center bg-white/[0.01] border border-dashed border-white/5 rounded-2xl">
                  <p className="text-[9px] md:text-[10px] text-slate-600 font-bold uppercase tracking-tighter">No crew assigned yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* ACTION BUTTON AREA */}
          <div className="pt-2">
            {checkingAuth ? (
              <div className="w-full h-14 md:h-16 flex items-center justify-center opacity-40">
                  <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin text-indigo-500" />
              </div>
            ) : isPI ? (
              <button 
                onClick={() => setShowSuggestions(true)}
                className="w-full h-14 md:h-16 rounded-[1.25rem] md:rounded-[1.5rem] bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white border border-indigo-500/20 font-black text-[10px] md:text-xs tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 shadow-xl"
              >
                <UserPlus className="w-4 h-4 md:w-5 md:h-5" /> ADD PARTICIPANT (AI)
              </button>
            ) : (
              <div className="w-full p-4 md:p-5 flex items-center justify-center bg-white/5 border border-white/10 rounded-[1.25rem] md:rounded-[1.5rem] text-slate-500 font-black text-[8px] md:text-[10px] uppercase tracking-[0.2em] opacity-60 text-center leading-relaxed">
                  <ShieldCheck className="w-4 h-4 md:w-5 md:h-5 mr-3 opacity-50 shrink-0" /> PI Access Required to Modify
              </div>
            )}
          </div>
        </div>
      </div>

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