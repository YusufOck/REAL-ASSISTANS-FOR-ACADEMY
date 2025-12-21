// src/pages/ResearcherDetail.tsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Brain, Code, FolderGit2, CheckCircle2, Send } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ResearcherDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [researcher, setResearcher] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- AKSİYON STATE'LERİ ---
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [requestMessage, setRequestMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('accessToken'); 
        const headers = { 'Authorization': `Bearer ${token}` };

        const resProfile = await fetch(`https://real-assistans-for-academy-cbun.onrender.com/api/researchers/${id}/`, { headers });
        const profileData = await resProfile.json();

        const resProjects = await fetch(`https://real-assistans-for-academy-cbun.onrender.com/api/researchers/${id}/projects/`, { headers });
        const projectsData = await resProjects.json();

        setResearcher(profileData);
        setProjects(projectsData);
      } catch (error) {
        toast.error("Veriler otonom olarak çekilemedi!");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchData();
  }, [id]);

  // --- TEKLİF GÖNDERME FONKSİYONU ---
  const handleSendRequest = async () => {
    if (!selectedProjectId) {
      toast.error("Lütfen önce beraber çalışmak istediğiniz projeyi seçin!");
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
          request_type: 'join_request' // Sen karşı tarafın projesine katılmak istiyorsun
        })
      });

      if (response.ok) {
        toast.success("İş birliği talebin otonom olarak fırlatıldı!");
        setRequestMessage("");
        setSelectedProjectId(null);
      } else {
        const errorData = await response.json();
        toast.error(errorData.detail || "İstek gönderilirken bir hata oluştu.");
      }
    } catch (error) {
      toast.error("Bağlantı hatası: Sunucuya ulaşılamıyor.");
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

      {/* PROFİL KARTI */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 ring-1 ring-gray-50">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-blue-50 rounded-2xl">
            <Brain className="text-blue-600" size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-900">{researcher?.full_name}</h1>
            <p className="text-blue-600 font-bold tracking-wide">{researcher?.title || "Kıdemli Araştırmacı"}</p>
          </div>
        </div>
        <p className="text-slate-600 leading-relaxed text-lg italic">"{researcher?.bio}"</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* YETENEKLER BÖLÜMÜ */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Code className="text-indigo-500" /> Uzmanlık Alanları
          </h3>
          <div className="space-y-4">
            {researcher?.skills && Object.entries(researcher.skills).map(([skill, level]: any) => (
              <div key={skill} className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-500 uppercase">
                  <span>{skill}</span>
                  <span>%{level}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${level}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PROJELER BÖLÜMÜ - SEÇİLEBİLİR YAPI */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <FolderGit2 className="text-emerald-500" /> Katılabileceğin Projeler
          </h3>
          <div className="space-y-4">
            {projects.length > 0 ? projects.map((project: any) => (
              <div 
                key={project.project_id} 
                onClick={() => setSelectedProjectId(project.project_id)}
                className={`p-4 cursor-pointer transition-all rounded-2xl border-2 relative ${
                  selectedProjectId === project.project_id 
                  ? 'border-blue-600 bg-blue-50 shadow-md' 
                  : 'border-slate-100 bg-slate-50 hover:border-slate-300'
                }`}
              >
                {selectedProjectId === project.project_id && (
                  <CheckCircle2 className="absolute top-3 right-3 text-blue-600" size={20} />
                )}
                <h4 className="font-bold text-slate-800">{project.title}</h4>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{project.description}</p>
              </div>
            )) : (
              <p className="text-slate-400 italic text-sm text-center py-8">Henüz aktif bir proje bulunamadı.</p>
            )}
          </div>
        </div>
      </div>

      {/* MESAJ VE AKSİYON ALANI */}
      {selectedProjectId && (
        <div className="bg-blue-50 rounded-3xl p-6 border border-blue-100 animate-in slide-in-from-bottom-4 duration-300">
          <h3 className="text-lg font-bold text-blue-900 mb-3">İş Birliği Notun</h3>
          <textarea 
            className="w-full p-4 rounded-xl border-2 border-blue-200 focus:border-blue-500 outline-none text-slate-700 min-h-[120px]"
            placeholder="Neden bu projede yer almak istiyorsun? Yeteneklerinden kısaca bahset..."
            value={requestMessage}
            onChange={(e) => setRequestMessage(e.target.value)}
          />
        </div>
      )}

      <Button 
        onClick={handleSendRequest}
        disabled={!selectedProjectId || isSending}
        className={`w-full py-8 text-xl font-black rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${
          selectedProjectId 
          ? 'bg-blue-600 hover:bg-blue-700 text-white' 
          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
        }`}
      >
        {isSending ? (
          <>
            <Loader2 className="animate-spin" /> Fırlatılıyor...
          </>
        ) : (
          <>
            <Send size={24} /> İŞ BİRLİĞİ TEKLİFİ ET
          </>
        )}
      </Button>
    </div>
  );
};

export default ResearcherDetail;