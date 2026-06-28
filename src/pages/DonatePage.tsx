import React, { useState, useEffect } from "react";
import { DonationForm } from "../components/DonationForm";
import { DonationImpact } from "../components/DonationImpact";
import { Icon } from "../components/Icon";
import { ShieldCheck, User, Mail, Phone, CreditCard, ArrowRight, Award } from "lucide-react";

export const DonatePage: React.FC = () => {
  const [params, setParams] = useState<Record<string, string>>({});
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [donorAmount, setDonorAmount] = useState("");

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
      }
    };

    parseHash();
    window.addEventListener("hashchange", parseHash);
    return () => window.removeEventListener("hashchange", parseHash);
  }, []);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    document.head.appendChild(script);
    return () => {
      try {
        document.head.removeChild(script);
      } catch (err) {}
    };
  }, []);

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

    const paystackPop = (window as any).PaystackPop;
    const amountInKobo = amt * 100 * 1500; // standard mock NGN conversion rate

    if (paystackPop) {
      const handler = paystackPop.setup({
        key: "pk_test_placeholder",
        email: donorEmail,
        amount: amountInKobo,
        currency: "NGN",
        metadata: {
          ambassador_id: params.ambassador_id,
          ambassador_name: params.ambassador_name,
          project: params.project,
          donor_name: donorName,
          donor_phone: donorPhone
        },
        callback: function(res: any) {
          alert(`Thank you, ${donorName}! Your payment of $${amt} USD (Ref: ${res.reference}) was successfully processed via Paystack. Campaign credit has been allocated to Ambassador ${params.ambassador_name}.`);
          window.location.hash = "#home";
        }
      });
      handler.openIframe();
    } else {
      // Simulate fallback
      alert(`[SIMULATION] Paystack Inline Popup Activated!\n\nDonor: ${donorName}\nEmail: ${donorEmail}\nAmount: $${amt} USD (₦${(amt * 1500).toLocaleString()})\nInitiative: ${params.project}\nCredit attributed to Ambassador: ${params.ambassador_name} (ID: ${params.ambassador_id})\n\nThank you for your generous sponsorship!`);
      window.location.hash = "#home";
    }
  };

  const isCampaignLink = !!params.project;

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
              ? `You have accessed a direct public fundraising link sponsored by our approved fellowship ambassador, ${params.ambassador_name}. Your donation will directly fund this local project.`
              : "Every donation, no matter the amount, directly funds tangible assets on the ground. We completely bypass middle-men bureaucracy to deliver infrastructure."
            }
          </p>
        </div>
      </section>

      <div className="bg-white py-12 px-4">
        {isCampaignLink ? (
          <div className="max-w-xl mx-auto bg-white rounded-3xl border border-slate-150 shadow-xl shadow-slate-100/50 p-6 md:p-8 space-y-6">
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold tracking-wide uppercase mb-3">
                <ShieldCheck className="w-3.5 h-3.5" />
                Audited & Secure Campaign
              </span>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Sponsor this Initiative</h2>
              <p className="text-xs text-slate-500 mt-1.5">Directly credited to Ambassador: <strong className="font-extrabold text-slate-800">{params.ambassador_name}</strong></p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Initiative:</span>
                <span className="font-bold text-slate-800">{params.project}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Sponsor ID:</span>
                <span className="font-mono font-bold text-slate-800">{params.ambassador_id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Target Funding Milestone:</span>
                <span className="font-mono font-extrabold text-emerald-600">${parseFloat(params.needed || "0").toLocaleString()} USD</span>
              </div>
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
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Donation Amount (USD)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-800 font-extrabold text-xs">
                    $
                  </span>
                  <input
                    type="number"
                    required
                    value={donorAmount}
                    onChange={(e) => setDonorAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-mono font-bold text-slate-800 outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CreditCard className="w-4 h-4 text-emerald-300" />
                Sponsor Initiative via Paystack
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : (
          <DonationForm />
        )}
      </div>

      {/* Renders the magnificent interactive Donation Impact visualization component */}
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
