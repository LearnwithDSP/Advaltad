import React, { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import {
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
  Lock,
  Mail,
  RefreshCw,
  Clock,
  Check
} from "lucide-react";
import { isSupabaseConfigured, supabase, resetPasswordForEmail } from "../lib/supabase";
import { useToast } from "../context/ToastContext";

interface ResetPasswordPageProps {
  onComplete?: () => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ onComplete }) => {
  const { showToast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: ""
  });

  // Password strength criteria
  const passwordCriteria = useMemo(() => [
    { id: "len", label: "At least 8 characters", met: password.length >= 8 },
    { id: "cases", label: "Upper & lowercase letters", met: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    { id: "num", label: "At least 1 number (0-9)", met: /[0-9]/.test(password) },
    { id: "spec", label: "At least 1 special character (!@#$)", met: /[^A-Za-z0-9]/.test(password) },
  ], [password]);

  // Visual password strength indicator score and CSS colors
  const strength = useMemo(() => {
    if (!password) {
      return { score: 0, label: "Empty", barColor: "bg-slate-200", textColor: "text-slate-400" };
    }

    let passedCount = 0;
    if (password.length >= 8) passedCount += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) passedCount += 1;
    if (/[0-9]/.test(password)) passedCount += 1;
    if (/[^A-Za-z0-9]/.test(password)) passedCount += 1;

    if (password.length < 6) {
      return { score: 1, label: "Too Weak", barColor: "bg-rose-500", textColor: "text-rose-600" };
    }

    if (passedCount <= 1) {
      return { score: 1, label: "Weak", barColor: "bg-rose-500", textColor: "text-rose-600" };
    }
    if (passedCount === 2) {
      return { score: 2, label: "Fair", barColor: "bg-amber-500", textColor: "text-amber-600" };
    }
    if (passedCount === 3) {
      return { score: 3, label: "Good", barColor: "bg-blue-500", textColor: "text-blue-600" };
    }
    return { score: 4, label: "Strong", barColor: "bg-emerald-500", textColor: "text-emerald-600" };
  }, [password]);

  // Session validation states
  const [isValidatingSession, setIsValidatingSession] = useState(true);
  const [isRecoverySessionActive, setIsRecoverySessionActive] = useState(false);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);

  // New reset request states for fallback UI
  const [requestEmail, setRequestEmail] = useState("");
  const [isSendingNewLink, setIsSendingNewLink] = useState(false);
  const [newLinkStatus, setNewLinkStatus] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: ""
  });

  useEffect(() => {
    let isMounted = true;

    // Helper to inspect hash and search params for Supabase error messages
    const checkUrlForErrors = (): string | null => {
      if (typeof window === "undefined") return null;
      try {
        const hashStr = window.location.hash.replace(/^#\/?/, "");
        const searchStr = window.location.search.replace(/^\?/, "");
        const hashParams = new URLSearchParams(hashStr);
        const searchParams = new URLSearchParams(searchStr);

        const errorDesc =
          hashParams.get("error_description") ||
          searchParams.get("error_description") ||
          hashParams.get("error") ||
          searchParams.get("error");

        if (errorDesc) {
          return decodeURIComponent(errorDesc.replace(/\+/g, " "));
        }
      } catch {
        // ignore parsing issues
      }
      return null;
    };

    const initialError = checkUrlForErrors();
    if (initialError) {
      if (isMounted) {
        setFallbackReason(initialError);
        setIsRecoverySessionActive(false);
        setIsValidatingSession(false);
      }
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      if (isMounted) {
        setFallbackReason("Authentication service is currently unavailable.");
        setIsRecoverySessionActive(false);
        setIsValidatingSession(false);
      }
      return;
    }

    // 1. Check existing session immediately on mount
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!isMounted) return;
      if (session?.user) {
        setIsRecoverySessionActive(true);
        setIsValidatingSession(false);
      }
    }).catch((err) => {
      console.warn("Initial session lookup error:", err);
    });

    // 2. Listen for Supabase auth state change (specifically PASSWORD_RECOVERY event)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session?.user)) {
        setIsRecoverySessionActive(true);
        setIsValidatingSession(false);
        setFallbackReason(null);
      } else if (event === "SIGNED_OUT") {
        setIsRecoverySessionActive(false);
      }
    });

    // 3. Grace period timeout: allow time for Supabase client to parse the token from URL
    const validationTimer = setTimeout(async () => {
      if (!isMounted) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setIsRecoverySessionActive(true);
        } else {
          setIsRecoverySessionActive(false);
        }
      } catch {
        setIsRecoverySessionActive(false);
      } finally {
        if (isMounted) {
          setIsValidatingSession(false);
        }
      }
    }, 2000);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      clearTimeout(validationTimer);
    };
  }, []);

  // Update password handler
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    // Safety constraint: Do not call supabase.auth.updateUser until auth recovery session is active
    if (!isRecoverySessionActive) {
      setStatusMessage({
        type: "error",
        message: "No active recovery session found. Please request a new password reset link."
      });
      return;
    }

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

      // Trigger global toast notification system
      showToast(
        "success",
        "Password successfully updated",
        "Your account security credentials have been updated. You can now log in with your new password."
      );

      setStatusMessage({
        type: "success",
        message: "Your password has been successfully updated! You can now log in with your new credentials."
      });
    } catch (err: any) {
      console.error("[PASSWORD UPDATE FAILED]:", err);
      const errMsg = err.message || "Failed to update password. Your recovery link may have expired.";
      showToast("error", "Password update failed", errMsg);
      setStatusMessage({
        type: "error",
        message: errMsg
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler to request a new password reset link from fallback UI
  const handleRequestNewResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = requestEmail.trim().toLowerCase();
    if (!targetEmail) return;

    setIsSendingNewLink(true);
    setNewLinkStatus({ type: null, message: "" });

    try {
      const { error } = await resetPasswordForEmail(targetEmail);
      if (error) throw error;

      setNewLinkStatus({
        type: "success",
        message: `A fresh password recovery link has been dispatched to ${targetEmail}. Please check your inbox.`
      });
    } catch (err: any) {
      console.error("[NEW RESET LINK REQUEST ERROR]:", err);
      setNewLinkStatus({
        type: "error",
        message: err.message || "Failed to send reset link. Please check your email address and try again."
      });
    } finally {
      setIsSendingNewLink(false);
    }
  };

  const handleReturnToLogin = () => {
    if (onComplete) {
      onComplete();
    } else {
      window.location.hash = "#/ambassador";
    }
  };

  // 1. Loading State while validating token and session on mount
  if (isValidatingSession) {
    return (
      <div className="pt-28 pb-20 min-h-screen bg-[#F8FAF9] flex items-center justify-center px-4 sm:px-6 font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 border border-slate-100 shadow-[0_12px_45px_rgba(0,0,0,0.04)] text-center space-y-6"
        >
          <div className="w-16 h-16 bg-brand-primary/10 text-brand-primary rounded-2xl flex items-center justify-center mx-auto border border-brand-primary/20 shadow-sm">
            <div className="w-7 h-7 rounded-full border-3 border-brand-primary border-t-transparent animate-spin" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-display font-black text-brand-charcoal tracking-tight">
              Verifying Recovery Token...
            </h2>
            <p className="text-xs text-slate-500 font-sans leading-relaxed max-w-xs mx-auto">
              Please wait while we validate your security link and establish an authenticated session.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 font-mono">
            <Clock className="w-3.5 h-3.5" />
            <span>Establishing secure connection</span>
          </div>
        </motion.div>
      </div>
    );
  }

  // 2. Fallback UI if no recovery session exists
  if (!isRecoverySessionActive) {
    return (
      <div className="pt-28 pb-20 min-h-screen bg-[#F8FAF9] flex items-center justify-center px-4 sm:px-6 font-sans">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 border border-slate-100 shadow-[0_12px_45px_rgba(0,0,0,0.04)] text-center space-y-6"
        >
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200/80 shadow-sm">
            <AlertCircle className="w-8 h-8 text-amber-600" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-display font-black text-brand-charcoal tracking-tight">
              Reset Link Expired or Invalid
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              {fallbackReason ||
                "No active password recovery session was detected. The link in your email may have expired, already been used, or was opened in another browser."}
            </p>
          </div>

          {newLinkStatus.type === "success" ? (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 text-left space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-950">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Reset Link Sent</span>
              </div>
              <p className="text-emerald-800 leading-relaxed">{newLinkStatus.message}</p>
            </div>
          ) : (
            <form onSubmit={handleRequestNewResetLink} className="space-y-3.5 text-left">
              {newLinkStatus.type === "error" && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{newLinkStatus.message}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5">
                  Request a New Link
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="Enter your registered email"
                    value={requestEmail}
                    onChange={(e) => setRequestEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-brand-primary focus:bg-white rounded-xl text-xs text-slate-900 focus:outline-none transition-all font-medium"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSendingNewLink || !requestEmail.trim()}
                className="w-full py-3.5 rounded-xl bg-brand-primary hover:bg-[#0A4233] disabled:bg-slate-200 disabled:text-slate-400 text-white font-display font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
              >
                {isSendingNewLink ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Dispatching Link...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Send New Reset Link</span>
                  </>
                )}
              </button>
            </form>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
            <button
              type="button"
              onClick={handleReturnToLogin}
              className="inline-flex items-center gap-1.5 text-slate-500 hover:text-brand-primary transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Return to Login</span>
            </button>
            <a
              href="#home"
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              Return Home
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  // 3. Authenticated Recovery Form: Active session established
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
            Please enter your new security credential to restore full access to your Advaltad account.
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
              onClick={handleReturnToLogin}
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
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="input-new-password"
                  className="block text-slate-600 font-bold uppercase text-[11px]"
                >
                  New Password
                </label>
                {password.length > 0 && (
                  <span
                    id="password-strength-label"
                    className={`font-bold font-display uppercase tracking-wider text-[11px] ${strength.textColor}`}
                  >
                    {strength.label}
                  </span>
                )}
              </div>

              <div className="relative">
                <input
                  id="input-new-password"
                  required
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter a secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-4 pr-11 py-3.5 bg-slate-50 border border-slate-200 focus:border-brand-primary focus:bg-white rounded-xl font-medium text-sm text-slate-900 focus:outline-none transition-all"
                />
                <button
                  id="btn-toggle-show-password"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors cursor-pointer p-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Visual Password Strength Indicator */}
              {password.length > 0 && (
                <div
                  id="password-strength-indicator"
                  className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2.5 transition-all"
                >
                  {/* Segmented Strength Bar */}
                  <div className="space-y-1">
                    <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-full rounded-full transition-all duration-300 ${
                            strength.score >= level ? strength.barColor : "bg-slate-200"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Criteria Checklist */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5 text-[11px]">
                    {passwordCriteria.map((crit) => (
                      <div
                        key={crit.id}
                        id={`crit-${crit.id}`}
                        className={`flex items-center gap-1.5 transition-colors ${
                          crit.met ? "text-emerald-700 font-semibold" : "text-slate-400 font-normal"
                        }`}
                      >
                        {crit.met ? (
                          <Check size={13} className="text-emerald-600 stroke-[3] shrink-0" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0 ml-1 mr-0.5" />
                        )}
                        <span>{crit.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="input-confirm-password"
                  className="block text-slate-600 font-bold uppercase text-[11px]"
                >
                  Confirm New Password
                </label>
                {confirmPassword.length > 0 && (
                  <span
                    id="password-match-status"
                    className={`text-[11px] font-bold flex items-center gap-1 ${
                      password === confirmPassword ? "text-emerald-600" : "text-rose-500"
                    }`}
                  >
                    {password === confirmPassword ? (
                      <>
                        <Check size={12} className="stroke-[3]" />
                        <span>Match</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={12} />
                        <span>Mismatch</span>
                      </>
                    )}
                  </span>
                )}
              </div>

              <div className="relative">
                <input
                  id="input-confirm-password"
                  required
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-4 pr-11 py-3.5 bg-slate-50 border border-slate-200 focus:border-brand-primary focus:bg-white rounded-xl font-medium text-sm text-slate-900 focus:outline-none transition-all"
                />
                <button
                  id="btn-toggle-show-confirm-password"
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors cursor-pointer p-1"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  title={showConfirmPassword ? "Hide password" : "Show password"}
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
              <button
                type="button"
                onClick={handleReturnToLogin}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-primary font-semibold transition-colors cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>Return to Ambassador Portal</span>
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};
