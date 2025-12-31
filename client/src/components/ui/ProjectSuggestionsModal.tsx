import { useState, useEffect } from "react"
import { X, Sparkles, UserSearch, BrainCircuit } from "lucide-react" 
import { useNavigate } from "react-router-dom" 
import { api } from "@/lib/api"

export default function ProjectSuggestionsModal({ project, onClose }: any) {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // 🛡️ MANTIK KORUNDU: AI Öneri Motoru Tetikleyici
  const fetchSuggestions = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/projects/${project.project_id}/suggestions/`)
      setSuggestions(res.data)
    } catch (err) { 
      console.error("Could not fetch suggestions", err) 
    }
    setLoading(false)
  }

  useEffect(() => { 
    if (project?.project_id) {
      fetchSuggestions(); 
    }
  }, [project.project_id]); 

  const handleViewProfile = (rid: number) => {
    onClose() 
    navigate(`/researcher/${rid}`) 
  }

  const filteredSuggestions = suggestions.filter((s: any) => 
    !project.members?.some((m: any) => m.researcher_id === s.researcher_id)
  );

  return (
    // 🚀 MÜHÜR: Responsive Padding
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 md:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-[#0f172a] border border-white/10 rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header - Padding Responsive yapıldı */}
        <div className="p-5 md:p-6 border-b border-white/5 flex justify-between items-center bg-indigo-500/5 shrink-0">
          <div className="flex items-center gap-2">
            {/* ÇÖZÜM: İkon boyutu Tailwind sınıfıyla yönetiliyor */}
            <BrainCircuit className="w-4 h-4 md:w-5 md:h-5 text-indigo-400" />
            <h4 className="text-[9px] md:text-[10px] font-black text-white uppercase tracking-[0.2em]">Project AI Matching</h4>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-all active:scale-90">
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>

        {/* Content Area - Kaydırma desteği eklendi */}
        <div className="p-5 md:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          <div className="p-4 bg-white/5 border border-white/5 rounded-2xl text-center">
            <p className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">Analysis Focus</p>
            <p className="text-[10px] md:text-xs text-indigo-300 font-bold italic line-clamp-1">"{project.title}"</p>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="py-16 md:py-20 flex flex-col items-center gap-3 opacity-50">
                <Sparkles className="animate-spin text-indigo-500 w-6 h-6" />
                <p className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">Algorithm Analyzing...</p>
              </div>
            ) : filteredSuggestions.length > 0 ? ( 
              filteredSuggestions.map((s: any) => ( 
                <div key={s.researcher_id} className="p-4 md:p-5 bg-white/[0.03] border border-white/5 rounded-2xl md:rounded-[2rem] hover:border-indigo-500/30 transition-all flex justify-between items-center group">
                  <div className="space-y-1 min-w-0 flex-1">
                    <p className="font-black text-white text-xs md:text-sm tracking-tight truncate">{s.full_name}</p>
                    <div className="flex items-center gap-2">
                      <div className="px-2 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[8px] md:text-[9px] font-black text-indigo-400 uppercase shrink-0">
                        %{s.score || s.match_score} Match
                      </div>
                      <span className="text-[9px] md:text-[10px] text-slate-500 font-bold uppercase tracking-tighter truncate">
                        {s.department_name || "Engineering"}
                      </span>
                    </div>
                  </div>

                  <button 
                    onClick={() => handleViewProfile(s.researcher_id)}
                    className="h-9 w-9 md:h-10 md:w-10 rounded-xl bg-white/5 hover:bg-indigo-500 text-slate-400 hover:text-white flex items-center justify-center transition-all group-hover:scale-110 shadow-lg shrink-0 ml-3"
                    title="View Profile"
                  >
                    <UserSearch className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </div>
              ))
            ) : (
              <div className="py-12 md:py-16 text-center">
                <p className="text-[9px] md:text-[10px] text-slate-500 font-black uppercase opacity-40 italic tracking-widest">No suitable candidate found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}