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
    const sessionName = localStorage.getItem("advaltad_session_name") || localStorage.getItem("advaltad_ambassador_name");
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
          const match = localList.find((a: any) =>
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
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
      
      if (cleanWords.length >= 1 && cleanWords.join(" ").length >= 2) {
        return cleanWords.join(" ");
      }
    }
  }

  return "Kushimo Rasheed Olalekan";
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

export const AmbassadorCertificate: React.FC<AmbassadorCertificateProps> = ({
  profile,
  isLoading = false,
  onProfileUpdated,
  showToast
}) => {
  const dynamicAmbassadorName = getAmbassadorDisplayName(profile);
  const dynamicRegion = getAmbassadorDisplayRegion(profile);
  const dynamicField = getAmbassadorDisplayField(profile);

  const formattedCommissionDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
      })
    : "May 27, 2026";

  // Local editing states
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

  // Sync temp values when opening the modal
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
          desc: `Updated fellowship certificate credentials: name to "${cleanedName}", division to "${tempField.trim()}"`
        });

        showToast?.("success", "Certificate Updated", "Fellowship credential badge was updated successfully.");
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
      showToast?.("info", "Preview Mode", "Badge preview refreshed in current session.");
      onProfileUpdated?.();
    }
  };

  const handlePrintCertificate = () => {
    setDownloadingCert(true);
    setTimeout(() => {
      setDownloadingCert(false);
      window.print();
    }, 600);
  };

  // Strictly bound ambassadorName for display
  const ambassadorName = getAmbassadorDisplayName(profile, tempName);
  const ambassadorRegion = tempRegion || dynamicRegion;
  const ambassadorField = tempField || dynamicField;
  const commissionRef = profile?.id || "AV-2026-99401";

  return (
    <div className="space-y-6 max-w-4xl mx-auto text-left">
      {/* Header Actions */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-wide uppercase">
            Fellowship Credential Badge
          </h2>
          <p className="text-xs text-slate-400">
            Official verified commission credential for Advaltad Growth Ambassadors
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenEditModal}
            type="button"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Icon name="Edit3" size={14} />
            <span>Edit Badge Info</span>
          </button>
          <button
            onClick={handlePrintCertificate}
            type="button"
            disabled={downloadingCert}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-lg shadow-emerald-950/40 flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <Icon
              name={downloadingCert ? "Loader2" : "Download"}
              size={14}
              className={downloadingCert ? "animate-spin" : ""}
            />
            <span>{downloadingCert ? "Generating..." : "Download / Print"}</span>
          </button>
        </div>
      </div>

      {/* Modern Certificate Canvas Box with Beautiful Side Ribbons */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-2 sm:p-4 shadow-2xl border-2 border-amber-500/40">
        {/* Outer Gold Decorative Frame */}
        <div className="relative rounded-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 p-6 sm:p-12 border border-amber-500/30 text-center space-y-6 sm:space-y-8 overflow-hidden">
          
          {/* Left Side Ornamental Ribbon Banner */}
          <div className="absolute top-0 left-0 bottom-0 w-8 sm:w-12 pointer-events-none flex flex-col justify-between items-center py-2 z-10">
            <div className="w-full h-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-700 shadow-xl opacity-90 border-r border-amber-300/40 relative flex flex-col justify-between items-center py-4">
              <div className="w-full h-1 bg-amber-200/50 my-2" />
              <div className="w-full h-1 bg-amber-200/50 my-2" />
              <div className="w-full h-1 bg-amber-200/50 my-2" />
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-700 border-2 border-amber-100 flex items-center justify-center shadow-lg my-auto">
                <Icon name="Award" size={14} className="text-slate-950" />
              </div>
              <div className="w-full h-1 bg-amber-200/50 my-2" />
              <div className="w-full h-1 bg-amber-200/50 my-2" />
            </div>
          </div>

          {/* Right Side Ornamental Ribbon Banner */}
          <div className="absolute top-0 right-0 bottom-0 w-8 sm:w-12 pointer-events-none flex flex-col justify-between items-center py-2 z-10">
            <div className="w-full h-full bg-gradient-to-l from-amber-600 via-amber-400 to-amber-700 shadow-xl opacity-90 border-l border-amber-300/40 relative flex flex-col justify-between items-center py-4">
              <div className="w-full h-1 bg-amber-200/50 my-2" />
              <div className="w-full h-1 bg-amber-200/50 my-2" />
              <div className="w-full h-1 bg-amber-200/50 my-2" />
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-700 border-2 border-amber-100 flex items-center justify-center shadow-lg my-auto">
                <Icon name="ShieldCheck" size={14} className="text-slate-950" />
              </div>
              <div className="w-full h-1 bg-amber-200/50 my-2" />
              <div className="w-full h-1 bg-amber-200/50 my-2" />
            </div>
          </div>

          {/* Top & Bottom Accent Gold Bars */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-600 via-yellow-300 to-amber-600 z-20" />
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-600 via-yellow-300 to-amber-600 z-20" />

          {/* Inner Certificate Content Container */}
          <div className="px-6 sm:px-12 py-2 space-y-6 sm:space-y-8 relative z-20">
            {/* Header Row */}
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-4 sm:pb-6">
              <div className="flex items-center gap-3">
                <img
                  src={logoUrl}
                  alt="Advaltad"
                  className="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl object-cover border-2 border-amber-400/50 shadow-md"
                />
                <div className="text-left hidden sm:block">
                  <span className="text-[11px] font-black tracking-widest uppercase text-amber-400 block font-sans">
                    Advaltad Fellowship
                  </span>
                  <span className="text-[9px] text-slate-400 block font-sans">
                    Pan-African Grassroots Commission
                  </span>
                </div>
              </div>
              
              {/* Top Center Crown/Crest */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-300 mb-1">
                  <Icon name="Crown" size={20} />
                </div>
              </div>

              <div className="text-right">
                <span className="text-[9px] sm:text-[10px] font-mono text-amber-400 font-bold block uppercase tracking-widest">
                  Commission Ref
                </span>
                <span className="text-xs sm:text-sm font-mono text-slate-200 font-extrabold">
                  {commissionRef}
                </span>
              </div>
            </div>

            {/* Main Body */}
            <div className="space-y-3 sm:space-y-4 py-2">
              <div className="inline-block px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-amber-500/20 text-amber-300 border border-amber-400/40 text-[10px] sm:text-xs font-black uppercase tracking-widest shadow-inner">
                Certificate of Official Commission
              </div>
              
              <p className="text-[11px] sm:text-xs text-slate-400 uppercase tracking-widest font-semibold">
                This is to certify that
              </p>
              
              {/* Candidate Name: strictly bound to dynamically resolved ambassadorName */}
              <h3
                id="certificate-ambassador-name"
                className="text-2xl sm:text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 font-serif tracking-tight py-1 drop-shadow-md"
              >
                {ambassadorName}
              </h3>
              
              <div className="w-24 sm:w-32 h-0.5 mx-auto bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

              <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed font-sans px-2">
                has been duly vetted, ratified, and commissioned as an official{" "}
                <span className="text-amber-300 font-extrabold">Growth Ambassador</span> overseeing local empowerment initiatives in{" "}
                <span className="text-emerald-400 font-bold">{ambassadorRegion}</span> under the{" "}
                <span className="text-amber-200 font-bold">{ambassadorField}</span> division.
              </p>
            </div>

            {/* Bottom Signatures & Central Starburst Seal */}
            <div className="pt-6 sm:pt-8 border-t border-amber-500/20 grid grid-cols-3 items-end gap-2 text-center">
              {/* Left Signature */}
              <div className="text-left space-y-1">
                <div className="h-8 border-b border-amber-400/30 font-serif italic text-amber-200 text-xs sm:text-sm flex items-end">
                  Kushimo Rasheed Olalekan
                </div>
                <p className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  Executive Chairman
                </p>
                <p className="text-[8px] text-slate-500 font-mono">
                  {formattedCommissionDate}
                </p>
              </div>

              {/* Center Starburst Seal */}
              <div className="flex flex-col items-center justify-center relative">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-600 p-0.5 shadow-2xl border-2 border-yellow-100 flex items-center justify-center relative z-20">
                  <div className="w-full h-full rounded-full bg-gradient-to-tr from-amber-700 via-amber-500 to-yellow-300 flex flex-col items-center justify-center text-slate-950 border border-amber-200 shadow-inner p-1">
                    <Icon name="Award" size={18} className="text-slate-950 drop-shadow" />
                    <span className="text-[6px] sm:text-[7px] font-black uppercase tracking-tighter text-slate-950 leading-none mt-0.5">
                      Verified Seal
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Signature */}
              <div className="text-right space-y-1">
                <div className="h-8 border-b border-amber-400/30 font-serif italic text-amber-200 text-xs sm:text-sm flex items-end justify-end">
                  Advaltad Board
                </div>
                <p className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  Director of Governance
                </p>
                <p className="text-[8px] text-emerald-400 font-mono font-bold flex items-center gap-1 justify-end">
                  <Icon name="CheckCircle2" size={10} /> Verified On-Chain
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Cert Form Modal */}
      <AnimatePresence>
        {certFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-md w-full space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Icon name="Award" size={16} className="text-amber-400" />
                  <span>Edit Credential Details</span>
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
                  <label className="text-[10px] font-bold text-slate-400 uppercase">
                    Ambassador Name
                  </label>
                  <input
                    type="text"
                    required
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    placeholder="Enter full ambassador name"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">
                    Region / City
                  </label>
                  <input
                    type="text"
                    required
                    value={tempRegion}
                    onChange={(e) => setTempRegion(e.target.value)}
                    placeholder="e.g. Lagos, Nigeria"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">
                    Focus Division
                  </label>
                  <input
                    type="text"
                    required
                    value={tempField}
                    onChange={(e) => setTempField(e.target.value)}
                    placeholder="e.g. Youth Technology Labs"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
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
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer transition-colors shadow-md disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
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
