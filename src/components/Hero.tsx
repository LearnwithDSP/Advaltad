import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Icon } from "./Icon";

interface HeroProps {
  onDonateClick: () => void;
  onAmbassadorClick: () => void;
}

const ROTATING_MISSIONS = [
  "Empowering Africa’s Youth",
  "Creating Opportunities for Growth",
  "Building Sustainable Communities",
  "Humanitarian Housing Initiatives",
  "Unlocking Human Potential"
];

export const Hero: React.FC<HeroProps> = ({ onDonateClick, onAmbassadorClick }) => {
  const [missionIndex, setMissionIndex] = useState(0);

  // Set up autoplaying rotating statement index
  useEffect(() => {
    const interval = setInterval(() => {
      setMissionIndex((prev) => (prev + 1) % ROTATING_MISSIONS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-950 via-slate-900 to-indigo-950 pt-20"
    >
      {/* Dynamic Background Motion - Floating Ambient Orbs */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Orb 1: Soft Green Wave */}
        <motion.div
          animate={{
            x: [0, 40, -20, 0],
            y: [0, -60, 40, 0],
            scale: [1, 1.15, 0.9, 1]
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-emerald-500/10 blur-[100px]"
        />
        {/* Orb 2: Teal Wave */}
        <motion.div
          animate={{
            x: [0, -50, 30, 0],
            y: [0, 50, -30, 0],
            scale: [1, 0.9, 1.2, 1]
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-teal-400/10 blur-[120px]"
        />
        {/* Orb 3: Soft Indigo Indigo Deep Ambient */}
        <motion.div
          animate={{
            x: [0, 30, -30, 0],
            y: [0, 30, 40, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 4
          }}
          className="absolute top-1/3 right-1/3 w-[500px] h-[500px] rounded-full bg-indigo-500/5 blur-[150px]"
        />

        {/* Cinematic Grid Lines Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      {/* Hero Visual Imagery Side Mask (Diagonal glow for modern premium look) */}
      <div className="absolute right-0 bottom-0 w-full lg:w-1/2 h-1/2 lg:h-full opacity-20 pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-l from-emerald-500/20 via-transparent to-transparent" />
        <img
          src="https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=1200"
          alt="African youth smiling together and aiming higher"
          className="w-full h-full object-cover filter grayscale contrast-125 select-none"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Main Content Card Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center lg:text-left w-full">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-8 flex flex-col space-y-8">
            {/* Soft Premium Tag-line Card */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 self-center lg:self-start px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs uppercase tracking-wider text-emerald-300 font-bold font-sans">
                Advaltad Growth & Support Foundation
              </span>
            </motion.div>

            {/* Rotating Mission Statements */}
            <div className="space-y-4">
              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-sans font-extrabold text-white leading-[1.1] tracking-tight"
              >
                Adding Value to
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200">
                  Africa’s Future
                </span>
              </motion.h1>

              {/* Dynamic Mission Rotation Height Guard */}
              <div className="h-16 sm:h-20 lg:h-24 flex items-center justify-center lg:justify-start overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={missionIndex}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 150, damping: 15 }}
                    className="text-lg sm:text-2xl md:text-3xl font-medium text-emerald-100/90 font-sans tracking-tight"
                  >
                    {ROTATING_MISSIONS[missionIndex]}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>

            {/* Inspiring paragraph with highly cinematic editorial copy */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-base sm:text-lg text-slate-300/90 max-w-2xl mx-auto lg:mx-0 font-sans leading-relaxed"
            >
              We are a global impact coalition driving youth tech acceleration, primary healthcare accessibility, structural safety through eco-sustainable housing, and direct educational funding across Sub-Saharan Africa. Join our mission today.
            </motion.p>

            {/* Dynamic Interactive CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
            >
              <button
                id="hero-primary-cta"
                onClick={onDonateClick}
                className="w-full sm:w-auto px-5 py-3 sm:px-8 sm:py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm sm:text-base shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2.5 group cursor-pointer"
              >
                <Icon name="Heart" size={18} className="fill-white/20 group-hover:scale-110 transition-transform duration-200" />
                Support Our Mission
              </button>

              <button
                id="hero-secondary-cta"
                onClick={onAmbassadorClick}
                className="w-full sm:w-auto px-5 py-3 sm:px-8 sm:py-4 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-white font-bold text-sm sm:text-base backdrop-blur-sm shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer"
              >
                Become a Growth Ambassador
                <Icon name="ArrowRight" size={16} className="text-emerald-400 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          </div>

          {/* Side Visual Stat Cards Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="lg:col-span-4 hidden lg:flex flex-col gap-4"
          >
            {/* Stat Card 1 */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-lg hover:border-emerald-500/20 transition-all duration-300">
              <span className="text-3xl font-bold text-white block">12,500+</span>
              <span className="text-xs uppercase text-emerald-400 font-bold tracking-wider">Graduates Empowerment Catalysts</span>
              <p className="text-xs text-slate-400 mt-1">Nurtured with specialized technological skills labs & mentors.</p>
            </div>

            {/* Stat Card 2 */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-lg hover:border-emerald-500/20 transition-all duration-300">
              <span className="text-3xl font-bold text-white block">450+</span>
              <span className="text-xs uppercase text-emerald-400 font-bold tracking-wider">Sustainable Shelter Foundations</span>
              <p className="text-xs text-slate-400 mt-1">Dignified Eco-Adobe brick structures completed for displaced families.</p>
            </div>

            {/* Stat Card 3 */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-lg hover:border-emerald-500/20 transition-all duration-300">
              <span className="text-3xl font-bold text-white block">$0.91 / $1.00</span>
              <span className="text-xs uppercase text-emerald-400 font-bold tracking-wider">Direct Field Allocation Ratio</span>
              <p className="text-xs text-slate-400 mt-1">Audited transparency ensuring donations impact lives directly.</p>
            </div>
          </motion.div>

        </div>
      </div>

      {/* Elegant scroll anchor indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer pointer-events-auto"
        onClick={() => {
          document.querySelector("#about")?.scrollIntoView({ behavior: "smooth" });
        }}
      >
        <span className="text-[10px] uppercase tracking-widest font-bold">Learn More</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <Icon name="ChevronDown" size={16} className="text-emerald-400" />
        </motion.div>
      </div>

    </section>
  );
};
