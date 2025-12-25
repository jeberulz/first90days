import Link from "next/link";
import { Sparkles } from "lucide-react";

export function Navbar() {
    return (
        <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#050505]/80 backdrop-blur-md">
            <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-[18px] h-[18px] text-white" />
                    <span className="text-white font-medium tracking-tight text-sm">
                        First90
                    </span>
                </div>

                <div className="hidden md:flex items-center gap-8 text-xs font-medium">
                    <Link href="#" className="hover:text-white transition-colors">
                        Methodology
                    </Link>
                    <Link href="#" className="hover:text-white transition-colors">
                        Examples
                    </Link>
                    <Link href="#" className="hover:text-white transition-colors">
                        Pricing
                    </Link>
                </div>

                <div className="flex items-center gap-4">
                    <Link
                        href="#"
                        className="text-xs font-medium hover:text-white transition-colors hidden sm:block"
                    >
                        Log in
                    </Link>
                    <button className="bg-white text-black text-xs font-medium px-4 py-2 rounded-full hover:bg-neutral-200 transition-all">
                        Generate Plan
                    </button>
                </div>
            </div>
        </nav>
    );
}
