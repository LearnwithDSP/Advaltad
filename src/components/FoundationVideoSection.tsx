import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Icon } from "./Icon";
import logoUrl from "../assets/images/Advaltad Logo.jpeg";

interface FoundationVideoSectionProps {
  onDonateClick: () => void;
  onAmbassadorClick: () => void;
  onNavigate: (route: string) => void;
  videoSrc?: string;
}

interface Chapter {
  id: string;
  time: number;
  timeFormatted: string;
  title: string;
  subtitle: string;
  icon: string;
}

const CHAPTERS: Chapter[] = [
  {
    id: "c1",
    time: 0,
    timeFormatted: "00:00",
    title: "Official Foundation Seal",
    subtitle: "Advaltad Growth and Support Foundation",
    icon: "Shield"
  },
  {
    id: "c2",
    time: 6,
    timeFormatted: "00:06",
    title: "Empowering Africa's Future",
    subtitle: "Committed to creating sustainable opportunities across the continent",
    icon: "Globe"
  },
  {
    id: "c3",
    time: 13,
    timeFormatted: "00:13",
    title: "Growth Ambassador Mission",
    subtitle: "Fueling grassroots vision & driving measurable community impact",
    icon: "Crown"
  },
  {
    id: "c4",
    time: 19,
    timeFormatted: "00:19",
    title: "Adding Value to Development",
    subtitle: "Unlocking youth potential, tech hubs, healthcare & eco-housing",
    icon: "TrendingUp"
  }
];

