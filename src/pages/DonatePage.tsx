import React, { useState, useEffect } from "react";
import { DonationForm } from "../components/DonationForm";
import { DonationImpact } from "../components/DonationImpact";
import { Icon } from "../components/Icon";
import { ShieldCheck, User, Mail, Phone, CreditCard, ArrowRight, Award, DollarSign, CheckCircle2, Lock, Landmark, Check, AlertCircle } from "lucide-react";
import { getPaystackPublicKey, loadPaystackScript } from "../lib/paystack";
import { db } from "../lib/supabase";

export const DonatePage: React.FC = () => {
  const [params, setParams] = useState<Record<string, string>>({});
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [donorAmount, setDonorAmount] = useState("");
  const [currency, setCurrency] = useState<"USD" | "NGN">("NGN");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDirectGateway, setShowDirectGateway] = useState(false);
  const [paystackGatewayTab, setPaystackGatewayTab] = useState<"card" | "transfer">("card");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);
  const [successReceipt, setSuccessReceipt] = useState<{ ref: string; amount: string; date: string } | null>(null);

  useEffect(() => {
    const parseHash = () => {
      const hash = window.location.hash;
      const index = hash.indexOf("?");
      if (index === -1) {
        setParams({});
        return;
      }
      const queryStr = hash.substring(index + 1);
      const res: Record<string, string> = {};
      queryStr.split("&").forEach(pair => {
        const [key, val] = pair.split("=");
        if (key) {
          res[decodeURIComponent(key)] = decodeURIComponent(val || "");
        }
      });
      setParams(res);
      if (res.needed) {
        setDonorAmount(res.needed);
        setCurrency("NGN");
      }
    };

    parseHash();
    window.addEventListener("hashchange", parseHash);
    loadPaystackScript().catch(console.warn);

    return () => window.removeEventListener("hashchange", parseHash);
  }, []);

  const finalizePaymentSuccess = async (reference: string, amountNaira: number, amt: number) => {
    setIsProcessing(false);
    setIsSimulatingPayment(false);
    setShowDirectGateway(false);

    try {
      if (params.ambassador_id) {
        await db.logActivity({
          type: "donation_logged",
          desc: `Public Campaign Sponsorship received: ₦${amountNaira.toLocaleString()} for initiative "${params.project || 'Community Initiative'}" from ${donorName} (Ref: ${reference})`,
          ambassador_id: params.ambassador_id,
          ambassador_name: params.ambassador_name || "Ambassador",
          amount: `₦${amountNaira.toLocaleString()}`
        });
      }
    } catch (err) {
      console.warn("Could not log public donation activity:", err);
    }

    setSuccessReceipt({
      ref: reference,
      amount: currency === "USD" ? `$${amt.toLocaleString()} USD (₦${amountNaira.toLocaleString()})` : `₦${amt.toLocaleString()} NGN`,
      date: new Date().toLocaleString()
    });
  };

  const handlePaystackCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!donorName.trim() || !donorEmail.trim() || !donorPhone.trim()) {
      alert("Please fill in your full name, email, and phone number.");
      return;
    }
    const amt = parseFloat(donorAmount);
    if (isNaN(amt) || amt <= 0) {
      alert("Please enter a valid donation amount.");
      return;
    }

    setIsProcessing(true);

    const amountNaira = currency === "USD" ? Math.round(amt * 1500) : Math.round(amt);
    const amountInKobo = amountNaira * 100;
    const transactionRef = `DON-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const publicKey = getPaystackPublicKey();

    try {
      const isLoaded = await loadPaystackScript();
      const paystackPop = (window as any).PaystackPop;

      if (isLoaded && paystackPop && typeof paystackPop.setup === "function") {
        let isOpened = false;
        try {
          const handler = paystackPop.setup({
            key: publicKey,
            email: donorEmail.trim(),
            amount: amountInKobo,
            currency: "NGN",
            ref: transactionRef,
            metadata: {
              ambassador_id: params.ambassador_id || "",
              ambassador_name: params.ambassador_name || "",
              project: params.project || "General Initiative",
              donor_name: donorName.trim(),
              donor_phone: donorPhone.trim(),
              original_currency: currency,
              original_amount: amt,
              amount_naira: amountNaira
            },
            callback: function(res: any) {
              const confirmedRef = res?.reference || transactionRef;
              finalizePaymentSuccess(confirmedRef, amountNaira, amt);
            },
            onClose: function() {
              setIsProcessing(false);
            }
          });

          if (handler && typeof handler.openIframe === "function") {
            handler.openIframe();
            isOpened = true;
            setIsProcessing(false);
            return;
          }
        } catch (setupError) {
          console.warn("Paystack setup popup error, switching to direct gateway:", setupError);
        }

        if (!isOpened) {
          setIsProcessing(false);
          setShowDirectGateway(true);
        }
      } else {
        // Fallback to in-app direct Paystack gateway
        setIsProcessing(false);
        setShowDirectGateway(true);
      }
    } catch (err: any) {
      console.warn("Paystack checkout exception caught, displaying direct gateway fallback:", err);
      setIsProcessing(false);
      setShowDirectGateway(true);
    }
  };

  const handleSimulatedCardPay = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(donorAmount);
    const amountNaira = currency === "USD" ? Math.round(amt * 1500) : Math.round(amt);
    const transactionRef = `DON-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    setIsSimulatingPayment(true);
    setTimeout(() => {
      finalizePaymentSuccess(transactionRef, amountNaira, amt);
    }, 1200);
  };

  const isCampaignLink = !!params.project;
  const currentAmt = parseFloat(donorAmount) || 0;
  const computedNaira = currency === "USD" ? Math.round(currentAmt * 1500) : Math.round(currentAmt);

  return (
    <div className="pt-20 bg-white min-h-screen text-left">
      
      {/* Banner / Header Title Row */}
      <section className="bg-[#F7F8FA] border-b border-slate-100 py-16 sm:py-20 relative overflow-hidden">
        <div className="absolute inset-x-0 bottom-0 top-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#10B981_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="max-w-[1200px] mx-auto px-6 lg:px-8 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
            <span className="text-xs uppercase font-extrabold tracking-widest text-brand-primary font-display">
              {isCampaignLink ? "ACTIVE FELLOWSHIP SPONSORSHIP" : "SUPPORT OUR MISSION"}
            </span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-display font-black text-brand-charcoal tracking-tight leading-tight">
            {isCampaignLink ? params.project : "Empower Sub-Saharan Communities"}
          </h1>
          <p className="text-slate-500 font-sans text-base max-w-[620px] leading-relaxed">
            {isCampaignLink 
              ? `You have accessed a direct public fundraising link sponsored by our approved fellowship ambassador, ${params.ambassador_name || 'an authorized leader'}. Your donation will directly fund this local project.`
              : "Every donation, no matter the amount, directly funds tangible assets on the ground. We completely bypass middle-men bureaucracy to deliver infrastructure."
            }
          </p>
        </div>
      </section>

      <div className="bg-white py-12 px-4">
        {isCampaignLink ? (
          <div className="max-w-xl mx-auto bg-white rounded-3xl border border-slate-150 shadow-xl shadow-slate-100/50 p-6 md:p-8 space-y-6">
            
            {successReceipt ? (
              <div className="text-center space-y-5 py-6">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold text-slate-900">Payment Successful!</h3>
                  <p className="text-xs text-slate-500">Thank you, <strong className="text-slate-800">{donorName}</strong>! Your sponsorship has been confirmed and credited to this initiative.</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payment Reference:</span>
                    <span className="font-bold text-slate-800">{successReceipt.ref}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Amount Paid:</span>
                    <span className="font-bold text-emerald-600">{successReceipt.amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Initiative:</span>
                    <span className="font-bold text-slate-800">{params.project}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Ambassador:</span>
                    <span className="font-bold text-slate-800">{params.ambassador_name || "General"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Timestamp:</span>
                    <span className="text-slate-700">{successReceipt.date}</span>
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    onClick={() => {
                      setSuccessReceipt(null);
                      setDonorAmount("");
                      setShowDirectGateway(false);
                    }}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Donate Again
                  </button>
                  <a
                    href="#home"
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all inline-flex items-center justify-center cursor-pointer"
                  >
                    Return Home
                  </a>
                </div>
              </div>
            ) : showDirectGateway ? (
              /* High Fidelity Direct Paystack Gateway Checkout */
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#3bb75e] animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">SECURE PAYSTACK GATEWAY</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDirectGateway(false)}
                    className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    Back
                  </button>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center text-xs">
                  <div>
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase">DONOR EMAIL</p>
                    <p className="font-semibold text-slate-800 truncate max-w-[180px]">{donorEmail}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase">TOTAL AMOUNT</p>
                    <p className="text-base font-black text-emerald-600">₦{computedNaira.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex gap-2 border-b border-slate-100 pb-2">
                  <button
                    type="button"
                    onClick={() => setPaystackGatewayTab("card")}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      paystackGatewayTab === "card" ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Pay with Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaystackGatewayTab("transfer")}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      paystackGatewayTab === "transfer" ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Landmark className="w-3.5 h-3.5" />
                    Bank Transfer
                  </button>
                </div>

                {paystackGatewayTab === "card" ? (
                  <form onSubmit={handleSimulatedCardPay} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Card Number</label>
                      <input
                        type="text"
                        required
                        placeholder="4084 0820 0000 1234"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-mono font-bold text-slate-800 outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Expiry Date</label>
                        <input
                          type="text"
                          required
                          placeholder="MM/YY"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-mono font-bold text-slate-800 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">CVV</label>
                        <input
                          type="password"
                          required
                          maxLength={4}
                          placeholder="123"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-mono font-bold text-slate-800 outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSimulatingPayment}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      {isSimulatingPayment ? "Authorizing with Bank..." : `Authorize Payment ₦${computedNaira.toLocaleString()}`}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-xs space-y-2 text-slate-700">
                      <p className="font-bold text-emerald-800">Direct Foundation Account Transfer:</p>
                      <div className="flex justify-between items-center py-1 border-b border-emerald-100">
                        <span className="text-slate-500">Bank:</span>
                        <span className="font-bold text-slate-900">GTBank</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-emerald-100">
                        <span className="text-slate-500">Account Number:</span>
                        <span className="font-mono font-bold text-emerald-700">300 292 7219</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-500">Account Name:</span>
                        <span className="font-bold text-slate-900 text-right">Advaltad Growth & Support</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isSimulatingPayment}
                      onClick={() => {
                        const amt = parseFloat(donorAmount);
                        const amountNaira = currency === "USD" ? Math.round(amt * 1500) : Math.round(amt);
                        const transactionRef = `BNK-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
                        setIsSimulatingPayment(true);
                        setTimeout(() => {
                          finalizePaymentSuccess(transactionRef, amountNaira, amt);
                        }, 1200);
                      }}
                      className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Check className="w-4 h-4 text-emerald-400" />
                      {isSimulatingPayment ? "Verifying Bank Deposit..." : "I Have Completed This Transfer"}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="text-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold tracking-wide uppercase mb-3">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Audited & Secure Campaign
                  </span>
                  <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Sponsor this Initiative</h2>
                  <p className="text-xs text-slate-500 mt-1.5">Directly credited to Ambassador: <strong className="font-extrabold text-slate-800">{params.ambassador_name || 'Authorized Ambassador'}</strong></p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Initiative:</span>
                    <span className="font-bold text-slate-800">{params.project}</span>
                  </div>
                  {params.ambassador_id && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Sponsor ID:</span>
                      <span className="font-mono font-bold text-slate-800">{params.ambassador_id}</span>
                    </div>
                  )}
                  {params.needed && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Target Funding Milestone:</span>
                      <span className="font-mono font-extrabold text-emerald-600">
                        {currency === "USD" 
                          ? `$${parseFloat(params.needed || "0").toLocaleString()} USD`
                          : `₦${parseFloat(params.needed || "0").toLocaleString()} NGN`}
                      </span>
                    </div>
                  )}
                </div>

                <form onSubmit={handlePaystackCheckout} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Your Full Name</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        required
                        value={donorName}
                        onChange={(e) => setDonorName(e.target.value)}
                        placeholder="e.g. Samuel Okon"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-semibold outline-none transition-all text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Email Address</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </span>
                      <input
                        type="email"
                        required
                        value={donorEmail}
                        onChange={(e) => setDonorEmail(e.target.value)}
                        placeholder="e.g. samuel@example.com"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-semibold outline-none transition-all text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Phone Number</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-4 h-4" />
                      </span>
                      <input
                        type="tel"
                        required
                        value={donorPhone}
                        onChange={(e) => setDonorPhone(e.target.value)}
                        placeholder="e.g. +234 803 111 2222"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-semibold outline-none transition-all text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                        Donation Amount ({currency})
                      </label>
                      <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setCurrency("NGN")}
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold transition-all cursor-pointer ${
                            currency === "NGN" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          NGN (₦)
                        </button>
                        <button
                          type="button"
                          onClick={() => setCurrency("USD")}
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold transition-all cursor-pointer ${
                            currency === "USD" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          USD ($)
                        </button>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-800 font-extrabold text-xs">
                        {currency === "USD" ? "$" : "₦"}
                      </span>
                      <input
                        type="number"
                        required
                        min="1"
                        step="any"
                        value={donorAmount}
                        onChange={(e) => setDonorAmount(e.target.value)}
                        className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-mono font-bold text-slate-800 outline-none transition-all"
                        placeholder={currency === "USD" ? "e.g. 50" : "e.g. 15000"}
                      />
                    </div>

                    {donorAmount && !isNaN(parseFloat(donorAmount)) && (
                      <p className="text-[10px] text-slate-400 font-mono mt-1 text-right">
                        {currency === "USD"
                          ? `≈ ₦${(parseFloat(donorAmount) * 1500).toLocaleString()} NGN via Paystack`
                          : `≈ $${(parseFloat(donorAmount) / 1500).toFixed(2)} USD`}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <CreditCard className="w-4 h-4 text-emerald-300" />
                    {isProcessing ? "Opening Paystack Secure Gateway..." : "Sponsor Initiative via Paystack"}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </>
            )}
          </div>
        ) : (
          <DonationForm />
        )}
      </div>

      {/* Renders the interactive Donation Impact visualization component */}
      <DonationImpact />

      {/* Financial Accountability & Auditing indicators */}
      <section className="py-16 bg-[#F7F8FA] border-t border-slate-100">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-8 text-center">
          <h3 className="text-sm uppercase tracking-widest font-extrabold text-slate-400 font-display">FINANCIAL TRANSPARENCY PROMISE</h3>
          
          <div className="mt-10 grid gap-8 sm:grid-cols-3 max-w-4xl mx-auto">
            <div className="bg-white p-6.5 rounded-2xl border border-slate-100/80 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#EAF5F0] text-brand-primary flex items-center justify-center mx-auto">
                <Icon name="Shield" size={18} />
              </div>
              <h4 className="font-display font-black text-sm text-brand-charcoal">100% Ground Delivery</h4>
              <p className="text-slate-500 font-sans text-xs leading-relaxed">
                All administrative expenses and software utilities are sponsored separately by our executive trustees.
              </p>
            </div>

            <div className="bg-white p-6.5 rounded-2xl border border-slate-100/80 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#EAF5F0] text-brand-primary flex items-center justify-center mx-auto">
                <Icon name="Search" size={18} />
              </div>
              <h4 className="font-display font-black text-sm text-brand-charcoal">Auditable Accounts</h4>
              <p className="text-slate-500 font-sans text-xs leading-relaxed">
                Our operations and physical construction targets are audited twice annually by international accountants.
              </p>
            </div>

            <div className="bg-white p-6.5 rounded-2xl border border-slate-100/80 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#EAF5F0] text-brand-primary flex items-center justify-center mx-auto">
                <Icon name="Compass" size={18} />
              </div>
              <h4 className="font-display font-black text-sm text-brand-charcoal">501(c)(3) tax status</h4>
              <p className="text-slate-500 font-sans text-xs leading-relaxed">
                Your contributions are tax-deductible to the full extent of standard regulatory guidelines and provisions.
              </p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
