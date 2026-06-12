import React from "react";
import { motion } from "motion/react";
import { Icon } from "./Icon";

interface FeaturedProgram {
  id: string;
  image: string;
  title: string;
  desc: string;
  impact: string;
}

const FEATURED_PROGRAMS: FeaturedProgram[] = [
  {
    id: "tech-hubs",
    image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1200",
    title: "Youth Tech-Hubs & Accelerator",
    desc: "Establishing advanced digital learning labs to teach programming, software design, and modern entrepreneurship.",
    impact: "12,500+ Graduates Certified"
  },
  {
    id: "scholarships",
    image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=1200",
    title: "NextGen Education Support",
    desc: "Distributing modernized curriculum bundles and fully funding secondary academic scholarships for disadvantaged youth.",
    impact: "85 Public Schools Supported"
  },
  {
    id: "shelter",
    image: "https://images.unsplash.com/photo-1448630360428-65456885c650?q=80&w=1200",
    title: "Eco-Adobe Sustainable Shelter",
    desc: "Constructing safe, low-impact compressed-earth housing units for rural and climate-displaced households.",
    impact: "450 Families Re-homed"
  }
];

interface CtaStripProps {
  onDonateClick: () => void;
  onAmbassadorClick: () => void;
}

export const CtaStrip: React.FC<CtaStripProps> = ({ onDonateClick, onAmbassadorClick }) => {
  return (
    <section id="featured-programs" className="py-24 sm:py-32 bg-white relative overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div className="space-y-4 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
              <span className="text-xs uppercase font-extrabold tracking-widest text-brand-primary font-display">
                ACTIVE PROGRAMS
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-display font-black text-brand-charcoal tracking-tight leading-none">
              Featured Initiatives
            </h2>
            <p className="text-slate-500 font-sans text-base leading-relaxed">
              Transparent, scalable programs built around local communities. Designed to achieve rapid and independent economic operations.
            </p>
          </div>
          
          <div>
            <button
              onClick={() => {
                document.getElementById("donate")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="px-6 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-brand-charcoal font-bold text-xs transition-colors cursor-pointer"
            >
              Learn More Programs
            </button>
          </div>
        </div>

        {/* 3 Modern Cards Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {FEATURED_PROGRAMS.map((prog, idx) => {
            return (
              <motion.div
                key={prog.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ delay: idx * 0.1, duration: 0.6 }}
                className="group rounded-[28px] bg-white border border-slate-100 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_20px_45px_rgb(0,0,0,0.05)] hover:-translate-y-2 transition-all duration-300 flex flex-col"
              >
                {/* Image Container */}
                <div className="relative h-56 overflow-hidden bg-slate-50 flex-shrink-0">
                  <img
                    src={prog.image}
                    alt={prog.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  {/* Subtle Accent impact pill overlay */}
                  <div className="absolute top-4 left-4 z-10 px-3.5 py-1.5 bg-[#0E5A45]/90 backdrop-blur-sm rounded-full text-[10px] font-bold tracking-wider text-[#DDEBE5] uppercase">
                    {prog.impact}
                  </div>
                </div>

                {/* Card Content block */}
                <div className="p-8 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <h3 className="text-lg font-display font-black text-brand-charcoal tracking-tight leading-snug group-hover:text-brand-primary transition-colors">
                      {prog.title}
                    </h3>
                    <p className="text-slate-500 text-sm leading-relaxed font-sans max-w-[280px]">
                      {prog.desc}
                    </p>
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-50">
                    <button
                      onClick={onDonateClick}
                      className="text-brand-primary hover:text-emerald-900 font-display font-extrabold text-xs tracking-wider flex items-center gap-1.5 cursor-pointer uppercase"
                    >
                      View Program <span className="transform group-hover:translate-x-1.5 transition-transform">→</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
