import { useState, useEffect, useRef } from 'react'; // ✅ React kaldırıldı, uyarı giderildi
import { Link, useNavigate } from 'react-router-dom';
import { Atom, BrainCircuit, Users, Zap, ArrowRight, Sparkles, X, Volume2, VolumeX } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

// 🚀 Varlık Importları
import slider1 from '../assets/landing-slider/slider1.png';
import slider2 from '../assets/landing-slider/slider2.png';
import slider3 from '../assets/landing-slider/slider3.png';
import promoVideo from '../assets/researchOS.mp4'; 

const sliderImages = [
  { id: 1, src: slider1, alt: "ResearchOS Ecosystem" },
  { id: 2, src: slider2, alt: "AI Core Connecting Disciplines" },
  { id: 3, src: slider3, alt: "AI Semantic Matching Networks" },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null); 
  
  const [showPromo, setShowPromo] = useState(true);
  const [isMuted, setIsMuted] = useState(true); 
  const [isMinimized, setIsMinimized] = useState(false);

  // 🤖 Kesintisiz Otomasyon: Fare gelse de durmaz
  const plugin = useRef(
    Autoplay({ delay: 3000, stopOnInteraction: false, stopOnMouseEnter: false })
  );

  useEffect(() => {
    if (showPromo && !isMinimized) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [showPromo, isMinimized]);

  const handleMinimize = () => {
    setIsMinimized(true);
    setIsMuted(true);
    if (videoRef.current) videoRef.current.muted = true;
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden font-sans">
      
      {/* 📹 PROMO VIDEO OVERLAY (Sıfır Blur, Sadece Netlik) */}
      {showPromo && (
        <div className={`fixed z-[100] transition-all duration-700 ease-in-out ${
          isMinimized 
          ? "bottom-8 right-8 w-72 md:w-96 aspect-video" 
          : "inset-0 flex items-center justify-center p-4 md:p-10" 
        }`}>
          
          {/* ✅ BLUR KALDIRILDI: Video arkasında sayfa net görünüyor */}
          {!isMinimized && (
            <div 
              className="absolute inset-0 bg-slate-950/85 animate-in fade-in duration-700 cursor-pointer"
              onClick={handleMinimize} 
            />
          )}

          <div className={`relative w-full h-full overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.9)] border border-white/10 bg-black transition-all duration-700 ${
            isMinimized ? "rounded-2xl cursor-pointer" : "rounded-[3rem] max-w-3xl max-h-[70vh]" 
          }`}>
            
            <button 
              onClick={(e) => { e.stopPropagation(); setShowPromo(false); }}
              className="absolute top-4 right-4 z-[110] p-2 bg-black/40 hover:bg-white/20 backdrop-blur-md rounded-full text-white border border-white/10"
            >
              <X size={18} />
            </button>

            <button 
              onClick={toggleMute}
              className={`absolute z-[110] p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all border border-white/20 ${
                isMinimized ? "bottom-2 right-2 scale-75" : "bottom-8 right-8 scale-100"
              }`}
            >
              {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} className="text-purple-400" />}
            </button>

            <video 
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay 
              muted={isMuted} 
              loop
              playsInline
              onClick={() => isMinimized && setIsMinimized(false)}
            >
              <source src={promoVideo} type="video/mp4" />
            </video>
          </div>
        </div>
      )}

      {/* --- NAVBAR (Net Görüntü) --- */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-500 ${showPromo && !isMinimized ? 'opacity-0' : 'opacity-100'} bg-slate-950/80 border-b border-white/10`}>
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 font-black text-2xl tracking-tight">
            <Atom className="h-9 w-9 text-purple-400 animate-spin-slow" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-200 uppercase tracking-tighter">ResearchOS</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/login" className="text-slate-400 hover:text-white transition-colors">Giriş Yap</Link>
            <Link to="/register">
              <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold px-8 py-6 rounded-full shadow-lg border border-white/10 hover:scale-105 transition-all">
                <Sparkles size={18} className="mr-2" /> Kayıt Ol
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* --- HERO SECTION --- */}
      <main className={`transition-all duration-700 ${showPromo && !isMinimized ? 'opacity-30' : 'opacity-100'}`}>
        <section className="relative pt-48 pb-32 overflow-hidden">
            <div className="container mx-auto px-4 relative z-10">
                <div className="grid lg:grid-cols-2 gap-20 items-center">
                    <div className="text-left animate-in slide-in-from-left-10 duration-1000">
                        <span className="inline-flex items-center gap-2 bg-purple-500/10 text-purple-300 text-sm font-bold px-6 py-2 rounded-full mb-8 border border-purple-500/20">
                            <Zap size={16} className="text-yellow-400" /> AI-DRIVEN ECOSYSTEM
                        </span>
                        <h1 className="text-6xl lg:text-8xl font-black tracking-tighter mb-10 leading-[0.9]">
                            BUILD THE <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-300 to-indigo-400">FUTURE.</span>
                        </h1>
                        <p className="text-xl text-slate-400 max-w-lg mb-12 leading-relaxed border-l-2 border-purple-500/30 pl-6">
                            ResearchOS, anlamsal AI analizi ile projeleri yöneten ve otonom partner eşleşmesi sağlayan yeni nesil araştırma platformudur.
                        </p>
                        <Button onClick={() => navigate('/register')} className="h-16 px-12 bg-white text-slate-950 rounded-full font-black text-lg shadow-2xl hover:bg-slate-200 transition-all flex items-center gap-4">
                            Hemen Başla <ArrowRight size={24} />
                        </Button>
                    </div>

                    <div className="relative pointer-events-none">
                        <Carousel
                            plugins={[plugin.current]}
                            className="w-full rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(168,85,247,0.2)] border border-white/10 bg-slate-900"
                            opts={{ loop: true }}
                        >
                            <CarouselContent>
                                {sliderImages.map((image) => (
                                    <CarouselItem key={image.id}>
                                        <div className="relative aspect-[4/3]">
                                            <img src={image.src} alt={image.alt} className="object-cover w-full h-full" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                                        </div>
                                    </CarouselItem>
                                ))}
                            </CarouselContent>
                        </Carousel>
                    </div>
                </div>
            </div>
        </section>

        {/* --- NEDEN RESEARCHOS? (Afilli & Canlı Kartlar) --- */}
        <section className="py-32 bg-slate-950 relative z-10 border-t border-white/5">
            <div className="container mx-auto px-4 text-center">
                <div className="mb-24 relative inline-block">
                    {/* ✨ AFİLLİ BAŞLIK: Gradyan ve ışıltı eklendi */}
                    <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter relative z-10">
                      <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-white to-indigo-400 animate-pulse">
                        Neden ResearchOS?
                      </span>
                    </h2>
                    <div className="absolute -bottom-4 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50 blur-sm"></div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        { 
                          icon: BrainCircuit, 
                          title: "AI Semantik Eşleşme", 
                          desc: "Gemini AI destekli otonom partner bulma ekosistemi.", 
                          color: "from-purple-500/20" 
                        },
                        { 
                          icon: Users, 
                          title: "Dinamik İş Birliği", 
                          desc: "Gerçek zamanlı proje yönetimi ve otonom ekip kurma araçları.", 
                          color: "from-indigo-500/20" 
                        },
                        { 
                          icon: Atom, 
                          title: "Global Akademik Ağ", 
                          desc: "Dünya çapındaki araştırmacılarla anlık ve akıllı bağlantılar.", 
                          color: "from-blue-500/20" 
                        },
                    ].map((feature, idx) => (
                        <div key={idx} className="group relative bg-slate-900/40 p-12 rounded-[2rem] border border-white/5 hover:border-purple-500/40 transition-all duration-500 hover:-translate-y-3 shadow-xl overflow-hidden">
                            <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                            
                            <div className="relative z-10">
                                <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mb-8 mx-auto group-hover:scale-110 transition-transform duration-500 border border-white/10 group-hover:border-purple-500/50 shadow-inner">
                                    <feature.icon className="w-10 h-10 text-purple-400 group-hover:text-purple-200" />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-4 tracking-tight">{feature.title}</h3>
                                <p className="text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">
                                    {feature.desc}
                                </p>
                            </div>
                            
                            <div className="absolute bottom-0 left-0 w-0 h-1.5 bg-gradient-to-r from-purple-600 via-indigo-500 to-purple-600 group-hover:w-full transition-all duration-700" />
                        </div>
                    ))}
                </div>
            </div>
        </section>
      </main>
      
      <footer className="py-16 text-center text-slate-600 text-sm border-t border-white/5 bg-slate-950 uppercase tracking-[0.2em]">
          <div className="mb-4 flex justify-center gap-2 items-center opacity-50">
             <Atom size={16} className="animate-spin-slow" /> <span>ResearchOS 2025</span>
          </div>
          <p>© Milli Teknoloji Hamlesi Vizyonuyla.</p>
      </footer>
    </div>
  );
};

export default LandingPage;