import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const savePlan = mutation({
  args: {
    userId: v.id("users"),
    activities: v.array(
      v.object({
        title: v.string(),
        description: v.string(),
        category: v.string(),
        estimatedTime: v.string(),
        priority: v.string(),
        scheduledDay: v.number(),
        phaseNumber: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const existingPlan = await ctx.db
      .query("plans")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    if (existingPlan) throw new Error("Plan already exists");

    const planId = await ctx.db.insert("plans", {
      userId: args.userId,
      status: "active",
      overallCompletion: 0,
    });

    const onboarding = await ctx.db
      .query("onboardingData")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    const startDate = onboarding ? new Date(onboarding.startDate) : new Date();

    const phaseData = [
      { number: 1, name: "Learn", startDay: 1, endDay: 30, milestone: "Understand context and build key relationships", status: "active" },
      { number: 2, name: "Contribute", startDay: 31, endDay: 60, milestone: "Deliver first tangible results", status: "upcoming" },
      { number: 3, name: "Lead", startDay: 61, endDay: 90, milestone: "Own outcomes and influence direction", status: "upcoming" },
    ];

    const phaseIds = {};
    for (const p of phaseData) {
      const id = await ctx.db.insert("phases", { planId, userId: args.userId, ...p });
      phaseIds[p.number] = id;
    }

    const weekThemes = [
      "Orientation & Setup", "Context Building", "Stakeholder Mapping", "Deep Understanding",
      "First Contributions", "Building Momentum", "Process & Systems", "Expanding Impact",
      "Strategic Vision", "Mentoring & Growth", "Roadmap Influence", "Reflection & Next Steps",
    ];

    const weekIds = {};
    for (let w = 1; w <= 12; w++) {
      const phaseNum = w <= 4 ? 1 : w <= 8 ? 2 : 3;
      const id = await ctx.db.insert("weeks", {
        planId,
        phaseId: phaseIds[phaseNum],
        userId: args.userId,
        number: w,
        theme: weekThemes[w - 1],
        reflectionPrompt: `What stood out to you during week ${w}?`,
        reviewQuestions: [
          "What were your biggest accomplishments this week?",
          "What challenges did you face?",
          "What did you learn?",
          "How are your relationships progressing?",
          "Top priority for next week?",
        ],
      });
      weekIds[w] = id;
    }

    for (const activity of args.activities) {
      const weekNum = Math.min(Math.ceil(activity.scheduledDay / 7), 12);
      const actDate = new Date(startDate);
      actDate.setDate(actDate.getDate() + (activity.scheduledDay - 1));

      await ctx.db.insert("activities", {
        planId,
        weekId: weekIds[weekNum],
        userId: args.userId,
        weekNumber: weekNum,
        title: activity.title,
        description: activity.description,
        category: activity.category,
        estimatedTime: activity.estimatedTime,
        priority: activity.priority,
        scheduledDate: actDate.toISOString().split("T")[0],
        scheduledDay: activity.scheduledDay,
        status: "upcoming",
        isCustom: false,
        source: "ai",
      });
    }

    await ctx.db.patch(args.userId, { onboardingComplete: true });

    return planId;
  },
});
