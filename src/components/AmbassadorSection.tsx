import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Icon } from "./Icon";

export const AmbassadorSection: React.FC = () => {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [field, setField] = useState("Youth Technology Labs");
  const [isRegistered, setIsRegistered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !city) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsRegistered(true);
    }, 1500);
  };

  const BENEFITS = [
    {
      title: "Global Leadership Development",
      desc: "Receive curated mentorship protocols, sovereign development education modules, and direct quarterly syncs with top international builders.",
      iconName: "Compass"
    },
    {
      title: "Active Community Involvement",
      desc: "Represent Advaltad in your local region. Launch localized surveys, host digital workshops, and supervise field asset deliveries.",
      iconName: "Globe"
    },
    {
      title: "Official Audited Credentials",
      desc: "Earn certified Ambassador Badges, global recommendation letters, and cryptographic certificates acknowledging your active development advocacy.",
      iconName: "Award"
    }
  ];

  return (
    <section id="ambassador" className="py-24 bg-white relative overflow-hidden">
      {/* Abstract circles */}
      <div className="absolute bottom-0 left-0 w-[450px] h-[450px] rounded-full bg-emerald-500/5 blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Benefits Listing */}
          <div className="lg:col-span-6 space-y-8">
            <div className="space-y-3 text-center lg:text-left">
              <span className="px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold uppercase tracking-widest inline-block">
                The Advaltad Fellowship
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-sans font-extrabold text-gray-950 tracking-tight leading-tight">
                Become a Growth Ambassador
              </h2>
              <p className="text-gray-500 text-sm sm:text-base leading-relaxed">
                We are building an active network of motivated advocates who represent the mission of sovereign development globally. Translate your deep professional skills into local structural progress.
              </p>
            </div>

            {/* Benefits Block List */}
            <div className="space-y-6">
              {BENEFITS.map((benefit, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -15 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1, duration: 0.5 }}
                  className="flex items-start gap-4 p-5 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-xl hover:shadow-emerald-950/5 hover:-translate-y-0.5 transition-all duration-350"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0 border border-emerald-100/50">
                    <Icon name={benefit.iconName} size={18} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-extrabold text-gray-900 tracking-tight">{benefit.title}</h4>
                    <p className="text-xs text-gray-500 font-sans leading-relaxed">{benefit.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right Column: Dynamic Registration Portal Card */}
          <div className="lg:col-span-6">
            <AnimatePresence mode="wait">
              {!isRegistered ? (
                <motion.div
                  key="reg-card"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="p-8 sm:p-10 rounded-3xl bg-white border border-gray-100/80 shadow-2xl relative"
                >
                  <div className="pb-6 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900">Fellowship Registry</h3>
                    <p className="text-xs text-gray-500 mt-1">Submit your details to instantly generate your Ambassador badge.</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5 pt-6 font-sans">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Your Professional name</label>
                      <input
                        id="reg-name"
                        type="text"
                        required
                        placeholder="e.g. Ramon Bisola"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:border-emerald-500 focus:outline-none text-sm transition-all text-gray-900 font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Your Base City</label>
                        <input
                          id="reg-city"
                          type="text"
                          required
                          placeholder="e.g. Lagos, Nigeria"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:border-emerald-500 focus:outline-none text-sm transition-all text-gray-900 font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Primary Interest Area</label>
                        <select
                          id="reg-field"
                          value={field}
                          onChange={(e) => setField(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:border-emerald-500 focus:outline-none text-sm transition-all text-gray-900 font-medium"
                        >
                          <option>Youth Technology Hubs</option>
                          <option>Scholastic Scholarships</option>
                          <option>Eco-sustainable housing</option>
                          <option>Mobile clinics hygiene</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 text-[11px] text-gray-400 font-sans border border-gray-100">
                      <Icon name="Shield" size={14} className="text-emerald-600 mt-0.5" />
                      <p>By registering, you commit to upholding the values of sovereign leadership development and positive impact across your field of choice.</p>
                    </div>

                    <button
                      id="btn-submit-registration"
                      type="submit"
                      disabled={isSubmitting || !name || !city}
                      className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-sm font-bold text-white shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                          Processing credentials...
                        </>
                      ) : (
                        <>
                          <Icon name="UserCheck" size={16} />
                          Generate My Fellowship Credentials
                        </>
                      )}
                    </button>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="badge-card"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-8 rounded-3xl bg-slate-950 text-white border border-emerald-500/30 shadow-2xl relative overflow-hidden flex flex-col items-center text-center space-y-6"
                >
                  {/* Digital Badge Card Layout */}
                  <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.3)_0,transparent_75%)]" />
                    <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100%_4px]" />
                  </div>

                  <div className="relative z-10 w-full">
                    {/* Top alignment and emblem */}
                    <div className="flex justify-between items-start w-full border-b border-white/10 pb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold font-serif text-sm">A</div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Advaltad Fellowship</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">ID: {Math.floor(Math.random() * 899999 + 100000)}</span>
                    </div>

                    {/* Central Certificate Badge Visual */}
                    <div className="py-8 flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 mb-4 scale-110 shadow-lg shadow-emerald-500/20">
                        <Icon name="Award" size={32} className="animate-pulse" />
                      </div>
                      <h4 className="text-xl font-black tracking-tight">{name}</h4>
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <Icon name="MapPin" size={10} className="text-emerald-500" />
                        <span>{city}</span>
                      </p>
                      
                      <div className="mt-4 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        {field} Advocate
                      </div>
                    </div>

                    {/* Bottom stamp */}
                    <div className="border-t border-white/10 pt-4 flex items-center justify-between text-[11px] text-gray-500">
                      <div className="space-y-0.5">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Commission Date</p>
                        <p className="font-mono text-white text-[10px]">MAY 27, 2026</p>
                      </div>
                      <div className="space-y-0.5 text-right">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Ambassador Status</p>
                        <p className="font-bold text-emerald-400 uppercase flex items-center gap-1 text-[10px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          VALIDATED
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="w-full relative z-10 space-y-3">
                    <p className="text-xs text-emerald-100/70 font-sans leading-relaxed">
                      Congratulations! Your digital credentials have been registered in our global database. We’ve dispatched an introductory toolkit and advocacy booklet to your registered terminal email.
                    </p>
                    
                    <button
                      id="registry-another-btn"
                      onClick={() => setIsRegistered(false)}
                      className="w-full py-2.5 rounded-xl border border-white/20 hover:bg-white/5 text-white/80 hover:text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      Register Another Fellow
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

      </div>
    </section>
  );
};
