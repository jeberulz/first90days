import { Briefcase, ArrowRight } from "lucide-react";

export function Hero() {
    return (
        <div className="max-w-4xl mx-auto px-6 text-center animate-fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] text-neutral-300 mb-8 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Now supporting Product & Engineering roles</span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-medium text-white tracking-tight leading-[1.1] mb-6">
                Your first 90 days,
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-neutral-200 via-neutral-400 to-neutral-600">
                    engineered for impact.
                </span>
            </h1>

            <p className="text-sm md:text-base text-neutral-400 max-w-xl mx-auto leading-relaxed mb-10 font-light">
                Stop guessing expectations. Generate a comprehensive, role-specific
                30-60-90 day plan instantly using AI. Align with your manager and hit
                the ground running.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <div className="relative group w-full sm:w-auto">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-white/20 to-white/10 rounded-full blur opacity-50 group-hover:opacity-75 transition"></div>
                    <div className="relative flex items-center bg-neutral-900 rounded-full p-1 pr-2 w-full sm:w-80 border border-white/10">
                        <span className="pl-4 pr-2 text-neutral-500">
                            <Briefcase className="w-4 h-4" />
                        </span>
                        <input
                            type="text"
                            placeholder="e.g. Senior Product Designer"
                            className="bg-transparent border-none outline-none text-xs text-white placeholder-neutral-600 w-full h-8 focus:ring-0"
                        />
                        <div className="hidden sm:block text-[10px] text-neutral-600 border border-white/10 px-2 py-0.5 rounded bg-neutral-800">
                            ⌘K
                        </div>
                    </div>
                </div>
                <button className="w-full sm:w-auto bg-white text-black h-10 px-6 rounded-full text-xs font-medium hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2">
                    Create Roadmap
                    <ArrowRight className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}
