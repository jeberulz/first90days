import { Icon } from "@iconify/react";

export function FeatureManagerSync() {
  return (
    <div className="w-full border-b border-[#E7E5E4] dark:border-[#2C2825] bg-[#FAF9F6] dark:bg-black/20 relative overflow-hidden group/section">
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(#D97757 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <div className="w-full max-w-[1800px] mx-auto px-6 md:px-12 py-24 lg:py-32 relative z-10">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-24 items-start">
          <div className="lg:col-span-4 lg:sticky lg:top-32 pt-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/20 bg-accent/5 text-[10px] uppercase tracking-wider font-bold text-accent mb-8 font-space-grotesk">
              <Icon icon="solar:users-group-two-rounded-linear" width={12} height={12} />
              Manager Alignment
            </div>
            <h2 className="text-4xl md:text-6xl tracking-tight mb-6 font-instrument-serif font-normal text-[#1C1917] dark:text-white leading-[1.05]">
              Align expectations{" "}
              <span className="text-[#78716C] dark:text-[#A8A29E]">before day one.</span>
            </h2>
            <p className="text-lg text-[#57534E] dark:text-[#D6D3D1] leading-relaxed mb-10 font-space-grotesk font-light">
              Misalignment is the #1 cause of onboarding failure. Create a shared workspace for
              you and your manager to review goals, timelines, and success metrics together.
            </p>
            <div className="space-y-4 font-space-grotesk">
              {[
                {
                  title: "Collaborative Review",
                  desc: "Invite your manager to comment and refine your 30-60-90 plan directly in the app.",
                  icon: "solar:chat-round-dots-linear",
                },
                {
                  title: "Live Sync",
                  desc: "Changes sync instantly to Notion, Google Docs, or PDF for easy sharing.",
                  icon: "solar:refresh-linear",
                },
                {
                  title: "Official Sign-off",
                  desc: "Get formal approval on your goals to establish a clear paper trail of success.",
                  icon: "solar:check-circle-linear",
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className="group/feature p-4 rounded-xl border border-[#E7E5E4] dark:border-[#2C2825] dark:bg-[#1C1917] hover:border-accent hover:shadow-lg hover:shadow-accent/10 transition-all cursor-pointer relative overflow-hidden bg-white"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent opacity-0 group-hover/feature:opacity-100 transition-opacity" />
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#F5F2E8] dark:bg-[#292524] flex items-center justify-center text-accent group-hover/feature:scale-110 transition-transform">
                      <Icon icon={f.icon} width={20} height={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#1C1917] dark:text-white mb-1 group-hover/feature:text-accent transition-colors">
                        {f.title}
                      </h4>
                      <p className="text-xs text-[#57534E] dark:text-[#A8A29E] leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-8 w-full relative z-20">
            <div className="absolute -inset-4 bg-gradient-to-r from-accent/20 to-purple-500/10 rounded-[2rem] blur-3xl opacity-0 group-hover/section:opacity-100 transition-opacity duration-700" />
            <div className="relative dark:bg-[#1C1917] rounded-2xl border border-[#E7E5E4] dark:border-[#2C2825] shadow-2xl overflow-hidden min-h-[700px] flex flex-col transition-all duration-500 group-hover/section:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.2)] bg-white">
              <div className="h-14 border-b border-[#E7E5E4] dark:border-[#2C2825] bg-[#FAF9F6] dark:bg-[#292524] px-6 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#E7E5E4] dark:bg-[#44403C]" />
                    <div className="w-3 h-3 rounded-full bg-[#E7E5E4] dark:bg-[#44403C]" />
                    <div className="w-3 h-3 rounded-full bg-[#E7E5E4] dark:bg-[#44403C]" />
                  </div>
                  <div className="w-px h-6 bg-[#E7E5E4] dark:bg-[#44403C]" />
                  <div className="flex items-center gap-2 text-sm font-medium font-space-grotesk text-[#1C1917] dark:text-white">
                    <span className="opacity-50">Drafts /</span>
                    <span>Senior Product Manager Plan</span>
                    <span className="px-2 py-0.5 rounded-full dark:bg-emerald-900/30 text-[10px] dark:text-emerald-400 border dark:border-emerald-900/50 bg-emerald-100 text-emerald-700 border-emerald-200">
                      Approved
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full border-2 dark:border-[#292524] bg-[#F5F2E8] flex items-center justify-center text-xs font-bold text-[#1C1917] border-white">
                      JD
                    </div>
                    <div className="w-8 h-8 rounded-full border-2 dark:border-[#292524] bg-accent flex items-center justify-center text-xs font-bold shadow-sm relative border-white text-white">
                      MG
                      <span className="absolute right-0 bottom-0 w-2.5 h-2.5 bg-emerald-500 border-2 dark:border-[#292524] rounded-full border-white" />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg bg-[#1C1917] dark:bg-white dark:text-[#1C1917] text-xs font-bold font-space-grotesk shadow-sm hover:opacity-90 transition-opacity flex items-center gap-2 text-white"
                  >
                    <Icon icon="solar:share-linear" width={12} height={12} />
                    Share
                  </button>
                </div>
              </div>

              <div className="flex-1 flex overflow-hidden bg-[#FAF9F6] dark:bg-[#0F0E0D] relative">
                <div className="dark:border-[#2C2825] dark:bg-[#1C1917] hidden md:flex flex-col gap-6 w-64 border-[#E7E5E4] border-r pt-4 pr-4 pb-4 pl-4 bg-white">
                  <div className="space-y-1">
                    <div className="px-3 py-2 bg-[#F5F2E8] dark:bg-[#292524] rounded-lg text-xs font-bold text-[#1C1917] dark:text-white flex items-center justify-between font-space-grotesk cursor-pointer">
                      <span>Plan Overview</span>
                      <Icon icon="solar:widget-5-bold" width={14} height={14} className="opacity-50" />
                    </div>
                    <div className="px-3 py-2 hover:bg-[#FAF9F6] dark:hover:bg-[#292524]/50 rounded-lg text-xs font-medium text-[#57534E] dark:text-[#A8A29E] flex items-center justify-between transition-colors font-space-grotesk cursor-pointer">
                      <span>Learning Goals</span>
                      <span className="bg-[#E7E5E4] dark:bg-[#44403C] text-[9px] px-1.5 py-0.5 rounded text-[#1C1917] dark:text-white">
                        4
                      </span>
                    </div>
                    <div className="px-3 py-2 hover:bg-[#FAF9F6] dark:hover:bg-[#292524]/50 rounded-lg text-xs font-medium text-[#57534E] dark:text-[#A8A29E] flex items-center justify-between transition-colors font-space-grotesk cursor-pointer">
                      <span>Performance KPIs</span>
                      <span className="bg-[#E7E5E4] dark:bg-[#44403C] text-[9px] px-1.5 py-0.5 rounded text-[#1C1917] dark:text-white">
                        3
                      </span>
                    </div>
                  </div>
                  <div className="mt-auto p-4 rounded-xl bg-[#FAF9F6] dark:bg-[#292524]/30 border border-[#E7E5E4] dark:border-[#2C2825]">
                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-[#A8A29E] mb-3">
                      Integrations
                    </h5>
                    <div className="space-y-3">
                      {[
                        ["Notion", "solar:link-linear"],
                        ["Slack", "solar:chat-round-call-linear"],
                      ].map(([name, ico]) => (
                        <div
                          key={name}
                          className="flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <div className="w-6 h-6 rounded dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#44403C] flex items-center justify-center bg-white">
                            <Icon icon={ico} width={12} height={12} className="text-[#1C1917] dark:text-white" />
                          </div>
                          <span className="text-xs font-medium text-[#1C1917] dark:text-white">{name}</span>
                          <div className="w-2 h-2 rounded-full bg-emerald-500 ml-auto" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 relative">
                  <div className="dark:bg-[#1C1917] min-h-[800px] dark:border-[#2C2825] group/doc max-w-3xl border-[#E7E5E4] border mx-auto pt-12 pr-12 pb-12 pl-12 relative shadow-sm bg-white">
                    <div className="flex items-center justify-between mb-8 pb-8 border-b border-[#E7E5E4] dark:border-[#2C2825]">
                      <div>
                        <h1 className="text-3xl font-semibold tracking-tight font-instrument-serif text-[#1C1917] dark:text-white mb-2">
                          First 90 Days: Strategic Plan
                        </h1>
                        <div className="flex items-center gap-4 text-xs text-[#57534E] dark:text-[#A8A29E] font-space-grotesk">
                          <span className="flex items-center gap-1">
                            <Icon icon="solar:calendar-linear" width={12} height={12} /> Oct 12, 2024
                          </span>
                          <span className="flex items-center gap-1">
                            <Icon icon="solar:eye-linear" width={12} height={12} /> Visible to Managers
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#A8A29E] mb-1">
                          Status
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full text-xs font-semibold border dark:border-emerald-900/50 bg-emerald-100 text-emerald-700 border-emerald-200">
                          <Icon icon="solar:check-circle-bold" width={12} height={12} />
                          Signed Off
                        </div>
                      </div>
                    </div>

                    <div className="mb-12 relative group/section">
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-[#A8A29E] mb-4 flex items-center gap-2">
                        Executive Summary
                        <span className="opacity-0 group-hover/section:opacity-100 transition-opacity text-[10px] text-accent cursor-pointer hover:underline font-medium">
                          Edit
                        </span>
                      </h2>
                      <p className="text-sm leading-7 text-[#1C1917] dark:text-[#E7E5E4] font-space-grotesk p-2 -ml-2 rounded-lg hover:bg-[#FAF9F6] dark:hover:bg-[#292524] transition-colors relative cursor-text group/paragraph">
                        The primary objective for the first quarter is to establish a robust product
                        roadmap for the mobile initiative while simultaneously addressing critical
                        technical debt in the legacy payment gateway.
                        <span className="absolute top-0 right-0 translate-x-full ml-4 opacity-0 group-hover/section:opacity-100 transition-all duration-300 z-20 pointer-events-none group-hover/section:pointer-events-auto hidden lg:block">
                          <span className="flex items-start gap-3 dark:bg-[#292524] dark:border-[#44403C] text-xs text-left w-64 border-[#E7E5E4] border rounded-lg p-3 fixed top-32 left-1/2 -translate-x-1/2 shadow-lg z-50 bg-white">
                            <span className="w-6 h-6 rounded-full bg-accent flex items-center justify-center shrink-0 text-[10px] font-semibold ring-2 dark:ring-[#292524] text-white ring-white">
                              MG
                            </span>
                            <span className="flex flex-col">
                              <span className="font-semibold text-[#1C1917] dark:text-white mb-0.5">
                                Manager
                              </span>
                              <span className="text-[#57534E] dark:text-[#A8A29E] leading-relaxed">
                                Great focus. Let&apos;s make sure to include the Sales VP in the roadmap
                                review.
                              </span>
                            </span>
                          </span>
                        </span>
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-12">
                      <div className="p-4 rounded-xl bg-[#FAF9F6] dark:bg-[#292524]/50 border border-[#E7E5E4] dark:border-[#2C2825] hover:border-accent/50 transition-colors group/card relative">
                        <div className="absolute top-3 right-3 opacity-0 group-hover/card:opacity-100 transition-opacity">
                          <div className="w-6 h-6 rounded hover:bg-[#E7E5E4] dark:hover:bg-[#44403C] flex items-center justify-center cursor-pointer text-[#A8A29E] transition-colors">
                            <Icon icon="solar:chat-round-line-linear" width={14} height={14} />
                          </div>
                        </div>
                        <div className="w-8 h-8 rounded-lg dark:bg-orange-900/20 text-accent flex items-center justify-center mb-3 bg-orange-50">
                          <Icon icon="solar:bolt-linear" width={16} height={16} />
                        </div>
                        <h3 className="text-sm font-semibold text-[#1C1917] dark:text-white mb-1">
                          Quick Wins (Days 1-30)
                        </h3>
                        <ul className="space-y-2 mt-3">
                          {["Audit Mixpanel Dashboards", "Interview 5 Key Stakeholders"].map((t) => (
                            <li
                              key={t}
                              className="flex items-center gap-2 text-xs text-[#57534E] dark:text-[#A8A29E]"
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="p-4 rounded-xl bg-[#FAF9F6] dark:bg-[#292524]/50 border border-[#E7E5E4] dark:border-[#2C2825] hover:border-accent/50 transition-colors group/card relative">
                        <div className="absolute top-3 right-3 opacity-0 group-hover/card:opacity-100 transition-opacity">
                          <div className="w-6 h-6 rounded hover:bg-[#E7E5E4] dark:hover:bg-[#44403C] flex items-center justify-center cursor-pointer text-[#A8A29E] transition-colors">
                            <Icon icon="solar:chat-round-line-linear" width={14} height={14} />
                          </div>
                        </div>
                        <div className="w-8 h-8 rounded-lg dark:bg-purple-900/20 dark:text-purple-400 flex items-center justify-center mb-3 bg-purple-50 text-purple-600">
                          <Icon icon="solar:rocket-2-linear" width={16} height={16} />
                        </div>
                        <h3 className="text-sm font-semibold text-[#1C1917] dark:text-white mb-1">
                          Strategic Goals (Days 31-90)
                        </h3>
                        <ul className="space-y-2 mt-3">
                          {["Launch Mobile Beta", "Hire Senior Backend Eng"].map((t) => (
                            <li
                              key={t}
                              className="flex items-center gap-2 text-xs text-[#57534E] dark:text-[#A8A29E]"
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-[#E7E5E4] dark:bg-[#44403C]" />
                              {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="absolute bottom-8 right-8 bg-[#1C1917] dark:bg-white dark:text-[#1C1917] px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 transform translate-y-20 opacity-0 group-hover/doc:translate-y-0 group-hover/doc:opacity-100 transition-all duration-500 delay-300 z-50 text-white">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                      <Icon icon="solar:check-circle-bold" width={14} height={14} className="text-white" />
                    </div>
                    <div>
                      <div className="text-xs font-bold font-space-grotesk">Plan Approved</div>
                      <div className="text-[10px] opacity-70">Synced to Notion • Just now</div>
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
