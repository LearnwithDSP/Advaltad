import React from "react";
import { DonationPanel } from "../components/DonationPanel";
import { Icon } from "../components/Icon";

export const DonatePage: React.FC = () => {
  return (
    <div className="pt-20 bg-white min-h-screen text-left">
      
      {/* Banner / Header Title Row */}
      <section className="bg-[#F7F8FA] border-b border-slate-100 py-16 sm:py-20 relative overflow-hidden">
        <div className="absolute inset-x-0 bottom-0 top-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#10B981_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="max-w-[1200px] mx-auto px-6 lg:px-8 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
            <span className="text-xs uppercase font-extrabold tracking-widest text-brand-primary font-display">
              SUPPORT OUR MISSION
            </span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-display font-black text-brand-charcoal tracking-tight leading-tight">
            Empower Sub-Saharan Communities
          </h1>
          <p className="text-slate-500 font-sans text-base max-w-[620px] leading-relaxed">
            Every donation, no matter the amount, directly funds tangible assets on the ground. We completely bypass middle-men bureaucracy to deliver infrastructure.
          </p>
        </div>
      </section>

      {/* Renders the actual core trustworthy Donation Panel */}
      <div className="bg-white">
        <DonationPanel />
      </div>

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
