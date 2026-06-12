import React from "react";
import { motion } from "motion/react";
import { Hero } from "../components/Hero";
import { ImpactByNumbers } from "../components/ImpactByNumbers";
import { CtaStrip } from "../components/CtaStrip";
import { Icon } from "../components/Icon";

interface HomePageProps {
  onNavigate: (route: string) => void;
  onDonateClick: () => void;
  onAmbassadorClick: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  onDonateClick,
  onAmbassadorClick
}) => {
  return (
    <div className="space-y-0">
      {/* Cinematic Hero */}
      <Hero
        onDonateClick={onDonateClick}
        onAmbassadorClick={onAmbassadorClick}
      />

      {/* Trust & Impact in Solid Numbers */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-120px" }}
        transition={{ duration: 0.6 }}
      >
        <ImpactByNumbers />
      </motion.div>

      {/* Brief Focus Pillars Overview */}
      <section className="py-20 bg-white border-y border-slate-50 relative overflow-hidden">
        <div className="max-w-[1240px] mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12 sm:mb-16">
            <div className="max-w-xl space-y-3 text-left">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                <span className="text-xs uppercase font-extrabold tracking-widest text-brand-primary font-display">
                  SOCIETAL VALUE SHIFT
                </span>
              </div>
              <h2 className="text-3xl font-display font-black text-brand-charcoal tracking-tight leading-tight">
                Our Areas of Development
              </h2>
            </div>
            
            <button
              onClick={() => onNavigate("#/programs")}
              className="mt-4 md:mt-0 px-6 py-3 border border-slate-200 hover:border-brand-primary rounded-xl bg-white text-brand-charcoal hover:text-brand-primary font-display font-black text-xs tracking-wider uppercase transition-all duration-200 flex items-center gap-1.5"
            >
              Learn About Programs
              <Icon name="ArrowRight" size={14} />
            </button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                id: "youth",
                title: "Youth Tech Labs",
                desc: "Equipping talented youths with modern software, computers, and professional mentors.",
                icon: "Cpu"
              },
              {
                id: "education",
                title: "Scholastic Sinks",
                desc: "Rehabilitating public schools and supplying standardized textbooks and scholarships.",
                icon: "GraduationCap"
              },
              {
                id: "health",
                title: "Mobile Clinics",
                desc: "Deploying healthcare units and counselors deep into underserved rural municipalities.",
                icon: "HeartPulse"
              },
              {
                id: "sustainability",
                title: "Eco Grids",
                desc: "Wiring clean solar grids and boring solar water systems for local agriculture cooperative farms.",
                icon: "Globe"
              }
            ].map((p, idx) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1, duration: 0.5 }}
                className="bg-[#F8FAF9] p-6.5 rounded-2xl border border-slate-100 flex flex-col justify-between text-left group hover:bg-white hover:shadow-lg hover:shadow-slate-500/5 transition-all duration-300"
              >
                <div className="space-y-4">
                  <div className="w-11 h-11 rounded-xl bg-[#E6F0EC] text-brand-primary flex items-center justify-center font-bold">
                    <Icon name={p.icon} size={20} />
                  </div>
                  <h3 className="font-display font-black text-sm text-brand-charcoal group-hover:text-brand-primary transition-colors">
                    {p.title}
                  </h3>
                  <p className="text-slate-500 text-xs leading-relaxed font-sans mt-1">
                    {p.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Short Story Teaser Segment */}
      <section className="py-20 bg-[#F7F8FA] relative overflow-hidden">
        <div className="max-w-[1240px] mx-auto px-6 lg:px-8 text-left">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 space-y-6">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                <span className="text-xs uppercase font-extrabold tracking-widest text-brand-primary font-display">
                  HEARTBEAT STORIES
                </span>
              </div>
              <h2 className="text-3xl font-display font-black text-brand-charcoal tracking-tight leading-dense">
                Living Proof of Grassroots Empowerment
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed font-sans">
                Our initiatives do not just change metrics; they change human destinies. Meet the builders, graduates, and families who are taking the wheel on their own self-determination.
              </p>
              
              <div>
                <button
                  onClick={() => onNavigate("#/story")}
                  className="px-6 py-3 bg-brand-primary hover:bg-emerald-900 border border-transparent rounded-xl text-white font-display font-black text-xs tracking-wider uppercase transition-all duration-200 flex items-center gap-1.5"
                >
                  Read Impact Stories
                  <Icon name="Sparkles" size={14} />
                </button>
              </div>
            </div>

            <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-[24px] border border-slate-100 shadow-[0_12px_40px_rgba(0,0,0,0.02)] grid sm:grid-cols-2 gap-6 items-stretch">
              <div className="aspect-square rounded-2xl overflow-hidden bg-slate-100">
                <img
                  src="https://images.unsplash.com/photo-1544256718-3bcf237f3974?q=80&w=800"
                  alt="A programmer graduate"
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold font-display uppercase tracking-widest text-slate-400">SUCCESS STORY EXCERPT</span>
                  <h3 className="font-display font-black text-sm text-[#1E293B]">
                    From Code-Block to Career: Chidi's Path to Global Innovation
                  </h3>
                  <p className="text-slate-500 text-xs leading-relaxed font-sans mt-2 line-clamp-4">
                    Growing up in Enugu, Chidi had no access to a computer. At 19, he discovered the Advaltad TechHub Accelerator, setting up his full-stack engineering trajectory.
                  </p>
                </div>
                
                <button
                  onClick={() => onNavigate("#/story")}
                  className="text-brand-primary hover:text-emerald-900 font-display font-bold text-xs flex items-center gap-1 mt-2.5 underline"
                >
                  Read Chidi's Full Story <Icon name="ChevronRight" size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cta Strip Splitter */}
      <CtaStrip
        onDonateClick={onDonateClick}
        onAmbassadorClick={onAmbassadorClick}
      />
    </div>
  );
};
