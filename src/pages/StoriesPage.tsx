import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { IMPACT_STORIES } from "../data";
import { Icon } from "../components/Icon";
import { db, DbBlog } from "../lib/supabase";

export const StoriesPage: React.FC = () => {
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [customBlogs, setCustomBlogs] = useState<DbBlog[]>([]);

  useEffect(() => {
    db.getBlogs().then((blogsList) => {
      setCustomBlogs(blogsList);
    }).catch(err => {
      console.error("Failed to load custom stories:", err);
    });
  }, []);

  const combinedStories = [
    ...IMPACT_STORIES.map(s => ({
      ...s,
      id: `static-${s.id}`,
      isCustom: false,
      fullStoryText: s.fullStory
    })),
    ...customBlogs.map(b => ({
      id: `custom-${b.id}`,
      title: b.title,
      image: b.image || "https://images.unsplash.com/photo-1544256718-3bcf237f3974?q=80&w=1200",
      tag: b.tag || "GENERAL UPDATE",
      location: "Active Program Region",
      date: new Date(b.created_at).toLocaleDateString(),
      excerpt: b.excerpt,
      author: b.author,
      fullStoryText: b.content,
      isCustom: true
    }))
  ];

  const activeStory = combinedStories.find(s => s.id === selectedStoryId);

  return (
    <div className="pt-20 bg-white min-h-screen text-left">
      
      {/* Narrative Section Header */}
      <section className="bg-[#F7F8FA] border-b border-slate-100 py-16 sm:py-20 relative overflow-hidden">
        <div className="absolute inset-x-0 bottom-0 top-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#10B981_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="max-w-[1200px] mx-auto px-6 lg:px-8 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
            <span className="text-xs uppercase font-extrabold tracking-widest text-brand-primary font-display">
              VOICES FROM THE GROUND
            </span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-display font-black text-brand-charcoal tracking-tight leading-tight">
            Impact Success Stories
          </h1>
          <p className="text-slate-500 font-sans text-base max-w-[620px] leading-relaxed">
            Real families, real locations, and real outcomes. These reports detail the journey of community members who found their stride through local development.
          </p>
        </div>
      </section>

      {/* Grid of Stories */}
      <section className="py-20 bg-white">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          
          <div className="grid md:grid-cols-2 gap-12 items-stretch">
            {combinedStories.map((story, idx) => (
              <motion.div
                key={story.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1, duration: 0.5 }}
                className="bg-white border border-slate-100 rounded-[32px] overflow-hidden flex flex-col justify-between hover:shadow-xl transition-all duration-300 h-full group"
              >
                <div>
                  {/* Photo area */}
                  <div className="aspect-[16/10] overflow-hidden bg-slate-100 relative">
                    <img
                      src={story.image}
                      alt={story.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-4 left-4 py-1.5 px-3 rounded-lg bg-black/60 backdrop-blur-sm text-white text-[10px] uppercase tracking-widest font-extrabold font-display">
                      {story.tag}
                    </div>
                  </div>

                  {/* Body text */}
                  <div className="p-8 space-y-4">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Icon name="MapPin" size={12} className="text-brand-primary" />
                      <span>{story.location}</span>
                      <span className="text-slate-200">•</span>
                      <span>{story.date}</span>
                    </div>

                    <h3 className="text-xl font-display font-black text-brand-charcoal tracking-tight leading-snug group-hover:text-brand-primary transition-colors">
                      {story.title}
                    </h3>

                    <p className="text-slate-500 font-sans text-xs leading-relaxed line-clamp-3">
                      {story.excerpt}
                    </p>
                  </div>
                </div>

                <div className="p-8 pt-0">
                  <button
                    onClick={() => setSelectedStoryId(story.id)}
                    className="w-full py-3 rounded-xl border border-slate-200 hover:border-brand-primary text-brand-charcoal hover:text-brand-primary text-xs font-display font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 bg-white"
                  >
                    Read Full Story
                    <Icon name="ArrowRight" size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* Full Screen Reading Slide / Modal */}
      <AnimatePresence>
        {selectedStoryId && activeStory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedStoryId(null)}
              className="absolute inset-0 bg-brand-charcoal/60 backdrop-blur-md"
            />

            {/* Sliding Panel */}
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.98 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative w-full max-w-4xl bg-white rounded-[32px] overflow-hidden shadow-2xl z-10 flex flex-col max-h-[85vh]"
            >
              
              {/* Close Button Trigger */}
              <button
                onClick={() => setSelectedStoryId(null)}
                className="absolute top-6 right-6 p-2 rounded-xl bg-black/50 text-white hover:bg-brand-primary transition-colors z-20 cursor-pointer"
                aria-label="Close story viewer"
              >
                <Icon name="X" size={18} />
              </button>

              <div className="overflow-y-auto flex-1 pb-12">
                {/* Image Banner */}
                <div className="aspect-[21/9] w-full bg-slate-105 relative">
                  <img
                    src={activeStory.image}
                    alt={activeStory.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent" />
                </div>

                {/* Article Contents */}
                <div className="px-6 sm:px-12 pt-8 space-y-6">
                  <div className="flex flex-wrap items-center gap-3.5 text-xs text-slate-400">
                    <span className="py-1 px-2.5 rounded-md bg-brand-secondary text-brand-primary font-bold uppercase tracking-widest text-[9px]">
                      {activeStory.tag}
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon name="MapPin" size={12} className="text-brand-primary" />
                      {activeStory.location}
                    </span>
                    <span>•</span>
                    <span>{activeStory.date}</span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-black text-[#1E293B] tracking-tight leading-tight">
                    {activeStory.title}
                  </h2>

                  <div className="flex items-center gap-3 py-3 border-y border-slate-100">
                    <div className="w-10 h-10 rounded-full bg-brand-secondary text-brand-primary font-bold flex items-center justify-center text-xs">
                      ED
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700">Written For: {activeStory.author}</p>
                      <p className="text-[10px] text-slate-400">Published in regional bulletin</p>
                    </div>
                  </div>

                  {/* Full body prose rendering */}
                  <p className="text-slate-600 font-sans text-sm sm:text-base leading-relaxed whitespace-pre-line">
                    {activeStory.fullStoryText}
                  </p>
                </div>
              </div>

              {/* Panel Footer */}
              <div className="px-8 py-5 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button
                  onClick={() => setSelectedStoryId(null)}
                  className="px-6 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-display font-bold uppercase tracking-wider hover:bg-emerald-900 transition-colors cursor-pointer"
                >
                  Done Reading
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
