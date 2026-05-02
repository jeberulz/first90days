import { Icon } from "@iconify/react";

// Shared read-only renderer for any sanitized plan shape — used by:
//   - /sample/[role]   (curated demo plans, public marketing surface)
//   - /p/[slug]        (a real user's plan, opted-in to public sharing)
//
// The component takes a *sanitized* plan object that already has any
// privacy-sensitive fields stripped or redacted upstream (server side).
// It does NOT do any access control or query Convex itself — that's the
// caller's job. This keeps the same chrome consistent across both
// surfaces while letting each route own its own data shape.
//
// Sanitized shape contract (every field optional unless marked):
// {
//   displayName: string?,           // "Anonymous Arcora user" if missing
//   roleTitle: string?,             // role being onboarded into
//   companyLabel: string?,          // either real company name or "[Confidential]"
//   startDate: string?,             // ISO date, only year/month surfaced in UI
//   stakeholderCount: number?,      // count is shown; names are NEVER on this view
//   stakeholderRolesShown: boolean?,// when true and roles[] is provided, render
//   stakeholderRoles: string[]?,    // array of role labels, no names
//   phases: [                        // required
//     {
//       number: 1|2|3,
//       name: string,                // "Learn" / "Contribute" / "Lead"
//       desc: string,                // short tagline
//       milestone: string?,
//     },
//   ],
//   weekThemes: [                    // optional, by weekNumber 1..12
//     { weekNumber: number, theme: string },
//   ],
//   firstWeekActivities: [          // optional, week 1 only — keeps surface tight
//     { title: string, category: string?, durationMin: number? },
//   ],
//   goals: [                         // required
//     {
//       title: string,
//       phaseNumber: 1|2|3,
//       category: string?,           // "learning" / "shipping" / "relationships" / "influence"
//     },
//   ],
//   successDefinition: string?,
//   generatedDate: string?,          // ISO; "Plan generated 2 May 2026" footer line
//   ctaHref: string,                 // required — landing page CTA target
//   ctaLabel: string?,               // default "Generate your own plan →"
//   showAttribution: boolean?,       // default true — "Built with Arcora" footer
// }

const PHASE_LABELS = {
  1: { name: "Learn", desc: "Absorb context", days: "Days 1\u201330" },
  2: { name: "Contribute", desc: "Deliver value", days: "Days 31\u201360" },
  3: { name: "Lead", desc: "Own outcomes", days: "Days 61\u201390" },
};

