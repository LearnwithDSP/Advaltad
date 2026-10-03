import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Download,
  Share2,
  PlusSquare,
  X,
  Smartphone,
  CheckCircle2,
  Sparkles,
  ExternalLink
} from "lucide-react";
import { usePWAInstall } from "../hooks/usePWAInstall";

const DISMISS_KEY = "advaltad_pwa_banner_dismissed_until";

export const InstallPwaBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(true);
  const [isInstalling, setIsInstalling] = useState<boolean>(false);

  useEffect(() => {
    // Check if dismissed previously
    if (typeof window !== "undefined") {
      const dismissedUntil = localStorage.getItem(DISMISS_KEY);
      if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
        setIsDismissed(true);
      } else {
        setIsDismissed(false);
      }
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    // Dismiss for 7 days
    if (typeof window !== "undefined") {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000));
    }
  };

  // If already installed or dismissed, do not render
  if (isInstalled || isDismissed) {
    return null;
  }

  // Only render if installable (Android/Chromium) OR on iOS Safari
  if (!isInstallable && !isIOS) {
    return null;
  }

  const handleAndroidInstall = async () => {
    setIsInstalling(true);
    try {
      await install();
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 pointer-events-auto"
        >
          <div className="relative overflow-hidden rounded-2xl bg-[#0A5C36] text-white shadow-2xl border border-emerald-600/40 p-4 sm:p-4.5 backdrop-blur-md">
            {/* Background ambient decorative glow */}
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-emerald-400/20 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-amber-400/10 blur-xl pointer-events-none" />

            <div className="relative flex items-center justify-between gap-3">
              {/* App Icon & Details */}
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src="/pwa-192x192.png"
                  alt="Advaltad Growth Foundation"
                  className="w-12 h-12 rounded-xl object-contain bg-white p-1 border border-white/20 shadow-md shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-sm text-white tracking-tight truncate">
                      Advaltad Foundation
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-700/80 border border-emerald-400/30 text-emerald-200 px-1.5 py-0.5 rounded-full shrink-0">
                      PWA
                    </span>
                  </div>
                  <p className="text-xs text-emerald-100/90 line-clamp-1">
                    Install for offline access, instant notifications & fast launch
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {isInstallable && (
                  <button
                    type="button"
                    onClick={handleAndroidInstall}
                    disabled={isInstalling}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-[#0A5C36] text-xs font-black uppercase tracking-wider shadow-lg hover:bg-emerald-50 active:scale-95 transition-all cursor-pointer"
                  >
                    <Download size={14} className="stroke-[2.5]" />
                    <span>{isInstalling ? "Installing..." : "Install"}</span>
                  </button>
                )}

                {isIOS && (
                  <button
                    type="button"
                    onClick={() => setShowIOSModal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-[#0A5C36] text-xs font-black uppercase tracking-wider shadow-lg hover:bg-emerald-50 active:scale-95 transition-all cursor-pointer"
                  >
                    <Smartphone size={14} className="stroke-[2.5]" />
                    <span>Install</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleDismiss}
                  aria-label="Dismiss install prompt"
                  className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* iOS Step-by-Step Installation Modal */}
      <AnimatePresence>
        {showIOSModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowIOSModal(false)}
              className="absolute inset-0 bg-slate-950 backdrop-blur-sm"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-sm rounded-3xl bg-white text-slate-800 shadow-2xl border border-slate-100 p-6 overflow-hidden z-10 space-y-5"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#0A5C36]/10 border border-[#0A5C36]/20 flex items-center justify-center text-[#0A5C36]">
                    <Smartphone size={20} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">
                      Install on iPhone / iPad
                    </h3>
                    <p className="text-xs text-slate-500">Safari Home Screen App</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Instructions */}
              <div className="space-y-3.5 text-xs text-slate-600">
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="p-1.5 rounded-xl bg-blue-500 text-white shrink-0 mt-0.5 shadow-sm">
                    <Share2 size={16} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Step 1: Tap the Share Button</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      In the Safari browser bottom toolbar (or top on iPad), tap the Share icon.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="p-1.5 rounded-xl bg-[#0A5C36] text-white shrink-0 mt-0.5 shadow-sm">
                    <PlusSquare size={16} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Step 2: Add to Home Screen</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Scroll down the share sheet and tap <strong>"Add to Home Screen"</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="p-1.5 rounded-xl bg-emerald-600 text-white shrink-0 mt-0.5 shadow-sm">
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Step 3: Confirm & Launch</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Tap <strong>"Add"</strong> in the top right corner. The Advaltad icon will appear on your Home Screen!
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer Button */}
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="w-full py-3 rounded-xl bg-[#0A5C36] hover:bg-[#084a2c] text-white text-xs font-extrabold uppercase tracking-wider transition-all shadow-md active:scale-[0.98] cursor-pointer"
              >
                Got It
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default InstallPwaBanner;
