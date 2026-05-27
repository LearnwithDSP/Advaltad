import React from "react";
import { motion } from "motion/react";
import { Icon } from "./Icon";

interface CtaStripProps {
  onDonateClick: () => void;
  onAmbassadorClick: () => void;
}

export const CtaStrip: React.FC<CtaStripProps> = ({ onDonateClick, onAmbassadorClick }) => {
  return (
    <section className="py-20 relative overflow-hidden bg-emerald-900 text-white">
      {/* Dynamic graphic patterns */}
      <div className="absolute inset-0 z-0 opacity-15 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:3rem_3rem]" />
        <div className="absolute -top-1/2 -left-1/4 w-[600px] h-[600px] rounded-full bg-emerald-300 blur-[130px]" />
        <div className="absolute -bottom-1/2 -right-1/4 w-[600px] h-[600px] rounded-full bg-teal-300 blur-[130px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
          
          <div className="text-center lg:text-left space-y-4 max-w-3xl">
            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="px-3.5 py-1.5 rounded-full bg-white/10 text-emerald-300 text-xs uppercase tracking-widest font-extrabold"
            >
              Direct Action Alliance
            </motion.span>
            
            <motion.h2
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-3xl sm:text-4xl md:text-5xl font-sans font-extrabold tracking-tight leading-tight"
            >
              Be Part of the Change Africa Needs Today
            </motion.h2>
            
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-emerald-100/80 text-sm sm:text-base font-sans"
            >
              Whether you sponsor technological toolkits for youth, build eco-adobe structures for climate families, or represent us locally as an ambassador, your presence expands Africa's sovereign future.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto"
          >
            <button
              id="cta-strip-donate-btn"
              onClick={onDonateClick}
              className="w-full sm:w-auto px-5 py-3 sm:px-8 sm:py-4 rounded-xl bg-white text-emerald-990 font-bold hover:bg-emerald-50 hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-emerald-950/20 transition-all duration-200 cursor-pointer text-center flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <Icon name="Heart" size={16} className="fill-emerald-800 text-emerald-800" />
              Donate Now
            </button>

            <button
              id="cta-strip-ambassador-btn"
              onClick={onAmbassadorClick}
              className="w-full sm:w-auto px-5 py-3 sm:px-8 sm:py-4 rounded-xl border border-white/30 bg-white/5 hover:bg-white/10 text-white font-bold hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer text-center flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              Join as Ambassador
              <Icon name="ArrowRight" size={16} className="text-emerald-300" />
            </button>
          </motion.div>

        </div>
      </div>
    </section>
  );
};
