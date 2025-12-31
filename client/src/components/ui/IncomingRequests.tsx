// src/components/IncomingRequests.tsx

import { useState } from 'react';
import { Check, X, MessageSquare, Clock, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface IncomingRequestsProps {
  requests: any[];
  onRefresh: () => void;
}

const IncomingRequests: React.FC<IncomingRequestsProps> = ({ requests, onRefresh }) => {
  const [processingId, setProcessingId] = useState<number | null>(null);

  // 🛡️ MANTIK KORUNDU: handleResponse logic
  const handleResponse = async (requestId: number, status: 'accepted' | 'rejected') => {
    setProcessingId(requestId);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error("Authentication error: Token not found!");
        return;
      }

      const response = await fetch(`https://real-assistans-for-academy-cbun.onrender.com/api/researchers/respond-request/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          request_id: requestId,
          status: status,
          response_message: status === 'accepted' 
            ? "I accepted the collaboration, let's roll the plane to the runway!" 
            : "I'm currently on another autonomous mission."
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(status === 'accepted' ? "Collaboration sealed!" : "Rejected.");
        onRefresh(); 
      } else {
        toast.error(data.detail || "The backend rejected this operation!");
      }
    } catch (error) {
      toast.error("Connection error: Unable to reach the server!");
    } finally {
      setProcessingId(null);
    }
  };

  const pendingRequests = requests?.filter(r => r.status === 'pending' || r.status === 'Beklemede') || [];

  if (pendingRequests.length === 0) return null;

  return (
    // 🚀 MÜHÜR: Tasarım Dashboard temasına (bg-white/[0.04]) uyumlu hale getirildi
    <div className="bg-white/[0.04] backdrop-blur-xl rounded-[2rem] p-5 md:p-8 border border-white/10 shadow-2xl mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
      <h3 className="text-lg md:text-xl font-black text-white mb-6 flex items-center gap-3 uppercase italic tracking-tight">
        {/* ÇÖZÜM: İkon boyutu Tailwind sınıfıyla yönetiliyor */}
        <Clock className="text-indigo-400 animate-pulse w-5 h-5 md:w-6 md:h-6" /> 
        Incoming <span className="text-indigo-400">Collaboration</span> Requests
      </h3>
      
      <div className="space-y-4">
        {pendingRequests.map((req) => (
          <div key={req.request_id} className="p-4 md:p-5 bg-white/[0.03] rounded-2xl border border-white/5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 hover:bg-white/[0.05] transition-all">
            <div className="flex-1 min-w-0 w-full">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="font-black text-white tracking-tight text-sm md:text-base uppercase">{req.sender_name}</span>
                <div className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[8px] md:text-[9px] font-black text-indigo-300 uppercase tracking-widest truncate max-w-[150px] md:max-w-none">
                  {req.project_name}
                </div>
                <span className="text-[8px] md:text-[9px] bg-white/5 text-slate-500 px-2 py-1 rounded-lg font-bold border border-white/5">
                  ID: {req.request_id}
                </span>
              </div>
              <div className="text-xs md:text-sm text-slate-400 flex items-start gap-2 italic bg-black/20 p-3 rounded-xl border border-white/5">
                <MessageSquare className="w-3.5 h-3.5 md:w-4 md:h-4 text-indigo-400/50 mt-0.5 shrink-0" /> 
                <span className="leading-relaxed">"{req.message || "No technical brief provided."}"</span>
              </div>
            </div>

            {/* 🚀 MÜHÜR: Butonlar mobilde tam genişlik (w-full), md sonrası yan yana */}
            <div className="flex gap-3 w-full lg:w-auto shrink-0">
              <Button 
                onClick={() => handleResponse(req.request_id, 'accepted')}
                disabled={processingId !== null}
                className="flex-1 lg:flex-none bg-emerald-500 hover:bg-emerald-600 text-white gap-2 rounded-xl h-11 md:h-12 px-6 font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all shadow-lg shadow-emerald-500/10 border-b-4 border-emerald-700"
              >
                {processingId === req.request_id ? <Loader2 className="animate-spin w-4 h-4" /> : <Check className="w-4 h-4" />}
                Accept
              </Button>
              <Button 
                onClick={() => handleResponse(req.request_id, 'rejected')}
                disabled={processingId !== null}
                variant="ghost"
                className="flex-1 lg:flex-none bg-white/5 hover:bg-red-500/10 border border-white/10 text-red-400 hover:text-red-500 gap-2 rounded-xl h-11 md:h-12 px-6 font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all"
              >
                {processingId === req.request_id ? <Loader2 className="animate-spin w-4 h-4" /> : <X className="w-4 h-4" />}
                Reject
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default IncomingRequests;