import React from "react";
import { AmbassadorSection } from "../components/AmbassadorSection";
import { Icon } from "../components/Icon";

export const AmbassadorPage: React.FC = () => {
  return (
    <div className="pt-20 bg-white min-h-screen text-left">
      
      {/* Banner / Header Title Row */}
      <section className="bg-[#F7F8FA] border-b border-slate-100 py-16 sm:py-20 relative overflow-hidden">
        <div className="absolute inset-x-0 bottom-0 top-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#10B981_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="max-w-[1200px] mx-auto px-6 lg:px-8 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
            <span className="text-xs uppercase font-extrabold tracking-widest text-brand-primary font-display">
              FELLOWSHIP CORRIDOR
            </span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-display font-black text-brand-charcoal tracking-tight leading-tight">
            Advaltad Global Ambassadors
          </h1>
          <p className="text-slate-500 font-sans text-base max-w-[620px] leading-relaxed">
            Translate your passion, skills, and resources into certified local development. Join our network of over 1,400+ advocates globally.
          </p>
        </div>
      </section>

      {/* Renders the actual core registry block */}
      <div className="bg-white">
        <AmbassadorSection />
      </div>

      {/* Ambassador Roadmap flow */}
      <section className="py-20 bg-[#F7F8FA] border-t border-slate-100/80">
        <div className="max-w-[1240px] mx-auto px-6 lg:px-8 text-center space-y-12">
          <div className="max-w-xl mx-auto space-y-4">
            <h3 className="text-sm uppercase tracking-widest font-extrabold text-slate-400 font-display">HOW THE FELLOWSHIP DEPLOYS</h3>
            <h2 className="text-2xl sm:text-3xl font-display font-black text-brand-charcoal tracking-tight">Your Journey as an Ambassador</h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-3 max-w-4xl mx-auto text-left">
            {[
              {
                step: "01",
                title: "Register & Generate Card",
                desc: "Fill the registry above to establish your credentials. This generates your active digital secure badge."
              },
              {
                step: "02",
                title: "Sign in to Dashboard",
                desc: "Use your badge to secure access to the global corridor. View active field build-sheets and submit projects."
              },
              {
                step: "03",
                title: "Champion Projects",
                desc: "Co-operate locally or coordinate resources. Review progress directly and receive professional recommendations."
              }
            ].map((r) => (
              <div key={r.step} className="bg-white p-7 rounded-2xl border border-slate-100/50 space-y-4 shadow-sm relative overflow-hidden group">
                <span className="absolute -top-4 -right-2 text-[48px] font-display font-black text-slate-50/70 group-hover:text-brand-secondary/40 transition-colors">{r.step}</span>
                <div className="space-y-2 relative z-10 pt-4">
                  <h4 className="font-display font-black text-sm text-[#1E293B]">{r.title}</h4>
                  <p className="text-slate-500 font-sans text-xs leading-relaxed">
                    {r.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
};
