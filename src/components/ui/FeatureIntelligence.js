"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";

const tabActive =
  "px-4 py-1.5 rounded-md text-[11px] font-semibold font-space-grotesk dark:bg-[#292524] shadow-sm text-[#1C1917] dark:text-white transition-all flex items-center gap-2 bg-white";
const tabIdle =
  "px-4 py-1.5 rounded-md text-[11px] font-semibold font-space-grotesk text-[#78716C] dark:text-[#A8A29E] hover:text-[#1C1917] dark:hover:text-white transition-all flex items-center gap-2";

export function FeatureIntelligence() {
  const [tab, setTab] = useState("1");

  return (
    <div className="border-b border-[#E7E5E4] dark:border-[#2C2825]">
      <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 md:px-12 py-16 sm:py-24 lg:py-32">
        <div className="grid lg:grid-cols-12 gap-8 sm:gap-12 lg:gap-24 items-start min-w-0">
          <div className="lg:col-span-4 lg:sticky lg:top-32 lg:pt-8 min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/20 bg-accent/5 text-[10px] uppercase tracking-wider font-bold text-accent mb-6 sm:mb-8 font-space-grotesk">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              Analysis Engine v2.0
            </div>
            <h2 className="t-display-lg tracking-tight mb-5 sm:mb-6 text-[#1C1917] dark:text-white">
              Role-specific intelligence,{" "}
              <span className="text-[#78716C] dark:text-[#A8A29E]">decoded instantly.</span>
            </h2>
            <p className="text-base sm:text-lg text-[#57534E] dark:text-[#D6D3D1] leading-relaxed mb-8 sm:mb-10 font-space-grotesk font-light">
              Our AI doesn&apos;t just read your job description; it understands the implicit
              expectations. We parse thousands of seniority-specific datapoints to visualize the
              milestones that actually matter for your success.
            </p>
            <div className="space-y-6 font-space-grotesk">
              {[
                {
                  title: "Semantic Analysis",
                  desc: "Deep parsing of JD & Team Topology to find hidden requirements.",
                  icon: "solar:book-bookmark-linear",
                },
                {
                  title: "Market Benchmarking",
                  desc: "Compare leveling and compensation against real-time market data.",
                  icon: "solar:chart-square-linear",
                },
                {
                  title: "Stakeholder Mapping",
                  desc: "Identify decision makers and influencers before day one.",
                  icon: "solar:users-group-rounded-linear",
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#FAF9F6] dark:bg-[#292524] border border-[#E7E5E4] dark:border-[#44403C] flex items-center justify-center shrink-0">
                    <Icon icon={item.icon} width={18} height={18} className="text-accent" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[#1C1917] dark:text-white mb-1">
                      {item.title}
                    </h4>
                    <p className="text-xs text-[#57534E] dark:text-[#A8A29E] leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-8 w-full relative group min-w-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-accent/10 via-transparent to-accent/5 rounded-3xl transform rotate-1 scale-[1.02] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            <div className="relative bg-[#FAF9F6] dark:bg-[#1C1917] rounded-2xl border border-[#E7E5E4] dark:border-[#2C2825] shadow-2xl overflow-hidden transition-all duration-500 group-hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] flex flex-col h-[450px] sm:h-[500px] md:h-[600px]">
              <div className="h-14 border-b border-[#E7E5E4] dark:border-[#2C2825] dark:bg-[#292524] px-3 sm:px-6 flex items-center justify-between shrink-0 z-20 bg-white gap-3">
                <div className="flex items-center gap-3 sm:gap-6 min-w-0 overflow-x-auto no-scrollbar">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#E7E5E4] dark:bg-[#44403C]" />
                    <div className="w-3 h-3 rounded-full bg-[#E7E5E4] dark:bg-[#44403C]" />
                    <div className="w-3 h-3 rounded-full bg-[#E7E5E4] dark:bg-[#44403C]" />
                  </div>
                  <div className="h-6 w-px bg-[#E7E5E4] dark:bg-[#44403C]" />
                  <div className="flex gap-1 p-1 bg-[#F5F5F4] dark:bg-[#1C1917] rounded-lg border border-[#E7E5E4] dark:border-[#44403C] shrink-0">
                    <button
                      type="button"
                      onClick={() => setTab("1")}
                      className={cn("tab-btn", tab === "1" ? tabActive : tabIdle)}
                    >
                      <Icon icon="solar:danger-triangle-linear" width={12} height={12} />
                      Intelligence
                    </button>
                    <button
                      type="button"
                      onClick={() => setTab("2")}
                      className={cn("tab-btn", tab === "2" ? tabActive : tabIdle)}
                    >
                      <Icon icon="solar:chart-2-linear" width={12} height={12} />
                      Market Data
                    </button>
                    <button
                      type="button"
                      onClick={() => setTab("3")}
                      className={cn("tab-btn", tab === "3" ? tabActive : tabIdle)}
                    >
                      <Icon icon="solar:users-group-rounded-linear" width={12} height={12} />
                      Stakeholders
                    </button>
                  </div>
                </div>
                <span className="text-[10px] dark:text-emerald-400 font-mono hidden xs:flex items-center gap-1.5 dark:bg-emerald-900/20 px-2 py-1 rounded border dark:border-emerald-900/30 text-emerald-600 bg-emerald-50 border-emerald-100 shrink-0">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  Analysis Complete
                </span>
              </div>

              <div className="flex-1 flex overflow-hidden">
                <div className="w-64 border-r border-[#E7E5E4] dark:border-[#2C2825] bg-[#FAF9F6] dark:bg-[#1C1917] py-6 px-4 hidden sm:flex sm:flex-col">
                  <div className="text-[10px] uppercase font-bold text-[#A8A29E] tracking-wider mb-4 font-space-grotesk pl-2">
                    Detected Attributes
                  </div>
                  <div className="space-y-1">
                    <div className="p-2 rounded-lg dark:bg-[#292524] border border-[#E7E5E4] dark:border-[#44403C] shadow-sm flex items-center justify-between cursor-pointer hover:border-accent/30 transition-all bg-white">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded dark:bg-orange-900/20 flex items-center justify-center text-accent bg-orange-50">
                          <Icon icon="solar:user-id-linear" width={12} height={12} />
                        </div>
                        <div className="text-[11px] font-medium text-[#1C1917] dark:text-white font-space-grotesk">
                          Strategic Role
                        </div>
                      </div>
                      <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                    </div>
                    <div className="p-2 rounded-lg dark:hover:bg-[#292524] border border-transparent hover:border-[#E7E5E4] dark:hover:border-[#44403C] transition-all flex items-center gap-2 cursor-pointer text-[#57534E] dark:text-[#A8A29E] hover:bg-white">
                      <div className="w-6 h-6 rounded bg-[#F5F5F4] dark:bg-[#2C2825] flex items-center justify-center">
                        <Icon icon="solar:users-group-rounded-linear" width={12} height={12} />
                      </div>
                      <div className="text-[11px] font-medium font-space-grotesk">5-8 Reports</div>
                    </div>
                    <div className="p-2 rounded-lg dark:hover:bg-[#292524] border border-transparent hover:border-[#E7E5E4] dark:hover:border-[#44403C] transition-all flex items-center gap-2 cursor-pointer text-[#57534E] dark:text-[#A8A29E] hover:bg-white">
                      <div className="w-6 h-6 rounded bg-[#F5F5F4] dark:bg-[#2C2825] flex items-center justify-center">
                        <Icon icon="solar:wallet-money-linear" width={12} height={12} />
                      </div>
                      <div className="text-[11px] font-medium font-space-grotesk">P&amp;L Responsibility</div>
                    </div>
                  </div>
                  <div className="mt-auto">
                    <div className="bg-gradient-to-br from-[#1C1917] to-[#44403C] rounded-xl p-4 relative overflow-hidden text-white">
                      <div className="absolute top-0 right-0 w-16 h-16 rounded-full blur-xl -mr-8 -mt-8 bg-white/10" />
                      <div className="text-[10px] uppercase font-bold opacity-60 mb-2 font-space-grotesk">
                        Success Score
                      </div>
                      <div className="text-3xl font-bold font-instrument-serif mb-1">94%</div>
                      <div className="text-[10px] opacity-80 leading-tight">
                        Match with current skill profile is very high.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 dark:bg-[#1C1917] relative overflow-y-auto no-scrollbar bg-white">
                  {tab === "1" && (
                    <div className="tab-content p-4 sm:p-6 md:p-8 animate-fade-up">
                      <div className="flex flex-col xs:flex-row justify-between xs:items-end mb-6 sm:mb-8 gap-3">
                        <div className="min-w-0">
                          <h3 className="text-lg sm:text-xl font-bold text-[#1C1917] dark:text-white font-instrument-serif mb-2">
                            Analysis Results
                          </h3>
                          <p className="text-xs text-[#57534E] dark:text-[#A8A29E] font-space-grotesk">
                            Extracted from Job_Description.pdf and Team_Topology.json
                          </p>
                        </div>
                        <button
                          type="button"
                          className="hidden sm:block px-3 py-1.5 rounded-lg border border-[#E7E5E4] dark:border-[#44403C] text-[11px] font-medium text-[#1C1917] dark:text-white hover:bg-[#F5F5F4] dark:hover:bg-[#292524] transition-colors font-space-grotesk shrink-0"
                        >
                          Export Report
                        </button>
                      </div>
                      <div className="space-y-4">
                        <div className="p-3 sm:p-5 rounded-xl border border-accent/30 bg-[#F5F2E8]/50 dark:bg-accent/5 relative">
                          <div className="absolute left-0 top-4 bottom-4 w-1 bg-accent rounded-r-full" />
                          <div className="flex justify-between items-start mb-2 pl-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-accent font-space-grotesk">
                              Critical Priority
                            </span>
                            <span className="text-[10px] text-[#A8A29E] font-mono">Confidence: 98%</span>
                          </div>
                          <h4 className="text-sm font-bold text-[#1C1917] dark:text-white mb-2 pl-2 font-space-grotesk">
                            Immediate Sales Alignment Required
                          </h4>
                          <p className="text-xs text-[#57534E] dark:text-[#A8A29E] leading-relaxed pl-2 font-space-grotesk">
                            The JD emphasizes &quot;Cross-functional revenue targets&quot; 4 times. This implies a
                            disconnect between Product and Sales. Your first 30 days must focus on
                            bridging this gap to avoid churn.
                          </p>
                        </div>
                        <div className="p-3 sm:p-5 rounded-xl border border-[#E7E5E4] dark:border-[#2C2825] dark:bg-[#1C1917] hover:border-accent/30 transition-colors group bg-white">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#78716C] dark:text-[#A8A29E] group-hover:text-accent transition-colors font-space-grotesk">
                              Hidden Requirement
                            </span>
                            <span className="text-[10px] text-[#A8A29E] font-mono">Confidence: 85%</span>
                          </div>
                          <h4 className="text-sm font-bold text-[#1C1917] dark:text-white mb-2 font-space-grotesk">
                            Legacy Tech Debt Management
                          </h4>
                          <p className="text-xs text-[#57534E] dark:text-[#A8A29E] leading-relaxed font-space-grotesk">
                            Mentions of &quot;Modernization&quot; and &quot;Scalability&quot; suggest significant legacy
                            constraints. allocate 20% of engineering bandwidth to debt reduction in Q1
                            plan.
                          </p>
                        </div>
                        <div className="p-3 sm:p-5 rounded-xl border border-[#E7E5E4] dark:border-[#2C2825] dark:bg-[#1C1917] hover:border-accent/30 transition-colors group bg-white">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#78716C] dark:text-[#A8A29E] group-hover:text-accent transition-colors font-space-grotesk">
                              Cultural Signal
                            </span>
                            <span className="text-[10px] text-[#A8A29E] font-mono">Confidence: 92%</span>
                          </div>
                          <h4 className="text-sm font-bold text-[#1C1917] dark:text-white mb-2 font-space-grotesk">
                            Async-First Communication
                          </h4>
                          <p className="text-xs text-[#57534E] dark:text-[#A8A29E] leading-relaxed font-space-grotesk">
                            Team topology shows distributed members across 4 timezones. Establish written
                            documentation standards in Week 2.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {tab === "2" && (
                    <div className="tab-content p-4 sm:p-6 md:p-8 animate-fade-up">
                      <div className="flex justify-between items-end mb-8">
                        <div>
                          <h3 className="text-xl font-bold text-[#1C1917] dark:text-white font-instrument-serif mb-2">
                            Market Benchmarks
                          </h3>
                          <p className="text-xs text-[#57534E] dark:text-[#A8A29E] font-space-grotesk">
                            Based on Series B companies in NYC/SF
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-1 dark:bg-emerald-900/20 rounded border dark:border-emerald-900/30 bg-emerald-50 border-emerald-100">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="text-[10px] font-medium dark:text-emerald-400 text-emerald-800">
                            Competitive
                          </span>
                        </div>
                      </div>
                      <div className="bg-[#FAF9F6] dark:bg-[#292524]/50 rounded-xl p-6 border border-[#E7E5E4] dark:border-[#44403C] mb-6">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#78716C] dark:text-[#A8A29E] mb-6">
                          Total Compensation Breakdown
                        </h4>
                        <div className="space-y-4">
                          {[
                            {
                              label: "Base Salary",
                              pct: "85th Percentile",
                              barClass:
                                "bg-accent w-[85%] group-hover:opacity-90 transition-opacity",
                            },
                            {
                              label: "Equity (RSU)",
                              pct: "60th Percentile",
                              barClass:
                                "bg-[#1C1917] dark:bg-white w-[60%] rounded-r-md opacity-80 group-hover:opacity-100 transition-opacity",
                            },
                            {
                              label: "Signing Bonus",
                              pct: "92nd Percentile",
                              barClass:
                                "bg-[#A8A29E] w-[92%] rounded-r-md opacity-60 group-hover:opacity-80 transition-opacity",
                            },
                          ].map((row) => (
                            <div key={row.label} className="grid grid-cols-12 gap-4 items-center group">
                              <div className="col-span-3 text-xs font-medium text-[#1C1917] dark:text-white font-space-grotesk text-right pr-2">
                                {row.label}
                              </div>
                              <div className="col-span-9 h-8 dark:bg-[#1C1917] rounded-md border border-[#E7E5E4] dark:border-[#44403C] relative overflow-hidden bg-white">
                                <div
                                  className={cn(
                                    "absolute top-0 left-0 h-full rounded-r-md",
                                    row.barClass
                                  )}
                                />
                                <div className="absolute top-0 right-4 h-full flex items-center text-[10px] font-mono text-[#78716C] dark:text-[#A8A29E]">
                                  {row.pct}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg border border-[#E7E5E4] dark:border-[#44403C] dark:bg-[#1C1917] bg-white">
                          <div className="text-[10px] uppercase font-bold text-[#A8A29E] mb-1">Level Estimate</div>
                          <div className="text-xl font-bold font-instrument-serif text-[#1C1917] dark:text-white">
                            L5 / Senior
                          </div>
                          <div className="mt-2 text-[10px] text-[#57534E] dark:text-[#A8A29E] leading-tight">
                            Matches expectations for 5-8 years experience.
                          </div>
                        </div>
                        <div className="p-4 rounded-lg border border-[#E7E5E4] dark:border-[#44403C] dark:bg-[#1C1917] bg-white">
                          <div className="text-[10px] uppercase font-bold text-[#A8A29E] mb-1">Scope Width</div>
                          <div className="text-xl font-bold font-instrument-serif text-[#1C1917] dark:text-white">
                            Broad
                          </div>
                          <div className="mt-2 text-[10px] text-[#57534E] dark:text-[#A8A29E] leading-tight">
                            Cross-functional impact across 3 departments.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {tab === "3" && (
                    <div className="tab-content p-4 sm:p-6 md:p-8 animate-fade-up">
                      <div className="flex justify-between items-end mb-8">
                        <div>
                          <h3 className="text-xl font-bold text-[#1C1917] dark:text-white font-instrument-serif mb-2">
                            Network Topology
                          </h3>
                          <p className="text-xs text-[#57534E] dark:text-[#A8A29E] font-space-grotesk">
                            Predicted influence paths and key nodes
                          </p>
                        </div>
                      </div>
                      <div className="relative h-[300px] border border-[#E7E5E4] dark:border-[#2C2825] rounded-xl bg-[#FAF9F6] dark:bg-black/20 overflow-hidden mb-6">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="relative z-10 w-16 h-16 rounded-full bg-[#1C1917] dark:bg-white dark:text-[#1C1917] flex items-center justify-center shadow-lg font-bold font-space-grotesk text-xs border-4 border-[#FAF9F6] dark:border-[#1C1917] text-white">
                            YOU
                          </div>
                          <div className="absolute top-1/4 left-1/4 w-12 h-12 rounded-full dark:bg-[#292524] border border-accent flex items-center justify-center text-[10px] font-bold text-accent shadow-sm animate-float bg-white">
                            CTO
                          </div>
                          <div
                            className="absolute bottom-1/3 right-1/4 w-12 h-12 rounded-full dark:bg-[#292524] border border-[#E7E5E4] dark:border-[#44403C] flex items-center justify-center text-[10px] font-bold text-[#78716C] shadow-sm animate-float bg-white"
                            style={{ animationDelay: "1s" }}
                          >
                            PM
                          </div>
                          <div
                            className="absolute top-1/3 right-1/3 w-10 h-10 rounded-full dark:bg-[#292524] border border-[#E7E5E4] dark:border-[#44403C] flex items-center justify-center text-[9px] font-bold text-[#78716C] shadow-sm animate-float bg-white"
                            style={{ animationDelay: "2s" }}
                          >
                            Des
                          </div>
                          <div
                            className="absolute bottom-1/4 left-1/3 w-14 h-14 rounded-full dark:bg-[#292524] border-2 border-accent flex items-center justify-center text-[10px] font-bold text-[#1C1917] dark:text-white shadow-md animate-float bg-white"
                            style={{ animationDelay: "1.5s" }}
                          >
                            VP
                          </div>
                          <svg
                            className="absolute inset-0 w-full h-full pointer-events-none opacity-20 dark:opacity-40 text-[#1C1917] dark:text-white"
                            aria-hidden
                          >
                            <line x1="50%" y1="50%" x2="25%" y2="25%" stroke="currentColor" strokeWidth="1" />
                            <line x1="50%" y1="50%" x2="75%" y2="66%" stroke="currentColor" strokeWidth="1" />
                            <line x1="50%" y1="50%" x2="33%" y2="75%" stroke="currentColor" strokeWidth="2" className="text-accent" />
                            <line x1="25%" y1="25%" x2="33%" y2="75%" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
                          </svg>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-lg border border-accent/30 bg-accent/5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center font-bold text-xs text-white">
                              VP
                            </div>
                            <div>
                              <div className="text-xs font-bold text-[#1C1917] dark:text-white">Sarah Jenkins (VP Sales)</div>
                              <div className="text-[10px] text-accent">Key Decision Maker • Schedule in Wk 1</div>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="text-[10px] font-medium border border-accent text-accent px-3 py-1 rounded-full hover:bg-accent transition-colors hover:text-white"
                          >
                            Draft Email
                          </button>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg border border-[#E7E5E4] dark:border-[#2C2825] dark:bg-[#1C1917] bg-white">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#F5F5F4] dark:bg-[#292524] text-[#78716C] flex items-center justify-center font-bold text-xs">
                              EM
                            </div>
                            <div>
                              <div className="text-xs font-bold text-[#1C1917] dark:text-white">David Chen (Eng Manager)</div>
                              <div className="text-[10px] text-[#A8A29E]">Technical Blocker • Schedule in Wk 2</div>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="text-[10px] font-medium border border-[#E7E5E4] dark:border-[#44403C] text-[#78716C] px-3 py-1 rounded-full hover:bg-[#1C1917] dark:hover:bg-white dark:hover:text-[#1C1917] transition-colors hover:text-white"
                          >
                            View Profile
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
