// src/components/ui/CollaborationReviewModal.tsx
import { useState } from "react"
import { Loader2, User, X, Check, XCircle, MessageSquare, Info, ShieldCheck, AlertCircle } from "lucide-react"
import { Button } from "./button"

export default function CollaborationReviewModal({ request, onClose, onRespond }: any) {
  const [responseMsg, setResponseMsg] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // 🛰️ AUTONOMOUS MODE DETECTION: Is the request still pending?
  const isPending = request.status === 'pending' || request.status === 'Beklemede';

  const handleAction = async (status: 'accepted' | 'rejected') => {
    setSubmitting(true)
    await onRespond(request.request_id, status, responseMsg)
    setSubmitting(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-[#0f172a] border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* 🛡️ HEADER */}
        <div className="p-7 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-2xl ${isPending ? 'bg-indigo-500/10' : 'bg-slate-500/10'}`}>
              {isPending ? <User size={20} className="text-indigo-400" /> : <ShieldCheck size={20} className="text-slate-400" />}
            </div>
            <h3 className="font-black text-white tracking-tight uppercase text-xs flex items-center gap-2">
              {isPending ? "Researcher Review" : "Request Record Summary"}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-all hover:rotate-90"><X size={24} /></button>
        </div>

        {/* 🛰️ CONTENT */}
        <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          
          {/* Identity Information */}
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-3xl font-black text-white tracking-tighter">{request.sender_name}</p>
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">{request.sender_title || "Researcher"}</p>
              </div>
              
              {!isPending && (
                <div className={`px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${
                  request.status === 'accepted' 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
                }`}>
                  {request.status === 'accepted' ? 'APPROVED' : 'REJECTED'}
                </div>
              )}
            </div>
            
            {/* Project Information */}
            <div className="flex items-center gap-2 p-3 bg-white/[0.03] border border-white/5 rounded-2xl">
              <Info size={14} className="text-slate-500" />
              <p className="text-xs font-bold text-slate-300">Project: <span className="text-white">{request.project_name || "Not specified"}</span></p>
            </div>

            {/* 🚀 MÜHÜR: Biyografi Bölümü (Expertise Analysis yerine buraya mühürlendi) */}
            <div className="p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] space-y-2">
               <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                 <User size={12} className="text-indigo-400" /> Researcher Biography
               </p>
               <p className="text-sm text-slate-200 leading-relaxed italic">
                 "{request.sender_bio || "Biography not provided."}"
               </p>
            </div>
          </div>

          {/* 🚀 MODE 1: PENDING REQUEST (Action Mode) */}
          {isPending && (
            <>
              {/* RESEARCHER'S INITIAL MESSAGE */}
              {request.request_message && (
                <div className="p-5 bg-indigo-500/5 border border-indigo-500/10 rounded-[2rem] space-y-2">
                  <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                    <MessageSquare size={12} /> Researcher Note
                  </p>
                  <p className="text-sm text-slate-200 leading-relaxed italic">
                    "{request.request_message}"
                  </p>
                </div>
              )}

              {/* 🛡️ Expertise Analysis Bloğu İstek Üzerine Tasfiye Edildi */}

              {/* Response Message Field */}
              <div className="space-y-3 pt-4 border-t border-white/5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <MessageSquare size={14} /> Your Decision Note (Response)
                </p>
                <textarea 
                  className="w-full bg-white/[0.03] border border-white/10 rounded-[1.5rem] p-5 text-sm text-slate-100 placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
                  rows={4}
                  placeholder="Write the message to be sent to the researcher here..."
                  value={responseMsg}
                  onChange={(e) => setResponseMsg(e.target.value)}
                />
              </div>
            </>
          )}

          {/* 🛰️ MODE 2: FINALIZED REQUEST (Summary Mode) */}
          {!isPending && (
            <div className="space-y-4 pt-4 border-t border-white/5">
              <div className="p-6 bg-white/[0.02] rounded-[2rem] border border-white/5 space-y-5">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Submitted Message</p>
                  <p className="text-sm text-slate-300 leading-relaxed italic">
                    "{request.request_message || "No cover message was provided for this request."}"
                  </p>
                </div>

                {request.rejection_note && (
                  <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl space-y-2">
                    <p className="text-[9px] font-black text-red-400 uppercase tracking-widest flex items-center gap-2">
                      <AlertCircle size={12} /> Rejection Reason
                    </p>
                    <p className="text-xs text-slate-200 leading-relaxed font-semibold">
                      {request.rejection_note}
                    </p>
                  </div>
                )}
                
                <div className="pt-4 flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-widest border-t border-white/5">
                  <Loader2 size={12} className="text-indigo-500" />
                  System Record Date: {request.created_at}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 🛠️ ACTIONS */}
        {isPending && (
          <div className="p-8 bg-white/[0.01] border-t border-white/5 flex gap-5">
            <Button 
              onClick={() => handleAction('rejected')}
              disabled={submitting}
              className="flex-1 h-16 rounded-[1.5rem] bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 font-black tracking-widest transition-all duration-300"
            >
              {submitting ? <Loader2 className="animate-spin" /> : <><XCircle className="mr-2" size={18} /> REJECT</>}
            </Button>
            <Button 
              onClick={() => handleAction('accepted')}
              disabled={submitting}
              className="flex-1 h-16 rounded-[1.5rem] bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 font-black tracking-widest transition-all duration-300"
            >
              {submitting ? <Loader2 className="animate-spin" /> : <><Check className="mr-2" size={18} /> ACCEPT</>}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}