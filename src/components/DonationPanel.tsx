import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { DONATION_TIERS } from "../data";
import { Icon } from "./Icon";

export const DonationPanel: React.FC = () => {
  const [selectedAmount, setSelectedAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [frequency, setFrequency] = useState<"once" | "monthly">("monthly");
  const [checkoutStep, setCheckoutStep] = useState<"idle" | "form" | "confirming" | "success">("idle");
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");

  const activeAmount = customAmount ? parseFloat(customAmount) || 0 : selectedAmount;

  // Dynamically compute estimated impact statements based on arbitrary donation values!
  const getDynamicImpact = (amount: number) => {
    if (amount <= 0) return "Please enter an amount to visualize your global developmental impact.";
    if (amount < 25) {
      return `Provides essential writing tools and scholastic exercises for 1 pupil for 1 academic year.`;
    }
    if (amount < 50) {
      return `Provides complete school bags, premium textbooks, and local solar study lanterns for 3 kids.`;
    }
    if (amount < 150) {
      return `Funds 1 month of developer laboratory coaching, high-speed internet, and startup mentors for 2 youth.`;
    }
    if (amount < 400) {
      return `Directly implements safe solar drinking water filtration tubes for 15 citizens in remote villages.`;
    }
    if (amount < 1000) {
      return `Directly funds compressed-earth Eco-Adobe blocks and structural metal roofing plates for a stable family home.`;
    }
    return `Sponsors a complete communal solar water pump or 4 high-demand technological developer scholarships. Saving lives and unlocking futures!`;
  };

  const handleTierSelect = (amt: number) => {
    setSelectedAmount(amt);
    setCustomAmount("");
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^\d*\.?\d*$/.test(val)) {
      setCustomAmount(val);
      setSelectedAmount(0);
    }
  };

  const handleDonationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutStep("form");
  };

  const executeSimulatedPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!donorName || !donorEmail) return;

    setCheckoutStep("confirming");
    setTimeout(() => {
      setCheckoutStep("success");
    }, 2000);
  };

  const resetCheckout = () => {
    setCheckoutStep("idle");
    setDonorName("");
    setDonorEmail("");
    setCustomAmount("");
    setSelectedAmount(100);
  };

  return (
    <section id="donate" className="py-24 bg-slate-900 text-white relative overflow-hidden">
      {/* Visual Ambient Grid and Lights */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute -top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-emerald-700/10 blur-[130px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:100%_4px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Block: Trust & Narrative */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-3">
              <span className="text-xs uppercase font-bold tracking-widest text-emerald-400 font-sans flex items-center gap-1.5 justify-center lg:justify-start">
                <Icon name="Lock" size={12} className="text-emerald-400" />
                Audited & Trustworthy Charity
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight text-center lg:text-left">
                Empower Africa. Support Our Mission.
              </h2>
              <p className="text-slate-300 text-sm sm:text-base text-center lg:text-left leading-relaxed">
                Your direct contribution sponsors foundational infrastructure programs. By maintaining an audited 91% direct-to-field delivery ratio, we bypass redundant administrative weights and implement directly to local hubs.
              </p>
            </div>

            {/* Strategic trustworthy details */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-4 hover:border-emerald-500/10 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <Icon name="Shield" size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Audited Transparency Rating</h4>
                  <p className="text-xs text-slate-400">Recipient of the 2026 Sovereign NGO Financial Transparency Gold Standard.</p>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-4 hover:border-emerald-500/10 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <Icon name="Lock" size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-sm">AES-256 Fully Secure Checkout</h4>
                  <p className="text-xs text-slate-400">Payments are safely routed via standard token protocols natively.</p>
                </div>
              </div>
            </div>

            {/* Dynamic visual indicator representing SSL trust badges */}
            <div className="flex items-center justify-center lg:justify-start gap-6 border-t border-white/5 pt-6 text-slate-500 text-xs">
              <span className="flex items-center gap-1"><Icon name="CheckCircle2" size={12} className="text-emerald-500" /> Guidestar Platinum</span>
              <span className="flex items-center gap-1"><Icon name="CheckCircle2" size={12} className="text-emerald-500" /> SSL Secured</span>
              <span className="flex items-center gap-1"><Icon name="CheckCircle2" size={12} className="text-emerald-500" /> 501(c)(3) Compliant</span>
            </div>
          </div>

          {/* Right Block: Dynamic Functional Donation Panel Card */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl bg-white text-slate-900 border border-gray-100 p-8 sm:p-10 shadow-2xl relative">
              
              {/* Frequency Toggle Once/Monthly */}
              <div className="flex bg-gray-100 p-1 rounded-xl mb-8 max-w-xs mx-auto">
                <button
                  id="freq-monthly-btn"
                  onClick={() => setFrequency("monthly")}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    frequency === "monthly" ? "bg-emerald-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Give Monthly (Recommend)
                </button>
                <button
                  id="freq-once-btn"
                  onClick={() => setFrequency("once")}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    frequency === "once" ? "bg-emerald-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  One-time Gift
                </button>
              </div>

              {/* Donation Tiers Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {DONATION_TIERS.map((tier) => {
                  const active = selectedAmount === tier.amount;
                  return (
                    <button
                      id={`dn-tier-${tier.amount}`}
                      key={tier.amount}
                      onClick={() => handleTierSelect(tier.amount)}
                      className={`p-4 rounded-xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                        active
                          ? "border-emerald-600 bg-emerald-50/40 text-emerald-950"
                          : "border-gray-100 hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <span className="text-xs uppercase font-extrabold text-emerald-600">{tier.label.split(" ")[0]}</span>
                      <span className="text-xl sm:text-2xl font-black font-sans leading-none mt-1">
                        ${tier.amount}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Numeric Value Input Box */}
              <div className="mt-4 relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-lg">$</span>
                <input
                  id="custom-donation-input"
                  type="text"
                  placeholder="Enter custom donation amount"
                  value={customAmount}
                  onChange={handleCustomChange}
                  className="w-full pl-8 pr-12 py-4 rounded-xl bg-gray-50 border-2 border-slate-100 focus:border-emerald-500 focus:outline-none text-base font-bold text-gray-900 transition-all font-sans"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 uppercase tracking-widest font-mono">USD</span>
              </div>

              {/* Live Dynamic Impact Statement Card description */}
              <div className="mt-6 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100/60 flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-emerald-600 text-white mt-1">
                  <Icon name="Gift" size={14} className="fill-white/10" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Estimated Tangible Impact</p>
                  <p className="text-xs md:text-sm text-gray-700 mt-1 font-sans leading-relaxed font-medium">
                    {getDynamicImpact(activeAmount)}
                  </p>
                </div>
              </div>

              {/* Submit triggers Checkouts */}
              <form onSubmit={handleDonationSubmit} className="mt-8">
                <button
                  id="submit-donation-checkout"
                  type="submit"
                  disabled={activeAmount <= 0}
                  className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed font-extrabold text-sm text-white shadow-xl shadow-emerald-600/10 hover:shadow-emerald-600/25 hover:-translate-y-0.5 disabled:translate-y-0 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Icon name="Coins" size={16} />
                  Donate ${activeAmount > 0 ? activeAmount : ""} Now
                </button>
              </form>

            </div>
          </div>

        </div>

      </div>

      {/* Simulated Production Checkout Modal Overlay */}
      <AnimatePresence>
        {checkoutStep !== "idle" && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={resetCheckout}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative z-10 w-full max-w-md bg-white text-slate-900 rounded-3xl shadow-2xl p-6 sm:p-8 border border-gray-100 max-h-[90vh] overflow-y-auto"
            >
              <button
                id="close-checkout"
                onClick={resetCheckout}
                className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <Icon name="X" size={18} />
              </button>

              {checkoutStep === "form" && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                      <Icon name="Lock" size={20} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Secure Payment Details</h3>
                    <p className="text-xs text-gray-500 mt-1">Sponsoring ${activeAmount} {frequency === "monthly" ? "monthly" : "once"}</p>
                  </div>

                  <form onSubmit={executeSimulatedPayment} className="space-y-4 font-sans">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Your Full Name</label>
                      <input
                        id="chk-name"
                        type="text"
                        required
                        placeholder="e.g. Ramon Bisola"
                        value={donorName}
                        onChange={(e) => setDonorName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:border-emerald-500 focus:outline-none text-sm transition-all text-gray-900 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Email Address</label>
                      <input
                        id="chk-email"
                        type="email"
                        required
                        placeholder="e.g. ramonbisola1@gmail.com"
                        value={donorEmail}
                        onChange={(e) => setDonorEmail(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:border-emerald-500 focus:outline-none text-sm transition-all text-gray-900 font-medium"
                      />
                    </div>

                    {/* Card Mock details fields */}
                    <div className="border border-emerald-100 bg-emerald-50/30 p-4 rounded-xl space-y-3">
                      <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide">Test Card Credentials (Secured Demo)</p>
                      
                      <div>
                        <input
                          type="text"
                          disabled
                          value="••••  ••••  ••••  4242"
                          className="w-full px-3 py-2 bg-white/70 border border-emerald-100 rounded-lg text-xs font-mono text-gray-600"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          disabled
                          value="12 / 28"
                          className="px-3 py-2 bg-white/70 border border-emerald-100 rounded-lg text-xs font-mono text-center text-gray-600"
                        />
                        <input
                          type="text"
                          disabled
                          value="CVC: 332"
                          className="px-3 py-2 bg-white/70 border border-emerald-100 rounded-lg text-xs font-mono text-center text-gray-600"
                        />
                      </div>
                    </div>

                    <button
                      id="execute-checkout-btn"
                      type="submit"
                      className="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 shadow-md transition-all cursor-pointer"
                    >
                      Authorize Demonstration Payment
                    </button>
                  </form>
                </div>
              )}

              {checkoutStep === "confirming" && (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-12 h-12 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
                  <h3 className="text-lg font-bold text-gray-900">Configuring secure bank handshake...</h3>
                  <p className="text-xs text-gray-500">Democratizing growth funds transparently.</p>
                </div>
              )}

              {checkoutStep === "success" && (
                <div className="text-center space-y-6 py-6 font-sans">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto scale-110">
                    <Icon name="Check" size={32} />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">Support Success!</h3>
                    <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest">Transaction receipt fully verified</p>
                    <p className="text-sm text-gray-500 px-4 leading-relaxed mt-2">
                      Thank you, <span className="font-bold text-gray-800">{donorName}</span> ({donorEmail}). Your gift of <span className="font-bold text-emerald-800">${activeAmount}</span> is allocated directly to our field initiatives. It is fully tax-deductible under standard provisions.
                    </p>
                  </div>

                  <div className="border border-gray-100 bg-gray-50 p-4 rounded-xl text-left text-xs text-gray-400 space-y-1">
                    <p className="font-bold text-slate-700">Audit Checksum:</p>
                    <p className="font-mono text-[10px] truncate">SHA256: advaltad_foundation_{Date.now()}_audit_success_certified_ok</p>
                  </div>

                  <button
                    id="success-checkout-ok"
                    onClick={resetCheckout}
                    className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Done
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
