import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Icon } from "./Icon";
import { db } from "../lib/supabase";
import logoUrl from "../assets/images/advaltad_logo_1782390247177.jpg";

interface FooterProps {
  onDonateClick: () => void;
  onAmbassadorClick: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onDonateClick, onAmbassadorClick }) => {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [ambassadorName, setAmbassadorName] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const emailVal = localStorage.getItem("advaltad_session_email");
      setSessionEmail(emailVal);
      if (emailVal) {
        try {
          const profile = await db.findAmbassadorByEmail(emailVal);
          if (profile) {
            setAmbassadorName(profile.name);
          }
        } catch (err) {
          console.error("Failed to fetch logged in ambassador profile in footer", err);
        }
      } else {
        setAmbassadorName(null);
      }
    };

    checkSession();

    window.addEventListener("hashchange", checkSession);
    window.addEventListener("storage", checkSession);
    return () => {
      window.removeEventListener("hashchange", checkSession);
      window.removeEventListener("storage", checkSession);
    };
  }, []);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubscribed(true);
      setEmail("");
    }, 1000);
  };

  const handleQuickLinkClick = (hash: string) => {
    window.location.hash = hash;
  };

  return (
    <div className="bg-white">
      {/* FINAL CTA SECTION - Large Elegant Segment */}
      <section className="py-24 sm:py-32 bg-[#F7F8FA] border-t border-slate-100 relative overflow-hidden text-center">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="text-4xl sm:text-5xl font-display font-black text-brand-charcoal tracking-tight leading-none">
              Together We Can Shape Africa's Future
            </h2>
            <p className="text-slate-500 font-sans text-base max-w-[620px] mx-auto leading-relaxed">
              Every school desk financed, every solar panel wired, and every eco-home built builds self-determination. Join our global coalition of impact builders.
            </p>
            
            <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={onDonateClick}
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-brand-primary hover:bg-emerald-950 text-[#FFFFFF] font-display font-black text-xs tracking-widest uppercase transition-all duration-200 shadow-lg shadow-brand-primary/10 cursor-pointer"
              >
                Donate Now
              </button>
              
              {sessionEmail ? (
                <button
                  onClick={() => {
                    window.location.hash = "#/ambassador/dashboard";
                  }}
                  className="w-full sm:w-auto pl-5 pr-8 py-4 rounded-xl border border-emerald-500 bg-white hover:bg-emerald-50/50 text-emerald-800 font-display font-black text-xs tracking-widest uppercase transition-all duration-200 cursor-pointer flex items-center justify-center gap-3.5 shadow-sm"
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-display font-black text-[10px] shadow-sm border border-emerald-500/30 overflow-hidden">
                    {ambassadorName ? (
                      ambassadorName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
                    ) : (
                      <Icon name="User" size={11} className="text-white" />
                    )}
                  </div>
                  <span>Welcome back, {ambassadorName ? ambassadorName.split(" ")[0] : "Ambassador"}</span>
                </button>
              ) : (
                <button
                  onClick={onAmbassadorClick}
                  className="w-full sm:w-auto px-8 py-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-brand-charcoal font-display font-black text-xs tracking-widest uppercase transition-all duration-200 cursor-pointer"
                >
                  Partner With Us
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
 
      {/* MINIMAL FOOTER SECTION */}
      <footer className="py-16 bg-white border-t border-slate-100 relative overflow-hidden">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 pb-12 border-b border-slate-100">
            
            {/* Column 1: Brand & Social */}
            <div className="lg:col-span-4 space-y-6">
              <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => handleQuickLinkClick("#/home")}>
                <div className="w-10 h-10 rounded-full overflow-hidden bg-white border border-slate-100 flex items-center justify-center shadow-md">
                  <img
                    src={logoUrl}
                    alt="Advaltad Foundation Logo"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <span className="text-sm font-display font-black tracking-tight text-brand-charcoal">Advaltad</span>
                  <span className="text-[10px] text-brand-primary tracking-widest block font-extrabold uppercase leading-none">Foundation</span>
                </div>
              </div>

              <p className="text-slate-500 text-xs leading-relaxed max-w-sm font-sans">
                A premier global nonprofit adding value to Africa's development through long-term educational pipelines, tech labs, primary clinics, and ecological grids.
              </p>

              {/* Social links */}
              <div className="flex items-center gap-3">
                <a href="#" className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 hover:text-brand-primary hover:bg-[#DDEBE5] flex items-center justify-center transition-colors" aria-label="Twitter">
                  <Icon name="Twitter" size={14} />
                </a>
                <a href="#" className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 hover:text-brand-primary hover:bg-[#DDEBE5] flex items-center justify-center transition-colors" aria-label="Facebook">
                  <Icon name="Facebook" size={14} />
                </a>
                <a href="#" className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 hover:text-brand-primary hover:bg-[#DDEBE5] flex items-center justify-center transition-colors" aria-label="Instagram">
                  <Icon name="Instagram" size={14} />
                </a>
                <a href="#" className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 hover:text-brand-primary hover:bg-[#DDEBE5] flex items-center justify-center transition-colors" aria-label="Linkedin">
                  <Icon name="Linkedin" size={14} />
                </a>
              </div>
            </div>

            {/* Column 2: Only core links (About, Programs, Stories) */}
            <div className="lg:col-span-4 grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="text-[10px] font-extrabold text-slate-400 tracking-widest uppercase font-display">Resources</h4>
                <ul className="space-y-2 text-xs text-slate-500 font-sans">
                  <li>
                    <button onClick={() => handleQuickLinkClick("#/about")} className="hover:text-brand-primary transition-colors cursor-pointer">
                      About Us
                    </button>
                  </li>
                  <li>
                    <button onClick={() => handleQuickLinkClick("#/programs")} className="hover:text-brand-primary transition-colors cursor-pointer">
                      Our Programs
                    </button>
                  </li>
                  <li>
                    <button onClick={() => handleQuickLinkClick("#/story")} className="hover:text-brand-primary transition-colors cursor-pointer">
                      Impact Stories
                    </button>
                  </li>
                </ul>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-extrabold text-slate-400 tracking-widest uppercase font-display">Contact</h4>
                <ul className="space-y-2 text-xs text-slate-500 font-sans">
                  <li className="flex items-center gap-1.5">
                    <Icon name="Mail" size={12} className="text-brand-primary" />
                    <a href="mailto:contact@advaltad.org" className="hover:text-brand-primary transition-colors">contact@advaltad.org</a>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Icon name="Phone" size={12} className="text-brand-primary" />
                    <span>+234 812 345 6789</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Column 3: Newsletter (subscribed trigger) */}
            <div className="lg:col-span-4 space-y-4">
              <h4 className="text-[10px] font-extrabold text-slate-400 tracking-widest uppercase font-display">Newsletter</h4>
              <p className="text-slate-500 text-xs font-sans leading-relaxed">
                Receive quarterly verified field audits, resource charts, and story dispatches. No spam.
              </p>

              <AnimatePresence mode="wait">
                {!subscribed ? (
                  <form onSubmit={handleSubscribe} className="flex gap-2">
                    <input
                      type="email"
                      required
                      placeholder="Your Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="flex-1 px-4 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-100 focus:border-brand-primary focus:outline-none text-brand-charcoal font-medium font-sans"
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-emerald-950 text-white font-display font-black text-xs uppercase tracking-wider cursor-pointer flex items-center justify-center"
                    >
                      {isSubmitting ? "..." : "Join"}
                    </button>
                  </form>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-3.5 bg-brand-secondary/30 rounded-xl border border-brand-secondary/50 text-[10px] text-brand-primary font-sans font-bold flex items-center gap-1.5"
                  >
                    <Icon name="CheckCircle2" size={14} />
                    <span>Added directly to dispatch list.</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>

          {/* Copyright ribbon */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-slate-400 font-display font-semibold">
            <span>© Advaltad Growth and Support Foundation. All Rights Reserved.</span>
            <div className="flex items-center gap-4">
              <a href="#privacy" className="hover:text-[#0E5A45]">Privacy Charter</a>
              <span>•</span>
              <a href="#terms" className="hover:text-[#0E5A45]">Terms of Synergy</a>
              <span>•</span>
              <a href="#/admin" className="text-emerald-700 hover:text-emerald-800 font-bold bg-emerald-50/70 border border-emerald-100 px-2 py-0.5 rounded transition-all">Admin Portal</a>
            </div>
          </div>

        </div>
      </footer>
    </div>
  );
};
