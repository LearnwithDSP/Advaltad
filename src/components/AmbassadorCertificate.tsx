import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Icon } from "./Icon";
import { db, DbAmbassador } from "../lib/supabase";
import logoUrl from "../assets/images/Advaltad Logo.jpeg";

export interface AmbassadorCertificateProps {
  profile?: DbAmbassador | null;
  isLoading?: boolean;
  onProfileUpdated?: () => void;
  showToast?: (type: "success" | "error" | "info", title: string, message: string) => void;
}

/**
 * Robust helper to resolve an Ambassador's actual full name from profile, session, or local storage.
 */
export const getAmbassadorDisplayName = (
  profile?: DbAmbassador | null,
  overrideName?: string
): string => {
  if (overrideName && overrideName.trim() && overrideName.trim() !== "Valued Ambassador") {
    return overrideName.trim();
  }

  // 1. Direct profile properties
  const pName = (profile?.name || "").trim();
  if (pName && pName !== "Valued Ambassador") return pName;

  const profName = (profile?.professional_name || "").trim();
  if (profName && profName !== "Valued Ambassador") return profName;

  const fullName = ((profile as any)?.full_name || "").trim();
  if (fullName && fullName !== "Valued Ambassador") return fullName;

  const ambName = ((profile as any)?.ambassador_name || "").trim();
  if (ambName && ambName !== "Valued Ambassador") return ambName;

  const first = ((profile as any)?.first_name || "").trim();
  const last = ((profile as any)?.last_name || "").trim();
  if (first || last) {
    const combined = `${first} ${last}`.trim();
    if (combined && combined !== "Valued Ambassador") return combined;
  }

  // 2. Stored session cache in localStorage
  if (typeof window !== "undefined") {
    const sessionName =
      localStorage.getItem("advaltad_session_name") ||
      localStorage.getItem("advaltad_ambassador_name");
    if (sessionName && sessionName.trim() && sessionName !== "Valued Ambassador") {
      return sessionName.trim();
    }

    const activeEmail = profile?.email || localStorage.getItem("advaltad_session_email");
    const activeId = profile?.id || profile?.user_id;

    const localDbStr = localStorage.getItem("advaltad_ambassadors_db");
    if (localDbStr) {
      try {
        const localList = JSON.parse(localDbStr);
        if (Array.isArray(localList)) {
          const match = localList.find(
            (a: any) =>
              (activeEmail && a.email && a.email.toLowerCase() === activeEmail.toLowerCase()) ||
              (activeId && (a.id === activeId || a.user_id === activeId))
          );
          if (match) {
            const mName = (match.name || match.professional_name || match.full_name || "").trim();
            if (mName && mName !== "Valued Ambassador") return mName;
          }
        }
      } catch (_) {}
    }

    // 3. Fallback: Parse name cleanly from active email
    if (activeEmail) {
      const prefix = activeEmail.split("@")[0] || "";
      const cleanWords = prefix
        .replace(/[0-9_.-]+/g, " ")
        .trim()
        .split(" ")
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

      if (cleanWords.length >= 1 && cleanWords.join(" ").length >= 2) {
        return cleanWords.join(" ");
      }
    }
  }

  return profile?.name || "Ambassador Member";
};

export const getAmbassadorDisplayRegion = (profile?: DbAmbassador | null): string => {
  return (
    profile?.city ||
    profile?.base_city ||
    (profile?.country ? `${profile?.city || "Lagos"}, ${profile.country}` : "Lagos, Nigeria")
  );
};

export const getAmbassadorDisplayField = (profile?: DbAmbassador | null): string => {
  return (
    profile?.field ||
    profile?.focus_interest ||
    "Youth Technology & Grassroots Empowerment"
  );
};

/**
 * AmbassadorCertificate (A4 Landscape, Minimalist Forest Green & Crisp White)
 * 
 * Complies strictly with all architectural requirements:
 * 1. Zero crypto wallet IDs, blockchain hashes, or token strings.
 * 2. Strict A4 Landscape ratio (1.414:1) with dedicated @media print rules.
 * 3. Minimalist brand identity in Advaltad Forest Green (#0A5C36) & Crisp White (#FFFFFF)
 *    with fine geometric hairline insets and elegant corner brackets.
 * 4. Advaltad logo placed cleanly at top center flanked by refined typography.
 * 5. Full official content retained: Foundation Name, Motto, Certificate of Recognition,
 *    Serif Display Recipient Name, Certified Pan-African Ambassador title, Mission Citation,
 *    Issuance Date, verified minimalist green/white seal, and Directorate signatures.
 */
