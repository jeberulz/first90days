import { Icon } from "@iconify/react";

const PHASES = [
  {
    number: "01",
    name: "Learn",
    days: "Days 1–30",
    icon: "solar:book-2-linear",
    description:
      "Absorb everything before you act. Understand the role, team dynamics, company culture, and unspoken expectations. Relationships built now compound for the next 60 days.",
    activities: [
      { icon: "solar:users-group-rounded-linear", label: "Map your key stakeholders" },
      { icon: "solar:eye-linear", label: "Shadow every core team ceremony" },
      { icon: "solar:documents-linear", label: "Read every strategy doc you can find" },
    ],
    chip: "Learning-heavy",
    chipIcon: "solar:book-linear",
  },
  {
    number: "02",
    name: "Contribute",
    days: "Days 31–60",
    icon: "solar:rocket-2-linear",
    description:
      "Start delivering. Ship a visible win, establish your working rhythms, and show colleagues what high-quality output looks like from you. Credibility is earned through execution.",
    activities: [
      { icon: "solar:check-square-linear", label: "Ship a quick, visible first win" },
      { icon: "solar:refresh-linear", label: "Define your team's working rituals" },
      { icon: "solar:chat-round-dots-linear", label: "Proactively share progress updates" },
    ],
    chip: "Balanced",
    chipIcon: "solar:chart-square-linear",
  },
  {
    number: "03",
    name: "Lead",
    days: "Days 61–90",
    icon: "solar:crown-linear",
    description:
      "Shift from contributor to driver. Shape strategy, mentor teammates, and establish yourself as the go-to person for your domain. By day 90 you should feel like you've been here for years.",
    activities: [
      { icon: "solar:diagram-up-linear", label: "Drive a strategic initiative" },
      { icon: "solar:star-linear", label: "Mentor a peer or junior teammate" },
      { icon: "solar:map-linear", label: "Present your 6-month roadmap" },
    ],
    chip: "Influence-heavy",
    chipIcon: "solar:planet-linear",
  },
];

const ACTIVITY_CATEGORIES = [
  { label: "Learning", icon: "solar:book-linear" },
  { label: "Shipping", icon: "solar:laptop-minimalistic-linear" },
  { label: "Relationships", icon: "solar:users-group-rounded-linear" },
  { label: "Influence", icon: "solar:chart-square-linear" },
];

export function Methodology() {
  return (
    <section
      id="methodology"
      className="py-16 sm:py-24 lg:py-32 relative border-t border-[#D1CDC7] dark:border-[#2C2825] transition-colors duration-300 bg-[#F5F2E8] dark:bg-[#0F0E0D]"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative">
        <div className="text-center mb-12 sm:mb-16 lg:mb-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-[10px] uppercase tracking-wider font-bold text-accent mb-4 sm:mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span className="font-space-grotesk">The Methodology</span>
          </div>
          <h2 className="t-display-md tracking-tight mb-4 text-[#1C1917] dark:text-white">
            Three phases.{" "}
            <span className="font-instrument-serif font-normal text-[#A8A29E]">
              Ninety days.
            </span>
          </h2>
          <p className="text-sm sm:text-base text-[#57534E] dark:text-[#A8A29E] max-w-lg mx-auto leading-relaxed font-normal font-space-grotesk">
            Based on proven new-leader onboarding research. Every activity in your plan maps to
            one of three phases, each building on the last.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-10 sm:mb-14">
          {PHASES.map((phase) => (
            <div
              key={phase.number}
              className="group bg-white dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#2C2825] rounded-2xl p-6 sm:p-8 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-5">
                <span className="w-8 h-8 rounded-lg bg-[#F5F2E8] dark:bg-[#0F0E0D] border border-[#E7E5E4] dark:border-[#2C2825] flex items-center justify-center text-xs font-semibold font-space-grotesk text-[#78716C] dark:text-[#A8A29E]">
                  {phase.number}
                </span>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/5 px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-bold text-accent font-space-grotesk">
                  {phase.days}
                </div>
              </div>

              <div className="flex items-center gap-2.5 mb-3">
                <Icon icon={phase.icon} width={20} height={20} className="text-accent shrink-0" />
                <h3 className="text-2xl font-instrument-serif text-[#1C1917] dark:text-white">
                  {phase.name}
                </h3>
              </div>

              <p className="text-sm text-[#57534E] dark:text-[#A8A29E] leading-relaxed mb-6 font-space-grotesk">
                {phase.description}
              </p>

              <ul className="space-y-2.5 mb-6">
                {phase.activities.map((act) => (
                  <li key={act.label} className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-[#F5F2E8] dark:bg-[#292524] border border-[#E7E5E4] dark:border-[#44403C] flex items-center justify-center shrink-0">
                      <Icon icon={act.icon} width={12} height={12} className="text-accent" />
                    </div>
                    <span className="text-xs text-[#57534E] dark:text-[#D6D3D1] font-space-grotesk">
                      {act.label}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full border border-[#E7E5E4] dark:border-[#44403C] bg-[#FAF9F6] dark:bg-[#292524] text-[10px] font-medium text-[#78716C] dark:text-[#A8A29E] font-space-grotesk">
                <Icon icon={phase.chipIcon} width={10} height={10} />
                {phase.chip}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <span className="text-[11px] text-[#78716C] dark:text-[#A8A29E] font-space-grotesk mr-1">
            Activity categories:
          </span>
          {ACTIVITY_CATEGORIES.map((cat) => (
            <div
              key={cat.label}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#D1CDC7] dark:border-[#44403C] bg-white dark:bg-[#1C1917] text-[11px] font-medium text-[#44403C] dark:text-[#D6D3D1] font-space-grotesk"
            >
              <Icon icon={cat.icon} width={11} height={11} className="text-accent" />
              {cat.label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
