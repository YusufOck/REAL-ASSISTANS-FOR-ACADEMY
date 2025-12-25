import React, { useState, useEffect } from 'react';
import { Save, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from "sonner";

interface SkillUpdateFormProps {
  initialSkills: any; // Gelen veri kirli olabildiği için 'any' ile karşılıyoruz
  onUpdateSuccess: () => void;
}

const SkillUpdateForm: React.FC<SkillUpdateFormProps> = ({ initialSkills, onUpdateSuccess }) => {
  const [skills, setSkills] = useState<Record<string, number>>({});
  const [isUpdating, setIsUpdating] = useState(false);

  // 🛡️ DATA SANITY CHECK: Gelen veriyi temizleme ve mühürleme
  useEffect(() => {
    if (initialSkills) {
      // Eğer veri liste olarak gelirse (Loglardaki sorun)
      if (Array.isArray(initialSkills)) {
        const actualObject = initialSkills.find(item => typeof item === 'object' && !Array.isArray(item));
        setSkills(actualObject || {});
      } else if (typeof initialSkills === 'object') {
        setSkills(initialSkills);
      }
    }
  }, [initialSkills]);

  const handleSliderChange = (skillName: string, value: number) => {
    setSkills(prev => ({ ...prev, [skillName]: value }));
  };

  const handleSubmit = async () => {
    setIsUpdating(true);
    const token = localStorage.getItem('accessToken'); 
    
    try {
      const response = await fetch('https://real-assistans-for-academy-cbun.onrender.com/api/researchers/me/', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ skills }) 
      });

      if (response.ok) {
        toast.success("Yeteneklerin mühürlendi! AI radarı yenileniyor...");
        onUpdateSuccess(); 
      }
    } catch (error) {
      toast.error("Mühürleme başarısız oldu.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 shadow-2xl h-full flex flex-col">
      <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6">
        <h3 className="text-xl font-black text-white flex items-center gap-3 tracking-tighter uppercase">
          <RefreshCw size={24} className="text-purple-400 animate-spin-slow" /> 
          Yetenek Kumanda Merkezi
        </h3>
      </div>

      <div className="space-y-6 overflow-y-auto flex-grow pr-4 custom-scrollbar">
        {Object.keys(skills).length > 0 ? (
          Object.entries(skills).map(([name, level]) => (
            <div key={name} className="space-y-3 group">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover:text-purple-300 transition-colors">
                  {name}
                </span>
                <span className="text-[10px] font-black text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20 shadow-inner">
                  %{level as number}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={level as number}
                onChange={(e) => handleSliderChange(name, parseInt(e.target.value))}
                className="w-full h-2 bg-white/5 rounded-full appearance-none cursor-pointer accent-purple-500 hover:accent-purple-400 transition-all shadow-inner border border-white/5"
              />
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 opacity-50">
            <AlertCircle size={40} className="text-slate-600" />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
              Yetenek verisi henüz mühürlenmedi.<br/>Biyografini güncellemen gerekebilir.
            </p>
          </div>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={isUpdating || Object.keys(skills).length === 0}
        className="mt-10 w-full py-5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 transition-all shadow-[0_0_40px_rgba(168,85,247,0.3)] active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed group"
      >
        {isUpdating ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} className="group-hover:scale-110 transition-transform" />}
        Verileri Mühürle
      </button>
    </div>
  );
};

export default SkillUpdateForm;