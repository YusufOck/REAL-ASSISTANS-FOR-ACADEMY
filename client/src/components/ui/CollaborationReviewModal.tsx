// src/components/ui/CollaborationReviewModal.tsx
import { useState } from "react"
import { Loader2, User, X, Check, XCircle, MessageSquare, Info, ShieldCheck, AlertCircle } from "lucide-react"
import { Button } from "./button"

export default function CollaborationReviewModal({ request, onClose, onRespond }: any) {
  const [responseMsg, setResponseMsg] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // MANTIK: Orijinal bekleme durumu tespiti korunmuştur.
  const isPending = request.status === 'pending' || request.status === 'Beklemede';

  const handleAction = async (status: 'accepted' | 'rejected') => {
    setSubmitting(true)
    await onRespond(request.request_id, status, responseMsg)
    setSubmitting(false)
    onClose()
  }

  return (
    // MÜHÜR: Responsive padding ve arka plan
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-[#0f172a] border border-white/10 rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="p-5 md:p-7 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-2xl ${isPending ? 'bg-indigo-500/10' : 'bg-slate-500/10'}`}>
              {/* ÇÖZÜM: İkon boyutu artık Tailwind sınıflarıyla (w/h) yönetiliyor */}
              {isPending ? 
                <User className="w-4 h-4 md:w-5 md:h-5 text-indigo-400" /> : 
                <ShieldCheck className="w-4 h-4 md:w-5 md:h-5 text-slate-400" />
              }
            </div>
            <h3 className="font-black text-white tracking-tight uppercase text-[10px] md:text-xs flex items-center gap-2">
              {isPending ? "Researcher Review" : "Request Summary"}
            </h3>
          </div>
          {/* ÇÖZÜM: X ikonundaki md:size hatası giderildi */}
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-all active:scale-90">
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-5 md:p-8 space-y-5 md:space-y-6 max-h-[85vh] md:max-h-[75vh] overflow-y-auto custom-scrollbar">
          
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-2xl md:text-3xl font-black text-white tracking-tighter truncate">{request.sender_name}</p>
                <p className="text-[9px] md:text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">{request.sender_title || "Researcher"}</p>
              </div>
              
              {!isPending && (
                <div className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                  request.status === 'accepted' 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
                }`}>
                  {request.status === 'accepted' ? 'APPROVED' : 'REJECTED'}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2 p-3 bg-white/[0.03] border border-white/5 rounded-xl">
              <Info className="w-3 h-3 md:w-4 md:h-4 text-slate-500 shrink-0" />
              <p className="text-[11px] md:text-xs font-bold text-slate-300 truncate">
                Project: <span className="text-white">{request.project_name || "Not specified"}</span>
              </p>
            </div>

            <div className="p-4 md:p-6 bg-white/[0.02] border border-white/5 rounded-[1.5rem] md:rounded-[2rem] space-y-2">
               <p className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                 <User className="w-3 h-3 text-indigo-400" /> Researcher Biography
               </p>
               <p className="text-xs md:text-sm text-slate-300 leading-relaxed italic line-clamp-4 md:line-clamp-none">
                 "{request.sender_bio || "Biography not provided."}"
               </p>
            </div>
          </div>

          {isPending && (
            <div className="space-y-5">
              {request.request_message && (
                <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-[1.5rem] space-y-2">
                  <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                    <MessageSquare className="w-3 h-3 text-indigo-400" /> Researcher Note
                  </p>
                  <p className="text-xs md:text-sm text-slate-200 leading-relaxed italic">
                    "{request.request_message}"
                  </p>
                </div>
              )}

              <div className="space-y-3 pt-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <MessageSquare className="w-3 h-3 text-slate-500" /> Your Decision Note
                </p>
                <textarea 
                  className="w-full bg-white/[0.03] border border-white/10 rounded-[1.25rem] p-4 text-xs md:text-sm text-slate-100 placeholder:text-slate-600 focus:ring-2 ring-indigo-500/20 outline-none transition-all resize-none"
                  rows={3}
                  placeholder="Message to the researcher..."
                  value={responseMsg}
                  onChange={(e) => setResponseMsg(e.target.value)}
                />
              </div>
            </div>
          )}

          {!isPending && (
            <div className="space-y-4">
              <div className="p-5 bg-white/[0.02] rounded-[1.5rem] border border-white/5 space-y-4">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Submitted Message</p>
                  <p className="text-xs text-slate-300 italic">"{request.request_message || "No cover message."}"</p>
                </div>

                {request.rejection_note && (
                  <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl space-y-1">
                    <p className="text-[8px] font-black text-red-400 uppercase tracking-widest flex items-center gap-2">
                      <AlertCircle className="w-3 h-3 text-red-400" /> Rejection Reason
                    </p>
                    <p className="text-[11px] text-slate-200 font-semibold">{request.rejection_note}</p>
                  </div>
                )}
                
                <div className="pt-3 flex items-center gap-2 text-[8px] font-black text-slate-500 uppercase tracking-widest border-t border-white/5">
                  <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
                  System Record: {request.created_at}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ACTIONS */}
        {isPending && (
          <div className="p-4 md:p-8 bg-white/[0.01] border-t border-white/5 flex gap-3 md:gap-5">
            <Button 
              onClick={() => handleAction('rejected')}
              disabled={submitting}
              className="flex-1 h-12 md:h-16 rounded-xl md:rounded-[1.5rem] bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 font-black text-[10px] md:text-xs tracking-widest transition-all active:scale-95"
            >
              {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : <><XCircle className="mr-1 md:mr-2 w-4 h-4 md:w-5 md:h-5" /> REJECT</>}
            </Button>
            <Button 
              onClick={() => handleAction('accepted')}
              disabled={submitting}
              className="flex-1 h-12 md:h-16 rounded-xl md:rounded-[1.5rem] bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 font-black text-[10px] md:text-xs tracking-widest transition-all active:scale-95"
            >
              {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : <><Check className="mr-1 md:mr-2 w-4 h-4 md:w-5 md:h-5" /> ACCEPT</>}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}