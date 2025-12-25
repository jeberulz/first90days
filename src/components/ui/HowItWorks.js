import { Clock, Check, Coffee, FileText, Trophy } from "lucide-react";

export function HowItWorks() {
    return (
        <section className="border-white/5 border-t pt-32 pb-32 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-neutral-900/0 via-neutral-900/20 to-neutral-900/0 pointer-events-none"></div>
            <div className="max-w-6xl mx-auto px-6 relative">
                {/* Header */}
                <div className="text-center mb-24 relative z-10">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-wider font-medium text-neutral-400 mb-6 backdrop-blur-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        <span>How it works</span>
                    </div>
                    <h2 className="text-3xl md:text-5xl font-medium text-white tracking-tight mb-4">
                        Three Minutes Each Morning.
                        <span className="text-neutral-500">That's It.</span>
                    </h2>
                    <p className="text-sm text-neutral-400 max-w-lg mx-auto leading-relaxed font-light">
                        Micro-actions compound into massive career momentum. We handle the
                        planning; you handle the execution.
                    </p>
                </div>

                {/* Sticky Stack Container */}
                <div className="relative max-w-5xl mx-auto">
                    {/* Connector Line */}
                    <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-white/0 via-white/10 to-white/0 -translate-x-1/2 hidden md:block"></div>

                    {/* Step 1 */}
                    <div className="sticky top-24 mb-12 md:mb-32">
                        <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 md:p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-32 -mt-32 transition-opacity group-hover:opacity-100 opacity-50"></div>

                            <div className="grid md:grid-cols-2 gap-12 items-center relative z-10">
                                <div className="">
                                    <div className="flex items-center gap-4 mb-6">
                                        <span className="w-8 h-8 rounded-lg bg-neutral-900 border border-white/10 flex items-center justify-center text-sm font-medium text-white">
                                            1
                                        </span>
                                        <h3 className="text-xl font-medium text-white tracking-tight">
                                            Tell Us About Your Role
                                        </h3>
                                    </div>
                                    <p className="text-sm text-neutral-400 leading-relaxed mb-6">
                                        Sales? Engineering? Remote or in-office? We customize
                                        everything to your situation.
                                    </p>
                                    <div className="flex items-center gap-2 text-[10px] text-neutral-500 bg-neutral-900/50 w-fit px-2 py-1 rounded border border-white/5">
                                        <Clock className="w-3 h-3" />
                                        Time required: 5 minutes, one time
                                    </div>
                                </div>

                                {/* Visual Step 1 */}
                                <div className="bg-neutral-900/50 border border-white/5 rounded-xl p-4 md:p-6 relative">
                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <label className="text-[10px] uppercase font-medium text-neutral-500 tracking-wider">
                                                Role Title
                                            </label>
                                            <div className="h-9 w-full bg-[#050505] border border-white/10 rounded px-3 flex items-center text-xs text-white">
                                                Senior Product Manager
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-neutral-500 uppercase tracking-wider font-medium">
                                                Work Style
                                            </label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="h-8 bg-blue-500/10 border border-blue-500/20 rounded flex items-center justify-center text-[10px] text-blue-400 font-medium">
                                                    Remote
                                                </div>
                                                <div className="h-8 bg-[#050505] border border-white/10 rounded flex items-center justify-center text-[10px] text-neutral-500">
                                                    Hybrid
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] uppercase font-medium text-neutral-500 tracking-wider">
                                                DIRECT REPORT
                                            </label>
                                            <div className="h-2 bg-neutral-800 rounded-full w-full overflow-hidden">
                                                <div className="h-full bg-neutral-600 w-1/3 rounded-full"></div>
                                            </div>
                                            <div className="flex justify-between text-[9px] text-neutral-600">
                                                <span>None</span>
                                                <span>1-5</span>
                                                <span>5+</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="sticky top-28 mb-12 md:mb-32">
                        <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 md:p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-32 -mt-32 transition-opacity group-hover:opacity-100 opacity-50"></div>

                            <div className="grid md:grid-cols-2 gap-12 items-center relative z-10">
                                <div className="">
                                    <div className="flex items-center gap-4 mb-6">
                                        <span className="w-8 h-8 rounded-lg bg-neutral-900 border border-white/10 flex items-center justify-center text-sm font-medium text-white">
                                            2
                                        </span>
                                        <h3 className="text-xl font-medium text-white tracking-tight">
                                            Get Your Daily Tasks
                                        </h3>
                                    </div>
                                    <p className="text-sm text-neutral-400 leading-relaxed mb-6">
                                        Every morning at 8 AM, your phone buzzes. Three to five
                                        clear actions waiting for you. Each takes 15-60 minutes.
                                    </p>
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2 text-xs text-neutral-300">
                                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                                            "Schedule coffee with Sarah from Finance"
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-neutral-300">
                                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                                            "Read Q3 strategy deck before meeting"
                                        </div>
                                    </div>
                                </div>

                                {/* Visual Step 2 */}
                                <div className="relative flex justify-center">
                                    <div className="w-full max-w-[280px] bg-neutral-900 border border-white/10 rounded-2xl p-4 shadow-2xl animate-float">
                                        <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                                            <span className="text-[10px] text-neutral-500 font-medium">
                                                8:00 AM
                                            </span>
                                            <div className="flex gap-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-neutral-700"></div>
                                                <div className="w-1.5 h-1.5 rounded-full bg-neutral-700"></div>
                                            </div>
                                        </div>
                                        <div className="bg-[#050505] border border-white/5 rounded-lg p-3 mb-2 flex gap-3">
                                            <div className="w-8 h-8 rounded bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                                                <Coffee className="w-3.5 h-3.5" />
                                            </div>
                                            <div>
                                                <div className="text-[11px] font-medium text-white">
                                                    Coffee with Sarah
                                                </div>
                                                <div className="text-[9px] text-neutral-500">
                                                    Finance Lead • 30m
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-[#050505] border border-white/5 rounded-lg p-3 flex gap-3 opacity-60">
                                            <div className="w-8 h-8 rounded bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0">
                                                <FileText className="w-3.5 h-3.5" />
                                            </div>
                                            <div>
                                                <div className="text-[11px] font-medium text-white">
                                                    Strategy Review
                                                </div>
                                                <div className="text-[9px] text-neutral-500">
                                                    Q3 Goals Doc • 45m
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div className="sticky top-32 mb-12 md:mb-32">
                        <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 md:p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -mr-32 -mt-32 transition-opacity group-hover:opacity-100 opacity-50"></div>

                            <div className="grid md:grid-cols-2 gap-12 items-center relative z-10">
                                <div className="">
                                    <div className="flex items-center gap-4 mb-6">
                                        <span className="w-8 h-8 rounded-lg bg-neutral-900 border border-white/10 flex items-center justify-center text-sm font-medium text-white">
                                            3
                                        </span>
                                        <h3 className="text-xl font-medium text-white tracking-tight">
                                            Complete and Move Forward
                                        </h3>
                                    </div>
                                    <p className="text-sm text-neutral-400 leading-relaxed mb-6">
                                        Swipe right when done. Skip if you need to. The app adjusts.
                                        No guilt. No pressure. Just progress.
                                    </p>
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-800/50 border border-white/5">
                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                        <span className="text-[10px] text-neutral-300">
                                            Your plan evolves with you
                                        </span>
                                    </div>
                                </div>

                                {/* Visual Step 3 */}
                                <div className="h-48 relative flex items-center justify-center">
                                    {/* Card Background */}
                                    <div className="absolute w-64 h-24 bg-neutral-800/30 rounded-xl border border-white/5 scale-90 translate-y-4 blur-[1px]"></div>
                                    {/* Active Card */}
                                    <div className="absolute w-64 h-24 bg-[#050505] rounded-xl border border-white/10 p-4 shadow-xl flex items-center justify-between group-hover:translate-x-4 group-hover:rotate-2 transition-all duration-500 ease-out">
                                        <div className="flex gap-3 items-center">
                                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                                <Check className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="text-xs font-medium text-white">
                                                    Setup 1:1 with Manager
                                                </div>
                                                <div className="text-[10px] text-neutral-500">
                                                    High Impact • 30m
                                                </div>
                                            </div>
                                        </div>
                                        <div className="w-1 h-8 bg-neutral-800 rounded-full"></div>
                                    </div>
                                    {/* Success Indicator */}
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                                        <div className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border border-emerald-500/30 rotate-12">
                                            Done!
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Step 4 */}
                    <div className="sticky top-36">
                        <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 md:p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl -mr-32 -mt-32 transition-opacity group-hover:opacity-100 opacity-50"></div>

                            <div className="grid md:grid-cols-2 gap-12 items-center relative z-10">
                                <div className="">
                                    <div className="flex items-center gap-4 mb-6">
                                        <span className="w-8 h-8 rounded-lg bg-neutral-900 border border-white/10 flex items-center justify-center text-sm font-medium text-white">
                                            4
                                        </span>
                                        <h3 className="text-xl font-medium text-white tracking-tight">
                                            Reach Day 90 Confident
                                        </h3>
                                    </div>
                                    <p className="text-sm text-neutral-400 leading-relaxed mb-6">
                                        You've built relationships. You understand the company.
                                        You've delivered value. You're not just surviving—you're
                                        thriving.
                                    </p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="border-l-2 border-emerald-500 pl-3">
                                            <div className="text-lg font-semibold text-white">12</div>
                                            <div className="text-[10px] text-neutral-500">
                                                Key Relationships
                                            </div>
                                        </div>
                                        <div className="border-l-2 border-blue-500 pl-3">
                                            <div className="text-lg font-semibold text-white">3</div>
                                            <div className="text-[10px] text-neutral-500">
                                                Major Wins Delivered
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Visual Step 4 */}
                                <div className="relative flex items-center justify-center h-48">
                                    {/* Radar Chart / Success Badge */}
                                    <div className="relative w-32 h-32 flex items-center justify-center">
                                        <div
                                            className="absolute inset-0 border-2 border-dashed border-neutral-800 rounded-full animate-spin-slow"
                                            style={{ animationDuration: "10s" }}
                                        ></div>
                                        <div className="absolute inset-2 border border-white/5 rounded-full"></div>

                                        <div className="relative z-10 bg-gradient-to-tr from-emerald-500 to-teal-400 w-20 h-20 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)] animate-pulse-ring">
                                            <Trophy className="w-8 h-8 text-black" />
                                        </div>

                                        {/* Badge */}
                                        <div className="absolute -bottom-4 bg-neutral-900 border border-white/10 px-3 py-1 rounded-full shadow-xl">
                                            <span className="text-[10px] font-bold text-white tracking-wide uppercase">
                                                Onboarded
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
