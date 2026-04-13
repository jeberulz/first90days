/**
 * Static fallback plan template used when AI plan generation fails or no
 * API key is configured. Every non-pilot user needs *some* plan after
 * onboarding — this keeps them from getting stuck on the loading screen.
 *
 * Contents are deliberately generic and framework-aligned (Watkins /
 * STARS) rather than role-specific, since we have no personalization
 * budget if the AI path is down. The real personalised plan comes from
 * `generatePlan` in ai.js when the API is healthy.
 *
 * Shape is the same as what the AI path produces so `savePlan` can
 * consume either side without branching.
 */

export const FALLBACK_GOALS = [
  {
    title: "Build a map of the team, stakeholders, and decision makers",
    targetPhase: 1,
    category: "relationships",
  },
  {
    title: "Understand the product, tech, and market landscape",
    targetPhase: 1,
    category: "learning",
  },
  {
    title: "Ship one visible, low-risk early win",
    targetPhase: 2,
    category: "shipping",
  },
  {
    title: "Align with your manager on 90-day success criteria",
    targetPhase: 1,
    category: "influence",
  },
  {
    title: "Draft and socialise a strategic plan for quarters 2-3",
    targetPhase: 3,
    category: "influence",
  },
];

export const FALLBACK_WEEK_THEMES = [
  "Orientation & Setup",
  "Context Building",
  "Stakeholder Mapping",
  "Deep Understanding",
  "First Contributions",
  "Building Momentum",
  "Process & Systems",
  "Expanding Impact",
  "Strategic Vision",
  "Mentoring & Growth",
  "Roadmap Influence",
  "Reflection & Next Steps",
];

