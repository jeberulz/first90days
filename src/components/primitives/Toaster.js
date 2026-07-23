"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

// ── Context ───────────────────────────────────────────────────────────────────

const ToastContext = createContext(null);

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Returns `addToast(message, variant?, duration?, action?)`.
 *
 * variant: 'success' | 'error' | 'warning' | 'info'  (default: 'info')
 * duration: ms before auto-dismiss; 0 = stay until manually closed
 *           default: 4000 for success/info/warning, 0 (persistent) for error
 * action: optional { label: string, onClick: () => void } — renders a button inside the toast
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx.addToast;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const ICON_CLASS = { success: "text-green-400", error: "text-red-400", warning: "text-amber-400", info: "text-[#A8A29E]" };

function ToastIcon({ variant }) {
  const cls = `shrink-0 ${ICON_CLASS[variant] || ICON_CLASS.info}`;
  if (variant === "success") {
    return (
      <svg className={cls} width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" /><path d="M8 12l3 3 5-5" />
      </svg>
    );
  }
  if (variant === "error") {
    return (
      <svg className={cls} width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" />
      </svg>
    );
  }
  if (variant === "warning") {
    return (
      <svg className={cls} width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10.3 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><path d="M12 9v4" /><path d="M12 17h.01" />
      </svg>
    );
  }
  // info
  return (
    <svg className={cls} width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><path d="M12 8h.01M12 11v5" />
    </svg>
  );
}

// ── Single Toast ──────────────────────────────────────────────────────────────

function Toast({ id, message, variant, action, onDismiss }) {
  const isError = variant === "error";
  const ariaRole = isError ? "alert" : "status";

  return (
    <div
      role={ariaRole}
      aria-live={isError ? "assertive" : "polite"}
      aria-atomic="true"
      className="flex items-start gap-3 w-full lg:w-[360px] px-4 py-3 bg-[#1C1917] border border-[#2C2825] rounded-xl shadow-xl font-space-grotesk text-sm text-[#E7E5E4] animate-fade-in-up"
    >
      <ToastIcon variant={variant} />
      <div className="flex-1 min-w-0 leading-snug pt-px space-y-1.5">
        <span>{message}</span>
        {action && (
          <button
            type="button"
            onClick={() => { action.onClick(); onDismiss(id); }}
            className="block text-xs font-medium text-[#D97757] hover:text-[#C26242] transition-colors"
          >
            {action.label} →
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(id)}
        aria-label="Dismiss notification"
        className="shrink-0 text-[#A8A29E] hover:text-[#E7E5E4] transition-colors mt-px"
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ── Toaster Container ─────────────────────────────────────────────────────────

function Toaster({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      className="fixed z-[60] flex flex-col gap-2 items-stretch lg:items-end pointer-events-none inset-x-4 lg:inset-x-auto lg:right-6"
      style={{ bottom: "calc(var(--bottom-nav-h, 64px) + 12px)" }}
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <Toast {...t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  // Use a counter ref instead of Date.now() to avoid duplicate IDs on fast calls
  const counterRef = useRef(0);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, variant = "info", duration, action) => {
    const defaultDuration = variant === "error" ? 0 : 4000;
    const dur = duration ?? defaultDuration;
    const id = ++counterRef.current;

    setToasts((prev) => [...prev, { id, message, variant, duration: dur, action }]);

    if (dur > 0) {
      setTimeout(() => dismissToast(id), dur);
    }
  }, [dismissToast]);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}
