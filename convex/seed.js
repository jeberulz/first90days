import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";
import { isPilotEmail, PILOT_PLAN_START_DATE } from "./lib/pilotUser";
import { scheduleYmd } from "./lib/planDates";

async function _reconcilePilotSchedule(ctx, userId) {
  const user = await ctx.db.get(userId);
  if (!user || !isPilotEmail(user.email)) {
    throw new Error("Pilot schedule sync is only available for the pilot account.");
  }

  const onboardingRow = await ctx.db
    .query("onboardingData")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  if (onboardingRow) {
    await ctx.db.patch(onboardingRow._id, { startDate: PILOT_PLAN_START_DATE });
  }

  const activities = await ctx.db
    .query("activities")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  let activitiesUpdated = 0;
  for (const a of activities) {
    if (typeof a.scheduledDay !== "number") continue;
    const nextDate = scheduleYmd(PILOT_PLAN_START_DATE, a.scheduledDay);
    if (a.scheduledDate === nextDate) continue;
    await ctx.db.patch(a._id, { scheduledDate: nextDate });
    activitiesUpdated += 1;
  }

  return {
    planId: (
      await ctx.db
        .query("plans")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first()
    )?._id,
    activitiesUpdated,
    hadOnboarding: !!onboardingRow,
  };
}

// Map activity priority labels in the source seed (Must/Should) to the
// High/Medium/Low scale the rest of the app uses for filtering and styling.
function _activityPriority(p) {
  if (p === "Must") return "High";
  if (p === "Should") return "Medium";
  if (p === "Could" || p === "Nice") return "Low";
  return p; // already High/Medium/Low — pass through
}

