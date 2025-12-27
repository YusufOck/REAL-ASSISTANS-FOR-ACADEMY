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
  // To track which ID is being processed when there are multiple requests
  const [processingId, setProcessingId] = useState<number | null>(null);

  const handleResponse = async (requestId: number, status: 'accepted' | 'rejected') => {
    setProcessingId(requestId);
    console.log(`📡 Signal launched: ID ${requestId}, Status: ${status}`);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error("Autonomous system authentication error: Token not found!");
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
      console.log("📥 Backend Response:", data);

      if (response.ok) {
        toast.success(status === 'accepted' ? "Collaboration sealed!" : "Request successfully rejected.");
        onRefresh(); // Refresh the dashboard autonomously
      } else {
        // Seal the error message (detail) sent by the backend to the screen
        toast.error(data.detail || "The backend rejected this autonomous operation!");
      }
    } catch (error) {
      console.error("❌ Critical Communication Error:", error);
      toast.error("Connection error: Unable to reach the server tower!");
    } finally {
      setProcessingId(null);
    }
  };

  // Seal only pending and valid requests
  const pendingRequests = requests?.filter(r => r.status === 'pending' || r.status === 'Beklemede') || [];

  if (pendingRequests.length === 0) return null;

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
      <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
        <Clock className="text-amber-500 animate-pulse" /> Incoming Collaboration Requests
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
                "{req.message || "No message left."}"
              </p>
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              <Button 
                onClick={() => handleResponse(req.request_id, 'accepted')}
                disabled={processingId !== null}
                className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 text-white gap-2 rounded-xl h-12 px-6 font-bold active:scale-95 transition-all"
              >
                {processingId === req.request_id ? <Loader2 className="animate-spin" /> : <Check size={18} />}
                Accept
              </Button>
              <Button 
                onClick={() => handleResponse(req.request_id, 'rejected')}
                disabled={processingId !== null}
                variant="outline"
                className="flex-1 md:flex-none border-red-100 text-red-600 hover:bg-red-50 gap-2 rounded-xl h-12 px-6 font-bold active:scale-95 transition-all"
              >
                {processingId === req.request_id ? <Loader2 className="animate-spin" /> : <X size={18} />}
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
