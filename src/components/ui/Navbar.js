"use client";

import { Moon, Sun } from "lucide-react";

export function Navbar() {
  function toggleTheme() {
    if (document.documentElement.classList.contains("dark")) {
      document.documentElement.classList.remove("dark");
      localStorage.theme = "light";
    } else {
      document.documentElement.classList.add("dark");
      localStorage.theme = "dark";
    }
  }

  return (
    <nav className="fixed top-0 w-full z-50 bg-cream-100/90 dark:bg-[#1a1915]/90 backdrop-blur-md transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2 group cursor-pointer">
          <div className="relative w-8 h-8 text-terracotta">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
          </div>
          <span className="font-serif text-2xl font-medium tracking-tight text-charcoal dark:text-cream-100 group-hover:text-terracotta transition-colors">
            First90
          </span>
        </div>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-charcoal/70 dark:text-cream-200">
          <a href="#methodology" className="hover:text-terracotta transition-colors">
            Methodology
          </a>
          <a href="#examples" className="hover:text-terracotta transition-colors">
            Examples
          </a>
          <a href="#pricing" className="hover:text-terracotta transition-colors">
            Pricing
          </a>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-charcoal dark:text-cream-100"
            aria-label="Toggle Dark Mode"
          >
            <Sun className="w-5 h-5 hidden dark:block" />
            <Moon className="w-5 h-5 block dark:hidden" />
          </button>

          <a
            href="#"
            className="text-sm font-medium transition-colors hidden sm:block text-charcoal hover:text-terracotta dark:text-cream-100"
          >
            Log in
          </a>
          <button className="bg-terracotta text-sm font-medium px-5 py-2.5 rounded-full hover:bg-terracotta-hover transition-all text-white">
            Get started
          </button>
        </div>
      </div>
    </nav>
  );
}
