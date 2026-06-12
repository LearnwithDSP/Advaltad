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

    let path = href;
    if (href.startsWith("#")) {
      const anchor = href.slice(1);
      if (anchor === "home") {
        path = "#/home";
      } else if (anchor.includes("about") || anchor.includes("mission") || anchor.includes("leadership") || anchor.includes("values")) {
        path = "#/about";
      } else if (anchor.includes("programs")) {
        path = "#/programs";
      } else if (anchor.includes("story") || anchor.includes("annual-reports")) {
        path = "#/story";
      } else if (anchor.includes("gallery") || anchor.includes("videos") || anchor.includes("press") || anchor.includes("media")) {
        path = "#/media";
      } else if (anchor.includes("donate")) {
        path = "#/donate";
      } else if (anchor.includes("ambassador") || anchor.includes("partner")) {
        path = "#/ambassador";
      }
    }

    window.location.hash = path;
  };

  const handleMobileSectionToggle = (key: string) => {
    setMobileExpandedSection(mobileExpandedSection === key ? null : key);
  };

  return (
    <header
      id="main-header"
      className="fixed top-0 left-0 w-full z-50 transition-all duration-300 bg-white border-b border-slate-100 py-4.5"
    >
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between">
          
          {/* Brand Logo */}
          <a
            id="brand-logo"
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              handleNavClick("#home");
            }}
            className="flex items-center gap-3 group focus:outline-none"
          >
            <div className="w-9 h-9 rounded-xl bg-brand-primary flex items-center justify-center text-white font-display font-black shadow-md shadow-brand-primary/10 group-hover:scale-105 transition-transform duration-300">
              <span className="text-white block leading-none">A</span>
            </div>
            <div className="flex flex-col">
              <span className="text-brand-charcoal font-display font-black leading-tight tracking-tight text-base group-hover:text-brand-primary transition-colors duration-300">
                Advaltad
              </span>
              <span className="text-[10px] text-brand-primary font-display tracking-widest uppercase font-extrabold leading-none">
                Foundation
              </span>
            </div>
          </a>

          {/* Desktop Navigation */}
          <nav id="desktop-nav" className="hidden lg:flex items-center space-x-0.5 xl:space-x-1.5" ref={dropdownRef}>
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
                    className={`px-2.5 py-2 rounded-lg text-[10.5px] tracking-wider uppercase font-display font-bold flex items-center gap-1 whitespace-nowrap transition-all duration-200 ${
                      isActiveDropdown
                        ? "text-brand-primary bg-brand-secondary/40"
                        : "text-slate-500 hover:text-brand-primary hover:bg-slate-50"
                    }`}
                  >
                    {value.label}
                    {value.hasMega && (
                      <Icon
                        name="ChevronDown"
                        size={12}
                        className={`transition-transform duration-300 ${isActiveDropdown ? "rotate-180 text-brand-primary" : ""}`}
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
                        className="absolute left-1/2 -translate-x-1/2 mt-2 w-[540px] bg-white rounded-3xl shadow-[0_15px_45px_rgba(0,0,0,0.06)] border border-slate-100 overflow-hidden z-50 p-6"
                      >
                        <div className={`grid gap-6 ${value.columns && value.columns.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                          {value.columns?.map((col, cIdx) => (
                            <div key={cIdx} className="space-y-3">
                              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 px-3">
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
                                    className="flex items-start gap-3.5 p-3 rounded-2xl hover:bg-brand-secondary/20 group transition-all duration-200"
                                  >
                                    <div className="mt-0.5 p-2 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-brand-primary group-hover:text-white transition-all duration-200">
                                      <Icon name={item.iconName || "Sparkles"} size={14} />
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-xs font-display font-bold text-brand-charcoal group-hover:text-brand-primary transition-colors">
                                        {item.label}
                                      </p>
                                      {item.description && (
                                        <p className="text-[11px] text-slate-500 font-normal line-clamp-1 group-hover:text-slate-600 transition-colors">
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
                        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 bg-slate-50/50 -mx-6 -mb-6 px-6 py-3">
                          <span className="flex items-center gap-1.5 text-brand-primary font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-ping"></span>
                            ACTIVE EMPOWERMENT METRICS
                          </span>
                          <a
                            href="#about"
                            onClick={(e) => {
                              e.preventDefault();
                              handleNavClick("#about");
                            }}
                            className="hover:underline flex items-center gap-1 hover:text-brand-primary font-bold"
                          >
                            About Us <Icon name="ArrowRight" size={12} />
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
          <div className="hidden lg:flex items-center gap-2.5 xl:gap-4">
            <button
              id="cta-become-ambassador"
              onClick={onAmbassadorClick}
              className="px-4.5 py-3 rounded-xl border border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white font-display font-bold text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer whitespace-nowrap"
            >
              Become Ambassador
            </button>
            <button
              id="cta-header-donate"
              onClick={onDonateClick}
              className="px-6 py-3 rounded-xl bg-brand-primary text-white font-display font-bold text-xs tracking-wider uppercase hover:bg-emerald-950 transition-all duration-200 cursor-pointer flex items-center gap-2"
            >
              Donate Now
              <Icon name="ArrowRight" size={12} />
            </button>
          </div>

          {/* Hamburger trigger with standard touch size (min 44px) */}
          <div className="lg:hidden flex items-center">
            <button
              id="mobile-hamburger-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-3 text-slate-700 hover:text-brand-primary min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-slate-50 transition-colors duration-200"
              aria-label="Toggle navigation menu"
            >
              <Icon name={mobileMenuOpen ? "X" : "Menu"} size={22} />
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              id="mobile-drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-brand-charcoal/40 backdrop-blur-sm z-[90] lg:hidden"
            />

            <motion.div
              id="mobile-drawer-panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-[100] flex flex-col overflow-hidden lg:hidden"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center text-white font-display font-black">
                    A
                  </div>
                  <span className="font-display font-black text-brand-charcoal">Advaltad</span>
                </div>
                <button
                  id="mobile-drawer-close-btn"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <Icon name="X" size={18} />
                </button>
              </div>

              {/* Scrollable drawer sections */}
              <div id="mobile-drawer-scroll" className="flex-1 overflow-y-auto px-6 py-4 pb-20 space-y-4">
                {Object.entries(NAVIGATION_DATA).map(([key, value]) => {
                  const isExpanded = mobileExpandedSection === key;
                  return (
                    <div key={key} className="border-b border-slate-100/70 pb-3">
                      {value.hasMega ? (
                        <div>
                          <button
                            id={`mobile-nav-toggle-${key}`}
                            onClick={() => handleMobileSectionToggle(key)}
                            className="flex items-center justify-between w-full py-2 text-left font-display font-bold text-slate-800 hover:text-brand-primary min-h-[44px]"
                          >
                            <span>{value.label}</span>
                            <Icon
                              name={isExpanded ? "ChevronUp" : "ChevronDown"}
                              size={16}
                              className={isExpanded ? "text-brand-primary" : "text-slate-400"}
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
                                    <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest pl-2 pt-1">
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
                                        className="flex items-center gap-3.5 p-2 rounded-xl hover:bg-slate-50 text-slate-600 hover:text-brand-primary transition-all min-h-[44px]"
                                      >
                                        <div className="p-1.5 rounded bg-slate-100 text-slate-500">
                                          <Icon name={item.iconName || "Sparkles"} size={12} />
                                        </div>
                                        <div className="flex-1">
                                          <p className="text-xs font-semibold">{item.label}</p>
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
                          className="flex items-center justify-between w-full py-2 font-display font-bold text-slate-800 hover:text-brand-primary min-h-[44px]"
                        >
                          <span>{value.label}</span>
                          <Icon name="ChevronRight" size={14} className="text-slate-400" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Drawer footer panel CTAs */}
              <div className="p-6 border-t border-slate-100 bg-slate-50 space-y-3">
                <button
                  id="mobile-cta-donate"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onDonateClick();
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-brand-primary text-white font-display font-bold text-center hover:bg-emerald-950 shadow-md shadow-brand-primary/10 cursor-pointer text-xs uppercase tracking-wider"
                >
                  Donate Now
                </button>
                <button
                  id="mobile-cta-ambassador"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onAmbassadorClick();
                  }}
                  className="w-full py-3 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 font-display font-bold text-center hover:bg-slate-50 cursor-pointer text-xs uppercase tracking-wider"
                >
                  Become a Partner
                </button>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
};
