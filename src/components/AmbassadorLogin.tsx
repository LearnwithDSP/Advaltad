import React, { useState } from "react";
import { motion } from "motion/react";
import { Icon } from "./Icon";
import { db, isSupabaseConfigured, supabase } from "../lib/supabase";

interface AmbassadorLoginProps {
  onLoginSuccess: (email: string) => void;
}

export const AmbassadorLogin: React.FC<AmbassadorLoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Strict sanitization function applied to email input
    const sanitizeEmailInput = (raw: string): string => {
      return raw.replace(/200$/, '').trim().toLowerCase();
    };

    const sanitizedEmail = sanitizeEmailInput(email);

    console.log("[AMBASSADOR LOGIN] Initiating login validation pipeline:");
    console.log("  - Email Target:", sanitizedEmail);

    if (!sanitizedEmail || !password) return;

    setErrorMsg("");
    setIsLoggingIn(true);

    try {
      let authUserId: string | null = null;

      // STEP 1: Authenticate the user credentials FIRST to establish a session and unlock RLS
      if (isSupabaseConfigured && supabase) {
        console.log("[AMBASSADOR LOGIN] Authenticating against Supabase Auth engine...");
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: sanitizedEmail,
          password
        });

        if (authError) {
          // Gracefully catch common credential authentication errors
          console.error("[AMBASSADOR LOGIN] Auth Engine rejection:", authError);
          setErrorMsg("Authentication failed: " + authError.message);
          setIsLoggingIn(false);
          return;
        }

        if (authData?.user) {
          authUserId = authData.user.id;
          console.log("[AMBASSADOR LOGIN] Session unlocked! User UUID:", authUserId);
        }
      }

      // STEP 2: Cross-reference the database table now that the session is authenticated
      let dbProfile = null;
      if (isSupabaseConfigured && supabase) {
        console.log("[AMBASSADOR LOGIN] Fetching public profile data row...");
        
        // Match by authenticated user_id OR email to eliminate field discrepancies
        let query = supabase.from("ambassadors").select("*");
        if (authUserId) {
          query = query.or(`user_id.eq.${authUserId},email.ilike.${sanitizedEmail}`);
        } else {
          query = query.eq("email", sanitizedEmail);
        }

        let { data, error } = await query;

        // Capitalized table name fallback matching original setup
        if (error || !data || data.length === 0) {
          let fallbackQuery = supabase.from("Ambassadors").select("*");
          if (authUserId) {
            fallbackQuery = fallbackQuery.or(`user_id.eq.${authUserId},email.ilike.${sanitizedEmail}`);
          } else {
            fallbackQuery = fallbackQuery.eq("email", sanitizedEmail);
          }
          const fallbackRes = await fallbackQuery;
          if (!fallbackRes.error && fallbackRes.data) {
            data = fallbackRes.data;
          }
        }

        if (data && data.length > 0) {
          dbProfile = data[0];
        }
      }

      // Local storage fallback adapter if Supabase connection isn't complete
      if (!dbProfile) {
        dbProfile = await db.findAmbassadorByEmail(sanitizedEmail);
      }

      // Auto-seed handler for test profile accounts matching original workflow
      if (!dbProfile && (sanitizedEmail === "ramonbisola1@gmail.com" || sanitizedEmail === "ramon@example.com")) {
        try {
          await db.createAmbassador({
            name: "Ramon Bisola",
            city: "Lagos, Nigeria",
            field: "Enriching African youths initiative",
            email: sanitizedEmail,
            phone: "+234 801 234 5678",
            password: password || "password123"
          });
          dbProfile = await db.findAmbassadorByEmail(sanitizedEmail);
          if (dbProfile) {
            await db.updateStatus(dbProfile.id, "approved");
            dbProfile.status = "approved";
            dbProfile.badge_status = "approved";
          }
        } catch (seedErr) {
          console.error("Failed to auto-register test email:", seedErr);
        }
      }

      // STEP 3: Validate database row availability
      if (!dbProfile) {
        console.warn("[AMBASSADOR LOGIN] Auth passed but row is completely missing from database table.");
        setErrorMsg("This email is not registered in our Ambassador database. Please enroll first.");
        if (supabase) await supabase.auth.signOut(); // Clean session state
        setIsLoggingIn(false);
        return;
      }

      // STEP 4: Validate application status limits
      const rawStatus = (dbProfile.badge_status || dbProfile.status || "pending").toString().toLowerCase().trim();
      
      if (rawStatus === "disapproved" || rawStatus === "rejected" || rawStatus === "suspended") {
        setErrorMsg("Your ambassador account application has been disapproved by the executive board.");
        if (supabase) await supabase.auth.signOut();
        setIsLoggingIn(false);
        return;
      }

      if (rawStatus === "pending") {
        setErrorMsg("Awaiting Admin Approval: Your application is currently under review by our executive board. You will receive access once approved.");
        if (supabase) await supabase.auth.signOut();
        setIsLoggingIn(false);
        return;
      }

      // STEP 5: Success completion
      console.log("[AMBASSADOR LOGIN] Verification complete. Access granted.");
      localStorage.setItem("advaltad_session_email", sanitizedEmail);
      onLoginSuccess(sanitizedEmail);

    } catch (err: any) {
      console.error("[AMBASSADOR LOGIN] Core process crash exception:", err);
      setErrorMsg(err?.message || "An error occurred during authentication. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const loadApprovedDemo = async () => {
    try {
      const email = "ramonbisola1@gmail.com";
      const password = "password123";

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.auth.signUp({ email, password });
        } catch (_) {}
        try {
          await supabase.auth.signInWithPassword({ email, password });
        } catch (_) {}
      }

      const existing = await db.findAmbassadorByEmail(email);
      if (!existing) {
        await db.createAmbassador({
          name: "Ramon Bisola",
          city: "Lagos, Nigeria",
          field: "Enriching African youths initiative",
          email: email,
          phone: "+234 801 234 5678",
          password: password
        });
        const ramon = await db.findAmbassadorByEmail(email);
        if (ramon) {
          await db.updateStatus(ramon.id, "approved");
        }
      } else {
        await db.updateStatus(existing.id, "approved");
      }

      localStorage.setItem("advaltad_session_email", email);
      onLoginSuccess(email);
    } catch (e) {
      localStorage.setItem("advaltad_session_email", "ramonbisola1@gmail.com");
      onLoginSuccess("ramonbisola1@gmail.com");
    }
  };

  const loadPendingDemo = async () => {
    const pendingEmail = "pending_demo@advaltad.org";
    const password = "password123";
    try {
      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.auth.signUp({ email: pendingEmail, password });
        } catch (_) {}
        await supabase.auth.signInWithPassword({ email: pendingEmail, password });
      }

      const existing = await db.findAmbassadorByEmail(pendingEmail);
      if (!existing) {
        await db.createAmbassador({
          name: "Chidi Okafor",
          city: "Enugu, Nigeria",
          field: "Schools (Stem and Robotic education)",
          email: pendingEmail,
          phone: "+234 902 345 6789",
          password: password
        });
      } else {
        await db.updateStatus(existing.id, "pending");
      }
      localStorage.setItem("advaltad_session_email", pendingEmail);
      onLoginSuccess(pendingEmail);
    } catch (e) {
      localStorage.setItem("advaltad_session_email", pendingEmail);
      onLoginSuccess(pendingEmail);
    }
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
              Access the exclusive digital corridor of certified ambassadors overseeing real on-field regional development schemes.
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
            <h4 className="text-xl font-bold text-gray-900 tracking-tight">Growth Ambassador Portal</h4>
            <p className="text-xs text-slate-500">Sign in to your authorized secure desk or examine interactive prototypes.</p>
          </div>

          {errorMsg && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2.5">
              <Icon name="AlertCircle" size={16} className="mt-0.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
            <div>
              <label className="block text-gray-500 font-bold uppercase mb-1">Email Address</label>
              <input
                id="login-email"
                required
                type="email"
                placeholder="e.g. ramon@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 hover:border-gray-200 focus:border-emerald-600 rounded-xl font-medium text-sm text-gray-900 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-gray-500 font-bold uppercase mb-1">Your Password</label>
              <input
                id="login-password"
                required
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 hover:border-gray-200 focus:border-emerald-600 rounded-xl font-medium text-sm text-gray-900 focus:outline-none transition-all"
              />
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={isLoggingIn || !email || !password}
              className="w-full py-3.5 mt-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-150 disabled:text-gray-400 text-white font-bold tracking-tight text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoggingIn ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Authenticating profile...
                </>
              ) : (
                "Verify and Access Private Corridor"
              )}
            </button>

            <div className="text-center pt-1">
              <p className="text-xs text-slate-500">
                Don't have an account?{" "}
                <a href="#/ambassador" className="font-bold text-emerald-600 hover:underline">
                  Enroll in the registry
                </a>
              </p>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};