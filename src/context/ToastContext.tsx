import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

export interface ToastOptions {
  type?: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

export interface ToastContextType {
  toasts: ToastItem[];
  showToast: (
    typeOrOptions: ToastType | ToastOptions,
    title?: string,
    message?: string,
    duration?: number
  ) => string;
  addToast: (
    title: string,
    message?: string,
    type?: ToastType,
    duration?: number
  ) => string;
  removeToast: (id: string) => void;
  success: (title: string, message?: string, duration?: number) => string;
  error: (title: string, message?: string, duration?: number) => string;
  info: (title: string, message?: string, duration?: number) => string;
  warning: (title: string, message?: string, duration?: number) => string;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

export interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (
      typeOrOptions: ToastType | ToastOptions,
      title?: string,
      message?: string,
      duration: number = 4000
    ): string => {
      const id = Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

      let newToast: ToastItem;

      if (typeof typeOrOptions === 'object') {
        newToast = {
          id,
          type: typeOrOptions.type || 'info',
          title: typeOrOptions.title,
          message: typeOrOptions.message,
          duration: typeOrOptions.duration ?? duration,
        };
      } else {
        newToast = {
          id,
          type: typeOrOptions,
          title: title || '',
          message,
          duration,
        };
      }

      setToasts((prev) => [...prev, newToast]);

      const toastDuration = newToast.duration ?? 4000;
      if (toastDuration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, toastDuration);
      }

      return id;
    },
    [removeToast]
  );

  const addToast = useCallback(
    (
      title: string,
      message?: string,
      type: ToastType = 'success',
      duration: number = 4500
    ): string => {
      return showToast(type, title, message, duration);
    },
    [showToast]
  );

  const success = useCallback(
    (title: string, message?: string, duration?: number) =>
      showToast('success', title, message, duration),
    [showToast]
  );

  const error = useCallback(
    (title: string, message?: string, duration?: number) =>
      showToast('error', title, message, duration),
    [showToast]
  );

  const info = useCallback(
    (title: string, message?: string, duration?: number) =>
      showToast('info', title, message, duration),
    [showToast]
  );

  const warning = useCallback(
    (title: string, message?: string, duration?: number) =>
      showToast('warning', title, message, duration),
    [showToast]
  );

  const contextValue = useMemo<ToastContextType>(
    () => ({
      toasts,
      showToast,
      addToast,
      removeToast,
      success,
      error,
      info,
      warning,
    }),
    [toasts, showToast, addToast, removeToast, success, error, info, warning]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {/* Toast Render Container */}
      <div
        id="toast-portal-container"
        className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm sm:max-w-md w-full pointer-events-none p-4"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          const isWarning = toast.type === 'warning';

          return (
            <div
              key={toast.id}
              id={`toast-item-${toast.id}`}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-xl backdrop-blur-xl border transition-all duration-300 animate-in fade-in slide-in-from-top-3 ${
                isSuccess
                  ? 'bg-slate-900/95 border-emerald-500/30 text-emerald-300 shadow-emerald-500/10'
                  : isError
                  ? 'bg-slate-900/95 border-rose-500/30 text-rose-300 shadow-rose-500/10'
                  : isWarning
                  ? 'bg-slate-900/95 border-amber-500/30 text-amber-300 shadow-amber-500/10'
                  : 'bg-slate-900/95 border-sky-500/30 text-sky-300 shadow-sky-500/10'
              }`}
              role="alert"
            >
              <div className="shrink-0 mt-0.5">
                {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                {isError && <AlertCircle className="w-5 h-5 text-rose-400" />}
                {isWarning && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5 text-sky-400" />}
              </div>

              <div className="flex-1 min-w-0 pr-1">
                {toast.title && (
                  <h4 className="font-semibold text-sm text-white tracking-tight leading-snug">
                    {toast.title}
                  </h4>
                )}
                {toast.message && (
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed break-words">
                    {toast.message}
                  </p>
                )}
              </div>

              <button
                id={`toast-close-btn-${toast.id}`}
                onClick={() => removeToast(toast.id)}
                type="button"
                className="shrink-0 text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800/60 cursor-pointer"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    // Provide a safe fallback if used outside of ToastProvider so nothing crashes
    return {
      toasts: [],
      showToast: () => '',
      addToast: () => '',
      removeToast: () => {},
      success: () => '',
      error: () => '',
      info: () => '',
      warning: () => '',
    };
  }
  return context;
};

export default ToastProvider;