export const FoundationVideoSection: React.FC<FoundationVideoSectionProps> = ({
  onDonateClick,
  onAmbassadorClick,
  onNavigate,
  videoSrc
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(24);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [useCustomUrl, setUseCustomUrl] = useState(false);
  const [customVideoUrl, setCustomVideoUrl] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);

  // Default video URL or embedded blob if provided
  const activeVideoSrc = customVideoUrl || videoSrc;

  // Handle simulated progress if HTML5 video has no external source
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying && (!videoRef.current || !videoRef.current.src || videoRef.current.error)) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= duration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, duration]);

  // Sync active chapter based on current time
  useEffect(() => {
    if (currentTime >= 19) {
      setActiveChapterIndex(3);
    } else if (currentTime >= 13) {
      setActiveChapterIndex(2);
    } else if (currentTime >= 6) {
      setActiveChapterIndex(1);
    } else {
      setActiveChapterIndex(0);
    }
  }, [currentTime]);

  const togglePlay = () => {
    if (videoRef.current && activeVideoSrc) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {
          // Fallback to simulated playback if browser blocks autoplay or video fails
        });
      }
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
    setIsMuted(!isMuted);
  };

  const seekTo = (time: number) => {
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = Math.round(percentage * duration);
    seekTo(newTime);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <section className="py-20 bg-[#080D0B] text-white relative overflow-hidden border-y border-emerald-950/80">
      {/* Background Glows & Metallic Accents */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Subtle Pattern Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#10B981_1px,transparent_1px)] [background-size:24px_24px] opacity-5 pointer-events-none" />

      <div className="max-w-[1240px] mx-auto px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-800/50 text-emerald-400 text-xs font-display font-extrabold uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              FOUNDATION SHOWCASE • ADVALTAD GROWTH AMBASSADOR
            </div>
            <h2 className="text-3xl sm:text-4xl font-display font-black tracking-tight text-white leading-tight">
              Empowering Africa’s Future & <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-emerald-400">
                Adding Value to Africa's Development
              </span>
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed font-sans max-w-xl">
              Watch our official Growth Ambassador video reel, outlining the core mission, values, and community impact driving Advaltad Foundation across Africa.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-display font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
            >
              <Icon name="Share2" size={14} className="text-amber-400" />
              Share Reel
            </button>

            <button
              onClick={onAmbassadorClick}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-display font-black uppercase tracking-wider shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Icon name="Crown" size={15} />
              Become Ambassador
            </button>
          </div>
        </div>

        {/* Main Video & Content Grid */}
        <div className="grid lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Left Column: Video Container */}
          <div className="lg:col-span-8 flex flex-col justify-between">
            <div className="relative rounded-2xl overflow-hidden border border-amber-500/20 bg-slate-950 shadow-[0_20px_50px_rgba(0,0,0,0.8)] group">
              
              {/* Video Player Frame */}
              <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
                {activeVideoSrc ? (
                  <video
                    ref={videoRef}
                    src={activeVideoSrc}
                    className="w-full h-full object-contain"
                    onTimeUpdate={() => {
                      if (videoRef.current) {
                        setCurrentTime(videoRef.current.currentTime);
                        setDuration(videoRef.current.duration || 24);
                      }
                    }}
                    onEnded={() => setIsPlaying(false)}
                    playsInline
                  />
                ) : (
                  /* Animated 3D Badge Simulation Fallback */
                  <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#0F1C16] via-[#09120E] to-[#181106] p-8 text-center select-none overflow-hidden">
                    
                    {/* Animated Golden Rays */}
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.15)_0,transparent_70%)] pointer-events-none"
                    />

                    {/* 3D Rotating Golden Shield Badge Graphic */}
                    <motion.div
                      animate={isPlaying ? { rotateY: [0, 180, 360], scale: [0.98, 1.02, 0.98] } : { rotateY: 0, scale: 1 }}
                      transition={{ duration: 8, repeat: isPlaying ? Infinity : 0, ease: "easeInOut" }}
                      className="relative z-10 w-32 h-32 sm:w-40 sm:h-40 rounded-3xl bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 p-1 shadow-[0_0_50px_rgba(245,158,11,0.3)] flex items-center justify-center mb-6"
                    >
                      <div className="w-full h-full bg-[#0D1813] rounded-[22px] p-3 flex flex-col items-center justify-center border border-amber-400/40 text-center relative overflow-hidden">
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Icon key={i} name="Crown" size={10} className="text-amber-400 fill-amber-400" />
                          ))}
                        </div>
                        <img src={logoUrl} alt="Advaltad Logo" className="w-12 h-12 rounded-lg object-cover mb-1 border border-amber-400/50 shadow-md" />
                        <span className="font-display font-black text-[10px] uppercase tracking-wider text-amber-300">
                          ADVALTAD FOUNDATION
                        </span>
                        <span className="font-display font-extrabold text-[9px] uppercase tracking-widest text-emerald-400 mt-0.5">
                          GROWTH AMBASSADOR
                        </span>
                      </div>
                    </motion.div>

                    {/* On-screen Video Subtitles / Caption Overlay */}
                    <div className="relative z-10 max-w-lg space-y-1 bg-slate-950/80 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 shadow-2xl">
                      <span className="text-[10px] font-display font-extrabold uppercase tracking-widest text-amber-400 block">
                        {CHAPTERS[activeChapterIndex].timeFormatted} • {CHAPTERS[activeChapterIndex].title}
                      </span>
                      <p className="text-sm font-display font-bold text-white tracking-wide leading-snug">
                        "{CHAPTERS[activeChapterIndex].subtitle}"
                      </p>
                    </div>
                  </div>
                )}

                {/* Center Play Overlay Button */}
                {!isPlaying && (
                  <button
                    onClick={togglePlay}
                    className="absolute z-20 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-amber-500 to-emerald-500 text-slate-950 flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.5)] hover:scale-110 active:scale-95 transition-all cursor-pointer group/btn"
                  >
                    <Icon name="Play" size={32} className="ml-1 fill-slate-950 group-hover/btn:scale-110 transition-transform" />
                  </button>
                )}

                {/* Top Overlay Badge */}
                <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-slate-950/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[11px] font-display font-bold text-slate-200">
                  <Icon name="Video" size={13} className="text-amber-400" />
                  Official Foundation Video
                </div>
              </div>

              {/* Video Player Controls Bar */}
              <div className="bg-slate-950 p-4 border-t border-white/10 flex flex-col gap-3">
                {/* Progress Bar */}
                <div
                  ref={progressRef}
                  onClick={handleProgressBarClick}
                  className="w-full h-2 bg-white/10 hover:h-3 rounded-full cursor-pointer relative transition-all overflow-hidden"
                >
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full relative"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  />
                </div>

                {/* Buttons & Time */}
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={togglePlay}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-amber-400 transition-colors cursor-pointer"
                      title={isPlaying ? "Pause" : "Play"}
                    >
                      <Icon name={isPlaying ? "Pause" : "Play"} size={16} />
                    </button>

                    <button
                      onClick={toggleMute}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors cursor-pointer"
                      title={isMuted ? "Unmute" : "Mute"}
                    >
                      <Icon name={isMuted ? "VolumeX" : "Volume2"} size={16} />
                    </button>

                    <span className="font-mono text-[11px] text-slate-400">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => seekTo(0)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="Replay from start"
                    >
                      <Icon name="RotateCcw" size={14} />
                    </button>

                    <button
                      onClick={() => setIsFullscreen(!isFullscreen)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="Toggle Fullscreen Lightbox"
                    >
                      <Icon name="Maximize2" size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sub-bar URL Linker option */}
            <div className="mt-4 flex items-center justify-between text-xs text-slate-400 bg-white/5 p-3 rounded-xl border border-white/5">
              <span className="flex items-center gap-2 font-display font-medium">
                <Icon name="Info" size={14} className="text-amber-400 shrink-0" />
                Have a direct MP4 link for this video?
              </span>
              <button
                onClick={() => setUseCustomUrl(!useCustomUrl)}
                className="text-amber-400 hover:text-amber-300 font-display font-bold underline cursor-pointer"
              >
                {useCustomUrl ? "Hide URL Input" : "Paste Video URL"}
              </button>
            </div>

            {useCustomUrl && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-2 p-3 bg-slate-900 rounded-xl border border-amber-500/30 space-y-2"
              >
                <label className="text-[11px] text-slate-300 font-display font-bold block">
                  Paste hosted MP4 / WebM URL:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://example.com/video.mp4"
                    value={customVideoUrl}
                    onChange={(e) => setCustomVideoUrl(e.target.value)}
                    className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                  <button
                    onClick={() => {
                      if (customVideoUrl) {
                        setIsPlaying(true);
                      }
                    }}
                    className="px-3 py-1.5 bg-amber-500 text-slate-950 rounded-lg font-display font-bold text-xs"
                  >
                    Load & Play
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Column: Interactive Video Chapters & Growth Ambassador Pillars */}
          <div className="lg:col-span-4 flex flex-col justify-between space-y-4">
            <div className="bg-slate-900/90 rounded-2xl p-6 border border-white/10 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="font-display font-black text-sm uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <Icon name="Sparkles" size={16} />
                  Video Chapters
                </h3>
                <span className="text-[10px] font-mono bg-white/10 text-slate-300 px-2 py-0.5 rounded-full">
                  24 SEC REEL
                </span>
              </div>

              <div className="space-y-2.5">
                {CHAPTERS.map((chap, idx) => {
                  const isActive = activeChapterIndex === idx;
                  return (
                    <button
                      key={chap.id}
                      onClick={() => seekTo(chap.time)}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 group ${
                        isActive
                          ? "bg-gradient-to-r from-amber-500/20 to-emerald-500/10 border-amber-500/50 text-white shadow-lg shadow-amber-500/5"
                          : "bg-white/5 hover:bg-white/10 border-white/5 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-mono text-xs font-bold ${
                          isActive
                            ? "bg-amber-400 text-slate-950"
                            : "bg-white/10 text-slate-300 group-hover:bg-white/20"
                        }`}
                      >
                        {chap.timeFormatted}
                      </div>

                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4
                            className={`font-display font-extrabold text-xs truncate ${
                              isActive ? "text-amber-300" : "text-white"
                            }`}
                          >
                            {chap.title}
                          </h4>
                          {isActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 animate-ping" />
                          )}
                        </div>
                        <p className="text-[11px] leading-snug line-clamp-2 text-slate-400 font-sans">
                          {chap.subtitle}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Impact Quote Box */}
            <div className="bg-gradient-to-br from-emerald-950/80 to-slate-950 p-6 rounded-2xl border border-emerald-500/30 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-display font-extrabold uppercase tracking-wider">
                <Icon name="Crown" size={14} />
                FOUNDATION PLEDGE
              </div>
              <p className="text-xs text-slate-300 italic leading-relaxed">
                "At Advaltad Foundation we are committed in empowering Africa's future and creating opportunities... Fueling our mission and creating impact."
              </p>
              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <button
                  onClick={onDonateClick}
                  className="text-xs font-display font-black text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                >
                  Sponsor AVU Tokens <Icon name="ArrowRight" size={12} />
                </button>
                <button
                  onClick={() => onNavigate("#/about")}
                  className="text-xs font-display font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  About Us
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Lightbox Fullscreen Modal */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-8"
          >
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <Icon name="X" size={24} />
            </button>

            <div className="w-full max-w-5xl aspect-video rounded-2xl overflow-hidden border border-amber-500/40 bg-black relative flex items-center justify-center">
              {activeVideoSrc ? (
                <video
                  src={activeVideoSrc}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center space-y-4 p-8">
                  <img src={logoUrl} alt="Logo" className="w-20 h-20 rounded-2xl mx-auto border border-amber-400 shadow-xl" />
                  <h3 className="text-2xl font-display font-black text-amber-300">
                    ADVALTAD FOUNDATION • GROWTH AMBASSADOR
                  </h3>
                  <p className="text-slate-300 text-sm max-w-md mx-auto">
                    "Empowering Africa's future and creating opportunities. Adding value to Africa's development."
                  </p>
                  <button
                    onClick={() => setIsFullscreen(false)}
                    className="px-6 py-2.5 bg-amber-500 text-slate-950 font-display font-bold text-xs rounded-xl uppercase tracking-wider"
                  >
                    Close Lightbox
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        {isShareModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-4 text-white">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-black text-lg text-amber-400 flex items-center gap-2">
                  <Icon name="Share2" size={18} />
                  Share Growth Ambassador Video
                </h3>
                <button
                  onClick={() => setIsShareModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <Icon name="X" size={18} />
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Help spread Advaltad Foundation's message across social networks and community channels.
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={window.location.href}
                  className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
                />
                <button
                  onClick={handleShare}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  {copiedLink ? "Copied!" : "Copy Link"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </section>
  );
};
