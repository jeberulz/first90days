import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.float64()),
    image: v.optional(v.string()),
    isAnonymous: v.optional(v.boolean()),
    onboardingComplete: v.optional(v.boolean()),
    settings: v.optional(
      v.object({
        timezone: v.optional(v.string()),
        dailyReminderTime: v.optional(v.string()),
        reflectionReminderTime: v.optional(v.string()),
        weekStartDay: v.optional(v.string()),
        emailNotifications: v.optional(v.boolean()),
        pushNotifications: v.optional(v.boolean()),
      })
    ),
  }).index("by_email", ["email"]),

  onboardingData: defineTable({
    userId: v.id("users"),
    roleTitle: v.string(),
    startDate: v.string(),
    experienceYears: v.number(),
    isFirstRoleAtLevel: v.boolean(),
    roleType: v.string(),
    function_: v.string(),
    teamSize: v.optional(v.number()),
    isNewTeam: v.boolean(),
    scope: v.optional(v.string()),
    companyName: v.string(),
    companySize: v.string(),
    companyStage: v.string(),
    workModel: v.string(),
    industry: v.optional(v.string()),
    starsSituation: v.string(),
  }).index("by_user", ["userId"]),

  plans: defineTable({
    userId: v.id("users"),
    status: v.string(),
    overallCompletion: v.number(),
  }).index("by_user", ["userId"]),

  phases: defineTable({
    planId: v.id("plans"),
    userId: v.id("users"),
    number: v.number(),
    name: v.string(),
    startDay: v.number(),
    endDay: v.number(),
    milestone: v.string(),
    status: v.string(),
  })
    .index("by_plan", ["planId"])
    .index("by_user", ["userId"]),

  weeks: defineTable({
    planId: v.id("plans"),
    phaseId: v.id("phases"),
    userId: v.id("users"),
    number: v.number(),
    theme: v.string(),
    reflectionPrompt: v.string(),
    reviewQuestions: v.array(v.string()),
  })
    .index("by_plan", ["planId"])
    .index("by_phase", ["phaseId"])
    .index("by_user_number", ["userId", "number"]),

  activities: defineTable({
    planId: v.id("plans"),
    weekId: v.id("weeks"),
    userId: v.id("users"),
    weekNumber: v.number(),
    title: v.string(),
    description: v.string(),
    category: v.string(),
    subcategory: v.optional(v.string()),
    estimatedTime: v.string(),
    priority: v.string(),
    relatedStakeholderId: v.optional(v.id("stakeholders")),
    relatedGoalId: v.optional(v.id("goals")),
    scheduledDate: v.optional(v.string()),
    scheduledDay: v.optional(v.number()),
    status: v.string(),
    completedAt: v.optional(v.string()),
    completionNotes: v.optional(v.string()),
    skipReason: v.optional(v.string()),
    isCustom: v.boolean(),
    source: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_user_date", ["userId", "scheduledDate"])
    .index("by_week", ["weekId"])
    .index("by_plan", ["planId"]),

  goals: defineTable({
    userId: v.id("users"),
    title: v.string(),
    targetPhase: v.number(),
    category: v.string(),
    status: v.string(),
    completedAt: v.optional(v.string()),
    notes: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  stakeholders: defineTable({
    userId: v.id("users"),
    name: v.string(),
    role: v.string(),
    relationshipType: v.string(),
    priority: v.string(),
    stance: v.optional(v.string()),
    influenceLevel: v.optional(v.string()),
    interestLevel: v.optional(v.string()),
    firstMeetingScheduled: v.boolean(),
    firstMeetingDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    workingPreferences: v.optional(v.array(v.string())),
    backgroundContext: v.optional(v.string()),
    email: v.optional(v.string()),
    location: v.optional(v.string()),
    lastInteractionDate: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_priority", ["userId", "priority"]),

  interactions: defineTable({
    stakeholderId: v.id("stakeholders"),
    userId: v.id("users"),
    date: v.string(),
    type: v.string(),
    title: v.optional(v.string()),
    notes: v.string(),
    actionItems: v.optional(
      v.array(
        v.object({
          text: v.string(),
          completed: v.boolean(),
          dueDate: v.optional(v.string()),
        })
      )
    ),
  })
    .index("by_stakeholder", ["stakeholderId"])
    .index("by_user", ["userId"]),

  dailyReflections: defineTable({
    userId: v.id("users"),
    date: v.string(),
    energyLevel: v.number(),
    topAccomplishment: v.optional(v.string()),
    reflectionPrompt: v.string(),
    reflectionResponse: v.string(),
    blockers: v.optional(v.string()),
    tomorrowFocus: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"]),

  weeklyReviews: defineTable({
    userId: v.id("users"),
    weekNumber: v.number(),
    date: v.string(),
    rating: v.number(),
    questionResponses: v.array(
      v.object({
        question: v.string(),
        response: v.string(),
      })
    ),
    activitiesCompleted: v.number(),
    activitiesPlanned: v.number(),
    notes: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_week", ["userId", "weekNumber"]),

  logEntries: defineTable({
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    date: v.string(),
    category: v.string(),
    relatedGoalId: v.optional(v.id("goals")),
    impact: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_type", ["userId", "type"]),

  knowledgeEntries: defineTable({
    userId: v.id("users"),
    title: v.string(),
    content: v.string(),
    category: v.string(),
    tags: v.optional(v.array(v.string())),
    source: v.optional(v.string()),
    relatedStakeholderId: v.optional(v.id("stakeholders")),
  })
    .index("by_user", ["userId"])
    .index("by_user_category", ["userId", "category"]),
});
