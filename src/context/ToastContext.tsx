import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  Sparkles
} from 'lucide-react';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  timestamp: number;
}

interface ToastContextType {
  showToast: (params: {
    type?: ToastType;
    title: string;
    message?: string;
    duration?: number;
  }) => string;
  success: (title: string, message?: string, duration?: number) => string;
  info: (title: string, message?: string, duration?: number) => string;
  warning: (title: string, message?: string, duration?: number) => string;
  error: (title: string, message?: string, duration?: number) => string;
  dismissToast: (id: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const dismissToast = useCallback((id: string) => {
    // Clear timer if active
    if (timersRef.current.has(id)) {
      clearTimeout(timersRef.current.get(id));
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
    setToasts([]);
  }, []);

  const showToast = useCallback(
    ({
      type = 'info',
      title,
      message,
      duration = 5000
    }: {
      type?: ToastType;
      title: string;
      message?: string;
      duration?: number;
    }): string => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newToast: ToastItem = {
        id,
        type,
        title,
        message,
        duration,
        timestamp: Date.now()
      };

      setToasts((prev) => [newToast, ...prev].slice(0, 4));

      if (duration > 0) {
        const timer = setTimeout(() => {
          dismissToast(id);
        }, duration);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [dismissToast]
  );

  const success = useCallback(
    (title: string, message?: string, duration = 6000) =>
      showToast({ type: 'success', title, message, duration }),
    [showToast]
  );

  const info = useCallback(
    (title: string, message?: string, duration = 5000) =>
      showToast({ type: 'info', title, message, duration }),
    [showToast]
  );

  const warning = useCallback(
    (title: string, message?: string, duration = 5500) =>
      showToast({ type: 'warning', title, message, duration }),
    [showToast]
  );

  const error = useCallback(
    (title: string, message?: string, duration = 6500) =>
      showToast({ type: 'error', title, message, duration }),
    [showToast]
  );

  return (
    <ToastContext.Provider
      value={{
        showToast,
        success,
        info,
        warning,
        error,
        dismissToast,
        clearAllToasts
      }}
    >
      {children}

      {/* TOAST CONTAINER PORTAL */}
      <div
        id="toast-notification-container"
        className="fixed top-5 right-4 sm:right-6 z-[9999] flex flex-col gap-3 max-w-sm sm:max-w-md w-full pointer-events-none"
        role="region"
        aria-label="System Notifications"
      >
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          const isWarning = toast.type === 'warning';

          const borderStyle = isSuccess
            ? 'border-emerald-500/50 shadow-emerald-950/40'
            : isError
            ? 'border-rose-500/50 shadow-rose-950/40'
            : isWarning
            ? 'border-[#FF8A00]/50 shadow-amber-950/40'
            : 'border-sky-500/50 shadow-sky-950/40';

          const iconBg = isSuccess
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            : isError
            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            : isWarning
            ? 'bg-[#FF8A00]/20 text-[#FF8A00] border border-[#FF8A00]/30'
            : 'bg-sky-500/20 text-sky-400 border border-sky-500/30';

          const progressBarColor = isSuccess
            ? 'bg-emerald-500'
            : isError
            ? 'bg-rose-500'
            : isWarning
            ? 'bg-[#FF8A00]'
            : 'bg-sky-500';

          return (
            <div
              key={toast.id}
              id={`toast-${toast.id}`}
              data-testid="toast-notification"
              className={`pointer-events-auto bg-[#1E293B]/95 backdrop-blur-xl border ${borderStyle} rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden transition-all duration-300 animate-slideDown flex flex-col gap-2.5 text-left`}
              role="alert"
              aria-live="polite"
            >
              {/* Top Row: Icon, Title, and Dismiss */}
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl shrink-0 ${iconBg} shadow-inner`}>
                  {isSuccess ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : isError ? (
                    <AlertCircle className="w-5 h-5" />
                  ) : isWarning ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <Info className="w-5 h-5" />
                  )}
                </div>

                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-sm font-bold text-[#F8FAFC] tracking-tight">
                      {toast.title}
                    </h4>
                    {isSuccess && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                        <Sparkles className="w-2.5 h-2.5" />
                        Confirmed
                      </span>
                    )}
                  </div>
                  {toast.message && (
                    <p className="text-xs text-[#CBD5E1] mt-1 leading-relaxed break-words font-normal">
                      {toast.message}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => dismissToast(toast.id)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors shrink-0 cursor-pointer"
                  title="Dismiss notification"
                  aria-label="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Countdown Progress Bar */}
              {toast.duration && toast.duration > 0 && (
                <div className="w-full bg-slate-800/80 h-1 rounded-full overflow-hidden mt-1">
                  <div
                    className={`h-full ${progressBarColor} rounded-full transition-all`}
                    style={{
                      animation: `shrinkWidth ${toast.duration}ms linear forwards`
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
