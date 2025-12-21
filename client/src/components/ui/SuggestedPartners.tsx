import React from 'react';
import { UserPlus, Star, Award, BrainCircuit } from 'lucide-react';
import { useNavigate } from 'react-router-dom'; // 1. Adım: Navigasyon kancasını import ettik.

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
  // 2. Adım: useNavigate kancasını bileşen gövdesinin İÇİNE aldık (Mühendislik kuralı!)
  const navigate = useNavigate();

  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="mt-12 space-y-6">
      {/* BAŞLIK BÖLÜMÜ */}
      <div className="flex items-center gap-3 border-b border-gray-200 pb-4">
        <div className="p-2 bg-blue-100 rounded-lg">
          <BrainCircuit className="text-blue-600 w-6 h-6" />
        </div>
        <div>
          <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            AI Destekli İş Birliği Önerileri
          </h3>
          <p className="text-sm text-slate-500 font-medium">
            Radar grafiğindeki eksiklerinize göre en uygun çalışma ortakları
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suggestions.map((partner) => (
          <div 
            key={partner.researcher_id}
            className={`relative flex flex-col bg-white border ${
              partner.is_complementary ? 'border-amber-400 ring-1 ring-amber-100' : 'border-gray-200'
            } rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group`}
          >
            {/* Tamamlayıcı Rozeti */}
            {partner.is_complementary && (
              <div className="absolute -top-3 right-4 bg-amber-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1">
                <Star size={12} fill="currentColor" /> TAMAMLAYICI
              </div>
            )}

            <div className="mb-4">
              <h4 className="text-slate-900 font-bold text-lg leading-tight group-hover:text-blue-600 transition-colors">
                {partner.full_name}
              </h4>
              <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
                {partner.department_name}
              </span>
            </div>

            {/* Skor Barı */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-1000"
                  style={{ width: `${partner.score * 100}%` }}
                />
              </div>
              <span className="text-slate-700 text-xs font-bold font-mono">
                %{(partner.score * 100).toFixed(1)}
              </span>
            </div>

            {/* Eşleşme Sebepleri */}
            <div className="flex flex-wrap gap-2 mb-6 min-h-[48px]">
              {partner.match_reasons.length > 0 ? (
                partner.match_reasons.map((reason, idx) => (
                  <span key={idx} className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2.5 py-1 rounded-md border border-blue-100 flex items-center gap-1">
                    <Award size={12} /> {reason}
                  </span>
                ))
              ) : (
                <span className="text-slate-400 text-[11px] italic font-medium">
                  Semantik Benzerlik Eşleşmesi
                </span>
              )}
            </div>

            {/* 3. Adım: Butona onClick olayını ve dinamik rotayı mühürledik. */}
            <button 
              onClick={() => navigate(`/researcher/${partner.researcher_id}`)}
              className="w-full py-2.5 bg-slate-900 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
            >
              <UserPlus size={18} /> Profili İncele
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SuggestedPartners;