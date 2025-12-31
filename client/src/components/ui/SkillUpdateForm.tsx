import React, { useEffect, useMemo, useState } from "react";
import { Save, Loader2, RefreshCw, AlertCircle, Minus, Plus } from "lucide-react";
import { toast } from "sonner";

interface SkillUpdateFormProps {
  initialSkills: any;
  onUpdateSuccess: () => void;
  onSkillsChange?: (skills: Record<string, number>) => void;
}

const clamp = (n: number) => Math.max(0, Math.min(100, n));

const SkillUpdateForm: React.FC<SkillUpdateFormProps> = ({
  initialSkills,
  onUpdateSuccess,
  onSkillsChange,
}) => {
  const [skills, setSkills] = useState<Record<string, number>>({});
  const [isUpdating, setIsUpdating] = useState(false);

  // 🛡️ MANTIK KORUNDU: Data sanity check
  useEffect(() => {
    if (!initialSkills) return;

    if (Array.isArray(initialSkills)) {
      const actualObject = initialSkills.find(
        (item) => typeof item === "object" && item && !Array.isArray(item)
      );
      setSkills(actualObject || {});
      onSkillsChange?.(actualObject || {});
    } else if (typeof initialSkills === "object") {
      setSkills(initialSkills);
      onSkillsChange?.(initialSkills);
    }
  }, [initialSkills]);

  const entries = useMemo(() => {
    return Object.entries(skills || {}).sort((a, b) => a[0].localeCompare(b[0]));
  }, [skills]);

  const updateSkill = (skillName: string, nextValue: number) => {
    setSkills((prev) => {
      const next = { ...prev, [skillName]: clamp(nextValue) };
      onSkillsChange?.(next); 
      return next;
    });
  };

  // 🛡️ MANTIK KORUNDU: API Submit logic
  const handleSubmit = async () => {
    setIsUpdating(true);
    const token = localStorage.getItem("accessToken");

    try {
      const response = await fetch(
        "https://real-assistans-for-academy-cbun.onrender.com/api/researchers/me/",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ skills }),
        }
      );

      if (response.ok) {
        toast.success("Skills updated. Radar synchronized.");
        onUpdateSuccess();
      } else {
        toast.error("Server rejected the update.");
      }
    } catch {
      toast.error("Update failed.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    // 🚀 MÜHÜR: Padding mobilde daraltıldı
    <div className="bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-[2rem] p-4 md:p-6 shadow-2xl h-full flex flex-col">
      
      {/* Header - Daha esnek hale getirildi */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
        <h3 className="text-xs md:text-sm font-black text-slate-100 flex items-center gap-2 uppercase tracking-widest italic">
          <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin-slow" />
          Skill Command
        </h3>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isUpdating || entries.length === 0}
          className="px-4 py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest
                     bg-indigo-500 hover:bg-indigo-400 border border-indigo-400/20
                     text-white transition-all disabled:opacity-30 active:scale-95 shadow-lg shadow-indigo-500/10"
        >
          {isUpdating ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" /> Saving
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="w-3 h-3" /> Seal
            </span>
          )}
        </button>
      </div>

      {/* Content - Mobilde kaydırma alanı iyileştirildi */}
      <div className="mt-5 space-y-3 overflow-y-auto custom-scrollbar flex-1 max-h-[400px] md:max-h-none pr-1">
        {entries.length > 0 ? (
          <div className="space-y-3">
            {entries.map(([name, level]) => (
              <div
                key={name}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4 group transition-colors hover:bg-white/[0.05]"
              >
                {/* Name & Percentage */}
                <div className="min-w-0 flex justify-between sm:block flex-1">
                  <div className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[150px]">
                    {name}
                  </div>
                  <div className="text-xs md:text-sm font-black text-indigo-300 sm:mt-1">
                    %{clamp(Number(level))}
                  </div>
                </div>

                {/* Controls - Dokunmatik dostu boyutlar */}
                <div className="flex items-center gap-3 shrink-0 bg-black/20 p-1.5 rounded-xl border border-white/5">
                  <button
                    type="button"
                    onClick={() => updateSkill(name, Number(level) - 5)}
                    className="h-9 w-9 md:h-10 md:w-10 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-300 hover:text-red-400 transition-all active:scale-90 flex items-center justify-center border border-white/5"
                    aria-label="Decrease"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <input
                    value={clamp(Number(level))}
                    onChange={(e) => updateSkill(name, Number(e.target.value))}
                    type="number"
                    min={0}
                    max={100}
                    className="w-12 md:w-16 bg-transparent text-slate-100 text-xs md:text-sm font-black text-center outline-none"
                  />

                  <button
                    type="button"
                    onClick={() => updateSkill(name, Number(level) + 5)}
                    className="h-9 w-9 md:h-10 md:w-10 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 transition-all active:scale-90 flex items-center justify-center border border-white/5"
                    aria-label="Increase"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
            <AlertCircle className="w-10 h-10 text-slate-500 mb-4" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
              No skill matrix found.
              <br />
              Synchronize via profile.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SkillUpdateForm;