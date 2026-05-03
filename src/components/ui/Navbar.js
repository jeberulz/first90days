"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@iconify/react";
import { MobileDrawer } from "@/components/primitives";
import { Logo } from "./Logo";

function toggleTheme() {
  const root = document.documentElement;
  if (root.classList.contains("dark")) {
    root.classList.remove("dark");
    localStorage.theme = "light";
  } else {
    root.classList.add("dark");
    localStorage.theme = "dark";
  }
}

const NAV_LINKS = [
  { href: "#methodology", label: "Methodology" },
  { href: "#examples", label: "Examples" },
  { href: "#pricing", label: "Pricing" },
];

export function Navbar() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <nav className="fixed top-0 w-full z-50 border-b bg-[#F5F2E8]/90 dark:bg-[#0F0E0D]/90 backdrop-blur-md border-[#D1CDC7] dark:border-[#2C2825] transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center min-w-0 min-h-11 -mx-1 px-1 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0F0E0D] text-[#1C1917] dark:text-white"
            aria-label="Arcora home"
          >
            <Logo className="h-9 w-auto shrink-0" />
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#44403C] dark:text-[#D6D3D1]">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="transition-colors font-space-grotesk hover:text-[#1C1917] dark:hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center justify-center min-h-11 min-w-11 p-2.5 rounded-full hover:bg-[#EBE8DE] dark:hover:bg-[#1C1917] transition-colors text-[#44403C] dark:text-[#D6D3D1] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0F0E0D]"
              aria-label="Toggle dark mode"
            >
              <Icon
                icon="solar:sun-2-linear"
                className="hidden dark:block"
                width={20}
                height={20}
                aria-hidden
              />
              <Icon
                icon="solar:moon-linear"
                className="block dark:hidden"
                width={20}
                height={20}
                aria-hidden
              />
            </button>

            <Link
              href="/login"
              className="text-sm font-medium transition-colors hidden md:block font-space-grotesk text-[#44403C] dark:text-[#D6D3D1] hover:text-[#1C1917] dark:hover:text-white"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center min-h-11 bg-accent text-xs sm:text-sm font-semibold px-4 sm:px-5 py-2.5 rounded-full hover:bg-accent-hover transition-all shadow-[0_2px_10px_rgba(217,119,87,0.3)] font-space-grotesk border border-accent text-white whitespace-nowrap"
            >
              Generate Plan
            </Link>

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="md:hidden inline-flex items-center justify-center min-h-11 min-w-11 p-2.5 rounded-md text-[#44403C] dark:text-[#D6D3D1] hover:bg-[#EBE8DE] dark:hover:bg-[#1C1917] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0F0E0D]"
              aria-label="Open menu"
              aria-expanded={drawerOpen}
            >
              <Icon
                icon="solar:hamburger-menu-linear"
                width={22}
                height={22}
                aria-hidden
              />
            </button>
          </div>
        </div>
      </nav>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center text-[#1C1917] dark:text-white">
            <Logo className="h-9 w-auto" />
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="p-2 rounded-md text-[#44403C] dark:text-[#D6D3D1] hover:bg-[#EBE8DE] dark:hover:bg-[#1C1917]"
            aria-label="Close menu"
          >
            <Icon icon="solar:close-circle-linear" width={22} height={22} aria-hidden />
          </button>
        </div>

        <nav className="flex flex-col">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="block py-3 text-lg font-space-grotesk text-[#1C1917] dark:text-white hover:text-accent transition-colors border-b border-[#D1CDC7] dark:border-[#2C2825]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <p className="mt-8 font-instrument-serif text-2xl text-[#1C1917] dark:text-white leading-tight text-balance">
          Your first 90 days, engineered for impact.
        </p>

        <div className="mt-auto pt-8 flex flex-col gap-3">
          <Link
            href="/login"
            className="w-full text-center px-5 py-3 rounded-full border border-[#D1CDC7] dark:border-[#2C2825] font-space-grotesk text-sm font-medium text-[#44403C] dark:text-[#D6D3D1] hover:bg-[#EBE8DE] dark:hover:bg-[#1C1917] transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="w-full text-center bg-accent text-sm font-semibold px-5 py-3 rounded-full hover:bg-accent-hover transition-all shadow-[0_2px_10px_rgba(217,119,87,0.3)] font-space-grotesk border border-accent text-white"
          >
            Generate Plan
          </Link>
        </div>
      </MobileDrawer>
    </>
  );
}
