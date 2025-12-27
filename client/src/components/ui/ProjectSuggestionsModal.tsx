import { useState, useEffect } from "react"
import { X, Sparkles, UserSearch, BrainCircuit } from "lucide-react" 
import { useNavigate } from "react-router-dom" 
import { api } from "@/lib/api"

export default function ProjectSuggestionsModal({ project, onClose }: any) {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const fetchSuggestions = async () => {
    setLoading(true)
    try {
      // 🛰️ VERİ TRANSFERİ: Backend'deki AI eşleştirme algoritmasını tetikler
      const res = await api.get(`/projects/${project.project_id}/suggestions/`)
      setSuggestions(res.data)
    } catch (err) { 
      console.error("Öneriler çekilemedi", err) 
    }
    setLoading(false)
  }

  useEffect(() => { 
    // 🛡️ OTONOM KONTROL: image_4b4338.png'deki sonsuz döngüyü engellemek için
    // Bağımlılık dizisine sadece ID eklendi.
    if (project?.project_id) {
      fetchSuggestions(); 
    }
  }, [project.project_id]); 

  // 🚀 NAVİGASYON: Modalı kapatır ve araştırmacı detayına ışınlar
  const handleViewProfile = (rid: number) => {
    onClose() 
    navigate(`/researcher/${rid}`) 
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-md bg-[#0f172a] border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-indigo-500/5">
          <div className="flex items-center gap-2">
            <BrainCircuit size={18} className="text-indigo-400" />
            <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Project AI Matching</h4>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Analiz Odağı */}
          <div className="p-4 bg-white/5 border border-white/5 rounded-2xl text-center">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">Analiz Odağı</p>
            <p className="text-xs text-indigo-300 font-bold italic">"{project.title}"</p>
          </div>

          {/* Liste Alanı */}
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
            {loading ? (
              <div className="py-20 flex flex-col items-center gap-3">
                <Sparkles className="animate-spin text-indigo-500" />
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Algoritma Analiz Ediyor...</p>
              </div>
            ) : suggestions.length > 0 ? (
              suggestions.map((s: any) => (
                <div key={s.researcher_id} className="p-5 bg-white/[0.03] border border-white/5 rounded-[2rem] hover:border-indigo-500/30 transition-all flex justify-between items-center group">
                  <div className="space-y-1">
                    <p className="font-black text-white text-sm tracking-tight">{s.full_name}</p>
                    <div className="flex items-center gap-2">
                      <div className="px-2 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-black text-indigo-400 uppercase">
                        %{s.score || s.match_score} Uyum
                      </div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                        {s.department_name || "Mühendislik"}
                      </span>
                    </div>
                  </div>

                  {/* 🛡️ AKSİYON: Profili İncele Butonu */}
                  <button 
                    onClick={() => handleViewProfile(s.researcher_id)}
                    className="h-10 w-10 rounded-xl bg-white/5 hover:bg-indigo-500 text-slate-400 hover:text-white flex items-center justify-center transition-all group-hover:scale-110 shadow-lg"
                    title="Profili İncele"
                  >
                    <UserSearch size={18} />
                  </button>
                </div>
              ))
            ) : (
              <div className="py-10 text-center">
                <p className="text-[10px] text-slate-500 font-black uppercase">Uygun aday bulunamadı.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}