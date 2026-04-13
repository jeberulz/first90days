"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const SIZE_MAP = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  "2xl": "sm:max-w-2xl",
};

export default function ResponsiveModal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
  initialFocusRef,
  hideCloseButton = false,
  className,
}) {
  const panelRef = useRef(null);
  const lastFocus = useRef(null);

  useEffect(() => {
    if (!open) return;
    lastFocus.current = document.activeElement;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      if (lastFocus.current && typeof lastFocus.current.focus === "function") {
        lastFocus.current.focus();
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = panelRef.current;
    const target =
      initialFocusRef?.current ||
      el?.querySelector(
        '[data-autofocus],input:not([disabled]),textarea:not([disabled]),select:not([disabled]),button:not([disabled])'
      );
    target?.focus?.();

    function onKey(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose?.();
        return;
      }
      if (e.key !== "Tab" || !el) return;
      const focusable = el.querySelectorAll(
        'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, initialFocusRef]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "rm-title" : undefined}
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        className={cn(
          "relative w-full bg-warm-cardDark border border-warm-borderDark text-warm-line shadow-xl",
          "rounded-t-2xl sm:rounded-2xl",
          "max-h-[90dvh] sm:max-h-[85dvh] flex flex-col",
          "pb-[max(env(safe-area-inset-bottom),1rem)] sm:pb-0",
          SIZE_MAP[size] || SIZE_MAP.md,
          className
        )}
      >
        {(title || !hideCloseButton) && (
          <div className="flex items-center justify-between gap-4 px-5 pt-5 pb-3 border-b border-warm-borderDark shrink-0">
            {title ? (
              <h3
                id="rm-title"
                className="font-instrument-serif text-xl text-warm-line truncate"
              >
                {title}
              </h3>
            ) : (
              <span />
            )}
            {!hideCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-md p-1.5 text-warm-300 hover:bg-warm-surfaceDark hover:text-warm-line transition-colors min-h-9 min-w-9 flex items-center justify-center"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        )}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {children}
        </div>
        {footer && (
          <div className="px-5 py-3 border-t border-warm-borderDark shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
