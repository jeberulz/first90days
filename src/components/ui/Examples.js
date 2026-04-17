"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";

const ROLE_EXAMPLES = {
  engineer: {
    title: "Software Engineer",
    icon: "solar:code-linear",
    weekThemes: [
      "Codebase Orientation",
      "Dev Environment & Tooling",
      "First PR",
      "Code Review Culture",
    ],
    phases: [
      {
        name: "Learn",
        days: "Days 1–30",
        tasks: [
          { category: "Learning", icon: "solar:book-linear", title: "Read architecture decision records", time: "1h" },
          { category: "Relationships", icon: "solar:users-group-rounded-linear", title: "Coffee chat with each team member", time: "30m each" },
          { category: "Learning", icon: "solar:eye-linear", title: "Shadow 3 sprint ceremonies", time: "2h/week" },
        ],
      },
      {
        name: "Contribute",
        days: "Days 31–60",
        tasks: [
          { category: "Shipping", icon: "solar:laptop-minimalistic-linear", title: "Ship first production PR with tests", time: "1 week" },
          { category: "Relationships", icon: "solar:chat-round-dots-linear", title: "Lead one sprint planning session", time: "1h" },
          { category: "Learning", icon: "solar:documents-linear", title: "Document an undocumented system", time: "2h" },
        ],
      },
      {
        name: "Lead",
        days: "Days 61–90",
        tasks: [
          { category: "Influence", icon: "solar:diagram-up-linear", title: "Propose and drive a tech debt sprint", time: "Ongoing" },
          { category: "Shipping", icon: "solar:rocket-2-linear", title: "Own a feature end-to-end", time: "2 weeks" },
          { category: "Influence", icon: "solar:star-linear", title: "Mentor a newer team member", time: "30m/week" },
        ],
      },
    ],
  },
  sales: {
    title: "Sales Account Executive",
    icon: "solar:hand-money-linear",
    weekThemes: [
      "Product & Pitch Mastery",
      "CRM & Pipeline Setup",
      "First Discovery Calls",
      "Manager Alignment on Quota",
    ],
    phases: [
      {
        name: "Learn",
        days: "Days 1–30",
        tasks: [
          { category: "Learning", icon: "solar:book-linear", title: "Master the ICP and value prop", time: "4h" },
          { category: "Relationships", icon: "solar:users-group-rounded-linear", title: "Shadow 10 live discovery calls", time: "3h/week" },
          { category: "Learning", icon: "solar:documents-linear", title: "Review 5 recently closed deals", time: "2h" },
        ],
      },
      {
        name: "Contribute",
        days: "Days 31–60",
        tasks: [
          { category: "Shipping", icon: "solar:phone-linear", title: "Run first solo discovery calls", time: "Daily" },
          { category: "Relationships", icon: "solar:handshake-linear", title: "Build relationships with SE team", time: "1h/week" },
          { category: "Shipping", icon: "solar:chart-square-linear", title: "Get first opportunity to late stage", time: "4 weeks" },
        ],
      },
      {
        name: "Lead",
        days: "Days 61–90",
        tasks: [
          { category: "Influence", icon: "solar:diagram-up-linear", title: "Hit or exceed ramp quota", time: "Ongoing" },
          { category: "Influence", icon: "solar:crown-linear", title: "Contribute a win story to sales enablement", time: "2h" },
          { category: "Relationships", icon: "solar:star-linear", title: "Onboard next new AE as a buddy", time: "30m/week" },
        ],
      },
    ],
  },
  pm: {
    title: "Product Manager",
    icon: "solar:widget-5-bold",
    weekThemes: [
      "Roadmap & Vision Deep Dive",
      "Customer & User Research",
      "Stakeholder Mapping",
      "First Spec Draft",
    ],
    phases: [
      {
        name: "Learn",
        days: "Days 1–30",
        tasks: [
          { category: "Learning", icon: "solar:book-linear", title: "Audit the existing product roadmap", time: "3h" },
          { category: "Relationships", icon: "solar:users-group-rounded-linear", title: "Interview 5 customers directly", time: "1h each" },
          { category: "Learning", icon: "solar:eye-linear", title: "Sit in on every key cross-functional meeting", time: "3h/week" },
        ],
      },
      {
        name: "Contribute",
        days: "Days 31–60",
        tasks: [
          { category: "Shipping", icon: "solar:documents-linear", title: "Ship first complete feature spec", time: "1 week" },
          { category: "Relationships", icon: "solar:chat-round-dots-linear", title: "Align eng, design & data on priorities", time: "Ongoing" },
          { category: "Shipping", icon: "solar:rocket-2-linear", title: "Drive feature from spec to launch", time: "4 weeks" },
        ],
      },
      {
        name: "Lead",
        days: "Days 61–90",
        tasks: [
          { category: "Influence", icon: "solar:map-linear", title: "Present Q2 roadmap to leadership", time: "1h" },
          { category: "Influence", icon: "solar:diagram-up-linear", title: "Define team OKRs for next quarter", time: "3h" },
          { category: "Relationships", icon: "solar:star-linear", title: "Build exec sponsorship for top initiative", time: "Ongoing" },
        ],
      },
    ],
  },
};

