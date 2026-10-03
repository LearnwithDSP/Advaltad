import React from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { RefreshCw, X, WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const ReloadPrompt: React.FC = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log("[PWA] Service Worker registered:", r);
    },
    onRegisterError(error) {
      console.warn("[PWA] Service Worker registration failed:", error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!offlineReady && !needRefresh) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        className="fixed top-4 right-4 z-50 max-w-sm rounded-2xl bg-[#0A5C36] text-white p-4 shadow-2xl border border-emerald-500/40 backdrop-blur-md"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-200 flex items-center gap-1.5">
              {needRefresh ? (
                <>
                  <RefreshCw size={13} className="animate-spin text-amber-300" />
                  <span>Update Available</span>
                </>
              ) : (
                <>
                  <WifiOff size={13} className="text-emerald-300" />
                  <span>Offline Ready</span>
                </>
              )}
            </h4>
            <p className="text-xs text-emerald-50/90 leading-relaxed">
              {needRefresh
                ? "A new version of Advaltad Foundation is ready. Reload to update."
                : "App content has been cached. You can now use Advaltad offline!"}
            </p>
          </div>

          <button
            type="button"
            onClick={close}
            aria-label="Close notice"
            className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {needRefresh && (
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={close}
              className="px-2.5 py-1.5 rounded-lg text-emerald-200 hover:text-white text-xs font-bold transition-colors"
            >
              Later
            </button>
            <button
              type="button"
              onClick={() => updateServiceWorker(true)}
              className="px-3.5 py-1.5 rounded-lg bg-white text-[#0A5C36] text-xs font-black uppercase tracking-wider shadow hover:bg-emerald-50 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw size={12} />
              <span>Reload Now</span>
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default ReloadPrompt;
