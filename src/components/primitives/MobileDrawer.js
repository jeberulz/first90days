"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function MobileDrawer({
  open,
  onClose,
  children,
  ariaLabel = "Main navigation",
}) {
  const panelRef = useRef(null);
  const pathname = usePathname();
  const lastPathname = useRef(pathname);

  useEffect(() => {
    if (lastPathname.current !== pathname) {
      lastPathname.current = pathname;
      if (open) onClose?.();
    }
  }, [pathname, open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);

    const first = panelRef.current?.querySelector("a,button");
    first?.focus?.();

    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-[55] bg-black/60 transition-opacity md:hidden",
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        )}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={cn(
          "fixed top-0 right-0 z-[56] h-[100dvh] w-[82vw] max-w-sm md:hidden",
          "bg-paper dark:bg-paper-dark border-l border-warm-border dark:border-warm-borderDark shadow-2xl",
          "transition-transform duration-300 ease-out",
          "pt-[max(env(safe-area-inset-top),1.25rem)] pb-[max(env(safe-area-inset-bottom),1.25rem)] px-6",
          "flex flex-col",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {children}
      </aside>
    </>
  );
}
