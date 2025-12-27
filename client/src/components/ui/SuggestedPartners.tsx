import React from "react";
import { UserPlus, Star, Award, BrainCircuit, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Suggestion {
  researcher_id: number;
  full_name: string;
  department_name: string;
  score: number;
  match_reasons: string[];
  is_complementary: boolean;
}

interface SuggestedPartnersProps {
  suggestions: Suggestion[];
}

const SuggestedPartners: React.FC<SuggestedPartnersProps> = ({ suggestions }) => {
  const navigate = useNavigate();

  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between px-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-200">
            <BrainCircuit size={20} strokeWidth={2.5} />
            <span className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-200/80">
              AI Matching Engine
            </span>
          </div>
          <h3 className="text-xl font-black text-slate-100 tracking-tight">
            Suggested Partners
          </h3>
        </div>

        <button
          type="button"
          className="text-xs font-black text-slate-200/70 hover:text-indigo-200 flex items-center gap-1 transition-colors"
        >
          View All <ChevronRight size={14} />
        </button>
      </div>

      {/* Horizontal list */}
      <div className="flex gap-5 overflow-x-auto pb-6 pt-2 px-1 snap-x snap-mandatory custom-scrollbar">
        {suggestions.map((partner) => {
          const pct = Math.max(0, Math.min(100, partner.score * 100));

          return (
            <div
              key={partner.researcher_id}
              className={[
                "relative flex-none w-[280px] snap-center flex flex-col",
                "rounded-[24px] p-5 border backdrop-blur-xl",
                "transition-all duration-300 group",
                "hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(0,0,0,0.35)]",
                partner.is_complementary
                  ? "bg-amber-500/10 border-amber-300/20"
                  : "bg-white/[0.05] border-white/10",
              ].join(" ")}
            >
              {/* Complementary badge */}
              {partner.is_complementary && (
                <div className="absolute -top-2.5 left-6 bg-amber-500 text-white text-[9px] font-black px-3 py-1 rounded-full shadow-lg flex items-center gap-1 z-10">
                  <Star size={10} fill="currentColor" /> COMPLEMENTARY
                </div>
              )}

              {/* Name + Department */}
              <div className="mb-5">
                <h4 className="text-slate-100 font-black text-[16px] leading-tight group-hover:text-indigo-200 transition-colors truncate">
                  {partner.full_name}
                </h4>
                <p className="text-slate-200/60 text-[11px] font-black mt-1 uppercase tracking-wider truncate">
                  {partner.department_name}
                </p>
              </div>

              {/* Score box */}
              <div className="bg-white/[0.04] rounded-2xl p-3 mb-5 border border-white/10">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black text-slate-200/60 uppercase tracking-widest">
                    Match Rate
                  </span>
                  <span className="text-indigo-200 text-xs font-black italic">
                    %{pct.toFixed(1)}
                  </span>
                </div>

                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-400 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Reasons */}
              <div className="flex flex-wrap gap-1.5 mb-6 min-h-[44px]">
                {partner.match_reasons.slice(0, 2).map((reason, idx) => (
                  <span
                    key={idx}
                    className="bg-white/[0.06] text-slate-200/80 text-[9px] font-black px-2 py-1 rounded-lg border border-white/10 flex items-center gap-1"
                  >
                    <Award size={10} className="text-indigo-200" />
                    <span className="truncate">{reason}</span>
                  </span>
                ))}

                {partner.match_reasons.length === 0 && (
                  <span className="text-slate-200/50 text-[10px] italic font-semibold">
                    Semantic Data Matching
                  </span>
                )}
              </div>

              {/* CTA */}
              <button
                type="button"
                onClick={() => navigate(`/researcher/${partner.researcher_id}`)}
                className="w-full py-3 rounded-[16px] text-xs font-black uppercase tracking-widest
                           bg-indigo-500/15 hover:bg-indigo-500/25 text-slate-100
                           border border-indigo-400/20
                           flex items-center justify-center gap-2 transition-all active:scale-95
                           shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
              >
                <UserPlus size={16} />
                View Profile
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SuggestedPartners;
