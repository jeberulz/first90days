"use client";

import Link from "next/link";
import { Icon } from "@iconify/react";

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

export function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 border-b bg-[#F5F2E8]/90 dark:bg-[#0F0E0D]/90 backdrop-blur-md border-[#D1CDC7] dark:border-[#2C2825] transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon
            icon="solar:stars-minimalistic-linear"
            className="text-accent"
            width={24}
            height={24}
            aria-hidden
          />
          <span className="font-semibold tracking-tight text-base font-space-grotesk text-[#1C1917] dark:text-white">
            First90
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#44403C] dark:text-[#D6D3D1]">
          <Link
            href="#"
            className="transition-colors font-space-grotesk hover:text-[#1C1917] dark:hover:text-white"
          >
            Methodology
          </Link>
          <Link
            href="#"
            className="transition-colors font-space-grotesk hover:text-[#1C1917] dark:hover:text-white"
          >
            Examples
          </Link>
          <Link
            href="#"
            className="transition-colors font-space-grotesk hover:text-[#1C1917] dark:hover:text-white"
          >
            Pricing
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-[#EBE8DE] dark:hover:bg-[#1C1917] transition-colors text-[#44403C] dark:text-[#D6D3D1] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0F0E0D]"
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
            className="text-sm font-medium transition-colors hidden sm:block font-space-grotesk text-[#44403C] dark:text-[#D6D3D1] hover:text-[#1C1917] dark:hover:text-white"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="bg-accent text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-accent-hover transition-all shadow-[0_2px_10px_rgba(217,119,87,0.3)] font-space-grotesk border border-accent text-white"
          >
            Generate Plan
          </Link>
        </div>
      </div>
    </nav>
  );
}
