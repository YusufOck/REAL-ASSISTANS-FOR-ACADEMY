import { useEffect, useState, useRef } from "react"
import { useNavigate, useSearchParams, useOutletContext } from "react-router-dom" // 🚀 useOutletContext eklendi
import { api } from "@/lib/api"
import { 
  Search, ChevronRight, ArrowLeft, Loader2, 
  Filter, Check, ChevronLeft, ShieldCheck, Menu // 🚀 Menu eklendi
} from "lucide-react"
import { Button } from "@/components/ui/button"

let isMetaDataCached = false;

interface Researcher {
  researcher_id: number;
  full_name: string;
  role: string;
  department_name: string;
  title?: string;
  email?: string;
}

interface Department {
  department_id: number;
  name: string;
}

interface Skill {
  skill_id: number;
  name: string;
}

export default function UsersPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  
  // 🚀 MÜHÜR: Layout'tan gelen mobil menü kontrolü
  const { setIsMobileMenuOpen } = useOutletContext<{ setIsMobileMenuOpen: (v: boolean) => void }>();

  const [search, setSearch] = useState(searchParams.get("search") || "")
  const [selectedDept, setSelectedDept] = useState(searchParams.get("department") || "")
  const [selectedRole, setSelectedRole] = useState(searchParams.get("role") || "")
  const [selectedSkills, setSelectedSkills] = useState<number[]>(
    searchParams.get("skills")?.split(",").map(Number).filter(Boolean) || []
  )

  const [users, setUsers] = useState<Researcher[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [allSkills, setAllSkills] = useState<Skill[]>([])
  const [myId, setMyId] = useState<number | null>(null)
  
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get("page")) || 1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [showSkillDropdown, setShowSkillDropdown] = useState(false)

  const abortControllerRef = useRef<AbortController | null>(null);

  // 🛡️ MANTIK KORUNDU: URL Sync & Fetch Logic
  useEffect(() => {
    const params: any = {};
    if (search) params.search = search;
    if (selectedDept) params.department = selectedDept;
    if (selectedRole) params.role = selectedRole;
    if (selectedSkills.length > 0) params.skills = selectedSkills.join(",");
    if (currentPage > 1) params.page = currentPage.toString();
    
    setSearchParams(params, { replace: true });
  }, [search, selectedDept, selectedRole, selectedSkills, currentPage, setSearchParams]);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (isMetaDataCached && departments.length > 0) return;
      try {
        const [dRes, sRes, meRes] = await Promise.all([
          api.get("/departments/"),
          api.get("/skills/"),
          api.get("/researchers/me/")
        ]);
        setDepartments(dRes.data.results || dRes.data);
        setAllSkills(sRes.data.results || sRes.data);
        setMyId(meRes.data.researcher_id);
        isMetaDataCached = true;
      } catch (e) { console.error(e); }
    };
    fetchInitialData();
  }, [departments.length]);

  const fetchUsers = async (page: number) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (selectedDept) params.append("department", selectedDept);
      if (selectedRole) params.append("role", selectedRole);
      if (selectedSkills.length > 0) params.append("skills", selectedSkills.join(','));
      params.append("page", page.toString());
      const res = await api.get(`/researchers/?${params.toString()}`, { signal: controller.signal });
      setUsers(res.data.results || []);
      setTotalCount(res.data.count || res.data.results.length);
      setTotalPages(Math.ceil((res.data.count || res.data.results.length) / 10) || 1);
    } catch (e: any) { 
      if (e.name === 'CanceledError') return;
      setUsers([]);
    } finally { if (!controller.signal.aborted) setLoading(false); }
  };

  useEffect(() => {
    const timeout = setTimeout(() => fetchUsers(currentPage), 600); 
    return () => clearTimeout(timeout);
  }, [search, selectedDept, selectedRole, selectedSkills, currentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
  };

  const toggleSkill = (id: number) => {
    setSelectedSkills(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-[#0b1020] text-slate-100 p-4 md:p-8 space-y-6 md:space-y-10 font-sans animate-in fade-in duration-500 flex-1 overflow-y-auto custom-scrollbar">
      
      {/* HEADER SECTION - 🚀 MÜHÜR: Hamburger Menü Entegrasyonu */}
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4 md:gap-5 w-full lg:w-auto">
          {/* Mobil Menü Butonu */}
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-4 bg-white/5 rounded-2xl border border-white/10 text-indigo-300 active:scale-95 transition-all shadow-lg shrink-0"
          >
            <Menu className="w-6 h-6" />
          </button>

          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="rounded-2xl h-12 w-12 md:h-14 md:w-14 bg-white/5 border border-white/10 hover:bg-indigo-500/10 transition-all shadow-xl shrink-0 hidden sm:flex">
            <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tighter uppercase italic leading-none">System <span className="text-indigo-400">Directory</span></h1>
            <p className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-2">Total {totalCount} Nodes Indexed</p>
          </div>
        </div>

        {/* FILTERS SECTION */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 md:gap-4 w-full lg:w-auto">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
            <input 
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by name..." 
              className="bg-white/5 border border-white/10 rounded-2xl py-3 pl-11 pr-4 outline-none focus:ring-2 ring-indigo-500/25 w-full text-sm transition-all shadow-inner placeholder:text-slate-600"
            />
          </div>

          <div className="grid grid-cols-2 sm:flex gap-3 w-full sm:w-auto">
            <select 
              value={selectedDept} onChange={(e) => { setSelectedDept(e.target.value); setCurrentPage(1); }}
              className="bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-xs md:text-sm outline-none focus:ring-2 ring-indigo-500/25 cursor-pointer flex-1 sm:min-w-[160px] font-bold"
            >
              <option value="" className="bg-[#0b1020]">All Departments</option>
              {departments.map((d) => (
                <option key={d.department_id} value={d.department_id} className="bg-[#0b1020]">{d.name}</option>
              ))}
            </select>

            <select 
              value={selectedRole} onChange={(e) => { setSelectedRole(e.target.value); setCurrentPage(1); }}
              className="bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-xs md:text-sm outline-none focus:ring-2 ring-indigo-500/25 cursor-pointer flex-1 sm:min-w-[140px] font-bold"
            >
              <option value="" className="bg-[#0b1020]">All Tiers</option>
              <option value="academician" className="bg-[#0b1020]">Academician</option>
              <option value="student" className="bg-[#0b1020]">Student</option>
            </select>
          </div>

          <div className="relative w-full sm:w-auto">
            <Button onClick={() => setShowSkillDropdown(!showSkillDropdown)} className="w-full sm:w-auto bg-white/5 border border-white/10 rounded-2xl py-6 px-6 hover:bg-white/10 flex gap-2 h-auto shadow-2xl transition-transform active:scale-95 border-b-4 border-white/5">
              <Filter className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[10px] font-black uppercase tracking-widest">Skills ({selectedSkills.length})</span>
            </Button>
            
            {showSkillDropdown && (
              <div className="absolute top-full right-0 mt-3 w-full sm:w-72 bg-[#0f172a] border border-white/10 rounded-3xl shadow-2xl z-50 p-4 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
                <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                  {allSkills.length > 0 ? allSkills.map((s) => (
                    <div key={s.skill_id} onClick={() => toggleSkill(s.skill_id)} className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition ${selectedSkills.includes(s.skill_id) ? 'bg-indigo-500/20 text-white' : 'hover:bg-white/5 text-slate-400'}`}>
                      <span className="text-[10px] font-bold uppercase">{s.name}</span>
                      {selectedSkills.includes(s.skill_id) && <Check className="w-3 h-3 text-indigo-400" />}
                    </div>
                  )) : <p className="text-center text-[10px] text-slate-500 py-4 font-black uppercase tracking-widest opacity-30 italic">No nodes available</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="max-w-7xl mx-auto rounded-[2.5rem] md:rounded-[3rem] border border-white/10 bg-white/[0.02] overflow-hidden shadow-2xl backdrop-blur-sm">
        
        {loading ? (
          <div className="p-24 md:p-32 text-center flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-indigo-400 w-10 h-10 md:w-12 md:h-12" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 italic">Decrypting Directory...</p>
          </div>
        ) : users.length > 0 ? (
          <>
            {/* 🖥️ DESKTOP TABLE */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-white/[0.03] border-b border-white/5 text-slate-500 text-[9px] font-black uppercase tracking-widest italic">
                    <th className="p-8">Researcher Profile</th>
                    <th className="p-8 text-center">Departmental Unit</th>
                    <th className="p-8 text-center">Clearance Tier</th>
                    <th className="p-8 text-right">Access</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map((u) => {
                    const isMe = myId === u.researcher_id;
                    return (
                      <tr key={u.researcher_id} className={`transition-all group border-l-4 ${isMe ? 'bg-indigo-500/5 border-l-indigo-400' : 'hover:bg-indigo-500/[0.02] border-l-transparent hover:border-l-indigo-500'}`}>
                        <td className="p-8">
                          <div className="flex items-center gap-5">
                            <div className={`h-12 w-12 rounded-2xl border flex items-center justify-center font-black shadow-inner ${isMe ? 'bg-indigo-500 text-white border-indigo-400' : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'}`}>
                              {u.full_name?.charAt(0) || "?"}
                            </div>
                            <div className="min-w-0">
                              <p className="font-black text-white text-lg group-hover:text-indigo-300 transition-colors uppercase italic tracking-tight">
                                {u.full_name} {isMe && <span className="text-[7px] bg-indigo-500 text-white px-2 py-0.5 rounded-md ml-2 align-middle">YOU</span>}
                              </p>
                              <p className="text-[9px] text-slate-500 uppercase font-black tracking-[0.2em] mt-1 italic">
                                {u.role === 'academician' ? 'Staff Academician' : 'Junior Researcher'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-8 text-center"><span className="text-[10px] font-black text-slate-400 bg-white/5 px-4 py-2 rounded-xl border border-white/5 uppercase tracking-wider">{u.department_name || "UNASSIGNED"}</span></td>
                        <td className="p-8 text-center">
                          <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${u.role === 'academician' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.1)]' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]'}`}>
                            {u.role === 'academician' ? 'Academic' : 'Student'}
                          </span>
                        </td>
                        <td className="p-8 text-right">
                          {isMe ? (
                            <div className="inline-flex items-center gap-2 h-11 px-6 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-black text-[9px] tracking-widest uppercase opacity-60">
                              <ShieldCheck className="w-3.5 h-3.5" /> SYSTEM OPERATOR
                            </div>
                          ) : (
                            <Button onClick={() => navigate(`/researcher/${u.researcher_id}`)} className="h-11 px-6 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white border border-indigo-500/20 transition-all font-black text-[9px] tracking-[0.15em] uppercase shadow-lg shadow-indigo-500/10 border-b-4 border-indigo-400/20">VIEW PROFILE</Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 📱 MOBILE LIST */}
            <div className="md:hidden divide-y divide-white/5">
              {users.map((u) => {
                const isMe = myId === u.researcher_id;
                return (
                  <div key={u.researcher_id} className={`p-6 space-y-5 ${isMe ? 'bg-indigo-500/5' : ''}`}>
                    <div className="flex items-center gap-4">
                      <div className={`h-12 w-12 rounded-xl flex items-center justify-center font-black shadow-inner ${isMe ? 'bg-indigo-500 text-white' : 'bg-indigo-500/10 text-indigo-300'}`}>
                        {u.full_name?.charAt(0) || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-white truncate uppercase italic text-sm">{u.full_name}</p>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{u.role}</p>
                      </div>
                      {isMe && <span className="text-[8px] bg-indigo-500 text-white px-2 py-0.5 rounded-md font-black">YOU</span>}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                        <p className="text-[7px] font-black text-slate-600 uppercase mb-1 tracking-widest">Unit</p>
                        <p className="text-[9px] font-bold text-slate-300 truncate uppercase">{u.department_name || "N/A"}</p>
                      </div>
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                        <p className="text-[7px] font-black text-slate-600 uppercase mb-1 tracking-widest">Tier</p>
                        <p className={`text-[9px] font-black uppercase ${u.role === 'academician' ? 'text-purple-400' : 'text-emerald-400'}`}>
                          {u.role === 'academician' ? 'Academic' : 'Student'}
                        </p>
                      </div>
                    </div>

                    {isMe ? (
                      <div className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-black text-[10px] uppercase tracking-widest opacity-60 italic">
                        <ShieldCheck className="w-4 h-4" /> System Operator
                      </div>
                    ) : (
                      <Button onClick={() => navigate(`/researcher/${u.researcher_id}`)} className="w-full h-13 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-black text-[10px] uppercase tracking-[0.2em] shadow-lg border-b-4 border-indigo-500/30">
                        Inspect Profile
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="p-24 text-center opacity-20 italic font-black uppercase text-[10px] tracking-[0.4em] flex flex-col items-center gap-4">
            <Search className="w-8 h-8" />
            No Records Synchronized
          </div>
        )}

        {/* PAGINATION */}
        <div className="p-6 md:p-8 bg-white/[0.03] border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6">
          <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em] italic">Sequence {currentPage} // {totalPages}</p>
          <div className="flex gap-3 w-full sm:w-auto">
            <Button disabled={currentPage === 1 || loading} onClick={() => handlePageChange(currentPage - 1)} className="flex-1 sm:flex-none bg-white/5 rounded-xl px-5 py-4 text-[9px] font-black uppercase tracking-widest border border-white/10 disabled:opacity-10 active:scale-95 transition-all">
              <ChevronLeft className="w-3.5 h-3.5 mr-2" /> Back
            </Button>
            <Button disabled={currentPage >= totalPages || loading} onClick={() => handlePageChange(currentPage + 1)} className="flex-1 sm:flex-none bg-indigo-500/10 rounded-xl px-5 py-4 text-[9px] font-black uppercase tracking-widest border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white disabled:opacity-10 active:scale-95 transition-all">
              Next <ChevronRight className="w-3.5 h-3.5 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}