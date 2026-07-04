import React from "react";
import { motion } from "motion/react";
import { AmbassadorSection } from "../components/AmbassadorSection";
import { Icon } from "../components/Icon";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 25 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 80,
      damping: 14,
    },
  },
};

export const AmbassadorPage: React.FC = () => {
  return (
    <div className="pt-20 bg-white min-h-screen text-left">
      
      {/* Banner / Header Title Row */}
      <section className="bg-[#F7F8FA] border-b border-slate-100 py-16 sm:py-20 relative overflow-hidden">
        <div className="absolute inset-x-0 bottom-0 top-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#10B981_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="max-w-[1200px] mx-auto px-6 lg:px-8 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
            <span className="text-xs uppercase font-extrabold tracking-widest text-brand-primary font-display">
              FELLOWSHIP CORRIDOR
            </span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-display font-black text-brand-charcoal tracking-tight leading-tight">
            Advaltad Global Ambassadors
          </h1>
          <p className="text-slate-500 font-sans text-base max-w-[620px] leading-relaxed">
            Translate your passion, skills, and resources into certified local development. Join our network of over 1,400+ advocates globally.
          </p>
        </div>
      </section>

      {/* Renders the actual core registry block */}
      <div className="bg-white">
        <AmbassadorSection />
      </div>

      {/* AVU Benefits Section */}
      <motion.section 
        className="py-20 bg-white border-t border-slate-100 overflow-hidden"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={containerVariants}
      >
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8 space-y-12">
          <motion.div variants={itemVariants} className="max-w-2xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-extrabold uppercase tracking-wider">
              <Icon name="Sparkles" size={12} className="animate-pulse" />
              <span>Value Proposition</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-display font-black text-brand-charcoal tracking-tight leading-tight">
              Why Hold Advaltad Value Units (AVU) in Your Growth Ambassador Wallet?
            </h2>
            <p className="text-slate-500 font-sans text-sm sm:text-base leading-relaxed">
              Holding Advaltad Value Units (AVU) is more than owning a digital asset—it's a commitment to sustainable development, collaboration, and social impact across Africa.
            </p>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: "Globe",
                colorClass: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white",
                borderClass: "hover:border-emerald-100/80 hover:bg-emerald-50/10",
                title: "1. Contribute to Africa's Development",
                desc: "Your participation supports initiatives that promote sustainable growth and community development across Africa."
              },
              {
                icon: "HeartHandshake",
                colorClass: "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white",
                borderClass: "hover:border-blue-100/80 hover:bg-blue-50/10",
                title: "2. Global Networking for Growth",
                desc: "Connect with Growth Ambassadors from different countries, creating opportunities for learning, collaboration, and business development."
              },
              {
                icon: "Coins",
                colorClass: "bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white",
                borderClass: "hover:border-amber-100/80 hover:bg-amber-50/10",
                title: "3. Exchange Value with Other Growth Ambassadors",
                desc: "Use your Advaltad Value Units to exchange value within the Advaltad community, encouraging mutual support and economic participation."
              },
              {
                icon: "HandHelping",
                colorClass: "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white",
                borderClass: "hover:border-indigo-100/80 hover:bg-indigo-50/10",
                title: "4. Pool Resources for Greater Productivity",
                desc: "Join a community that believes in peer support, resource sharing, and collective action to achieve greater impact."
              },
              {
                icon: "Home",
                colorClass: "bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white",
                borderClass: "hover:border-teal-100/80 hover:bg-teal-50/10",
                title: "5. Access Humanitarian Housing Schemes",
                desc: "Eligible participants may benefit from humanitarian housing initiatives designed to improve access to affordable housing."
              },
              {
                icon: "Heart",
                colorClass: "bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white",
                borderClass: "hover:border-rose-100/80 hover:bg-rose-50/10",
                title: "6. Support Charitable Causes",
                desc: "Every Value Unit held contributes to programs that uplift vulnerable communities through humanitarian and charitable projects."
              }
            ].map((benefit, idx) => (
              <motion.div 
                key={idx} 
                variants={itemVariants}
                whileHover={{ y: -5, scale: 1.01 }}
                className={`bg-[#F8FAFC] p-6 sm:p-7 rounded-2xl border border-slate-100/60 flex flex-col space-y-4 transition-all duration-300 hover:shadow-md group ${benefit.borderClass}`}
              >
                <div className={`p-3 rounded-xl w-12 h-12 flex items-center justify-center shadow-sm transition-all duration-300 ${benefit.colorClass}`}>
                  <Icon name={benefit.icon} size={20} />
                </div>
                <div className="space-y-2">
                  <h3 className="font-display font-bold text-sm text-[#0F172A] leading-tight group-hover:text-emerald-600 transition-colors duration-200">
                    {benefit.title}
                  </h3>
                  <p className="text-slate-500 font-sans text-xs leading-relaxed">
                    {benefit.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Inspirational Footer Callout */}
          <motion.div 
            variants={itemVariants}
            className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-slate-900 via-[#111827] to-emerald-950 text-white p-8 sm:p-10 shadow-xl text-center max-w-3xl mx-auto"
          >
            <div className="absolute inset-x-0 bottom-0 top-0 pointer-events-none opacity-[0.02] bg-[radial-gradient(#FFF_1px,transparent_1px)] [background-size:20px_20px]" />
            <div className="relative z-10 space-y-4">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 font-mono">FELLOWSHIP MISSION</span>
              <p className="font-serif italic text-lg sm:text-xl text-slate-100 max-w-xl mx-auto leading-relaxed">
                "Together, we grow. Together, we create lasting impact."
              </p>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Ambassador Roadmap flow */}
      <section className="py-20 bg-[#F7F8FA] border-t border-slate-100/80">
        <div className="max-w-[1240px] mx-auto px-6 lg:px-8 text-center space-y-12">
          <div className="max-w-xl mx-auto space-y-4">
            <h3 className="text-sm uppercase tracking-widest font-extrabold text-slate-400 font-display">HOW THE FELLOWSHIP DEPLOYS</h3>
            <h2 className="text-2xl sm:text-3xl font-display font-black text-brand-charcoal tracking-tight">Your Journey as an Ambassador</h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-3 max-w-4xl mx-auto text-left">
            {[
              {
                step: "01",
                title: "Register & Generate Card",
                desc: "Fill the registry above to establish your credentials. This generates your active digital secure badge."
              },
              {
                step: "02",
                title: "Sign in to Dashboard",
                desc: "Use your badge to secure access to the global corridor. View active field build-sheets and submit projects."
              },
              {
                step: "03",
                title: "Champion Projects",
                desc: "Co-operate locally or coordinate resources. Review progress directly and receive professional recommendations."
              }
            ].map((r) => (
              <div key={r.step} className="bg-white p-7 rounded-2xl border border-slate-100/50 space-y-4 shadow-sm relative overflow-hidden group">
                <span className="absolute -top-4 -right-2 text-[48px] font-display font-black text-slate-50/70 group-hover:text-brand-secondary/40 transition-colors">{r.step}</span>
                <div className="space-y-2 relative z-10 pt-4">
                  <h4 className="font-display font-black text-sm text-[#1E293B]">{r.title}</h4>
                  <p className="text-slate-500 font-sans text-xs leading-relaxed">
                    {r.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
};
