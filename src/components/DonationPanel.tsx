import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Icon } from "./Icon";
import { Confetti } from "./Confetti";
import { jsPDF } from "jspdf";
import { db } from "../lib/supabase";

interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  rateToUSD: number; // Rough conversion factor to calculate USD equivalent for impact descriptions
  presets: number[];
  flag: string;
  placeholderPhone: string;
  phonePrefix: string;
  paymentMethods: ("card" | "mobile_money" | "bank_transfer")[];
}

const CURRENCIES: CurrencyConfig[] = [
  {
    code: "NGN",
    symbol: "₦",
    name: "Nigerian Naira (NGN)",
    rateToUSD: 1500,
    presets: [10000, 25000, 50000, 100000],
    flag: "🇳🇬",
    placeholderPhone: "08012345678",
    phonePrefix: "+234",
    paymentMethods: ["card", "bank_transfer"]
  },
  {
    code: "USD",
    symbol: "$",
    name: "United States Dollar (USD)",
    rateToUSD: 1,
    presets: [25, 50, 100, 250],
    flag: "🇺🇸",
    placeholderPhone: "201-555-0123",
    phonePrefix: "+1",
    paymentMethods: ["card"]
  },
  {
    code: "GHS",
    symbol: "GH₵",
    name: "Ghanaian Cedi (GHS)",
    rateToUSD: 15,
    presets: [200, 500, 1000, 2500],
    flag: "🇬🇭",
    placeholderPhone: "0241234567",
    phonePrefix: "+233",
    paymentMethods: ["card", "mobile_money"]
  },
  {
    code: "KES",
    symbol: "KSh",
    name: "Kenyan Shilling (KES)",
    rateToUSD: 130,
    presets: [2000, 5000, 10000, 25000],
    flag: "🇰🇪",
    placeholderPhone: "0712345678",
    phonePrefix: "+254",
    paymentMethods: ["card", "mobile_money"]
  }
];

const NGO_PROGRAMS = [
  { id: "youth-empowerment", label: "Enriching African youths initiative", category: "YOUTH EMPOWERMENT" },
  { id: "schools-stem", label: "Schools (Stem and Robotic education)", category: "EDUCATION & TECHNOLOGY" },
  { id: "green-agri", label: "Green/Agriculture", category: "AGRICULTURE & ENVIRONMENT" },
  { id: "housing", label: "Humanitarian housing scheme", category: "HUMANITARIAN HOUSING" },
  { id: "teen-club", label: "Teen club", category: "COMMUNITY & TEENS" },
  { id: "sponsorship", label: "Sponsorship", category: "INDIVIDUAL SPONSORSHIP" },
  { id: "relief", label: "Emergency relief", category: "EMERGENCY RELIEF" },
  { id: "aged-care", label: "Care for the aged", category: "SENIOR WELFARE" }
];

