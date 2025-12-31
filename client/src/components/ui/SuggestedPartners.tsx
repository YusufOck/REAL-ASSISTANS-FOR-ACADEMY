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

  // 🛡️ MANTIK KORUNDU: Veri yoksa render etme
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="w-full space-y-6">
      {/* Header - Mobilde yazı boyutları optimize edildi */}
      <div className="flex items-end justify-between px-1">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-indigo-400">
            {/* ÇÖZÜM: İkon boyutu Tailwind sınıfıyla yönetiliyor */}
            <BrainCircuit className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.5} />
            <span className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
              AI Matching Engine
            </span>
          </div>
          <h3 className="text-xl md:text-2xl font-black text-white tracking-tighter uppercase italic">
            Suggested <span className="text-indigo-400">Partners</span>
          </h3>
        </div>

        <button
          type="button"
          className="text-[10px] md:text-xs font-black text-slate-500 hover:text-indigo-400 flex items-center gap-1 transition-all active:scale-95 uppercase tracking-widest"
        >
          View All <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
        </button>
      </div>

      {/* Horizontal list - Snap behavior ve scrollbar iyileştirildi */}
      <div className="flex gap-4 md:gap-6 overflow-x-auto pb-8 pt-2 px-1 snap-x snap-mandatory custom-scrollbar relative">
        {suggestions.map((partner) => {
          const pct = Math.max(0, Math.min(100, partner.score * 100));

          return (
            <div
              key={partner.researcher_id}
              className={[
                "relative flex-none w-[260px] md:w-[300px] snap-center flex flex-col",
                "rounded-[2rem] p-6 border backdrop-blur-xl",
                "transition-all duration-500 group",
                "hover:-translate-y-2 hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)]",
                partner.is_complementary
                  ? "bg-amber-500/10 border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.05)]"
                  : "bg-white/[0.04] border-white/10 shadow-2xl",
              ].join(" ")}
            >
              {/* Complementary badge - Görsellik mühürlendi */}
              {partner.is_complementary && (
                <div className="absolute -top-3 left-6 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[8px] md:text-[9px] font-black px-4 py-1.5 rounded-full shadow-xl flex items-center gap-1.5 z-10 border border-white/10 uppercase tracking-widest">
                  <Star className="w-3 h-3 fill-white" /> COMPLEMENTARY
                </div>
              )}

              {/* Name + Department */}
              <div className="mb-6">
                <h4 className="text-white font-black text-base md:text-lg leading-tight group-hover:text-indigo-300 transition-colors truncate uppercase italic">
                  {partner.full_name}
                </h4>
                <p className="text-slate-500 text-[10px] md:text-[11px] font-bold mt-1.5 uppercase tracking-wider truncate">
                  {partner.department_name}
                </p>
              </div>

              {/* Score box - Glassmorphism derinliği artırıldı */}
              <div className="bg-black/20 rounded-2xl p-4 mb-6 border border-white/5 shadow-inner">
                <div className="flex justify-between items-center mb-2.5">
                  <span className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Match Integrity
                  </span>
                  <span className="text-indigo-400 text-xs md:text-sm font-black italic">
                    %{pct.toFixed(1)}
                  </span>
                </div>

                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Reasons - Responsive yükseklik kontrolü */}
              <div className="flex flex-wrap gap-2 mb-6 min-h-[48px] content-start">
                {partner.match_reasons.slice(0, 2).map((reason, idx) => (
                  <span
                    key={idx}
                    className="bg-white/5 text-slate-300 text-[8px] md:text-[9px] font-black px-2.5 py-1.5 rounded-xl border border-white/5 flex items-center gap-1.5 group-hover:border-indigo-500/20 transition-all truncate max-w-full"
                  >
                    <Award className="w-3 h-3 text-indigo-400 shrink-0" />
                    <span className="truncate">{reason}</span>
                  </span>
                ))}

                {partner.match_reasons.length === 0 && (
                  <span className="text-slate-600 text-[10px] italic font-bold uppercase tracking-tighter">
                    Semantic Data Analysis
                  </span>
                )}
              </div>

              {/* CTA - Touch UI mühürlemesi */}
              <button
                type="button"
                onClick={() => navigate(`/researcher/${partner.researcher_id}`)}
                className="w-full py-4 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-[0.15em]
                           bg-indigo-500 hover:bg-indigo-600 text-white
                           border-b-4 border-indigo-700
                           flex items-center justify-center gap-2 transition-all active:scale-95
                           shadow-xl shadow-indigo-500/10"
              >
                <UserPlus className="w-4 h-4 md:w-5 md:h-5" />
                Inspect Profile
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SuggestedPartners;