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
  if (!projects || projects.length === 0) return null;

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-4">
        <Users className="text-blue-600" /> Aktif Proje Gruplarım
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.map((project) => (
          <div key={project.project_id} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all">
            {/* Grup Başlığı */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-black text-slate-800 text-lg leading-tight">{project.title}</h4>
                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  {project.status}
                </span>
              </div>
              <span className={`text-[10px] px-3 py-1 rounded-full font-bold ${project.my_role.includes('PI') ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                {project.my_role}
              </span>
            </div>

            {/* Mürettebat Listesi */}
            <div className="space-y-2 border-t border-slate-50 pt-4">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Görevli Mürettebat</p>
              {project.group_members && project.group_members.length > 0 ? (
                project.group_members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between bg-slate-50 p-2 rounded-xl">
                    <div className="flex items-center gap-2">
                      <UserCircle size={20} className="text-slate-400" />
                      <span className="text-sm font-semibold text-slate-700">{member.name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-white px-2 py-1 rounded-lg border border-slate-100">
                      <Shield size={12} className="text-blue-400" />
                      {member.role}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">Bu grupta henüz başka mürettebat yok.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectTeamList;