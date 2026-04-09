import { Icon } from "@iconify/react";

export function HowItWorks() {
  return (
    <section className="py-32 relative border-t border-[#D1CDC7] dark:border-[#2C2825] transition-colors duration-300 bg-white dark:bg-[#0F0E0D]">
      <div className="max-w-6xl mx-auto px-6 relative">
        <div className="text-center mb-24 relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-[10px] uppercase tracking-wider font-bold text-accent mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span className="font-space-grotesk">How it works</span>
          </div>
          <h2 className="text-3xl md:text-5xl tracking-tight mb-4 font-instrument-serif font-normal text-[#1C1917] dark:text-white">
            Three Minutes Each Morning.
            <span className="ml-2 font-instrument-serif font-normal text-[#A8A29E]">
              That&apos;s It.
            </span>
          </h2>
          <p className="text-sm text-[#57534E] dark:text-[#A8A29E] max-w-lg mx-auto leading-relaxed font-normal font-space-grotesk">
            Micro-actions compound into massive career momentum. We handle the planning; you handle
            the execution.
          </p>
        </div>

        <div className="relative max-w-5xl mx-auto">
          <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b -translate-x-1/2 hidden md:block from-[#E7E5E4] dark:from-[#292524] via-[#D1CDC7] dark:via-[#44403C] to-[#E7E5E4] dark:to-[#292524]" />

          {/* Step 1 */}
          <div className="sticky top-24 mb-12 md:mb-32">
            <div className="md:p-10 overflow-hidden group dark:bg-[#1C1917] dark:border-[#2C2825] bg-white border-[#E7E5E4] border rounded-2xl pt-6 pr-6 pb-6 pl-6 relative shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] backdrop-blur-xl">
              <div className="grid md:grid-cols-2 gap-12 items-center relative z-10">
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <span className="w-8 h-8 rounded-lg bg-[#F5F2E8] dark:bg-[#0F0E0D] border flex items-center justify-center text-sm font-semibold shadow-sm font-space-grotesk border-[#E7E5E4] dark:border-[#2C2825] text-[#1C1917] dark:text-white">
                      1
                    </span>
                    <h3 className="text-xl font-medium tracking-tight font-space-grotesk text-[#1C1917] dark:text-white">
                      Tell Us About Your Role
                    </h3>
                  </div>
                  <p className="text-sm text-[#57534E] dark:text-[#A8A29E] leading-relaxed mb-6 font-space-grotesk">
                    Sales? Engineering? Remote or in-office? We customize everything to your
                    situation.
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-[#78716C] dark:text-[#A8A29E] w-fit px-3 py-1.5 rounded-full border font-medium font-space-grotesk bg-[#FAF9F6] dark:bg-[#292524] border-[#E7E5E4] dark:border-[#44403C]">
                    <Icon icon="solar:clock-circle-linear" className="text-[#A8A29E]" width={12} height={12} />
                    Time required: 5 minutes, one time
                  </div>
                </div>
                <div className="bg-[#F5F2E8]/50 dark:bg-[#0F0E0D]/50 border rounded-xl p-6 relative shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] border-[#E7E5E4] dark:border-[#2C2825] backdrop-blur-sm">
                  <div className="absolute top-4 right-4 flex gap-1.5 opacity-40">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#A8A29E]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#E7E5E4] dark:bg-[#44403C]" />
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-semibold tracking-wider font-space-grotesk text-[#78716C] dark:text-[#A8A29E] flex items-center gap-2">
                        Role Title
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Icon
                            icon="solar:user-linear"
                            width={14}
                            height={14}
                            className="text-[#A8A29E] group-hover:text-accent transition-colors"
                          />
                        </div>
                        <div className="h-10 w-full border rounded-lg pl-9 pr-3 flex items-center text-xs font-medium shadow-sm font-space-grotesk dark:bg-[#1C1917] border-[#E7E5E4] dark:border-[#2C2825] text-[#1C1917] dark:text-white bg-white group-hover:border-accent/30 transition-colors cursor-text">
                          Senior Product Manager
                        </div>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <Icon icon="solar:check-circle-bold" width={14} height={14} className="text-emerald-500" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-wider font-semibold font-space-grotesk text-[#78716C] dark:text-[#A8A29E]">
                        Work Style
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="relative h-16 bg-gradient-to-b from-accent/5 to-accent/10 border border-accent rounded-lg flex flex-col items-center justify-center text-accent shadow-sm cursor-pointer hover:shadow-md transition-all">
                          <div className="absolute top-2 right-2">
                            <Icon icon="solar:check-circle-bold" width={10} height={10} />
                          </div>
                          <Icon icon="solar:monitor-smartphone-linear" width={16} height={16} className="mb-1.5 opacity-80" />
                          <span className="text-[10px] font-semibold font-space-grotesk">Remote</span>
                        </div>
                        <div className="h-16 border rounded-lg flex flex-col items-center justify-center text-[#78716C] dark:text-[#A8A29E] transition-all font-space-grotesk dark:bg-[#1C1917] border-[#E7E5E4] dark:border-[#2C2825] hover:bg-white dark:hover:bg-[#292524] hover:border-accent/30 bg-[#FAF9F6] cursor-pointer hover:text-[#1C1917] dark:hover:text-white">
                          <Icon
                            icon="solar:laptop-minimalistic-linear"
                            width={16}
                            height={16}
                            className="mb-1.5 opacity-50"
                          />
                          <span className="text-[10px] font-medium">Hybrid</span>
                        </div>
                      </div>
                    </div>
                    <div className="pt-2">
                      <div className="flex justify-between text-[10px] uppercase font-semibold tracking-wider mb-4 text-[#A8A29E] items-center">
                        <span className="font-space-grotesk">Direct Reports</span>
                        <div className="flex items-center gap-1.5 bg-white dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#2C2825] rounded px-2 py-1 shadow-sm">
                          <span className="font-mono font-medium text-[#1C1917] dark:text-white text-[10px]">
                            1-5
                          </span>
                        </div>
                      </div>
                      <div className="relative h-5 flex items-center cursor-pointer group select-none">
                        <div className="absolute w-full h-1.5 bg-[#F5F5F4] dark:bg-[#1C1917] rounded-full border border-[#E7E5E4] dark:border-[#2C2825] overflow-hidden">
                          <div className="h-full bg-accent w-[28%] rounded-full" />
                        </div>
                        <div className="absolute left-[28%] w-5 h-5 bg-white dark:bg-[#292524] border border-[#E7E5E4] dark:border-[#44403C] rounded-full shadow-md flex items-center justify-center transform -translate-x-1/2 group-hover:scale-110 transition-transform z-10 group-hover:border-accent/50">
                          <div className="w-1.5 h-1.5 bg-accent rounded-full shadow-sm" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="sticky top-28 mb-12 md:mb-32">
            <div className="border rounded-2xl p-6 md:p-10 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] backdrop-blur-xl relative overflow-hidden group dark:bg-[#1C1917] border-[#E7E5E4] dark:border-[#2C2825] bg-white">
              <div className="grid md:grid-cols-2 gap-12 items-center relative z-10">
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <span className="w-8 h-8 rounded-lg bg-[#F5F2E8] dark:bg-[#0F0E0D] border flex items-center justify-center text-sm font-bold shadow-sm font-space-grotesk border-[#E7E5E4] dark:border-[#2C2825] text-[#1C1917] dark:text-white">
                      2
                    </span>
                    <h3 className="text-xl font-semibold tracking-tight font-space-grotesk text-[#1C1917] dark:text-white">
                      Get Your Daily Tasks
                    </h3>
                  </div>
                  <p className="text-sm text-[#57534E] dark:text-[#A8A29E] leading-relaxed mb-6 font-space-grotesk">
                    Every morning at 8 AM, your phone buzzes. Three to five clear actions waiting for
                    you. Each takes 15-60 minutes.
                  </p>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-xs font-medium font-space-grotesk text-[#57534E] dark:text-[#A8A29E]">
                      <Icon icon="solar:check-circle-bold" className="text-emerald-500" width={14} height={14} />
                      &quot;Schedule coffee with Sarah from Finance&quot;
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium font-space-grotesk text-[#57534E] dark:text-[#A8A29E]">
                      <Icon icon="solar:check-circle-bold" className="text-emerald-500" width={14} height={14} />
                      &quot;Read Q3 strategy deck before meeting&quot;
                    </div>
                  </div>
                </div>
                <div className="relative flex justify-center">
                  <div className="w-full max-w-[280px] border rounded-2xl p-4 shadow-xl animate-float dark:bg-[#1C1917] border-[#E7E5E4] dark:border-[#2C2825] bg-white">
                    <div className="flex items-center justify-between mb-4 border-b pb-3 border-[#F5F5F4] dark:border-[#2C2825]">
                      <span className="text-[10px] font-bold font-space-grotesk text-[#A8A29E]">8:00 AM</span>
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#E7E5E4] dark:bg-[#44403C]" />
                        <div className="w-1.5 h-1.5 rounded-full bg-[#E7E5E4] dark:bg-[#44403C]" />
                      </div>
                    </div>
                    <div className="bg-[#F5F2E8] dark:bg-[#0F0E0D] border rounded-xl p-3 mb-2 flex gap-3 shadow-sm hover:border-accent/20 transition-colors border-[#E7E5E4] dark:border-[#2C2825]">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30 bg-blue-50 text-blue-600 border-blue-100">
                        <Icon icon="solar:cup-hot-linear" width={14} height={14} />
                      </div>
                      <div>
                        <div className="text-[11px] font-bold font-space-grotesk text-[#1C1917] dark:text-white">
                          Coffee with Sarah
                        </div>
                        <div className="text-[9px] text-[#78716C] dark:text-[#A8A29E] font-medium font-space-grotesk">
                          Finance Lead • 30m
                        </div>
                      </div>
                    </div>
                    <div className="border rounded-xl p-3 flex gap-3 opacity-60 dark:bg-[#0F0E0D] border-[#E7E5E4] dark:border-[#2C2825] bg-white">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-900/30 bg-purple-50 text-purple-600 border-purple-100">
                        <Icon icon="solar:document-text-linear" width={14} height={14} />
                      </div>
                      <div>
                        <div className="text-[11px] font-bold font-space-grotesk text-[#1C1917] dark:text-white">
                          Strategy Review
                        </div>
                        <div className="text-[9px] text-[#78716C] dark:text-[#A8A29E] font-medium font-space-grotesk">
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
            <div className="border rounded-2xl p-6 md:p-10 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] backdrop-blur-xl relative overflow-hidden group dark:bg-[#1C1917] border-[#E7E5E4] dark:border-[#2C2825] bg-white">
              <div className="grid md:grid-cols-2 gap-12 items-center relative z-10">
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <span className="w-8 h-8 rounded-lg bg-[#F5F2E8] dark:bg-[#0F0E0D] border flex items-center justify-center text-sm font-bold shadow-sm font-space-grotesk border-[#E7E5E4] dark:border-[#2C2825] text-[#1C1917] dark:text-white">
                      3
                    </span>
                    <h3 className="text-xl font-semibold tracking-tight font-space-grotesk text-[#1C1917] dark:text-white">
                      Complete and Move Forward
                    </h3>
                  </div>
                  <p className="text-sm text-[#57534E] dark:text-[#A8A29E] leading-relaxed mb-6 font-space-grotesk">
                    Swipe right when done. Skip if you need to. The app adjusts. No guilt. No
                    pressure. Just progress.
                  </p>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border dark:bg-emerald-900/20 dark:border-emerald-900/30 bg-emerald-50 border-emerald-100">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-medium font-space-grotesk dark:text-emerald-400 text-emerald-800">
                      Your plan evolves with you
                    </span>
                  </div>
                </div>
                <div className="h-48 relative flex items-center justify-center">
                  <div className="absolute w-64 h-24 rounded-xl border scale-90 translate-y-4 blur-[1px] bg-[#F5F5F4] dark:bg-[#292524] border-[#E7E5E4] dark:border-[#44403C]" />
                  <div className="absolute w-64 h-24 rounded-xl border p-4 shadow-lg flex items-center justify-between group-hover:translate-x-4 group-hover:rotate-2 transition-all duration-500 ease-out z-10 dark:bg-[#0F0E0D] border-[#E7E5E4] dark:border-[#2C2825] bg-white">
                    <div className="flex gap-3 items-center">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center border dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30 bg-emerald-50 text-emerald-600 border-emerald-100">
                        <Icon icon="solar:check-read-linear" width={16} height={16} />
                      </div>
                      <div>
                        <div className="text-xs font-bold font-space-grotesk text-[#1C1917] dark:text-white">
                          Setup 1:1 with Manager
                        </div>
                        <div className="text-[10px] text-[#78716C] dark:text-[#A8A29E] font-medium font-space-grotesk">
                          High Impact • 30m
                        </div>
                      </div>
                    </div>
                    <div className="w-1 h-8 rounded-full bg-[#F5F5F4] dark:bg-[#292524]" />
                  </div>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100 z-20">
                    <div className="bg-emerald-500 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide border rotate-12 shadow-lg transform translate-x-4 font-space-grotesk text-white border-emerald-600">
                      Done!
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="sticky top-36">
            <div className="border rounded-2xl p-6 md:p-10 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] backdrop-blur-xl relative overflow-hidden group dark:bg-[#1C1917] border-[#E7E5E4] dark:border-[#2C2825] bg-white">
              <div className="grid md:grid-cols-2 gap-12 items-center relative z-10">
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <span className="w-8 h-8 rounded-lg bg-[#F5F2E8] dark:bg-[#0F0E0D] border flex items-center justify-center text-sm font-bold shadow-sm font-space-grotesk border-[#E7E5E4] dark:border-[#2C2825] text-[#1C1917] dark:text-white">
                      4
                    </span>
                    <h3 className="text-xl font-semibold tracking-tight font-space-grotesk text-[#1C1917] dark:text-white">
                      Reach Day 90 Confident
                    </h3>
                  </div>
                  <p className="text-sm text-[#57534E] dark:text-[#A8A29E] leading-relaxed mb-6 font-space-grotesk">
                    You&apos;ve built relationships. You understand the company. You&apos;ve delivered
                    value. You&apos;re not just surviving—you&apos;re thriving.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border-l-2 border-emerald-500 pl-3">
                      <div className="text-lg font-bold font-space-grotesk text-[#1C1917] dark:text-white">12</div>
                      <div className="text-[10px] text-[#78716C] dark:text-[#A8A29E] font-medium font-space-grotesk">
                        Key Relationships
                      </div>
                    </div>
                    <div className="border-l-2 border-blue-500 pl-3">
                      <div className="text-lg font-bold font-space-grotesk text-[#1C1917] dark:text-white">3</div>
                      <div className="text-[10px] text-[#78716C] dark:text-[#A8A29E] font-medium font-space-grotesk">
                        Major Wins Delivered
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative flex items-center justify-center h-48">
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <div
                      className="absolute inset-0 border-2 border-dashed rounded-full animate-spin-slow border-[#D1CDC7] dark:border-[#44403C]"
                      style={{ animationDuration: "10s" }}
                    />
                    <div className="absolute inset-2 border rounded-full border-[#E7E5E4] dark:border-[#292524] dark:bg-[#0F0E0D] bg-white" />
                    <div className="relative z-10 bg-gradient-to-tr from-accent w-20 h-20 rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(217,119,87,0.4)] to-orange-400">
                      <Icon icon="solar:cup-first-linear" className="text-white" width={32} height={32} />
                    </div>
                    <div className="absolute -bottom-4 border px-4 py-1.5 rounded-full shadow-xl bg-[#1C1917] dark:bg-white border-[#1C1917] dark:border-white">
                      <span className="text-[10px] font-bold tracking-wide uppercase font-space-grotesk dark:text-[#1C1917] text-white">
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
