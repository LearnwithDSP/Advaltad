/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MegaMenu } from "./components/MegaMenu";
import { Hero } from "./components/Hero";
import { About } from "./components/About";
import { ImpactCards } from "./components/ImpactCards";
import { CtaStrip } from "./components/CtaStrip";
import { FeaturedStory } from "./components/FeaturedStory";
import { DonationPanel } from "./components/DonationPanel";
import { AmbassadorSection } from "./components/AmbassadorSection";
import { Footer } from "./components/Footer";
import { AmbassadorLogin } from "./components/AmbassadorLogin";
import { AmbassadorDashboard } from "./components/AmbassadorDashboard";

export default function App() {
  const [currentView, setCurrentView] = useState<"landing" | "growth-ambassadors">("landing");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkRoute = () => {
      const hash = window.location.hash;
      const path = window.location.pathname;
      if (path === "/growth-ambassadors" || hash.includes("growth-ambassadors")) {
        setCurrentView("growth-ambassadors");
      } else {
        setCurrentView("landing");
      }
    };

    // Check on startup
    checkRoute();

    // Monitor hash transitions and back history clicks
    window.addEventListener("hashchange", checkRoute);
    window.addEventListener("popstate", checkRoute);
    return () => {
      window.removeEventListener("hashchange", checkRoute);
      window.removeEventListener("popstate", checkRoute);
    };
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleDonateTrigger = () => {
    if (currentView !== "landing") {
      window.location.hash = "#donate";
      setTimeout(() => scrollToSection("donate"), 150);
    } else {
      scrollToSection("donate");
    }
  };

  const handleAmbassadorTrigger = () => {
    window.location.hash = "#/growth-ambassadors";
  };

  const handleLoginSuccess = (name: string, region: string) => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    window.location.hash = "#home";
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 selection:bg-emerald-600 selection:text-white font-sans overflow-x-hidden antialiased scroll-smooth">
      
      {currentView === "landing" ? (
        <>
          {/* Dynamic Header & Mega Menu Navigation system */}
          <MegaMenu
            onDonateClick={handleDonateTrigger}
            onAmbassadorClick={handleAmbassadorTrigger}
          />

          {/* Main Layout Content Blocks with unified entrance motion */}
          <main>
            {/* Cinematic Hero */}
            <Hero
              onDonateClick={handleDonateTrigger}
              onAmbassadorClick={handleAmbassadorTrigger}
            />

            {/* Narrative / Who We Are Section */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-120px" }}
              transition={{ duration: 0.6 }}
            >
              <About />
            </motion.div>

            {/* Dynamic Bento Highlights of key mission programs */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-120px" }}
              transition={{ duration: 0.6 }}
            >
              <ImpactCards />
            </motion.div>

            {/* Contrasting Action Splitter Segment */}
            <CtaStrip
              onDonateClick={handleDonateTrigger}
              onAmbassadorClick={handleAmbassadorTrigger}
            />

            {/* Storyboards from active communities */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-120px" }}
              transition={{ duration: 0.6 }}
            >
              <FeaturedStory />
            </motion.div>

            {/* Core trustworthy SSL integrated Donation Panels */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-120px" }}
              transition={{ duration: 0.6 }}
            >
              <DonationPanel />
            </motion.div>

            {/* Ambassador program details & certificate generator */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-120px" }}
              transition={{ duration: 0.6 }}
            >
              <AmbassadorSection />
            </motion.div>
          </main>

          {/* Modern responsive Footer */}
          <Footer />
        </>
      ) : (
        <>
          {/* Dynamic dashboard routing page banner bar */}
          <div className="fixed top-0 left-0 w-full bg-white border-b border-gray-200 py-3.5 px-6 shadow-sm flex items-center justify-between z-50">
            <a
              href="#home"
              onClick={(e) => {
                e.preventDefault();
                window.location.hash = "#home";
              }}
              className="flex items-center gap-2 group focus:outline-none"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center font-serif text-base">
                A
              </div>
              <div>
                <span className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">Advaltad</span>
                <span className="text-[10px] text-emerald-600 tracking-wider block leading-none font-bold uppercase font-sans">Back to Home page</span>
              </div>
            </a>
            
            <button
              onClick={() => {
                window.location.hash = "#home";
              }}
              className="px-4 py-1.5 rounded-xl border border-gray-200 text-xs font-bold hover:bg-gray-50 flex items-center gap-1 cursor-pointer transition-colors"
            >
              Back To Main Site
            </button>
          </div>

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
          
          <Footer />
        </>
      )}

    </div>
  );
}
