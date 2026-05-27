import React, { useState } from "react";
import { motion } from "motion/react";
import { Icon } from "./Icon";

interface AmbassadorLoginProps {
  onLoginSuccess: (name: string, region: string) => void;
}

export const AmbassadorLogin: React.FC<AmbassadorLoginProps> = ({ onLoginSuccess }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [region, setRegion] = useState("");
  const [field, setField] = useState("Youth Technology Labs");
  const [agreeTerms, setAgreeTerms] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !region || !agreeTerms) return;
    onLoginSuccess(name, region);
  };

  const loadDemo = () => {
    onLoginSuccess("Ramon Bisola", "Lagos, Nigeria");
  };

  return (
    <div className="min-h-[85vh] bg-slate-50 pt-28 pb-16 flex items-center justify-center px-4 font-sans select-none text-slate-900">
      <div className="w-full max-w-4xl grid md:grid-cols-12 bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-100">
        
        {/* Left decoration illustration column */}
        <div className="md:col-span-5 bg-gradient-to-br from-emerald-900 via-emerald-800 to-slate-950 text-white p-8 sm:p-12 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-10">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:1rem_1rem]" />
          </div>

          <div className="space-y-3 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-6">
              <Icon name="Globe" className="text-emerald-400" size={20} />
            </div>
            <h3 className="text-2xl font-black font-serif leading-tight">Advaltad Global Networks</h3>
            <p className="text-xs text-gray-300 leading-relaxed font-sans mt-2">
              Join 1,200+ global ambassadors directing solar power systems, block compressors, and curriculum packages across active on-field grids.
            </p>
          </div>

          <div className="space-y-4 pt-10 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-300">
                <Icon name="Award" size={14} />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold">Dynamic Credentials</p>
                <p className="text-[10px] text-gray-400 leading-none">Instant cryptographic certified badges.</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-300">
                <Icon name="TrendingUp" size={14} />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold">P2P Value Exchanges</p>
                <p className="text-[10px] text-gray-400 leading-none">Swap project materials using AVU.</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-300">
                <Icon name="Coins" size={14} />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold">Audited Pipelines</p>
                <p className="text-[10px] text-gray-400 leading-none">100% trace ratios directed on-field.</p>
              </div>
            </div>
          </div>

          <p className="text-[9px] text-gray-400/80 mt-10 font-mono tracking-tight relative z-10">
            ADVALTAD LEGISLATIVE SECURE INTERLOCKS v2.6
          </p>
        </div>

        {/* Right authenticating form column */}
        <div className="md:col-span-7 p-8 sm:p-12 flex flex-col justify-center space-y-6">
          <div className="space-y-1">
            <h4 className="text-xl font-bold text-gray-900 tracking-tight">Become a Growth Ambassador</h4>
            <p className="text-xs text-slate-500">Sign up or enter existing credentials to launch your local dashboard segment instantly.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
            <div>
              <label className="block text-gray-500 font-bold uppercase mb-1">Your Full Name</label>
              <input
                id="login-name"
                required
                type="text"
                placeholder="e.g. Ramon Bisola"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 hover:border-gray-200 focus:border-emerald-600 rounded-xl font-medium text-sm text-gray-900 focus:outline-none transition-all"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-500 font-bold uppercase mb-1">Email Address</label>
                <input
                  id="login-email"
                  required
                  type="email"
                  placeholder="ramon@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 hover:border-gray-200 focus:border-emerald-600 rounded-xl font-medium text-sm text-gray-900 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-gray-500 font-bold uppercase mb-1">State & Country</label>
                <input
                  id="login-region"
                  required
                  type="text"
                  placeholder="e.g. Lagos, Nigeria"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 hover:border-gray-200 focus:border-emerald-600 rounded-xl font-medium text-sm text-gray-900 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-500 font-bold uppercase mb-1">Primary Field Fellowship Core</label>
              <select
                id="login-field"
                value={field}
                onChange={(e) => setField(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 hover:border-gray-200 focus:border-emerald-600 rounded-xl font-medium text-sm text-gray-900 focus:outline-none transition-all"
              >
                <option>Youth Technology Labs</option>
                <option>NextGen Scholarships</option>
                <option>Eco-sustainable housing</option>
                <option>Mobile clinics hygiene</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                id="login-agree"
                required
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 border-gray-200 focus:ring-emerald-500 cursor-pointer"
              />
              <span className="text-[11px] text-gray-500 leading-none">
                I agree to uphold the global peer audit commitment and code of service ethics.
              </span>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={!name || !email || !region || !agreeTerms}
              className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-150 disabled:text-gray-400 text-white font-bold tracking-tight text-xs shadow-md transition-all cursor-pointer"
            >
              Initialize Ambassador Profile & Sync Ledger
            </button>
          </form>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-gray-100"></div>
            <span className="flex-shrink mx-4 text-[10px] text-gray-400 font-bold uppercase">Or skip to examine demo</span>
            <div className="flex-grow border-t border-gray-100"></div>
          </div>

          <button
            id="login-demo-btn"
            onClick={loadDemo}
            className="w-full py-3.5 rounded-xl border border-gray-200 hover:bg-gray-50 font-bold text-xs text-gray-700 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            Launch Interactive Ambassador Demo Directly
          </button>
        </div>

      </div>
    </div>
  );
};
