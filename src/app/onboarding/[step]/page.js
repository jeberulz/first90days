"use client";

import { use, useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Icon } from "@iconify/react";
import StepProgress from "@/components/onboarding/StepProgress";
import RoleCard from "@/components/onboarding/RoleCard";
import GoalCard from "@/components/onboarding/GoalCard";
import StakeholderRow from "@/components/onboarding/StakeholderRow";
import CompletionOverlay from "@/components/onboarding/CompletionOverlay";
import StepTransition from "@/components/onboarding/StepTransition";
import { splitFullNameDisplay } from "@/lib/userDisplay";

const TOTAL_STEPS = 6;

const ROLE_OPTIONS = [
  { value: "Product", icon: "solar:compass-linear", label: "Product", desc: "PM, Product Lead, Head of Product" },
  { value: "Engineering", icon: "solar:code-linear", label: "Engineering", desc: "Eng Manager, Tech Lead, VP Eng" },
  { value: "Design", icon: "solar:pallete-2-linear", label: "Design", desc: "Design Lead, Head of UX, Creative Dir" },
  { value: "Marketing / Growth", icon: "solar:graph-up-linear", label: "Marketing / Growth", desc: "CMO, Growth Lead, Marketing Mgr" },
  { value: "Operations", icon: "solar:settings-linear", label: "Operations", desc: "COO, Ops Manager, Chief of Staff" },
  { value: "Other", icon: "solar:widget-linear", label: "Other", desc: "Sales, HR, Finance, or another function" },
];

const GOAL_OPTIONS = [
  { id: "relationships", icon: "solar:users-group-rounded-linear", label: "Build key relationships", desc: "Get to know stakeholders, teammates, and cross-functional partners" },
  { id: "product_landscape", icon: "solar:map-linear", label: "Understand the product & tech landscape", desc: "Deep dive into architecture, roadmap, and existing decisions" },
  { id: "quick_win", icon: "solar:rocket-2-linear", label: "Deliver a quick win", desc: "Ship something visible to build credibility early" },
  { id: "processes", icon: "solar:tuning-linear", label: "Define or refine team processes", desc: "Improve workflows, meetings, or rituals" },
  { id: "roadmap", icon: "solar:compass-linear", label: "Build a strategic roadmap", desc: "Create or contribute to long-term vision and planning" },
  { id: "culture", icon: "solar:heart-linear", label: "Learn the company culture", desc: "Understand values, norms, and unwritten rules" },
];

const starsOptions = [
  { value: "Startup", label: "Startup", desc: "Building something new from scratch" },
  { value: "Turnaround", label: "Turnaround", desc: "Rescuing a project or team in trouble" },
  { value: "Accelerated Growth", label: "Accelerated Growth", desc: "Scaling a successful initiative rapidly" },
  { value: "Realignment", label: "Realignment", desc: "Redirecting an organization that's drifted" },
  { value: "Sustaining Success", label: "Sustaining Success", desc: "Maintaining and building on existing success" },
];

const companySizes = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5000+"];
const companyStages = ["Pre-seed/Seed", "Early Stage", "Growth", "Scale-up", "Enterprise", "Public"];
const workModels = ["Remote", "Hybrid", "On-site"];

const EMPTY_STAKEHOLDER = { name: "", title: "", relationship: "" };

function initialData() {
  if (typeof window !== "undefined") {
    const saved = sessionStorage.getItem("onboarding_data");
    if (saved) return JSON.parse(saved);
  }
  return {
    firstName: "",
    lastName: "",
    roleTitle: "",
    startDate: new Date().toISOString().split("T")[0],
    experienceYears: 5,
    isFirstRoleAtLevel: false,
    companyName: "",
    roleType: "",
    function_: "",
    teamSize: undefined,
    isNewTeam: false,
    reportsTo: "",
    companySize: "",
    companyStage: "",
    workModel: "",
    industry: "",
    starsSituation: "",
    selectedGoals: [],
    stakeholders: [{ ...EMPTY_STAKEHOLDER }],
    existingContext: "",
    challenges: "",
    successDefinition: "",
    scope: "",
    jobDescription: "",
  };
}

