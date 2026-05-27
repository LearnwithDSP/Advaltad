import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { NAVIGATION_DATA } from "../data";
import { Icon } from "./Icon";

interface MegaMenuProps {
  onDonateClick: () => void;
  onAmbassadorClick: () => void;
}

export const MegaMenu: React.FC<MegaMenuProps> = ({ onDonateClick, onAmbassadorClick }) => {
  const [scrolled, setScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileExpandedSection, setMobileExpandedSection] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Monitor scroll height to trigger solid header transition
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNavClick = (href: string) => {
    setActiveDropdown(null);
    setMobileMenuOpen(false);

    // Smooth scroll to section
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleMobileSectionToggle = (key: string) => {
    setMobileExpandedSection(mobileExpandedSection === key ? null : key);
  };

  return (
    <header
      id="main-header"
      className="fixed top-0 left-0 w-full z-50 transition-all duration-300 bg-white shadow-md border-b border-gray-200/80 py-3.5"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          
          {/* Logo Brand Accent */}
          <a
            id="brand-logo"
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              handleNavClick("#home");
            }}
            className="flex items-center gap-3 group focus:outline-none"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform duration-300">
              <span className="text-white block leading-none font-serif">A</span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-950 font-sans font-bold leading-tight tracking-tight text-lg group-hover:text-emerald-700 transition-colors duration-300">
                Advaltad
              </span>
              <span className="text-xs text-emerald-600 font-sans tracking-widest uppercase font-semibold">
                Foundation
              </span>
            </div>
          </a>

          {/* Desktop Navigation */}
          <nav id="desktop-nav" className="hidden lg:flex items-center space-x-1" ref={dropdownRef}>
            {Object.entries(NAVIGATION_DATA).map(([key, value]) => {
              const isActiveDropdown = activeDropdown === key;
              return (
                <div
                  key={key}
                  className="relative"
                  onMouseEnter={() => value.hasMega && setActiveDropdown(key)}
                  onMouseLeave={() => value.hasMega && setActiveDropdown(null)}
                >
                  <a
                    id={`nav-link-${key}`}
                    href={value.href}
                    onClick={(e) => {
                      if (value.hasMega) {
                        e.preventDefault();
                        setActiveDropdown(activeDropdown === key ? null : key);
                      } else {
                        e.preventDefault();
                        handleNavClick(value.href);
                      }
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium tracking-tight flex items-center gap-1 transition-all duration-200 ${
                      isActiveDropdown
                        ? "text-emerald-700 bg-emerald-50/50"
                        : "text-gray-700 hover:text-emerald-700 hover:bg-gray-50/50"
                    }`}
                  >
                    {value.label}
                    {value.hasMega && (
                      <Icon
                        name="ChevronDown"
                        size={14}
                        className={`transition-transform duration-300 ${isActiveDropdown ? "rotate-180 text-emerald-600" : ""}`}
                      />
                    )}
                  </a>

                  {/* Mega Menu Dropdown */}
                  <AnimatePresence>
                    {value.hasMega && isActiveDropdown && (
                      <motion.div
                        id={`mega-dropdown-${key}`}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="absolute left-1/2 -translate-x-1/2 mt-2 w-[560px] bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 p-6"
                      >
                        <div className={`grid gap-6 ${value.columns && value.columns.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                          {value.columns?.map((col, cIdx) => (
                            <div key={cIdx} className="space-y-3">
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 px-3">
                                {col.title}
                              </h4>
                              <div className="space-y-1">
                                {col.items.map((item, iIdx) => (
                                  <a
                                    key={iIdx}
                                    href={item.href}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleNavClick(item.href);
                                    }}
                                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-emerald-50/50 group transition-all duration-200"
                                  >
                                    <div className="mt-0.5 p-2 rounded-lg bg-gray-50 text-gray-400 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-200">
                                      <Icon name={item.iconName || "Sparkles"} size={16} />
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-sm font-semibold text-gray-800 group-hover:text-emerald-700 transition-colors duration-200">
                                        {item.label}
                                      </p>
                                      {item.description && (
                                        <p className="text-xs text-gray-500 font-normal line-clamp-1 group-hover:text-emerald-800/70 transition-colors duration-200">
                                          {item.description}
                                        </p>
                                      )}
                                    </div>
                                  </a>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Extra branding strip in mega menu */}
                        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400 bg-gray-50/50 -mx-6 -mb-6 px-6 py-3">
                          <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                            Youth Empowerment focus active
                          </span>
                          <a
                            href="#about"
                            onClick={(e) => {
                              e.preventDefault();
                              handleNavClick("#about");
                            }}
                            className="hover:underline flex items-center gap-1 hover:text-emerald-700"
                          >
                            Explore Impact Story <Icon name="ArrowRight" size={12} />
                          </a>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </nav>

          {/* Action CTAs Desktop */}
          <div className="hidden lg:flex items-center gap-3">
            <button
              id="cta-become-ambassador"
              onClick={onAmbassadorClick}
              className="text-sm font-semibold text-gray-700 hover:text-emerald-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-all duration-200 cursor-pointer"
            >
              Become Ambassador
            </button>
            <button
              id="cta-header-donate"
              onClick={onDonateClick}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 shadow-md shadow-emerald-600/10 hover:shadow-emerald-600/20 hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2 cursor-pointer"
            >
              Support Our Mission
              <Icon name="ArrowRight" size={14} />
            </button>
          </div>

          {/* Hamburger trigger with standard touch size (min 44px) */}
          <div className="lg:hidden flex items-center">
            <button
              id="mobile-hamburger-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-3 mr-[-8px] text-gray-700 hover:text-emerald-700 focus:outline-none min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-50 transition-colors duration-200"
              aria-label="Toggle navigation menu"
            >
              <Icon name={mobileMenuOpen ? "X" : "Menu"} size={24} />
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              id="mobile-drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90] lg:hidden"
            />

            {/* Content panel */}
            <motion.div
              id="mobile-drawer-panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-[100] flex flex-col overflow-hidden lg:hidden"
            >
              {/* Header with touch ready elements */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold font-serif">
                    A
                  </div>
                  <span className="font-bold text-gray-950 font-sans tracking-tight">Advaltad</span>
                </div>
                <button
                  id="mobile-drawer-close-btn"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <Icon name="X" size={20} />
                </button>
              </div>

              {/* Scrollable menu content */}
              <div id="mobile-drawer-scroll" className="flex-1 overflow-y-auto px-6 py-4 pb-20 space-y-4">
                {Object.entries(NAVIGATION_DATA).map(([key, value]) => {
                  const isExpanded = mobileExpandedSection === key;
                  return (
                    <div key={key} className="border-b border-gray-100/70 pb-3">
                      {value.hasMega ? (
                        <div>
                          <button
                            id={`mobile-nav-toggle-${key}`}
                            onClick={() => handleMobileSectionToggle(key)}
                            className="flex items-center justify-between w-full py-2 text-left font-semibold text-gray-800 hover:text-emerald-700 min-h-[44px]"
                          >
                            <span>{value.label}</span>
                            <Icon
                              name={isExpanded ? "ChevronUp" : "ChevronDown"}
                              size={18}
                              className={isExpanded ? "text-emerald-600" : "text-gray-400"}
                            />
                          </button>
                          
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                id={`mobile-drawer-nested-${key}`}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="pl-3 mt-1 space-y-2 overflow-hidden"
                              >
                                {value.columns?.map((col, cIdx) => (
                                  <div key={cIdx} className="space-y-1 py-1">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-2 pt-1">
                                      {col.title}
                                    </div>
                                    {col.items.map((item, iIdx) => (
                                      <a
                                        key={iIdx}
                                        href={item.href}
                                        onClick={(e) => {
                                          e.preventDefault();
                                          handleNavClick(item.href);
                                        }}
                                        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 text-gray-600 hover:text-emerald-700 transition-all min-h-[44px]"
                                      >
                                        <div className="p-1.5 rounded bg-gray-100 text-gray-500">
                                          <Icon name={item.iconName || "Sparkles"} size={14} />
                                        </div>
                                        <div className="flex-1">
                                          <p className="text-sm font-semibold">{item.label}</p>
                                        </div>
                                      </a>
                                    ))}
                                  </div>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ) : (
                        <a
                          id={`mobile-nav-link-${key}`}
                          href={value.href}
                          onClick={(e) => {
                            e.preventDefault();
                            handleNavClick(value.href);
                          }}
                          className="flex items-center justify-between w-full py-2 font-semibold text-gray-800 hover:text-emerald-700 min-h-[44px]"
                        >
                          <span>{value.label}</span>
                          <Icon name="ChevronRight" size={16} className="text-gray-400" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom Fixed Action CTAs inside mobile drawer */}
              <div className="p-6 border-t border-gray-100 bg-gray-50 space-y-3">
                <button
                  id="mobile-cta-donate"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onDonateClick();
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 text-white font-semibold text-center hover:bg-emerald-700 shadow-md shadow-emerald-600/10 cursor-pointer text-sm"
                >
                  Support Our Mission
                </button>
                <button
                  id="mobile-cta-ambassador"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onAmbassadorClick();
                  }}
                  className="w-full py-3 px-4 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold text-center hover:bg-gray-50 cursor-pointer text-sm"
                >
                  Become a Growth Ambassador
                </button>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
};
