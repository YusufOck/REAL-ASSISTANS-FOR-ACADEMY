import { useState, useEffect, useRef, type MouseEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Atom,
  BrainCircuit,
  Users,
  Zap,
  ArrowRight,
  Sparkles,
  X,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

// 🚀 Asset Imports
import slider1 from "../assets/landing-slider/slider1.png";
import slider2 from "../assets/landing-slider/slider2.png";
import slider3 from "../assets/landing-slider/slider3.png";
import promoVideo from "../assets/researchOS.mp4";

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

  const plugin = useRef(
    Autoplay({ delay: 3000, stopOnInteraction: false, stopOnMouseEnter: false })
  );

  useEffect(() => {
    document.body.classList.toggle(
      "overflow-hidden",
      showPromo && !isMinimized
    );

    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [showPromo, isMinimized]);

  const handleMinimize = () => {
    setIsMinimized(true);
    setIsMuted(true);
    if (videoRef.current) videoRef.current.muted = true;
  };

  const toggleMute = (e: MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden font-sans">
      {/* 📹 PROMO VIDEO OVERLAY - Mobilde boyut ve pozisyon optimize edildi */}
      {showPromo && (
        <div
          className={`fixed z-[100] transition-all duration-700 ease-in-out ${
            isMinimized
              ? "bottom-4 right-4 md:bottom-8 md:right-8 w-48 sm:w-72 md:w-96 aspect-video"
              : "inset-0 flex items-center justify-center p-4 md:p-10"
          }`}
        >
          {!isMinimized && (
            <div
              className="absolute inset-0 bg-slate-950/85 animate-in fade-in duration-700 cursor-pointer"
              onClick={handleMinimize}
            />
          )}

          <div
            className={`relative w-full h-full overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.9)] border border-white/10 bg-black transition-all duration-700 ${
              isMinimized
                ? "rounded-xl md:rounded-2xl cursor-pointer"
                : "rounded-[2rem] md:rounded-[3rem] max-w-3xl max-h-[60vh] md:max-h-[70vh]"
            }`}
            onClick={() => isMinimized && setIsMinimized(false)}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPromo(false);
              }}
              className="absolute top-3 right-3 md:top-4 md:right-4 z-[110] p-2 bg-black/40 hover:bg-white/20 backdrop-blur-md rounded-full text-white border border-white/10 active:scale-90 transition-all"
              type="button"
            >
              {/* ÇÖZÜM: İkon boyutu Tailwind sınıfıyla yönetiliyor */}
              <X className="w-4 h-4 md:w-[18px] md:h-[18px]" />
            </button>

            <button
              onClick={toggleMute}
              className={`absolute z-[110] p-2.5 md:p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all border border-white/20 ${
                isMinimized ? "bottom-2 right-2 scale-75" : "bottom-6 right-6 md:bottom-8 md:right-8 scale-100"
              }`}
              type="button"
            >
              {isMuted ? <VolumeX className="w-5 h-5 md:w-6 md:h-6" /> : <Volume2 className="w-5 h-5 md:w-6 md:h-6 text-purple-400" />}
            </button>

            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              muted={isMuted}
              loop
              playsInline
            >
              <source src={promoVideo} type="video/mp4" />
            </video>
          </div>
        </div>
      )}

      {/* --- NAVBAR --- */}
      <header
        className={`fixed top-0 w-full z-50 transition-all duration-500 ${
          showPromo && !isMinimized ? "opacity-0 pointer-events-none" : "opacity-100"
        } bg-slate-950/80 border-b border-white/10 backdrop-blur-lg`}
      >
        <div className="container mx-auto px-4 h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3 font-black text-xl md:text-2xl tracking-tight">
            <Atom className="w-7 h-7 md:w-9 md:h-9 text-purple-400 animate-spin-slow" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-200 uppercase tracking-tighter shrink-0">
              ResearchOS
            </span>
          </div>
          <div className="flex items-center gap-4 md:gap-6">
            <Link to="/login" className="text-xs md:text-sm font-bold text-slate-400 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link to="/register">
              <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-[10px] md:text-xs px-4 md:px-8 py-4 md:py-6 rounded-full shadow-lg border border-white/10 hover:scale-105 transition-all uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5 md:w-[18px] md:h-[18px] mr-2" /> Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* --- HERO SECTION --- */}
      <main className={`transition-all duration-700 ${showPromo && !isMinimized ? "opacity-30" : "opacity-100"}`}>
        <section className="relative pt-32 md:pt-48 pb-16 md:pb-32 overflow-hidden">
          <div className="container mx-auto px-4 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <div className="text-left animate-in slide-in-from-left-10 duration-1000">
                <span className="inline-flex items-center gap-2 bg-purple-500/10 text-purple-300 text-[10px] md:text-sm font-black px-4 md:px-6 py-2 rounded-full mb-6 md:mb-8 border border-purple-500/20 uppercase tracking-widest">
                  <Zap className="w-3.5 h-3.5 md:w-4 md:h-4 text-yellow-400" /> AI-DRIVEN ECOSYSTEM
                </span>
                <h1 className="text-4xl md:text-6xl lg:text-8xl font-black tracking-tighter mb-6 md:mb-10 leading-[0.9] uppercase italic">
                  Build the <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-300 to-indigo-400">
                    Future.
                  </span>
                </h1>
                <p className="text-sm md:text-xl text-slate-400 max-w-lg mb-8 md:mb-12 leading-relaxed border-l-2 border-purple-500/30 pl-4 md:pl-6">
                  ResearchOS is a next-generation research platform that manages projects with semantic AI analysis and provides autonomous partner matching.
                </p>
                <Button
                  onClick={() => navigate("/register")}
                  className="w-full sm:w-auto h-14 md:h-16 px-8 md:px-12 bg-white text-slate-950 rounded-full font-black text-sm md:text-lg shadow-2xl hover:bg-slate-200 transition-all flex items-center justify-center gap-4 uppercase tracking-widest"
                >
                  Get Started <ArrowRight className="w-5 h-5 md:w-6 md:h-6" />
                </Button>
              </div>

              <div className="relative w-full overflow-hidden">
                <Carousel
                  plugins={[plugin.current]}
                  className="w-full rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(168,85,247,0.15)] border border-white/10 bg-slate-900"
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

        {/* --- WHY RESEARCHOS? --- */}
        <section className="py-20 md:py-32 bg-slate-950 relative z-10 border-t border-white/5">
          <div className="container mx-auto px-4 text-center">
            <div className="mb-16 md:mb-24 relative inline-block">
              <h2 className="text-3xl md:text-7xl font-black uppercase tracking-tighter relative z-10 italic">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-white to-indigo-400">
                  Why ResearchOS?
                </span>
              </h2>
              <div className="absolute -bottom-2 md:-bottom-4 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50 blur-sm"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              {[
                {
                  icon: BrainCircuit,
                  title: "AI Semantic Matching",
                  desc: "A Gemini AI-powered autonomous partner-finding ecosystem.",
                  color: "from-purple-500/20",
                },
                {
                  icon: Users,
                  title: "Dynamic Collaboration",
                  desc: "Real-time project management and autonomous team-building tools.",
                  color: "from-indigo-500/20",
                },
                {
                  icon: Atom,
                  title: "Global Academic Network",
                  desc: "Instant and intelligent connections with researchers worldwide.",
                  color: "from-blue-500/20",
                },
              ].map((feature, idx) => (
                <div
                  key={idx}
                  className="group relative bg-slate-900/40 p-8 md:p-12 rounded-[2rem] border border-white/5 hover:border-purple-500/40 transition-all duration-500 hover:-translate-y-2 shadow-xl overflow-hidden"
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${feature.color} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                  />

                  <div className="relative z-10">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-white/5 rounded-2xl flex items-center justify-center mb-6 md:mb-8 mx-auto group-hover:scale-110 transition-transform duration-500 border border-white/10 group-hover:border-purple-500/50 shadow-inner">
                      <feature.icon className="w-8 h-8 md:w-10 md:h-10 text-purple-400 group-hover:text-purple-200" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-black text-white mb-4 tracking-tight uppercase">{feature.title}</h3>
                    <p className="text-xs md:text-base text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">
                      {feature.desc}
                    </p>
                  </div>

                  <div className="absolute bottom-0 left-0 w-0 h-1 bg-gradient-to-r from-purple-600 via-indigo-500 to-purple-600 group-hover:w-full transition-all duration-700" />
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 md:py-16 text-center text-slate-600 text-[10px] md:text-sm border-t border-white/5 bg-slate-950 uppercase tracking-[0.2em]">
        <div className="mb-4 flex justify-center gap-2 items-center opacity-50">
          <Atom className="w-4 h-4 animate-spin-slow" /> <span>ResearchOS 2025</span>
        </div>
        <p>© With the vision of the National Technology Initiative.</p>
      </footer>
    </div>
  );
};

export default LandingPage;