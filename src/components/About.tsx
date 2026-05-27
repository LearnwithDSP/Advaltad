import React, { useState } from "react";
import { motion } from "motion/react";
import { Icon } from "./Icon";

const EXPLORE_CARDS = [
  {
    id: "youth",
    title: "Youth Empowerment",
    desc: "Placing computers, technology hubs, and direct startup guidance in the hands of energetic, resourceful African youth to shape sovereign solutions.",
    iconName: "TrendingUp"
  },
  {
    id: "education",
    title: "Education Initiatives",
    desc: "Rehabilitating classrooms, distributing modernized digital learning packets, and hosting academic mentorship scholarships for talented, underprivileged children.",
    iconName: "GraduationCap"
  },
  {
    id: "health",
    title: "Health & Care",
    desc: "Deploying mobile clinics, clean water infrastructure filters, and prenatal educational modules deep within underserved, off-grid communities.",
    iconName: "Heart"
  },
  {
    id: "advocacy",
    title: "Advocacy & Policy",
    desc: "Championing legal updates, structural rights representation, and civic engagement pipelines to ensure equitable growth trajectories for local villages.",
    iconName: "Shield"
  },
  {
    id: "development",
    title: "Sustainable Dev",
    desc: "Fostering local agricultural co-operatives powered by renewable grids and modern vertical farming principles for absolute food sovereignty.",
    iconName: "Globe"
  },
  {
    id: "community",
    title: "Transformation",
    desc: "Re-building infrastructure standard lines through eco-masonry shelter builds that respect natural ecosystems while giving family safety structures.",
    iconName: "Building2"
  }
];

export const About: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("all");

  return (
    <section id="about" className="py-24 bg-white relative overflow-hidden">
      {/* Decorative leafy blur bubble */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Core Slogan Headline Container */}
        <div className="max-w-3xl mx-auto text-center mb-16 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="text-emerald-600 uppercase font-bold tracking-widest text-xs font-sans flex items-center justify-center gap-1.5"
          >
            <Icon name="Compass" size={14} className="text-emerald-600 animate-spin-slow" />
            Who We Are
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-sans font-extrabold text-gray-950 tracking-tight leading-snug"
          >
            “At Advaltad Foundation, we are driven by a singular mission:{" "}
            <span className="text-emerald-600 block sm:inline">
              Adding Value to Africa’s Development.
            </span>”
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-gray-600 text-base sm:text-lg font-sans leading-relaxed pt-2"
          >
            Through scalable infrastructure, educational sponsorship policies, mobile health networks, and dynamic technological literacy programs, we assist local populations in cultivating sovereign economic powerhouses from the ground up.
          </motion.p>
        </div>

        {/* Feature Spotlight Grid Details */}
        <div className="grid lg:grid-cols-12 gap-12 items-center mt-12">
          
          {/* Left Block: Narrative & Global Core Pillars */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-5 space-y-6"
          >
            <div className="p-1 px-3.5 bg-emerald-50 text-emerald-800 font-bold text-xs uppercase rounded-md inline-block">
              International Action Standards
            </div>
            
            <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
              An ecosystem designed for sustainable self-reliance
            </h3>
            
            <p className="text-gray-600 text-sm leading-relaxed font-sans">
              Unlike typical top-down relief pipelines, Advaltad installs structural local assets. By partnering directly with tribal councils, youth-led technical organizations, and regional healthcare developers, we ensure absolute cultural alliance and immediate operations support on every build.
            </p>

            <div className="space-y-3.5 pt-2">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 mt-0.5">
                  <Icon name="Check" size={16} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900">Direct Audited Operations</h4>
                  <p className="text-xs text-gray-500">Every single dollar traced down to specific hardware or block deliveries.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 mt-0.5">
                  <Icon name="Check" size={16} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900">Community Co-Ownership</h4>
                  <p className="text-xs text-gray-500">Regional centers are managed directly by project graduates.</p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <a
                href="#donate"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
              >
                Learn about donation transparencies
                <Icon name="ArrowRight" size={14} />
              </a>
            </div>
          </motion.div>

          {/* Right Block: Dynamic Staggered Core Pathways Cards */}
          <div className="lg:col-span-7 grid sm:grid-cols-2 gap-4">
            {EXPLORE_CARDS.map((card, idx) => {
              return (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ delay: idx * 0.08, duration: 0.5 }}
                  className="p-6 rounded-2xl bg-gray-50/50 border border-gray-100 hover:bg-white hover:shadow-xl hover:shadow-emerald-950/5 hover:-translate-y-1 transition-all duration-300 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-emerald-600 shadow-sm border border-gray-100 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                    <Icon name={card.iconName} size={18} />
                  </div>
                  <h4 className="text-base font-bold text-gray-950 mt-4 group-hover:text-emerald-700 transition-colors">
                    {card.title}
                  </h4>
                  <p className="text-xs text-gray-500 mt-2 font-sans leading-relaxed">
                    {card.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>

        </div>

      </div>
    </section>
  );
};
