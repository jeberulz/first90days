import Link from "next/link";
import { Icon } from "@iconify/react";

export function Footer() {
  return (
    <footer className="border-t pt-16 pb-8 border-[#292524] dark:border-[#2C2825] bg-[#1C1917] dark:bg-black text-[#E7E5E4] transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Icon icon="solar:stars-minimalistic-linear" className="text-accent" width={16} height={16} />
              <span className="font-semibold tracking-tight text-sm font-space-grotesk text-white">
                First90
              </span>
            </div>
            <p className="text-[11px] text-[#A8A29E] leading-relaxed font-medium font-space-grotesk">
              AI-powered career planning for the modern professional.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-bold mb-4 uppercase tracking-wide font-space-grotesk text-white">
              Product
            </h4>
            <ul className="space-y-2 text-[11px] text-[#A8A29E] font-medium">
              <li>
                <Link href="#" className="hover:text-accent transition-colors font-space-grotesk">
                  Features
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-accent transition-colors font-space-grotesk">
                  Integration
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold mb-4 uppercase tracking-wide font-space-grotesk text-white">
              Resources
            </h4>
            <ul className="space-y-2 text-[11px] text-[#A8A29E] font-medium">
              <li>
                <Link href="#" className="hover:text-accent transition-colors font-space-grotesk">
                  Methodology
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-accent transition-colors font-space-grotesk">
                  Career Guides
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold mb-4 uppercase tracking-wide font-space-grotesk text-white">
              Legal
            </h4>
            <ul className="space-y-2 text-[11px] text-[#A8A29E] font-medium">
              <li>
                <Link href="#" className="hover:text-accent transition-colors font-space-grotesk">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-accent transition-colors font-space-grotesk">
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="flex items-center justify-between pt-8 border-t border-[#292524] dark:border-[#2C2825]">
          <p className="text-[10px] font-medium font-space-grotesk text-[#78716C]">
            © 2024 First90 Inc. All rights reserved.
          </p>
          <div className="flex gap-4 text-[#A8A29E]">
            <a href="#" className="hover:text-accent transition-colors" aria-label="Twitter">
              <Icon icon="ri:twitter-x-line" width={14} height={14} />
            </a>
            <a href="#" className="hover:text-accent transition-colors" aria-label="GitHub">
              <Icon icon="ri:github-line" width={14} height={14} />
            </a>
            <a href="#" className="hover:text-accent transition-colors" aria-label="LinkedIn">
              <Icon icon="ri:linkedin-line" width={14} height={14} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
