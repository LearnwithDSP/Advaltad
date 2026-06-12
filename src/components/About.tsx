import React from "react";
import { motion } from "motion/react";
import { Icon } from "./Icon";

export const About: React.FC = () => {
  return (
    <section id="about" className="py-24 sm:py-32 bg-white relative overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
        
        {/* Two-Column Mission Layout */}
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-20 items-stretch">
          
          {/* Left Column: Large Bold Statement */}
          <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
              <span className="text-xs uppercase font-extrabold tracking-widest text-brand-primary font-display">
                OUR MISSION
              </span>
            </div>
            
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-black text-brand-charcoal tracking-tight leading-[1.15]">
              Adding Value to Africa’s Development
            </h2>
            
            <p className="text-brand-charcoal font-semibold text-lg max-w-[550px] leading-relaxed font-sans">
              "We believe that true empowerment originates from within. Our strategy replaces top-down aid pipelines with durable local infrastructure."
            </p>
          </div>

          {/* Right Column: Narrative Action & Highlights */}
          <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
            <p className="text-slate-600 text-base leading-relaxed max-w-[650px] font-sans">
              Unlike classical emergency relief, Advaltad establishes durable grassroots foundations across Sub-Saharan climates. By partnering directly with local architects, regional healthcare clinics, and native youth-led technology centers, we build clean power networks and high-demand developer toolkits that promote permanent self-reliance.
            </p>

            <div className="grid grid-cols-2 gap-6 pt-4">
              <div className="space-y-2">
                <div className="text-brand-primary">
                  <Icon name="Check" size={20} />
                </div>
                <h3 className="font-display font-bold text-sm text-brand-charcoal">
                  Direct Field Allocation
                </h3>
                <p className="text-slate-500 text-xs leading-relaxed font-sans">
                  Every resource is verified downwards to specific structural builds or learning modules.
                </p>
              </div>

              <div className="space-y-2">
                <div className="text-brand-primary">
                  <Icon name="Users" size={20} />
                </div>
                <h3 className="font-display font-bold text-sm text-brand-charcoal">
                  Community Ownership
                </h3>
                <p className="text-slate-500 text-xs leading-relaxed font-sans">
                  All tech-labs and eco-housing projects are co-operated directly by program graduates.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Beautiful Edge-to-Edge Action Imagery */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={{ duration: 0.8 }}
          className="mt-16 rounded-[32px] overflow-hidden relative aspect-[21/9] bg-slate-100 shadow-[0_12px_45px_rgba(0,0,0,0.02)]"
        >
          <img
            src="https://images.unsplash.com/photo-1531206715517-5c0ba140b2b8?q=80&w=2000"
            alt="Local community collaboration on development projects in Sub-Saharan Africa"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-charcoal/80 via-brand-charcoal/10 to-transparent flex items-end p-8 sm:p-12" />
        </motion.div>

      </div>
    </section>
  );
};
