/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Clock, RefreshCw, LogOut, ShieldAlert } from "lucide-react";
import { MegaMenu } from "./components/MegaMenu";
import { Footer } from "./components/Footer";
import { AmbassadorLogin } from "./components/AmbassadorLogin";
import { AmbassadorDashboard } from "./components/AmbassadorDashboard";
import { AdminPortal } from "./components/AdminPortal";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { isSupabaseConfigured, supabase, checkApprovalStatus } from "./lib/supabase";

// Import new modular independent page components
import { HomePage } from "./pages/HomePage";
import { AboutPage } from "./pages/AboutPage";
import { ProgramsPage } from "./pages/ProgramsPage";
import { StoriesPage } from "./pages/StoriesPage";
import { MediaPage } from "./pages/MediaPage";
import { DonatePage } from "./pages/DonatePage";
import { AmbassadorPage } from "./pages/AmbassadorPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";

export default function App() {
  const [route, setRoute] = useState<string>("#home");
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const pathname = window.location.pathname.toLowerCase();
    const hash = (window.location.hash || "").toLowerCase();
    const search = window.location.search.toLowerCase();
    return (
      pathname.includes("reset-password") ||
      hash.includes("reset-password") ||
      hash.includes("type=recovery") ||
      search.includes("type=recovery")
    );
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem("advaltad_session_email");
  });
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [isCheckingApproval, setIsCheckingApproval] = useState<boolean>(false);

  // Auth Listener & Routing: Listen for PASSWORD_RECOVERY event to route directly to reset password form
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        // Prevent global route guards/auth listeners from redirecting to homepage
        setIsPasswordRecovery(true);
        setRoute("#/reset-password");
        if (window.location.pathname !== "/reset-password" && !window.location.hash.includes("reset-password")) {
          window.location.hash = "#/reset-password";
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const verifyUserApproval = async () => {
      if (isPasswordRecovery || route.toLowerCase().includes("reset-password") || window.location.pathname.includes("reset-password")) {
        return;
      }

      const sessionEmail = localStorage.getItem("advaltad_session_email");
      if (sessionEmail && isAuthenticated) {
        setIsCheckingApproval(true);
        const approved = await checkApprovalStatus(sessionEmail);
        setIsApproved(approved);
        setIsCheckingApproval(false);
      } else {
        setIsApproved(false);
        setIsCheckingApproval(false);
      }
    };

    verifyUserApproval();
  }, [isAuthenticated, route, isPasswordRecovery]);

  useEffect(() => {
    const checkRoute = () => {
      const pathname = window.location.pathname.toLowerCase();
      const rawHash = window.location.hash || "";
      const hash = rawHash.toLowerCase();
      const search = window.location.search.toLowerCase();

      // Check if current route is for password recovery / reset password
      const isRecoveryTarget =
        pathname.includes("reset-password") ||
        hash.includes("reset-password") ||
        hash.includes("type=recovery") ||
        search.includes("type=recovery") ||
        isPasswordRecovery;

      if (isRecoveryTarget) {
        setIsPasswordRecovery(true);
        setRoute("#/reset-password");
        window.scrollTo({ top: 0, behavior: "instant" as any });
        return;
      }

      // Pull down the old growth-ambassador page and redirect to ambassador
      if (hash.includes("growth-ambassador")) {
        window.location.hash = "#/ambassador";
        return;
      }

      const effectiveHash = rawHash || "#home";
      setRoute(effectiveHash);

      // Dynamically sync auth state from localStorage on route transitions
      const hasSession = !!localStorage.getItem("advaltad_session_email");
      setIsAuthenticated(hasSession);

      // Auto-jump view scroll to page absolute top on transitions
      window.scrollTo({ top: 0, behavior: "instant" as any });
    };

    checkRoute();

    window.addEventListener("hashchange", checkRoute);
    window.addEventListener("popstate", checkRoute);
    return () => {
      window.removeEventListener("hashchange", checkRoute);
      window.removeEventListener("popstate", checkRoute);
    };
  }, [isPasswordRecovery]);

  const handleDonateTrigger = () => {
    window.location.hash = "#/donate";
  };

  const handleAmbassadorTrigger = () => {
    window.location.hash = "#/ambassador";
  };

  const handleLoginSuccess = async (email?: string) => {
    setIsAuthenticated(true);
    const sessionEmail = email || localStorage.getItem("advaltad_session_email");
    if (sessionEmail) {
      setIsCheckingApproval(true);
      const approved = await checkApprovalStatus(sessionEmail);
      setIsApproved(approved);
      setIsCheckingApproval(false);
    }
  };

  const handleRecheckApproval = async () => {
    const sessionEmail = localStorage.getItem("advaltad_session_email");
    if (sessionEmail) {
      setIsCheckingApproval(true);
      const approved = await checkApprovalStatus(sessionEmail);
      setIsApproved(approved);
      setIsCheckingApproval(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error("Supabase Auth signOut failed:", error);
          throw error;
        }
      }
    } catch (err: any) {
      console.error("Error during Supabase sign out:", err);
    }

    // Clear any local user state & session state
    localStorage.removeItem("advaltad_session_email");
    localStorage.removeItem("advaltad_admin_session_email");
    setIsAuthenticated(false);
    
    // Redirect the user to the homepage: /
    window.location.href = "/";
  };

  const lowercaseRoute = route.toLowerCase();
  const isDashboardView = lowercaseRoute.includes("growth-ambassadors") || lowercaseRoute.includes("ambassador/dashboard");
  const isAdminView = lowercaseRoute.includes("admin");
  const isAdminAuthenticated = !!localStorage.getItem("advaltad_admin_session_email");
  const hideHeaderFooter = (isDashboardView && isAuthenticated) || isAdminView;

  const renderContent = () => {
    const lowercaseRoute = route.toLowerCase();
    const pathname = window.location.pathname.toLowerCase();
    const rawHash = (window.location.hash || "").toLowerCase();
    const search = window.location.search.toLowerCase();

    const isResetPasswordFlow =
      isPasswordRecovery ||
      lowercaseRoute.includes("reset-password") ||
      pathname.includes("reset-password") ||
      rawHash.includes("reset-password") ||
      rawHash.includes("type=recovery") ||
      search.includes("type=recovery");

    if (isResetPasswordFlow) {
      return (
        <ResetPasswordPage
          onComplete={() => {
            setIsPasswordRecovery(false);
            window.location.hash = "#/ambassador";
          }}
        />
      );
    }

    if (isAdminView) {
      return (
        <AnimatePresence mode="wait">
          <motion.div
            key="admin-flow-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full"
          >
            <AdminPortal onLogout={handleLogout} />
          </motion.div>
        </AnimatePresence>
      );
    }

    if (isDashboardView) {
      return (
        <AnimatePresence mode="wait">
          {!isAuthenticated ? (
            <motion.div
              key="login-subview"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <AmbassadorLogin onLoginSuccess={handleLoginSuccess} />
            </motion.div>
          ) : isCheckingApproval ? (
            <motion.div
              key="checking-approval-subview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 font-sans"
            >
              <div className="w-12 h-12 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin mb-4" />
              <p className="text-sm font-bold text-slate-300 animate-pulse">Verifying Account Approval Status...</p>
            </motion.div>
          ) : isApproved === false ? (
            <motion.div
              key="pending-approval-subview"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans"
            >
              {/* Background ambient glow */}
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />

              <div className="w-full max-w-lg bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl z-10 text-center space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-inner">
                  <Clock className="w-8 h-8 animate-pulse" />
                </div>

                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold font-mono uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span>Awaiting Admin Approval</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    Application Pending Approval
                  </h2>
                  <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                    Your Growth Ambassador application is currently registered and under executive review. Access to the Ambassador Dashboard remains blocked until an admin approves your record.
                  </p>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 text-left space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 text-[11px] font-mono font-bold uppercase text-slate-400">
                    <span>Account Session</span>
                    <span className="text-amber-400">Pending Review</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-mono block">Registered Email</span>
                    <span className="font-bold text-slate-200 truncate block">
                      {localStorage.getItem("advaltad_session_email") || "Ambassador User"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    onClick={handleRecheckApproval}
                    type="button"
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/20"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Check Again</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    type="button"
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-700"
                  >
                    <LogOut className="w-4 h-4 text-rose-400" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="dashboard-subview"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
            >
              <ErrorBoundary>
                <AmbassadorDashboard onLogout={handleLogout} />
              </ErrorBoundary>
            </motion.div>
          )}
        </AnimatePresence>
      );
    }

    if (lowercaseRoute.includes("about") || lowercaseRoute.includes("mission") || lowercaseRoute.includes("leadership") || lowercaseRoute.includes("values")) {
      return <AboutPage />;
    }

    if (lowercaseRoute.includes("programs")) {
      return <ProgramsPage />;
    }

    if (lowercaseRoute.includes("story") || lowercaseRoute.includes("stories") || lowercaseRoute.includes("annual-reports")) {
      return <StoriesPage />;
    }

    if (lowercaseRoute.includes("media") || lowercaseRoute.includes("gallery") || lowercaseRoute.includes("videos") || lowercaseRoute.includes("press")) {
      return <MediaPage />;
    }

    if (lowercaseRoute.includes("donate")) {
      return <DonatePage />;
    }

    if (lowercaseRoute.includes("ambassador") || lowercaseRoute.includes("partner")) {
      return <AmbassadorPage />;
    }

    // Default to Home page content
    return (
      <HomePage
        onNavigate={(targetHash) => {
          window.location.hash = targetHash;
        }}
        onDonateClick={handleDonateTrigger}
        onAmbassadorClick={handleAmbassadorTrigger}
      />
    );
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 selection:bg-emerald-600 selection:text-white font-sans overflow-x-hidden antialiased scroll-smooth">
      
      {/* MegaMenu is hidden only when Ambassador signs in on Dashboard */}
      {!hideHeaderFooter && (
        <MegaMenu
          onDonateClick={handleDonateTrigger}
          onAmbassadorClick={handleAmbassadorTrigger}
        />
      )}

      {/* Main Container of App Pages */}
      <main className="flex-1">
        {renderContent()}
      </main>

      {/* Footer is hidden only when Ambassador signs in on Dashboard */}
      {!hideHeaderFooter && (
        <Footer
          onDonateClick={handleDonateTrigger}
          onAmbassadorClick={handleAmbassadorTrigger}
        />
      )}

    </div>
  );
}
