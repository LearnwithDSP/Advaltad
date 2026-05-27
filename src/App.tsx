/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import { MegaMenu } from "./components/MegaMenu";
import { Hero } from "./components/Hero";
import { About } from "./components/About";
import { ImpactCards } from "./components/ImpactCards";
import { CtaStrip } from "./components/CtaStrip";
import { FeaturedStory } from "./components/FeaturedStory";
import { DonationPanel } from "./components/DonationPanel";
import { AmbassadorSection } from "./components/AmbassadorSection";
import { Footer } from "./components/Footer";

export default function App() {
  
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleDonateTrigger = () => {
    scrollToSection("donate");
  };

  const handleAmbassadorTrigger = () => {
    scrollToSection("ambassador");
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 selection:bg-emerald-600 selection:text-white font-sans overflow-x-hidden antialiased scroll-smooth">
      
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

    </div>
  );
}
