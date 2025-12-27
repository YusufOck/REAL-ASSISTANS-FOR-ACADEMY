import { useEffect, useState, useRef } from "react"
import { useNavigate, useSearchParams } from "react-router-dom" // 🚀 useSearchParams eklendi
import { api } from "@/lib/api"
import { 
  Search, ChevronRight, ArrowLeft, Loader2, 
  Filter, Check, ChevronLeft 
} from "lucide-react" // 🛡️ unused GraduationCap ve Cpu temizlendi
import { Button } from "@/components/ui/button"

// 🛡️ Global Kilit: Sayfa ömrü boyunca meta verileri sadece 1 kez çekmek için
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
  const [searchParams, setSearchParams] = useSearchParams() // 🛰️ URL Kontrolü
  const [loading, setLoading] = useState(true)
  
  // 🛡️ MANTIK KORUNDU: Değerler artık başlangıçta URL'den okunuyor (Persistence)
  const [search, setSearch] = useState(searchParams.get("search") || "")
  const [selectedDept, setSelectedDept] = useState(searchParams.get("department") || "")
  const [selectedSkills, setSelectedSkills] = useState<number[]>(
    searchParams.get("skills")?.split(",").map(Number).filter(Boolean) || []
  )

  const [users, setUsers] = useState<Researcher[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [allSkills, setAllSkills] = useState<Skill[]>([])
  
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get("page")) || 1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [showSkillDropdown, setShowSkillDropdown] = useState(false)

  const abortControllerRef = useRef<AbortController | null>(null);

  // 1. ADIM: Meta Verileri Çek (Global Kilit Mantığı Korundu)
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [dRes, sRes] = await Promise.all([
          api.get("/departments/"),
          api.get("/skills/")
        ]);
        setDepartments(dRes.data.results || dRes.data);
        setAllSkills(sRes.data.results || sRes.data);
        isMetaDataCached = true;
      } catch (e) { 
        console.error("Meta veriler çekilemedi", e);
      }
    };
    
    // Sadece veri yoksa çek
    if (!isMetaDataCached || departments.length === 0) {
      fetchMeta();
    }
  }, []);

  // 🚀 YENİ MANTIK: Filtreler her değiştiğinde URL'yi mühürle
  useEffect(() => {
    const params: any = {};
    if (search) params.search = search;
    if (selectedDept) params.department = selectedDept;
    if (selectedSkills.length > 0) params.skills = selectedSkills.join(",");
    if (currentPage > 1) params.page = currentPage.toString();
    
    setSearchParams(params, { replace: true });
  }, [search, selectedDept, selectedSkills, currentPage, setSearchParams]);

  // 2. ADIM: Araştırmacı Listesini Çek (AbortController Yapısı Korundu)
  const fetchUsers = async (page: number) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (selectedDept) params.append("department", selectedDept);
      if (selectedSkills.length > 0) params.append("skills", selectedSkills.join(','));
      params.append("page", page.toString());
      
      const res = await api.get(`/researchers/?${params.toString()}`, {
        signal: controller.signal
      });
      
      const results = res.data.results || [];
      const count = res.data.count || results.length;
      
      setUsers(results);
      setTotalCount(count);
      setTotalPages(Math.ceil(count / 10) || 1);
      
    } catch (e: any) { 
      if (e.name === 'CanceledError' || e.name === 'AbortError') return;
      setUsers([]);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  // 3. ADIM: Debounce Kontrolü (600ms Mantığı Korundu)
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchUsers(currentPage);
    }, 600); 
    return () => clearTimeout(timeout);
  }, [search, selectedDept, selectedSkills, currentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
  };

  const toggleSkill = (id: number) => {
    setSelectedSkills(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
    setCurrentPage(1); // Filtre değişince başa dön
  };

  return (
    <div className="min-h-screen bg-[#0b1020] text-slate-100 p-8 space-y-10 font-sans animate-in fade-in duration-500">
      <div className="max-w-7xl mx-auto flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div className="flex items-center gap-5">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="rounded-2xl h-14 w-14 bg-white/5 border border-white/10 hover:bg-indigo-500/10 transition-all shadow-xl">
            <ArrowLeft size={24} />
          </Button>
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase italic">Sistem <span className="text-indigo-400">Dizini</span></h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">Toplam {totalCount} Araştırmacı Kayıtlı</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 w-full xl:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Araştırmacı ara..." 
              className="bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-6 outline-none focus:ring-2 ring-indigo-500/25 w-full sm:w-64 transition-all shadow-inner"
            />
          </div>

          <select 
            value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-2xl py-3.5 px-6 outline-none focus:ring-2 ring-indigo-500/25 cursor-pointer min-w-[200px]"
          >
            <option value="" className="bg-[#0b1020]">Tüm Bölümler</option>
            {departments.map((d) => (
              <option key={d.department_id} value={d.department_id} className="bg-[#0b1020]">{d.name}</option>
            ))}
          </select>

          <div className="relative">
            <Button onClick={() => setShowSkillDropdown(!showSkillDropdown)} className="bg-white/5 border border-white/10 rounded-2xl py-7 px-6 hover:bg-white/10 flex gap-2 h-auto shadow-2xl transition-transform active:scale-95">
              <Filter size={16} className="text-indigo-400" />
              <span className="text-xs font-black uppercase tracking-widest">Yetenekler ({selectedSkills.length})</span>
            </Button>
            
            {showSkillDropdown && (
              <div className="absolute top-full right-0 mt-3 w-72 bg-[#0f172a] border border-white/10 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.6)] z-50 p-4 animate-in zoom-in duration-200 backdrop-blur-xl">
                <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1">
                  {allSkills.length > 0 ? allSkills.map((s) => (
                    <div key={s.skill_id} onClick={() => toggleSkill(s.skill_id)} className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition ${selectedSkills.includes(s.skill_id) ? 'bg-indigo-500/20 text-white border border-indigo-500/20' : 'hover:bg-white/5 text-slate-400 border border-transparent'}`}>
                      <span className="text-xs font-bold">{s.name}</span>
                      {selectedSkills.includes(s.skill_id) && <Check size={14} className="text-indigo-400" />}
                    </div>
                  )) : <p className="text-center text-[10px] text-slate-500 py-4 font-black uppercase">Yetenek bulunamadı</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto rounded-[3rem] border border-white/10 bg-white/[0.02] overflow-hidden shadow-2xl backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-white/[0.03] border-b border-white/10 text-slate-500 text-[11px] font-black uppercase tracking-widest">
                <th className="p-8">Araştırmacı Profili</th>
                <th className="p-8 text-center">Bölüm / Departman</th>
                <th className="p-8 text-center">Kademeli Rol</th>
                <th className="p-8 text-right">Aksiyon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-32 text-center">
                    <Loader2 className="animate-spin mx-auto text-indigo-500 mb-4" size={48} />
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Veriler Senkronize Ediliyor...</p>
                  </td>
                </tr>
              ) : users.length > 0 ? (
                users.map((u) => (
                  <tr key={u.researcher_id} className="hover:bg-indigo-500/[0.02] transition-all group border-l-4 border-l-transparent hover:border-l-indigo-500">
                    <td className="p-8">
                      <div className="flex items-center gap-5">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-300 font-black shadow-inner">{u.full_name?.charAt(0) || "?"}</div>
                        <div>
                          <p className="font-black text-white text-lg group-hover:text-indigo-300 transition-colors tracking-tight">{u.full_name}</p>
                          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest flex items-center gap-2 mt-1">
                            {u.role === 'academician' ? 'AKADEMİSYEN' : 'ARAŞTIRMACI'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-8 text-center">
                      <span className="text-xs font-bold text-slate-300 bg-white/5 px-4 py-2 rounded-xl border border-white/5">{u.department_name || "Bölüm Yok"}</span>
                    </td>
                    <td className="p-8 text-center">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${u.role === 'academician' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.1)]' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]'}`}>
                        {u.role === 'academician' ? 'Akademisyen' : 'Öğrenci'}
                      </span>
                    </td>
                    <td className="p-8 text-right">
                      <Button onClick={() => navigate(`/researcher/${u.researcher_id}`)} className="h-12 px-6 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white border border-indigo-500/20 transition-all font-black text-[10px] tracking-widest shadow-xl active:scale-95">
                        PROFİLİ İNCELE <ChevronRight size={16} className="ml-2" />
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={4} className="p-32 text-center opacity-30 italic font-black uppercase text-[10px] tracking-widest">Kayıt Bulunamadı</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 🚀 SAYFALAMA KONTROLLERİ */}
        <div className="p-8 bg-white/[0.03] border-t border-white/10 flex items-center justify-between">
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">
            Sayfa {currentPage} / {totalPages}
          </p>
          <div className="flex gap-3">
            <Button 
              disabled={currentPage === 1 || loading} 
              onClick={() => handlePageChange(currentPage - 1)}
              className="bg-white/5 hover:bg-indigo-500/20 rounded-xl px-5 py-2 text-[10px] font-black uppercase tracking-widest border border-white/10 disabled:opacity-20 transition-all"
            >
              <ChevronLeft size={14} className="mr-2" /> Geri
            </Button>
            <Button 
              disabled={currentPage >= totalPages || loading} 
              onClick={() => handlePageChange(currentPage + 1)}
              className="bg-white/5 hover:bg-indigo-500/20 rounded-xl px-5 py-2 text-[10px] font-black uppercase tracking-widest border border-white/10 disabled:opacity-20 transition-all"
            >
              İleri <ChevronRight size={14} className="ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}