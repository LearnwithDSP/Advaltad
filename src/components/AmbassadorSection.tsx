import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Icon } from "./Icon";
import { db } from "../lib/supabase";
import logoUrl from "../assets/images/advaltad_logo_1782390247177.jpg";

export const AmbassadorSection: React.FC = () => {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [field, setField] = useState("Enriching African youths initiative");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !city || !email || !phone || !password) return;

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      // Check if email already registered
      const existing = await db.findAmbassadorByEmail(email);
      if (existing) {
        setErrorMessage("An ambassador with this email address is already registered.");
        setIsSubmitting(false);
        return;
      }

      // Create new ambassador in Supabase/local DB
      const newlyCreated = await db.createAmbassador({
        name,
        city,
        field,
        email,
        phone,
        password
      });

      // Log registration activity
      await db.logActivity({
        ambassador_id: newlyCreated.id,
        ambassador_name: newlyCreated.name,
        type: "registration",
        desc: `Submitted registration for professional portfolio in ${newlyCreated.city} (${newlyCreated.field})`
      });

      // Save user session email in localStorage to auto-login
      localStorage.setItem("advaltad_session_email", email);

      setTimeout(() => {
        setIsSubmitting(false);
        setIsRegistered(true);
        // Automatically redirect to the Growth Ambassador Dashboard
        window.location.hash = "#/growth-ambassadors";
      }, 1500);
    } catch (error) {
      console.error(error);
      setErrorMessage("Registration failed. Please check your network or try again.");
      setIsSubmitting(false);
    }
  };


  const BENEFITS = [
    {
      title: "Leadership Development",
      desc: "Curated mentor alignments, training programs, and direct briefings with international standard NGO experts."
    },
    {
      title: "Global Network",
      desc: "Connect seamlessly with peer advocates, regional specialists, and social builders in over 15+ world nations."
    },
    {
      title: "Community Recognition",
      desc: "Validating recommendations, physical badges, and certified credentials of global developmental contribution."
    },
    {
      title: "Exclusive Opportunities",
      desc: "Access to sponsored community builds, global summit invitations, and localized campaign asset co-ownership."
    }
  ];

  return (
    <section id="ambassador" className="py-24 sm:py-32 bg-white relative overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
        
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-20 items-center">
          
          {/* Left Column: Benefits Listing */}
          <div className="lg:col-span-6 space-y-8 text-left">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                <span className="text-xs uppercase font-extrabold tracking-widest text-brand-primary font-display">
                  GROWTH CORRIDOR
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-display font-black text-brand-charcoal tracking-tight leading-none">
                Become an Ambassador
              </h2>
              <p className="text-slate-500 font-sans text-base leading-relaxed">
                Join our elite fellowship of motivated leaders advancing Sub-Saharan local development. Translate your expertise into sustainable progress.
              </p>
            </div>

            {/* Benefits Block List with check icons */}
            <div className="space-y-6 pt-4">
              {BENEFITS.map((b, idx) => (
                <div key={idx} className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full bg-[#DDEBE5] text-brand-primary flex items-center justify-center flex-shrink-0 mt-1">
                    <Icon name="Check" size={12} className="stroke-2" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-display font-black text-sm text-[#1E293B]">
                      {b.title}
                    </h3>
                    <p className="text-slate-500 text-xs leading-relaxed font-sans max-w-[480px]">
                      {b.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Beautiful Membership registry card */}
          <div className="lg:col-span-6">
            <AnimatePresence mode="wait">
              {!isRegistered ? (
                <motion.div
                  key="form-panel"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="bg-[#F7F8FA] rounded-[32px] p-8 sm:p-10 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.01)]"
                >
                  <div className="pb-6 border-b border-slate-200">
                    <h3 className="text-lg font-display font-black text-brand-charcoal">Enrollment Registry</h3>
                    <p className="text-xs text-slate-400 mt-1">Create your digital badge to access ambassador portals.</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4 pt-6 font-sans">
                    {errorMessage && (
                      <div className="p-3 bg-red-50 border border-red-100 text-xs text-red-800 rounded-xl flex items-start gap-2 text-left">
                        <Icon name="AlertCircle" size={14} className="mt-0.5 flex-shrink-0" />
                        <span>{errorMessage}</span>
                      </div>
                    )}
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Your Professional Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ramon Bisola"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-brand-primary focus:outline-none text-sm font-semibold text-brand-charcoal"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Your Base City</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Lagos, Nigeria"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-brand-primary focus:outline-none text-sm font-semibold text-brand-charcoal"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Focus Interest</label>
                        <select
                          value={field}
                          onChange={(e) => setField(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-brand-primary focus:outline-none text-sm font-semibold text-brand-charcoal"
                        >
                          <option>Enriching African youths initiative</option>
                          <option>Schools (Stem and Robotic education)</option>
                          <option>Green/Agriculture</option>
                          <option>Humanitarian housing scheme</option>
                          <option>Teen club</option>
                          <option>Sponsorship</option>
                          <option>Emergency relief</option>
                          <option>Care for the aged</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Your Email</label>
                        <input
                          type="email"
                          required
                          placeholder="e.g. ramon@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-brand-primary focus:outline-none text-sm font-semibold text-brand-charcoal"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Phone Number</label>
                        <input
                          type="tel"
                          required
                          placeholder="e.g. +234 801 234 5678"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-brand-primary focus:outline-none text-sm font-semibold text-brand-charcoal"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Create Password</label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-brand-primary focus:outline-none text-sm font-semibold text-brand-charcoal"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || !name || !city || !email || !phone || !password}
                      className="w-full py-4 mt-2 rounded-xl bg-brand-primary hover:bg-[#0A4233] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-xs font-display font-black tracking-widest text-white shadow-lg shadow-brand-primary/10 transition-colors uppercase cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? "Becoming an Ambassador..." : "Become an Ambassador."}
                    </button>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="badge-panel"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-brand-charcoal text-white rounded-[32px] p-8 sm:p-10 shadow-2xl relative overflow-hidden flex flex-col items-center text-center space-y-6"
                >
                  {/* Subtle vector grid */}
                  <div className="absolute inset-0 z-0 opacity-10 pointer-events-none bg-[linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:100%_4px]" />

                  <div className="relative z-10 w-full">
                    {/* Header bar of credential */}
                    <div className="flex justify-between items-center w-full border-b border-white/10 pb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full overflow-hidden bg-white border border-slate-700/30 flex items-center justify-center shadow-sm">
                          <img
                            src={logoUrl}
                            alt="Advaltad Foundation Logo"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <span className="text-[10px] font-extrabold tracking-wider text-slate-300 uppercase">Advaltad Fellowship</span>
                      </div>
                      <span className="text-[9px] font-mono font-bold text-brand-accent bg-brand-accent/10 px-2 py-0.5 rounded-md">ID: {Math.floor(Math.random() * 899999 + 100000)}</span>
                    </div>

                    {/* Principal details */}
                    <div className="py-8 flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-brand-primary/10 border border-brand-primary text-brand-primary flex items-center justify-center mb-4 shadow-lg shadow-brand-primary/20">
                        <Icon name="Award" size={28} className="animate-pulse" />
                      </div>
                      
                      <h4 className="text-xl font-display font-black tracking-tight">{name}</h4>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <Icon name="MapPin" size={10} className="text-brand-primary" />
                        <span>{city}</span>
                      </p>

                      <div className="mt-4 px-4 py-1 bg-white/5 border border-white/10 text-[10px] font-display font-extrabold text-brand-accent rounded-full">
                        {field} Advocate
                      </div>
                    </div>

                    {/* Commission Stamps */}
                    <div className="border-t border-white/10 pt-4 flex items-center justify-between text-[10px] text-slate-500 font-display">
                      <div className="space-y-0.5 text-left">
                        <p className="text-[9px] font-extrabold tracking-widest uppercase">COMMISSION DATE</p>
                        <p className="font-mono text-white text-[10px]">MAY 27, 2026</p>
                      </div>
                      <div className="space-y-0.5 text-right">
                        <p className="text-[9px] font-extrabold tracking-widest uppercase">AMBASSADOR STATUS</p>
                        <p className="font-mono text-emerald-400 text-[10px] uppercase flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> ACTIVE
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="w-full relative z-10 space-y-3.5">
                    <button
                      onClick={() => {
                        window.location.hash = "#/growth-ambassadors";
                      }}
                      className="w-full py-4.5 rounded-xl bg-brand-primary hover:bg-[#0A4233] text-white font-display font-bold text-xs tracking-widest uppercase transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Icon name="Compass" size={14} className="animate-spin-slow" />
                      ACCESS PEER DEPLOYMENT DASHBOARD
                    </button>

                    <button
                      onClick={() => setIsRegistered(false)}
                      className="w-full py-3 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer font-sans"
                    >
                      Register New Member
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
