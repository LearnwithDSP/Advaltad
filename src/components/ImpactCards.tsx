import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PROGRAM_CARDS } from "../data";
import { Icon } from "./Icon";

export const ImpactCards: React.FC = () => {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  return (
    <section id="programs" className="py-24 bg-gray-50 relative overflow-hidden">
      {/* Structural backgrounds */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-emerald-50/20 to-white/0 pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-16 gap-6">
          <div className="max-w-2xl space-y-3">
            <span className="text-xs uppercase font-bold tracking-widest text-emerald-600 font-sans flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Pillars of Sustainable Development
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-950 tracking-tight leading-none">
              Transformative Impact Programs
            </h2>
            <p className="text-gray-500 font-sans text-sm sm:text-base">
              Explore how we translate donations into tangible socio-economic self-reliance solutions across Sub-Saharan Africa.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-400 font-mono">Filter Status: All Assets Deployments Live</p>
          </div>
        </div>

        {/* Bento/Modern Grid for Program Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {PROGRAM_CARDS.map((program, idx) => {
            const isHovered = hoveredCard === program.id;
            return (
              <motion.div
                key={program.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ delay: idx * 0.08, duration: 0.5 }}
                onMouseEnter={() => setHoveredCard(program.id)}
                onMouseLeave={() => setHoveredCard(null)}
                className="group rounded-2xl bg-white border border-gray-100/80 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-emerald-950/5 hover:-translate-y-1.5 transition-all duration-300 flex flex-col h-full"
              >
                {/* Visual Image Header */}
                <div className="relative h-48 sm:h-52 overflow-hidden bg-slate-100 flex-shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-gray-950/20 to-transparent z-10" />
                  <img
                    src={program.image}
                    alt={program.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  
                  {/* Category Tag overlay */}
                  <div className="absolute top-4 left-4 z-20 px-2.5 py-1 bg-white/90 backdrop-blur-md rounded-lg border border-white/20 text-[10px] font-bold tracking-widest text-emerald-800 uppercase shadow-sm">
                    {program.category}
                  </div>

                  {/* Icon Indicator overlay */}
                  <div className="absolute bottom-4 right-4 z-20 w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20">
                    <Icon name={program.iconName} size={18} />
                  </div>
                </div>

                {/* Substantive Content */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-995 line-clamp-1 tracking-tight group-hover:text-emerald-700 transition-colors">
                      {program.title}
                    </h3>
                    <p className="text-gray-500 text-xs mt-3.5 leading-relaxed font-sans line-clamp-3">
                      {program.description}
                    </p>
                  </div>

                  {/* Quantitative verified stats metrics */}
                  <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Verified Achievements</p>
                      <p className="text-sm font-bold text-emerald-700 tracking-tight mt-0.5">
                        {program.impactMetric}
                      </p>
                    </div>

                    <a
                      href="#donate"
                      className="p-2 rounded-lg bg-gray-50 text-gray-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-all duration-200"
                      aria-label={`Donate to support ${program.title}`}
                    >
                      <Icon name="ArrowRight" size={16} />
                    </a>
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
