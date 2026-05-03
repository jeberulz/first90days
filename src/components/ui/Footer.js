import Link from "next/link";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t pt-12 sm:pt-16 pb-8 border-[#292524] dark:border-[#2C2825] bg-[#1C1917] dark:bg-black text-[#E7E5E4] transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-10 sm:mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center mb-3 sm:mb-4 text-white">
              <Logo className="h-8 w-auto" />
            </div>
            <p className="text-xs text-[#A8A29E] leading-relaxed font-medium font-space-grotesk max-w-xs">
              AI-powered onboarding plans for your first 90 days.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-bold mb-3 sm:mb-4 uppercase tracking-wide font-space-grotesk text-white">
              Product
            </h4>
            <ul className="space-y-2 text-xs text-[#A8A29E] font-medium">
              <li>
                <Link href="/#features" className="hover:text-accent transition-colors font-space-grotesk inline-block py-1">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/#pricing" className="hover:text-accent transition-colors font-space-grotesk inline-block py-1">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/changelog" className="hover:text-accent transition-colors font-space-grotesk inline-block py-1">
                  Changelog
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold mb-3 sm:mb-4 uppercase tracking-wide font-space-grotesk text-white">
              Company
            </h4>
            <ul className="space-y-2 text-xs text-[#A8A29E] font-medium">
              <li>
                <Link href="/#methodology" className="hover:text-accent transition-colors font-space-grotesk inline-block py-1">
                  Methodology
                </Link>
              </li>
              <li>
                <a
                  href="mailto:hello@switchtoux.com"
                  className="hover:text-accent transition-colors font-space-grotesk inline-block py-1"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold mb-3 sm:mb-4 uppercase tracking-wide font-space-grotesk text-white">
              Legal
            </h4>
            <ul className="space-y-2 text-xs text-[#A8A29E] font-medium">
              <li>
                <Link href="/privacy" className="hover:text-accent transition-colors font-space-grotesk inline-block py-1">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-accent transition-colors font-space-grotesk inline-block py-1">
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4 pt-6 sm:pt-8 border-t border-[#292524] dark:border-[#2C2825]">
          <p className="text-xs font-medium font-space-grotesk text-[#78716C]">
            © 2026 Arcora. All rights reserved.
          </p>
          <a
            href="mailto:hello@switchtoux.com"
            className="text-xs font-medium font-space-grotesk text-[#A8A29E] hover:text-accent transition-colors"
          >
            hello@switchtoux.com
          </a>
        </div>
      </div>
    </footer>
  );
}
