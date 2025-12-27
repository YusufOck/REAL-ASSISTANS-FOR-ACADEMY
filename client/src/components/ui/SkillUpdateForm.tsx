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

  // ✅ data sanity check
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSkills]);

  const entries = useMemo(() => {
    return Object.entries(skills || {}).sort((a, b) => a[0].localeCompare(b[0]));
  }, [skills]);

  const updateSkill = (skillName: string, nextValue: number) => {
    setSkills((prev) => {
      const next = { ...prev, [skillName]: clamp(nextValue) };
      onSkillsChange?.(next); // ✅ live radar
      return next;
    });
  };

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
    <div className="bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-[1.75rem] p-5 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <h3 className="text-sm font-black text-slate-100 flex items-center gap-2 uppercase tracking-widest">
          <RefreshCw size={16} className="text-purple-300 animate-spin-slow" />
          Skill Command
        </h3>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isUpdating || entries.length === 0}
          className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest
                     bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-400/20
                     text-slate-100 transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {isUpdating ? (
            <span className="flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Saving
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save size={14} /> Save
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="mt-4 space-y-3">
        {entries.length > 0 ? (
          <div className="space-y-3">
            {entries.map(([name, level]) => (
              <div
                key={name}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
              >
                {/* Name */}
                <div className="min-w-0">
                  <div className="text-[10px] font-black text-slate-200/70 uppercase tracking-widest truncate">
                    {name}
                  </div>
                  <div className="text-xs font-black text-slate-100 mt-1">
                    %{clamp(Number(level))}
                  </div>
                </div>

                {/* Controls (no slider) */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => updateSkill(name, Number(level) - 5)}
                    className="h-9 w-9 rounded-xl border border-white/10 bg-white/[0.05] hover:bg-white/[0.08] text-slate-100 transition active:scale-95 flex items-center justify-center"
                    aria-label="Decrease"
                  >
                    <Minus size={16} />
                  </button>

                  <input
                    value={clamp(Number(level))}
                    onChange={(e) => updateSkill(name, Number(e.target.value))}
                    type="number"
                    min={0}
                    max={100}
                    className="h-9 w-16 rounded-xl border border-white/10 bg-[#0b1020]/40 text-slate-100 text-xs font-black text-center
                               focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400/30"
                  />

                  <button
                    type="button"
                    onClick={() => updateSkill(name, Number(level) + 5)}
                    className="h-9 w-9 rounded-xl border border-white/10 bg-white/[0.05] hover:bg-white/[0.08] text-slate-100 transition active:scale-95 flex items-center justify-center"
                    aria-label="Increase"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center opacity-70">
            <AlertCircle size={28} className="text-slate-400" />
            <p className="text-[10px] font-black text-slate-300/70 uppercase tracking-widest mt-3 leading-relaxed">
              No skill data.
              <br />
              Update your profile.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SkillUpdateForm;
