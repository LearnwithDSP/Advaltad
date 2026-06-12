import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { About } from "../components/About";
import { Icon } from "../components/Icon";

export const AboutPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"all" | "mission" | "leadership" | "values">("all");

  // Read hash modifier on mount to scroll to or activate subsections
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("mission") || hash.includes("vision")) {
      setActiveTab("mission");
    } else if (hash.includes("leadership")) {
      setActiveTab("leadership");
    } else if (hash.includes("core-values")) {
      setActiveTab("values");
    } else {
      setActiveTab("all");
    }
  }, [window.location.hash]);

  const LEADERSHIP_MEMBERS = [
    {
      name: "Elizabeth Kamara",
      role: "Executive Director & Founder",
      bio: "An international development veteran with over 18 years leading field initiatives across Sub-Saharan climates. Passionate about community-owned infrastructure.",
      avatarName: "Sparkles"
    },
    {
      name: "Ramon Bisola",
      role: "Global Chief of Operations",
      bio: "Directs resource allocations and policy compliance across Advaltad. Specializes in auditing field-work pipelines and physical construction targets.",
      avatarName: "Shield"
    },
    {
      name: "Dr. Adebayo Chidi",
      role: "Director of Youth Tech-Hubs",
      bio: "Former systems architect and tech builder. Orchestrates our coding courses, digital software laboratories, and graduate mentor placement programs.",
      avatarName: "Cpu"
    },
    {
      name: "Fatima Al-Hassan",
      role: "Senior Clinical Architect",
      bio: "Pioneered Advaltad's Mobile Medical clinic modules. Specializes in rural clinical deployment, clean sanitations, and community wellness plans.",
      avatarName: "HeartPulse"
    }
  ];

  const CORE_VALUES = [
    {
      title: "Radical Transparency",
      desc: "Every single dollar donated is verified downwards to specific modules. Bypassing administrative friction and middlemen bureaucracy.",
      icon: "ShieldAlert"
    },
    {
      title: "Community Autonomy",
      desc: "We do not run facilities forever. All technology labs, solar water boreholes, and community centers are managed and operated by graduates.",
      icon: "Users"
    },
    {
      title: "Ecological Integration",
      desc: "We build with native elements block-by-block. Compressed adobe brick, hybrid solar grids, and clean water basins with zero impact emissions.",
      icon: "Leaf"
    },
    {
      title: "Dignified Partnership",
      desc: "Replacing classic aid dependency of the past with certified learning pipelines and career mentorship. Shifting power back to the communities.",
      icon: "HeartHandshake"
    }
  ];

  return (
    <div className="pt-20 bg-white min-h-screen">
      
      {/* Visual Header Grid banner row */}
      <section className="bg-[#F7F8FA] border-b border-slate-100 py-16 sm:py-20 text-left relative overflow-hidden">
        {/* Abstract design elements */}
        <div className="absolute inset-x-0 bottom-0 top-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#10B981_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="max-w-[1200px] mx-auto px-6 lg:px-8 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
            <span className="text-xs uppercase font-extrabold tracking-widest text-brand-primary font-display">
              WHO WE ARE
            </span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-display font-black text-brand-charcoal tracking-tight leading-tight">
            Our Identity & Legacy
          </h1>
          <p className="text-slate-500 font-sans text-base max-w-[620px] leading-relaxed">
            Advaltad sets international standards for decentralized Sub-Saharan development. Learn about our founders, core structures, and deep operational transparency.
          </p>

          {/* Quick Sub-navigation Pills */}
          <div className="flex flex-wrap gap-2 pt-6">
            {[
              { id: "all", label: "Overview" },
              { id: "mission", label: "Mission & Vision" },
              { id: "leadership", label: "Leadership Core" },
              { id: "values", label: "Our Core Values" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  window.location.hash = `#/${tab.id === "all" ? "about" : `about/${tab.id}`}`;
                }}
                className={`px-4.5 py-2 rounded-xl text-xs font-display font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-brand-primary text-white"
                    : "bg-white border border-slate-200 text-slate-500 hover:text-brand-charcoal hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* RENDER VIEW BLOCKS */}
      <div className="divide-y divide-slate-100 space-y-0.5">

        {/* 1. OVERVIEW & ABOUT STORY */}
        {(activeTab === "all" || activeTab === "mission") && (
          <About />
        )}

        {/* 2. MISSION & VISION STATEMENTS */}
        {(activeTab === "all" || activeTab === "mission") && (
          <section id="mission-vision" className="py-24 bg-[#F8FAF9] text-left">
            <div className="max-w-[1200px] mx-auto px-6 lg:px-8 grid md:grid-cols-2 gap-12 items-stretch">
              
              <div className="bg-white p-8 sm:p-12 rounded-[32px] border border-slate-100 flex flex-col justify-between h-full shadow-[0_12px_45px_rgba(0,0,0,0.01)]">
                <div className="space-y-6">
                  <div className="w-12 h-12 bg-[#E1EFEB] text-brand-primary rounded-2xl flex items-center justify-center font-bold">
                    <Icon name="Compass" size={24} />
                  </div>
                  <h2 className="text-2xl font-display font-black text-brand-charcoal tracking-tight">Our Mission</h2>
                  <p className="text-slate-600 text-sm leading-relaxed font-sans">
                    To deliver highly specialized regional learning laboratories, clean renewable grid setups, sustainable modular housings, and clinical systems that empower families across developing communities in Sub-Saharan Africa to lead autonomous, proud, and secure futures.
                  </p>
                </div>
                <div className="mt-8 border-t border-slate-150 pt-4 text-xs font-bold text-brand-primary uppercase tracking-wide">
                  Autonomous Local Progress 
                </div>
              </div>

              <div className="bg-white p-8 sm:p-12 rounded-[32px] border border-slate-100 flex flex-col justify-between h-full shadow-[0_12px_45px_rgba(0,0,0,0.01)]">
                <div className="space-y-6">
                  <div className="w-12 h-12 bg-[#E1EFEB] text-brand-primary rounded-2xl flex items-center justify-center font-bold">
                    <Icon name="Eye" size={24} />
                  </div>
                  <h2 className="text-2xl font-display font-black text-brand-charcoal tracking-tight">Our Vision</h2>
                  <p className="text-slate-600 text-sm leading-relaxed font-sans">
                    To catalyze an epoch where external dependency is replaced by internal design — where native African innovators build, co-operate, and expand their local infrastructures independently of global relief cycles. Setting new global standards of self-determination.
                  </p>
                </div>
                <div className="mt-8 border-t border-slate-150 pt-4 text-xs font-bold text-brand-primary uppercase tracking-wide">
                  Co-Operated Green Infrastructure
                </div>
              </div>

            </div>
          </section>
        )}

        {/* 3. EXECUTIVE LEADERSHIP NETWORK */}
        {(activeTab === "all" || activeTab === "leadership") && (
          <section id="leadership" className="py-24 bg-white text-left">
            <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
              <div className="max-w-2xl mb-16 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                  <span className="text-xs uppercase font-extrabold tracking-widest text-brand-primary font-display">
                    LEADERSHIP TEAM
                  </span>
                </div>
                
                <h2 className="text-3xl font-display font-black text-brand-charcoal tracking-tight">
                  Global Expertise, Local Action
                </h2>
                <p className="text-slate-500 font-sans text-sm leading-relaxed">
                  Meet our multi-disciplinary panel combining decades of international ngo accountability, field systems engineering, community architecture, and micro-financing.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {LEADERSHIP_MEMBERS.map((m, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1, duration: 0.5 }}
                    className="bg-[#F7F8FA] rounded-3xl p-6 border border-slate-100 flex flex-col justify-between h-full hover:shadow-lg transition-all duration-300"
                  >
                    <div className="space-y-4">
                      {/* Avatar placeholder with initials */}
                      <div className="w-16 h-16 rounded-2xl bg-[#E8F1ED] text-brand-primary font-display font-black flex items-center justify-center text-lg shadow-sm border border-brand-primary/10">
                        <Icon name={m.avatarName as any} size={28} />
                      </div>
                      
                      <div>
                        <h3 className="font-display font-black text-base text-brand-charcoal">{m.name}</h3>
                        <p className="text-xs text-brand-primary font-bold mt-0.5 uppercase tracking-wider">{m.role}</p>
                      </div>

                      <p className="text-slate-500 font-sans text-xs leading-relaxed">
                        {m.bio}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 4. CORE VALUES SYSTEM */}
        {(activeTab === "all" || activeTab === "values") && (
          <section id="core-values" className="py-24 bg-[#F7F8FA] text-left">
            <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
              <div className="max-w-2xl mb-16 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                  <span className="text-xs uppercase font-extrabold tracking-widest text-brand-primary font-display">
                    OPERATIONAL ETHICS
                  </span>
                </div>
                
                <h2 className="text-3xl font-display font-black text-brand-charcoal tracking-tight">
                  Our Uncompromising Values
                </h2>
                <p className="text-slate-500 font-sans text-sm leading-relaxed">
                  We don't talk value; we code it. How we govern operations, verify field targets, and empower our local advocates.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-8">
                {CORE_VALUES.map((c, idx) => (
                  <div key={idx} className="bg-white p-8 rounded-3xl border border-slate-100 flex items-start gap-5 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:-translate-y-1 transition-transform duration-200">
                    <div className="p-3 bg-[#EBF4F0] text-brand-primary rounded-xl flex-shrink-0 mt-1">
                      <Icon name={c.icon as any} size={20} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-display font-black text-base text-[#1E293B]">{c.title}</h3>
                      <p className="text-slate-500 text-xs leading-relaxed font-sans">
                        {c.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

      </div>

    </div>
  );
};
