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
  // Birden fazla istek olduğunda hangi ID'nin işlendiğini takip etmek için
  const [processingId, setProcessingId] = useState<number | null>(null);

  const handleResponse = async (requestId: number, status: 'accepted' | 'rejected') => {
    setProcessingId(requestId);
    console.log(`📡 Sinyal fırlatılıyor: ID ${requestId}, Durum: ${status}`);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error("Otonom sistem kimlik hatası: Token bulunamadı!");
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
            ? "İş birliğini kabul ettim, uçağı piste çıkaralım!" 
            : "Şu an başka bir otonom görevdeyim."
        })
      });

      const data = await response.json();
      console.log("📥 Backend Yanıtı:", data);

      if (response.ok) {
        toast.success(status === 'accepted' ? "İş birliği mühürlendi!" : "Talep başarıyla reddedildi.");
        onRefresh(); // Dashboard'u otonom olarak tazele
      } else {
        // Backend'in gönderdiği hata mesajını (detail) ekrana mühürle
        toast.error(data.detail || "Backend bu otonom işlemi reddetti!");
      }
    } catch (error) {
      console.error("❌ Kritik İletişim Hatası:", error);
      toast.error("Bağlantı hatası: Sunucu kulesine ulaşılamıyor!");
    } finally {
      setProcessingId(null);
    }
  };

  // Sadece bekleyen (pending) ve geçerli olan istekleri mühürle
  const pendingRequests = requests?.filter(r => r.status === 'pending' || r.status === 'Beklemede') || [];

  if (pendingRequests.length === 0) return null;

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
      <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
        <Clock className="text-amber-500 animate-pulse" /> Gelen İş Birliği Talepleri
      </h3>
      
      <div className="space-y-4">
        {pendingRequests.map((req) => (
          <div key={req.request_id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition-all">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-black text-slate-800 tracking-tight">{req.sender_name}</span>
                <span className="text-[10px] bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-black uppercase">
                  {req.project_name}
                </span>
                <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-1 rounded-full font-bold">
                  ID: {req.request_id}
                </span>
              </div>
              <p className="text-sm text-slate-600 flex items-start gap-1 italic bg-white/50 p-2 rounded-xl">
                <MessageSquare size={16} className="text-slate-400 mt-0.5 shrink-0" /> 
                "{req.message || "Mesaj bırakılmamış."}"
              </p>
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              <Button 
                onClick={() => handleResponse(req.request_id, 'accepted')}
                disabled={processingId !== null}
                className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 text-white gap-2 rounded-xl h-12 px-6 font-bold active:scale-95 transition-all"
              >
                {processingId === req.request_id ? <Loader2 className="animate-spin" /> : <Check size={18} />}
                Kabul Et
              </Button>
              <Button 
                onClick={() => handleResponse(req.request_id, 'rejected')}
                disabled={processingId !== null}
                variant="outline"
                className="flex-1 md:flex-none border-red-100 text-red-600 hover:bg-red-50 gap-2 rounded-xl h-12 px-6 font-bold active:scale-95 transition-all"
              >
                {processingId === req.request_id ? <Loader2 className="animate-spin" /> : <X size={18} />}
                Reddet
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default IncomingRequests;