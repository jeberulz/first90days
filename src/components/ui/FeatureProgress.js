import { Icon } from "@iconify/react";
import { VelocityBurnupChart } from "@/components/ui/VelocityBurnupChart";

export function FeatureProgress() {
  return (
    <div className="w-full relative overflow-hidden bg-[#F5F5F4] dark:bg-[#0F0E0D] border-t border-[#D1CDC7] dark:border-[#2C2825] transition-colors duration-300 group/section">
      <div className="absolute inset-0 bg-grid-pattern opacity-100 dark:opacity-20 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-accent/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3 pointer-events-none" />

      <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 md:px-12 py-16 sm:py-24 lg:py-32 relative z-10">
        <div className="grid lg:grid-cols-12 gap-8 sm:gap-12 lg:gap-24 items-start min-w-0">
          <div className="lg:col-span-4 lg:sticky lg:top-32 lg:pt-8 min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/20 bg-accent/5 text-[10px] uppercase tracking-wider font-bold text-accent mb-6 sm:mb-8 font-space-grotesk">
              <Icon icon="solar:graph-up-linear" width={12} height={12} />
              Visual Velocity
            </div>
            <h2 className="t-display-lg tracking-tight mb-5 sm:mb-6 text-[#1C1917] dark:text-white">
              Prove your impact{" "}
              <span className="text-[#78716C] dark:text-[#A8A29E]">with data.</span>
            </h2>
            <p className="text-base sm:text-lg text-[#57534E] dark:text-[#D6D3D1] leading-relaxed mb-8 sm:mb-10 font-space-grotesk font-light">
              Don&apos;t just say you&apos;re ramping up—show it. Visual progress indicators for 30, 60, and
              90-day milestones help you communicate your velocity to leadership in a language they
              understand.
            </p>
            <div className="space-y-6 font-space-grotesk">
              <div className="flex gap-4 group cursor-pointer">
                <div className="w-10 h-10 rounded-full dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#2C2825] flex items-center justify-center shrink-0 shadow-sm group-hover:border-accent transition-colors bg-white">
                  <Icon icon="solar:chart-2-linear" width={18} height={18} className="text-accent" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#1C1917] dark:text-white mb-1 group-hover:text-accent transition-colors">
                    Automated Reports
                  </h4>
                  <p className="text-xs text-[#57534E] dark:text-[#A8A29E] leading-relaxed">
                    Weekly summaries generated automatically from your completed tasks.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 group cursor-pointer">
                <div className="w-10 h-10 rounded-full dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#2C2825] flex items-center justify-center shrink-0 shadow-sm group-hover:border-accent transition-colors bg-white">
                  <Icon icon="solar:round-arrow-up-linear" width={18} height={18} className="text-accent" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#1C1917] dark:text-white mb-1 group-hover:text-accent transition-colors">
                    Velocity Tracking
                  </h4>
                  <p className="text-xs text-[#57534E] dark:text-[#A8A29E] leading-relaxed">
                    Compare your actual progress against the planned trajectory.
                  </p>
                </div>
              </div>
              <div className="pt-6">
                <button
                  type="button"
                  className="flex items-center gap-2 text-sm font-semibold text-[#1C1917] dark:text-white hover:text-accent transition-colors group/btn"
                >
                  Start tracking now
                  <Icon
                    icon="solar:arrow-right-linear"
                    width={16}
                    height={16}
                    className="group-hover/btn:translate-x-1 transition-transform"
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 w-full relative z-20 min-w-0 overflow-hidden">
            <div className="absolute -inset-1 bg-gradient-to-r from-accent/30 to-purple-500/20 rounded-[2rem] blur-2xl opacity-0 group-hover/section:opacity-100 transition-opacity duration-700" />
            <div className="relative dark:bg-[#1C1917] rounded-2xl border border-[#E7E5E4] dark:border-[#2C2825] shadow-2xl overflow-hidden min-h-0 sm:min-h-[500px] md:min-h-[600px] flex flex-col transition-all duration-500 group-hover/section:shadow-[0_50px_100px_-20px_rgba(0,0,0,0.2)] bg-white">
              <div className="min-h-[4rem] border-b border-[#E7E5E4] dark:border-[#2C2825] bg-[#FAF9F6] dark:bg-[#292524] px-3 sm:px-6 flex items-center justify-between shrink-0 flex-wrap gap-2 py-2 sm:py-0 sm:h-16">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="hidden sm:flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#E7E5E4] dark:bg-[#44403C]" />
                    <div className="w-3 h-3 rounded-full bg-[#E7E5E4] dark:bg-[#44403C]" />
                    <div className="w-3 h-3 rounded-full bg-[#E7E5E4] dark:bg-[#44403C]" />
                  </div>
                  <div className="hidden sm:block h-6 w-px bg-[#E7E5E4] dark:bg-[#44403C]" />
                  <h3 className="font-space-grotesk font-semibold text-sm text-[#1C1917] dark:text-white flex items-center gap-2">
                    Performance Velocity
                    <span className="px-2 py-0.5 rounded-full bg-[#F5F2E8] dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#44403C] text-[10px] text-[#57534E] dark:text-[#A8A29E] font-medium">
                      Q3 2024
                    </span>
                  </h3>
                </div>
                <div className="flex bg-[#E7E5E4] dark:bg-[#0F0E0D] p-1 rounded-lg border border-[#E7E5E4] dark:border-[#2C2825]">
                  <button
                    type="button"
                    className="px-3 py-1 rounded-md dark:bg-[#292524] shadow-sm text-[10px] font-bold text-[#1C1917] dark:text-white font-space-grotesk transition-all bg-white"
                  >
                    Overview
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1 rounded-md text-[10px] font-medium text-[#78716C] dark:text-[#A8A29E] font-space-grotesk hover:text-[#1C1917] dark:hover:text-white transition-all"
                  >
                    Deep Dive
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1 rounded-md text-[10px] font-medium text-[#78716C] dark:text-[#A8A29E] font-space-grotesk hover:text-[#1C1917] dark:hover:text-white transition-all"
                  >
                    Settings
                  </button>
                </div>
              </div>

              <div className="p-3 sm:p-6 md:p-8 grid grid-cols-12 gap-4 sm:gap-6 bg-[#FAF9F6] dark:bg-[#1C1917] flex-1 overflow-y-auto">
                <div className="col-span-12 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
                  <div className="dark:bg-[#292524] p-3 sm:p-5 rounded-xl border border-[#E7E5E4] dark:border-[#44403C] shadow-sm hover:border-accent/30 transition-colors group/stat bg-white">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] uppercase font-bold text-[#A8A29E] tracking-wider">
                        Completion Rate
                      </span>
                      <span className="text-xs font-bold dark:text-emerald-400 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full border dark:border-emerald-900/30 text-emerald-600 bg-emerald-50 border-emerald-100">
                        +12%
                      </span>
                    </div>
                    <div className="text-3xl font-bold font-space-grotesk text-[#1C1917] dark:text-white mb-1">
                      64<span className="text-lg text-[#A8A29E] font-normal">/90</span>
                    </div>
                    <div className="w-full bg-[#F5F5F4] dark:bg-[#1C1917] h-1.5 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 w-[71%] rounded-full group-hover/stat:w-[75%] transition-all duration-1000" />
                    </div>
                  </div>
                  <div className="dark:bg-[#292524] p-3 sm:p-5 rounded-xl border border-[#E7E5E4] dark:border-[#44403C] shadow-sm hover:border-accent/30 transition-colors group/stat bg-white">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] uppercase font-bold text-[#A8A29E] tracking-wider">
                        Velocity Score
                      </span>
                      <Icon icon="solar:bolt-linear" width={14} height={14} className="text-accent" />
                    </div>
                    <div className="text-3xl font-bold font-space-grotesk text-[#1C1917] dark:text-white mb-1">
                      High
                    </div>
                    <p className="text-[10px] text-[#78716C] dark:text-[#A8A29E] leading-tight">
                      Trending 15% above peer benchmark.
                    </p>
                  </div>
                  <div className="dark:bg-[#292524] p-3 sm:p-5 rounded-xl border border-[#E7E5E4] dark:border-[#44403C] shadow-sm hover:border-accent/30 transition-colors group/stat bg-white">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] uppercase font-bold text-[#A8A29E] tracking-wider">
                        Feedback Pulse
                      </span>
                    </div>
                    <div className="text-3xl font-bold font-space-grotesk text-[#1C1917] dark:text-white mb-1">
                      4.8<span className="text-lg text-[#A8A29E] font-normal">/5.0</span>
                    </div>
                    <div className="flex -space-x-1.5 mt-1">
                      <div className="w-5 h-5 rounded-full border dark:border-[#292524] dark:bg-emerald-900 flex items-center justify-center text-[8px] font-bold dark:text-emerald-200 border-white bg-emerald-100 text-emerald-800">
                        VP
                      </div>
                      <div className="w-5 h-5 rounded-full border dark:border-[#292524] dark:bg-blue-900 flex items-center justify-center text-[8px] font-bold dark:text-blue-200 border-white bg-blue-100 text-blue-800">
                        PM
                      </div>
                      <div className="w-5 h-5 rounded-full border dark:border-[#292524] bg-[#F5F5F4] dark:bg-[#44403C] flex items-center justify-center text-[8px] text-[#A8A29E] border-white">
                        +2
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-span-12 lg:col-span-8 dark:bg-[#292524] rounded-xl border border-[#E7E5E4] dark:border-[#44403C] p-6 shadow-sm relative overflow-hidden bg-white">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h4 className="text-sm font-bold text-[#1C1917] dark:text-white font-space-grotesk">
                        Milestone Burn-up
                      </h4>
                      <p className="text-[10px] text-[#A8A29E] mt-0.5">Impact Points vs Planned Trajectory</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-[10px] font-medium text-[#57534E] dark:text-[#A8A29E]">
                        <span className="w-2 h-2 rounded-full bg-accent" /> Actual
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-medium text-[#57534E] dark:text-[#A8A29E]">
                        <span className="w-2 h-2 rounded-full bg-[#E7E5E4] dark:bg-[#44403C] border border-[#A8A29E]" />{" "}
                        Target
                      </div>
                    </div>
                  </div>
                  <VelocityBurnupChart />
                </div>

                <div className="col-span-12 lg:col-span-4 space-y-4">
                  <div className="dark:bg-[#292524] rounded-xl border border-[#E7E5E4] dark:border-[#44403C] p-5 shadow-sm h-full flex flex-col bg-white">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#A8A29E] mb-4">
                      Recent Wins
                    </h4>
                    <div className="space-y-3 flex-1 overflow-y-auto">
                      {[
                        { title: "Shipped Beta v0.9", meta: "2 days ago • High Impact", done: true },
                        { title: "Stakeholder Alignment", meta: "4 days ago • Strategic", done: true },
                        { title: "Q3 Roadmap Review", meta: "Upcoming • Tomorrow", done: false },
                      ].map((row, i) => (
                        <div key={row.title}>
                          <div
                            className={`flex gap-3 items-start group/item cursor-pointer ${!row.done ? "opacity-60 hover:opacity-100 transition-opacity" : ""}`}
                          >
                            <div
                              className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${row.done ? "border-emerald-500 dark:bg-emerald-900/30 bg-emerald-100" : "border-accent dark:bg-[#1C1917]"}`}
                            >
                              {row.done && (
                                <Icon
                                  icon="solar:check-read-linear"
                                  width={10}
                                  height={10}
                                  className="dark:text-emerald-400 text-emerald-600"
                                />
                              )}
                            </div>
                            <div>
                              <div
                                className={`text-xs font-bold text-[#1C1917] dark:text-white ${row.done ? "group-hover/item:text-accent transition-colors" : ""}`}
                              >
                                {row.title}
                              </div>
                              <div
                                className={`text-[10px] ${!row.done ? "text-accent font-bold" : "text-[#A8A29E]"}`}
                              >
                                {row.meta}
                              </div>
                            </div>
                          </div>
                          {i < 2 && <div className="w-full h-px bg-[#F5F5F4] dark:bg-[#44403C] my-3" />}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="w-full mt-4 py-2 rounded-lg border border-[#E7E5E4] dark:border-[#44403C] text-[10px] font-bold text-[#57534E] dark:text-[#A8A29E] hover:bg-[#F5F5F4] dark:hover:bg-[#44403C] transition-colors font-space-grotesk uppercase tracking-wide"
                    >
                      View Full Log
                    </button>
                  </div>
                </div>
              </div>

              <div className="h-8 bg-[#F5F2E8] dark:bg-[#0F0E0D] border-t border-[#E7E5E4] dark:border-[#2C2825] flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] font-mono text-[#78716C] dark:text-[#A8A29E]">
                    System Operational • Last synced 2m ago
                  </span>
                </div>
                <div className="text-[9px] font-mono text-[#78716C] dark:text-[#A8A29E]">v2.4.0-stable</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
