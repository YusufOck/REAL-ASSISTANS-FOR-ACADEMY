import { useState } from "react"
import { X, Sparkles, Zap, DollarSign, Loader2} from "lucide-react"
import { api } from "@/lib/api"
import { Button } from "./button"

export default function CreateProjectModal({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ title: "", summary: "", requirements: "", estimated_budget: "" })

  // 🛡️ MANTIK KORUNDU: handleCreate fonksiyonu
  const handleCreate = async () => {
    if(!form.title) return;
    setLoading(true);
    try {
      await api.post("/projects/", form); 
      onClose();
    } catch (err: any) { 
      console.error("Backend Error:", err.response?.data || err.message); 
    } finally {
      setLoading(false);
    }
  }

  return (
    // 🚀 MÜHÜR: Mobilde padding daraltıldı (p-2 md:p-4)
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-2 md:p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="w-full max-w-xl bg-[#0f172a] border border-white/10 rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[95vh] flex flex-col">
        
        {/* HEADER - Padding responsive yapıldı */}
        <div className="p-5 md:p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 md:p-2.5 bg-indigo-500/20 rounded-xl md:rounded-2xl text-indigo-400">
              {/* ÇÖZÜM: İkon boyutu Tailwind sınıfıyla yönetiliyor */}
              <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            <h3 className="font-black text-white uppercase text-[10px] md:text-xs tracking-[0.2em]">New Project Architecture</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-all active:scale-90">
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>

        {/* FORM CONTENT - Kaydırma desteği eklendi */}
        <div className="p-5 md:p-8 space-y-5 md:space-y-6 overflow-y-auto custom-scrollbar flex-1">
          <div className="space-y-4">
            <input 
              onChange={e => setForm({...form, title: e.target.value})}
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-5 text-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all font-bold placeholder:text-slate-600 text-sm md:text-base" 
              placeholder="Project Name (e.g., Quantum AI Lab)" 
            />
            <textarea 
              onChange={e => setForm({...form, summary: e.target.value})}
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-5 text-white h-24 resize-none outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 text-xs md:text-sm placeholder:text-slate-600" 
              placeholder="Project Topic (Summary)..." 
            />
            <textarea 
              onChange={e => setForm({...form, requirements: e.target.value})}
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-5 text-white h-24 resize-none outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 text-xs md:text-sm placeholder:text-slate-600" 
              placeholder="Technical Requirements (AI analysis source)..." 
            />
            <div className="relative">
              <DollarSign className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 md:w-5 md:h-5" />
              <input 
                type="number"
                onChange={e => setForm({...form, estimated_budget: e.target.value})}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-5 pl-10 md:pl-12 text-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 font-bold text-sm md:text-base" 
                placeholder="Estimated Budget ($)" 
              />
            </div>
          </div>

          <Button 
            onClick={handleCreate}
            disabled={loading}
            className="w-full h-14 md:h-16 rounded-xl md:rounded-[1.5rem] bg-indigo-500 hover:bg-indigo-600 text-white font-black tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-500/20 uppercase text-xs md:text-sm border-b-4 border-indigo-700"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Zap className="w-4 h-4 md:w-5 md:h-5" /> START OPERATION</>}
          </Button>
        </div>
      </div>
    </div>
  )
}