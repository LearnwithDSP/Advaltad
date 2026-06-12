import React from "react";
import { motion } from "motion/react";
import { Icon } from "./Icon";

interface Pillar {
  id: string;
  iconName: string;
  title: string;
  sentence: string;
}

const PILLARS: Pillar[] = [
  {
    id: "education",
    iconName: "GraduationCap",
    title: "Education",
    sentence: "Providing educational scholarships, digital laboratories, and rebuilt school facilities to empower Sub-Saharan youth."
  },
  {
    id: "healthcare",
    iconName: "HeartPulse",
    title: "Healthcare",
    sentence: "Deploying responsive mobile medical structures and specialized healthcare clinics deep within isolated provinces."
  },
  {
    id: "empowerment",
    iconName: "TrendingUp",
    title: "Economic Empowerment",
    sentence: "Fostering local tech hubs, digital mastery incubators, and startup seed grants for grassroot co-operatives."
  },
  {
    id: "sustainability",
    iconName: "Globe",
    title: "Sustainability",
    sentence: "Constructing hybrid water systems and mini solar microgrids to fuel long-term ecological agricultural assets."
  }
];

export const ImpactCards: React.FC = () => {
  return (
    <section id="impact-pillars" className="py-24 sm:py-32 bg-[#F7F8FA] relative overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-2xl mb-16 sm:mb-20 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
            <span className="text-xs uppercase font-extrabold tracking-widest text-brand-primary font-display">
              IMPACT PILLARS
            </span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl font-display font-black text-brand-charcoal tracking-tight leading-none">
            Our Key Areas of Focus
          </h2>
          <p className="text-slate-500 font-sans text-base max-w-[600px] leading-relaxed">
            We structure long-term interventions across Sub-Saharan Africa. Guided by local knowledge and operated by native talents.
          </p>
        </div>

        {/* 4 Premium Cards Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {PILLARS.map((pillar, idx) => {
            return (
              <motion.div
                key={pillar.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ delay: idx * 0.1, duration: 0.6 }}
                className="bg-white p-8 rounded-[32px] shadow-[0_4px_25px_rgba(0,0,0,0.02)] border border-slate-50 hover:shadow-[0_16px_40px_rgba(0,0,0,0.04)] hover:-translate-y-2 transition-all duration-300 flex flex-col justify-between h-full group"
              >
                <div>
                  {/* Large Icon Container */}
                  <div className="w-14 h-14 rounded-2xl bg-[#DDEBE5] text-brand-primary flex items-center justify-center mb-8 group-hover:bg-brand-primary group-hover:text-white transition-colors duration-300">
                    <Icon name={pillar.iconName} size={24} />
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-display font-extrabold text-[#1E293B] tracking-tight">
                    {pillar.title}
                  </h3>

                  {/* One-sentence explanation */}
                  <p className="text-slate-500 text-sm mt-3 leading-relaxed font-sans">
                    {pillar.sentence}
                  </p>
                </div>

                {/* Learn More arrow at foot */}
                <div className="mt-8 flex items-center gap-1.5 text-brand-primary text-xs font-bold font-display cursor-pointer hover:underline">
                  <span>Learn More</span>
                  <Icon
                    name="ChevronRight"
                    size={14}
                    className="transform group-hover:translate-x-1.5 transition-transform duration-300"
                  />
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
