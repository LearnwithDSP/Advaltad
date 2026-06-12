import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Icon } from "./Icon";

interface Story {
  id: string;
  category: string;
  title: string;
  excerpt: string;
  fullStory: string;
  location: string;
  author: string;
  date: string;
  image: string;
}

const STORIES: Story[] = [
  {
    id: "story-chidi",
    category: "EDUCATION & TECH EXCELLENCE",
    title: "Sowing Seeds of Tech Sovereignty: Chidi’s Path to Global Innovation",
    excerpt: "From a rural suburb without computer access to designing a local crop trading platform that supports dozens of farmers, Chidi's journey shows the power of human-centered tech labs.",
    fullStory: "Chidi grew up in a vibrant suburb near Enugu, Nigeria, where electricity was scarce and personal computers were a distant luxury. At 19, his destiny pivoted when he joined the Advaltad TechHub Accelerator. Fully sponsored through a demanding 9-month coding fellowship, Chidi didn't just learn modern programming — he developed FarmSettle, a mobile trade application that now connects regional agricultural cooperatives to local city merchants. Today, he works as an international remote developer, directly funding school supplies for his five younger siblings.",
    location: "Enugu, Nigeria",
    author: "Advaltad Media Team",
    date: "May 12, 2026",
    image: "https://images.unsplash.com/photo-1544256718-3bcf237f3974?q=80&w=1200"
  },
  {
    id: "story-fatima",
    category: "SUSTAINABLE COMMUNITY SHELTER",
    title: "Constructing Safety and Stability for Mama Fatima's Family",
    excerpt: "Displaced by flash floods, Fatima and her four kids survived in temporary high-tension tarpaulins until Advaltad's Humanitarian Housing team stepped in with zero-carbon bricks.",
    fullStory: "Our Eco-Adobe Sustainable Shelter project is rooted in the belief that secure housing is a basic human right. Mama Fatima was one of hundreds of climate-displaced citizens living in extreme conditions near waterways in coastal Mombasa. In under 18 days, utilizing our innovative compressed earth block system which boasts a zero-carbon production rate, our volunteers constructed a neat 3-room housing unit complete with localized solar lanterns and micro-flush toilet mechanisms.",
    location: "Mombasa, Kenya",
    author: "Grace Adebayo, Field Architect",
    date: "April 20, 2026",
    image: "https://images.unsplash.com/photo-1590001155093-a3c66ab0c3ff?q=80&w=1200"
  },
  {
    id: "story-kigali",
    category: "FEMALE EDUCATIONAL REFORMS",
    title: "Kigali Scholars Collective: Lighting Up Academic Classrooms",
    excerpt: "How native-language digital learning modules and female scholarship trusts enabled fifty girls to bypass spatial restrictions and secure college entries.",
    fullStory: "In high-density neighborhoods around Kigali, educational access remains highly restricted by socioeconomic status. By deploying digitized study tablets equipped with offline curriculum logs and establishing a collaborative peer mentorship circle, the Kigali Scholars Collective has successfully financed and coached over 50 girls into key engineering and nursing programs. The program is 100% funded by donor support packages.",
    location: "Kigali, Rwanda",
    author: "Emmanuel Nkurunziza",
    date: "March 15, 2026",
    image: "https://images.unsplash.com/photo-1542810634-71277d95dcbb?q=80&w=1200"
  },
  {
    id: "story-mombasa-solar",
    category: "ECOLOGICAL POWER GRIDS",
    title: "Mombasa Solar Grid: Keeping Local Clinics Powered Round the Clock",
    excerpt: "Installing stable community solar panel structures to safeguard temperature-sensitive medicine lines and illuminate critical evening childbirth wards.",
    fullStory: "Until last season, rural medical outposts near Mombasa struggled with frequent grid outages, endangering vaccine storage and night-time childbirths. Advaltad's technical engineers designed, configured, and turned over a robust, locally-operated solar hybrid microgrid unit. The community now runs high-accuracy cold storage chambers and is entirely independent of volatile fossil fuel imports.",
    location: "Mombasa, Kenya",
    author: "Kofi Mensah, Energy Lead",
    date: "February 28, 2026",
    image: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?q=80&w=1200"
  }
];

