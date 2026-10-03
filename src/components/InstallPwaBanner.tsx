import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Download,
  Share2,
  PlusSquare,
  X,
  Smartphone,
  CheckCircle2
} from "lucide-react";
import { usePWAInstall } from "../hooks/usePWAInstall";

const SESSION_DISMISS_KEY = "advaltad_pwa_bar_dismissed_session";

export const InstallPwaBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(true);
  const [isInstalling, setIsInstalling] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if dismissed in this current browser session
    const dismissed = sessionStorage.getItem(SESSION_DISMISS_KEY);
    if (!dismissed) {
      setIsDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(SESSION_DISMISS_KEY, "true");
    }
  };

  // If already running as an installed PWA or standalone mode, completely hide the banner
  if (isInstalled) {
    return null;
  }

  // 1-Tap Handler: Native prompt for Android/Chromium, guide modal ONLY for iOS Safari
  const handleInstallClick = async () => {
    if (isIOS) {
      // iOS WebKit does not support beforeinstallprompt; show visual iOS instruction modal
      setShowIOSModal(true);
      return;
    }

    // Android / Chromium / Desktop: 1-Tap native installation prompt
    setIsInstalling(true);
    try {
      await install();
    } catch (err) {
      console.warn("[PWA] 1-Tap install error:", err);
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. VISITOR INSTALL BAR (STICKY DOCK ON MOBILE / FLOATING BAR ON DESKTOP) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {!isDismissed && (
          <motion.aside
            role="region"
            aria-label="App installation banner"
            initial={{ y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 90, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-5 sm:max-w-md z-50 pointer-events-auto"
          >
            <div className="relative overflow-hidden rounded-2xl bg-[#0A5C36] text-white shadow-[0_12px_40px_rgba(10,92,54,0.45)] border border-emerald-500/40 p-3.5 sm:p-4 backdrop-blur-xl">
              {/* Background ambient lighting */}
              <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-emerald-400/20 blur-2xl pointer-events-none" />
              <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-amber-400/15 blur-xl pointer-events-none" />

              <div className="relative flex items-center justify-between gap-3">
                {/* App Brand Icon & Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src="/pwa-192x192.png"
                      alt="Advaltad Growth Foundation"
                      className="w-12 h-12 rounded-xl object-cover bg-white p-0.5 border border-white/30 shadow-md"
                    />
                    <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 text-[9px] font-black text-[#0A5C36] ring-2 ring-[#0A5C36]">
                      ✓
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-sm text-white tracking-tight truncate">
                        Advaltad App
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-700/90 border border-emerald-400/40 text-emerald-100 px-1.5 py-0.5 rounded-full shrink-0">
                        {isIOS ? "iOS" : isAndroid ? "Android" : "PWA"}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-100/90 truncate mt-0.5">
                      Install for fast offline access & updates
                    </p>
                  </div>
                </div>

                {/* Actions: 1-Tap Install & Dismiss */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    disabled={isInstalling}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-[#0A5C36] text-xs font-black uppercase tracking-wider shadow-lg hover:bg-emerald-50 active:scale-95 transition-all cursor-pointer select-none"
                  >
                    {isInstalling ? (
                      <span className="inline-block animate-spin">⏳</span>
                    ) : (
                      <Download size={14} className="stroke-[2.5]" />
                    )}
                    <span>{isInstalling ? "Opening..." : "Install"}</span>
                  </button>

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
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 2. PERSISTENT MINI FLOATING TRIGGER (WHEN BAR IS DISMISSED) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isDismissed && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-4 right-4 z-40"
          >
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex items-center gap-2 px-3 py-2 rounded-full bg-[#0A5C36] text-white text-xs font-bold shadow-xl border border-emerald-500/40 hover:bg-[#084a2c] active:scale-95 transition-all cursor-pointer"
              title="Install Advaltad App"
            >
              <img
                src="/pwa-192x192.png"
                alt=""
                className="w-5 h-5 rounded-md object-cover bg-white"
              />
              <span className="hidden sm:inline">Install App</span>
              <Download size={13} className="stroke-[2.5]" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 3. STEP-BY-STEP INSTRUCTION MODAL — EXCLUSIVELY FOR IOS SAFARI */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showIOSModal && isIOS && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.65 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowIOSModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 16 }}
              className="relative w-full max-w-sm rounded-3xl bg-white text-slate-800 shadow-2xl border border-slate-100 p-6 overflow-hidden z-10 space-y-5"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white p-1 border border-slate-200 shadow-sm shrink-0">
                    <img
                      src="/pwa-192x192.png"
                      alt="Advaltad App"
                      className="w-full h-full object-cover rounded-xl"
                    />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">
                      Install on iPhone / iPad
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Safari Home Screen Web App
                    </p>
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

              {/* iOS 3-Step Guided Instructions */}
              <div className="space-y-3.5 text-xs text-slate-600">
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                  <div className="p-2 rounded-xl bg-blue-500 text-white shrink-0 mt-0.5 shadow-sm">
                    <Share2 size={16} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Step 1: Tap the Share Button</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      In Safari's bottom toolbar (or top right on iPad), tap the <strong>Share</strong> button.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                  <div className="p-2 rounded-xl bg-[#0A5C36] text-white shrink-0 mt-0.5 shadow-sm">
                    <PlusSquare size={16} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Step 2: Add to Home Screen</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Scroll down the options list and select <strong>"Add to Home Screen"</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                  <div className="p-2 rounded-xl bg-emerald-600 text-white shrink-0 mt-0.5 shadow-sm">
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Step 3: Tap "Add"</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Tap <strong>"Add"</strong> in the top-right corner to place Advaltad on your Home Screen!
                    </p>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="w-full py-3 rounded-xl bg-[#0A5C36] hover:bg-[#084a2c] text-white text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer text-center shadow-md active:scale-98"
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