async function _seedPlanData(ctx, userId) {
  const startDate = PILOT_PLAN_START_DATE;

  const onboarding = {
    roleTitle: "Staff Product Designer",
    startDate,
    experienceYears: 14,
    isFirstRoleAtLevel: true,
    roleType: "IC",
    function_: "Design",
    isNewTeam: false,
    scope: "Sole designer for Agent Studio. Embedded across Agent Studio, MCP, and Frontend Experience teams. Responsible for dashboard configuration, AI behaviour patterns (trust, guardrails, explainability), and downstream frontend experiences.",
    companyName: "Algolia",
    companySize: "Growth",
    companyStage: "Scaling",
    workModel: "Remote",
    industry: "AI / Developer Tools / Search & Discovery",
    starsSituation: "AcceleratedGrowth",
    reportsTo: "Director, User Experience (Jess Shutt — interim, pending new design leader hire)",
    selectedGoals: ["relationships", "product_landscape", "quick_win"],
    successDefinition: "North star: Algolia is simple to use, works out of the box, and less engagement is a success signal because the product does the work. Personally over the first 90 days: ship a UX audit shared across all teams, align with Kim on agent consistency vs divergence, ship one design improvement to beta customers with measured result, run an AI prototyping session for the design team, and propose a strategic dashboard or agent UX initiative.",
    existingContext: "Algolia is a search-as-a-service company expanding into AI agents; Agent Studio is the new pillar (the business bet) that may eventually replace classic search with an agentic experience. Sole designer for Agent Studio, embedded across Agent Studio, MCP, and Frontend Experience teams. Two PMs (Imogen on Frontend/MCP, Peter on the Agent Studio backend pillar) and three engineering teams. Reports to Jess Shutt (Director, UX) on an interim basis — a new design leader will be hired in the first 90 days. Design team is 6 designers, under-resourced, in an explicit AI experimentation phase (no locked-in process; Jess's hard rule is everything must be shareable and commentable). No A/B testing yet — qualitative interviews with design partners and Hex analytics dominate. Research is democratized through Confluence and Research Ops; Zen leads AI research. Tools: Figma, Claude Code, Cursor (about half the team), GitHub, Vercel for staging prototypes, Loom, Confluence (lots of noise).",
    challenges: "Sole designer across 3 teams — scope creep is guaranteed; need to agree explicit time allocation with Imogen and Peter and revisit monthly. Leadership vacuum: no permanent design manager, Jess is supportive but won't give design direction; lean on Duncan as principal-level sounding board and over-document decisions for the incoming leader. Peter operates like a CEO not an IC PM — be direct, move fast, don't wait for written briefs. Many stakeholders want involvement in Agent Studio — establish an async update channel (Slack/Loom/Confluence) by week 5. Team is behind on AI adoption and Jess has explicitly named me thought leader for AI in design workflow. No A/B testing capability — must rely on qualitative validation, Hex funnels, and staging prototypes for design partners. Confluence and Slack noise — target the signal via Zen and the PMs. Backend A/B test variants may pollute audit findings — confirm active experiments before evaluating any surface.",
    jobDescription: "Staff Product Designer — Agent Studio (Algolia, Remote, London/EMEA). Sole designer responsible for the dashboard configuration experience for Agent Studio, AI behaviour patterns (trust, guardrails, explainability), and downstream frontend experiences. Embedded across Agent Studio (backend pillar), MCP, and Frontend Experience teams. Partners with PMs Imogen (Frontend/MCP) and Peter (pillar lead, ex-CEO), three engineering teams (Yousef leads Dashboard EM), Lead Researcher Zen on AI, and the wider 6-person design team led on an interim basis by Director of UX Jess Shutt. Connect dashboard configuration to downstream customer outcomes; run UX audits, build agent UX patterns that work for both customer-facing Agent Studio and internal optimization/productivity agents (alignment with Kim is an explicit success measure), and propose strategic initiatives such as a greenfield dashboard reinvention. Tools: Figma + Claude Code + GitHub + Vercel staging; Hex analytics; Confluence/Slack/Loom for shareable artifacts. Compensation: £125,000 base + 10% bonus + £5,000 signing + 5,139 stock options (4-year vest, 1-year cliff). 3-month probation extendable to 6. Remote with optional London office and Paris engineering visits.",
  };

  const onboardingRow = await ctx.db
    .query("onboardingData")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  if (!onboardingRow) {
    await ctx.db.insert("onboardingData", { userId, ...onboarding });
  } else {
    await ctx.db.patch(onboardingRow._id, onboarding);
  }

  const planId = await ctx.db.insert("plans", {
    userId,
    status: "active",
    overallCompletion: 0,
  });

  const phaseData = [
    { number: 1, name: "LEARN", startDay: 1, endDay: 30, milestone: "UX Audit shared with all teams. Kim alignment framework drafted. Every key stakeholder has had a 1:1. Can explain Agent Studio architecture without notes.", status: "active" },
    { number: 2, name: "SHIP", startDay: 31, endDay: 60, milestone: "One design improvement shipped to beta customers with measured result. AI prototyping session delivered. Stakeholder communication rhythm established. Shared definition of AI success for design team drafted.", status: "upcoming" },
    { number: 3, name: "LEAD", startDay: 61, endDay: 90, milestone: "Strategic initiative proposed and discussed at leadership level. Agent UX patterns documented. New design leader relationship established. 90-day reflection shared.", status: "upcoming" },
  ];

  const phaseIds = [];
  for (const p of phaseData) {
    const id = await ctx.db.insert("phases", { planId, userId, ...p });
    phaseIds.push(id);
  }

  // weekIndex 0..11 — phase index 0..2 — theme + reflection prompt.
  const weekThemes = [
    { number: 1, phase: 0, theme: "People & Product", prompt: "What did I learn about the product or team today that I didn't know yesterday?" },
    { number: 2, phase: 0, theme: "Team Integration & Listening", prompt: "What surprised me this week about how the team works?" },
    { number: 3, phase: 0, theme: "Audit & Synthesis", prompt: "What friction point did I observe today that connects to what customers have told us?" },
    { number: 4, phase: 0, theme: "Share & Align", prompt: "How did people react to my audit findings? What resonated? What surprised them?" },
    { number: 5, phase: 1, theme: "Pick & Scope Quick Win", prompt: "What design decision did I make today? What was the reasoning?" },
    { number: 6, phase: 1, theme: "Design & Validate", prompt: "What feedback changed my design direction today?" },
    { number: 7, phase: 1, theme: "Build & Ship", prompt: "What did I ship or unblock today?" },
    { number: 8, phase: 1, theme: "Measure & Document", prompt: "What would I do differently if I started this project over?" },
    { number: 9, phase: 2, theme: "Strategic Thinking", prompt: "What pattern am I seeing across the product that nobody has connected yet?" },
    { number: 10, phase: 2, theme: "Build Coalition", prompt: "Who did I bring along on the journey today? Who am I missing?" },
    { number: 11, phase: 2, theme: "Present & Begin", prompt: "If I had to describe my biggest contribution so far in one sentence, what would it be?" },
    { number: 12, phase: 2, theme: "Reflect & Plan", prompt: "What would I tell someone starting this role tomorrow?" },
  ];

  const weekIds = [];
  for (const w of weekThemes) {
    const id = await ctx.db.insert("weeks", {
      planId,
      phaseId: phaseIds[w.phase],
      userId,
      number: w.number,
      theme: w.theme,
      reflectionPrompt: w.prompt,
      reviewQuestions: [
        "What were your biggest accomplishments this week?",
        "What challenges did you face and how did you handle them?",
        "What did you learn about the team or product?",
        "How are your key relationships progressing?",
        "What's your top priority for next week?",
      ],
    });
    weekIds.push(id);
  }

  // ── Stakeholders ──────────────────────────────────────────────────────
  // Insert first so activities can reference relatedStakeholderId. The
  // "key" string is only used to wire activities → stakeholders below; it
  // is not persisted.
  const stakeholderData = [
    { key: "jess", name: "Jess Shutt", role: "Director, User Experience (Interim Design Lead)", type: "Manager", priority: "Must", scheduled: true, firstDate: "2026-04-14", cadenceDays: 7, bg: "Interim manager. Leads Research & Insights. Not a design expert, won't second-guess design decisions. Outcomes-focused: 'I don't care how you got there, I care that you deliver.' Will point out political blockers and leadership opportunities. Previously at Salesforce (ML research) and Twilio. Two success measures: (1) align with Kim on agent consistency vs divergence, (2) manage stakeholder interest while moving fast. Prefers 1:1s focused on real problems, not status updates. Hates wasted face time — don't give status updates, discuss real blockers and stakeholder challenges. Weekly 1:1 for first month, then every other week. You'll have an onboarding buddy. Encouraging you to push the envelope on AI in design workflow. Said 'you've gone farther with AI than most of the team' and wants you as thought leader for AI adoption. Team is in explicit experimentation phase with AI — no process locked in yet. Jess's rule: everything must be shareable and commentable. Team ceremonies: design studio (crit, twice weekly), team meetings, monthly retros. Jess not your long-term boss — will hire a new design leader and you may have input on that hire. Stephen (new CEO) in third week, still learning. Jess said Peter (PM) operates like a CEO and sometimes forgets PM responsibilities — manage accordingly." },
    { key: "imogen", name: "Imogen", role: "PM, Frontend/MCP", type: "CrossFunctional", priority: "Must", scheduled: true, firstDate: "2026-03-28", cadenceDays: 7, bg: "Met during Cross-Functional Collaboration interview. Owns frontend experience: how dashboard config translates into customer-facing experiences. Also owns MCP (connecting Algolia data to external agents). SKI tool funnels users into Agent Studio. Team not doing A/B testing yet due to scale — qualitative interviews with design partners instead. Previous designer left. She described the org: 2 PMs (her + Peter), 3 eng teams, designer works across all. Mentioned internal eval framework for latency/relevancy/ranking. Positive interview, engaged throughout." },
    { key: "peter", name: "Peter", role: "PM, Backend Agent Studio (Pillar Lead)", type: "CrossFunctional", priority: "Must", scheduled: false, bg: "Haven't met yet. Leads the Agent Studio pillar (business bet). Former founder/CEO multiple times, first IC PM role in a long time. Jess warned: operates like a CEO, sometimes forgets to write things down because he's used to having a team under him. Will have strong opinions and move fast. London-based — good for in-person meetings. Need to understand his priorities in first 2 days. Expect directness and speed from him." },
    { key: "yousef", name: "Yousef", role: "Engineering Manager, Dashboard", type: "CrossFunctional", priority: "Must", scheduled: true, firstDate: "2026-04-02", cadenceDays: 7, bg: "Met during Ownership interview. 8 years at Algolia. Dashboard team works closely with Agent Studio. Layered API philosophy: visual layer, business logic, primitives. Values data-driven design. His team runs their own analytics using Hex. Doesn't need embedded data science — engineers handle it. Said 'less engagement = success' as a metric. Excited about John's coding background. Will appreciate specs that reduce engineering ambiguity." },
    { key: "duncan", name: "Duncan", role: "Principal Product Designer", type: "Peer", priority: "Must", scheduled: true, firstDate: "2026-03-31", bg: "Met during UX Craft interview. 3.5 years at Algolia. Built Merch Studio. Currently 'floaty designer' helping across teams. Based in London. Previously at Twilio (like Jess). Said 'this is awesome' about the Sandbox prototype. Adapted his interview around it. Team is 6 designers, under-resourced. Design needs to 'find a voice and influence.' Main Algolia problem: too much indexing on developer persona, not enough for low-code users. Team trying to integrate Claude Code. Wants Agent Studio to grow beyond chatbots into workflow agents. Key ally at principal level." },
    { key: "kim", name: "Kim", role: "Product Designer, Optimization / Agent Studio (Productivity)", type: "Peer", priority: "Must", scheduled: false, bg: "Met during panel round. Works on optimization and productivity agents (internal-facing). Under the 'optimize' team. Jess's explicit success measure: align with Kim on when agent patterns should be consistent vs different. Currently defaulting to consistency for consistency's sake — Jess says 'that's a bad answer.' Different audiences (customer-facing vs internal productivity) need different patterns even though they have slightly different audiences. Kim builds her own funnel dashboards using Hex. Early 1:1 critical — week 1-2. Jess said both your EMs (Kim's and yours) are 'really really strong in terms of how they partner with design.'" },
    { key: "etienne", name: "Etienne Martin", role: "VP Product", type: "SkipLevel", priority: "Should", scheduled: true, firstDate: "2026-04-02", cadenceDays: 90, bg: "Met during VP interview. Sets the vision. Wants: dashboard reinvention ('greenfield'), 'works out of the box', design participating earlier in problem definition. Agent Studio defensive posture: search may be replaced by agentic experience. Next 6 months: nail core. 12 months: new use cases and revenue lines. Success metric: 'Algolia is simple to use.' Less engagement = product working. New CEO joined same week." },
    { key: "zen", name: "Zen", role: "Lead User Researcher, AI/Agent Studio", type: "CrossFunctional", priority: "Must", scheduled: false, bg: "From Jess's call. Lead researcher for AI. Agent Studio is their home team but they move between spaces more flexibly than designers do. About to focus on data quality blocker: customers think their data is too bad for AI (often not true — sometimes AI can clean it, sometimes they just need to add events). This research directly impacts Agent Studio adoption. Also was primary researcher for all genAI features (genAI toolkit, comparison tables, recommended queries). Key partner for UX audit and customer insights. Research data is on Confluence, almost all public (PII scrubbed). No embedded data science on your team — engineers run their own analytics via Hex. Research is democratized: you're encouraged to run your own research, research ops will support. Connect with Zen in week 1." },
    { key: "robin", name: "Robin", role: "Head of Growth", type: "CrossFunctional", priority: "Should", scheduled: false, bg: "From Jess's call. Former designer turned Head of Growth. Owns biggest customer population (freemium). Very experimentation-minded. Has most data about customer behaviour. Jess said 'you'll probably see him a lot' and 'we love hanging out with him, he's a very smart dude.' Good source of customer data and experiment patterns even though Agent Studio is paid product. Your work won't be directly in his space but he has the data you'll need." },
    { key: "tanya", name: "Tanya", role: "PM (Growth, on loan to Agent Studio)", type: "CrossFunctional", priority: "Should", scheduled: false, bg: "From Jess's call. Technically on Growth but on loan to Agent Studio. May work with you or with Chloe (new growth designer). Understand her scope early." },
    { key: "chloe", name: "Chloe", role: "Product Designer, Growth (New Hire)", type: "Peer", priority: "Could", scheduled: false, bg: "From Jess's call. Just hired for Growth. Another new joiner. Could be an onboarding ally." },
    { key: "new_design_leader", name: "TBD (New Design Leader)", role: "Replacing James as Design Manager", type: "Manager", priority: "Must", scheduled: false, bg: "Will be hired during first 90 days. Jess said 'hopefully you'll have a say in who your next boss is.' Your 90-day work becomes the foundation of this relationship. Make it excellent. Document decisions clearly so the new leader can understand your rationale when they arrive." },
  ];

  const stakeholderIdByKey = {};
  for (const s of stakeholderData) {
    const id = await ctx.db.insert("stakeholders", {
      userId,
      name: s.name,
      role: s.role,
      relationshipType: s.type,
      priority: s.priority,
      backgroundContext: s.bg,
      firstMeetingScheduled: !!s.scheduled,
      ...(s.firstDate ? { firstMeetingDate: s.firstDate } : {}),
      ...(s.cadenceDays ? { cadenceDays: s.cadenceDays } : {}),
      workingPreferences: [],
    });
    stakeholderIdByKey[s.key] = id;
  }

  // ── Activities ────────────────────────────────────────────────────────
  // weekIndex is 0-based (matches weekIds and weekThemes). day is 1..90.
  const activities = [
    // Week 1 — People & Product
    { week: 0, day: 1, title: "IT setup and tool access", desc: "Laptop arrives week before. Day 1: IT call, get logged into Slack, Figma, Confluence, Hex, email. Set up Claude Code and development environment on personal machine for side projects (separate from work).", cat: "learning", time: "2hr+", priority: "Must" },
    { week: 0, day: 1, title: "1:1 with Jess (manager)", desc: "First formal 1:1. She'll give you an onboarding plan. Ask: what does success look like beyond what we discussed in the pre-start call? Any political dynamics I should know about? Who is my onboarding buddy?", cat: "relationships", time: "30min", priority: "Must", rel: "jess" },
    { week: 0, day: 2, title: "1:1 with Imogen (PM, Frontend/MCP)", desc: "Deepen the relationship from interview. Ask: what's the most urgent product question you need design help with right now? What customer design partners should I talk to first?", cat: "relationships", time: "30min", priority: "Must", rel: "imogen" },
    { week: 0, day: 2, title: "1:1 with Peter (PM, Pillar Lead)", desc: "First meeting. Critical. He's a former CEO adjusting to IC PM. Be direct. Ask: what are your top 3 priorities for Agent Studio this quarter? What does he need from design in the first month? Understand his working style.", cat: "relationships", time: "30min", priority: "Must", rel: "peter" },
    { week: 0, day: 3, title: "1:1 with Yousef (EM, Dashboard)", desc: "Reconnect from interview. Ask: what's in the current sprint? What engineering capacity is available? How does his team prefer to receive design input? Get access to Hex dashboards.", cat: "relationships", time: "30min", priority: "Must", rel: "yousef" },
    { week: 0, day: 3, title: "1:1 with Duncan (Principal Designer)", desc: "Reconnect from interview. Ask: what design patterns has the team explored for agent experiences? What's the design system state? How do design studio sessions work?", cat: "relationships", time: "30min", priority: "Must", rel: "duncan" },
    { week: 0, day: 4, title: "1:1 with Kim (Designer, Optimization/Productivity)", desc: "Jess's explicit success measure. Ask: how are you currently approaching agent patterns? Where do you think consistency matters vs where should we diverge? What's working and what's frustrating?", cat: "relationships", time: "30min", priority: "Must", rel: "kim" },
    { week: 0, day: 4, title: "1:1 with Zen (Lead Researcher, AI)", desc: "Understand current research landscape. Ask: what studies have been done on Agent Studio? What's the data quality blocker they're investigating? Where are the biggest open questions? Get access to all research on Confluence.", cat: "relationships", time: "30min", priority: "Must", rel: "zen" },
    { week: 0, day: 5, title: "Full Agent Studio product walkthrough", desc: "Create 3+ agents using different templates and from scratch. Test MCP connections (Public and Productivity). Try the SKI tool. Time everything. Document every friction point. Screenshot everything.", cat: "learning", time: "2hr+", priority: "Must" },
    { week: 0, day: 5, title: "Review existing Agent Studio design files in Figma", desc: "Understand what the previous designer built, what shipped, what's in progress, what was abandoned. Note design system components used and gaps.", cat: "learning", time: "1hr", priority: "Should" },

    // Week 2 — Team Integration & Listening
    { week: 1, day: 6, title: "Attend all standups (Agent Studio, MCP, Frontend Experience)", desc: "Just listen. Take notes. Understand sprint priorities, blockers, and team dynamics. Don't contribute yet.", cat: "learning", time: "30min", priority: "Must" },
    { week: 1, day: 6, title: "Meet onboarding buddy", desc: "Jess mentioned you'll have one. Lean on them for cultural questions, tool tips, and navigating Confluence/Slack noise.", cat: "relationships", time: "30min", priority: "Should" },
    { week: 1, day: 7, title: "Attend design studio session", desc: "Listen and give feedback on others' work. Don't present your own work yet. Show you're a thoughtful critic before you're a contributor.", cat: "relationships", time: "1hr", priority: "Must" },
    { week: 1, day: 7, title: "Read all Agent Studio research on Confluence", desc: "Zen will point you to the right places. Read every customer interview transcript, research finding, and insight doc available. Take notes on patterns.", cat: "learning", time: "2hr+", priority: "Must" },
    { week: 1, day: 8, title: "Explore the full Algolia dashboard beyond Agent Studio", desc: "Understand search configuration, analytics, indices, rules, merchandising. Agent Studio designs can't conflict with the rest of the platform.", cat: "learning", time: "2hr+", priority: "Should" },
    { week: 1, day: 9, title: "Try competitor products", desc: "Voiceflow, Botpress, Amazon Bedrock Agents, LangChain. Note patterns that work and don't work. Build a lightweight competitive reference doc.", cat: "learning", time: "2hr+", priority: "Should" },
    { week: 1, day: 10, title: "Review the internal eval framework", desc: "Imogen mentioned internal evals for latency, relevancy, ranking. Understand how it works. This connects to the LLM Leaderboard they just published and to your Sandbox concept.", cat: "learning", time: "1hr", priority: "Should" },
    { week: 1, day: 10, title: "1:1 with Robin (Head of Growth)", desc: "Former designer. Owns biggest customer population. Experimentation-minded. Ask: what does he know about Agent Studio adoption? What data does his team have about customer behaviour?", cat: "relationships", time: "30min", priority: "Should", rel: "robin" },

    // Week 3 — Audit & Synthesis
    { week: 2, day: 11, title: "Start writing UX Audit document", desc: "Map the full Agent Studio journey: signup, first agent, configuration (prompt, tools, customisations, provider/model), testing (chat panel), publishing, analytics, conversations. Annotate friction points with screenshots.", cat: "learning", time: "2hr+", priority: "Must" },
    { week: 2, day: 12, title: "Cross-reference audit with customer feedback", desc: "Match your friction points with what customers have said in research. Where do your observations align? Those are the highest-confidence problems.", cat: "learning", time: "1hr", priority: "Must" },
    { week: 2, day: 13, title: "Document design system gaps for Agent Studio", desc: "What components exist? What's missing? What's inconsistent with the rest of the dashboard? Note where Kim's optimization patterns overlap or conflict.", cat: "learning", time: "1hr", priority: "Should" },
    { week: 2, day: 13, title: "Attend second design studio session", desc: "Give useful feedback on at least one project. Reference something you learned from your audit. Start building your reputation as someone who sees the system.", cat: "relationships", time: "1hr", priority: "Must" },
    { week: 2, day: 14, title: "Draft Kim alignment framework", desc: "Based on your audit and conversations with Kim, start documenting: which patterns should be shared (e.g., agent configuration basics) vs different (e.g., internal productivity agents don't need the same trust/guardrail patterns as customer-facing ones).", cat: "shipping", time: "1hr", priority: "Must", rel: "kim" },
    { week: 2, day: 15, title: "Identify the configuration-to-outcome gap", desc: "The JD said 'connect dashboard configuration to downstream outcomes.' Map where this connection is weakest. This becomes the core of your Phase 2 quick win.", cat: "learning", time: "1hr", priority: "Must" },

    // Week 4 — Share & Align
    { week: 3, day: 16, title: "Present UX Audit in design studio", desc: "15 minutes max. Frame as 'fresh eyes findings.' Don't propose solutions. Diagnose. Ask for feedback. This is your first public contribution to the team.", cat: "influence", time: "1hr", priority: "Must" },
    { week: 3, day: 17, title: "Share written audit with Imogen, Peter, and Yousef", desc: "Async via Confluence. Let them validate or challenge your observations. Ask: does this match what you're seeing?", cat: "influence", time: "30min", priority: "Must", rel: "imogen" },
    { week: 3, day: 18, title: "Discuss research priorities with Zen", desc: "Which audit findings should become research questions? Which already have data? Where can Zen's upcoming data quality research inform your work?", cat: "relationships", time: "30min", priority: "Must", rel: "zen" },
    { week: 3, day: 18, title: "Share Kim alignment framework draft with Kim and Jess", desc: "Get their input. Jess specifically asked for this. Kim's buy-in is essential. Frame as a starting point, not a final answer.", cat: "influence", time: "30min", priority: "Must", rel: "kim" },
    { week: 3, day: 19, title: "Identify quick win candidates for Phase 2", desc: "From your audit, list 2-3 problems that meet the criteria: small enough to ship in 2-3 weeks, measurable, connected to customer pain. Discuss with Imogen before committing.", cat: "learning", time: "1hr", priority: "Must", rel: "imogen" },
    { week: 3, day: 20, title: "Write 30-day reflection", desc: "What surprised you? What's harder than expected? What's the single biggest opportunity? Share with Jess in your 1:1. This feeds into the Phase 1 review.", cat: "learning", time: "30min", priority: "Must" },

    // Week 5 — Pick & Scope Quick Win
    { week: 4, day: 21, title: "Discuss quick win options with Imogen and Peter", desc: "Present 2-3 candidates from your audit. Let PMs help prioritise based on quarterly goals. Don't pick in isolation. The act of discussing options shows staff-level thinking.", cat: "shipping", time: "1hr", priority: "Must", rel: "imogen" },
    { week: 4, day: 21, title: "Set up Agent Studio design Slack channel or async update", desc: "Jess's second success measure: manage stakeholder interest. Create an async mechanism to keep people informed. Post your first update: 'Here's what I'm working on this week.'", cat: "influence", time: "30min", priority: "Must" },
    { week: 4, day: 22, title: "Write hypothesis for chosen quick win", desc: "'If we [change X], we expect [metric Y] to improve because [user insight from audit].' Define success criteria before designing.", cat: "shipping", time: "30min", priority: "Must" },
    { week: 4, day: 23, title: "Begin design in Figma", desc: "Start with the team's existing design system. Use existing components where possible. Only create new components where genuinely needed.", cat: "shipping", time: "2hr+", priority: "Must" },

    // Week 6 — Design & Validate
    { week: 5, day: 26, title: "Build code prototype of quick win", desc: "Use Claude Code. Deploy to Vercel. This is your workflow in action. The prototype becomes a case study for the team.", cat: "shipping", time: "2hr+", priority: "Must" },
    { week: 5, day: 27, title: "Run AI prototyping session in design studio", desc: "Jess explicitly wants this. Show your Claude Code + Figma MCP + GitHub + Vercel workflow. Live demo, not slides. Make it practical. Team is behind on AI adoption. You're the catalyst.", cat: "influence", time: "1hr", priority: "Must" },
    { week: 5, day: 28, title: "Present design in design studio for peer feedback", desc: "Show Figma and code prototype. Get feedback from Duncan and Kim especially.", cat: "shipping", time: "1hr", priority: "Must" },
    { week: 5, day: 29, title: "Test with 3-5 beta customers (design partners)", desc: "Imogen connects you to customer design partners. Qualitative validation since you don't have A/B test traffic. Use staging environment approach you discussed with Yousef.", cat: "shipping", time: "2hr+", priority: "Must", rel: "imogen" },

    // Week 7 — Build & Ship
    { week: 6, day: 31, title: "Work with engineering on build", desc: "Bring wireframes and code prototype. Weekly reviews. No handoff surprises. Speak Yousef's language: API schemas, state management, component reusability.", cat: "shipping", time: "2hr+", priority: "Must", rel: "yousef" },
    { week: 6, day: 33, title: "Build staging version for customer testing", desc: "If applicable, host on Vercel. Customers test without affecting production. The approach you described to Yousef for limited traffic environments.", cat: "shipping", time: "2hr+", priority: "Should" },
    { week: 6, day: 34, title: "Draft shared definition of AI success for design team", desc: "Jess flagged: no shared definition. Some say efficiency, some say fun. Draft a practical framework with 3-4 criteria. Share with Jess for input before presenting to team.", cat: "influence", time: "1hr", priority: "Should" },

    // Week 8 — Measure & Document
    { week: 7, day: 36, title: "Ship to beta customers", desc: "Coordinate with engineering on release. Monitor results using Hex analytics and qualitative feedback from design partners.", cat: "shipping", time: "1hr", priority: "Must" },
    { week: 7, day: 38, title: "Document the full cycle", desc: "Hypothesis, design, what you tested, what happened, what you learned. This becomes your credibility deposit. Share on Confluence and Slack.", cat: "shipping", time: "1hr", priority: "Must" },
    { week: 7, day: 39, title: "Start contributing to Agent Studio design system", desc: "If you created components for your quick win, document and share them. Contribute back.", cat: "influence", time: "1hr", priority: "Should" },
    { week: 7, day: 40, title: "Write 60-day reflection", desc: "What you shipped, what worked, what you'd do differently. Relationship health check. Goal progress. Share with Jess.", cat: "learning", time: "30min", priority: "Must" },

    // Week 9 — Strategic Thinking
    { week: 8, day: 41, title: "Choose strategic initiative", desc: "Option A: Dashboard vision (Etienne's 'greenfield' brief). Option B: Agent UX pattern library (defining what good agent UX looks like for Algolia). Discuss with Jess and Duncan.", cat: "influence", time: "1hr", priority: "Must" },
    { week: 8, day: 43, title: "Write initiative brief", desc: "One page: the problem, the opportunity, the approach, the timeline, what success looks like. Ground it in your audit findings and customer data.", cat: "influence", time: "2hr+", priority: "Must" },
    { week: 8, day: 44, title: "Discuss brief with Imogen and Peter", desc: "Get PM input before presenting broadly. They'll flag priorities, constraints, and political dynamics.", cat: "influence", time: "30min", priority: "Must", rel: "imogen" },

    // Week 10 — Build Coalition
    { week: 9, day: 46, title: "Share brief with Yousef for engineering feasibility", desc: "Understand technical constraints and effort. Bring wireframes, not polished designs.", cat: "influence", time: "30min", priority: "Must", rel: "yousef" },
    { week: 9, day: 47, title: "Share brief with Duncan for design perspective", desc: "He's principal level. His endorsement matters for the design org.", cat: "influence", time: "30min", priority: "Must", rel: "duncan" },
    { week: 9, day: 49, title: "Incorporate feedback and refine", desc: "Update the brief based on all stakeholder input. Prepare a 10-minute design studio presentation.", cat: "influence", time: "1hr", priority: "Must" },

    // Week 11 — Present & Begin
    { week: 10, day: 51, title: "Present initiative in design studio", desc: "10-15 minutes. Show the opportunity, the approach, early explorations. Ask for feedback. This positions you as someone who sees beyond individual features.", cat: "influence", time: "1hr", priority: "Must" },
    { week: 10, day: 52, title: "Share with Jess and leadership", desc: "Frame as: 'Here's what I've learned in 60 days, here's the biggest opportunity, here's how I'd approach it.' If new design leader has been hired, include them.", cat: "influence", time: "30min", priority: "Must", rel: "jess" },
    { week: 10, day: 54, title: "Begin first sprint of initiative", desc: "Even if not formally prioritised, starting the exploration shows ownership. Adjust scope based on feedback.", cat: "shipping", time: "2hr+", priority: "Should" },

    // Week 12 — Reflect & Plan
    { week: 11, day: 56, title: "Write 90-day reflection", desc: "What you shipped, what you learned, relationships built, what you'd do differently, what you're proposing next. Comprehensive. This is your performance review foundation.", cat: "learning", time: "1hr", priority: "Must" },
    { week: 11, day: 58, title: "Share 90-day reflection with Jess (or new design leader)", desc: "If new leader is in place, this is your introduction document. If still Jess, it's your probation evidence.", cat: "influence", time: "30min", priority: "Must", rel: "jess" },
    { week: 11, day: 59, title: "Plan next quarter", desc: "Based on initiative brief feedback, quick win results, and team needs. Propose your own Q2 priorities. Staff level means you propose direction, you don't wait for it.", cat: "influence", time: "1hr", priority: "Must" },
    { week: 11, day: 60, title: "Publish one piece of content about agent UX patterns", desc: "Internal or external. Could be a Confluence doc, a design studio talk, or a LinkedIn post. Share what you've learned about designing for AI agents. Position yourself as a thinker in this space.", cat: "influence", time: "1hr", priority: "Should" },
  ];

  for (const a of activities) {
    await ctx.db.insert("activities", {
      planId,
      weekId: weekIds[a.week],
      userId,
      weekNumber: a.week + 1,
      title: a.title,
      description: a.desc,
      category: a.cat,
      estimatedTime: a.time,
      priority: _activityPriority(a.priority),
      ...(a.rel && stakeholderIdByKey[a.rel]
        ? { relatedStakeholderId: stakeholderIdByKey[a.rel] }
        : {}),
      scheduledDate: scheduleYmd(startDate, a.day),
      scheduledDay: a.day,
      status: "upcoming",
      isCustom: false,
      source: "seed",
    });
  }

  // ── Goals ─────────────────────────────────────────────────────────────
  const goalData = [
    { title: "Complete Agent Studio UX Audit", phase: 1, cat: "learning" },
    { title: "Align with Kim on agent consistency framework", phase: 1, cat: "relationships" },
    { title: "Build trusted relationships across all three engineering teams", phase: 1, cat: "relationships" },
    { title: "Ship first design improvement to beta customers", phase: 2, cat: "shipping" },
    { title: "Run AI prototyping session for design team", phase: 2, cat: "influence" },
    { title: "Establish stakeholder communication rhythm for Agent Studio design", phase: 2, cat: "influence" },
    { title: "Contribute to shared definition of AI success for design team", phase: 2, cat: "influence" },
    { title: "Propose strategic initiative (dashboard vision or agent UX patterns)", phase: 3, cat: "influence" },
  ];

  for (const g of goalData) {
    await ctx.db.insert("goals", {
      userId,
      title: g.title,
      targetPhase: g.phase,
      category: g.cat,
      status: "not_started",
    });
  }

  await ctx.db.patch(userId, { onboardingComplete: true });

  // Kick off company research drafts for the pilot user. We only schedule
  // one run per pilot install — if a companyResearchJobs row already exists
  // (from a previous seed or manual trigger) we leave it alone so we don't
  // burn tokens on every reseed.
  const existingJob = await ctx.db
    .query("companyResearchJobs")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  if (!existingJob) {
    const jobId = await ctx.db.insert("companyResearchJobs", {
      userId,
      status: "queued",
      trigger: "onboarding",
      inputSnapshot: {
        companyName: onboarding.companyName,
        roleTitle: onboarding.roleTitle,
        industry: onboarding.industry,
        companySize: onboarding.companySize,
        companyStage: onboarding.companyStage,
        starsSituation: onboarding.starsSituation,
        scope: onboarding.scope,
        jobDescription: onboarding.jobDescription,
        experienceYears: onboarding.experienceYears,
        isNewTeam: onboarding.isNewTeam,
        workModel: onboarding.workModel,
        reportsTo: onboarding.reportsTo,
      },
    });
    await ctx.scheduler.runAfter(
      0,
      internal.companyResearch.generateDraftsForUser,
      { userId, jobId }
    );
  }

  return planId;
}

