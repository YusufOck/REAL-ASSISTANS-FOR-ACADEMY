// src/components/Sidebar.tsx
import { Link, useNavigate } from "react-router-dom"
import { authService } from "@/services/authService"
import { 
  Atom, LayoutDashboard, FolderKanban, Users, Settings, LogOut, X 
} from "lucide-react"

export default function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (v: boolean) => void }) {
  const navigate = useNavigate()

  const NavItem = ({ icon, label, to }: { icon: any, label: string, to: string }) => (
    <Link 
      to={to} 
      className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all border border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.05] hover:text-white"
    >
      <span className="text-slate-500">{icon}</span>
      <span className="text-[10px] font-black uppercase tracking-[0.2em]">{label}</span>
    </Link>
  )

  return (
    <>
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-[#0b1020] border-r border-white/10 transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 md:flex md:flex-col md:bg-white/[0.03] md:backdrop-blur-xl
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500/15 p-2.5 rounded-2xl border border-indigo-400/20">
              <Atom className="w-6 h-6 text-indigo-200" />
            </div>
            <div className="leading-tight">
              <div className="text-lg font-black tracking-tight text-white uppercase italic">ResearchOS</div>
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Dashboard</div>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="md:hidden p-2 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" to="/dashboard" />
          <NavItem icon={<FolderKanban size={18} />} label="Project" to="/projects" />
          <NavItem icon={<Users size={18} />} label="Users" to="/users" /> 
          <NavItem icon={<Settings size={18} />} label="Settings" to="/profile" />
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={() => { authService.logout(); navigate("/login"); }}
            className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl border border-white/10 text-slate-300/70 hover:text-red-300 transition hover:bg-red-500/5"
          >
            <LogOut size={18} />
            <span className="text-[10px] font-black uppercase tracking-widest">Shut Down System</span>
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsOpen(false)} />
      )}
    </>
  )
}