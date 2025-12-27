import { useState, useEffect } from "react"
import { X, Calendar, Wallet, UserPlus, Building2, Info } from "lucide-react"
import ProjectSuggestionsModal from "./ProjectSuggestionsModal"
import { api } from "@/lib/api" // 🛰️ MÜHÜR: Hata giderildi

export default function ProjectDetailModal({ project, onClose, onUpdate }: any) {
  const [members, setMembers] = useState([])
  const [funding, setFunding] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [phase, setPhase] = useState(project.phase || 'planning')
  const [,setLoading] = useState(true)

  const fetchDetails = async () => {
    setLoading(true)
    try {
      const [membersRes, fundingRes] = await Promise.all([
        api.get(`/projects/${project.project_id}/researchers/`),
        api.get(`/projects/${project.project_id}/funding/`)
      ])
      setMembers(membersRes.data)
      setFunding(fundingRes.data)
    } catch (err) { console.error("Veri çekilemedi", err) }
    setLoading(false)
  }

  const updatePhase = async (newPhase: string) => {
    try {
      await api.patch(`/projects/${project.project_id}/`, { phase: newPhase })
      setPhase(newPhase)
      onUpdate()
    } catch (err) { console.error(err) }
  }

  useEffect(() => { fetchDetails() }, [project])

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in">
      <div className="w-full max-w-2xl bg-[#0f172a] border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
        
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <h3 className="text-2xl font-black text-white tracking-tight">{project.title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-all"><X size={24} /></button>
        </div>

        <div className="p-8 space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* Konu Özeti */}
          <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-3">
             <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
               <Info size={12} className="text-indigo-400" /> Proje Konusu
             </div>
             <p className="text-sm text-slate-300 italic leading-relaxed">"{project.summary || 'Özet belirtilmemiş.'}"</p>
          </div>

          {/* Tarih ve Bütçe */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 bg-white/5 rounded-[2rem] space-y-1 border border-white/5">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Başlangıç Tarihi</p>
              <div className="flex items-center gap-2 text-white font-bold text-sm"><Calendar size={14} className="text-indigo-400" /> {project.start_date || "27.12.2025"}</div>
            </div>
            <div className="p-5 bg-white/5 rounded-[2rem] space-y-1 border border-emerald-500/10">
              <p className="text-[9px] font-black text-emerald-500/50 uppercase tracking-widest">Tahmini Bütçe</p>
              <div className="flex items-center gap-2 text-emerald-400 font-black text-sm"><Wallet size={14} /> ${project.estimated_budget || "0"}</div>
            </div>
          </div>

          {/* Kurumsal Destek */}
          {funding.length > 0 && (
            <div className="p-5 bg-emerald-500/5 border border-emerald-500/10 rounded-[2rem] space-y-3">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Finansal Destekler</p>
              {funding.map((f: any) => (
                <div key={f.grant_id} className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-emerald-400" />
                    <span className="text-xs text-white font-bold">{f.funding_agency_name || "TÜBİTAK"}</span>
                  </div>
                  <span className="text-xs text-emerald-400 font-black">${f.amount}</span>
                </div>
              ))}
            </div>
          )}

          {/* Proje Aşaması (Phase) */}
          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 text-center">Proje Aşaması</p>
            <div className="flex gap-2 p-1.5 bg-white/5 rounded-[2rem]">
              {['planning', 'active', 'completed'].map(p => (
                <button 
                  key={p}
                  onClick={() => updatePhase(p)}
                  className={`flex-1 py-3 rounded-[1.5rem] text-[10px] font-black uppercase transition-all ${phase === p ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Mürettebat */}
          <div className="space-y-4">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Proje Mürettebatı</p>
            <div className="space-y-2">
              {members.map((m: any) => (
                <div key={m.researcher_id} className="flex justify-between items-center p-4 bg-white/[0.02] border border-white/5 rounded-2xl group transition-all">
                   <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs font-black">{m.full_name[0]}</div>
                      <span className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">{m.full_name}</span>
                   </div>
                   <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${m.role === 'Principal Investigator' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-500/10 text-slate-500'}`}>
                      {m.role === 'Principal Investigator' ? 'YÖNETİCİ' : 'ÜYE'}
                   </div>
                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={() => setShowSuggestions(true)}
            className="w-full h-16 rounded-[1.5rem] bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white border border-indigo-500/20 font-black tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 shadow-xl"
          >
            <UserPlus size={18} /> KATILIMCI EKLE (AI DESTEKLİ)
          </button>
        </div>
      </div>

      {showSuggestions && <ProjectSuggestionsModal project={project} onClose={() => setShowSuggestions(false)} onAdded={fetchDetails} />}
    </div>
  )
}