// src/pages/Projects.tsx
import { useState, useEffect } from "react"
import { Plus, LayoutGrid, FolderKanban } from "lucide-react"
import { Button } from "@/components/ui/button"
import CreateProjectModal from "@/components/ui/CreateProjectModal"
import ProjectDetailModal from "@/components/ui/ProjectDetailModal"
import { api } from "@/lib/api" // 🛰️ MÜHÜR: Named import düzeltildi

export default function Projects() {
  const [projects, setProjects] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState<any>(null)

  const fetchProjects = async () => {
    try {
      const res = await api.get("/projects/")
      setProjects(res.data)
    } catch (err) { console.error("Projeler yüklenemedi", err) }
  }

  useEffect(() => { fetchProjects() }, [])

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter">Proje <span className="text-indigo-400">İstasyonu</span></h2>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Aktif Operasyonlar</p>
        </div>
        <Button 
          onClick={() => setShowCreateModal(true)}
          className="h-14 px-8 rounded-[1.5rem] bg-indigo-500 hover:bg-indigo-600 text-white font-black shadow-lg shadow-indigo-500/20"
        >
          <Plus size={20} className="mr-2" /> YENİ PROJE BAŞLAT
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((proj: any) => (
          <div 
            key={proj.project_id}
            onClick={() => setSelectedProject(proj)}
            className="group p-8 bg-[#0f172a] border border-white/5 rounded-[3rem] hover:border-indigo-500/30 transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20"><FolderKanban size={80} /></div>
            <div className="relative z-10 space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <LayoutGrid size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white leading-tight">{proj.title}</h3>
                <p className="text-[10px] text-slate-500 font-black uppercase mt-2">{proj.phase || 'PLANNING'}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showCreateModal && <CreateProjectModal onClose={() => { setShowCreateModal(false); fetchProjects(); }} />}
      {selectedProject && <ProjectDetailModal project={selectedProject} onClose={() => setSelectedProject(null)} onUpdate={fetchProjects} />}
    </div>
  )
}