// src/pages/ResearcherDetail.tsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Brain, Code, FolderGit2, CheckCircle2, Send, UserPlus, Users } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ResearcherDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [researcher, setResearcher] = useState<any>(null);
  const [otherProjects, setOtherProjects] = useState<any[]>([]); // Karşı tarafın projeleri
  const [myProjects, setMyProjects] = useState<any[]>([]); // Senin projelerin (Davet için)
  const [loading, setLoading] = useState(true);

  // --- AKSİYON STATE'LERİ ---
  const [requestType, setRequestType] = useState<'join_request' | 'invite'>('join_request');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [requestMessage, setRequestMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('accessToken'); 
        const headers = { 'Authorization': `Bearer ${token}` };

        // 1. Karşıdaki Araştırmacının Profili (image_a2b204)
        const resProfile = await fetch(`https://real-assistans-for-academy-cbun.onrender.com/api/researchers/${id}/`, { headers });
        const profileData = await resProfile.json();

        // 2. Karşıdaki Araştırmacının Projeleri (image_a2b1cb)
        const resOtherProjects = await fetch(`https://real-assistans-for-academy-cbun.onrender.com/api/researchers/${id}/projects/`, { headers });
        const otherProjectsData = await resOtherProjects.json();

        // 3. Kendi Bilgilerin ve Projelerin (Davet sistemi için gerekli)
        const resMe = await fetch(`https://real-assistans-for-academy-cbun.onrender.com/api/researchers/me/`, { headers });
        const meData = await resMe.json();

        setResearcher(profileData);
        setOtherProjects(otherProjectsData);
        setMyProjects(meData.projects || []); // Me endpoint'inin projeleri döndüğünden emin olmalısın
      } catch (error) {
        toast.error("Veriler otonom olarak çekilemedi!");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchData();
  }, [id]);

  const handleSendRequest = async () => {
    if (!selectedProjectId) {
      toast.error(requestType === 'join_request' ? "Lütfen katılmak istediğiniz projeyi seçin!" : "Lütfen davet etmek istediğiniz projenizi seçin!");
      return;
    }

    setIsSending(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`https://real-assistans-for-academy-cbun.onrender.com/api/researchers/${id}/send-request/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          receiver_id: id,  
          project_id: selectedProjectId,
          message: requestMessage,
          request_type: requestType // join_request veya invite
        })
      });

      if (response.ok) {
        toast.success("İş birliği talebi otonom olarak fırlatıldı!");
        setRequestMessage("");
        setSelectedProjectId(null);
      } else {
        const errorData = await response.json();
        toast.error(errorData.detail || "İstek fırlatılamadı.");
      }
    } catch (error) {
      toast.error("Bağlantı hatası.");
    } finally {
      setIsSending(false);
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center flex-col gap-4">
      <Loader2 className="animate-spin text-blue-600" size={48} />
      <p className="text-slate-500 font-bold">Veri İstasyonu Bağlanıyor...</p>
    </div>
  );

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <Button variant="ghost" onClick={() => navigate(-1)} className="hover:bg-slate-100 transition-all">
        <ArrowLeft className="mr-2" /> Geri Dön
      </Button>

      {/* ARAŞTIRMACI ÖZETİ */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 ring-1 ring-gray-50">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-blue-50 rounded-2xl">
            <Brain className="text-blue-600" size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-900">{researcher?.full_name}</h1>
            <p className="text-blue-600 font-bold tracking-wide">{researcher?.title || "Araştırmacı"}</p>
          </div>
        </div>
        <p className="text-slate-600 italic text-lg">"{researcher?.bio}"</p>
      </div>

      {/* İSTEK TİPİ SEÇİCİ (KATILIM VS DAVET) */}
      <div className="flex flex-col md:flex-row gap-4 p-2 bg-slate-100 rounded-3xl border border-slate-200">
        <button 
          onClick={() => { setRequestType('join_request'); setSelectedProjectId(null); }}
          className={`flex-1 py-4 px-6 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
            requestType === 'join_request' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users size={20} /> Projesine Katılmak İstiyorum
        </button>
        <button 
          onClick={() => { setRequestType('invite'); setSelectedProjectId(null); }}
          className={`flex-1 py-4 px-6 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
            requestType === 'invite' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <UserPlus size={20} /> Projeme Davet Etmek İstiyorum
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* YETENEKLER */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Code className="text-indigo-500" /> Uzmanlık Alanları
          </h3>
          <div className="space-y-4">
            {researcher?.skills && Object.entries(researcher.skills).map(([skill, level]: any) => (
              <div key={skill} className="space-y-1">
                <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                  <span>{skill}</span>
                  <span>%{level}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${level}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PROJE LİSTESİ (SEÇİLEN TİPE GÖRE DEĞİŞİR) */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <FolderGit2 className={requestType === 'join_request' ? "text-emerald-500" : "text-indigo-500"} /> 
            {requestType === 'join_request' ? 'Katılabileceğin Projeleri' : 'Onu Davet Edeceğin Projelerin'}
          </h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {(requestType === 'join_request' ? otherProjects : myProjects).map((project: any) => (
              <div 
                key={project.project_id} 
                onClick={() => setSelectedProjectId(project.project_id)}
                className={`p-4 cursor-pointer transition-all rounded-2xl border-2 relative ${
                  selectedProjectId === project.project_id 
                  ? 'border-blue-600 bg-blue-50' 
                  : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                }`}
              >
                {selectedProjectId === project.project_id && (
                  <CheckCircle2 className="absolute top-3 right-3 text-blue-600" size={18} />
                )}
                <h4 className="font-bold text-slate-800 text-sm">{project.title}</h4>
              </div>
            ))}
            {(requestType === 'join_request' ? otherProjects : myProjects).length === 0 && (
              <p className="text-slate-400 italic text-sm text-center py-8">Liste boş.</p>
            )}
          </div>
        </div>
      </div>

      {/* NOT ALANI */}
      {selectedProjectId && (
        <div className="animate-in slide-in-from-bottom-4 duration-300">
          <textarea 
            className="w-full p-6 rounded-3xl border-2 border-slate-100 focus:border-blue-500 outline-none text-slate-700 min-h-[150px] shadow-inner bg-slate-50/50"
            placeholder={requestType === 'join_request' ? "Neden bu projeye katılmalısın?" : "Neden seninle çalışmalı?"}
            value={requestMessage}
            onChange={(e) => setRequestMessage(e.target.value)}
          />
        </div>
      )}

      <Button 
        onClick={handleSendRequest}
        disabled={!selectedProjectId || isSending}
        className={`w-full py-8 text-xl font-black rounded-3xl shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 ${
          selectedProjectId 
          ? (requestType === 'join_request' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-indigo-600 hover:bg-indigo-700') 
          : 'bg-slate-200 text-slate-400'
        } text-white`}
      >
        {isSending ? <Loader2 className="animate-spin" /> : <Send size={24} />}
        {requestType === 'join_request' ? 'KATILIM İSTEĞİ GÖNDER' : 'PROJEME DAVET ET'}
      </Button>
    </div>
  );
};

export default ResearcherDetail;