import { useState } from "react"
import { X, Sparkles, Zap, DollarSign, Loader2} from "lucide-react"
import { api } from "@/lib/api" // 🛰️ SEAL: Bug fixed
import { Button } from "./button"

export default function CreateProjectModal({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ title: "", summary: "", requirements: "", estimated_budget: "" })

  // handleCreate function inside CreateProjectModal.tsx:
  // handleCreate function inside CreateProjectModal.tsx
const handleCreate = async () => {
  if(!form.title) return;
  setLoading(true);
  try {
    // 🛡️ FIX: Remove the leading "/api" part.
    // Because the baseURL in api.ts already provides it.
    await api.post("/projects/", form); 
    
    onClose();
  } catch (err: any) { 
    // Log the backend error in detail (if an HTML page returns, it's a 404)
    console.error("Backend Error:", err.response?.data || err.message); 
  } finally {
    setLoading(false);
  }
}

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in">
      <div className="w-full max-w-xl bg-[#0f172a] border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 rounded-2xl text-indigo-400"><Sparkles size={20} /></div>
            <h3 className="font-black text-white uppercase text-xs tracking-[0.2em]">New Project Architecture</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-all"><X size={24} /></button>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-4">
            <input 
              onChange={e => setForm({...form, title: e.target.value})}
              className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-indigo-500/50 transition-all font-bold placeholder:text-slate-600" 
              placeholder="Project Name (e.g., Quantum AI Lab)" 
            />
            <textarea 
              onChange={e => setForm({...form, summary: e.target.value})}
              className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-5 text-white h-24 resize-none outline-none focus:border-indigo-500/50 text-sm placeholder:text-slate-600" 
              placeholder="Project Topic (Summary)..." 
            />
            <textarea 
              onChange={e => setForm({...form, requirements: e.target.value})}
              className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-5 text-white h-24 resize-none outline-none focus:border-indigo-500/50 text-sm placeholder:text-slate-600" 
              placeholder="Technical Requirements (AI will analyze this section for matching)..." 
            />
            <div className="relative">
              <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="number"
                onChange={e => setForm({...form, estimated_budget: e.target.value})}
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-5 pl-12 text-white outline-none focus:border-indigo-500/50 font-bold" 
                placeholder="Estimated Budget ($)" 
              />
            </div>
          </div>

          <Button 
            onClick={handleCreate}
            disabled={loading}
            className="w-full h-16 rounded-[1.5rem] bg-indigo-500 hover:bg-indigo-600 text-white font-black tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-500/20"
          >
            {loading ? <Loader2 className="animate-spin" /> : <><Zap size={18} /> START OPERATION</>}
          </Button>
        </div>
      </div>
    </div>
  )
}
