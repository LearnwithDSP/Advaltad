import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CreditCard, Landmark, Send, Loader2, ArrowRight, ShieldCheck, Mail, User, Phone, Check } from "lucide-react";

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

  // Static bank details
  const BANK_DETAILS = {
    bankName: "Zenith Bank PLC",
    accountName: "Advaltad Growth and Support Foundation",
    accountNumber: "1229348576",
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

        const data = await response.json();

        const authorizationUrl = data.authorization_url || data.data?.authorization_url;

        if (!response.ok || !authorizationUrl) {
          throw new Error(data.error || "Failed to initialize Paystack transaction.");
        }

        // Redirect to Paystack
        window.location.href = authorizationUrl;
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
        window.open(`https://wa.me/2349032445174?text=${encodedMessage}`, "_blank", "noopener,noreferrer");
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
            We have opened WhatsApp to message our support team. Please complete your transfer of <strong className="font-extrabold">₦{parseFloat(amount).toLocaleString()}</strong> to the Zenith Bank account and share the receipt.
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
              <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-3.5 my-1">
                <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Advaltad Bank Accounts</span>
                <div className="grid grid-cols-1 gap-2.5 text-xs text-slate-700">
                  <div className="flex justify-between border-b border-slate-200/50 pb-2">
                    <span className="text-slate-400 font-medium">Bank Name:</span>
                    <span className="font-extrabold text-slate-800">{BANK_DETAILS.bankName}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/50 pb-2">
                    <span className="text-slate-400 font-medium">Account Name:</span>
                    <span className="font-extrabold text-slate-800 text-right">{BANK_DETAILS.accountName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Account Number:</span>
                    <span className="font-mono font-extrabold text-emerald-700 text-sm select-all">{BANK_DETAILS.accountNumber}</span>
                  </div>
                </div>
                <div className="p-3 bg-emerald-50/30 rounded-xl text-[11px] text-emerald-800 font-medium border border-emerald-500/10 leading-relaxed">
                  After transfer, click the green confirmation button below to notify our team on WhatsApp with your payment slip.
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