const ROLES = [
  { id: "engineer", label: "Software Engineer", icon: "solar:code-linear" },
  { id: "sales", label: "Sales AE", icon: "solar:hand-money-linear" },
  { id: "pm", label: "Product Manager", icon: "solar:widget-5-bold" },
];

const CATEGORY_COLORS = {
  Learning: "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900",
  Shipping: "bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 border-green-100 dark:border-green-900",
  Relationships: "bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900",
  Influence: "bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900",
};

export function Examples() {
  const [activeRole, setActiveRole] = useState("engineer");
  const [openPhase, setOpenPhase] = useState(0);

  const role = ROLE_EXAMPLES[activeRole];

  return (
    <section
      id="examples"
      className="py-16 sm:py-24 lg:py-32 relative border-t border-[#D1CDC7] dark:border-[#2C2825] transition-colors duration-300 bg-white dark:bg-[#0F0E0D]"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative">
        <div className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-[10px] uppercase tracking-wider font-bold text-accent mb-4 sm:mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            <span className="font-space-grotesk">See It In Action</span>
          </div>
          <h2 className="t-display-md tracking-tight mb-4 text-[#1C1917] dark:text-white">
            Real plans for{" "}
            <span className="font-instrument-serif font-normal text-[#A8A29E]">real roles.</span>
          </h2>
          <p className="text-sm sm:text-base text-[#57534E] dark:text-[#A8A29E] max-w-lg mx-auto leading-relaxed font-normal font-space-grotesk">
            Every plan is tailored to your specific role, seniority, and context. Here&apos;s a
            sample of what gets generated.
          </p>
        </div>

        {/* Role tabs */}
        <div className="flex items-center justify-center gap-2 mb-8 overflow-x-auto pb-1">
          <div className="flex gap-1 p-1 bg-[#F5F5F4] dark:bg-[#1C1917] rounded-lg border border-[#E7E5E4] dark:border-[#44403C]">
            {ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => { setActiveRole(r.id); setOpenPhase(0); }}
                className={
                  activeRole === r.id
                    ? "px-4 py-1.5 rounded-md text-[11px] font-semibold font-space-grotesk dark:bg-[#292524] shadow-sm text-[#1C1917] dark:text-white transition-all flex items-center gap-2 bg-white whitespace-nowrap"
                    : "px-4 py-1.5 rounded-md text-[11px] font-semibold font-space-grotesk text-[#78716C] dark:text-[#A8A29E] hover:text-[#1C1917] dark:hover:text-white transition-all flex items-center gap-2 whitespace-nowrap"
                }
              >
                <Icon icon={r.icon} width={13} height={13} aria-hidden />
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Plan panel */}
        <div className="bg-[#FAF9F6] dark:bg-[#1C1917] rounded-2xl border border-[#E7E5E4] dark:border-[#2C2825] shadow-xl overflow-hidden">
          {/* Panel header */}
          <div className="h-14 border-b border-[#E7E5E4] dark:border-[#2C2825] dark:bg-[#292524] bg-white px-4 sm:px-6 flex items-center justify-between shrink-0 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#E7E5E4] dark:bg-[#44403C]" />
                <div className="w-3 h-3 rounded-full bg-[#E7E5E4] dark:bg-[#44403C]" />
                <div className="w-3 h-3 rounded-full bg-[#E7E5E4] dark:bg-[#44403C]" />
              </div>
              <div className="h-5 w-px bg-[#E7E5E4] dark:bg-[#44403C]" />
              <span className="text-[11px] font-semibold font-space-grotesk text-[#57534E] dark:text-[#A8A29E] truncate">
                90-Day Plan: {role.title}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 dark:bg-green-950/40 border border-green-100 dark:border-green-900 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-[10px] font-semibold text-green-600 dark:text-green-400 font-space-grotesk">
                AI Generated
              </span>
            </div>
          </div>

          {/* Panel body */}
          <div className="grid md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-[#E7E5E4] dark:divide-[#2C2825]">
            {/* Left: week themes */}
            <div className="md:col-span-2 p-4 sm:p-6">
              <p className="text-[10px] uppercase tracking-wider font-bold text-[#78716C] dark:text-[#A8A29E] font-space-grotesk mb-3">
                Week Themes
              </p>
              <div className="space-y-2">
                {role.weekThemes.map((theme, i) => (
                  <div
                    key={theme}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-[#292524] border border-[#E7E5E4] dark:border-[#44403C]"
                  >
                    <span className="w-6 h-6 rounded-md bg-[#F5F2E8] dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#2C2825] flex items-center justify-center text-[10px] font-bold font-space-grotesk text-[#78716C] dark:text-[#A8A29E] shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-xs font-medium font-space-grotesk text-[#1C1917] dark:text-white">
                      {theme}
                    </span>
                  </div>
                ))}
                <div className="flex items-center gap-2 px-3 py-2 text-[10px] text-[#A8A29E] font-space-grotesk">
                  <div className="flex gap-1">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#D1CDC7] dark:bg-[#44403C]" />
                    ))}
                  </div>
                  8 more weeks personalized to you
                </div>
              </div>
            </div>

            {/* Right: phase accordion */}
            <div className="md:col-span-3 p-4 sm:p-6">
              <p className="text-[10px] uppercase tracking-wider font-bold text-[#78716C] dark:text-[#A8A29E] font-space-grotesk mb-3">
                Activity Breakdown
              </p>
              <div className="space-y-2">
                {role.phases.map((phase, phaseIdx) => (
                  <div
                    key={phase.name}
                    className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                      openPhase === phaseIdx
                        ? "border-accent/30 bg-white dark:bg-[#292524]"
                        : "border-[#E7E5E4] dark:border-[#2C2825] bg-[#FAF9F6] dark:bg-[#1C1917]"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenPhase(openPhase === phaseIdx ? -1 : phaseIdx)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`text-xs font-semibold font-space-grotesk ${
                            openPhase === phaseIdx ? "text-accent" : "text-[#78716C] dark:text-[#A8A29E]"
                          }`}
                        >
                          {phase.name}
                        </span>
                        <span className="text-[10px] text-[#A8A29E] font-space-grotesk">{phase.days}</span>
                      </div>
                      <Icon
                        icon={openPhase === phaseIdx ? "solar:alt-arrow-up-linear" : "solar:alt-arrow-down-linear"}
                        width={14}
                        height={14}
                        className="text-[#A8A29E] shrink-0"
                      />
                    </button>

                    {openPhase === phaseIdx && (
                      <div className="px-4 pb-4 space-y-2">
                        {phase.tasks.map((task) => (
                          <div
                            key={task.title}
                            className="flex items-start gap-3 p-3 rounded-lg bg-[#F5F2E8] dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#2C2825]"
                          >
                            <div className="w-6 h-6 rounded-md bg-white dark:bg-[#292524] border border-[#E7E5E4] dark:border-[#44403C] flex items-center justify-center shrink-0 mt-0.5">
                              <Icon icon={task.icon} width={12} height={12} className="text-accent" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium font-space-grotesk text-[#1C1917] dark:text-white leading-snug">
                                {task.title}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span
                                  className={`inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded border font-space-grotesk ${CATEGORY_COLORS[task.category]}`}
                                >
                                  {task.category}
                                </span>
                                <span className="text-[10px] text-[#A8A29E] font-space-grotesk">{task.time}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
