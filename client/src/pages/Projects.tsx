import { useState, useEffect, useRef } from "react"
import { Plus, LayoutGrid, FolderKanban, Loader2, ArrowLeft, User, Menu } from "lucide-react" // 🚀 Menu eklendi
import { useNavigate, useOutletContext } from "react-router-dom" // 🚀 useOutletContext eklendi
import { Button } from "@/components/ui/button"
import CreateProjectModal from "@/components/ui/CreateProjectModal"
import ProjectDetailModal from "@/components/ui/ProjectDetailModal"
import { api } from "@/lib/api" 

export default function Projects() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState<any>(null)
  
  const navigate = useNavigate()
  const isFetching = useRef(false);

  // 🚀 MÜHÜR: Layout'tan gelen mobil menü kontrolü
  const { setIsMobileMenuOpen } = useOutletContext<{ setIsMobileMenuOpen: (v: boolean) => void }>();

  // 🛡️ MANTIK KORUNDU: Fetch Projects
  const fetchProjects = async () => {
    if (isFetching.current) return; 
    isFetching.current = true;
    setLoading(true);

    try {
      const res = await api.get("/projects/"); 
      setProjects(res.data.results || []);
    } catch (err) { 
      console.error("Projects could not be loaded to the station:", err) 
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }

  useEffect(() => { 
    fetchProjects() 
  }, [])

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-in fade-in duration-500 bg-[#0b1020] min-h-screen text-slate-100 flex-1 overflow-y-auto custom-scrollbar">
      
      {/* HEADER ACTION BAR: Back Button & Menu Trigger */}
      <div className="flex justify-between items-center">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="group flex items-center gap-3 text-slate-400 hover:text-white transition-all bg-white/5 border border-white/10 rounded-2xl px-4 md:px-5 py-6 md:py-7 hover:bg-indigo-500/10 hover:border-indigo-500/50 shadow-2xl"
        >
          <div className="p-1.5 md:p-2 rounded-xl bg-white/5 group-hover:bg-indigo-500/20 transition-colors">
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 group-hover:-translate-x-1 transition-transform" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] opacity-50 italic">System Line</span>
            <span className="text-xs md:text-sm font-black tracking-tight uppercase">Dashboard</span>
          </div>
        </Button>

        {/* 🚀 MÜHÜR: Mobilde görünen Hamburger Menü Butonu */}
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="md:hidden p-4 bg-white/5 rounded-2xl border border-white/10 text-indigo-300 active:scale-95 transition-all shadow-lg"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Page Title and Action Button */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6 border-b border-white/5 pb-8">
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase italic leading-none">
            Project <span className="text-indigo-400 font-black">Station</span>
          </h2>
          <div className="flex items-center gap-2 mt-3">
             <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
             <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Active Operations Under AI Surveillance</p>
          </div>
        </div>
        
        <Button 
          onClick={() => setShowCreateModal(true)}
          className="w-full sm:w-auto h-14 md:h-16 px-8 md:px-10 rounded-2xl md:rounded-[1.5rem] bg-indigo-500 hover:bg-indigo-600 text-white font-black shadow-lg shadow-indigo-500/20 transition-all active:scale-95 border-b-4 border-indigo-700 text-xs md:text-sm uppercase tracking-[0.2em]"
        >
          <Plus className="w-5 h-5 mr-2" /> START NEW PROJECT
        </Button>
      </div>

      {/* Project Card List */}
      {loading ? (
        <div className="py-24 md:py-40 flex flex-col items-center justify-center gap-5 opacity-50">
          <Loader2 className="w-10 h-10 md:w-12 md:h-12 animate-spin text-indigo-400" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] italic">Synchronizing Data Node...</p>
        </div>
      ) : projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {projects.map((proj: any) => (
            <div 
              key={proj.project_id}
              onClick={() => setSelectedProject(proj)}
              className="group p-6 md:p-8 bg-white/[0.03] border border-white/5 rounded-[2rem] md:rounded-[3rem] hover:border-indigo-500/30 hover:bg-white/[0.05] transition-all cursor-pointer relative overflow-hidden shadow-2xl active:scale-[0.98]"
            >
              <div className="absolute -top-4 -right-4 p-4 md:p-6 opacity-5 group-hover:opacity-10 group-hover:rotate-12 transition-all">
                <FolderKanban className="w-24 h-24 md:w-32 md:h-32" />
              </div>
              
              <div className="relative z-10 space-y-4 md:space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                  <User className="w-3 h-3 text-indigo-400" />
                  <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-indigo-300">
                    Leader: <span className="text-white ml-1">{proj.pi_name || 'System PI'}</span>
                  </span>
                </div>

                <div className="h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-indigo-400 shadow-inner group-hover:bg-indigo-500/20 transition-all duration-500">
                  <LayoutGrid className="w-6 h-6 md:w-7 md:h-7" />
                </div>

                <div>
                  <h3 className="text-lg md:text-xl font-black text-white leading-tight group-hover:text-indigo-300 transition-colors line-clamp-2 uppercase italic tracking-tight">
                    {proj.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-4">
                    <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      {proj.phase || 'PLANNING'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-24 md:py-40 text-center border-2 border-dashed border-white/5 rounded-[2.5rem] md:rounded-[3rem] bg-white/[0.01] px-6">
          <FolderKanban className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-4 text-slate-700" />
          <p className="text-xs md:text-sm text-slate-600 font-black italic uppercase tracking-[0.2em]">No operation detected in this sector.</p>
        </div>
      )}

      {/* Modals */}
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