/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MegaMenu } from "./components/MegaMenu";
import { Footer } from "./components/Footer";
import { AmbassadorLogin } from "./components/AmbassadorLogin";
import { AmbassadorDashboard } from "./components/AmbassadorDashboard";
import { AdminPortal } from "./components/AdminPortal";
import { isSupabaseConfigured, supabase } from "./lib/supabase";

// Import new modular independent page components
import { HomePage } from "./pages/HomePage";
import { AboutPage } from "./pages/AboutPage";
import { ProgramsPage } from "./pages/ProgramsPage";
import { StoriesPage } from "./pages/StoriesPage";
import { MediaPage } from "./pages/MediaPage";
import { DonatePage } from "./pages/DonatePage";
import { AmbassadorPage } from "./pages/AmbassadorPage";

export default function App() {
  const [route, setRoute] = useState<string>("#home");
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem("advaltad_session_email");
  });

  useEffect(() => {
    const checkRoute = () => {
      const hash = window.location.hash || "#home";
      
      // Pull down the old growth-ambassador page and redirect to ambassador
      if (hash.toLowerCase().includes("growth-ambassador")) {
        window.location.hash = "#/ambassador";
        return;
      }
      
      setRoute(hash);

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
  }, []);

  const handleDonateTrigger = () => {
    window.location.hash = "#/donate";
  };

  const handleAmbassadorTrigger = () => {
    window.location.hash = "#/ambassador";
  };

  const handleLoginSuccess = (name: string, region: string) => {
    setIsAuthenticated(true);
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
  const hideHeaderFooter = (isDashboardView && isAuthenticated) || (isAdminView && isAdminAuthenticated);

  const renderContent = () => {
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
          ) : (
            <motion.div
              key="dashboard-subview"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
            >
              <AmbassadorDashboard onLogout={handleLogout} />
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
