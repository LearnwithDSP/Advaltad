import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft, ShieldCheck, Lock } from "lucide-react";
import { isSupabaseConfigured, supabase, db } from "../lib/supabase";

interface ResetPasswordPageProps {
  onComplete?: () => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ onComplete }) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: ""
  });
  const [hasValidSession, setHasValidSession] = useState<boolean | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      if (!isSupabaseConfigured || !supabase) {
        setHasValidSession(false);
        return;
      }

      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session || window.location.hash.includes("access_token") || window.location.hash.includes("type=recovery")) {
          setHasValidSession(true);
        } else {
          // Allow the user to submit regardless, as Supabase recovery tokens are parsed in the background
          setHasValidSession(true);
        }
      } catch {
        setHasValidSession(true);
      }
    };

    checkSession();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    if (password.length < 6) {
      setStatusMessage({
        type: "error",
        message: "Password must be at least 6 characters in length."
      });
      return;
    }

    if (password !== confirmPassword) {
      setStatusMessage({
        type: "error",
        message: "The entered passwords do not match. Please verify and try again."
      });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage({ type: null, message: "" });

    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error("Supabase authentication is not configured.");
      }

      // Execute password update via Supabase Auth API
      const { data, error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        throw error;
      }

      setStatusMessage({
        type: "success",
        message: "Your password has been successfully updated! You can now log in with your new credentials."
      });
    } catch (err: any) {
      console.error("[PASSWORD UPDATE FAILED]:", err);
      setStatusMessage({
        type: "error",
        message: err.message || "Failed to update password. Your recovery link may have expired."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pt-28 pb-20 min-h-screen bg-[#F8FAF9] flex items-center justify-center px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 border border-slate-100 shadow-[0_12px_45px_rgba(0,0,0,0.04)] relative overflow-hidden"
      >
        <div className="text-center space-y-3 mb-8">
          <div className="w-14 h-14 bg-brand-primary/10 text-brand-primary rounded-2xl flex items-center justify-center mx-auto border border-brand-primary/20 shadow-sm">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-brand-charcoal tracking-tight">
            Create New Password
          </h1>
          <p className="text-xs text-slate-500 font-sans leading-relaxed">
            Please enter your new desired security credential to restore full access to your Advaltad account.
          </p>
        </div>

        {statusMessage.type === "success" ? (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm mb-1 text-emerald-950">Password Changed</p>
                <p className="text-emerald-800 leading-relaxed">{statusMessage.message}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (onComplete) {
                  onComplete();
                } else {
                  window.location.hash = "#/ambassador";
                }
              }}
              className="w-full py-4 rounded-xl bg-brand-primary hover:bg-[#0A4233] text-white font-display font-bold text-xs tracking-widest uppercase shadow-lg shadow-brand-primary/10 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Proceed to Login</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-4 text-xs font-sans">
            {statusMessage.type === "error" && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>{statusMessage.message}</span>
              </div>
            )}

            <div>
              <label className="block text-slate-600 font-bold uppercase mb-1.5 text-[11px]">
                New Password
              </label>
              <div className="relative">
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-4 pr-11 py-3.5 bg-slate-50 border border-slate-200 focus:border-brand-primary focus:bg-white rounded-xl font-medium text-sm text-slate-900 focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors cursor-pointer p-1"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-600 font-bold uppercase mb-1.5 text-[11px]">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  required
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-4 pr-11 py-3.5 bg-slate-50 border border-slate-200 focus:border-brand-primary focus:bg-white rounded-xl font-medium text-sm text-slate-900 focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors cursor-pointer p-1"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !password || !confirmPassword}
              className="w-full py-4 mt-2 rounded-xl bg-brand-primary hover:bg-[#0A4233] disabled:bg-slate-200 disabled:text-slate-400 text-white font-display font-black tracking-widest text-xs uppercase shadow-lg shadow-brand-primary/10 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Updating Security Profile...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Save New Password</span>
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <a
                href="#/ambassador"
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-primary font-semibold transition-colors"
              >
                <ArrowLeft size={14} />
                <span>Return to Ambassador Portal</span>
              </a>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};