const CATEGORY_BADGES = {
  learning: { label: "Learning", className: "bg-blue-50 text-blue-700 border-blue-200" },
  shipping: { label: "Shipping", className: "bg-orange-50 text-orange-700 border-orange-200" },
  relationships: { label: "Relationships", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  influence: { label: "Influence", className: "bg-purple-50 text-purple-700 border-purple-200" },
};

function formatGenerationDate(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

function PhaseProgressBar({ phases }) {
  // Decorative on this view. We render 33% / 33% / 33% in the brand
  // accent so the layout reads "this is what a 90-day arc looks like"
  // without implying the user has progressed.
  return (
    <div className="grid grid-cols-3 gap-2">
      {phases.map((p) => {
        const meta = PHASE_LABELS[p.number] || {};
        return (
          <div key={p.number}>
            <div className="h-1 rounded-full bg-[#FBE9DF] overflow-hidden">
              <div
                className="h-full bg-[#D97757] rounded-full"
                style={{ width: `${100 / 3}%`, marginLeft: `${(p.number - 1) * (100 / 3)}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="font-space-grotesk font-medium text-[#1C1917]">
                {p.name || meta.name}
              </span>
              <span className="font-space-grotesk text-[#78716C]">
                {meta.days}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GoalCard({ goal }) {
  const cat = goal.category ? CATEGORY_BADGES[goal.category] : null;
  return (
    <div className="bg-white border border-[#E7E5E4] rounded-xl p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#FBE9DF] text-[#D97757] flex items-center justify-center shrink-0">
          <Icon icon="solar:target-linear" width={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-space-grotesk text-sm font-medium text-[#1C1917] leading-snug">
            {goal.title}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="text-[10px] font-space-grotesk uppercase tracking-wider px-2 py-0.5 rounded-full border border-[#E7E5E4] text-[#78716C]">
              Phase {goal.phaseNumber}
            </span>
            {cat ? (
              <span
                className={`text-[10px] font-space-grotesk uppercase tracking-wider px-2 py-0.5 rounded-full border ${cat.className}`}
              >
                {cat.label}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlanReadOnlyView({ plan, ctaHref, ctaLabel = "Generate your own plan \u2192", showAttribution = true }) {
  const generatedOn = formatGenerationDate(plan.generatedDate);
  const goalsByPhase = [1, 2, 3].map((n) => ({
    number: n,
    label: PHASE_LABELS[n].name,
    days: PHASE_LABELS[n].days,
    desc: PHASE_LABELS[n].desc,
    goals: (plan.goals || []).filter((g) => g.phaseNumber === n),
  }));

  return (
    <div className="bg-[#F5F2E8] text-[#1C1917]">
      {/* Plan summary card */}
      <section className="bg-white border border-[#E7E5E4] rounded-2xl p-5 sm:p-7 shadow-sm">
        <p className="font-space-grotesk text-xs font-medium uppercase tracking-[0.6px] text-[#D97757]">
          90-day plan
        </p>
        <h2 className="mt-1.5 font-instrument-serif text-2xl sm:text-3xl text-[#1C1917] leading-tight">
          {plan.roleTitle || "New role"}
          {plan.companyLabel ? (
            <span className="text-[#78716C]"> &middot; {plan.companyLabel}</span>
          ) : null}
        </h2>
        {plan.displayName ? (
          <p className="mt-1 font-space-grotesk text-sm text-[#78716C]">
            Plan owner: {plan.displayName}
          </p>
        ) : null}

        <div className="mt-6">
          <PhaseProgressBar phases={plan.phases || [{ number: 1 }, { number: 2 }, { number: 3 }]} />
        </div>

        {/* Light stats row */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Phases" value="3" />
          <Stat label="Weeks" value="12" />
          <Stat
            label="Goals"
            value={(plan.goals || []).length || "—"}
          />
          <Stat
            label="Stakeholders"
            value={
              typeof plan.stakeholderCount === "number"
                ? plan.stakeholderCount
                : "—"
            }
          />
        </div>
      </section>

      {/* Success definition */}
      {plan.successDefinition ? (
        <section className="mt-5 bg-white border border-[#E7E5E4] rounded-2xl p-5 sm:p-6">
          <h3 className="font-space-grotesk text-xs font-semibold uppercase tracking-[0.6px] text-[#78716C]">
            Success at 90 days
          </h3>
          <p className="mt-2 font-instrument-serif text-lg text-[#1C1917] leading-snug">
            {plan.successDefinition}
          </p>
        </section>
      ) : null}

      {/* Phases + goals */}
      {goalsByPhase.map((phase) => (
        <section key={phase.number} className="mt-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-7 h-7 rounded-full bg-[#FBE9DF] text-[#D97757] flex items-center justify-center font-space-grotesk text-xs font-semibold">
              {phase.number}
            </div>
            <div>
              <p className="font-space-grotesk text-xs font-semibold uppercase tracking-[0.6px] text-[#78716C]">
                {phase.days}
              </p>
              <h3 className="font-instrument-serif text-xl text-[#1C1917]">
                {phase.label}
                <span className="ml-2 text-sm text-[#78716C] font-space-grotesk">
                  &middot; {phase.desc}
                </span>
              </h3>
            </div>
          </div>
          {phase.goals.length === 0 ? (
            <p className="text-sm text-[#78716C] font-space-grotesk">
              No goals in this phase.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {phase.goals.map((g, i) => (
                <GoalCard key={i} goal={g} />
              ))}
            </div>
          )}
        </section>
      ))}

      {/* Stakeholders (count + optional roles) */}
      {typeof plan.stakeholderCount === "number" && plan.stakeholderCount > 0 ? (
        <section className="mt-8 bg-white border border-[#E7E5E4] rounded-2xl p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#F5F2E8] text-[#1C1917] flex items-center justify-center shrink-0">
              <Icon icon="solar:users-group-rounded-linear" width={18} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-space-grotesk text-sm font-medium text-[#1C1917]">
                {plan.stakeholderCount} key{" "}
                {plan.stakeholderCount === 1 ? "stakeholder" : "stakeholders"} mapped
              </h3>
              {plan.stakeholderRolesShown && plan.stakeholderRoles?.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {plan.stakeholderRoles.map((r, i) => (
                    <span
                      key={i}
                      className="text-xs px-2.5 py-1 rounded-full bg-[#F5F2E8] text-[#57534E] border border-[#E7E5E4] font-space-grotesk"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-1 font-space-grotesk text-xs text-[#78716C]">
                  Names are kept private. Roles available on the live plan.
                </p>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {/* Week 1 activity preview */}
      {plan.firstWeekActivities && plan.firstWeekActivities.length > 0 ? (
        <section className="mt-8">
          <h3 className="font-space-grotesk text-xs font-semibold uppercase tracking-[0.6px] text-[#78716C] mb-3">
            Week 1 preview
          </h3>
          <ul className="space-y-2">
            {plan.firstWeekActivities.map((a, i) => (
              <li
                key={i}
                className="bg-white border border-[#E7E5E4] rounded-xl px-4 py-3 flex items-center gap-3"
              >
                <Icon
                  icon="solar:check-circle-linear"
                  width={18}
                  className="text-[#D97757] shrink-0"
                />
                <span className="flex-1 font-space-grotesk text-sm text-[#1C1917]">
                  {a.title}
                </span>
                {a.category ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#E7E5E4] text-[#78716C] font-space-grotesk uppercase tracking-wider">
                    {a.category}
                  </span>
                ) : null}
                {a.durationMin ? (
                  <span className="text-xs text-[#78716C] font-space-grotesk">
                    {a.durationMin}m
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* CTA */}
      <section className="mt-10 text-center">
        <a
          href={ctaHref}
          className="inline-flex items-center justify-center gap-2 bg-[#D97757] hover:bg-[#C26242] text-white px-6 py-3 rounded-full font-space-grotesk font-semibold text-sm transition-colors shadow-sm"
        >
          {ctaLabel}
        </a>
      </section>

      {/* Attribution */}
      {showAttribution ? (
        <p className="mt-8 text-center font-space-grotesk text-xs text-[#78716C]">
          {generatedOn ? `Plan generated ${generatedOn} with ` : "Built in 5 minutes with "}
          <a
            href={ctaHref}
            className="text-[#D97757] hover:underline font-medium"
          >
            Arcora
          </a>
        </p>
      ) : null}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="border border-[#E7E5E4] rounded-xl p-3 text-center bg-[#FAF7F1]">
      <p className="font-space-grotesk text-xs uppercase tracking-[0.5px] text-[#78716C]">
        {label}
      </p>
      <p className="mt-0.5 font-instrument-serif text-2xl text-[#1C1917]">
        {value}
      </p>
    </div>
  );
}
