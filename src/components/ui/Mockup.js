import { Layers, Target, Share } from "lucide-react";

export function Mockup() {
  return (
    <div
      className="relative mt-24 max-w-7xl mx-auto px-6 animate-fade-up"
      style={{ animationDelay: "0.4s" }}
    >
      {/* Section Header */}
      <div className="text-center mb-16">
        <Layers className="w-8 h-8 text-terracotta mx-auto mb-4" />
        <h2 className="text-4xl font-serif text-charcoal dark:text-cream-50">
          The AI for career momentum
        </h2>
      </div>

      <div className="relative h-[600px] w-full isolate flex justify-center">
        {/* Left Floating Card */}
        <div className="absolute left-0 md:left-10 top-20 w-[280px] bg-white dark:bg-[#252420] rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 transform -rotate-2 hidden md:block z-10 border border-black/5 dark:border-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-terracotta/10 flex items-center justify-center text-terracotta">
              <Target className="w-4 h-4" />
            </div>
            <span className="font-serif text-lg">Q3 Goals</span>
          </div>
          <div className="space-y-3">
            <div className="h-2 bg-cream-200 dark:bg-white/10 rounded-full w-3/4" />
            <div className="h-2 bg-cream-200 dark:bg-white/10 rounded-full w-full" />
            <div className="h-2 bg-cream-200 dark:bg-white/10 rounded-full w-5/6" />
          </div>
        </div>

        {/* Right Floating Card */}
        <div className="absolute right-0 md:right-10 top-32 w-[280px] bg-white dark:bg-[#252420] rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 transform rotate-2 hidden md:block z-10 border border-black/5 dark:border-white/5">
          <div className="flex items-center justify-between mb-4">
            <span className="font-serif text-lg">Velocity</span>
            <span className="text-xs px-2 py-1 rounded-full text-green-600 bg-green-50">
              +24%
            </span>
          </div>
          <div className="flex items-end gap-2 h-24">
            <div className="w-1/4 bg-cream-200 dark:bg-white/10 h-[40%] rounded-t-sm" />
            <div className="w-1/4 bg-cream-200 dark:bg-white/10 h-[60%] rounded-t-sm" />
            <div className="w-1/4 bg-cream-200 dark:bg-white/10 h-[50%] rounded-t-sm" />
            <div className="w-1/4 bg-terracotta h-[80%] rounded-t-sm" />
          </div>
        </div>

        {/* Main Center Interface */}
        <div className="absolute top-0 w-[95%] max-w-3xl bg-white dark:bg-[#252420] rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden z-20 border border-black/5 dark:border-white/5 flex flex-col h-[500px]">
          {/* Window Header */}
          <div className="h-14 border-b border-cream-200 dark:border-white/5 flex items-center px-6 justify-between bg-white dark:bg-[#252420]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
              <div className="w-3 h-3 rounded-full bg-green-400/80" />
            </div>
            <div className="font-serif text-lg text-charcoal dark:text-cream-50">
              Product_Launch_Plan.pdf
            </div>
            <div className="text-charcoal/40">
              <Share className="w-4 h-4" />
            </div>
          </div>

          {/* Document Content */}
          <div className="flex-1 p-8 md:p-12 overflow-y-auto bg-white dark:bg-[#252420] relative">
            <div className="max-w-xl mx-auto">
              <h2 className="text-3xl font-serif mb-6 text-charcoal dark:text-cream-50">
                First 90 Days: Strategic Roadmap
              </h2>

              <div className="mb-8 p-4 bg-cream-100 dark:bg-white/5 rounded-xl border border-cream-200 dark:border-white/5">
                <h3 className="text-sm font-bold uppercase tracking-wide text-terracotta mb-2">
                  Executive Summary
                </h3>
                <p className="text-sm text-charcoal/70 dark:text-cream-200/70 leading-relaxed">
                  Focus heavily on stakeholder alignment in the first 30 days. By
                  day 60, shift to execution on the mobile MVP. Day 90 goal is
                  full autonomy.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-xl font-serif mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-charcoal text-xs flex items-center justify-center font-sans text-white">
                      1
                    </span>
                    Day 1-30: Absorb &amp; Connect
                  </h4>
                  <ul className="ml-2 pl-4 border-l border-cream-200 dark:border-white/10 space-y-3">
                    <li className="flex items-start gap-3 group cursor-pointer">
                      <div className="mt-0.5 w-4 h-4 rounded border border-charcoal/30 flex items-center justify-center group-hover:border-terracotta transition-colors" />
                      <span className="text-sm text-charcoal/80 dark:text-cream-200/80">
                        Interview 5 key engineering leads
                      </span>
                    </li>
                    <li className="flex items-start gap-3 group cursor-pointer">
                      <div className="mt-0.5 w-4 h-4 rounded border border-charcoal/30 flex items-center justify-center group-hover:border-terracotta transition-colors" />
                      <span className="text-sm text-charcoal/80 dark:text-cream-200/80">
                        Audit Mixpanel retention funnels
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="opacity-60">
                  <h4 className="text-xl font-serif mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-charcoal/10 text-charcoal text-xs flex items-center justify-center font-sans">
                      2
                    </span>
                    Day 31-60: Build &amp; Ship
                  </h4>
                  <div className="h-2 bg-cream-100 dark:bg-white/5 rounded-full w-full mb-2" />
                  <div className="h-2 bg-cream-100 dark:bg-white/5 rounded-full w-2/3" />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Fade */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white dark:from-[#252420] to-transparent pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
