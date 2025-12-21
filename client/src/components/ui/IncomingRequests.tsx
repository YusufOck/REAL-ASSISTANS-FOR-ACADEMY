// src/components/IncomingRequests.tsx

import { Check, X, MessageSquare, Clock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface IncomingRequestsProps {
  requests: any[];
  onRefresh: () => void; // İşlem sonrası listeyi yenilemek için
}

const IncomingRequests: React.FC<IncomingRequestsProps> = ({ requests, onRefresh }) => {
  
  const handleResponse = async (requestId: number, status: 'accepted' | 'rejected') => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`https://real-assistans-for-academy-cbun.onrender.com/api/researchers/respond-request/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        // image_a2b204'teki beklentiye göre mühürlendi
        body: JSON.stringify({
          request_id: requestId,
          status: status,
          response_message: status === 'accepted' ? "İş birliğini kabul ettim, hadi başlayalım!" : "Şu an uygun değilim."
        })
      });

      if (response.ok) {
        toast.success(status === 'accepted' ? "İş birliği mühürlendi!" : "Talep reddedildi.");
        onRefresh(); // Dashboard'u otonom olarak tazele
      }
    } catch (error) {
      toast.error("İşlem sırasında bir hata oluştu.");
    }
  };

  // Sadece bekleyen istekleri gösteriyoruz
  const pendingRequests = requests?.filter(r => r.status === 'pending') || [];

  if (pendingRequests.length === 0) return null;

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm mb-8">
      <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
        <Clock className="text-amber-500" /> Gelen İş Birliği Talepleri
      </h3>
      
      <div className="space-y-4">
        {pendingRequests.map((req) => (
          <div key={req.request_id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-slate-800">{req.sender_name}</span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                  {req.project_name}
                </span>
              </div>
              <p className="text-sm text-slate-600 flex items-center gap-1 italic">
                <MessageSquare size={14} /> "{req.message}"
              </p>
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              <Button 
                onClick={() => handleResponse(req.request_id, 'accepted')}
                className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
              >
                <Check size={16} /> Kabul Et
              </Button>
              <Button 
                onClick={() => handleResponse(req.request_id, 'rejected')}
                variant="outline"
                className="flex-1 md:flex-none border-red-200 text-red-600 hover:bg-red-50 gap-1"
              >
                <X size={16} /> Reddet
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default IncomingRequests;