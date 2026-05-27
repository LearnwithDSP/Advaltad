import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Icon } from "./Icon";

export const Footer: React.FC = () => {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubscribed(true);
      setEmail("");
    }, 1200);
  };

  const handleQuickLinkClick = (href: string) => {
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <footer id="footer" className="bg-white border-t border-gray-100 overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        {/* Main Columns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 items-start pb-12 border-b border-gray-100">
          
          {/* Logo Brand / About */}
          <div className="lg:col-span-4 space-y-5">
            <a
              href="#home"
              onClick={(e) => {
                e.preventDefault();
                handleQuickLinkClick("#home");
              }}
              className="flex items-center gap-2.5 focus:outline-none max-w-max"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold font-serif text-sm">
                A
              </div>
              <div className="flex flex-col">
                <span className="text-gray-900 font-sans font-extrabold text-sm leading-none tracking-tight">Advaltad</span>
                <span className="text-[10px] text-emerald-600 uppercase font-bold tracking-widest font-sans">Foundation</span>
              </div>
            </a>
            
            <p className="text-xs text-gray-500 font-normal leading-relaxed font-sans max-w-sm">
              An international-standard impact platform adding value to Sub-Saharan Africa’s development via technological skill labs, solar utility pumps, maternal mobile health vans, and eco-adobe shelters.
            </p>

            {/* Social Media Vectors */}
            <div className="flex items-center gap-3 pt-2">
              <a href="#" className="p-2 rounded-xl bg-gray-50 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" aria-label="Advaltad Twitter">
                <Icon name="Twitter" size={16} />
              </a>
              <a href="#" className="p-2 rounded-xl bg-gray-50 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" aria-label="Advaltad Facebook">
                <Icon name="Facebook" size={16} />
              </a>
              <a href="#" className="p-2 rounded-xl bg-gray-50 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" aria-label="Advaltad Instagram">
                <Icon name="Instagram" size={16} />
              </a>
              <a href="#" className="p-2 rounded-xl bg-gray-50 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" aria-label="Advaltad LinkedIn">
                <Icon name="Linkedin" size={16} />
              </a>
            </div>
          </div>

          {/* Quick links Columns */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest font-sans">Organization</h4>
            <ul className="space-y-2.5 text-xs text-gray-500">
              <li>
                <a
                  href="#about"
                  onClick={(e) => {
                    e.preventDefault();
                    handleQuickLinkClick("#about");
                  }}
                  className="hover:text-emerald-600 transition-colors"
                >
                  Who We Are
                </a>
              </li>
              <li>
                <a
                  href="#programs"
                  onClick={(e) => {
                    e.preventDefault();
                    handleQuickLinkClick("#programs");
                  }}
                  className="hover:text-emerald-600 transition-colors"
                >
                  Our Programs
                </a>
              </li>
              <li>
                <a
                  href="#story"
                  onClick={(e) => {
                    e.preventDefault();
                    handleQuickLinkClick("#story");
                  }}
                  className="hover:text-emerald-600 transition-colors"
                >
                  Impact Stories
                </a>
              </li>
              <li>
                <a href="#annual-reports" className="hover:text-emerald-600 transition-colors">
                  Annual Reports
                </a>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest font-sans">Get Involved</h4>
            <ul className="space-y-2.5 text-xs text-gray-500">
              <li>
                <a
                  href="#donate"
                  onClick={(e) => {
                    e.preventDefault();
                    handleQuickLinkClick("#donate");
                  }}
                  className="hover:text-emerald-600 transition-colors"
                >
                  Donate Directly
                </a>
              </li>
              <li>
                <a
                  href="#ambassador"
                  onClick={(e) => {
                    e.preventDefault();
                    handleQuickLinkClick("#ambassador");
                  }}
                  className="hover:text-emerald-600 transition-colors"
                >
                  Ambassador Program
                </a>
              </li>
              <li>
                <a href="#partner" className="hover:text-emerald-600 transition-colors">
                  Corporate Synergy
                </a>
              </li>
              <li>
                <a href="#volunteer" className="hover:text-emerald-600 transition-colors">
                  Field Volunteer
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Details Column */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest font-sans">Contact</h4>
            <ul className="space-y-3 text-xs text-gray-500 font-sans">
              <li className="flex items-start gap-2.5">
                <Icon name="MapPin" size={14} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                <span>12 Advaltad Avenue, Lekki Phase 1, Lagos, Nigeria.</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Icon name="Mail" size={14} className="text-emerald-600 flex-shrink-0" />
                <a href="mailto:contact@advaltad.org" className="hover:text-emerald-600 transition-colors">contact@advaltad.org</a>
              </li>
              <li className="flex items-center gap-2.5">
                <Icon name="Phone" size={14} className="text-emerald-600 flex-shrink-0" />
                <a href="tel:+2348123456789" className="hover:text-emerald-600 transition-colors">+234 812 345 6789</a>
              </li>
            </ul>
          </div>

          {/* Newsletter Form Column */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest font-sans">Global Digests</h4>
            <p className="text-[11px] text-gray-400 font-sans leading-relaxed">
              Subscribe to receive verified field audits, reports & photos quarterly.
            </p>
            
            <AnimatePresence mode="wait">
              {!subscribed ? (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubscribe}
                  className="space-y-2"
                >
                  <div className="relative">
                    <input
                      id="newsletter-email"
                      type="email"
                      required
                      placeholder="e.g. user@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-3 pr-10 py-2.5 text-xs rounded-xl bg-gray-50 border border-gray-100 focus:border-emerald-600 focus:outline-none text-gray-900 font-medium font-sans"
                    />
                    <button
                      id="newsletter-submit-btn"
                      type="submit"
                      disabled={isSubmitting || !email}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 hover:bg-emerald-600 hover:text-white rounded-lg text-emerald-600 transition-all cursor-pointer flex items-center justify-center"
                      aria-label="Submit newsletter subscription"
                    >
                      {isSubmitting ? (
                        <div className="w-3.5 h-3.5 rounded-full border border-current border-t-transparent animate-spin" />
                      ) : (
                        <Icon name="Send" size={12} />
                      )}
                    </button>
                  </div>
                </motion.form>
              ) : (
                <motion.div
                  key="subscribed"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-emerald-50 rounded-xl border border-emerald-100/50 flex items-start gap-2 text-[10px] text-emerald-800"
                >
                  <Icon name="CheckCircle2" size={14} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold">Subscription certified!</p>
                    <p className="text-gray-500 font-sans mt-0.5">We've added your terminal to the global dispatch list successfully.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

        {/* Bottom copyright line with leafy accents */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-gray-400 font-sans">
          <span>© Advaltad Growth and Support Foundation. All Rights Reserved.</span>
          
          <div className="flex items-center gap-4 text-gray-400">
            <a href="#privacy" className="hover:text-emerald-600 transition-colors">Privacy Charter</a>
            <span className="w-1 h-1 rounded-full bg-gray-200"></span>
            <a href="#terms" className="hover:text-emerald-600 transition-colors">Terms of Synergy</a>
          </div>
        </div>

      </div>
    </footer>
  );
};
