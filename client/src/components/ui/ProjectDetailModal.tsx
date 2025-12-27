import { useState } from "react"
import { X, Calendar, Wallet, UserPlus, Info, Building2 } from "lucide-react"
import ProjectSuggestionsModal from "./ProjectSuggestionsModal"
import { api } from "@/lib/api"

export default function ProjectDetailModal({ project, onClose, onUpdate }: any) {
  // 🛡️ KRİTİK: Django ChoiceField BÜYÜK HARF bekler. 
  // State başlangıcını backend'den gelen veriyle senkronize ediyoruz.
  const [phase, setPhase] = useState(project.phase?.toUpperCase() || 'PLANNING')
  const [showSuggestions, setShowSuggestions] = useState(false)

  // 🛰️ STRATEJİ: Serializer'dan gelen nested verileri kullanıyoruz.
  // Mürettebat listesi "members" anahtarı altında paketlenmiş olarak gelir.
  const members = project.members || [] 
  const fundingList = project.funding || []

  const updatePhase = async (newPhase: string) => {
    try {
      const uppercasePhase = newPhase.toUpperCase()
      
      // Backend'deki search_vector hatasını çözdüğün sürece bu PATCH sorunsuz çalışacaktır.
      await api.patch(`/projects/${project.project_id}/`, { 
        phase: uppercasePhase 
      })
      
      setPhase(uppercasePhase)
      onUpdate() // Ana sayfadaki proje kartlarını tazeler
    } catch (err: any) { 
      console.error("Statü güncellenemedi:", err.response?.data || err.message) 
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in">
      <div className="w-full max-w-2xl bg-[#0f172a] border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
        
        {/* Başlık Bölümü */}
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <h3 className="text-2xl font-black text-white tracking-tight">{project.title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
          
          {/* Proje Özeti */}
          <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-3">
             <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
               <Info size={12} className="text-indigo-400" /> Proje Konusu
             </div>
             <p className="text-sm text-slate-300 italic leading-relaxed">
               "{project.summary || 'Özet belirtilmemiş.'}"
             </p>
          </div>

          {/* Tarih ve Bütçe Bilgileri */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 bg-white/5 rounded-[2rem] space-y-1 border border-white/5">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Başlangıç Tarihi</p>
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Calendar size={14} className="text-indigo-400" /> {project.created_at ? new Date(project.created_at).toLocaleDateString() : "27.12.2025"}
              </div>
            </div>
            <div className="p-5 bg-white/5 rounded-[2rem] space-y-1 border border-emerald-500/10">
              <p className="text-[9px] font-black text-emerald-500/50 uppercase tracking-widest">Tahmini Bütçe</p>
              <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
                <Wallet size={14} /> ${project.estimated_budget || "0"}
              </div>
            </div>
          </div>

          {/* Finansal Destekler (Varsa) */}
          {fundingList.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Kurumsal Destek</p>
              {fundingList.map((f: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <Building2 size={16} className="text-emerald-400" />
                    <span className="text-xs text-white font-bold">{f.agency_name || "Burs/Destek"}</span>
                  </div>
                  <span className="text-xs text-emerald-400 font-black">${f.amount}</span>
                </div>
              ))}
            </div>
          )}

          {/* Proje Aşaması (Phase) Kontrolü */}
          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 text-center">Operasyonel Durum</p>
            <div className="flex gap-2 p-1.5 bg-white/5 rounded-[2rem]">
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
          </div>

          {/* Proje Mürettebatı Bölümü */}
          <div className="space-y-4">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Proje Mürettebatı</p>
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
                      {m.role?.includes('Investigator') ? 'YÖNETİCİ' : 'ÜYE'}
                   </div>
                </div>
              )) : (
                <div className="py-8 text-center bg-white/[0.01] border border-dashed border-white/5 rounded-2xl">
                  <p className="text-[10px] text-slate-600 font-bold uppercase tracking-tighter">Henüz mürettebat atanmadı.</p>
                </div>
              )}
            </div>
          </div>

          {/* AI Destekli Katılımcı Butonu */}
          <button 
            onClick={() => setShowSuggestions(true)}
            className="w-full h-16 rounded-[1.5rem] bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white border border-indigo-500/20 font-black tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 shadow-xl"
          >
            <UserPlus size={18} /> KATILIMCI EKLE (AI DESTEKLİ)
          </button>
        </div>
      </div>

      {/* Öneri Modalı */}
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