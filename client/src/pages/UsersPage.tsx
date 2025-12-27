import { useEffect, useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { api } from "@/lib/api"
import { 
  Search, ChevronRight, ArrowLeft, Loader2, 
  Filter, GraduationCap, Cpu, Check 
} from "lucide-react"
import { Button } from "@/components/ui/button"

// 🛰️ TİPLEME
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
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<Researcher[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [allSkills, setAllSkills] = useState<Skill[]>([])
  
  const [search, setSearch] = useState("")
  const [selectedDept, setSelectedDept] = useState("")
  const [selectedSkills, setSelectedSkills] = useState<number[]>([])
  const [showSkillDropdown, setShowSkillDropdown] = useState(false)

  // 🔒 KONTROL MERKEZİ
  const abortControllerRef = useRef<AbortController | null>(null);
  const metaLoaded = useRef(false); // Meta verileri (departman/skill) 1 kez çekmek için kilit

  // 1. İŞLEM: Meta Verileri Mühürle (Departments & Skills)
  useEffect(() => {
    if (metaLoaded.current) return; // Zaten çekildiyse dur.
    
    const fetchMeta = async () => {
      try {
        const [dRes, sRes] = await Promise.all([
          api.get("/departments/"),
          api.get("/skills/")
        ]);
        setDepartments(dRes.data.results || dRes.data);
        setAllSkills(sRes.data.results || sRes.data);
        metaLoaded.current = true; // 🔒 Kapıyı sonsuza dek kapat
      } catch (e) { 
        console.error("Meta veriler senkronize edilemedi", e);
      }
    };
    fetchMeta();
  }, []);

  // 2. İŞLEM: Filtreleme ve Arama (Tek Hat Üzerinden)
  const fetchUsers = async () => {
    // 🛡️ ESKİ İSTEĞİ İPTAL ET: Sunucunun 25 saniye boşuna çalışmasını engeller
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
      
      // 🛰️ SİNYAL GÖNDER: Bu istek artık "iptal edilebilir" bir istektir.
      const res = await api.get(`/researchers/?${params.toString()}`, {
        signal: controller.signal
      });
      
      const userData = res.data.results || res.data;
      setUsers(Array.isArray(userData) ? userData : []);
    } catch (e: any) { 
      // İptal edilen istekleri hata olarak gösterme
      if (e.name === 'CanceledError' || e.name === 'AbortError') return;
      console.error("Dizin senkronizasyon hatası", e); 
    } finally {
      // Eğer bu istek iptal edilmediyse yükleme durumunu bitir
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  };

  // 3. İŞLEM: Debounce Kontrolü (600ms)
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchUsers();
    }, 600); 
    return () => {
      clearTimeout(timeout);
      // Sayfadan çıkınca bekleyen isteği öldür
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [search, selectedDept, selectedSkills]);

  const toggleSkill = (id: number) => {
    setSelectedSkills(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-[#0b1020] text-slate-100 p-8 space-y-10 font-sans animate-in fade-in duration-500">
      <div className="max-w-7xl mx-auto flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div className="flex items-center gap-5">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="rounded-2xl h-14 w-14 bg-white/5 border border-white/10 hover:bg-indigo-500/10 transition-all">
            <ArrowLeft size={24} />
          </Button>
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase italic">Sistem <span className="text-indigo-400">Dizini</span></h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">Araştırmacı Veri Bankası</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 w-full xl:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Araştırmacı ara..." 
              className="bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-6 outline-none focus:ring-2 ring-indigo-500/25 w-full sm:w-64 transition-all"
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
            <Button onClick={() => setShowSkillDropdown(!showSkillDropdown)} className="bg-white/5 border border-white/10 rounded-2xl py-7 px-6 hover:bg-white/10 flex gap-2 h-auto shadow-2xl">
              <Filter size={16} className="text-indigo-400" />
              <span className="text-xs font-black uppercase">Yetenekler ({selectedSkills.length})</span>
            </Button>
            
            {showSkillDropdown && (
              <div className="absolute top-full right-0 mt-3 w-72 bg-[#0f172a] border border-white/10 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.6)] z-50 p-4 animate-in zoom-in duration-200 backdrop-blur-xl">
                <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1">
                  {allSkills.length > 0 ? allSkills.map((s) => (
                    <div key={s.skill_id} onClick={() => toggleSkill(s.skill_id)} className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition ${selectedSkills.includes(s.skill_id) ? 'bg-indigo-500/20 text-white' : 'hover:bg-white/5 text-slate-400'}`}>
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

      <div className="max-w-7xl mx-auto rounded-[3rem] border border-white/10 bg-white/[0.02] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
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
                            {u.role === 'academician' ? <Cpu size={12} /> : <GraduationCap size={12} />}
                            {u.title || "Bağımsız Araştırmacı"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-8 text-center text-xs font-bold text-slate-300">
                      <span className="bg-white/5 px-4 py-2 rounded-xl border border-white/5">{u.department_name || "Bölüm Yok"}</span>
                    </td>
                    <td className="p-8 text-center">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${u.role === 'academician' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.1)]' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]'}`}>
                        {u.role === 'academician' ? 'Akademisyen' : 'Öğrenci'}
                      </span>
                    </td>
                    <td className="p-8 text-right">
                      <Button onClick={() => navigate(`/researcher/${u.researcher_id}`)} className="h-12 px-6 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white border border-indigo-500/20 transition-all font-black text-[10px] tracking-widest active:scale-95">
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
      </div>
    </div>
  );
}