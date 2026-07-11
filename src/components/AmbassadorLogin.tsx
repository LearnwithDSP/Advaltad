import React, { useState } from "react";
import { motion } from "motion/react";
import { Icon } from "./Icon";
import { db, isSupabaseConfigured, supabase, supabaseAdmin } from "../lib/supabase";
import { traceDbOperation, traceGenericOperation, logDbOperation } from "../lib/db-logger";

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
      // PRE-CHECK: Query the database using the sanitized email to check for a 'pending' state case-insensitively
      if (isSupabaseConfigured && (supabaseAdmin || supabase)) {
        const client = supabaseAdmin || supabase;
        let preQuery = client.from("ambassadors").select("*").ilike("email", sanitizedEmail);
        let preRes = await preQuery;
        if (preRes.error || !preRes.data || preRes.data.length === 0) {
          const fallbackPre = await client.from("Ambassadors").select("*").ilike("email", sanitizedEmail);
          if (!fallbackPre.error && fallbackPre.data && fallbackPre.data.length > 0) {
            preRes = fallbackPre;
          }
        }
        if (preRes.data && preRes.data.length > 0) {
          const amb = preRes.data[0];
          const badgeStatus = amb.badge_status ? amb.badge_status.toString().toLowerCase().trim() : "";
          const status = amb.status ? amb.status.toString().toLowerCase().trim() : "";
          if (badgeStatus === "pending" || status === "pending") {
            const pendingMsg = "Awaiting Admin Approval: Your growth ambassador application is currently under review by our executive board. You will receive access details once approved.";
            setErrorMsg(pendingMsg);
            setIsLoggingIn(false);
            return;
          }
        }
      } else {
        // Fallback local DB check for pending status
        const localAmb = await db.findAmbassadorByEmail(sanitizedEmail);
        if (localAmb) {
          const badgeStatus = localAmb.badge_status ? localAmb.badge_status.toString().toLowerCase().trim() : "";
          const status = localAmb.status ? localAmb.status.toString().toLowerCase().trim() : "";
          if (badgeStatus === "pending" || status === "pending") {
            const pendingMsg = "Awaiting Admin Approval: Your growth ambassador application is currently under review by our executive board. You will receive access details once approved.";
            setErrorMsg(pendingMsg);
            setIsLoggingIn(false);
            return;
          }
        }
      }

      let authUserId: string | null = null;
      let authEmail = sanitizedEmail;

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
          logDbOperation("Ambassador Supabase Auth Signin Error", { email: sanitizedEmail }, authError);
          setErrorMsg("Authentication failed: " + authError.message);
          setIsLoggingIn(false);
          return;
        }

        if (authData?.user) {
          authUserId = authData.user.id;
          authEmail = authData.user.email || sanitizedEmail;
          console.log("[AMBASSADOR LOGIN] Session unlocked! User UUID:", authUserId, "Email:", authEmail);
          logDbOperation("Ambassador Supabase Auth Signin Success", { email: authEmail, userId: authUserId }, null);
        }
      }

      // STEP 2: Cross-reference the database table now that the session is authenticated
      let dbProfile = null;
      if (isSupabaseConfigured && supabase) {
        console.log("[AMBASSADOR LOGIN] Fetching public profile data row...");
        
        // Match by authenticated user's email or user_id to eliminate field discrepancies (case-insensitive)
        const fetchProfile = async () => {
          const client = supabaseAdmin || supabase;
          let query = client.from("ambassadors").select("*");
          if (authUserId) {
            query = query.or(`user_id.eq.${authUserId},email.ilike.${authEmail}`);
          } else {
            query = query.ilike("email", authEmail);
          }
          let res = await query;
          
          // Capitalized table name fallback matching original setup
          if (res.error || !res.data || res.data.length === 0) {
            let fallbackQuery = client.from("Ambassadors").select("*");
            if (authUserId) {
              fallbackQuery = fallbackQuery.or(`user_id.eq.${authUserId},email.ilike.${authEmail}`);
            } else {
              fallbackQuery = fallbackQuery.ilike("email", authEmail);
            }
            const fallbackRes = await fallbackQuery;
            if (!fallbackRes.error && fallbackRes.data) {
              res = fallbackRes as any;
            }
          }
          return res;
        };

        const response = await traceDbOperation(
          "Fetch Ambassador Profile on Login",
          { authUserId, email: authEmail },
          fetchProfile
        );

        if (response.data && response.data.length > 0) {
          dbProfile = response.data[0];
          logDbOperation("Fetch Ambassador Profile Success", { email: authEmail, profile: dbProfile }, null);
        } else {
          logDbOperation("Fetch Ambassador Profile Empty Result", { email: authEmail }, new Error("Profile table query returned zero rows"));
        }

        // AUTO-RESTORE SAFETY NET:
        // If Auth passed successfully (authUserId exists) but the row is missing from the database,
        // it means the user was successfully signed up in Auth but the table insert failed (RLS/delay).
        // Since they are now authenticated, we can safely create their database row in real-time!
        if (authUserId && !dbProfile) {
          console.log("[AMBASSADOR LOGIN] Auth passed but row is missing in table. Restoring from Auth metadata...");
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const meta = user.user_metadata || {};
              const metaName = meta.name || meta.professional_name || "Growth Ambassador";
              const metaCity = meta.city || meta.base_city || "Lagos, Nigeria";
              const metaField = meta.field || meta.focus_interest || "Enriching African youths initiative";
              const metaPhone = meta.phone || meta.phone_number || "+234 801 234 5678";

              // Create the missing database row
              dbProfile = await traceGenericOperation(
                "Auto-Restore Missing Ambassador Row",
                { name: metaName, email: sanitizedEmail, user_id: authUserId },
                () => db.createAmbassador({
                  name: metaName,
                  city: metaCity,
                  field: metaField,
                  email: sanitizedEmail,
                  phone: metaPhone,
                  password: password,
                  user_id: authUserId
                })
              );
              console.log("[AMBASSADOR LOGIN] Successfully auto-restored missing database row:", dbProfile);
              logDbOperation("Ambassador Auto-Restore Missing Row Success", { email: sanitizedEmail, profile: dbProfile }, null);
            }
          } catch (restoreErr) {
            console.error("[AMBASSADOR LOGIN] Failed to auto-restore profile row:", restoreErr);
            logDbOperation("Ambassador Auto-Restore Missing Row Error", { email: sanitizedEmail }, restoreErr);
          }
        }
      }

      // Local storage fallback adapter if Supabase connection isn't complete
      if (!dbProfile) {
        dbProfile = await traceGenericOperation(
          "Fallback Find Ambassador by Email",
          { email: sanitizedEmail },
          () => db.findAmbassadorByEmail(sanitizedEmail)
        );
        if (dbProfile) {
          logDbOperation("Fallback Find Ambassador Success", { email: sanitizedEmail, profile: dbProfile }, null);
        }
      }

      // Auto-seed handler for test profile accounts matching original workflow
      if (!dbProfile && (sanitizedEmail === "ramonbisola1@gmail.com" || sanitizedEmail === "ramon@example.com")) {
        try {
          await traceGenericOperation(
            "Auto-Seed Test Ambassador Row",
            { email: sanitizedEmail },
            async () => {
              await db.createAmbassador({
                name: "Ramon Bisola",
                city: "Lagos, Nigeria",
                field: "Enriching African youths initiative",
                email: sanitizedEmail,
                phone: "+234 801 234 5678",
                password: password || "password123"
              });
              const seedProf = await db.findAmbassadorByEmail(sanitizedEmail);
              if (seedProf) {
                await db.updateStatus(seedProf.id, "approved");
                seedProf.status = "approved";
                seedProf.badge_status = "approved";
              }
              return seedProf;
            }
          ).then(res => {
            dbProfile = res;
            logDbOperation("Ambassador Auto-Seed Test Row Success", { email: sanitizedEmail, profile: dbProfile }, null);
          });
        } catch (seedErr) {
          console.error("Failed to auto-register test email:", seedErr);
          logDbOperation("Ambassador Auto-Seed Test Row Error", { email: sanitizedEmail }, seedErr);
        }
      }

      // STEP 3: Validate database row availability
      if (!dbProfile) {
        console.warn("[AMBASSADOR LOGIN] Auth passed but row is completely missing from database table.");
        const missingDbRowErr = new Error("This email is not registered in our Ambassador database. Please enroll first.");
        logDbOperation("Ambassador Database Row Missing", { email: sanitizedEmail }, missingDbRowErr);
        setErrorMsg(missingDbRowErr.message);
        if (supabase) await supabase.auth.signOut(); // Clean session state
        setIsLoggingIn(false);
        return;
      }

      // STEP 4: Validate application status limits
      // Explicit check for the 'badge_status' column to handle 'pending' statuses gracefully
      const explicitBadgeStatus = dbProfile.badge_status ? dbProfile.badge_status.toString().toLowerCase().trim() : null;
      const rawStatus = (dbProfile.badge_status || dbProfile.status || "pending").toString().toLowerCase().trim();
      
      if (explicitBadgeStatus === "pending") {
        console.log("[AMBASSADOR LOGIN] Detected 'pending' badge_status explicitly.");
        const pendingMsg = "Awaiting Admin Approval: Your growth ambassador application is currently under review by our executive board. You will receive access details once approved.";
        logDbOperation("Ambassador Account Pending via badge_status", { email: sanitizedEmail, badge_status: dbProfile.badge_status }, null);
        setErrorMsg(pendingMsg);
        if (supabase) await supabase.auth.signOut();
        setIsLoggingIn(false);
        return;
      }
      
      if (rawStatus === "disapproved" || rawStatus === "rejected" || rawStatus === "suspended") {
        const disapprovedErr = new Error("Your ambassador account application has been disapproved by the executive board.");
        logDbOperation("Ambassador Account Disapproved", { email: sanitizedEmail, status: rawStatus }, disapprovedErr);
        setErrorMsg(disapprovedErr.message);
        if (supabase) await supabase.auth.signOut();
        setIsLoggingIn(false);
        return;
      }

      if (rawStatus === "pending") {
        const pendingErr = new Error("Awaiting Admin Approval: Your application is currently under review by our executive board. You will receive access once approved.");
        logDbOperation("Ambassador Account Pending Approval", { email: sanitizedEmail, status: rawStatus }, pendingErr);
        setErrorMsg(pendingErr.message);
        if (supabase) await supabase.auth.signOut();
        setIsLoggingIn(false);
        return;
      }

      // STEP 5: Success completion
      console.log("[AMBASSADOR LOGIN] Verification complete. Access granted.");
      logDbOperation("Ambassador Login Fully Verified", { email: sanitizedEmail, status: rawStatus }, null);
      localStorage.setItem("advaltad_session_email", sanitizedEmail);
      onLoginSuccess(sanitizedEmail);

    } catch (err: any) {
      console.error("[AMBASSADOR LOGIN] Core process crash exception:", err);
      logDbOperation("Ambassador Login Core Process Crash", { email: sanitizedEmail }, err);
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