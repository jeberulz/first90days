import Link from "next/link";
import { Icon } from "@iconify/react";

// Standalone layout for the public Terms / Privacy pages so they don't
// inherit the dashboard chrome and can render readably on cold visits
// (e.g. someone clicking through from the footer or an email).
//
// Uses the same paper background + ink palette as the marketing site for
// visual consistency, but no nav/auth guards.

export default function LegalLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#F5F2E8] dark:bg-[#0F0E0D] text-[#1C1917] dark:text-[#E7E5E4]">
      <header className="border-b border-[#D1CDC7] dark:border-[#2C2825]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 font-space-grotesk text-sm font-semibold"
            aria-label="Arcora home"
          >
            <Icon icon="solar:stars-minimalistic-linear" className="text-accent" width={18} />
            Arcora
          </Link>
          <Link
            href="/"
            className="font-space-grotesk text-xs text-[#57534E] dark:text-[#A8A29E] hover:text-accent transition-colors"
          >
            ← Back to site
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <article className="prose-arcora">{children}</article>
      </main>

      <footer className="border-t border-[#D1CDC7] dark:border-[#2C2825] py-6">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row gap-3 items-center justify-between text-xs text-[#78716C] font-space-grotesk">
          <p>© {new Date().getFullYear()} Rulz &amp; Co</p>
          <div className="flex gap-5">
            <Link href="/terms" className="hover:text-accent transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-accent transition-colors">
              Privacy
            </Link>
            <a
              href="mailto:hello@switchtoux.com"
              className="hover:text-accent transition-colors"
            >
              hello@switchtoux.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
