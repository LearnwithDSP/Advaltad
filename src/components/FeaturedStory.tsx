import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { IMPACT_STORIES } from "../data";
import { Icon } from "./Icon";

export const FeaturedStory: React.FC = () => {
  const [selectedStoryIdx, setSelectedStoryIdx] = useState(0);
  const activeStory = IMPACT_STORIES[selectedStoryIdx];

  return (
    <section id="story" className="py-24 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Title details */}
        <div className="max-w-2xl mb-16 space-y-3">
          <span className="text-xs uppercase font-bold tracking-widest text-emerald-600 font-sans flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            Voices from the Field
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-950 tracking-tight leading-none">
            Featured Impact Stories
          </h2>
          <p className="text-gray-500 text-sm sm:text-base font-sans leading-relaxed">
            Real human pathways. Meet the individuals whose lives have been permanently transformed by Advaltad's active project deployments.
          </p>
        </div>

        {/* Dynamic Storyboard Split Layout */}
        <div className="grid lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Block: Interactive Selector Accordion */}
          <div className="lg:col-span-4 space-y-4">
            {IMPACT_STORIES.map((story, idx) => {
              const works = idx === selectedStoryIdx;
              return (
                <button
                  id={`story-tab-${story.id}`}
                  key={story.id}
                  onClick={() => setSelectedStoryIdx(idx)}
                  className={`w-full text-left p-6 rounded-2xl border transition-all duration-300 flex flex-col gap-2 cursor-pointer focus:outline-none ${
                    works
                      ? "bg-emerald-50/60 border-emerald-200 shadow-md shadow-emerald-900/5"
                      : "bg-white border-gray-100 hover:bg-gray-50 hover:border-gray-200"
                  }`}
                >
                  <span className={`text-[10px] font-bold tracking-wider font-sans px-2.5 py-1 rounded-md max-w-max uppercase ${
                    works ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-500"
                  }`}>
                    {story.tag}
                  </span>
                  
                  <h3 className={`font-bold text-sm tracking-tight line-clamp-2 mt-2 transition-colors ${
                    works ? "text-emerald-900" : "text-gray-800"
                  }`}>
                    {story.title}
                  </h3>
                  
                  <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mt-1 font-sans">
                    {story.excerpt}
                  </p>

                  <div className="flex items-center gap-1.5 mt-3 text-[10px] font-mono text-gray-400">
                    <Icon name="MapPin" size={10} className="text-emerald-600" />
                    <span>{story.location}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Block: Expanded Cinematic Storyboard Screen */}
          <div className="lg:col-span-8 bg-gray-50 rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStory.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="flex flex-col"
              >
                {/* Visual Banner */}
                <div className="h-64 sm:h-80 relative overflow-hidden bg-slate-100">
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-transparent to-transparent z-10" />
                  <img
                    src={activeStory.image}
                    alt={activeStory.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Geographic and Author overlay cards */}
                  <div className="absolute bottom-6 left-6 right-6 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-white">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs">
                        <Icon name="MapPin" size={12} className="text-emerald-400 fill-emerald-400/20" />
                        <span className="font-semibold tracking-tight uppercase text-white">{activeStory.location}</span>
                      </div>
                      <h4 className="text-lg sm:text-xl font-extrabold tracking-tight line-clamp-1 drop-shadow-sm">
                        {activeStory.title}
                      </h4>
                    </div>
                  </div>
                </div>

                {/* Narrative Details */}
                <div className="p-8 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200/60 text-xs font-sans text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold font-serif text-[10px]">
                        R
                      </div>
                      <span>Reported by: <span className="font-semibold text-gray-700">{activeStory.author}</span></span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1"><Icon name="Calendar" size={12} /> {activeStory.date}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                      <span className="text-emerald-700 font-bold uppercase tracking-wider text-[10px]">VERIFIED REPORT</span>
                    </div>
                  </div>

                  {/* Complete rich story body */}
                  <p className="text-gray-700 text-sm sm:text-base leading-relaxed font-normal whitespace-pre-line font-sans first-letter:text-4xl first-letter:font-serif first-letter:font-bold first-letter:float-left first-letter:mr-2 first-letter:text-emerald-700">
                    {activeStory.fullStory}
                  </p>

                  <div className="mt-8 pt-4 bg-emerald-50/50 rounded-2xl p-5 border border-emerald-100/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-emerald-800">You can sponsor similar breakthroughs</p>
                      <p className="text-[11px] text-gray-500 font-sans">100% of your funds empower youths or housing directly.</p>
                    </div>
                    <a
                      href="#donate"
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 max-w-max"
                    >
                      Empower Next Nominee <Icon name="ArrowRight" size={12} />
                    </a>
                  </div>
                </div>

              </motion.div>
            </AnimatePresence>
          </div>

        </div>

      </div>
    </section>
  );
};
