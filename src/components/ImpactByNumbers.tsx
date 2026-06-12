import React from "react";
import { motion } from "motion/react";

export const ImpactByNumbers: React.FC = () => {
  return (
    <section className="py-24 bg-white border-y border-slate-100 relative overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8 text-center">
        
        {/* Core Header */}
        <div className="max-w-xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
            <span className="text-xs uppercase font-extrabold tracking-widest text-brand-primary font-display">
              TRANSPARENT RESULTS
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-black text-brand-charcoal tracking-tight">
            Our Impact in Numbers
          </h2>
        </div>

        {/* 4-Column Minimal Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 sm:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="space-y-2"
          >
            <span className="text-4xl sm:text-5xl lg:text-6xl font-display font-black text-brand-primary block leading-none">
              12,500+
            </span>
            <span className="text-sm font-semibold text-slate-400 font-display block">
              Lives Impacted
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="space-y-2"
          >
            <span className="text-4xl sm:text-5xl lg:text-6xl font-display font-black text-brand-primary block leading-none">
              450+
            </span>
            <span className="text-sm font-semibold text-slate-400 font-display block">
              Communities Reached
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="space-y-2"
          >
            <span className="text-4xl sm:text-5xl lg:text-6xl font-display font-black text-brand-primary block leading-none">
              95%
            </span>
            <span className="text-sm font-semibold text-slate-400 font-display block">
              Program Success Rate
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="space-y-2"
          >
            <span className="text-4xl sm:text-5xl lg:text-6xl font-display font-black text-brand-primary block leading-none">
              $1M+
            </span>
            <span className="text-sm font-semibold text-slate-400 font-display block">
              Raised & Distributed
            </span>
          </motion.div>
        </div>

      </div>
    </section>
  );
};
