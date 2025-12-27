// src/pages/Projects.tsx
import { useState, useEffect, useRef } from "react"
import { Plus, LayoutGrid, FolderKanban, Loader2, ArrowLeft } from "lucide-react" // 🚀 ArrowLeft eklendi
import { useNavigate } from "react-router-dom" // 🚀 useNavigate eklendi
import { Button } from "@/components/ui/button"
import CreateProjectModal from "@/components/ui/CreateProjectModal"
import ProjectDetailModal from "@/components/ui/ProjectDetailModal"
import { api } from "@/lib/api" 

export default function Projects() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState<any>(null)
  
  const navigate = useNavigate() // 🛰️ Navigasyon motoru başlatıldı
  
  // 🛡️ OTONOM KİLİT: Çift istekleri engeller
  const isFetching = useRef(false);

  const fetchProjects = async () => {
    if (isFetching.current) return; 
    isFetching.current = true;
    setLoading(true);

    try {
      const res = await api.get("/projects/"); 
      setProjects(res.data.results || []);
    } catch (err) { 
      console.error("Projeler istasyona yüklenemedi:", err) 
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }

  useEffect(() => { 
    fetchProjects() 
  }, [])

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 bg-[#0b1020] min-h-screen text-slate-100">
      
      {/* 🚀 DASHBOARD'A DÖN BUTONU (SOL ÜST) */}
      <div className="flex justify-start">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="group flex items-center gap-3 text-slate-400 hover:text-white transition-all bg-white/5 border border-white/10 rounded-2xl px-5 py-7 hover:bg-indigo-500/10 hover:border-indigo-500/50 shadow-2xl"
        >
          <div className="p-2 rounded-xl bg-white/5 group-hover:bg-indigo-500/20 transition-colors">
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-50">Sistem Hattı</span>
            <span className="text-sm font-black tracking-tight">DASHBOARD'A DÖN</span>
          </div>
        </Button>
      </div>

      {/* Sayfa Başlığı ve Aksiyon Butonu */}
      <div className="flex justify-between items-end border-b border-white/5 pb-8">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase">
            Proje <span className="text-indigo-400 font-black">İstasyonu</span>
          </h2>
          <div className="flex items-center gap-2 mt-2">
             <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
             <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Aktif Operasyonlar</p>
          </div>
        </div>
        <Button 
          onClick={() => setShowCreateModal(true)}
          className="h-16 px-10 rounded-[1.5rem] bg-indigo-500 hover:bg-indigo-600 text-white font-black shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-95 border-b-4 border-indigo-700"
        >
          <Plus size={22} className="mr-2" /> YENİ PROJE BAŞLAT
        </Button>
      </div>

      {/* Proje Kartları Listesi */}
      {loading ? (
        <div className="py-40 flex flex-col items-center justify-center gap-4 opacity-50">
          <Loader2 className="animate-spin text-indigo-500" size={40} />
          <p className="text-[10px] font-black uppercase tracking-[0.3em]">Veriler Senkronize Ediliyor...</p>
        </div>
      ) : projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((proj: any) => (
            <div 
              key={proj.project_id}
              onClick={() => setSelectedProject(proj)}
              className="group p-8 bg-white/[0.03] border border-white/5 rounded-[3rem] hover:border-indigo-500/30 hover:bg-white/[0.05] transition-all cursor-pointer relative overflow-hidden shadow-2xl"
            >
              <div className="absolute -top-4 -right-4 p-6 opacity-5 group-hover:opacity-10 group-hover:rotate-12 transition-all">
                <FolderKanban size={120} />
              </div>
              <div className="relative z-10 space-y-5">
                <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
                  <LayoutGrid size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white leading-tight group-hover:text-indigo-200 transition-colors">{proj.title}</h3>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      {proj.phase || 'PLANNING'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-40 text-center border-2 border-dashed border-white/5 rounded-[3rem] bg-white/[0.01]">
          <FolderKanban className="mx-auto mb-4 text-slate-700" size={48} />
          <p className="text-sm text-slate-500 font-bold italic">Henüz bir operasyon başlatılmadı.</p>
        </div>
      )}

      {/* Yüzen Adalar (Modallar) */}
      {showCreateModal && (
        <CreateProjectModal 
          onClose={() => { setShowCreateModal(false); fetchProjects(); }} 
        />
      )}
      
      {selectedProject && (
        <ProjectDetailModal 
          project={selectedProject} 
          onClose={() => setSelectedProject(null)} 
          onUpdate={fetchProjects} 
        />
      )}
    </div>
  )
}