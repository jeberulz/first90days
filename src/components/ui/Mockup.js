import { Icon } from "@iconify/react";
import { DashboardProgressChart } from "@/components/ui/DashboardProgressChart";

export function Mockup() {
  return (
    <div className="md:mt-16 md:h-[900px] isolate animate-fade-up flex overflow-hidden md:px-8 w-full h-[800px] mt-16 pr-4 pl-4 relative items-center justify-center" style={{ animationDelay: "0.5s" }}>
      <div className="-z-10 flex pointer-events-none w-full h-full absolute inset-0 items-center justify-center">
        <div className="-translate-x-1/2 -translate-y-1/2 blur-[120px] bg-accent/20 w-[80%] h-[70%] rounded-full absolute top-1/2 left-1/2" />
      </div>

      {/* Left: Agentic Context */}
      <div className="-translate-y-1/2 dark:bg-[#18181B] dark:border-white/10 dark:shadow-black/50 hidden flex-col overflow-hidden transition-all duration-500 hover:rotate-0 hover:scale-100 hover:z-30 hover:border-accent/30 group/left xl:flex xl:left-[8%] z-0 bg-[#0F0E0D] w-[360px] h-[520px] border rounded-2xl absolute top-1/2 left-4 shadow-2xl backdrop-blur-md -rotate-6 scale-90 border-white/10">
        <div className="flex h-12 border-b pr-5 pl-5 items-center justify-between border-white/5">
          <span className="text-[11px] font-bold tracking-wider text-neutral-500 uppercase font-space-grotesk border px-2.5 py-1 rounded border-white/5 bg-white/5">
            Agentic Context
          </span>
          <div className="flex gap-1.5">
            <div className="w-2 h-2 rounded-full dark:bg-neutral-700 bg-neutral-800" />
            <div className="w-2 h-2 rounded-full bg-emerald-500/50 animate-pulse" />
          </div>
        </div>
        <div className="p-6 flex-1 flex flex-col relative bg-gradient-to-br from-transparent overflow-y-auto no-scrollbar to-black/20">
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
          <div className="mb-6 group/item p-3 rounded-xl transition-colors border border-transparent cursor-pointer hover:bg-white/5 hover:border-white/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center text-accent border border-accent/20 shadow-inner shrink-0">
                <Icon icon="solar:document-linear" width={24} height={24} className="text-accent" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold font-space-grotesk truncate text-white">
                  Strategy_Q3.doc
                </div>
                <div className="text-[10px] text-neutral-500 font-mono mt-0.5">Updated 2h ago</div>
              </div>
            </div>
            <div className="space-y-2 mt-4">
              <div className="h-1.5 w-full dark:bg-neutral-700 rounded-full overflow-hidden bg-neutral-800">
                <div className="h-full w-2/3 bg-accent/50 rounded-full" />
              </div>
              <div className="flex justify-between text-[9px] text-neutral-500 font-mono">
                <span>Parsing</span>
                <span>64%</span>
              </div>
            </div>
          </div>
          <div className="dark:bg-[#27272A] rounded-xl p-4 border dark:border-white/10 shadow-lg mb-6 bg-neutral-900/50 border-white/5">
            <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold font-space-grotesk mb-1">
              Key Goal
            </div>
            <div className="text-base font-medium font-space-grotesk mb-2 text-white">
              Increase Velocity
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] font-bold uppercase">
                On Track
              </span>
              <span className="text-[9px] text-neutral-500 font-mono">Synced 5m ago</span>
            </div>
          </div>
          <div className="mt-auto pt-4 border-t border-white/5">
            <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold font-space-grotesk mb-3">
              Active Sources
            </div>
            <div className="flex gap-3">
              <div
                className="h-10 w-10 rounded-full bg-[#1C1917] border flex items-center justify-center hover:border-accent/50 hover:bg-accent/10 transition-all cursor-pointer border-white/10 text-white"
                title="Slack"
              >
                <Icon icon="solar:document-linear" width={16} height={16} />
              </div>
              <div
                className="h-10 w-10 rounded-full bg-[#1C1917] border flex items-center justify-center hover:border-accent/50 hover:bg-accent/10 transition-all cursor-pointer border-white/10 text-white"
                title="Jira"
              >
                <Icon icon="solar:pen-linear" width={16} height={16} />
              </div>
              <div
                className="h-10 w-10 rounded-full bg-[#1C1917] border flex items-center justify-center hover:border-accent/50 hover:bg-accent/10 transition-all cursor-pointer border-white/10 text-white"
                title="Notion"
              >
                <Icon icon="solar:notes-linear" width={16} height={16} />
              </div>
              <div className="h-10 px-4 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-xs font-bold font-mono hover:bg-accent/20 transition-colors cursor-pointer">
                +5
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Beautiful Reports */}
      <div className="-translate-y-1/2 dark:bg-[#18181B] dark:border-white/10 dark:shadow-black/50 hidden flex-col overflow-hidden transition-all duration-500 hover:rotate-0 hover:scale-100 hover:z-30 hover:border-accent/30 group/right xl:flex xl:right-[8%] bg-[#0F0E0D] w-[360px] h-[520px] z-0 border rounded-2xl absolute top-1/2 right-4 shadow-2xl backdrop-blur-md rotate-6 scale-90 border-white/10">
        <div className="h-12 border-b bg-white/[0.02] flex items-center justify-between px-5 border-white/5">
          <span className="text-[11px] font-bold tracking-wider text-neutral-500 uppercase font-space-grotesk border px-2.5 py-1 rounded border-white/5 bg-white/5">
            Beautiful Reports
          </span>
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
        </div>
        <div className="p-6 flex-1 flex flex-col relative bg-gradient-to-bl from-transparent to-black/20">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent/10 via-transparent to-transparent opacity-50" />
          <div className="flex-1 flex flex-col justify-end gap-6">
            <div className="flex items-end gap-4 h-[220px] px-2">
              {[100, 140, 180].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col gap-2 group/bar">
                  <div
                    className={`w-full bg-accent rounded-t-lg shadow-[0_0_20px_rgba(217,119,87,0.3)] transition-all duration-500 relative overflow-hidden group-hover/bar:scale-y-110 origin-bottom ${i === 1 ? "opacity-90" : ""}`}
                    style={{ height: `${h}px` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t to-transparent from-black/30" />
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] font-bold opacity-0 group-hover/bar:opacity-100 transition-opacity text-white">
                      {i === 0 ? "30d" : i === 1 ? "60d" : "90d"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="rounded-xl p-3 border backdrop-blur-sm bg-white/5 border-white/5">
                <div className="text-[9px] text-neutral-500 font-space-grotesk uppercase tracking-wider mb-1">
                  Momentum
                </div>
                <div className="text-xl font-bold font-space-grotesk flex items-center gap-1 text-white">
                  +42%
                  <Icon icon="solar:graph-up-linear" className="text-emerald-500" width={12} height={12} />
                </div>
              </div>
              <div className="rounded-xl p-3 border backdrop-blur-sm bg-white/5 border-white/5">
                <div className="text-[9px] text-neutral-500 font-space-grotesk uppercase tracking-wider mb-1">
                  Impact
                </div>
                <div className="text-xl font-bold font-space-grotesk text-purple-400">High</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main window */}
      <div className="z-10 transition-transform duration-500 w-full max-w-5xl mx-auto px-4 relative">
        <div className="rounded-xl border dark:border-white/15 bg-[#0A0A0A] dark:bg-[#141414] shadow-2xl dark:shadow-[0_0_50px_-12px_rgba(0,0,0,0.7)] overflow-hidden relative backdrop-blur-sm ring-1 dark:ring-white/5 border-white/10 ring-black/5">
          <div className="h-10 border-b dark:border-white/10 bg-white/[0.02] flex items-center px-4 gap-3 border-white/5">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#262626] border border-white/5" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#262626] border border-white/5" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#262626] border border-white/5" />
            </div>
            <div className="ml-2 h-6 w-48 bg-[#171717] dark:bg-[#0A0A0A] rounded-md flex items-center px-3 border shadow-inner border-white/5">
              <span className="text-[10px] text-neutral-500 font-mono flex items-center gap-1.5">
                <Icon icon="solar:lock-password-linear" width={8} height={8} className="opacity-50" />
                first90.app/plan/generate
              </span>
            </div>
          </div>

          <div className="grid grid-cols-12 min-h-[650px]">
            <div className="col-span-3 lg:col-span-3 border-r dark:border-white/10 bg-white/[0.01] dark:bg-[#111111] p-5 hidden lg:flex flex-col border-white/5">
              <div className="flex items-center gap-3 mb-8 text-neutral-200">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center text-xs font-semibold font-space-grotesk shadow-inner border text-white border-white/10">
                  JD
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold leading-tight font-space-grotesk tracking-tight text-white">
                    Jane Doe
                  </span>
                  <span className="text-[10px] text-neutral-500 font-space-grotesk">Product Manager</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex gap-2.5 text-[11px] font-medium font-space-grotesk border rounded-lg pt-2 pr-3 pb-2 pl-3 items-center text-white bg-white/5 border-white/5">
                  <Icon icon="solar:widget-5-bold" width={14} height={14} className="text-accent shrink-0" />
                  Dashboard
                </div>
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] transition-all cursor-pointer font-space-grotesk hover:bg-white/[0.05] border border-transparent text-neutral-400 hover:text-white">
                  <Icon icon="solar:check-circle-linear" width={14} height={14} />
                  Tasks
                </div>
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] transition-colors cursor-pointer font-space-grotesk hover:bg-white/[0.05] text-neutral-400 hover:text-white">
                  <Icon icon="solar:users-group-rounded-linear" width={14} height={14} />
                  Stakeholders
                </div>
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] transition-colors cursor-pointer font-space-grotesk hover:bg-white/[0.05] text-neutral-400 hover:text-white">
                  <Icon icon="solar:document-linear" width={14} height={14} />
                  Documents
                </div>
              </div>
              <div className="mt-8 text-[10px] font-semibold uppercase tracking-wider mb-4 font-space-grotesk px-2 text-neutral-600">
                Timeline
              </div>
              <div className="space-y-6 relative pl-4 border-l ml-2 border-white/5">
                <div className="relative">
                  <div className="absolute -left-[19px] top-1.5 w-2.5 h-2.5 rounded-full bg-accent ring-4 ring-[#0A0A0A] dark:ring-[#111111] shadow-[0_0_10px_rgba(217,119,87,0.5)]" />
                  <div className="text-xs font-medium mb-0.5 font-space-grotesk text-white">Days 1-30</div>
                  <div className="text-[10px] text-neutral-500 font-space-grotesk">Learn &amp; Absorb</div>
                </div>
                <div className="relative opacity-40 grayscale hover:grayscale-0 transition-all duration-300 cursor-pointer">
                  <div className="absolute -left-[19px] top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-[#0A0A0A] dark:ring-[#111111] bg-neutral-800" />
                  <div className="text-xs font-medium mb-0.5 font-space-grotesk text-white">Days 31-60</div>
                  <div className="text-[10px] text-neutral-500 font-space-grotesk">Contribute</div>
                </div>
                <div className="relative opacity-40 grayscale hover:grayscale-0 transition-all duration-300 cursor-pointer">
                  <div className="absolute -left-[19px] top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-[#0A0A0A] dark:ring-[#111111] bg-neutral-800" />
                  <div className="text-xs font-medium mb-0.5 font-space-grotesk text-white">Days 61-90</div>
                  <div className="text-[10px] text-neutral-500 font-space-grotesk">Lead</div>
                </div>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-9 md:p-10 dark:bg-[#141414] bg-[#0A0A0A] pt-6 pr-6 pb-6 pl-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 animate-fade-up">
                <div>
                  <h2 className="text-3xl font-medium tracking-tight font-instrument-serif text-white">
                    Dashboard
                  </h2>
                  <p className="text-sm mt-1 font-space-grotesk font-light text-neutral-400">
                    Day 12 of 90 •{" "}
                    <span className="text-emerald-500 font-medium">On Track</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="flex items-center gap-2 text-[10px] font-medium bg-white/[0.05] hover:bg-white/[0.1] px-3 py-2 rounded-lg transition border font-space-grotesk text-neutral-300 border-white/10"
                  >
                    <Icon icon="solar:download-minimalistic-linear" width={14} height={14} />
                    Export Report
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 text-[10px] font-medium bg-accent hover:bg-accent-hover px-3 py-2 rounded-lg transition shadow-[0_1px_8px_rgba(217,119,87,0.3)] font-space-grotesk border border-accent text-white"
                  >
                    <Icon icon="solar:add-circle-linear" width={14} height={14} />
                    Log Activity
                  </button>
                </div>
              </div>

              <div
                className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-up mb-8"
                style={{ animationDelay: "0.1s" }}
              >
                <div className="p-5 rounded-xl border bg-white/[0.02] transition-colors group relative overflow-hidden border-white/5 hover:border-white/10">
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                      <Icon icon="solar:check-circle-bold" width={16} height={16} />
                    </div>
                    <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-mono font-normal">
                      +12%
                    </span>
                  </div>
                  <div className="relative z-10">
                    <div className="text-neutral-500 text-[10px] uppercase font-semibold tracking-wider font-space-grotesk mb-1">
                      Completion
                    </div>
                    <div className="text-2xl font-medium font-space-grotesk tracking-tight text-white">42%</div>
                  </div>
                </div>
                <div className="p-5 rounded-xl border bg-white/[0.02] transition-colors group relative overflow-hidden border-white/5 hover:border-white/10">
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                      <Icon icon="solar:chart-2-linear" width={16} height={16} />
                    </div>
                  </div>
                  <div className="relative z-10">
                    <div className="text-neutral-500 text-[10px] uppercase font-semibold tracking-wider font-space-grotesk mb-1">
                      Tasks
                    </div>
                    <div className="text-2xl font-medium font-space-grotesk tracking-tight text-white">
                      14<span className="text-sm font-light text-neutral-600">/32</span>
                    </div>
                  </div>
                </div>
                <div className="p-5 rounded-xl border bg-white/[0.02] transition-colors group relative overflow-hidden border-white/5 hover:border-white/10">
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                      <Icon icon="solar:clipboard-list-linear" width={16} height={16} />
                    </div>
                    <span className="text-[10px] text-accent bg-accent/10 px-1.5 py-0.5 rounded border border-accent/20 font-mono font-normal">
                      L5 Level
                    </span>
                  </div>
                  <div className="relative z-10">
                    <div className="text-neutral-500 text-[10px] uppercase font-semibold tracking-wider font-space-grotesk mb-1">
                      Next Milestone
                    </div>
                    <div className="text-base font-normal font-space-grotesk truncate text-white">
                      Phase 1 Review
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 animate-fade-up"
                style={{ animationDelay: "0.2s" }}
              >
                <div className="lg:col-span-2 p-6 rounded-xl border bg-white/[0.02] border-white/5">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-sm font-semibold font-space-grotesk text-white">
                        Performance Velocity
                      </h3>
                      <p className="text-[10px] text-neutral-500 mt-1 font-space-grotesk">
                        Tasks completed vs planned trajectory
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-accent" />
                      <span className="text-[10px] font-space-grotesk text-neutral-400">Actual</span>
                    </div>
                  </div>
                  <DashboardProgressChart />
                </div>
                <div className="p-6 rounded-xl border bg-white/[0.02] flex flex-col border-white/5">
                  <h3 className="text-sm font-semibold font-space-grotesk mb-4 text-white">Up Next</h3>
                  <div className="space-y-3 flex-1">
                    {[
                      ["Audit Q3 Roadmap", "Due Today • High Priority"],
                      ["Connect with Design Lead", "Tomorrow • 10:00 AM"],
                      ["Setup Dev Environment", "Phase 1 • Technical"],
                    ].map(([title, meta]) => (
                      <div key={title} className="flex gap-3 items-start group cursor-pointer">
                        <div className="mt-0.5 w-4 h-4 rounded border bg-[#151515] group-hover:border-accent transition-colors flex items-center justify-center border-neutral-700" />
                        <div className="flex-1">
                          <div className="text-xs font-medium font-space-grotesk group-hover:text-white transition-colors text-neutral-200">
                            {title}
                          </div>
                          <div className="text-[10px] text-neutral-500 mt-0.5 font-space-grotesk">
                            {meta}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <div className="p-3 rounded-lg bg-accent/10 border border-accent/20 flex items-start gap-3">
                      <div className="text-accent mt-0.5">
                        <Icon icon="solar:info-circle-linear" width={14} height={14} />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-accent font-space-grotesk">AI Insight</div>
                        <p className="text-[10px] leading-relaxed mt-0.5 font-space-grotesk text-neutral-300">
                          You&apos;re completing tasks 20% faster than average. Consider asking for early access to Q4 planning.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
