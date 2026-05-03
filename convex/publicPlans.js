import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

// Functions powering the public-share feature (opt-in `/p/{slug}` URLs).
// Kept separate from convex/plans.js so the auth boundary is obvious:
//   - getByPublicSlug is the ONLY auth-free query in this codebase that
//     reads plan content, and it returns a tightly sanitized shape.
//   - All other functions here mutate the user's own plan only.
//
// The privacy contract:
//   - Names of stakeholders are NEVER returned, only counts (and roles
//     when the user explicitly opted in).
//   - Journal entries / log entries / KB content are never read here.
//   - Goal titles ARE included (that's the point of sharing).
//   - Real success-definition text IS included (user-supplied, user-shared).

const SLUG_ALPHABET = "23456789abcdefghijkmnpqrstuvwxyz"; // omit ambiguous 0/O/1/l

function randomSlug(length = 8) {
  let out = "";
  // Convex env: rely on Web Crypto via globalThis.crypto.
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < length; i++) {
    out += SLUG_ALPHABET[bytes[i] % SLUG_ALPHABET.length];
  }
  return out;
}

async function generateUniqueSlug(ctx, attempts = 8) {
  for (let i = 0; i < attempts; i++) {
    const candidate = randomSlug(8);
    const existing = await ctx.db
      .query("plans")
      .withIndex("by_public_slug", (q) => q.eq("publicSlug", candidate))
      .first();
    if (!existing) return candidate;
  }
  // Astronomically unlikely with 8 chars from a 32-char alphabet
  // (~10^12 combos), but if it happens we let it bubble.
  throw new Error("Could not allocate a unique public slug, please retry.");
}

// ── Read: settings panel for the owner ─────────────────────────────────────

export const getMyPublicSettings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;
    const plan = await ctx.db
      .query("plans")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!plan) return null;

    const enabled = plan.publicVisibility?.enabled === true;
    return {
      enabled,
      // Only return the slug when the toggle is on so a UI accidentally
      // showing a copy-link button while toggled off can't leak it.
      publicSlug: enabled ? plan.publicSlug ?? null : null,
      displayName: plan.publicVisibility?.displayName ?? "",
      showCompany: plan.publicVisibility?.showCompany === true,
      showStakeholderRoles:
        plan.publicVisibility?.showStakeholderRoles === true,
    };
  },
});

// ── Write: toggle on / off + update settings ───────────────────────────────

export const enablePublicSharing = mutation({
  args: {
    displayName: v.optional(v.string()),
    showCompany: v.optional(v.boolean()),
    showStakeholderRoles: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const plan = await ctx.db
      .query("plans")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!plan) throw new Error("No plan to share. Generate a plan first.");

    // Always rotate the slug when transitioning from off → on so any stale
    // link previously copied by the user is invalidated.
    const slug = await generateUniqueSlug(ctx);
    const now = Date.now();
    const cleanedName = args.displayName?.trim()?.slice(0, 80) || undefined;

    await ctx.db.patch(plan._id, {
      publicSlug: slug,
      publicSlugCreatedAt: now,
      publicVisibility: {
        enabled: true,
        displayName: cleanedName,
        showCompany: args.showCompany === true,
        showStakeholderRoles: args.showStakeholderRoles === true,
      },
    });

    return { publicSlug: slug };
  },
});

export const disablePublicSharing = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const plan = await ctx.db
      .query("plans")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!plan) return null;

    await ctx.db.patch(plan._id, {
      publicSlug: undefined,
      publicSlugCreatedAt: undefined,
      publicVisibility: {
        enabled: false,
        displayName: plan.publicVisibility?.displayName,
        showCompany: plan.publicVisibility?.showCompany === true,
        showStakeholderRoles:
          plan.publicVisibility?.showStakeholderRoles === true,
      },
    });
    return null;
  },
});

export const updatePublicVisibility = mutation({
  args: {
    displayName: v.optional(v.string()),
    showCompany: v.optional(v.boolean()),
    showStakeholderRoles: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const plan = await ctx.db
      .query("plans")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!plan) throw new Error("No plan to share. Generate a plan first.");
    if (!plan.publicVisibility?.enabled) {
      throw new Error("Enable public sharing first.");
    }

    const cleanedName = args.displayName?.trim()?.slice(0, 80) || undefined;

    await ctx.db.patch(plan._id, {
      publicVisibility: {
        enabled: true,
        displayName: cleanedName,
        showCompany:
          args.showCompany === undefined
            ? plan.publicVisibility?.showCompany === true
            : args.showCompany === true,
        showStakeholderRoles:
          args.showStakeholderRoles === undefined
            ? plan.publicVisibility?.showStakeholderRoles === true
            : args.showStakeholderRoles === true,
      },
    });
    return null;
  },
});

