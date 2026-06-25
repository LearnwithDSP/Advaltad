import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PROGRAM_CARDS } from "../data";
import { Icon } from "../components/Icon";

export const ProgramsPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    // Monitor hash for category parameter (e.g. #programs?category=youth)
    const checkHashParam = () => {
      const hash = window.location.hash;
      if (hash.includes("category=youth") || hash.includes("/youth")) {
        setSelectedCategory("youth-empowerment");
      } else if (hash.includes("category=schools") || hash.includes("/schools")) {
        setSelectedCategory("schools-stem");
      } else if (hash.includes("category=green-agri") || hash.includes("/green-agri")) {
        setSelectedCategory("green-agri");
      } else if (hash.includes("category=housing") || hash.includes("/housing")) {
        setSelectedCategory("housing");
      } else if (hash.includes("category=teen-club") || hash.includes("/teen-club")) {
        setSelectedCategory("teen-club");
      } else if (hash.includes("category=sponsorship") || hash.includes("/sponsorship")) {
        setSelectedCategory("sponsorship");
      } else if (hash.includes("category=relief") || hash.includes("/relief")) {
        setSelectedCategory("relief");
      } else if (hash.includes("category=aged-care") || hash.includes("/aged-care")) {
        setSelectedCategory("aged-care");
      } else {
        setSelectedCategory("all");
      }
    };

    checkHashParam();
    window.addEventListener("hashchange", checkHashParam);
    return () => window.removeEventListener("hashchange", checkHashParam);
  }, []);

  const filteredCards = selectedCategory === "all"
    ? PROGRAM_CARDS
    : PROGRAM_CARDS.filter(card => card.id === selectedCategory);

  const TABS = [
    { id: "all", label: "All Areas" },
    { id: "youth-empowerment", label: "Youth Initiative" },
    { id: "schools-stem", label: "Schools (STEM)" },
    { id: "green-agri", label: "Green / Agri" },
    { id: "housing", label: "Housing Scheme" },
    { id: "teen-club", label: "Teen Club" },
    { id: "sponsorship", label: "Sponsorship" },
    { id: "relief", label: "Emergency Relief" },
    { id: "aged-care", label: "Care for the Aged" }
  ];

  return (
    <div className="pt-20 bg-white min-h-screen text-left">
      
      {/* Banner / Header Title Row */}
      <section className="bg-[#F7F8FA] border-b border-slate-100 py-16 sm:py-20 relative overflow-hidden">
        <div className="absolute inset-x-0 bottom-0 top-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#10B981_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="max-w-[1200px] mx-auto px-6 lg:px-8 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
            <span className="text-xs uppercase font-extrabold tracking-widest text-brand-primary font-display">
              ACTIVE FIELDWORK
            </span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-display font-black text-brand-charcoal tracking-tight leading-tight">
            Our Sustainable Programs
          </h1>
          <p className="text-slate-500 font-sans text-base max-w-[620px] leading-relaxed">
            We structure long-term interventions across Sub-Saharan climates. Guided by local knowledge, built using native materials, and fully owned by program graduates.
          </p>

          {/* Tab Selection Filter */}
          <div className="flex flex-wrap gap-2.5 pt-6">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setSelectedCategory(tab.id);
                  const hashSuffix = tab.id === "all" ? "" : `?category=${tab.id.replace("schools-stem", "schools").replace("youth-empowerment", "youth")}`;
                  window.location.hash = `#/programs${hashSuffix}`;
                }}
                className={`px-4 py-2 rounded-xl text-xs font-display font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  selectedCategory === tab.id
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

      {/* Program list Section */}
      <section className="py-20 sm:py-24 bg-white">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          
          <div className="space-y-16">
            <AnimatePresence mode="popLayout">
              {filteredCards.map((card, idx) => {
                const getIcon = (cat: string) => {
                  if (cat.includes("YOUTH")) return "Cpu";
                  if (cat.includes("EDUCATION")) return "GraduationCap";
                  if (cat.includes("AGRICULTURE")) return "Globe";
                  if (cat.includes("HOUSING")) return "Home";
                  if (cat.includes("TEENS")) return "Users";
                  if (cat.includes("SPONSORSHIP")) return "Heart";
                  if (cat.includes("EMERGENCY")) return "AlertCircle";
                  if (cat.includes("SENIOR")) return "HeartHandshake";
                  return "HeartPulse";
                };

                return (
                  <motion.div
                    key={card.id}
                    layout
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className={`grid lg:grid-cols-12 gap-8 lg:gap-16 items-center border-b border-slate-100 pb-16 last:border-b-0 last:pb-0 ${
                      idx % 2 === 1 ? "lg:flex-row-reverse" : ""
                    }`}
                  >
                    
                    {/* Visual Illustration */}
                    <div className={`lg:col-span-6 ${idx % 2 === 1 ? "lg:order-2" : ""}`}>
                      <div className="rounded-[32px] overflow-hidden relative aspect-[4/3] bg-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.03)] group">
                        <img
                          src={card.image}
                          alt={card.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent pointer-events-none" />
                      </div>
                    </div>

                    {/* Content Details */}
                    <div className={`lg:col-span-6 space-y-6 ${idx % 2 === 1 ? "lg:order-1" : ""}`}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#EAF5F0] text-brand-primary flex items-center justify-center font-bold">
                          <Icon name={getIcon(card.category) as any} size={16} />
                        </div>
                        <span className="text-xs uppercase font-extrabold tracking-widest text-brand-primary font-display">
                          {card.category}
                        </span>
                      </div>

                      <h2 className="text-2xl sm:text-3xl font-display font-black text-brand-charcoal tracking-tight leading-tight">
                        {card.title}
                      </h2>
                      
                      <p className="text-slate-600 font-sans text-sm leading-relaxed">
                        {card.description}
                      </p>

                      {/* Verified Impact Badge and Metric row */}
                      <div className="p-5.5 rounded-2xl bg-[#F7F8FA] border border-slate-100/70 flex items-center gap-4 text-left">
                        <div className="p-2.5 rounded-xl bg-white text-brand-primary shadow-sm">
                          <Icon name="Award" size={20} />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-extrabold tracking-widest text-slate-400">VERIFIED METRIC ON GROUND</p>
                          <p className="text-base font-display font-black text-slate-800 leading-tight mt-0.5">
                            {card.impactMetric}
                          </p>
                        </div>
                      </div>

                      {/* Detailed Bullet Points Specific to each Program */}
                      <div className="pt-2">
                        <h4 className="text-xs font-display font-bold text-brand-charcoal uppercase tracking-wider mb-3">KEY MILESTONES ACHIEVED:</h4>
                        <ul className="space-y-2 text-xs text-slate-500">
                          <li className="flex items-start gap-2">
                            <span className="text-brand-primary mt-0.5 flex-shrink-0 animate-pulse">●</span>
                            <span>Direct resource verification system to check field integrity.</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-brand-primary mt-0.5 flex-shrink-0">●</span>
                            <span>100% co-operated by local graduates of the Advaltad curriculum.</span>
                          </li>
                        </ul>
                      </div>

                    </div>

                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

        </div>
      </section>

    </div>
  );
};