async function _wipeUserData(ctx, userId) {
  const activityRows = await ctx.db
    .query("activities")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const row of activityRows) {
    await ctx.db.delete(row._id);
  }

  // Weeks: query by plan (by_plan). Avoids weeks.by_user, which can be unavailable during index backfill.
  const planRows = await ctx.db
    .query("plans")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const plan of planRows) {
    const weekRows = await ctx.db
      .query("weeks")
      .withIndex("by_plan", (q) => q.eq("planId", plan._id))
      .collect();
    for (const row of weekRows) {
      await ctx.db.delete(row._id);
    }
  }

  const tables = [
    "phases",
    "plans",
    "goals",
    "stakeholders",
    "interactions",
    "logEntries",
    "dailyReflections",
    "weeklyReviews",
    "knowledgeEntries",
  ];

  for (const table of tables) {
    const rows = await ctx.db
      .query(table)
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const row of rows) {
      await ctx.db.delete(row._id);
    }
  }
}

export const reconcilePilotPlanSchedule = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await _reconcilePilotSchedule(ctx, userId);
  },
});

export const seedJohnsPlan = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || !isPilotEmail(user.email)) {
      throw new Error(
        "Sample plan is only available for the pilot account. Complete onboarding to build your plan."
      );
    }

    const existingPlan = await ctx.db
      .query("plans")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existingPlan) {
      await _reconcilePilotSchedule(ctx, userId);
      return existingPlan._id;
    }

    return await _seedPlanData(ctx, userId);
  },
});

export const resetAndReseed = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || !isPilotEmail(user.email)) {
      throw new Error("Reset is only available for the pilot account.");
    }

    await _wipeUserData(ctx, userId);
    return await _seedPlanData(ctx, userId);
  },
});
