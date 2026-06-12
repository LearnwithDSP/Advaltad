import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Icon } from "./Icon";

export const DonationPanel: React.FC = () => {
  const [selectedAmount, setSelectedAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [frequency, setFrequency] = useState<"once" | "monthly">("monthly");
  const [checkoutStep, setCheckoutStep] = useState<"idle" | "form" | "confirming" | "success">("idle");
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");

  const activeAmount = customAmount ? parseFloat(customAmount) || 0 : selectedAmount;

  // Exact requested impact statements
  const getDynamicImpact = (amount: number) => {
    if (amount <= 0) return "Choose or enter an amount to see your impact.";
    if (amount === 25) return "School supplies for one child.";
    if (amount === 50) return "Provides solar study lamps for two families.";
    if (amount === 100) return "Supports healthcare outreach.";
    if (amount === 250) return "Finances deep clean water filters for school facilities.";
    
    // Formula for custom values
    if (amount < 25) return "Supports basic classroom materials for young learners.";
    if (amount < 100) return "Provides digital school packets and textbooks for kids.";
    if (amount < 250) return "Funds healthcare counselor audits and mobile wellness hours.";
    return "Sponsors deep water boreholes and clean power systems for local hubs.";
  };

  const handleSelectAmount = (amt: number) => {
    setSelectedAmount(amt);
    setCustomAmount("");
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^\d*$/.test(val)) {
      setCustomAmount(val);
      setSelectedAmount(0);
    }
  };

  const handleDonateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeAmount > 0) {
      setCheckoutStep("form");
    }
  };

  return (
    <section id="donate" className="py-24 sm:py-32 bg-[#F7F8FA] relative overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
        
        {/* Core Header */}
        <div className="max-w-xl mx-auto text-center mb-16 sm:mb-20 space-y-4">
          <div className="inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
            <span className="text-xs uppercase font-extrabold tracking-widest text-brand-primary font-display">
              MAKE A DIFFERENCE
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-display font-black text-brand-charcoal tracking-tight">
            Support Our Mission
          </h2>
          <p className="text-slate-500 font-sans text-base max-w-[500px] mx-auto">
            100% of public donations are allocated directly to Sub-Saharan field initiatives. Bypassing administrative friction.
          </p>
        </div>

        {/* Premium Centered White Card with 32px Rounded Corners */}
        <div className="max-w-2xl mx-auto bg-white rounded-[32px] p-8 sm:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-slate-50">
          
          {/* Once / Monthly Toggle */}
          <div className="flex bg-slate-50 p-1 rounded-2xl mb-10 max-w-xs mx-auto">
            <button
              onClick={() => setFrequency("monthly")}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                frequency === "monthly" ? "bg-brand-primary text-white shadow-sm" : "text-slate-400 hover:text-brand-charcoal"
              }`}
            >
              Give Monthly
            </button>
            <button
              onClick={() => setFrequency("once")}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                frequency === "once" ? "bg-brand-primary text-white shadow-sm" : "text-slate-400 hover:text-brand-charcoal"
              }`}
            >
              One-time Gift
            </button>
          </div>

          {/* Minimal Preset Donation Amounts */}
          <div className="grid grid-cols-4 gap-4">
            {[25, 50, 100, 250].map((amt) => {
              const active = selectedAmount === amt && !customAmount;
              return (
                <button
                  key={amt}
                  onClick={() => handleSelectAmount(amt)}
                  className={`py-5 rounded-2xl border transition-all text-center cursor-pointer font-display font-black text-lg ${
                    active
                      ? "border-brand-primary bg-brand-secondary/40 text-brand-primary"
                      : "border-slate-100 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  ${amt}
                </button>
              );
            })}
          </div>

          {/* Custom Amount Form Field */}
          <div className="mt-6 relative">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 font-display font-black text-slate-400">$</span>
            <input
              type="text"
              placeholder="Custom Amount"
              value={customAmount}
              onChange={handleCustomChange}
              className="w-full pl-10 pr-16 py-4 rounded-2xl bg-slate-50/50 border border-slate-100 focus:border-brand-primary focus:outline-none text-base font-bold text-[#1E293B] transition-all font-sans"
            />
            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 tracking-wider">USD</span>
          </div>

          {/* Dynamic Impact Statement Card Box updates instantly when amount updates */}
          <div className="mt-8 p-6 rounded-2xl bg-brand-secondary/30 border border-brand-secondary/60 flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-brand-primary text-white flex-shrink-0">
              <Icon name="Gift" size={16} />
            </div>
            <div>
              <p className="text-[10px] font-extrabold tracking-wider text-brand-primary uppercase">Tangible Resource Allocation</p>
              <p className="text-sm text-brand-charcoal mt-1.5 font-sans font-semibold leading-relaxed">
                {getDynamicImpact(activeAmount)}
              </p>
            </div>
          </div>

          {/* Submit Trigger Actions */}
          <form onSubmit={handleDonateSubmit} className="mt-10">
            <button
              type="submit"
              disabled={activeAmount <= 0}
              className="w-full py-4.5 rounded-2xl bg-brand-primary hover:bg-[#0A4233] disabled:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed font-display font-extrabold text-[#FFFFFF] text-sm tracking-widest shadow-xl shadow-brand-primary/10 hover:shadow-brand-primary/20 hover:-translate-y-0.5 disabled:translate-y-0 transition-all duration-300 cursor-pointer flex items-center justify-center gap-2"
            >
              <Icon name="Coins" size={16} />
              DONATE ${activeAmount > 0 ? activeAmount : ""} NOW
            </button>
          </form>

          {/* AES Fully Secure Tag Indicators */}
          <div className="mt-6 flex justify-center items-center gap-5 text-[10px] text-slate-400 font-display font-medium">
            <span className="flex items-center gap-1">
              <Icon name="Lock" size={12} className="text-brand-primary" /> SECURED AES-256
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Icon name="CheckCircle2" size={12} className="text-brand-primary" /> 501(C)(3) COMPLIANT
            </span>
          </div>

        </div>

      </div>

      {/* Simulated Secure Payment Checkout Dialogue Overlay */}
      <AnimatePresence>
        {checkoutStep !== "idle" && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setCheckoutStep("idle")}
              className="absolute inset-0 bg-brand-charcoal/70 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative z-10 w-full max-w-md bg-white text-brand-charcoal rounded-[32px] p-8 border border-slate-100 shadow-2xl"
            >
              <button
                onClick={() => setCheckoutStep("idle")}
                className="absolute top-5 right-5 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Icon name="X" size={16} />
              </button>

              {checkoutStep === "form" && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-2xl bg-brand-secondary text-brand-primary flex items-center justify-center mx-auto mb-3">
                      <Icon name="Lock" size={18} />
                    </div>
                    <h3 className="text-xl font-display font-black text-brand-charcoal">Secure Checkout</h3>
                    <p className="text-xs text-slate-400 mt-1">Sponsoring ${activeAmount} {frequency === "monthly" ? "monthly" : "once"}</p>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (donorName && donorEmail) {
                        setCheckoutStep("confirming");
                        setTimeout(() => {
                          setCheckoutStep("success");
                        }, 1800);
                      }
                    }}
                    className="space-y-4 font-sans text-left"
                  >
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Your Full Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ramon Bisola"
                        value={donorName}
                        onChange={(e) => setDonorName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:border-brand-primary focus:outline-none text-sm font-semibold text-brand-charcoal"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Your Email</label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. ramonbisola1@gmail.com"
                        value={donorEmail}
                        onChange={(e) => setDonorEmail(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:border-brand-primary focus:outline-none text-sm font-semibold text-brand-charcoal"
                      />
                    </div>

                    <div className="p-4 bg-brand-secondary/30 rounded-2xl border border-brand-secondary/50 space-y-2">
                      <p className="text-[9px] font-extrabold text-brand-primary uppercase tracking-wider">SECURE SANDBOX TRANSACTION</p>
                      <div className="font-mono text-xs text-slate-500 flex justify-between">
                        <span>CARD: •••• •••• •••• 4242</span>
                        <span>ZIP: 10001</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-4 rounded-xl bg-brand-primary hover:bg-[#0A4233] text-white font-bold text-xs tracking-wider uppercase cursor-pointer transition-colors"
                    >
                      Authorize Sandbox Donation
                    </button>
                  </form>
                </div>
              )}

              {checkoutStep === "confirming" && (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-12 h-12 rounded-full border-4 border-brand-secondary border-t-brand-primary animate-spin" />
                  <h3 className="text-lg font-display font-extrabold">Contacting secure gateways...</h3>
                  <p className="text-xs text-slate-400">Verifying bank allocations safely.</p>
                </div>
              )}

              {checkoutStep === "success" && (
                <div className="text-center space-y-6 pt-4">
                  <div className="w-16 h-16 rounded-full bg-brand-secondary text-brand-primary flex items-center justify-center mx-auto scale-110">
                    <Icon name="Check" size={28} />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-2xl font-display font-black text-brand-charcoal">Bless You!</h3>
                    <p className="text-xs font-bold text-brand-primary uppercase tracking-widest">Transaction fully verified</p>
                    <p className="text-sm text-slate-500 leading-relaxed max-w-[320px] mx-auto mt-2 font-sans">
                      Thank you, <span className="font-semibold text-brand-charcoal">{donorName}</span>. Your {frequency === "monthly" ? "monthly recurring" : "one-time"} gift of <span className="font-semibold text-brand-primary">${activeAmount}</span> is allocated directly to our field initiatives.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setCheckoutStep("idle");
                      setDonorName("");
                      setDonorEmail("");
                      setCustomAmount("");
                    }}
                    className="w-full py-3.5 rounded-xl bg-brand-charcoal hover:bg-slate-800 text-white font-bold text-xs tracking-wider uppercase cursor-pointer"
                  >
                    Return to Main Site
                  </button>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};
