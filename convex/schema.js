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
    billingTier: v.optional(
      v.union(
        v.literal("free"),
        v.literal("pro"),
        v.literal("pro_legacy")
      )
    ),
    stripeCustomerId: v.optional(v.string()),
    trialUsedAt: v.optional(v.number()),
    grandfatheredAt: v.optional(v.number()),
    settings: v.optional(
      v.object({
        timezone: v.optional(v.string()),
        dailyReminderTime: v.optional(v.string()),
        reflectionReminderTime: v.optional(v.string()),
        weekStartDay: v.optional(v.string()),
        emailNotifications: v.optional(v.boolean()),
        pushNotifications: v.optional(v.boolean()),
        dailyDigest: v.optional(v.boolean()),
        stakeholderUpdates: v.optional(v.boolean()),
        milestoneReminders: v.optional(v.boolean()),
        kb: v.optional(
          v.object({
            autoIngestReflections: v.optional(v.boolean()),
            autoIngestInteractions: v.optional(v.boolean()),
            autoIngestActivityNotes: v.optional(v.boolean()),
            enrichmentEnabled: v.optional(v.boolean()),
            enrichmentBudgetUsedToday: v.optional(v.number()),
            enrichmentBudgetResetDate: v.optional(v.string()),
          })
        ),
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
    reportsTo: v.optional(v.string()),
    selectedGoals: v.optional(v.array(v.string())),
    existingContext: v.optional(v.string()),
    challenges: v.optional(v.string()),
    successDefinition: v.optional(v.string()),
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

  kbSources: defineTable({
    userId: v.id("users"),
    provider: v.union(
      v.literal("manual"),
      v.literal("upload"),
      v.literal("reflection_autocapture"),
      v.literal("interaction_autocapture"),
      v.literal("activity_completion_autocapture"),
      v.literal("ai_generated")
    ),
    displayName: v.string(),
    status: v.union(
      v.literal("not_connected"),
      v.literal("connecting"),
      v.literal("connected"),
      v.literal("error"),
      v.literal("disabled")
    ),
    account: v.optional(v.string()),
    lastSyncAt: v.optional(v.number()),
    syncedDocCount: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_provider", ["userId", "provider"]),

  kbDocuments: defineTable({
    userId: v.id("users"),

    title: v.string(),
    content: v.string(),
    contentHash: v.string(),
    legacyKnowledgeEntryId: v.optional(v.id("knowledgeEntries")),

    category: v.union(
      v.literal("company_context"),
      v.literal("team_people"),
      v.literal("product_technology"),
      v.literal("processes_workflows"),
      v.literal("goals_notes"),
      v.literal("industry_market")
    ),
    categoryConfidence: v.optional(v.number()),
    importance: v.optional(v.number()),

    sourceId: v.id("kbSources"),
    sourceType: v.union(
      v.literal("manual"),
      v.literal("upload"),
      v.literal("reflection_autocapture"),
      v.literal("interaction_autocapture"),
      v.literal("activity_completion_autocapture"),
      v.literal("ai_generated")
    ),
    externalId: v.optional(v.string()),
    externalUrl: v.optional(v.string()),
    externalUpdatedAt: v.optional(v.number()),

    storageId: v.optional(v.id("_storage")),
    mimeType: v.optional(v.string()),

    ingestionStatus: v.union(
      v.literal("pending"),
      v.literal("extracting"),
      v.literal("ready"),
      v.literal("failed")
    ),
    embeddingStatus: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("done"),
      v.literal("failed"),
      v.literal("skipped")
    ),
    enrichmentStatus: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("done"),
      v.literal("failed"),
      v.literal("skipped")
    ),
    lastError: v.optional(v.string()),
    lastEmbeddedHash: v.optional(v.string()),

    summary: v.optional(v.string()),
    keyFacts: v.optional(v.array(v.string())),
    entityLinks: v.optional(
      v.array(
        v.object({
          type: v.union(
            v.literal("stakeholder"),
            v.literal("goal"),
            v.literal("activity")
          ),
          id: v.string(),
        })
      )
    ),

    ragEntryId: v.optional(v.string()),

    type: v.union(
      v.literal("ai_enriched"),
      v.literal("ai_generated"),
      v.literal("imported"),
      v.literal("draft")
    ),
    archivedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_category", ["userId", "category"])
    .index("by_user_source", ["userId", "sourceId"])
    .index("by_user_status", ["userId", "ingestionStatus"])
    .index("by_user_legacy", ["userId", "legacyKnowledgeEntryId"])
    .index("by_user_external", ["userId", "sourceType", "externalId"]),

  kbMemories: defineTable({
    userId: v.id("users"),

    text: v.string(),
    type: v.union(
      v.literal("behavioral"),
      v.literal("people"),
      v.literal("technical"),
      v.literal("goal"),
      v.literal("process"),
      v.literal("cultural")
    ),

    confidence: v.number(),
    status: v.union(
      v.literal("candidate"),
      v.literal("active"),
      v.literal("superseded"),
      v.literal("dismissed")
    ),

    entityType: v.optional(
      v.union(
        v.literal("stakeholder"),
        v.literal("goal"),
        v.literal("company"),
        v.literal("team"),
        v.literal("product"),
        v.literal("none")
      )
    ),
    entityId: v.optional(v.string()),

    sourceDocumentIds: v.array(v.id("kbDocuments")),
    sourceChunkRefs: v.optional(
      v.array(
        v.object({
          documentId: v.id("kbDocuments"),
          chunkIndex: v.number(),
          snippet: v.string(),
        })
      )
    ),
    extractedBy: v.union(
      v.literal("claude"),
      v.literal("openai"),
      v.literal("user")
    ),

    supersededBy: v.optional(v.id("kbMemories")),
    supersedes: v.optional(v.array(v.id("kbMemories"))),

    visibleInStream: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_user_entity", ["userId", "entityType", "entityId"])
    .index("by_user_visible", ["userId", "visibleInStream"]),

  kbEnrichmentJobs: defineTable({
    userId: v.id("users"),
    documentId: v.id("kbDocuments"),
    kind: v.union(
      v.literal("embed"),
      v.literal("enrich"),
      v.literal("memory_consolidate"),
      v.literal("extract_text")
    ),
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("done"),
      v.literal("failed")
    ),
    attempts: v.number(),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
    error: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_document", ["documentId"]),

  billingSubscriptions: defineTable({
    userId: v.id("users"),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    priceId: v.string(),
    status: v.union(
      v.literal("trialing"),
      v.literal("active"),
      v.literal("past_due"),
      v.literal("canceled"),
      v.literal("incomplete"),
      v.literal("incomplete_expired"),
      v.literal("unpaid")
    ),
    currentPeriodEnd: v.number(),
    trialEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.boolean(),
    stripeUpdatedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_stripe_customer", ["stripeCustomerId"])
    .index("by_stripe_subscription", ["stripeSubscriptionId"]),

  billingWebhookLog: defineTable({
    eventId: v.string(),
    eventType: v.string(),
    processedAt: v.number(),
    error: v.optional(v.string()),
  }).index("by_event", ["eventId"]),
});