export const AmbassadorCertificate: React.FC<AmbassadorCertificateProps> = ({
  profile,
  isLoading = false,
  onProfileUpdated,
  showToast
}) => {
  const dynamicAmbassadorName = getAmbassadorDisplayName(profile);
  const dynamicRegion = getAmbassadorDisplayRegion(profile);
  const dynamicField = getAmbassadorDisplayField(profile);

  const formattedDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
      })
    : new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
      });

  // Clean institutional registry serial (zero crypto/hash tokens)
  const registrySerial = profile?.created_at
    ? `AGSF-${new Date(profile.created_at).getFullYear()}-${String(
        (profile.id || "1000").replace(/[^a-zA-Z0-9]/g, "").slice(-6)
      ).toUpperCase()}`
    : "AGSF-2026-PA7842";

  // Editing modal states
  const [certFormOpen, setCertFormOpen] = useState(false);
  const [tempName, setTempName] = useState(dynamicAmbassadorName);
  const [tempRegion, setTempRegion] = useState(dynamicRegion);
  const [tempField, setTempField] = useState(dynamicField);
  const [downloadingCert, setDownloadingCert] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state whenever profile updates
  useEffect(() => {
    if (profile) {
      setTempName(getAmbassadorDisplayName(profile));
      setTempRegion(getAmbassadorDisplayRegion(profile));
      setTempField(getAmbassadorDisplayField(profile));
    }
  }, [profile]);

  const handleOpenEditModal = () => {
    setTempName(getAmbassadorDisplayName(profile, tempName));
    setTempRegion(dynamicRegion);
    setTempField(dynamicField);
    setCertFormOpen(true);
  };

  const handleCertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempName.trim()) {
      showToast?.("error", "Validation Error", "Ambassador name cannot be empty.");
      return;
    }

    setIsSaving(true);
    const cleanedName = tempName.trim();
    if (typeof window !== "undefined") {
      localStorage.setItem("advaltad_session_name", cleanedName);
    }

    if (profile?.id) {
      try {
        await db.updateProfile(profile.id, {
          name: cleanedName,
          city: tempRegion.trim(),
          field: tempField.trim()
        });

        await db.logActivity({
          ambassador_id: profile.id,
          ambassador_name: cleanedName,
          type: "profile_update",
          desc: `Updated fellowship certificate: name to "${cleanedName}", division to "${tempField.trim()}"`
        });

        showToast?.("success", "Certificate Updated", "Fellowship certificate records were updated successfully.");
        onProfileUpdated?.();
      } catch (err: any) {
        console.error("Failed to sync certificate update:", err);
        showToast?.("error", "Update Failed", err?.message || "Could not save credential updates.");
      } finally {
        setIsSaving(false);
        setCertFormOpen(false);
      }
    } else {
      setIsSaving(false);
      setCertFormOpen(false);
      showToast?.("info", "Preview Mode", "Certificate preview refreshed in current session.");
      onProfileUpdated?.();
    }
  };

  const handlePrintCertificate = () => {
    setDownloadingCert(true);
    setTimeout(() => {
      setDownloadingCert(false);
      window.print();
    }, 350);
  };

  const ambassadorName = getAmbassadorDisplayName(profile, tempName);
  const ambassadorRegion = tempRegion || dynamicRegion;
  const ambassadorField = tempField || dynamicField;

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-left">
      {/* Print CSS Rules specifically targeting A4 Landscape (1.414:1) */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 0;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #FFFFFF !important;
            color: #1E293B !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Hide all application chrome, sidebars, headers, and modals */
          body * {
            visibility: hidden;
          }
          /* Reveal solely the certificate canvas */
          #printable-ambassador-certificate,
          #printable-ambassador-certificate * {
            visibility: visible;
          }
          #printable-ambassador-certificate {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            max-width: none !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            background: #FFFFFF !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
          }
          .no-print-control {
            display: none !important;
          }
        }
      `}</style>

      {/* Screen Control Header */}
      <div className="no-print-control flex items-center justify-between flex-wrap gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0A5C36]" />
            <h2 className="text-base font-black text-white tracking-wide uppercase font-display">
              Official Fellowship Certificate
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Strict A4 Landscape format • Optimized for crisp PDF print and institutional archival
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenEditModal}
            type="button"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Icon name="Edit3" size={14} />
            <span>Edit Certificate Details</span>
          </button>

          <button
            onClick={handlePrintCertificate}
            type="button"
            disabled={downloadingCert}
            className="px-4 py-2 rounded-xl bg-[#0A5C36] hover:bg-[#08482A] text-white font-bold text-xs transition-colors shadow-lg shadow-emerald-950/40 flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <Icon
              name={downloadingCert ? "Loader2" : "Download"}
              size={14}
              className={downloadingCert ? "animate-spin" : ""}
            />
            <span>{downloadingCert ? "Preparing PDF..." : "Download / Print PDF"}</span>
          </button>
        </div>
      </div>

      {/* Certificate Frame Container (Wraps canvas with scroll safety on mobile) */}
      <div className="overflow-x-auto pb-4">
        <div className="min-w-[780px]">
          {/* Certificate Canvas: Strict A4 Landscape 1.414:1 ratio */}
          <div
            id="printable-ambassador-certificate"
            className="w-full bg-white text-slate-900 shadow-2xl relative select-none rounded-xl overflow-hidden"
            style={{
              aspectRatio: "1.4142 / 1"
            }}
          >
            {/* Outer Inset Padding Container */}
            <div className="w-full h-full p-6 sm:p-8 md:p-10 flex flex-col justify-between relative bg-white">
              
              {/* Geometric Hairline Inset Border Frame */}
              <div className="absolute inset-4 sm:inset-6 md:inset-7 border-[1.5px] border-[#0A5C36] pointer-events-none" />
              <div className="absolute inset-5 sm:inset-7 md:inset-8.5 border border-[#0A5C36]/35 pointer-events-none" />
              
              {/* Elegant Geometric Corner Brackets */}
              {/* Top-Left Bracket */}
              <div className="absolute top-3 sm:top-5 md:top-6 left-3 sm:left-5 md:left-6 w-7 h-7 sm:w-9 sm:h-9 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-[2.5px] bg-[#0A5C36]" />
                <div className="absolute top-0 left-0 h-full w-[2.5px] bg-[#0A5C36]" />
                <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 bg-[#0A5C36]" />
              </div>

              {/* Top-Right Bracket */}
              <div className="absolute top-3 sm:top-5 md:top-6 right-3 sm:right-5 md:right-6 w-7 h-7 sm:w-9 sm:h-9 pointer-events-none">
                <div className="absolute top-0 right-0 w-full h-[2.5px] bg-[#0A5C36]" />
                <div className="absolute top-0 right-0 h-full w-[2.5px] bg-[#0A5C36]" />
                <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#0A5C36]" />
              </div>

              {/* Bottom-Left Bracket */}
              <div className="absolute bottom-3 sm:bottom-5 md:bottom-6 left-3 sm:left-5 md:left-6 w-7 h-7 sm:w-9 sm:h-9 pointer-events-none">
                <div className="absolute bottom-0 left-0 w-full h-[2.5px] bg-[#0A5C36]" />
                <div className="absolute bottom-0 left-0 h-full w-[2.5px] bg-[#0A5C36]" />
                <div className="absolute bottom-1.5 left-1.5 w-1.5 h-1.5 bg-[#0A5C36]" />
              </div>

              {/* Bottom-Right Bracket */}
              <div className="absolute bottom-3 sm:bottom-5 md:bottom-6 right-3 sm:right-5 md:right-6 w-7 h-7 sm:w-9 sm:h-9 pointer-events-none">
                <div className="absolute bottom-0 right-0 w-full h-[2.5px] bg-[#0A5C36]" />
                <div className="absolute bottom-0 right-0 h-full w-[2.5px] bg-[#0A5C36]" />
                <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 bg-[#0A5C36]" />
              </div>

              {/* Top Header Section: Clean Logo Centered with Refined Typography */}
              <div className="relative z-10 text-center flex flex-col items-center pt-2 sm:pt-3">
                {/* Emblem Logo */}
                <div className="relative mb-2">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full p-1 bg-white border border-[#0A5C36]/30 shadow-sm flex items-center justify-center">
                    <img
                      src={logoUrl}
                      alt="Advaltad Growth and Support Foundation"
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                </div>

                {/* Institution Name & Flanked Typography */}
                <div className="space-y-0.5 max-w-2xl mx-auto">
                  <p className="text-[10px] sm:text-[11px] md:text-xs font-black tracking-[0.28em] text-[#0A5C36] uppercase font-sans">
                    ADVALTAD GROWTH AND SUPPORT FOUNDATION
                  </p>
                  <p className="text-[9px] sm:text-[10px] md:text-[11px] text-slate-600 italic font-serif tracking-wide">
                    &ldquo;Adding Value to African Development&rdquo;
                  </p>
                </div>

                {/* Subtle Divider Hairline */}
                <div className="flex items-center justify-center gap-3 w-48 sm:w-64 mx-auto my-2 sm:my-3">
                  <span className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#0A5C36]/50" />
                  <span className="w-1.5 h-1.5 rotate-45 bg-[#0A5C36]" />
                  <span className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[#0A5C36]/50" />
                </div>

                {/* Certificate Title */}
                <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold tracking-wider text-[#0A5C36] uppercase mt-0.5">
                  Certificate of Recognition
                </h1>
                <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-slate-500 font-sans font-semibold mt-0.5">
                  This is proudly presented to
                </p>
              </div>

              {/* Center Body Section: Recipient Ambassador Name & Role */}
              <div className="relative z-10 text-center space-y-2 sm:space-y-3 px-6 sm:px-14">
                {/* Ambassador Name: Large, Elegant Serif Display */}
                <div className="py-1">
                  <h2
                    id="certificate-ambassador-name"
                    className="text-2xl sm:text-4xl md:text-5xl font-serif font-bold text-[#0A5C36] tracking-tight leading-tight"
                    style={{
                      fontFamily: '"Cormorant Garamond", Georgia, "Times New Roman", serif'
                    }}
                  >
                    {ambassadorName}
                  </h2>
                  <div className="w-40 sm:w-56 h-[1.5px] bg-[#0A5C36]/60 mx-auto mt-2" />
                </div>

                {/* Role Title */}
                <div>
                  <span className="inline-block px-4 py-1 rounded-sm bg-[#0A5C36]/10 text-[#0A5C36] font-sans font-bold text-xs sm:text-sm uppercase tracking-[0.16em]">
                    Certified Pan-African Ambassador
                  </span>
                </div>

                {/* Mission Citation Text */}
                <p className="text-[10px] sm:text-xs md:text-[13px] text-slate-700 font-serif leading-relaxed max-w-2xl mx-auto italic px-4">
                  In recognition of meritorious commitment, exemplary civic leadership, and transformative dedication
                  to advancing grassroots community empowerment, socio-economic progress, and sustainable youth development
                  across the African continent. Commissioned to the{" "}
                  <strong className="text-[#0A5C36] font-semibold not-italic">{ambassadorRegion}</strong> Division within the{" "}
                  <strong className="text-[#0A5C36] font-semibold not-italic">{ambassadorField}</strong> Directorate.
                </p>
              </div>

              {/* Bottom Signatures & Seal Section */}
              <div className="relative z-10 grid grid-cols-3 items-end px-4 sm:px-10 pb-2 sm:pb-3 pt-2">
                
                {/* Left Column: Executive Signatory */}
                <div className="text-left space-y-1">
                  <div className="h-9 sm:h-11 flex items-end border-b border-[#0A5C36]/40 pb-1">
                    <span
                      className="font-serif italic text-sm sm:text-base md:text-lg text-slate-800"
                      style={{
                        fontFamily: '"Cormorant Garamond", Georgia, serif'
                      }}
                    >
                      Kushimo Rasheed Olalekan
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs font-bold text-[#0A5C36] uppercase tracking-wider font-sans">
                    Executive Chairman
                  </p>
                  <p className="text-[8px] sm:text-[9px] text-slate-500 font-sans">
                    Advaltad Growth and Support Foundation
                  </p>
                </div>

                {/* Center Column: Minimalist Verified Green & White Seal */}
                <div className="flex flex-col items-center justify-center">
                  <div className="relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28">
                    {/* Outer Concentric Hairline Ring */}
                    <div className="absolute inset-0 rounded-full border border-[#0A5C36]/30" />
                    <div className="absolute inset-1.5 rounded-full border-[1.5px] border-[#0A5C36]" />
                    <div className="absolute inset-3 rounded-full border border-dashed border-[#0A5C36]/50" />
                    
                    {/* Inner White Seal Body */}
                    <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-18 md:h-18 rounded-full bg-white flex flex-col items-center justify-center text-center p-1 relative z-10 shadow-sm border border-[#0A5C36]/40">
                      <Icon name="ShieldCheck" size={18} className="text-[#0A5C36] stroke-[1.8]" />
                      <span className="text-[6.5px] sm:text-[7.5px] md:text-[8px] font-black uppercase tracking-wider text-[#0A5C36] leading-none mt-1">
                        VERIFIED
                      </span>
                      <span className="text-[5px] sm:text-[6px] text-slate-500 uppercase tracking-widest leading-none mt-0.5">
                        FOUNDATION
                      </span>
                    </div>
                  </div>
                  <span className="text-[7.5px] sm:text-[8.5px] text-slate-500 uppercase tracking-[0.18em] font-sans font-semibold mt-1">
                    Official Foundation Seal
                  </span>
                </div>

                {/* Right Column: Directorate of Global Programs Signatory */}
                <div className="text-right space-y-1">
                  <div className="h-9 sm:h-11 flex items-end justify-end border-b border-[#0A5C36]/40 pb-1">
                    <span
                      className="font-serif italic text-sm sm:text-base md:text-lg text-slate-800"
                      style={{
                        fontFamily: '"Cormorant Garamond", Georgia, serif'
                      }}
                    >
                      Directorate of Global Programs
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs font-bold text-[#0A5C36] uppercase tracking-wider font-sans">
                    Directorate of Global Programs
                  </p>
                  <p className="text-[8px] sm:text-[9px] text-slate-500 font-sans">
                    Date of Commission: {formattedDate}
                  </p>
                </div>
              </div>

              {/* Bottom Hairline Footer Bar with Registry Serial */}
              <div className="relative z-10 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[8px] sm:text-[9px] text-slate-500 font-sans px-2">
                <span>Pan-African Youth Leadership Accreditation</span>
                <span className="font-mono text-slate-600 tracking-wider font-semibold">
                  Registry: {registrySerial}
                </span>
                <span>Advaltad Foundation Secretariat</span>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Edit Certificate Modal Dialog */}
      <AnimatePresence>
        {certFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-md w-full space-y-4 shadow-2xl text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0A5C36]" />
                  <span>Edit Certificate Details</span>
                </h3>
                <button
                  onClick={() => setCertFormOpen(false)}
                  type="button"
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <Icon name="X" size={16} />
                </button>
              </div>

              <form onSubmit={handleCertSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Recipient Ambassador Name
                  </label>
                  <input
                    type="text"
                    required
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    placeholder="e.g. Adebayo Ogunlesi"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0A5C36]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Regional Hub / City
                  </label>
                  <input
                    type="text"
                    required
                    value={tempRegion}
                    onChange={(e) => setTempRegion(e.target.value)}
                    placeholder="e.g. Lagos, Nigeria"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0A5C36]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Focus Directorate / Field
                  </label>
                  <input
                    type="text"
                    required
                    value={tempField}
                    onChange={(e) => setTempField(e.target.value)}
                    placeholder="e.g. Youth Empowerment & Technology"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0A5C36]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => setCertFormOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 rounded-xl bg-[#0A5C36] hover:bg-[#08482A] text-white text-xs font-bold cursor-pointer transition-colors shadow-md disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save Certificate Details"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AmbassadorCertificate;