export const FeaturedStory: React.FC = () => {
  const [featuredIdx, setFeaturedIdx] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const featured = STORIES[featuredIdx];

  // The remaining 3 stories are shown below
  const smallerStories = STORIES.filter((_, idx) => idx !== featuredIdx);

  return (
    <section id="story" className="py-24 sm:py-32 bg-[#F7F8FA] relative overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-2xl mb-16 sm:mb-20 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
            <span className="text-xs uppercase font-extrabold tracking-widest text-brand-primary font-display">
              HUMAN STORIES
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-display font-black text-brand-charcoal tracking-tight leading-none">
            Stories From the Ground
          </h2>
          <p className="text-slate-500 font-sans text-base leading-relaxed">
            Real people. Sustainable outcomes. Meet the individuals who are actively defining the future of self-reliance.
          </p>
        </div>

        {/* Large Featured Story Card */}
        <div className="bg-white rounded-[32px] overflow-hidden border border-slate-100 shadow-[0_8px_35px_rgba(0,0,0,0.02)] transition-all duration-500">
          <div className="grid lg:grid-cols-12 items-stretch">
            
            {/* Left side: Full-width feeling Portrait/Landscape Photo */}
            <div className="lg:col-span-7 relative min-h-[300px] lg:min-h-[480px] bg-slate-100">
              <img
                src={featured.image}
                alt={featured.title}
                className="absolute inset-0 w-full h-full object-cover transition-all duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-brand-charcoal/40 via-transparent to-transparent" />
            </div>

            {/* Right side: Editorial text and toggles */}
            <div className="lg:col-span-5 p-8 sm:p-12 flex flex-col justify-between">
              <div className="space-y-4">
                <span className="text-xs uppercase font-extrabold tracking-widest text-[#D9A441] font-display">
                  {featured.category}
                </span>
                
                <h3 className="text-2xl sm:text-3xl font-display font-black text-brand-charcoal leading-tight tracking-tight">
                  {featured.title}
                </h3>
                
                <p className="text-slate-500 text-sm leading-relaxed font-sans mt-4">
                  {featured.excerpt}
                </p>

                {/* Animated Read Story Detail block */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-slate-600 text-sm leading-relaxed font-sans pt-4 border-t border-slate-100 overflow-hidden"
                    >
                      <p className="whitespace-pre-line">{featured.fullStory}</p>
                      <div className="mt-4 flex items-center gap-4 text-xs font-semibold text-slate-400">
                        <span>Report: {featured.author}</span>
                        <span>•</span>
                        <span>{featured.date}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="pt-8">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="px-6 py-3 rounded-xl bg-brand-primary hover:bg-emerald-950 text-white font-bold text-xs tracking-wider transition-all duration-200 cursor-pointer uppercase flex items-center gap-2"
                >
                  {isExpanded ? "Close Story" : "Read Full Story"}
                  <Icon name={isExpanded ? "X" : "ArrowRight"} size={12} />
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* 3 Smaller Story Cards Underneath */}
        <div className="mt-16 grid sm:grid-cols-3 gap-8">
          {smallerStories.map((story) => {
            const originalIndex = STORIES.findIndex((s) => s.id === story.id);
            return (
              <div
                key={story.id}
                onClick={() => {
                  setFeaturedIdx(originalIndex);
                  setIsExpanded(false);
                  document.getElementById("story")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="group bg-white rounded-[24px] border border-slate-100 p-6 shadow-[0_4px_25px_rgba(0,0,0,0.01)] hover:shadow-[0_12px_35px_rgba(0,0,0,0.04)] hover:-translate-y-1.5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Portrait photo */}
                  <div className="rounded-2xl overflow-hidden aspect-[4/3] bg-slate-50 mb-6 relative">
                    <img
                      src={story.image}
                      alt={story.title}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/5" />
                  </div>

                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#D9A441] font-display block">
                    {story.location}
                  </span>

                  <h4 className="text-base font-display font-black text-brand-charcoal tracking-tight mt-2 line-clamp-1 group-hover:text-brand-primary transition-colors">
                    {story.title}
                  </h4>

                  <p className="text-slate-500 text-xs mt-2 font-sans leading-relaxed line-clamp-2">
                    {story.excerpt}
                  </p>
                </div>

                <div className="mt-6 flex items-center gap-1 text-[11px] font-bold text-brand-primary uppercase tracking-wider group-hover:underline">
                  <span>Activate Story</span>
                  <Icon name="ArrowRight" size={10} className="transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