// 30 activities spanning 90 days. Each entry: title, description,
// category (learning | shipping | relationships | influence),
// estimatedTime, priority (High | Medium | Low), scheduledDay (1-90),
// phaseNumber (1-3), and an optional goalIndex that ties the activity to
// a FALLBACK_GOALS entry so `relatedGoalId` gets populated.
export const FALLBACK_ACTIVITIES = [
  // ── Phase 1: Learn ─────────────────────────────────────────────────
  {
    title: "Meet your manager and confirm expectations",
    description:
      "Book a 60-minute 1:1 with your manager. Ask what success looks like at day 30 / 60 / 90 and what would disappoint them.",
    category: "relationships",
    estimatedTime: "1h",
    priority: "High",
    scheduledDay: 1,
    phaseNumber: 1,
    goalIndex: 3,
  },
  {
    title: "Read the last two quarters of team updates and roadmap docs",
    description:
      "Skim anything in the shared drive or wiki from the past six months: OKRs, roadmap, postmortems. Note questions as you go.",
    category: "learning",
    estimatedTime: "2h",
    priority: "High",
    scheduledDay: 2,
    phaseNumber: 1,
    goalIndex: 1,
  },
  {
    title: "List every stakeholder you need to meet in the first 30 days",
    description:
      "Aim for 10-15 names. Include your manager, peers, key partners, and at least one customer-facing voice.",
    category: "relationships",
    estimatedTime: "45m",
    priority: "High",
    scheduledDay: 3,
    phaseNumber: 1,
    goalIndex: 0,
  },
  {
    title: "Schedule intro 1:1s with your direct team",
    description:
      "30 minutes each. Come with 3 questions: what are you working on, what's blocking you, what do you need from me.",
    category: "relationships",
    estimatedTime: "1h",
    priority: "High",
    scheduledDay: 4,
    phaseNumber: 1,
    goalIndex: 0,
  },
  {
    title: "Shadow one customer call or user session",
    description:
      "Stay silent and listen. The fastest way to understand the product is to watch someone use it under real pressure.",
    category: "learning",
    estimatedTime: "1h",
    priority: "Medium",
    scheduledDay: 6,
    phaseNumber: 1,
    goalIndex: 1,
  },
  {
    title: "Document your first week observations",
    description:
      "Write 1 page: what surprised you, what confused you, what feels broken, what seems healthy. Keep it private for now.",
    category: "learning",
    estimatedTime: "45m",
    priority: "Medium",
    scheduledDay: 7,
    phaseNumber: 1,
    goalIndex: 1,
  },
  {
    title: "Run a peer-level 1:1 with an adjacent team lead",
    description:
      "Find someone one step outside your org. They'll tell you things your own team won't.",
    category: "relationships",
    estimatedTime: "45m",
    priority: "Medium",
    scheduledDay: 10,
    phaseNumber: 1,
    goalIndex: 0,
  },
  {
    title: "Draft your learning agenda for days 1-30",
    description:
      "5 questions you want answered by day 30. Share them with your manager and adjust based on feedback.",
    category: "learning",
    estimatedTime: "1h",
    priority: "High",
    scheduledDay: 12,
    phaseNumber: 1,
    goalIndex: 1,
  },
  {
    title: "Attend an engineering / product review as an observer",
    description:
      "Watch how decisions actually get made. Who talks, who defers, who pushes back.",
    category: "learning",
    estimatedTime: "1h",
    priority: "Medium",
    scheduledDay: 15,
    phaseNumber: 1,
    goalIndex: 1,
  },
  {
    title: "Identify one quick win opportunity for Phase 2",
    description:
      "Something small, visible, and low-risk. Validate it with your manager before committing.",
    category: "shipping",
    estimatedTime: "45m",
    priority: "High",
    scheduledDay: 20,
    phaseNumber: 1,
    goalIndex: 2,
  },
  {
    title: "Complete your STARS situational assessment",
    description:
      "Write one paragraph each for: business situation, team situation, predecessor's legacy, your mandate.",
    category: "learning",
    estimatedTime: "1h",
    priority: "High",
    scheduledDay: 22,
    phaseNumber: 1,
    goalIndex: 3,
  },
  {
    title: "Day 30 review: align with your manager",
    description:
      "Share what you've learned, your hypotheses, and your Phase 2 focus. Course-correct if needed.",
    category: "influence",
    estimatedTime: "1h",
    priority: "High",
    scheduledDay: 30,
    phaseNumber: 1,
    goalIndex: 3,
  },

  // ── Phase 2: Contribute ────────────────────────────────────────────
  {
    title: "Scope the quick win deliverable",
    description:
      "Write a 1-pager: what you'll ship, why it matters, who it unblocks, and when it lands.",
    category: "shipping",
    estimatedTime: "1h",
    priority: "High",
    scheduledDay: 32,
    phaseNumber: 2,
    goalIndex: 2,
  },
  {
    title: "Publish your working principles document",
    description:
      "How you make decisions, run meetings, give feedback. Helps your team calibrate to you fast.",
    category: "influence",
    estimatedTime: "1h",
    priority: "Medium",
    scheduledDay: 34,
    phaseNumber: 2,
  },
  {
    title: "Start a weekly async update to your manager",
    description:
      "3 bullets: what I shipped, what I'm unblocked on, what I need. 10 minutes to write, weeks of goodwill.",
    category: "influence",
    estimatedTime: "30m",
    priority: "Medium",
    scheduledDay: 36,
    phaseNumber: 2,
  },
  {
    title: "Run a team retro on the past 4 weeks",
    description:
      "Classic keep/start/stop format. Facilitate, don't prescribe. Your job is to listen.",
    category: "relationships",
    estimatedTime: "1h",
    priority: "Medium",
    scheduledDay: 38,
    phaseNumber: 2,
  },
  {
    title: "Ship the quick win",
    description:
      "Get it out the door. Announce it in the channel most likely to care. Credit the team.",
    category: "shipping",
    estimatedTime: "2h",
    priority: "High",
    scheduledDay: 42,
    phaseNumber: 2,
    goalIndex: 2,
  },
  {
    title: "Document the quick win outcome",
    description:
      "Before/after, what changed, who noticed. This becomes your 90-day review artifact.",
    category: "shipping",
    estimatedTime: "45m",
    priority: "Medium",
    scheduledDay: 44,
    phaseNumber: 2,
    goalIndex: 2,
  },
  {
    title: "Request 360-style feedback from 5 people",
    description:
      "Ask 3 questions: what should I keep doing, start doing, stop doing. Not a formal review, just honest signal.",
    category: "relationships",
    estimatedTime: "1h",
    priority: "Medium",
    scheduledDay: 48,
    phaseNumber: 2,
  },
  {
    title: "Identify one process to improve in Phase 3",
    description:
      "Pick something that's been quietly broken. Small enough to fix, big enough to matter.",
    category: "influence",
    estimatedTime: "45m",
    priority: "Medium",
    scheduledDay: 52,
    phaseNumber: 2,
  },
  {
    title: "Run a roadmap-grooming session with your team",
    description:
      "Surface what's on deck, what's at risk, what should be cut. Not a commitment, just shared visibility.",
    category: "influence",
    estimatedTime: "1h",
    priority: "Medium",
    scheduledDay: 56,
    phaseNumber: 2,
  },
  {
    title: "Day 60 check-in with your manager",
    description:
      "Honest pulse: what's going well, what's hard, are we on track for 90-day goals.",
    category: "influence",
    estimatedTime: "45m",
    priority: "High",
    scheduledDay: 60,
    phaseNumber: 2,
    goalIndex: 3,
  },

  // ── Phase 3: Lead ──────────────────────────────────────────────────
  {
    title: "Draft the Phase 3 strategic plan",
    description:
      "Where you want the team to be at day 180 and what it takes to get there. Bring this to your manager first.",
    category: "influence",
    estimatedTime: "2h",
    priority: "High",
    scheduledDay: 62,
    phaseNumber: 3,
    goalIndex: 4,
  },
  {
    title: "Socialise the strategy with key stakeholders",
    description:
      "Pre-wire it. Walk each stakeholder through the draft 1:1 before showing it to the room.",
    category: "influence",
    estimatedTime: "2h",
    priority: "High",
    scheduledDay: 66,
    phaseNumber: 3,
    goalIndex: 4,
  },
  {
    title: "Hold a skip-level 1:1 with your manager's manager",
    description:
      "Ask what they're optimizing for and what they wish they heard more of from your org.",
    category: "relationships",
    estimatedTime: "45m",
    priority: "Medium",
    scheduledDay: 68,
    phaseNumber: 3,
  },
  {
    title: "Run the first session of your new team ritual",
    description:
      "Whatever cadence you're committing to — standup, review, office hours. Make it feel inevitable from day one.",
    category: "influence",
    estimatedTime: "1h",
    priority: "Medium",
    scheduledDay: 72,
    phaseNumber: 3,
  },
  {
    title: "Mentor one person on your team",
    description:
      "Pick someone you've noticed leaning in. A recurring 30-minute slot is enough to start.",
    category: "relationships",
    estimatedTime: "30m",
    priority: "Medium",
    scheduledDay: 76,
    phaseNumber: 3,
  },
  {
    title: "Write a Phase 3 decision memo",
    description:
      "Pick one of the open questions from Phase 1 and commit to an answer. Ship the memo, not the perfection.",
    category: "shipping",
    estimatedTime: "1h",
    priority: "Medium",
    scheduledDay: 80,
    phaseNumber: 3,
    goalIndex: 4,
  },
  {
    title: "Prepare your 90-day review presentation",
    description:
      "3 slides: what I learned, what I shipped, what's next. Practice it out loud before the actual review.",
    category: "influence",
    estimatedTime: "2h",
    priority: "High",
    scheduledDay: 86,
    phaseNumber: 3,
  },
  {
    title: "Deliver your 90-day review",
    description:
      "Run the conversation yourself — lead with the Phase 3 plan, not with a retrospective.",
    category: "influence",
    estimatedTime: "1h",
    priority: "High",
    scheduledDay: 90,
    phaseNumber: 3,
    goalIndex: 4,
  },
];
