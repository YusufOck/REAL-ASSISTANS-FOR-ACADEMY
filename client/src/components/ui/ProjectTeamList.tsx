// src/components/ProjectTeamList.tsx

import React from 'react';
import { Users, Shield, UserCircle } from 'lucide-react';

interface Member {
  id: number;
  name: string;
  role: string;
}

interface Project {
  project_id: number;
  title: string;
  status: string;
  my_role: string;
  group_members: Member[];
}

interface ProjectTeamListProps {
  projects: Project[];
}

const ProjectTeamList: React.FC<ProjectTeamListProps> = ({ projects }) => {
  // 🛡️ MANTIK KORUNDU: Veri yoksa render etme
  if (!projects || projects.length === 0) return null;

  return (
    // 🚀 MÜHÜR: Responsive spacing ve animasyon eklendi
    <div className="space-y-6 animate-in fade-in duration-500">
      <h3 className="text-lg md:text-xl font-black text-white flex items-center gap-3 mb-6 uppercase italic tracking-tight">
        {/* ÇÖZÜM: İkon boyutu Tailwind sınıfıyla yönetiliyor */}
        <Users className="text-indigo-400 w-5 h-5 md:w-6 md:h-6" /> 
        My Active <span className="text-indigo-400">Project Groups</span>
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {projects.map((project) => (
          <div 
            key={project.project_id} 
            className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-[2rem] p-5 md:p-6 shadow-2xl hover:bg-white/[0.06] transition-all group"
          >
            {/* Group Header */}
            <div className="flex justify-between items-start mb-5 gap-4">
              <div className="min-w-0">
                <h4 className="font-black text-white text-base md:text-lg leading-tight group-hover:text-indigo-300 transition-colors truncate uppercase italic">
                  {project.title}
                </h4>
                <div className="mt-2 inline-flex items-center">
                  <span className="text-[8px] md:text-[9px] bg-white/5 text-slate-400 px-2 py-0.5 rounded-md font-black uppercase tracking-widest border border-white/5">
                    {project.status}
                  </span>
                </div>
              </div>
              <span className={`shrink-0 text-[8px] md:text-[9px] px-3 py-1 rounded-lg font-black uppercase tracking-widest border ${
                project.my_role.includes('PI') 
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]' 
                : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
              }`}>
                {project.my_role}
              </span>
            </div>

            {/* Crew List */}
            <div className="space-y-2 border-t border-white/5 pt-5">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">Assigned Crew</p>
              
              {project.group_members && project.group_members.length > 0 ? (
                <div className="grid gap-2">
                  {project.group_members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between bg-black/20 p-3 rounded-xl border border-white/5 group/member hover:border-indigo-500/30 transition-all">
                      <div className="flex items-center gap-3 min-w-0">
                        <UserCircle className="w-4 h-4 md:w-5 md:h-5 text-slate-500 group-hover/member:text-indigo-400 transition-colors shrink-0" />
                        <span className="text-xs md:text-sm font-bold text-slate-200 truncate">{member.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[8px] md:text-[9px] font-black text-indigo-300 bg-indigo-500/5 px-2 py-1 rounded-md border border-indigo-500/10 uppercase tracking-tighter shrink-0">
                        <Shield className="w-3 h-3" />
                        {member.role.split(' ')[0]} {/* Mobilde alanı korumak için rolü kısalttık */}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center bg-white/[0.02] border border-dashed border-white/5 rounded-xl">
                  <p className="text-[10px] text-slate-600 font-bold uppercase italic tracking-widest">No additional crew detected</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectTeamList;