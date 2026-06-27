import React from "react";
import { motion } from "motion/react";
import { Icon } from "./Icon";

interface HeroProps {
  onDonateClick: () => void;
  onAmbassadorClick: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onDonateClick, onAmbassadorClick }) => {
  return (
    <div id="home" className="relative bg-white pt-24 overflow-hidden">
      {/* Cinematic Background Row */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=2000"
          alt="African children smiling, hopeful futures"
          className="w-full h-full object-cover object-center filter brightness-[0.95]"
          referrerPolicy="no-referrer"
        />
        {/* Modern white overlay with elegant transparency and subtle color bleed */}
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-white/75 sm:to-white/80" />
        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 pt-16 pb-12 sm:pt-24 sm:pb-16">
        <div className="max-w-3xl">
          {/* Subtle Accent Label */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2 mb-6"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
            <span className="text-xs uppercase font-extrabold tracking-widest text-brand-primary font-display">
              ADDING VALUE TO AFRICA'S DEVELOPMENT
            </span>
          </motion.div>

          {/* Large Bold Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.7 }}
            className="text-4xl sm:text-5xl md:text-6xl font-display font-black text-brand-charcoal leading-[1.1] tracking-tight"
          >
            Creating Opportunities <br />
            <span className="text-brand-primary">That Transform Lives</span> <br />
            Across Africa
          </motion.h1>

          {/* Subheadline with maximum paragraph spacing and line width limit */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="mt-6 text-lg text-slate-600 max-w-[620px] leading-relaxed font-sans"
          >
            Empowering communities through quality education, software & technology labs, primary healthcare networks, and sustainable eco-infrastructure development.
          </motion.p>

          {/* Premium CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="mt-8 flex flex-col sm:flex-row items-center gap-4"
          >
            <button
              id="hero-donate-cta"
              onClick={onDonateClick}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-brand-primary hover:bg-emerald-900 text-white font-bold text-sm tracking-wide shadow-lg shadow-brand-primary/10 hover:shadow-brand-primary/20 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 group"
            >
              <Icon name="Heart" size={16} className="fill-white/10 group-hover:scale-110 transition-transform duration-200" />
              Support Our Mission
            </button>

            <button
              id="hero-impact-cta"
              onClick={() => {
                window.location.hash = "#/about";
              }}
              className="w-full sm:w-auto px-8 py-4 rounded-xl border border-slate-200 bg-white/60 hover:bg-slate-50 text-slate-800 font-bold text-sm hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
            >
              View Our Impact
              <Icon name="ArrowRight" size={14} className="text-brand-primary" />
            </button>
          </motion.div>
        </div>

        {/* 4 Elegant Rounded Stat Cards with soft shadows and white backgrounds */}
        <div className="mt-16 sm:mt-24 grid grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.6 }}
            className="bg-white p-6 sm:p-8 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-slate-100 hover:shadow-[0_12px_40px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300"
          >
            <span className="text-3xl sm:text-4xl font-display font-extrabold text-brand-primary block leading-none">
              12,500+
            </span>
            <span className="text-xs uppercase font-extrabold text-slate-400 tracking-wider block mt-3">
              Lives Impacted
            </span>
            <p className="text-xs text-slate-500 mt-2 font-sans leading-relaxed">
              Educated and trained through software and technological skills labs.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.6 }}
            className="bg-white p-6 sm:p-8 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-slate-100 hover:shadow-[0_12px_40px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300"
          >
            <span className="text-3xl sm:text-4xl font-display font-extrabold text-brand-primary block leading-none">
              450+
            </span>
            <span className="text-xs uppercase font-extrabold text-slate-400 tracking-wider block mt-3">
              Communities Reached
            </span>
            <p className="text-xs text-slate-500 mt-2 font-sans leading-relaxed">
              Supported with access to healthcare, water wells, and eco-housing.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.6 }}
            className="bg-white p-6 sm:p-8 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-slate-100 hover:shadow-[0_12px_40px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300"
          >
            <span className="text-3xl sm:text-4xl font-display font-extrabold text-brand-primary block leading-none">
              $1M+
            </span>
            <span className="text-xs uppercase font-extrabold text-slate-400 tracking-wider block mt-3">
              Resources Mobilized
            </span>
            <p className="text-xs text-slate-500 mt-2 font-sans leading-relaxed">
              Allocated directly to Sub-Saharan field development programs.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.6 }}
            className="bg-white p-6 sm:p-8 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-slate-100 hover:shadow-[0_12px_40px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300"
          >
            <span className="text-3xl sm:text-4xl font-display font-extrabold text-brand-primary block leading-none">
              15+
            </span>
            <span className="text-xs uppercase font-extrabold text-slate-400 tracking-wider block mt-3">
              Countries Engaged
            </span>
            <p className="text-xs text-slate-500 mt-2 font-sans leading-relaxed">
              Active growth corridors driving community-owned development.
            </p>
          </motion.div>
        </div>

        {/* Elegant Trust Bar right below stats */}
        <div className="mt-16 pt-8 border-t border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <span className="text-xs text-slate-400 font-display font-semibold tracking-wide">
            Trusted by organizations and partners committed to Africa's future:
          </span>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4 filter grayscale opacity-40 hover:opacity-75 transition-opacity duration-300">
            <span className="font-display font-black text-sm tracking-widest text-[#1E293B]">UNICEF</span>
            <span className="font-display font-black text-sm tracking-widest text-[#1E293B]">UNESCO</span>
            <span className="font-display font-black text-sm tracking-wider text-[#1E293B]">BILL & MELINDA GATES</span>
            <span className="font-display font-black text-sm tracking-widest text-[#1E293B]">ACUMEN</span>
            <span className="font-display font-black text-sm tracking-wide text-[#1E293B]">USAID</span>
          </div>
        </div>

      </div>
    </div>
  );
};