// ── Read: the public viewer query (NO auth) ────────────────────────────────

export const getByPublicSlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    if (!slug || typeof slug !== "string") return null;
    const cleaned = slug.trim().toLowerCase();
    if (cleaned.length < 6 || cleaned.length > 16) return null;

    const plan = await ctx.db
      .query("plans")
      .withIndex("by_public_slug", (q) => q.eq("publicSlug", cleaned))
      .first();
    if (!plan) return null;
    if (!plan.publicVisibility?.enabled) return null;

    const [phases, weeks, activities, goals, stakeholders, onboarding] =
      await Promise.all([
        ctx.db
          .query("phases")
          .withIndex("by_plan", (q) => q.eq("planId", plan._id))
          .collect(),
        ctx.db
          .query("weeks")
          .withIndex("by_plan", (q) => q.eq("planId", plan._id))
          .collect(),
        ctx.db
          .query("activities")
          .withIndex("by_plan", (q) => q.eq("planId", plan._id))
          .collect(),
        ctx.db
          .query("goals")
          .withIndex("by_user", (q) => q.eq("userId", plan.userId))
          .collect(),
        ctx.db
          .query("stakeholders")
          .withIndex("by_user", (q) => q.eq("userId", plan.userId))
          .collect(),
        ctx.db
          .query("onboardingData")
          .withIndex("by_user", (q) => q.eq("userId", plan.userId))
          .first(),
      ]);

    const showCompany = plan.publicVisibility?.showCompany === true;
    const showStakeholderRoles =
      plan.publicVisibility?.showStakeholderRoles === true;

    // Derived stakeholder roles (never names). Keep only the relationship
    // label, plus the stakeholder's title where present, so the public
    // viewer can see the *shape* of the support network without exposing
    // any individual.
    const stakeholderRoles = showStakeholderRoles
      ? stakeholders.map((s) => {
          const rel = (s.relationship || "").trim();
          const title = (s.title || "").trim();
          if (rel && title) return `${title} (${prettyRelationship(rel)})`;
          if (title) return title;
          if (rel) return prettyRelationship(rel);
          return "Stakeholder";
        })
      : [];

    // Map week-1 activities to a small preview, no body text.
    const week1 = weeks.find((w) => w.number === 1);
    const firstWeekActivities = week1
      ? activities
          .filter((a) => a.weekId === week1._id || a.weekNumber === 1)
          .slice(0, 5)
          .map((a) => ({
            title: a.title,
            category: a.category,
            durationMin: a.durationMin,
          }))
      : [];

    return {
      // Identity (sanitized)
      displayName:
        plan.publicVisibility?.displayName?.trim() ||
        "Anonymous Arcora user",
      roleTitle: onboarding?.roleTitle ?? null,
      companyLabel: showCompany
        ? onboarding?.companyName ?? null
        : "[Confidential]",
      // Plan structure
      phases: phases
        .sort((a, b) => a.number - b.number)
        .map((p) => ({
          number: p.number,
          name: p.name,
          milestone: p.milestone,
        })),
      goals: goals
        .map((g) => ({
          title: g.title,
          // Schema field is `targetPhase` (1–3). Earlier fallbacks for
          // `phaseNumber` / `phase` covered older data shapes; keep them
          // for safety but the real field is `targetPhase`.
          phaseNumber:
            g.targetPhase ?? g.phaseNumber ?? g.phase ?? null,
          category: g.category ?? null,
        }))
        .filter((g) => g.phaseNumber !== null),
      successDefinition: onboarding?.successDefinition ?? null,
      stakeholderCount: stakeholders.length,
      stakeholderRolesShown: showStakeholderRoles,
      stakeholderRoles,
      firstWeekActivities,
      generatedDate: plan._creationTime
        ? new Date(plan._creationTime).toISOString()
        : null,
    };
  },
});

function prettyRelationship(slug) {
  const map = {
    manager: "manager",
    skip: "skip-level",
    peer: "peer",
    report: "direct report",
    cross: "cross-functional",
    stakeholder: "key stakeholder",
  };
  return map[slug] ?? slug;
}
