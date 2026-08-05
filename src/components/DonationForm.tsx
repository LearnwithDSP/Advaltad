"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CreditCard, Landmark, Send, Loader2, ArrowRight, ShieldCheck, Mail, User, Phone, Check, Copy } from "lucide-react";

export const DonationForm: React.FC = () => {
  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"paystack" | "bank">("paystack");

  // Interaction/UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Bank details
  const BANK_DETAILS = {
    accountName: "Advaltad growth and support foundation",
    bankName: "GTbank",
    dollarAccount: "300 292 7257",
    nairaAccount: "300 292 7219",
    opayAccount: "6140627114",
  };

  const copyToClipboard = (text: string, field: string) => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        navigator.clipboard.writeText(text.replace(/\s+/g, ''));
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text.replace(/\s+/g, '');
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.warn("Failed to copy:", err);
    }
  };

  const validateForm = () => {
    if (!name.trim()) return "Please enter your full name.";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email address.";
    if (!phone.trim()) return "Please enter your phone number.";
    const amtNum = parseFloat(amount);
    if (isNaN(amtNum) || amtNum <= 0) return "Please enter a valid donation amount greater than ₦0.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    if (paymentMethod === "paystack") {
      try {
        const response = await fetch("/api/donate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            email,
            phone,
            amount: parseFloat(amount),
            currency: "NGN",
            program_id: "general",
            note: "Advaltad system donation via Quick Form",
          }),
        });

        let data: any = {};
        try {
          data = await response.json();
        } catch (jsonErr) {
          throw new Error("Invalid response from server. Please try again.");
        }

        const authorizationUrl = data.authorization_url || data.data?.authorization_url;

        if (!response.ok || !authorizationUrl) {
          throw new Error(data.error || "Failed to initialize Paystack transaction.");
        }

        // Redirect to Paystack securely
        if (typeof window !== "undefined") {
          window.location.href = authorizationUrl;
        }
      } catch (err: any) {
        console.error("Paystack error:", err);
        setError(err?.message || "Something went wrong. Please try again.");
        setLoading(false);
      }
    } else {
      // Bank Transfer flow - Redirect to WhatsApp
      try {
        const formattedAmount = new Intl.NumberFormat("en-NG", {
          style: "currency",
          currency: "NGN",
          minimumFractionDigits: 0,
        }).format(parseFloat(amount));

        const message = `Hello Advaltad Team,\n\nI have initiated a Bank Transfer donation. Here are my details:\n\n*Name:* ${name}\n*Email:* ${email}\n*Phone:* ${phone}\n*Amount:* ${formattedAmount}\n\nI am sending this message to confirm my transfer and will forward the proof of payment shortly. Thank you!`;
        const encodedMessage = encodeURIComponent(message);
        
        // Open WhatsApp in a new tab securely
        if (typeof window !== "undefined") {
          window.open(`https://wa.me/2349032445174?text=${encodedMessage}`, "_blank", "noopener,noreferrer");
        }
        setSuccess(true);
        setLoading(false);
      } catch (err: any) {
        setError("Could not launch WhatsApp. Please try again or message manually.");
        setLoading(false);
      }
    }
  };

  return (
    <div id="donation_form_container" className="w-full max-w-xl mx-auto bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50 p-6 md:p-8">
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold tracking-wide uppercase mb-3">
          <ShieldCheck className="w-3.5 h-3.5" />
          Audited & Secure Donation
        </span>
        <h2 className="text-2xl font-bold font-sans text-slate-800 tracking-tight">Support Our Operations</h2>
        <p className="text-sm text-slate-500 mt-1.5">Your resources flow directly to regional field programs and infrastructure.</p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl bg-rose-50 text-rose-700 text-xs font-medium border border-rose-100"
        >
          {error}
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 p-5 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-100 text-center"
        >
          <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto mb-3">
            <Check className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-sm">WhatsApp Confirmation Opened!</h3>
          <p className="text-xs text-emerald-700 mt-1">
            We have opened WhatsApp to message our support team. Please complete your transfer of <strong className="font-extrabold">₦{parseFloat(amount || "0").toLocaleString()}</strong> to our official GTbank or Opay account and share the receipt.
          </p>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Full Name */}
        <div>
          <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Full Name</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <User className="w-4 h-4" />
            </span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Chukwuma Awosika"
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 focus:border-emerald-500 focus:bg-white rounded-xl text-sm text-slate-800 placeholder-slate-400 font-medium transition-all outline-none"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <Mail className="w-4 h-4" />
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. chukwuma@example.com"
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 focus:border-emerald-500 focus:bg-white rounded-xl text-sm text-slate-800 placeholder-slate-400 font-medium transition-all outline-none"
            />
          </div>
        </div>

        {/* Phone */}
        <div>
          <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Phone Number</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <Phone className="w-4 h-4" />
            </span>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +234 803 123 4567"
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 focus:border-emerald-500 focus:bg-white rounded-xl text-sm text-slate-800 placeholder-slate-400 font-medium transition-all outline-none"
            />
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Donation Amount (NGN)</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-700 font-extrabold text-sm">
              ₦
            </span>
            <input
              type="number"
              required
              min="100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter custom amount in Naira"
              className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-100 focus:border-emerald-500 focus:bg-white rounded-xl text-sm text-slate-800 placeholder-slate-400 font-bold transition-all outline-none"
            />
          </div>
        </div>

        {/* Payment Method Toggle */}
        <div>
          <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Select Pathway</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPaymentMethod("paystack")}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-xs font-bold uppercase tracking-wider cursor-pointer transition-all ${
                paymentMethod === "paystack"
                  ? "border-emerald-500 bg-emerald-50/50 text-emerald-800 shadow-sm"
                  : "border-slate-100 hover:border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100/50"
              }`}
            >
              <CreditCard className="w-4 h-4 text-emerald-600" />
              Paystack Card/Momo
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod("bank")}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-xs font-bold uppercase tracking-wider cursor-pointer transition-all ${
                paymentMethod === "bank"
                  ? "border-emerald-500 bg-emerald-50/50 text-emerald-800 shadow-sm"
                  : "border-slate-100 hover:border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100/50"
              }`}
            >
              <Landmark className="w-4 h-4 text-emerald-600" />
              Bank Transfer
            </button>
          </div>
        </div>

        {/* Bank Transfer details inline */}
        <AnimatePresence>
          {paymentMethod === "bank" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-4 sm:p-5 space-y-3.5 my-2 text-left">
                <div className="flex items-center justify-between border-b border-slate-200/70 pb-2.5">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Bank account details*
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px] uppercase">
                    Official Accounts
                  </span>
                </div>

                <div className="space-y-2.5 text-xs text-slate-700 font-sans">
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-1.5 shadow-2xs">
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="font-extrabold text-[11px] uppercase tracking-wide text-slate-400">Account Name</span>
                      <span className="font-extrabold text-slate-900 text-right">{BANK_DETAILS.accountName}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 border-t border-slate-100 pt-1.5">
                      <span className="font-extrabold text-[11px] uppercase tracking-wide text-slate-400">Bank Name</span>
                      <span className="font-extrabold text-slate-900">{BANK_DETAILS.bankName}</span>
                    </div>
                  </div>

                  {/* Accounts List */}
                  <div className="space-y-2">
                    {/* Dollar Account */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 shadow-2xs">
                      <div>
                        <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Dollar account number</span>
                        <span className="font-mono font-black text-slate-900 text-sm tracking-wider">{BANK_DETAILS.dollarAccount}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(BANK_DETAILS.dollarAccount, "dollar")}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold text-[11px] flex items-center gap-1 transition-all cursor-pointer border border-emerald-200/60"
                      >
                        {copiedField === "dollar" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedField === "dollar" ? "Copied" : "Copy"}</span>
                      </button>
                    </div>

                    {/* Naira Account */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 shadow-2xs">
                      <div>
                        <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Naira account number</span>
                        <span className="font-mono font-black text-slate-900 text-sm tracking-wider">{BANK_DETAILS.nairaAccount}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(BANK_DETAILS.nairaAccount, "naira")}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold text-[11px] flex items-center gap-1 transition-all cursor-pointer border border-emerald-200/60"
                      >
                        {copiedField === "naira" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedField === "naira" ? "Copied" : "Copy"}</span>
                      </button>
                    </div>

                    {/* Opay Account */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 shadow-2xs">
                      <div>
                        <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Opay account number (naira account)</span>
                        <span className="font-mono font-black text-slate-900 text-sm tracking-wider">{BANK_DETAILS.opayAccount}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(BANK_DETAILS.opayAccount, "opay")}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold text-[11px] flex items-center gap-1 transition-all cursor-pointer border border-emerald-200/60"
                      >
                        {copiedField === "opay" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedField === "opay" ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50/70 rounded-xl text-[11px] text-emerald-800 font-medium border border-emerald-200/60 leading-relaxed flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>After completing your bank or Opay transfer, click the confirmation button below to notify our finance team on WhatsApp with your payment slip.</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-4 rounded-xl text-white font-extrabold text-xs tracking-widest uppercase cursor-pointer transition-all flex items-center justify-center gap-2 hover:translate-y-[-1px] disabled:opacity-50 disabled:pointer-events-none ${
            paymentMethod === "bank"
              ? "bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/10"
              : "bg-slate-800 hover:bg-slate-900"
          }`}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              Processing Pathway...
            </>
          ) : paymentMethod === "paystack" ? (
            <>
              Secure Paystack Portal
              <ArrowRight className="w-4 h-4 text-emerald-400" />
            </>
          ) : (
            <>
              <Send className="w-4 h-4 text-emerald-400" />
              Confirm via WhatsApp
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default DonationForm;