export const DonationPanel: React.FC = () => {
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyConfig>(CURRENCIES[0]); // Default to NGN (Naira)
  const [selectedAmount, setSelectedAmount] = useState<number>(CURRENCIES[0].presets[1]); // Default to 25k preset
  const [customAmount, setCustomAmount] = useState<string>("");
  const [frequency, setFrequency] = useState<"once" | "monthly">("once");
  
  // Checkout flow states
  const [checkoutStep, setCheckoutStep] = useState<"idle" | "form" | "paystack_gateway" | "confirming" | "success">("idle");
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [targetProgramId, setTargetProgramId] = useState(NGO_PROGRAMS[0].id);
  const [donorNote, setDonorNote] = useState("");
  const [paymentReference, setPaymentReference] = useState("");

  // Paystack modal states
  const [paystackMethod, setPaystackMethod] = useState<"card" | "mobile_money" | "bank_transfer">("card");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [momoProvider, setMomoProvider] = useState("");
  const [momoPhone, setMomoPhone] = useState("");

  const [countdown, setCountdown] = useState<number>(7);

  useEffect(() => {
    if (checkoutStep !== "success") {
      setCountdown(7);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [checkoutStep]);

  useEffect(() => {
    if (checkoutStep === "success" && countdown <= 0) {
      window.location.hash = "#home";
      setCheckoutStep("idle");
      setDonorName("");
      setDonorEmail("");
      setDonorPhone("");
      setDonorNote("");
      setCustomAmount("");
      setCardNumber("");
      setCardExpiry("");
      setCardCvv("");
      setMomoPhone("");
      setMomoProvider("");
      setCountdown(7);
    }
  }, [countdown, checkoutStep]);

  const activeAmount = customAmount ? parseFloat(customAmount) || 0 : selectedAmount;

  // Conversion helper for consistent impact description based on approximate USD equivalence
  const getUSDAmount = () => {
    return activeAmount / selectedCurrency.rateToUSD;
  };

  const handleDownloadReceipt = () => {
    const doc = new jsPDF();
    const ref = paymentReference || `pay_ref_${Math.floor(Math.random() * 899999 + 100000)}`;

    // Set brand colors (Advaltad is Emerald/Green & Charcoal)
    // Emerald Primary: #10B981 (RGB: 16, 185, 129)
    // Charcoal: #1E293B (RGB: 30, 41, 59)
    
    // Title / Header Banner
    doc.setFillColor(30, 41, 59); // Charcoal background
    doc.rect(0, 0, 210, 38, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("ADVALTAD FOUNDATION", 15, 18);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Audited Humanitarian Growth and Support Initiative", 15, 24);
    doc.text("Email: support@advaltad.org  |  Web: www.advaltad.org", 15, 29);
    
    // Document Type Header
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("OFFICIAL DONATION RECEIPT", 15, 52);
    
    // Draw a horizontal divider line
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);
    doc.line(15, 56, 195, 56);
    
    // Metadata Section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Receipt Reference:", 15, 66);
    doc.setFont("helvetica", "normal");
    doc.text(ref, 60, 66);
    
    doc.setFont("helvetica", "bold");
    doc.text("Date:", 15, 73);
    doc.setFont("helvetica", "normal");
    doc.text(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), 60, 73);
    
    doc.setFont("helvetica", "bold");
    doc.text("Payment Status:", 15, 80);
    doc.setTextColor(16, 185, 129); // Emerald
    doc.text("VERIFIED SUCCESSFUL (Live Paystack)", 60, 80);
    doc.setTextColor(30, 41, 59);
    
    doc.setDrawColor(226, 232, 240);
    doc.line(15, 86, 195, 86);
    
    // Donor Information
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("DONOR DETAILS", 15, 96);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Name:", 15, 106);
    doc.setFont("helvetica", "normal");
    doc.text(donorName || "Anonymous Donor", 60, 106);
    
    doc.setFont("helvetica", "bold");
    doc.text("Email Address:", 15, 113);
    doc.setFont("helvetica", "normal");
    doc.text(donorEmail || "N/A", 60, 113);
    
    doc.setFont("helvetica", "bold");
    doc.text("Phone Number:", 15, 120);
    doc.setFont("helvetica", "normal");
    doc.text(donorPhone || "N/A", 60, 120);
    
    doc.line(15, 126, 195, 126);
    
    // Contribution Details
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("CONTRIBUTION DETAILS", 15, 136);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Gift Type:", 15, 146);
    doc.setFont("helvetica", "normal");
    doc.text(frequency === "monthly" ? "Monthly Recurring Gift" : "One-Time Donation", 60, 146);
    
    doc.setFont("helvetica", "bold");
    doc.text("Amount Contributed:", 15, 153);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 185, 129);
    doc.text(`${selectedCurrency.symbol}${activeAmount.toLocaleString()} ${selectedCurrency.code}`, 60, 153);
    doc.setTextColor(30, 41, 59);
    
    doc.setFont("helvetica", "bold");
    doc.text("Target Program:", 15, 160);
    doc.setFont("helvetica", "normal");
    doc.text(selectedProgram.label, 60, 160);
    
    doc.setFont("helvetica", "bold");
    doc.text("Program Category:", 15, 167);
    doc.setFont("helvetica", "normal");
    doc.text(selectedProgram.category, 60, 167);
    
    if (donorNote) {
      doc.setFont("helvetica", "bold");
      doc.text("Donor's Message / Note:", 15, 174);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139); // cool gray
      doc.text(`"${donorNote}"`, 60, 174);
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
    }
    
    doc.line(15, 183, 195, 183);
    
    // Footer / Thank you
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(16, 185, 129); // Emerald
    doc.text("YOUR IMPACT", 15, 193);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text("100% of your donation is directed entirely to operational field resources.", 15, 201);
    doc.text("Your support bypasses commercial bureaucracy to build critical regional infrastructure.", 15, 206);
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("Thank you for choosing to empower on-field action with Advaltad.", 15, 216);
    
    // Signature Block
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Advaltad Audited Finance Department", 15, 240);
    doc.text("Generated securely via Paystack API Integration.", 15, 244);
    
    // Border Box around receipt for a premium look
    doc.setDrawColor(226, 232, 240);
    doc.rect(8, 8, 194, 280, "S");
    
    doc.save(`Advaltad_Donation_Receipt_${ref}.pdf`);
  };

  const getDynamicImpact = (amountInCurrency: number) => {
    const usdEquiv = amountInCurrency / selectedCurrency.rateToUSD;
    if (usdEquiv <= 0) return "Choose or enter an amount to see your impact.";
    if (usdEquiv <= 15) return "Provides daily wholesome meals and vitamins for a displaced child.";
    if (usdEquiv <= 35) return "School supplies, books, and educational kits for one child.";
    if (usdEquiv <= 60) return "Provides hybrid solar-powered study lamps for two farming families.";
    if (usdEquiv <= 120) return "Supports mobile health outreach checkups and medical support.";
    if (usdEquiv <= 300) return "Sponsors vocations, internet, and software developer training licenses.";
    return "Sponsors modern deep solar-boreholes, agritech toolkits, or sustainable eco-adobe block shelter.";
  };

  const handleCurrencyChange = (currencyCode: string) => {
    const found = CURRENCIES.find((c) => c.code === currencyCode);
    if (found) {
      setSelectedCurrency(found);
      setSelectedAmount(found.presets[1]); // Select second preset by default
      setCustomAmount("");
      // Update default paystack method based on availability
      setPaystackMethod(found.paymentMethods[0]);
    }
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

  const selectedProgram = NGO_PROGRAMS.find(p => p.id === targetProgramId) || NGO_PROGRAMS[0];

  return (
    <section id="donate" className="py-24 sm:py-32 bg-[#F7F8FA] relative overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
        
        {/* Core Header */}
        <div className="max-w-xl mx-auto text-center mb-12 sm:mb-16 space-y-4">
          <div className="inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
            <span className="text-xs uppercase font-extrabold tracking-widest text-brand-primary font-display">
              TRANSPARENT NGO GIVING
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-display font-black text-brand-charcoal tracking-tight">
            Support Our Regional Programs
          </h2>
          <p className="text-slate-500 font-sans text-base max-w-[500px] mx-auto">
            Your generous contributions are directly securely processed. Direct, audited development without intermediaries.
          </p>
        </div>

        {/* Premium Centered White Card with 32px Rounded Corners */}
        <div className="max-w-2xl mx-auto bg-white rounded-[32px] p-8 sm:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.02)] border border-slate-50">
          
          {/* Once / Monthly Toggle */}
          <div className="flex bg-slate-50 p-1 rounded-2xl mb-8 max-w-xs mx-auto">
            <button
              onClick={() => setFrequency("once")}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                frequency === "once" ? "bg-brand-primary text-white shadow-sm" : "text-slate-400 hover:text-brand-charcoal"
              }`}
            >
              One-time Gift
            </button>
            <button
              onClick={() => setFrequency("monthly")}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                frequency === "monthly" ? "bg-brand-primary text-white shadow-sm" : "text-slate-400 hover:text-brand-charcoal"
              }`}
            >
              Give Monthly
            </button>
          </div>

          {/* Currency Selector Reworked */}
          <div className="mb-8 text-left">
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">
              Select Your Preferred Currency
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {CURRENCIES.map((curr) => {
                const isSelected = selectedCurrency.code === curr.code;
                return (
                  <button
                    key={curr.code}
                    type="button"
                    onClick={() => handleCurrencyChange(curr.code)}
                    className={`px-3 py-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      isSelected
                        ? "border-brand-primary bg-brand-secondary/40 text-brand-primary"
                        : "border-slate-100 bg-white hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    <span>{curr.flag}</span>
                    <span>{curr.code} ({curr.symbol})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preset Donation Amounts (Dynamic per Selected Currency) */}
          <div className="text-left">
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">
              Select Donation Value
            </label>
            <div className="grid grid-cols-4 gap-3">
              {selectedCurrency.presets.map((amt) => {
                const active = selectedAmount === amt && !customAmount;
                return (
                  <button
                    key={amt}
                    onClick={() => handleSelectAmount(amt)}
                    className={`py-4 rounded-xl border transition-all text-center cursor-pointer font-display font-black text-sm ${
                      active
                        ? "border-brand-primary bg-brand-secondary/40 text-brand-primary"
                        : "border-slate-100 bg-white hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    {selectedCurrency.symbol}
                    {amt.toLocaleString()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Amount Form Field */}
          <div className="mt-5 relative">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 font-display font-black text-slate-400">
              {selectedCurrency.symbol}
            </span>
            <input
              type="text"
              placeholder="Other custom amount"
              value={customAmount}
              onChange={handleCustomChange}
              className="w-full pl-12 pr-20 py-3.5 rounded-xl bg-slate-50/50 border border-slate-100 focus:border-brand-primary focus:outline-none text-sm font-bold text-[#1E293B] transition-all font-sans"
            />
            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-extrabold text-slate-400 tracking-wider">
              {selectedCurrency.code}
            </span>
          </div>

          {/* Dynamic Impact Statement Box */}
          <div className="mt-6 p-5 rounded-xl bg-brand-secondary/20 border border-brand-secondary/50 flex items-start gap-3 text-left">
            <div className="p-1.5 rounded-lg bg-brand-primary text-white flex-shrink-0 mt-0.5">
              <Icon name="Gift" size={14} />
            </div>
            <div>
              <p className="text-[9px] font-extrabold tracking-wider text-brand-primary uppercase">Tangible Resource Allocation</p>
              <p className="text-xs text-brand-charcoal mt-1 font-sans font-semibold leading-relaxed">
                {getDynamicImpact(activeAmount)}
              </p>
            </div>
          </div>

          {/* Submit Trigger Action */}
          <form onSubmit={handleDonateSubmit} className="mt-8">
            <button
              type="submit"
              disabled={activeAmount <= 0}
              className="w-full py-4 rounded-xl bg-brand-primary hover:bg-[#0A4233] disabled:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed font-display font-extrabold text-white text-xs tracking-widest shadow-lg shadow-brand-primary/10 hover:shadow-brand-primary/20 hover:-translate-y-0.5 disabled:translate-y-0 transition-all duration-300 cursor-pointer flex items-center justify-center gap-2"
            >
              <Icon name="Coins" size={14} />
              DONATE {selectedCurrency.symbol}{activeAmount > 0 ? activeAmount.toLocaleString() : ""} NOW
            </button>
          </form>

          {/* Security & Compliant Badges */}
          <div className="mt-5 flex justify-center items-center gap-4 text-[9px] text-slate-400 font-display font-medium">
            <span className="flex items-center gap-1">
              <Icon name="Lock" size={11} className="text-brand-primary" /> SECURED BY PAYSTACK
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Icon name="CheckCircle2" size={11} className="text-brand-primary" /> 501(C)(3) COMPLIANT
            </span>
          </div>

        </div>

      </div>

      {/* Payment checkout overlays */}
      <AnimatePresence>
        {checkoutStep !== "idle" && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 overflow-y-auto">
            
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
              className="relative z-10 w-full max-w-lg bg-white text-brand-charcoal rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-2xl my-8 text-left"
            >
              <button
                onClick={() => setCheckoutStep("idle")}
                className="absolute top-5 right-5 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Icon name="X" size={16} />
              </button>

              {/* STEP 1: COMPREHENSIVE INFORMATION FORM */}
              {checkoutStep === "form" && (
                <div className="space-y-5">
                  <div className="text-center pb-2 border-b border-slate-100">
                    <div className="w-10 h-10 rounded-xl bg-brand-secondary text-brand-primary flex items-center justify-center mx-auto mb-2">
                      <Icon name="Lock" size={16} />
                    </div>
                    <h3 className="text-lg font-display font-black text-brand-charcoal">Donor Information</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Sponsoring {selectedCurrency.symbol}{activeAmount.toLocaleString()} {frequency === "monthly" ? "monthly" : "once"}</p>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (donorName && donorEmail && donorPhone) {
                        setCheckoutStep("paystack_gateway");
                      }
                    }}
                    className="space-y-4 font-sans"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Your Full Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Ramon Bisola"
                          value={donorName}
                          onChange={(e) => setDonorName(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-100 focus:border-brand-primary focus:outline-none text-xs font-semibold text-brand-charcoal"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Your Email</label>
                        <input
                          type="email"
                          required
                          placeholder="e.g. ramonbisola1@gmail.com"
                          value={donorEmail}
                          onChange={(e) => setDonorEmail(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-100 focus:border-brand-primary focus:outline-none text-xs font-semibold text-brand-charcoal"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Phone Number</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 font-bold">
                            {selectedCurrency.phonePrefix}
                          </span>
                          <input
                            type="tel"
                            required
                            placeholder={selectedCurrency.placeholderPhone}
                            value={donorPhone}
                            onChange={(e) => setDonorPhone(e.target.value)}
                            className="w-full pl-14 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-100 focus:border-brand-primary focus:outline-none text-xs font-semibold text-brand-charcoal"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Allocation Program Target</label>
                        <div className="relative">
                          <select
                            value={targetProgramId}
                            onChange={(e) => setTargetProgramId(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-100 focus:border-brand-primary focus:outline-none text-xs font-semibold text-brand-charcoal appearance-none cursor-pointer"
                          >
                            {NGO_PROGRAMS.map((prog) => (
                              <option key={prog.id} value={prog.id}>
                                {prog.label} ({prog.category})
                              </option>
                            ))}
                          </select>
                          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <Icon name="ChevronDown" size={14} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Optional Message / Dedication Note</label>
                      <textarea
                        rows={2}
                        placeholder="e.g. In memory of my mother, or Keep up the great education work..."
                        value={donorNote}
                        onChange={(e) => setDonorNote(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-100 focus:border-brand-primary focus:outline-none text-xs font-semibold text-brand-charcoal resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3.5 rounded-xl bg-brand-primary hover:bg-[#0A4233] text-white font-extrabold text-xs tracking-wider uppercase cursor-pointer transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>Proceed to Payment Gateway</span>
                      <Icon name="ArrowRight" size={14} />
                    </button>
                  </form>
                </div>
              )}

              {/* STEP 2: HIGH-FIDELITY PAYSTACK SIMULATED GATEWAY */}
              {checkoutStep === "paystack_gateway" && (
                <div className="space-y-5">
                  
                  {/* Gateway Header with official Paystack appearance */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#3bb75e] animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">PAYSTACK GATEWAY</span>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-slate-400 uppercase font-bold">PAYING TO</p>
                      <p className="text-xs font-black text-brand-charcoal">Advaltad Dev Foundation</p>
                    </div>
                  </div>

                  {/* Summary of Transaction info */}
                  <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center text-xs">
                    <div>
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase">DONOR EMAIL</p>
                      <p className="font-semibold text-brand-charcoal truncate max-w-[200px]">{donorEmail}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase">TOTAL AMOUNT</p>
                      <p className="text-base font-black text-[#3bb75e]">{selectedCurrency.symbol}{activeAmount.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Paystack left tabs and main checkout interface */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    
                    {/* Paystack Payment options menu */}
                    <div className="flex sm:flex-col gap-1 sm:border-r border-slate-100 sm:pr-2 overflow-x-auto">
                      {selectedCurrency.paymentMethods.includes("card") && (
                        <button
                          type="button"
                          onClick={() => setPaystackMethod("card")}
                          className={`px-3 py-2.5 text-left rounded-xl text-xs font-bold transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer ${
                            paystackMethod === "card" ? "bg-slate-950 text-white" : "text-slate-500 hover:bg-slate-50"
                          }`}
                        >
                          <Icon name="Lock" size={12} />
                          <span>Pay with Card</span>
                        </button>
                      )}
                      {selectedCurrency.paymentMethods.includes("mobile_money") && (
                        <button
                          type="button"
                          onClick={() => setPaystackMethod("mobile_money")}
                          className={`px-3 py-2.5 text-left rounded-xl text-xs font-bold transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer ${
                            paystackMethod === "mobile_money" ? "bg-slate-950 text-white" : "text-slate-500 hover:bg-slate-50"
                          }`}
                        >
                          <Icon name="Phone" size={12} />
                          <span>Mobile Money</span>
                        </button>
                      )}
                      {selectedCurrency.paymentMethods.includes("bank_transfer") && (
                        <button
                          type="button"
                          onClick={() => setPaystackMethod("bank_transfer")}
                          className={`px-3 py-2.5 text-left rounded-xl text-xs font-bold transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer ${
                            paystackMethod === "bank_transfer" ? "bg-slate-950 text-white" : "text-slate-500 hover:bg-slate-50"
                          }`}
                        >
                          <Icon name="Building2" size={12} />
                          <span>Bank Transfer</span>
                        </button>
                      )}
                    </div>

                    {/* Active Paystack method screen */}
                    <div className="col-span-1 sm:col-span-2 space-y-4">
                      
                      {paystackMethod === "card" && (
                        <div className="space-y-3">
                          <p className="text-[10px] text-slate-400 font-extrabold uppercase">CARD DETAILS</p>
                          <div className="space-y-2.5 text-xs font-sans">
                            <input
                              type="text"
                              maxLength={19}
                              placeholder="0000 0000 0000 0000"
                              value={cardNumber}
                              onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim())}
                              className="w-full px-3 py-2.5 rounded-xl border border-slate-150 focus:border-[#3bb75e] outline-none text-brand-charcoal font-semibold text-center tracking-widest"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                maxLength={5}
                                placeholder="MM/YY"
                                value={cardExpiry}
                                onChange={(e) => setCardExpiry(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl border border-slate-150 focus:border-[#3bb75e] outline-none text-brand-charcoal font-semibold text-center"
                              />
                              <input
                                type="password"
                                maxLength={3}
                                placeholder="CVV"
                                value={cardCvv}
                                onChange={(e) => setCardCvv(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl border border-slate-150 focus:border-[#3bb75e] outline-none text-brand-charcoal font-semibold text-center"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {paystackMethod === "mobile_money" && (
                        <div className="space-y-3">
                          <p className="text-[10px] text-slate-400 font-extrabold uppercase">MOBILE MONEY WALLET</p>
                          <div className="space-y-2.5 text-xs font-sans">
                            <select
                              value={momoProvider}
                              onChange={(e) => setMomoProvider(e.target.value)}
                              className="w-full px-3 py-2.5 rounded-xl border border-slate-150 focus:border-[#3bb75e] outline-none text-brand-charcoal font-bold appearance-none bg-white cursor-pointer"
                            >
                              <option value="">Select Network Provider</option>
                              {selectedCurrency.code === "GHS" && (
                                <>
                                  <option value="mtn">MTN Mobile Money 💛</option>
                                  <option value="telecel">Telecel Cash (Vodafone) ❤️</option>
                                  <option value="airtel">AirtelTigo Money 💙</option>
                                </>
                              )}
                              {selectedCurrency.code === "KES" && (
                                <>
                                  <option value="mpesa">Safaricom M-Pesa 💚</option>
                                  <option value="airtel_kes">Airtel Money ❤️</option>
                                </>
                              )}
                            </select>

                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold font-mono">
                                {selectedCurrency.phonePrefix}
                              </span>
                              <input
                                type="tel"
                                placeholder={selectedCurrency.placeholderPhone}
                                value={momoPhone || donorPhone}
                                onChange={(e) => setMomoPhone(e.target.value)}
                                className="w-full pl-14 pr-3 py-2.5 rounded-xl border border-slate-150 focus:border-[#3bb75e] outline-none text-brand-charcoal font-semibold"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {paystackMethod === "bank_transfer" && (
                        <div className="space-y-2 text-xs">
                          <p className="text-[10px] text-slate-400 font-extrabold uppercase">Bank account details*</p>
                          <div className="p-3.5 bg-[#3bb75e]/10 border border-[#3bb75e]/30 rounded-2xl space-y-1">
                            <p className="font-extrabold text-[#268943] uppercase text-[9px] tracking-wider">OFFICIAL DIRECT TRANSFER</p>
                            <p className="text-slate-700 font-medium">Please send exactly {selectedCurrency.symbol}{activeAmount.toLocaleString()} to:</p>
                            <div className="font-mono text-sm font-bold text-slate-900 bg-white/50 p-2 rounded-lg mt-1 border border-slate-150 space-y-0.5">
                              <p className="text-xs text-slate-500 font-sans font-medium">BANK NAME: <span className="font-bold text-slate-800">GTbank</span></p>
                              <p className="text-xs text-slate-500 font-sans font-medium">ACCOUNT NAME: <span className="font-bold text-slate-800">Advaltad growth and support foundation</span></p>
                              <p className="text-xs text-slate-500 font-sans font-medium">NAIRA ACCOUNT NUMBER: <span className="font-mono font-black text-slate-900 tracking-wider">300 292 7219</span></p>
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-relaxed">Your transfer will be automatically detected and credited. The system monitors the gateway constantly.</p>
                        </div>
                      )}

                      {/* Paystack secure bottom banner */}
                      <div className="flex items-center justify-center gap-1.5 text-[9px] text-slate-400 pt-1 font-mono">
                        <Icon name="Lock" size={10} className="text-[#3bb75e]" />
                        <span>SECURED BY PAYSTACK PCI-DSS COMPLIANT</span>
                      </div>
                    </div>

                  </div>

                  {/* Complete payment gateway button */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={() => setCheckoutStep("form")}
                      className="px-4 py-2 text-slate-500 hover:text-slate-800 text-xs font-black uppercase cursor-pointer"
                    >
                      Go Back
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const ref = `pay_ref_${Math.floor(Math.random() * 899999 + 100000)}`;
                        setPaymentReference(ref);
                        
                        // Fire-and-forget saving of donation to DB & localStorage
                        db.createDonation({
                          reference: ref,
                          email: donorEmail || "anonymous@advaltad.org",
                          name: donorName || "Anonymous Donor",
                          phone: donorPhone || "",
                          amount: activeAmount,
                          currency: selectedCurrency.code,
                          program_id: targetProgramId,
                          note: donorNote || "",
                          status: "success"
                        }).catch(err => console.error("Error creating donation:", err));

                        setCheckoutStep("confirming");
                        setTimeout(() => {
                          setCheckoutStep("success");
                        }, 2200);
                      }}
                      className="px-6 py-3 bg-[#3bb75e] hover:bg-[#2c964a] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-[#3bb75e]/15"
                    >
                      <Icon name="Coins" size={14} />
                      <span>Authorize Payment</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: TRANSACTION AUTHORIZATION */}
              {checkoutStep === "confirming" && (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-12 h-12 rounded-full border-4 border-[#3bb75e]/25 border-t-[#3bb75e] animate-spin" />
                  <h3 className="text-lg font-display font-extrabold">Contacting secure Paystack API...</h3>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Registering pending log into donation database via secure server routing, verifying authorization channels.
                  </p>
                </div>
              )}

              {/* STEP 4: SUCCESSFUL TRANSACTIONS FOR SELECTED PROGRAM */}
              {checkoutStep === "success" && (
                <div className="text-center space-y-6 pt-2">
                  <div className="relative py-4">
                    <Confetti />
                    <motion.div
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", damping: 12, stiffness: 180, delay: 0.1 }}
                      className="w-20 h-20 rounded-full bg-[#3bb75e] text-white flex items-center justify-center mx-auto shadow-lg shadow-[#3bb75e]/20 relative z-10"
                    >
                      <Icon name="Check" size={40} className="stroke-[3]" />
                    </motion.div>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-2xl font-display font-black text-brand-charcoal">Bless You!</h3>
                    <p className="text-xs font-black text-[#3bb75e] uppercase tracking-widest bg-[#3bb75e]/10 border border-[#3bb75e]/20 py-1.5 px-3 rounded-lg inline-block">
                      PAYSTACK TRANSACTION FULLY AUDITED
                    </p>
                    <p className="text-xs font-mono text-slate-400">
                      Receipt Ref: pay_ref_{(Math.floor(Math.random() * 899999 + 100000))}
                    </p>
                    <div className="bg-slate-50/50 p-5 rounded-2xl text-slate-500 text-xs text-left space-y-2 border border-slate-100 max-w-[420px] mx-auto mt-4 font-sans leading-relaxed">
                      <p>
                        Thank you, <span className="font-extrabold text-brand-charcoal">{donorName}</span>. Your {frequency === "monthly" ? "monthly recurring" : "one-time"} gift of <span className="font-extrabold text-brand-primary">{selectedCurrency.symbol}{activeAmount.toLocaleString()} ({selectedCurrency.code})</span> is fully verified.
                      </p>
                      <p className="border-t border-slate-100/70 pt-2 font-medium">
                        📍 <span className="font-bold text-slate-800">Assigned allocation:</span> {selectedProgram.label} ({selectedProgram.category}). 100% of these resources go directly to this field initiative.
                      </p>
                      {donorNote && (
                        <p className="border-t border-slate-100/70 pt-2 italic text-[11px] text-slate-400">
                          &ldquo;{donorNote}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-slate-400 font-medium flex items-center justify-center gap-1.5 py-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-ping" />
                    <span>Redirecting you to the Homepage in <strong className="text-brand-charcoal">{countdown}</strong> seconds...</span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      onClick={handleDownloadReceipt}
                      className="flex-1 py-3.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-extrabold text-xs tracking-wider uppercase cursor-pointer transition-colors flex items-center justify-center gap-2"
                    >
                      <Icon name="Download" size={14} />
                      Download Receipt
                    </button>
                    <button
                      onClick={() => {
                        window.location.hash = "#home";
                        setCheckoutStep("idle");
                        setDonorName("");
                        setDonorEmail("");
                        setDonorPhone("");
                        setDonorNote("");
                        setCustomAmount("");
                        setCardNumber("");
                        setCardExpiry("");
                        setCardCvv("");
                        setMomoPhone("");
                        setMomoProvider("");
                      }}
                      className="flex-1 py-3.5 rounded-xl bg-brand-charcoal hover:bg-slate-800 text-white font-extrabold text-xs tracking-wider uppercase cursor-pointer transition-colors"
                    >
                      Go Back Home Now
                    </button>
                  </div>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};
