/**
 * Whisperer context bundle assembly (U4).
 *
 * Pulls task + role + phase + adjacent-week tasks + linked goal +
 * linked stakeholder + recent reflections into a single object the
 * prompt builders + classifiers can consume.
 *
 * Designed to be called from an `internalQuery` so it's transactional
 * with the activity-ownership read that gates the public action. The
 * `ctx` is a Convex query/mutation context.
 *
 * The shape returned is the single source of truth for what the
 * prompt sees — when a field is missing we OMIT rather than substitute
 * (the prompt builder uses absence to skip a section, never to invent
 * placeholder text).
 */

/**
 * Assemble the bundle for one activity.
 *
 * Assumes the caller already verified ownership (`activity.userId ===
 * authUserId`). This function does NOT enforce auth — it's an
 * orchestration helper, not a public surface.
 *
 * @returns null when the activity is missing or onboarding is missing
 *   — the action treats either as `provider_unavailable`.
 */
export async function assembleContextBundle(ctx, { userId, activityId }) {
  const activity = await ctx.db.get(activityId);
  if (!activity) return null;
  if (activity.userId !== userId) return null;

  const onboarding = await ctx.db
    .query("onboardingData")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  if (!onboarding) return null;

  // Phase: derive from the user's current scheduled day or via the
  // activity's week. We have phaseId on weeks indirectly via planId,
  // and the simplest reliable signal here is the activity.weekId →
  // weeks.phaseId → phases row.
  let phaseRow = null;
  let weekRow = null;
  if (activity.weekId) {
    weekRow = await ctx.db.get(activity.weekId);
    if (weekRow && weekRow.phaseId) {
      phaseRow = await ctx.db.get(weekRow.phaseId);
    }
  }

  // Linked stakeholder + goal. Both optional.
  let linkedStakeholder = null;
  if (activity.relatedStakeholderId) {
    const s = await ctx.db.get(activity.relatedStakeholderId);
    if (s && s.userId === userId) {
      linkedStakeholder = {
        id: s._id,
        name: s.name || null,
        role: s.role || null,
        relationshipType: s.relationshipType || null,
        priority: s.priority || null,
        stance: s.stance || null,
        influenceLevel: s.influenceLevel || null,
      };
    }
  }

  let linkedGoal = null;
  if (activity.relatedGoalId) {
    const g = await ctx.db.get(activity.relatedGoalId);
    if (g && g.userId === userId) {
      linkedGoal = {
        id: g._id,
        title: g.title,
        targetPhase: g.targetPhase,
        category: g.category,
        status: g.status,
      };
    }
  }

  // Adjacent-week tasks — same week as this activity, capped at 8. We
  // skip the task itself and stay within the same plan to avoid leaking
  // a (extremely unlikely) cross-plan row.
  let adjacentWeekTasks = [];
  if (activity.weekId) {
    const all = await ctx.db
      .query("activities")
      .withIndex("by_week", (q) => q.eq("weekId", activity.weekId))
      .take(20);
    adjacentWeekTasks = all
      .filter((a) => a._id !== activity._id)
      .slice(0, 8)
      .map((a) => ({
        id: a._id,
        title: a.title,
        status: a.status,
        category: a.category,
      }));
  }

  // Recent reflections — last 3 by date (descending).
  let recentReflections = [];
  const reflectionsPage = await ctx.db
    .query("dailyReflections")
    .withIndex("by_user_date", (q) => q.eq("userId", userId))
    .order("desc")
    .take(3);
  recentReflections = reflectionsPage.map((r) => ({
    id: r._id,
    date: r.date,
    text: composeReflectionText(r),
  }));

  return {
    task: {
      id: activity._id,
      title: activity.title,
      description: activity.description,
      category: activity.category,
      priority: activity.priority,
      estimatedTime: activity.estimatedTime,
      weekNumber: activity.weekNumber,
      status: activity.status,
    },
    user: {
      userId,
      roleTitle: onboarding.roleTitle || null,
      function_: onboarding.function_ || null,
      companyName: onboarding.companyName || null,
      starsSituation: onboarding.starsSituation || null,
      experienceYears: onboarding.experienceYears,
      phaseNumber: phaseRow ? phaseRow.number : null,
      phaseName: phaseRow ? phaseRow.name : null,
      weekNumber: weekRow ? weekRow.number : null,
      weekTheme: weekRow ? weekRow.theme : null,
    },
    linkedStakeholder,
    linkedGoal,
    adjacentWeekTasks,
    recentReflections,
  };
}

function composeReflectionText(r) {
  // Pull the most signal-bearing fields into one short string the
  // prompt can quote. Order matters — strongest signal first.
  const parts = [];
  if (r.reflectionResponse && r.reflectionResponse.trim()) {
    parts.push(r.reflectionResponse.trim());
  }
  if (r.topAccomplishment && r.topAccomplishment.trim()) {
    parts.push(`Win: ${r.topAccomplishment.trim()}`);
  }
  if (r.blockers && r.blockers.trim()) {
    parts.push(`Blocker: ${r.blockers.trim()}`);
  }
  if (r.tomorrowFocus && r.tomorrowFocus.trim()) {
    parts.push(`Tomorrow: ${r.tomorrowFocus.trim()}`);
  }
  return parts.join(" — ");
}
