import Link from "next/link";
import { Sparkles, Twitter, Github, Linkedin } from "lucide-react";

export function Footer() {
    return (
        <footer className="border-t border-white/5 bg-[#050505] pt-16 pb-8">
            <div className="max-w-6xl mx-auto px-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                    <div className="col-span-2 md:col-span-1">
                        <div className="flex items-center gap-2 mb-4">
                            <Sparkles className="w-4 h-4 text-white" />
                            <span className="text-white font-medium tracking-tight text-sm">
                                First90
                            </span>
                        </div>
                        <p className="text-[11px] text-neutral-500 leading-relaxed">
                            AI-powered career planning for the modern professional.
                        </p>
                    </div>
                    <div>
                        <h4 className="text-xs font-medium text-white mb-4">Product</h4>
                        <ul className="space-y-2 text-[11px] text-neutral-500">
                            <li>
                                <Link href="#" className="hover:text-neutral-300">
                                    Features
                                </Link>
                            </li>
                            <li>
                                <Link href="#" className="hover:text-neutral-300">
                                    Integration
                                </Link>
                            </li>
                            <li>
                                <Link href="#" className="hover:text-neutral-300">
                                    Pricing
                                </Link>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-xs font-medium text-white mb-4">Resources</h4>
                        <ul className="space-y-2 text-[11px] text-neutral-500">
                            <li>
                                <Link href="#" className="hover:text-neutral-300">
                                    Methodology
                                </Link>
                            </li>
                            <li>
                                <Link href="#" className="hover:text-neutral-300">
                                    Career Guides
                                </Link>
                            </li>
                            <li>
                                <Link href="#" className="hover:text-neutral-300">
                                    Blog
                                </Link>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-xs font-medium text-white mb-4">Legal</h4>
                        <ul className="space-y-2 text-[11px] text-neutral-500">
                            <li>
                                <Link href="#" className="hover:text-neutral-300">
                                    Privacy
                                </Link>
                            </li>
                            <li>
                                <Link href="#" className="hover:text-neutral-300">
                                    Terms
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>
                <div className="flex items-center justify-between pt-8 border-t border-white/5">
                    <p className="text-[10px] text-neutral-600">
                        © 2024 First90 Inc. All rights reserved.
                    </p>
                    <div className="flex gap-4 text-neutral-600">
                        <Twitter className="w-3.5 h-3.5 hover:text-white cursor-pointer transition" />
                        <Github className="w-3.5 h-3.5 hover:text-white cursor-pointer transition" />
                        <Linkedin className="w-3.5 h-3.5 hover:text-white cursor-pointer transition" />
                    </div>
                </div>
            </div>
        </footer>
    );
}