export default function OnboardingStepPage({ params }) {
  const { step } = use(params);
  const currentStep = parseInt(step, 10) - 1;
  const router = useRouter();
  const saveOnboarding = useMutation(api.onboarding.save);
  const updateProfile = useMutation(api.users.updateProfile);
  const viewer = useQuery(api.users.viewer);
  const existingStakeholders = useQuery(api.stakeholders.list);
  const seedPlan = useMutation(api.seed.seedJohnsPlan);
  const generatePlan = useAction(api.ai.generatePlan);
  const createStakeholdersBatch = useMutation(api.stakeholders.createBatch);
  const saveOnboardingProgress = useMutation(api.users.saveOnboardingProgress);
  const clearOnboardingProgress = useMutation(api.users.clearOnboardingProgress);
  const markGenerating = useMutation(api.planMutations.markGenerating);
  const markFailed = useMutation(api.planMutations.markFailed);
  const requestCompanyResearch = useMutation(
    api.companyResearchJobs.requestCompanyResearch
  );

  const [data, setData] = useState(initialData);
  const [generating, setGenerating] = useState(false);
  const [generatingComplete, setGeneratingComplete] = useState(false);

  // planError keyed by currentStep so changing step derives a fresh null
  // without an effect — resets naturally when step changes.
  const [planErrorState, setPlanErrorState] = useState({
    step: currentStep,
    error: null,
  });
  const planError =
    planErrorState.step === currentStep ? planErrorState.error : null;
  const setPlanError = useCallback(
    (err) => setPlanErrorState({ step: currentStep, error: err }),
    [currentStep]
  );

  const [initialRestoreDone, setInitialRestoreDone] = useState(false);

  // Restore from Convex before we start persisting local state back into
  // sessionStorage. Uses a ref to run this restore at most once per viewer
  // identity so the effect only mutates state when it's actually resolving
  // an external change (the initial viewer load).
  const restoredForViewerRef = useRef(null);
  useEffect(() => {
    if (viewer === undefined || viewer === null) return;
    // Only restore once per viewer object. Further re-renders must not
    // re-run the restore — keeps this effect a one-shot sync.
    if (restoredForViewerRef.current === viewer) return;
    restoredForViewerRef.current = viewer;

    const hasSessionData =
      typeof window !== "undefined" &&
      sessionStorage.getItem("onboarding_data") != null;

    const vf = viewer.firstName?.trim() ?? "";
    const vl = viewer.lastName?.trim() ?? "";
    const split = splitFullNameDisplay(viewer.name ?? "");

    /** Prefer in-progress fields; if they are empty, use account profile / full name. */
    function withViewerNameFallback(base) {
      return {
        ...base,
        firstName:
          (base.firstName ?? "").trim() || vf || split.first || "",
        lastName:
          (base.lastName ?? "").trim() || vl || split.last || "",
      };
    }

    // Defer setState to a microtask so it does not run synchronously within
    // the effect body (react-hooks/set-state-in-effect is specifically about
    // cascading renders from synchronous setState; microtask-deferred state
    // updates are safe).
    Promise.resolve().then(() => {
      if (!hasSessionData) {
        if (viewer.partialOnboarding) {
          const po = viewer.partialOnboarding;
          setData((prev) => withViewerNameFallback({ ...prev, ...po }));
        } else if (vf || vl || split.first || split.last) {
          setData((prev) => withViewerNameFallback(prev));
        }
      } else {
        // Stale sessionStorage often has empty name fields; still hydrate from Convex.
        setData((prev) => withViewerNameFallback(prev));
      }
      setInitialRestoreDone(true);
    });
  }, [viewer]);

  useEffect(() => {
    if (!initialRestoreDone || typeof window === "undefined") return;
    sessionStorage.setItem("onboarding_data", JSON.stringify(data));
  }, [data, initialRestoreDone]);

  const update = useCallback((field, value) => {
    setData((prev) => ({ ...prev, [field]: value }));
  }, []);

  function canProceed() {
    switch (currentStep) {
      case 0: return data.roleTitle && data.startDate && data.companyName;
      case 1: return data.roleType && data.function_;
      case 2: return data.companySize && data.companyStage && data.workModel && data.starsSituation;
      case 3: return true;
      case 4: return true;
      case 5: return true;
      default: return true;
    }
  }

  async function handleSubmit() {
    setGenerating(true);
    setPlanError(null);
    try {
      if (data.firstName?.trim() || data.lastName?.trim()) {
        await updateProfile({
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
        });
      }

      await saveOnboarding({
        roleTitle: data.roleTitle,
        startDate: data.startDate,
        experienceYears: data.experienceYears,
        isFirstRoleAtLevel: data.isFirstRoleAtLevel,
        roleType: data.roleType,
        function_: data.function_,
        teamSize: data.teamSize,
        isNewTeam: data.isNewTeam,
        scope: data.scope || undefined,
        companyName: data.companyName,
        companySize: data.companySize,
        companyStage: data.companyStage,
        workModel: data.workModel,
        industry: data.industry || undefined,
        starsSituation: data.starsSituation,
        reportsTo: data.reportsTo || undefined,
        selectedGoals: data.selectedGoals.length > 0 ? data.selectedGoals : undefined,
        existingContext: data.existingContext || undefined,
        challenges: data.challenges || undefined,
        successDefinition: data.successDefinition || undefined,
        jobDescription: data.jobDescription || undefined,
      });

      const validStakeholders = data.stakeholders.filter(
        (s) => s.name.trim() && s.title.trim()
      );
      if (validStakeholders.length > 0) {
        // Deduplicate against stakeholders already in the database
        const existingNames = new Set(
          (existingStakeholders || []).map((s) => s.name.trim().toLowerCase())
        );
        const newStakeholders = validStakeholders.filter(
          (s) => !existingNames.has(s.name.trim().toLowerCase())
        );
        if (newStakeholders.length > 0) {
          await createStakeholdersBatch({
            stakeholders: newStakeholders.map((s) => ({
              name: s.name.trim(),
              role: s.title.trim(),
              relationshipType: s.relationship || "stakeholder",
              priority: s.relationship === "manager" ? "Must" : "Should",
            })),
          });
        }
      }

      if (viewer?.isPilotUser) {
        await seedPlan();
      } else {
        if (!viewer?._id) throw new Error("Not signed in. Please refresh and try again.");
        // Create a plan stub with status "generating" so the dashboard
        // shows a loading state instead of the "no plan" empty state.
        await markGenerating();
        await generatePlan({ userId: viewer._id });
        // Fire-and-forget: kick off the company research drafts agent.
        // Research failure must never block onboarding, so we swallow errors
        // here and let the user retry from the DraftReviewQueue.
        requestCompanyResearch({ trigger: "onboarding" }).catch((err) => {
          console.error("requestCompanyResearch failed:", err);
        });
      }

      setGeneratingComplete(true);
      // Best-effort cleanup after a successful plan build.
      await clearOnboardingProgress().catch(() => {});
      sessionStorage.removeItem("onboarding_data");
    } catch (err) {
      console.error("Failed to generate plan:", err);
      // Mark the plan stub as failed so dashboard shows an error state
      if (!viewer?.isPilotUser) markFailed().catch(() => {});
      setPlanError(err instanceof Error ? err.message : "Could not build your plan. Try again.");
      setGenerating(false);
    }
  }

  async function handleNext() {
    // Step 5 (currentStep === 4) lets users add stakeholder rows. If they
    // typed into a row but never clicked "Add another", the row is still
    // in `data.stakeholders` (pre-seeded with one empty entry) but won't
    // be picked up by handleSubmit's `validStakeholders` filter unless we
    // keep it. Filter to drop fully-empty rows but preserve any with at
    // least a name OR title typed — they'll show up on Step 6 summary and
    // get flushed to the stakeholders table on submit.
    const cleanedStakeholders = (data.stakeholders || []).filter(
      (s) =>
        (s.name ?? "").trim() !== "" || (s.title ?? "").trim() !== ""
    );

    // Persist EVERYTHING on every step — including stakeholders and scope
    // — so a Convex query re-fire / viewer-restore effect can't blank
    // them. The schema in convex/users.js was updated to match.
    const saveable = {
      ...data,
      stakeholders: cleanedStakeholders,
    };

    if (currentStep < TOTAL_STEPS - 1) {
      // Fire-and-forget for intermediate steps — don't block navigation
      saveOnboardingProgress({ step: currentStep, data: saveable }).catch(() => {});
      // Mirror the cleaned stakeholders back into local state so the
      // Step 6 summary doesn't render the stale empty row.
      if (cleanedStakeholders.length !== (data.stakeholders || []).length) {
        setData((prev) => ({
          ...prev,
          stakeholders:
            cleanedStakeholders.length > 0
              ? cleanedStakeholders
              : [{ ...EMPTY_STAKEHOLDER }],
        }));
      }
      router.push(`/onboarding/${currentStep + 2}`);
    } else {
      // On the final step, await the save so it completes before
      // handleSubmit's clearOnboardingProgress can race past it.
      await saveOnboardingProgress({ step: currentStep, data: saveable }).catch(() => {});
      handleSubmit();
    }
  }

  function handleBack() {
    if (currentStep > 0) router.push(`/onboarding/${currentStep}`);
  }

  function toggleGoal(goalId) {
    setData((prev) => {
      const goals = prev.selectedGoals || [];
      return {
        ...prev,
        selectedGoals: goals.includes(goalId)
          ? goals.filter((g) => g !== goalId)
          : [...goals, goalId],
      };
    });
  }

  function updateStakeholder(index, value) {
    setData((prev) => {
      const list = [...prev.stakeholders];
      list[index] = value;
      return { ...prev, stakeholders: list };
    });
  }

  function addStakeholder() {
    setData((prev) => ({
      ...prev,
      stakeholders: [...prev.stakeholders, { ...EMPTY_STAKEHOLDER }],
    }));
  }

  function removeStakeholder(index) {
    setData((prev) => ({
      ...prev,
      stakeholders: prev.stakeholders.filter((_, i) => i !== index),
    }));
  }

  const inputClass =
    "w-full px-3.5 py-2.5 rounded-lg border border-warm-line bg-white text-sm text-warm-ink placeholder:text-warm-border focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition font-space-grotesk";
  const labelClass = "block font-space-grotesk text-sm font-medium text-warm-ink mb-1.5";

  if (generating) {
    return (
      <CompletionOverlay
        error={planError}
        onRetry={handleSubmit}
        onDashboard={() => router.push("/dashboard")}
        isComplete={generatingComplete}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-10 pt-6 pb-28">
      <StepProgress currentStep={currentStep} />

      {planError && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 font-space-grotesk text-sm text-red-800"
        >
          {planError}
        </div>
      )}

      <StepTransition stepKey={currentStep}>
        <div className="space-y-6">
          {/* ===== STEP 0: Welcome / About You ===== */}
          {currentStep === 0 && (
            <>
              <div className="mb-8">
                <p className="text-xs font-medium uppercase tracking-wider text-accent mb-3 font-space-grotesk onboarding-fade-in">
                  Your Profile
                </p>
                <h1 className="text-3xl sm:text-4xl font-normal tracking-tight font-instrument-serif text-warm-ink mb-3 onboarding-fade-in-d1">
                  Welcome to Arcora
                </h1>
                <p className="text-base text-warm-500 leading-relaxed font-space-grotesk onboarding-fade-in-d2">
                  Let&apos;s set up your workspace. We&apos;ll use this to personalize your 90-day plan, surface the right tasks, and help you build relationships faster.
                </p>
              </div>

              <div className="space-y-5 onboarding-fade-in-d3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>First name</label>
                    <input
                      value={data.firstName}
                      onChange={(e) => update("firstName", e.target.value)}
                      className={inputClass}
                      placeholder="Jane"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Last name</label>
                    <input
                      value={data.lastName}
                      onChange={(e) => update("lastName", e.target.value)}
                      className={inputClass}
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Your job title</label>
                  <input
                    value={data.roleTitle}
                    onChange={(e) => update("roleTitle", e.target.value)}
                    className={inputClass}
                    placeholder="e.g. Senior Product Manager"
                  />
                </div>

                <div>
                  <label className={labelClass}>Company name</label>
                  <input
                    value={data.companyName}
                    onChange={(e) => update("companyName", e.target.value)}
                    className={inputClass}
                    placeholder="e.g. Acme Corp"
                  />
                </div>

                <div>
                  <label className={labelClass}>Start date at new role</label>
                  <input
                    type="date"
                    value={data.startDate}
                    onChange={(e) => update("startDate", e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Years of experience</label>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={data.experienceYears}
                      onChange={(e) => update("experienceYears", parseInt(e.target.value) || 0)}
                      className={inputClass}
                    />
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={data.isFirstRoleAtLevel}
                        onChange={(e) => update("isFirstRoleAtLevel", e.target.checked)}
                        className="w-4 h-4 rounded border-warm-line accent-accent focus:ring-accent"
                      />
                      <span className="font-space-grotesk text-sm text-warm-ink">
                        First role at this level
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ===== STEP 1: Role & Function ===== */}
          {currentStep === 1 && (
            <>
              <div className="mb-8">
                <p className="text-xs font-medium uppercase tracking-wider text-accent mb-3 font-space-grotesk onboarding-fade-in">
                  Role Context
                </p>
                <h1 className="text-3xl sm:text-4xl font-normal tracking-tight font-instrument-serif text-warm-ink mb-3 onboarding-fade-in-d1">
                  What best describes your role?
                </h1>
                <p className="text-base text-warm-500 leading-relaxed font-space-grotesk onboarding-fade-in-d2">
                  This helps us tailor your plan with the right milestones, suggested stakeholders, and relevant templates.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 onboarding-fade-in-d3">
                {ROLE_OPTIONS.map((role) => (
                  <RoleCard
                    key={role.value}
                    icon={role.icon}
                    label={role.label}
                    description={role.desc}
                    selected={data.roleType === role.value}
                    onSelect={() => update("roleType", role.value)}
                  />
                ))}
              </div>

              <div className="space-y-4 mt-5 onboarding-fade-in-d4">
                <div>
                  <label className={labelClass}>Function / Department</label>
                  <input
                    value={data.function_}
                    onChange={(e) => update("function_", e.target.value)}
                    className={inputClass}
                    placeholder="e.g. Research / UX, Engineering, Product"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Team size (optional)</label>
                    <input
                      type="number"
                      value={data.teamSize || ""}
                      onChange={(e) => update("teamSize", parseInt(e.target.value) || undefined)}
                      className={inputClass}
                      placeholder="Number of direct reports"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Who do you report to?</label>
                    <input
                      value={data.reportsTo}
                      onChange={(e) => update("reportsTo", e.target.value)}
                      className={inputClass}
                      placeholder="e.g. Sarah Jenkins, VP of Product"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass} htmlFor="onboarding-scope">
                    Describe your role scope (optional)
                  </label>
                  <input
                    id="onboarding-scope"
                    name="onboarding-scope"
                    autoComplete="off"
                    value={data.scope ?? ""}
                    onChange={(e) => update("scope", e.target.value)}
                    className={inputClass}
                    placeholder="e.g. Leading product design for the Agent Studio team"
                    maxLength={500}
                  />
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.isNewTeam}
                    onChange={(e) => update("isNewTeam", e.target.checked)}
                    className="w-4 h-4 rounded border-warm-line accent-accent focus:ring-accent"
                  />
                  <span className="font-space-grotesk text-sm text-warm-ink">
                    I&apos;m joining a new team (not an existing one)
                  </span>
                </label>
              </div>
            </>
          )}

          {/* ===== STEP 2: Company & Situation ===== */}
          {currentStep === 2 && (
            <>
              <div className="mb-8">
                <p className="text-xs font-medium uppercase tracking-wider text-accent mb-3 font-space-grotesk onboarding-fade-in">
                  Company & Situation
                </p>
                <h1 className="text-3xl sm:text-4xl font-normal tracking-tight font-instrument-serif text-warm-ink mb-3 onboarding-fade-in-d1">
                  About the organization
                </h1>
                <p className="text-base text-warm-500 leading-relaxed font-space-grotesk onboarding-fade-in-d2">
                  Context about the company and your situation helps us build a more relevant plan.
                </p>
              </div>

              <div className="space-y-5 onboarding-fade-in-d3">
                <div>
                  <label className={labelClass}>Company size</label>
                  <div className="flex flex-wrap gap-2">
                    {companySizes.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => update("companySize", s)}
                        className={`px-3.5 py-2 rounded-lg font-space-grotesk text-sm transition-all ${
                          data.companySize === s
                            ? "bg-accent text-white shadow-sm"
                            : "bg-white border border-warm-line text-warm-ink hover:border-warm-border"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Stage</label>
                  <div className="flex flex-wrap gap-2">
                    {companyStages.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => update("companyStage", s)}
                        className={`px-3.5 py-2 rounded-lg font-space-grotesk text-sm transition-all ${
                          data.companyStage === s
                            ? "bg-accent text-white shadow-sm"
                            : "bg-white border border-warm-line text-warm-ink hover:border-warm-border"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Work model</label>
                  <div className="flex gap-2">
                    {workModels.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => update("workModel", m)}
                        className={`flex-1 px-3.5 py-2.5 rounded-lg font-space-grotesk text-sm text-center transition-all ${
                          data.workModel === m
                            ? "bg-accent text-white shadow-sm"
                            : "bg-white border border-warm-line text-warm-ink hover:border-warm-border"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Industry (optional)</label>
                  <input
                    value={data.industry}
                    onChange={(e) => update("industry", e.target.value)}
                    className={inputClass}
                    placeholder="e.g. Technology / SaaS"
                  />
                </div>

                <div className="border-t border-warm-line pt-5">
                  <p className="text-xs font-medium uppercase tracking-wider text-accent mb-3 font-space-grotesk">
                    STARS Assessment
                  </p>
                  <p className="text-sm text-warm-500 mb-3 font-space-grotesk">
                    Based on Michael Watkins&apos; STARS model, select the situation that best describes your new role.
                  </p>
                  <div className="space-y-3">
                    {starsOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => update("starsSituation", opt.value)}
                        className={`w-full text-left p-4 rounded-xl border transition-all ${
                          data.starsSituation === opt.value
                            ? "border-accent bg-accent/[0.06]"
                            : "border-warm-line bg-white hover:border-warm-border"
                        }`}
                      >
                        <p className="font-space-grotesk text-sm font-medium text-warm-ink">
                          {opt.label}
                        </p>
                        <p className="font-space-grotesk text-xs text-warm-300 mt-0.5">
                          {opt.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ===== STEP 3: Goals & Priorities ===== */}
          {currentStep === 3 && (
            <>
              <div className="mb-8">
                <p className="text-xs font-medium uppercase tracking-wider text-accent mb-3 font-space-grotesk onboarding-fade-in">
                  Goals & Priorities
                </p>
                <h1 className="text-3xl sm:text-4xl font-normal tracking-tight font-instrument-serif text-warm-ink mb-3 onboarding-fade-in-d1">
                  What matters most in your first 90 days?
                </h1>
                <p className="text-base text-warm-500 leading-relaxed font-space-grotesk onboarding-fade-in-d2">
                  Select all that apply. We&apos;ll use these to generate your strategic plan and milestones.
                </p>
              </div>

              <div className="space-y-3 onboarding-fade-in-d3">
                {GOAL_OPTIONS.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    icon={goal.icon}
                    label={goal.label}
                    description={goal.desc}
                    selected={(data.selectedGoals || []).includes(goal.id)}
                    onToggle={() => toggleGoal(goal.id)}
                  />
                ))}
              </div>

              <div className="space-y-5 mt-6 onboarding-fade-in-d4">
                <div>
                  <label
                    className={labelClass}
                    htmlFor="onboarding-success-definition"
                  >
                    What does success look like at 90 days?
                  </label>
                  <p className="text-xs text-warm-300 mb-2 font-space-grotesk">Your personal definition -- not just what the company expects.</p>
                  <textarea
                    id="onboarding-success-definition"
                    name="onboarding-success-definition"
                    autoComplete="off"
                    rows={3}
                    value={data.successDefinition}
                    onChange={(e) => update("successDefinition", e.target.value)}
                    className={inputClass}
                    placeholder="e.g. I want to have strong relationships with key stakeholders, a clear understanding of the product roadmap, and have delivered at least one visible improvement..."
                  />
                </div>
              </div>
            </>
          )}

          {/* ===== STEP 4: Key Stakeholders ===== */}
          {currentStep === 4 && (
            <>
              <div className="mb-8">
                <p className="text-xs font-medium uppercase tracking-wider text-accent mb-3 font-space-grotesk onboarding-fade-in">
                  Stakeholder Map
                </p>
                <h1 className="text-3xl sm:text-4xl font-normal tracking-tight font-instrument-serif text-warm-ink mb-3 onboarding-fade-in-d1">
                  Who are the key people to know?
                </h1>
                <p className="text-base text-warm-500 leading-relaxed font-space-grotesk onboarding-fade-in-d2">
                  Add the stakeholders you&apos;ll be working with most closely. We&apos;ll help you track relationship building and meeting notes for each one.
                </p>
              </div>

              <div className="space-y-3 onboarding-fade-in-d3">
                {(data.stakeholders || []).map((s, i) => (
                  <StakeholderRow
                    key={i}
                    stakeholder={s}
                    onChange={(val) => updateStakeholder(i, val)}
                    onRemove={() => removeStakeholder(i)}
                    canRemove={data.stakeholders.length > 1}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={addStakeholder}
                className="mt-4 flex items-center gap-2 text-sm font-medium text-accent hover:text-accent-hover transition-colors font-space-grotesk onboarding-fade-in-d4"
              >
                <Icon icon="solar:add-circle-linear" width={18} />
                Add another stakeholder
              </button>

              <div className="mt-6 p-4 rounded-xl bg-accent/[0.06] border border-accent/10 onboarding-fade-in-d4">
                <div className="flex items-start gap-3">
                  <Icon icon="solar:lightbulb-linear" width={18} className="text-accent mt-0.5 shrink-0" />
                  <p className="text-xs text-warm-500 leading-relaxed font-space-grotesk">
                    Don&apos;t worry about getting everyone -- you can always add more stakeholders later. We recommend starting with 3-5 people you&apos;ll interact with most in your first few weeks.
                  </p>
                </div>
              </div>

              <div className="space-y-5 mt-6">
                <div>
                  <label
                    className={labelClass}
                    htmlFor="onboarding-job-description"
                  >
                    Paste your job description (optional)
                  </label>
                  <p className="text-xs text-warm-300 mb-2 font-space-grotesk">
                    If you have it, paste the full JD here. We&apos;ll use it to research your company and pre-build context into your knowledge base.
                  </p>
                  <textarea
                    id="onboarding-job-description"
                    name="onboarding-job-description"
                    autoComplete="off"
                    rows={5}
                    value={data.jobDescription}
                    onChange={(e) => update("jobDescription", e.target.value)}
                    className={inputClass}
                    placeholder="Paste the full job description text here..."
                  />
                </div>
                <div>
                  <label
                    className={labelClass}
                    htmlFor="onboarding-existing-context"
                  >
                    What do you already know about the team or company? (optional)
                  </label>
                  <p className="text-xs text-warm-300 mb-2 font-space-grotesk">Any intel from interviews, conversations, or research.</p>
                  <textarea
                    id="onboarding-existing-context"
                    name="onboarding-existing-context"
                    autoComplete="off"
                    rows={3}
                    value={data.existingContext}
                    onChange={(e) => update("existingContext", e.target.value)}
                    className={inputClass}
                    placeholder="e.g. The team recently went through a reorg. Engineering is focused on migrating to a new architecture..."
                  />
                </div>
                <div>
                  <label
                    className={labelClass}
                    htmlFor="onboarding-challenges"
                  >
                    Any specific challenges or risks you&apos;re aware of? (optional)
                  </label>
                  <p className="text-xs text-warm-300 mb-2 font-space-grotesk">Things you want to watch out for or navigate carefully.</p>
                  <textarea
                    id="onboarding-challenges"
                    name="onboarding-challenges"
                    autoComplete="off"
                    rows={3}
                    value={data.challenges}
                    onChange={(e) => update("challenges", e.target.value)}
                    className={inputClass}
                    placeholder="e.g. My predecessor left on bad terms. The team hasn't had a dedicated PM in 3 months..."
                  />
                </div>
              </div>
            </>
          )}

          {/* ===== STEP 5: Review & Generate ===== */}
          {currentStep === 5 && (
            <>
              <div className="mb-8">
                <p className="text-xs font-medium uppercase tracking-wider text-accent mb-3 font-space-grotesk onboarding-fade-in">
                  Almost Done
                </p>
                <h1 className="text-3xl sm:text-4xl font-normal tracking-tight font-instrument-serif text-warm-ink mb-3 onboarding-fade-in-d1">
                  Ready to build your plan
                </h1>
                <p className="text-base text-warm-500 leading-relaxed font-space-grotesk onboarding-fade-in-d2">
                  We&apos;ll create a personalized 90-day plan based on your inputs. You can always customize it later.
                </p>
              </div>

              <div className="bg-white border border-warm-line rounded-xl p-5 space-y-3 onboarding-fade-in-d3">
                <h3 className="font-space-grotesk text-sm font-medium text-warm-ink">
                  Summary
                </h3>
                <div className="space-y-2 font-space-grotesk text-sm">
                  {[
                    ["Name", [data.firstName, data.lastName].filter(Boolean).join(" ") || "—"],
                    ["Role", data.roleTitle || "—"],
                    ["Company", data.companyName || "—"],
                    ["Function", `${data.roleType || "—"}${data.function_ ? ` · ${data.function_}` : ""}`],
                    ["Situation", data.starsSituation || "—"],
                    ["Start date", data.startDate || "—"],
                    ["Goals", (data.selectedGoals || []).length > 0
                      ? GOAL_OPTIONS.filter(g => data.selectedGoals.includes(g.id)).map(g => g.label).join(", ")
                      : "—"],
                    ["Stakeholders", (data.stakeholders || []).filter(s => s.name.trim()).map(s => s.name).join(", ") || "—"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4">
                      <span className="text-warm-500 shrink-0">{label}</span>
                      <span className="text-warm-ink font-medium text-right">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {data.successDefinition && (
                <div className="bg-white border border-warm-line rounded-xl p-5 mt-4 onboarding-fade-in-d4">
                  <h3 className="font-space-grotesk text-sm font-medium text-warm-ink mb-2">
                    Success at 90 days
                  </h3>
                  <p className="font-space-grotesk text-sm text-warm-500 leading-relaxed">
                    {data.successDefinition}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </StepTransition>

      {/* Bottom nav */}
      <div className="fixed bottom-0 inset-x-0 bg-paper/95 backdrop-blur-md border-t border-warm-line z-50 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-10 py-4 flex items-center justify-between">
          {currentStep > 0 ? (
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2.5 rounded-lg font-space-grotesk text-sm font-medium text-warm-500 flex items-center gap-2 hover:bg-warm-line transition-colors"
            >
              <Icon icon="solar:arrow-left-linear" width={16} />
              Back
            </button>
          ) : (
            <div />
          )}
          <button
            type="button"
            onClick={handleNext}
            disabled={!canProceed() || viewer === undefined}
            className="bg-accent hover:bg-accent-hover text-white rounded-lg px-6 py-2.5 font-space-grotesk text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
          >
            {currentStep === TOTAL_STEPS - 1 ? (
              <>
                Generate my plan
                <Icon icon="solar:stars-minimalistic-linear" width={16} />
              </>
            ) : (
              <>
                Continue
                <Icon icon="solar:arrow-right-linear" width={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
