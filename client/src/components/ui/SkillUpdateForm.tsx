import React, { useState } from 'react';
import { Save, Loader2, RefreshCw } from 'lucide-react';
import { toast } from "sonner";

interface SkillUpdateFormProps {
  initialSkills: Record<string, number>;
  onUpdateSuccess: () => void;
}

const SkillUpdateForm: React.FC<SkillUpdateFormProps> = ({ initialSkills, onUpdateSuccess }) => {
  const [skills, setSkills] = useState(initialSkills);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSliderChange = (skillName: string, value: number) => {
    setSkills(prev => ({ ...prev, [skillName]: value }));
  };

  // SkillUpdateForm.tsx içindeki handleSubmit metodu:

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
        body: JSON.stringify({ skills }) // Sadece manuel slider değişimlerini gönderir
      });

      if (response.ok) {
        toast.success("Yeteneklerin mühürlendi! AI radarı yenileniyor...");
        // 🚀 Dashboard'un fetchProfile() fonksiyonunu tetikle
        onUpdateSuccess(); 
      }
      // ... hata yönetimi
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm ring-1 ring-gray-100 h-full">
      <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <RefreshCw size={20} className="text-blue-500" /> Yetenek Kumanda Paneli
        </h3>
      </div>

      <div className="space-y-5 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
        {Object.entries(skills).map(([name, level]) => (
          <div key={name} className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-600 truncate mr-2">{name}</span>
              <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded">%{level}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={level}
              onChange={(e) => handleSliderChange(name, parseInt(e.target.value))}
              className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-700 transition-all"
            />
          </div>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={isUpdating}
        className="mt-8 w-full py-3.5 bg-slate-900 hover:bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 disabled:bg-slate-400"
      >
        {isUpdating ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
        Mühürle ve AI'yı Tetikle
      </button>
    </div>
  );
};

export default SkillUpdateForm;