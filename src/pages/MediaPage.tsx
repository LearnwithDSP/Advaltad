import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Icon } from "../components/Icon";

export const MediaPage: React.FC = () => {
  const [activeMediaTab, setActiveMediaTab] = useState<"gallery" | "videos" | "press">("gallery");
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const PHOTOS = [
    { src: "https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=1200", title: "Enugu Tech Accelerator Lab" },
    { src: "https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?q=80&w=1200", title: "Sustainable Farming Cooperative" },
    { src: "https://images.unsplash.com/photo-1542810634-71277d95dcbb?q=80&w=1200", title: "Rehabilitated Scholastic Block" },
    { src: "https://images.unsplash.com/photo-1590001155093-a3c66ab0c3ff?q=80&w=1200", title: "Eco-Adobe Masonry Project" },
    { src: "https://images.unsplash.com/photo-1544256718-3bcf237f3974?q=80&w=1200", title: "Youth Software Seminar" },
    { src: "https://images.unsplash.com/photo-1509099836639-18ba1795216d?q=80&w=1200", title: "Community Solar Water Hydration" }
  ];

  const VIDEOS = [
    {
      title: "Co-Operated Futures: Advaltad’s Model in Kenya",
      duration: "14 min",
      views: "1.2k views",
      thumbnail: "https://images.unsplash.com/photo-1590001155093-a3c66ab0c3ff?q=80&w=1200",
      description: "A feature documentary highlighting our Eco-Adobe sustainable shelters and structural ownership handovers in Mombasa."
    },
    {
      title: "Coding Sub-Saharan Accelerators",
      duration: "08 min",
      views: "2.4k views",
      thumbnail: "https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=1200",
      description: "An inside look at our technical laboratories training high-demand software engineering modules to native youths."
    }
  ];

  const PRESS_RELEASES = [
    {
      date: "June 08, 2026",
      title: "Advaltad Foundation Secures $500k Grant for Solar Grids",
      source: "Lagos Financial Review",
      summary: "In partnership with sustainable energy trusts, we outline plans to install modular hybrid solar grids across 14 additional off-grid communities. Delivering clean electricity to schools and pump stations."
    },
    {
      date: "May 14, 2026",
      title: "Elizabeth Kamara Outlines Physical Resource Verifier Integrity",
      source: "Global Development Forum",
      summary: "At the summit, our founder presented Advaltad's decentralized tracking program, which prevents overhead leakages and verified downloads down to individual classroom blocks and medical kits."
    },
    {
      date: "April 02, 2026",
      title: "Launch of Eco-Adobe Masonry Course in Mombasa",
      source: "East Africa Green Press",
      summary: "We officially certify the first class of eco-adobe bricklayers. Utilizing regional soils and manual compression methods to build low-carbon, flood-resilient family housing units."
    }
  ];

  return (
    <div className="pt-20 bg-white min-h-screen text-left">
      
      {/* Title Header */}
      <section className="bg-[#F7F8FA] border-b border-slate-100 py-16 sm:py-20 relative overflow-hidden">
        <div className="absolute inset-x-0 bottom-0 top-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#10B981_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="max-w-[1200px] mx-auto px-6 lg:px-8 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
            <span className="text-xs uppercase font-extrabold tracking-widest text-brand-primary font-display">
              PRESS & ASSETS
            </span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-display font-black text-brand-charcoal tracking-tight leading-tight">
            Media Information Hub
          </h1>
          <p className="text-slate-500 font-sans text-base max-w-[620px] leading-relaxed">
            Read certified reports of policy implementations, watch impact walk-throughs, and view our high-definition photo gallery representing real fieldwork in progress.
          </p>

          {/* Selector Tabs */}
          <div className="flex flex-wrap gap-2.5 pt-6">
            {[
              { id: "gallery", label: "Photo Gallery", icon: "Image" },
              { id: "videos", label: "Documentaries", icon: "Video" },
              { id: "press", label: "Press Releases", icon: "FileText" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveMediaTab(tab.id as any);
                  window.location.hash = `#/media/${tab.id}`;
                }}
                className={`px-4.5 py-2 rounded-xl text-xs font-display font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeMediaTab === tab.id
                    ? "bg-brand-primary text-white"
                    : "bg-white border border-slate-200 text-slate-500 hover:text-brand-charcoal hover:bg-slate-50"
                }`}
              >
                <Icon name={tab.icon as any} size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main content display blocks dynamically */}
      <section className="py-20 bg-white">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          
          {/* A. GALLERY TABLE */}
          {activeMediaTab === "gallery" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
            >
              {PHOTOS.map((p, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedPhoto(p.src)}
                  className="rounded-[24px] overflow-hidden group cursor-all-scroll relative aspect-[4/3] bg-slate-100 shadow-sm border border-slate-100/60"
                >
                  <img
                    src={p.src}
                    alt={p.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent flex items-end p-6" />
                  <div className="absolute bottom-6 left-6 right-6">
                    <p className="text-white text-xs font-display font-extrabold tracking-tight">
                      {p.title}
                    </p>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* B. VIDEO PLACEMENT PLAYER */}
          {activeMediaTab === "videos" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid gap-12 max-w-4xl mx-auto"
            >
              {VIDEOS.map((v, idx) => (
                <div
                  key={idx}
                  className="bg-[#F7F8FA] border border-slate-100 rounded-[32px] overflow-hidden grid md:grid-cols-12 gap-6 p-6 items-center"
                >
                  <div className="md:col-span-6 relative aspect-video rounded-2xl overflow-hidden bg-slate-200">
                    <img
                      src={v.thumbnail}
                      alt={v.title}
                      className="w-full h-full object-cover filter brightness-[0.85]"
                      referrerPolicy="no-referrer"
                    />
                    {/* Fake play center button click */}
                    <div className="absolute inset-0 flex items-center justify-center cursor-pointer">
                      <div className="w-14 h-14 rounded-full bg-brand-primary text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-md">
                        <Icon name="Play" size={18} className="ml-1 fill-white" />
                      </div>
                    </div>
                    {/* Badge */}
                    <span className="absolute bottom-3 right-3 py-1 px-2.5 rounded bg-black/60 text-white font-mono text-[10px] uppercase font-bold">
                      {v.duration}
                    </span>
                  </div>

                  <div className="md:col-span-6 space-y-4">
                    <div className="flex items-center gap-2.5 text-[10px] text-slate-400 font-extrabold tracking-wider uppercase font-display">
                      <span className="text-brand-primary flex items-center gap-1">🎥 DOCUMENTARY PREVIEW</span>
                      <span>•</span>
                      <span>{v.views}</span>
                    </div>

                    <h3 className="text-lg font-display font-black text-brand-charcoal tracking-tight leading-snug">
                      {v.title}
                    </h3>

                    <p className="text-slate-500 font-sans text-xs leading-relaxed">
                      {v.description}
                    </p>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* C. PRESS BOARD FEED */}
          {activeMediaTab === "press" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-12 max-w-4xl mx-auto"
            >
              {PRESS_RELEASES.map((pr, idx) => (
                <div
                  key={idx}
                  className="p-8 bg-white border border-slate-100 rounded-[28px] hover:shadow-lg transition-all duration-300 relative group flex flex-col md:flex-row gap-6 items-start"
                >
                  <div className="md:w-48 text-left space-y-2">
                    <p className="text-xs font-mono text-brand-primary font-bold">{pr.date}</p>
                    <p className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400">{pr.source}</p>
                  </div>

                  <div className="flex-1 space-y-3">
                    <h3 className="text-xl font-display font-black text-brand-charcoal tracking-tight leading-snug group-hover:text-brand-primary transition-colors">
                      {pr.title}
                    </h3>
                    <p className="text-slate-500 font-sans text-xs leading-relaxed">
                      {pr.summary}
                    </p>
                    
                    <button className="text-xs font-bold text-brand-primary group-hover:underline flex items-center gap-1 cursor-pointer">
                      Read full memorandum <Icon name="ChevronRight" size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

        </div>
      </section>

      {/* Lightbox / Picture Magnifier Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPhoto(null)}
              className="absolute inset-0 bg-black/85 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-w-4xl w-full z-10 rounded-[24px] overflow-hidden"
            >
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-4 right-4 p-2 bg-black/60 rounded-xl text-white hover:bg-brand-primary cursor-pointer transition-colors"
                aria-label="Close photo preview"
              >
                <Icon name="X" size={16} />
              </button>
              <img
                src={selectedPhoto}
                alt="Enlarged gallery item"
                className="w-full max-h-[80vh] object-contain mx-auto"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
