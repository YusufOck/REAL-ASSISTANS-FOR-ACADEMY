// src/components/ui/CollaborationReviewModal.tsx
import { useState } from "react"
import { Loader2, User, X, Check, XCircle, Code, MessageSquare } from "lucide-react"
import { Button } from "./button"

export default function CollaborationReviewModal({ request, onClose, onRespond }: any) {
  const [responseMsg, setResponseMsg] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleAction = async (status: 'accepted' | 'rejected') => {
    setSubmitting(true)
    await onRespond(request.request_id, status, responseMsg)
    setSubmitting(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#0f172a] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* HEADER */}
        <div className="p-6 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-xl"><User size={20} className="text-indigo-400" /></div>
            <h3 className="font-black text-white">Araştırmacı İnceleme</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition"><X size={24} /></button>
        </div>

        {/* CONTENT */}
        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Kişi Bilgileri */}
          <div className="space-y-2">
            <p className="text-2xl font-black text-white">{request.sender_name}</p>
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">{request.sender_title || "Araştırmacı"}</p>
            <p className="text-sm text-slate-300 italic leading-relaxed">"{request.sender_bio || "Biyografi belirtilmemiş."}"</p>
          </div>

          {/* Yetenekler (Yüzdeleriyle) */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <p className="text-[10px] font-black uppercase tracking-tighter text-slate-500 flex items-center gap-2">
              <Code size={14} /> Uzmanlık Analizi
            </p>
            <div className="grid grid-cols-1 gap-3">
              {request.sender_skills && Object.entries(request.sender_skills).map(([skill, level]: any) => (
                <div key={skill} className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400">
                    <span>{skill}</span>
                    <span>%{level}</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500" style={{ width: `${level}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cevap Mesajı Alanı */}
          <div className="space-y-2 pt-4 border-t border-white/5">
            <p className="text-[10px] font-black uppercase tracking-tighter text-slate-500 flex items-center gap-2">
              <MessageSquare size={14} /> Yanıt Mesajınız
            </p>
            <textarea 
              className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-sm text-slate-100 placeholder:text-slate-600 focus:ring-1 focus:ring-indigo-500 outline-none transition"
              placeholder="Cevabınızı buraya yazın..."
              value={responseMsg}
              onChange={(e) => setResponseMsg(e.target.value)}
            />
          </div>
        </div>

        {/* ACTIONS */}
        <div className="p-6 bg-white/[0.01] border-t border-white/5 flex gap-4">
          <Button 
            onClick={() => handleAction('rejected')}
            disabled={submitting}
            className="flex-1 h-14 rounded-2xl bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 font-black transition-all"
          >
            {submitting ? <Loader2 className="animate-spin" /> : <><XCircle className="mr-2" /> REDDET</>}
          </Button>
          <Button 
            onClick={() => handleAction('accepted')}
            disabled={submitting}
            className="flex-1 h-14 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white border border-emerald-500/20 font-black transition-all"
          >
            {submitting ? <Loader2 className="animate-spin" /> : <><Check className="mr-2" /> KABUL ET</>}
          </Button>
        </div>
      </div>
    </div>
  )
}