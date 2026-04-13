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

async function _seedPlanData(ctx, userId) {
  const startDate = PILOT_PLAN_START_DATE;

  const onboardingRow = await ctx.db
    .query("onboardingData")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  if (!onboardingRow) {
    await ctx.db.insert("onboardingData", {
      userId,
      roleTitle: "Senior UX Researcher",
      startDate,
      experienceYears: 8,
      isFirstRoleAtLevel: false,
      roleType: "Individual Contributor",
      function_: "Research / UX",
      teamSize: 12,
      isNewTeam: true,
      scope: "Leading search experience research for enterprise product",
      companyName: "Algolia",
      companySize: "500-1000",
      companyStage: "Growth",
      workModel: "Hybrid",
      industry: "Technology / SaaS",
      starsSituation: "Turnaround",
    });
  } else {
    await ctx.db.patch(onboardingRow._id, { startDate });
  }

  const planId = await ctx.db.insert("plans", {
    userId,
    status: "active",
    overallCompletion: 0,
  });

  const phaseData = [
    { number: 1, name: "Learn", startDay: 1, endDay: 30, milestone: "Complete stakeholder mapping and understand product landscape", status: "active" },
    { number: 2, name: "Contribute", startDay: 31, endDay: 60, milestone: "Deliver first research insights and establish credibility", status: "upcoming" },
    { number: 3, name: "Lead", startDay: 61, endDay: 90, milestone: "Own research roadmap and influence product strategy", status: "upcoming" },
  ];

  const phaseIds = [];
  for (const p of phaseData) {
    const id = await ctx.db.insert("phases", { planId, userId, ...p });
    phaseIds.push(id);
  }

  const weekThemes = [
    { number: 1, phase: 0, theme: "Orientation & Setup", prompt: "What surprised you most about your first week?" },
    { number: 2, phase: 0, theme: "Context & Architecture", prompt: "What patterns are you noticing in how the team works?" },
    { number: 3, phase: 0, theme: "Stakeholder Deep Dives", prompt: "Which relationships feel most important to develop?" },
    { number: 4, phase: 0, theme: "User & Market Understanding", prompt: "What do users struggle with that the team doesn't see?" },
    { number: 5, phase: 1, theme: "Quick Wins & First Contributions", prompt: "Where can you add the most value right now?" },
    { number: 6, phase: 1, theme: "Research Framework", prompt: "What research methods are best suited for this team?" },
    { number: 7, phase: 1, theme: "Process Improvements", prompt: "What processes could be made more efficient?" },
    { number: 8, phase: 1, theme: "Broadening Impact", prompt: "How can your work influence decisions beyond your team?" },
    { number: 9, phase: 2, theme: "Strategic Initiatives", prompt: "What's your vision for research at this company?" },
    { number: 10, phase: 2, theme: "Mentoring & Growth", prompt: "How can you help others grow their research skills?" },
    { number: 11, phase: 2, theme: "Roadmap Influence", prompt: "What should the product roadmap prioritize based on your research?" },
    { number: 12, phase: 2, theme: "Reflection & Next Quarter", prompt: "What would you do differently if you started again?" },
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

  const activities = [
    { week: 0, day: 1, title: "Complete HR onboarding and system setup", desc: "Finish all administrative setup: badge, laptop, Slack, email, tool access.", cat: "learning", time: "4h", priority: "High" },
    { week: 0, day: 1, title: "Meet your direct manager", desc: "30-min intro with your manager. Align on first-week expectations and communication preferences.", cat: "relationships", time: "30m", priority: "High" },
    { week: 0, day: 2, title: "Review product documentation", desc: "Read through product docs, PRDs, and recent research reports to understand the current state.", cat: "learning", time: "3h", priority: "High" },
    { week: 0, day: 2, title: "Set up research tools", desc: "Get access to user research tools (UserTesting, Maze, analytics dashboards).", cat: "learning", time: "1h", priority: "Medium" },
    { week: 0, day: 3, title: "Attend team standup", desc: "Join the daily standup to observe team dynamics and current priorities.", cat: "learning", time: "15m", priority: "Medium" },
    { week: 0, day: 3, title: "1:1 with product lead", desc: "Meet with the product lead to understand product vision and research needs.", cat: "relationships", time: "45m", priority: "High" },
    { week: 0, day: 4, title: "Shadow a user research session", desc: "Observe an existing research session or watch recent recordings.", cat: "learning", time: "2h", priority: "Medium" },
    { week: 0, day: 4, title: "Draft stakeholder map", desc: "Create initial stakeholder map identifying key people and their influence/interest.", cat: "shipping", time: "1h", priority: "High" },
    { week: 0, day: 5, title: "Write first-week reflection", desc: "Document key observations, questions, and initial hypotheses from week 1.", cat: "learning", time: "30m", priority: "Medium" },
    { week: 0, day: 5, title: "Plan week 2 priorities", desc: "Set specific goals for next week based on what you've learned.", cat: "shipping", time: "30m", priority: "Medium" },
    { week: 1, day: 8, title: "Deep dive into search architecture", desc: "Meet with engineering to understand search infrastructure, relevance models, and data flow.", cat: "learning", time: "2h", priority: "High" },
    { week: 1, day: 8, title: "Review analytics dashboards", desc: "Study key metrics: search usage, click-through rates, query patterns, and conversion.", cat: "learning", time: "1.5h", priority: "High" },
    { week: 1, day: 9, title: "Meet design team lead", desc: "Understand design process, how research currently feeds into design decisions.", cat: "relationships", time: "45m", priority: "High" },
    { week: 1, day: 9, title: "Audit existing research repository", desc: "Review past research studies, findings, and how they were actioned.", cat: "learning", time: "2h", priority: "Medium" },
    { week: 1, day: 10, title: "Attend product planning session", desc: "Observe how product decisions are made and where research could add value.", cat: "learning", time: "1h", priority: "Medium" },
    { week: 1, day: 11, title: "1:1 with customer success lead", desc: "Learn about common customer pain points and feature requests from CS perspective.", cat: "relationships", time: "45m", priority: "Medium" },
    { week: 1, day: 12, title: "Map current user journey", desc: "Document the end-to-end search experience from user perspective.", cat: "shipping", time: "3h", priority: "High" },
    { week: 2, day: 15, title: "1:1 with VP of Product", desc: "Understand strategic priorities and how research should align with product roadmap.", cat: "relationships", time: "45m", priority: "High" },
    { week: 2, day: 15, title: "Lunch with engineering team", desc: "Build informal relationships with engineers you'll collaborate with.", cat: "relationships", time: "1h", priority: "Medium" },
    { week: 2, day: 16, title: "Meet sales team lead", desc: "Understand how customers describe their needs during sales conversations.", cat: "relationships", time: "45m", priority: "Medium" },
    { week: 2, day: 17, title: "Draft research roadmap v1", desc: "Based on stakeholder input, draft initial research priorities for next 60 days.", cat: "shipping", time: "3h", priority: "High" },
    { week: 2, day: 18, title: "Present learnings to team", desc: "Share a brief summary of your first 2.5 weeks of observations with the team.", cat: "influence", time: "1h", priority: "High" },
    { week: 2, day: 19, title: "Identify quick-win research opportunity", desc: "Find a small research question that can be answered quickly with high impact.", cat: "shipping", time: "1h", priority: "High" },
    { week: 3, day: 22, title: "Competitive analysis", desc: "Analyze 3-5 competitors' search experiences and document differentiators.", cat: "learning", time: "4h", priority: "Medium" },
    { week: 3, day: 23, title: "Conduct first user interview", desc: "Run your first user interview focused on search pain points.", cat: "shipping", time: "2h", priority: "High" },
    { week: 3, day: 24, title: "Analyze support tickets", desc: "Review recent support tickets related to search to identify patterns.", cat: "learning", time: "2h", priority: "Medium" },
    { week: 3, day: 25, title: "Synthesize Phase 1 findings", desc: "Create a summary document of all learnings from the first 30 days.", cat: "shipping", time: "3h", priority: "High" },
    { week: 3, day: 26, title: "Phase 1 review with manager", desc: "Present your 30-day findings and get alignment on Phase 2 priorities.", cat: "relationships", time: "1h", priority: "High" },
    { week: 4, day: 29, title: "Launch quick-win research study", desc: "Execute the small research study identified in week 3.", cat: "shipping", time: "4h", priority: "High" },
    { week: 4, day: 30, title: "Share quick-win findings", desc: "Present research findings to stakeholders with actionable recommendations.", cat: "influence", time: "1h", priority: "High" },
    { week: 4, day: 31, title: "Establish research ops rhythm", desc: "Set up regular cadence for research activities: participant recruitment, synthesis sessions.", cat: "shipping", time: "2h", priority: "Medium" },
    { week: 4, day: 32, title: "Create research templates", desc: "Build reusable templates for interview guides, synthesis docs, and reports.", cat: "shipping", time: "3h", priority: "Medium" },
    { week: 4, day: 33, title: "Coffee chat with cross-team PM", desc: "Build relationship with a PM from another team to expand influence.", cat: "relationships", time: "30m", priority: "Low" },
    { week: 5, day: 36, title: "Design usability study", desc: "Plan and design a usability study for a key search feature.", cat: "shipping", time: "4h", priority: "High" },
    { week: 5, day: 37, title: "Recruit research participants", desc: "Identify and schedule participants for upcoming studies.", cat: "shipping", time: "2h", priority: "High" },
    { week: 5, day: 38, title: "Run first usability sessions", desc: "Conduct 3-5 usability sessions and capture findings.", cat: "shipping", time: "5h", priority: "High" },
    { week: 5, day: 39, title: "Synthesize usability findings", desc: "Analyze recordings and notes, create a findings report.", cat: "shipping", time: "3h", priority: "High" },
    { week: 5, day: 40, title: "Present to design team", desc: "Share usability findings and recommendations with the design team.", cat: "influence", time: "1h", priority: "High" },
    { week: 6, day: 43, title: "Propose research-into-design process", desc: "Draft a process for how research findings flow into design decisions.", cat: "influence", time: "2h", priority: "High" },
    { week: 6, day: 44, title: "Set up research repository", desc: "Create a centralized place for research findings accessible to all teams.", cat: "shipping", time: "3h", priority: "Medium" },
    { week: 6, day: 45, title: "Mid-quarter check-in with manager", desc: "Review progress against goals and adjust priorities.", cat: "relationships", time: "1h", priority: "High" },
    { week: 6, day: 46, title: "Train team on research methods", desc: "Run a short workshop on basic research methods for PMs and designers.", cat: "influence", time: "2h", priority: "Medium" },
    { week: 7, day: 50, title: "Cross-team research presentation", desc: "Present key findings to a broader audience beyond your immediate team.", cat: "influence", time: "1.5h", priority: "High" },
    { week: 7, day: 51, title: "Identify strategic research initiative", desc: "Scope a larger research project that addresses a strategic product question.", cat: "shipping", time: "3h", priority: "High" },
    { week: 7, day: 52, title: "1:1 with engineering lead", desc: "Discuss how research can better inform technical decisions.", cat: "relationships", time: "45m", priority: "Medium" },
    { week: 7, day: 53, title: "Phase 2 review with manager", desc: "Present 60-day accomplishments and align on Phase 3 strategy.", cat: "relationships", time: "1h", priority: "High" },
    { week: 8, day: 57, title: "Launch strategic research project", desc: "Kick off the larger research initiative identified in week 8.", cat: "shipping", time: "5h", priority: "High" },
    { week: 8, day: 58, title: "Build research advisory group", desc: "Form a small group of stakeholders who review and prioritize research.", cat: "influence", time: "1h", priority: "Medium" },
    { week: 8, day: 59, title: "Write research insights newsletter", desc: "Start a regular digest of research insights for the broader org.", cat: "influence", time: "1h", priority: "Medium" },
    { week: 9, day: 64, title: "Mentor a junior team member", desc: "Set up regular mentoring sessions with a junior researcher or designer.", cat: "relationships", time: "1h", priority: "Medium" },
    { week: 9, day: 65, title: "Document research playbook", desc: "Write up the research processes you've established as a team playbook.", cat: "shipping", time: "4h", priority: "Medium" },
    { week: 9, day: 66, title: "Stakeholder feedback round", desc: "Gather feedback from key stakeholders on research impact so far.", cat: "relationships", time: "2h", priority: "High" },
    { week: 10, day: 71, title: "Present research-informed roadmap input", desc: "Share research-backed recommendations for the next quarter's product roadmap.", cat: "influence", time: "2h", priority: "High" },
    { week: 10, day: 72, title: "Finalize strategic research findings", desc: "Complete the strategic research project and prepare final report.", cat: "shipping", time: "5h", priority: "High" },
    { week: 10, day: 73, title: "Share strategic findings company-wide", desc: "Present strategic research findings to leadership.", cat: "influence", time: "1h", priority: "High" },
    { week: 11, day: 78, title: "Write 90-day self-assessment", desc: "Document accomplishments, impact, relationships built, and areas for growth.", cat: "learning", time: "2h", priority: "High" },
    { week: 11, day: 79, title: "90-day review with manager", desc: "Formal review of your first 90 days, goals met, and next-quarter plan.", cat: "relationships", time: "1h", priority: "High" },
    { week: 11, day: 80, title: "Plan next quarter goals", desc: "Set goals for the next quarter based on 90-day learnings.", cat: "shipping", time: "2h", priority: "High" },
    { week: 11, day: 80, title: "Thank key stakeholders", desc: "Send personalized thank-you notes to people who helped during onboarding.", cat: "relationships", time: "30m", priority: "Medium" },
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
      priority: a.priority,
      scheduledDate: scheduleYmd(startDate, a.day),
      scheduledDay: a.day,
      status: "upcoming",
      isCustom: false,
      source: "seed",
    });
  }

  const stakeholderData = [
    { name: "Imogen Chen", role: "VP of Product", type: "Champion", priority: "Must", stance: "Supportive", influence: "High", interest: "High", bg: "10+ years in search. Advocates for user-centric approach. Previous experience at Google." },
    { name: "Marcus Rodriguez", role: "Engineering Lead", type: "Decider", priority: "Must", stance: "Neutral", influence: "High", interest: "Medium", bg: "Technical leader for the search team. Values data-driven decisions." },
    { name: "Sarah Jenkins", role: "Design Team Lead", type: "Champion", priority: "Must", stance: "Supportive", influence: "Medium", interest: "High", bg: "Leading the design team. Strong believer in research-driven design." },
    { name: "David Park", role: "CEO", type: "Inform", priority: "Should", stance: "Supportive", influence: "High", interest: "Low", bg: "Founder. Deeply technical. Interested in how research shapes product direction." },
    { name: "Elena Vasquez", role: "Customer Success Lead", type: "Inform", priority: "Should", stance: "Supportive", influence: "Medium", interest: "Medium", bg: "Connects research to customer outcomes. Valuable source of user feedback." },
    { name: "James Okafor", role: "Senior PM", type: "Decider", priority: "Must", stance: "Neutral", influence: "High", interest: "High", bg: "Owns the search product roadmap. Key partner for research prioritization." },
    { name: "Priya Sharma", role: "Data Scientist", type: "Inform", priority: "Could", stance: "Supportive", influence: "Medium", interest: "Medium", bg: "Analytics expert. Can help quantify research impact." },
  ];

  for (const s of stakeholderData) {
    await ctx.db.insert("stakeholders", {
      userId,
      name: s.name,
      role: s.role,
      relationshipType: s.type,
      priority: s.priority,
      stance: s.stance,
      influenceLevel: s.influence,
      interestLevel: s.interest,
      backgroundContext: s.bg,
      firstMeetingScheduled: false,
      workingPreferences: [],
    });
  }

  const goalData = [
    { title: "Complete stakeholder mapping and build relationships with 5+ key people", phase: 1, cat: "relationships" },
    { title: "Deliver first actionable research insight that influences a product decision", phase: 2, cat: "shipping" },
    { title: "Establish a repeatable research process used by the team", phase: 2, cat: "shipping" },
    { title: "Present research-backed roadmap recommendations to leadership", phase: 3, cat: "influence" },
    { title: "Build a research repository accessible to all teams", phase: 3, cat: "shipping" },
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
        companyName: "Algolia",
        roleTitle: "Senior UX Researcher",
        industry: "Technology / SaaS",
        companySize: "500-1000",
        companyStage: "Growth",
        starsSituation: "Turnaround",
        scope: "Leading search experience research for enterprise product",
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
