"use client";

import { useQuery, useMutation, useConvexAuth, useConvex } from "convex/react";
import { useAuthActions, useAuthToken } from "@convex-dev/auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import SettingsCard from "@/components/settings/SettingsCard";
import SaveBar from "@/components/settings/SaveBar";
import SectionHeader from "@/components/settings/SectionHeader";
import Field, {
  fieldInputClass,
  fieldSelectClass,
} from "@/components/settings/Field";
import ToggleRow from "@/components/settings/ToggleRow";
import { useToast } from "@/components/primitives/Toaster";
import {
  passwordRequirements,
  passwordStrength,
  PASSWORD_MIN_LENGTH,
} from "@/lib/passwordValidation";
import { displayName, splitFullNameDisplay, userInitials } from "@/lib/userDisplay";
import PublicSharingPanel from "@/components/settings/PublicSharingPanel";

const TABS = [
  { id: "profile", label: "Profile", icon: "user" },
  { id: "account", label: "Account", icon: "lock" },
  { id: "billing", label: "Billing", icon: "card" },
  { id: "notifications", label: "Notifications", icon: "bell" },
  { id: "sharing", label: "Sharing", icon: "share" },
];

const WEEK_START_DAYS = ["Monday", "Sunday", "Saturday"];

const COMMON_TIMEZONES = [
  "Europe/London",
  "Europe/Dublin",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "UTC",
];

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97757]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F0E0D]";

function Icon({ name, className = "", size = 18 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    "aria-hidden": "true",
  };
  switch (name) {
    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0116 0" />
        </svg>
      );
    case "lock":
      return (
        <svg {...common}>
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 018 0v4" />
        </svg>
      );
    case "bell":
      return (
        <svg {...common}>
          <path d="M6 8a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6" />
          <path d="M10 20a2 2 0 004 0" />
        </svg>
      );
    case "camera":
      return (
        <svg {...common}>
          <path d="M4 7h3l2-3h6l2 3h3a1 1 0 011 1v11a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      );
    case "alert":
      return (
        <svg {...common}>
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
          <path d="M10.3 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      );
    case "card":
      return (
        <svg {...common}>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
        </svg>
      );
    case "share":
      return (
        <svg {...common}>
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      );
    default:
      return null;
  }
}

function SettingsLoading() {
  return (
    <div
      className="flex items-center justify-center py-24"
      role="status"
      aria-live="polite"
    >
      <div
        className="w-6 h-6 border-2 border-[#D97757] border-t-transparent rounded-full animate-spin"
        aria-hidden="true"
      />
      <span className="sr-only">Loading settings…</span>
    </div>
  );
}

// useSearchParams() requires a Suspense boundary at the page level or
// `next build` fails the static prerender pass (same pattern as the
// auth pages).
export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsLoading />}>
      <SettingsPageInner />
    </Suspense>
  );
}

function SettingsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const user = useQuery(api.users.viewer);
  const onboarding = useQuery(api.onboarding.get);
  const entitlements = useQuery(api.billing.getEntitlements);
  const authToken = useAuthToken();

  const updateSettings = useMutation(api.users.updateSettings);
  const updateProfile = useMutation(api.users.updateProfile);
  const updateOnboardingContext = useMutation(api.onboarding.updateContext);
  const generateAvatarUploadUrl = useMutation(api.users.generateAvatarUploadUrl);
  const setAvatar = useMutation(api.users.setAvatar);
  const removeAvatar = useMutation(api.users.removeAvatar);
  const deleteAccount = useMutation(api.users.deleteAccount);
  const startLocalTrial = useMutation(api.billing.startLocalTrial);
  const convexClient = useConvex();
  const { signIn, signOut } = useAuthActions();
  const addToast = useToast();

  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState("");

  async function handleDownloadData() {
    setExportError("");
    setExportLoading(true);
    try {
      const data = await convexClient.query(api.users.exportMyData, {});
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().split("T")[0];
      a.href = url;
      a.download = `arcora-export-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      addToast("Your data has been downloaded.", "success");
    } catch (err) {
      const message = err?.data ?? err?.message ?? "Could not export data.";
      setExportError(typeof message === "string" ? message : "Could not export data.");
    } finally {
      setExportLoading(false);
    }
  }

  // Capture ?billing= (Stripe redirect / in-app upgrade links) into state,
  // then strip it from the URL so refreshes and back-nav don't replay it.
  // The captured value keeps driving the success/cancel banner, and the
  // user can still switch tabs freely afterwards.
  const billingStatusParam = searchParams.get("billing");
  const [billingStatus, setBillingStatus] = useState(billingStatusParam);

  // User-chosen tab. null = "let derivation pick" (billing when we arrived
  // via a ?billing= link, profile otherwise).
  const [userSelectedTab, setUserSelectedTab] = useState(null);
  const tabsBaseId = useId();

  useEffect(() => {
    if (!billingStatusParam) return;
    setBillingStatus(billingStatusParam);
    setUserSelectedTab("billing");
    router.replace("/settings", { scroll: false });
  }, [billingStatusParam, router]);

  const activeTab = userSelectedTab ?? (billingStatus ? "billing" : "profile");
  const setActiveTab = useCallback((tab) => setUserSelectedTab(tab), []);

  // Scroll the active tab into view within the horizontal scroll container
  // so tabs like "Billing" (triggered by Stripe redirect) are immediately visible.
  useEffect(() => {
    const el = document.getElementById(tabId(activeTab));
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const [billingLoading, setBillingLoading] = useState(null); // 'monthly' | 'annual' | 'portal' | 'trial' | null
  const [billingError, setBillingError] = useState("");

  async function handleStartTrial() {
    setBillingError("");
    setBillingLoading("trial");
    try {
      await startLocalTrial({});
      addToast("Your 7-day Pro trial just started.", "success");
    } catch (err) {
      setBillingError(err?.message ?? "Could not start trial");
    } finally {
      setBillingLoading(null);
    }
  }

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [contextForm, setContextForm] = useState({
    scope: "",
    reportsTo: "",
    successDefinition: "",
    existingContext: "",
    challenges: "",
    jobDescription: "",
  });
  const [contextSaving, setContextSaving] = useState(false);
  const [contextSaved, setContextSaved] = useState(false);
  const [contextError, setContextError] = useState("");

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const fileInputRef = useRef(null);

  const defaultTz = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    []
  );

  const [accountForm, setAccountForm] = useState({
    timezone: defaultTz,
    weekStartDay: "Monday",
  });
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountSaved, setAccountSaved] = useState(false);
  const [accountError, setAccountError] = useState("");

  const [notifications, setNotifications] = useState({
    dailyDigest: true,
    stakeholderUpdates: true,
    milestoneReminders: false,
    emailNotifications: true,
    dailyReminderTime: "08:00",
    reflectionReminderTime: "18:00",
  });
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifSaved, setNotifSaved] = useState(false);
  const [notifError, setNotifError] = useState("");

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const deleteTriggerRef = useRef(null);
  const deleteInputRef = useRef(null);

  // Hydrate local form state from Convex queries. We use a microtask-defer
  // so the setState calls are not synchronous within the effect body — which
  // is what the react-hooks/set-state-in-effect rule is guarding against.
  // A ref tracks which values we've already mirrored so the effect only
  // fires when upstream data actually changes.
  const lastHydratedUserName = useRef(null);
  useEffect(() => {
    if (!user) return;
    const key = `${user.firstName ?? ""}|${user.lastName ?? ""}|${user.name ?? ""}`;
    if (lastHydratedUserName.current === key) return;
    lastHydratedUserName.current = key;
    const f = user.firstName?.trim();
    const l = user.lastName?.trim();
    Promise.resolve().then(() => {
      if (f || l) {
        setFirstName(f ?? "");
        setLastName(l ?? "");
      } else {
        const { first, last } = splitFullNameDisplay(user.name ?? "");
        setFirstName(first);
        setLastName(last);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.name, user?.firstName, user?.lastName]);

  const lastHydratedRoleTitle = useRef(null);
  useEffect(() => {
    if (!onboarding) return;
    if (lastHydratedRoleTitle.current === onboarding.roleTitle) return;
    lastHydratedRoleTitle.current = onboarding.roleTitle;
    const next = onboarding.roleTitle ?? "";
    Promise.resolve().then(() => setRoleTitle(next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboarding?.roleTitle]);

  const lastHydratedContext = useRef(null);
  useEffect(() => {
    if (!onboarding) return;
    const key = JSON.stringify({
      scope: onboarding.scope,
      reportsTo: onboarding.reportsTo,
      successDefinition: onboarding.successDefinition,
      existingContext: onboarding.existingContext,
      challenges: onboarding.challenges,
      jobDescription: onboarding.jobDescription,
    });
    if (lastHydratedContext.current === key) return;
    lastHydratedContext.current = key;
    const next = {
      scope: onboarding.scope ?? "",
      reportsTo: onboarding.reportsTo ?? "",
      successDefinition: onboarding.successDefinition ?? "",
      existingContext: onboarding.existingContext ?? "",
      challenges: onboarding.challenges ?? "",
      jobDescription: onboarding.jobDescription ?? "",
    };
    Promise.resolve().then(() => setContextForm(next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    onboarding?.scope,
    onboarding?.reportsTo,
    onboarding?.successDefinition,
    onboarding?.existingContext,
    onboarding?.challenges,
    onboarding?.jobDescription,
  ]);

  const lastHydratedAccount = useRef(null);
  useEffect(() => {
    if (!user?.settings) return;
    const s = user.settings;
    const key = JSON.stringify(s);
    if (lastHydratedAccount.current === key) return;
    lastHydratedAccount.current = key;
    Promise.resolve().then(() => {
      setAccountForm((prev) => ({
        timezone: s.timezone ?? prev.timezone,
        weekStartDay: s.weekStartDay ?? prev.weekStartDay,
      }));
      setNotifications((prev) => ({
        dailyDigest: s.dailyDigest ?? prev.dailyDigest,
        stakeholderUpdates: s.stakeholderUpdates ?? prev.stakeholderUpdates,
        milestoneReminders: s.milestoneReminders ?? prev.milestoneReminders,
        emailNotifications: s.emailNotifications ?? prev.emailNotifications,
        dailyReminderTime: s.dailyReminderTime ?? prev.dailyReminderTime,
        reflectionReminderTime:
          s.reflectionReminderTime ?? prev.reflectionReminderTime,
      }));
    });
  }, [user?.settings]);

  // Focus management for the delete-confirm flow.
  useEffect(() => {
    if (confirmDelete) {
      deleteInputRef.current?.focus();
    } else {
      // After cancel/abort, restore focus to the trigger.
      deleteTriggerRef.current?.focus();
    }
  }, [confirmDelete]);

  async function handleProfileSave() {
    setProfileError("");
    setProfileSaving(true);
    try {
           await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        // Only send roleTitle if there's an onboarding row to update.
        roleTitle: onboarding ? roleTitle : undefined,
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
      addToast("Profile saved", "success");
    } catch (err) {
      setProfileError(err?.message ?? "Failed to save profile");
      addToast(err?.message ?? "Failed to save profile", "error");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleContextSave() {
    setContextError("");
    setContextSaving(true);
    try {
      await updateOnboardingContext({
        scope: contextForm.scope,
        reportsTo: contextForm.reportsTo,
        successDefinition: contextForm.successDefinition,
        existingContext: contextForm.existingContext,
        challenges: contextForm.challenges,
        jobDescription: contextForm.jobDescription,
      });
      setContextSaved(true);
      setTimeout(() => setContextSaved(false), 2000);
      addToast("Plan context saved", "success");
    } catch (err) {
      setContextError(err?.message ?? "Failed to save plan context");
      addToast(err?.message ?? "Failed to save plan context", "error");
    } finally {
      setContextSaving(false);
    }
  }

  async function handleAvatarSelected(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setAvatarError("");

    if (
      !["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type)
    ) {
      setAvatarError("Please upload a JPG, PNG, GIF, or WebP image.");
      return;
    }
    if (file.size > 1024 * 1024) {
      setAvatarError("Image must be 1MB or smaller.");
      return;
    }

    setAvatarUploading(true);
    try {
      const uploadUrl = await generateAvatarUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { storageId } = await res.json();
      await setAvatar({ storageId });
    } catch (err) {
      setAvatarError(err?.message ?? "Upload failed");
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleAvatarRemove() {
    setAvatarError("");
    try {
      await removeAvatar();
    } catch (err) {
      setAvatarError(err?.message ?? "Failed to remove avatar");
    }
  }

  async function handleAccountSave() {
    setAccountError("");
    setAccountSaving(true);
    try {
      await updateSettings({
        settings: {
          timezone: accountForm.timezone,
          weekStartDay: accountForm.weekStartDay,
        },
      });
      setAccountSaved(true);
      setTimeout(() => setAccountSaved(false), 2000);
      addToast("Account preferences saved", "success");
    } catch (err) {
      setAccountError(err?.message ?? "Failed to save account preferences");
      addToast(err?.message ?? "Failed to save account preferences", "error");
    } finally {
      setAccountSaving(false);
    }
  }

  async function handleNotifSave() {
    setNotifError("");
    setNotifSaving(true);
    try {
      await updateSettings({
        settings: {
          dailyDigest: notifications.dailyDigest,
          stakeholderUpdates: notifications.stakeholderUpdates,
          milestoneReminders: notifications.milestoneReminders,
          emailNotifications: notifications.emailNotifications,
          dailyReminderTime: notifications.dailyReminderTime,
          reflectionReminderTime: notifications.reflectionReminderTime,
        },
      });
      setNotifSaved(true);
      setTimeout(() => setNotifSaved(false), 2000);
      addToast("Notification preferences saved", "success");
    } catch (err) {
      setNotifError(err?.message ?? "Failed to save notification preferences");
      addToast(err?.message ?? "Failed to save notification preferences", "error");
    } finally {
      setNotifSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteText !== "delete") return;
    setDeleteError("");
    setDeleting(true);
    try {
      await deleteAccount();
      await signOut();
      router.push("/login");
    } catch (err) {
      setDeleteError(err?.message ?? "Failed to delete account");
      setDeleting(false);
    }
  }

  async function handleUpgrade(interval) {
    if (!authToken) {
      setBillingError("Session not ready — try refreshing.");
      return;
    }
    setBillingError("");
    setBillingLoading(interval);
    try {
      const res = await fetch("/api/billing/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ interval }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        throw new Error(data?.error ?? "Could not start checkout");
      }
      window.location.href = data.url;
    } catch (err) {
      setBillingError(err?.message ?? "Could not start checkout");
      setBillingLoading(null);
    }
  }

  async function handleManageSubscription() {
    if (!authToken) {
      setBillingError("Session not ready — try refreshing.");
      return;
    }
    setBillingError("");
    setBillingLoading("portal");
    try {
      const res = await fetch("/api/billing/create-portal-session", {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        throw new Error(data?.error ?? "Could not open billing portal");
      }
      window.location.href = data.url;
    } catch (err) {
      setBillingError(err?.message ?? "Could not open billing portal");
      setBillingLoading(null);
    }
  }

  // Distinguish loading from null user: use Convex auth state.
  if (authLoading || (isAuthenticated && user === undefined)) {
    return <SettingsLoading />;
  }

  if (!user) {
    // The app layout should have already redirected, but guard anyway.
    return (
      <div className="py-24 text-center font-space-grotesk text-sm text-[#A8A29E]">
        You&apos;re not signed in.{" "}
        <a href="/login" className="text-[#D97757] underline">
          Sign in
        </a>{" "}
        to manage your settings.
      </div>
    );
  }

  const initials = userInitials(user);

  function tabId(id) {
    return `${tabsBaseId}-tab-${id}`;
  }

  function panelId(id) {
    return `${tabsBaseId}-panel-${id}`;
  }

  function handleTabKeyDown(event, currentIndex) {
    const last = TABS.length - 1;
    let nextIndex = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = currentIndex === last ? 0 : currentIndex + 1;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = currentIndex === 0 ? last : currentIndex - 1;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = last;
    }
    if (nextIndex !== null) {
      event.preventDefault();
      const next = TABS[nextIndex];
      setActiveTab(next.id);
      // Move focus to the newly-active tab.
      requestAnimationFrame(() => {
        document.getElementById(tabId(next.id))?.focus();
      });
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Page header */}
      <div className="border-b border-[#2C2825] pb-5 sm:pb-6">
        <h1 className="font-instrument-serif tracking-[-0.5px] sm:tracking-[-0.9px] text-2xl sm:text-3xl md:text-4xl leading-tight text-white">
          Settings
        </h1>
        <p className="font-space-grotesk text-xs sm:text-sm text-[#A8A29E] mt-1">
          Your profile, schedule, and what we email you about.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        {/* Tab nav with proper ARIA tablist semantics */}
        <aside className="w-full md:w-48 shrink-0 min-w-0">
          <div className="relative -mx-4 sm:mx-0 md:mx-0 overflow-x-hidden sm:overflow-x-visible md:overflow-visible">
            <nav
              role="tablist"
              aria-label="Settings sections"
              aria-orientation="vertical"
              className="no-scrollbar flex md:flex-col gap-1 overflow-x-auto md:overflow-visible scroll-smooth snap-x snap-mandatory px-4 sm:px-0 pb-2 md:pb-0 w-full"
            >
              {TABS.map((tab, idx) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={tabId(tab.id)}
                    role="tab"
                    type="button"
                    aria-selected={active}
                    aria-controls={panelId(tab.id)}
                    tabIndex={active ? 0 : -1}
                    onClick={() => setActiveTab(tab.id)}
                    onKeyDown={(e) => handleTabKeyDown(e, idx)}
                    className={`snap-start shrink-0 flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-space-grotesk whitespace-nowrap transition-colors min-h-11 ${FOCUS_RING} ${
                      active
                        ? "bg-[#D97757]/10 text-[#D97757] font-medium"
                        : "text-[#A8A29E] hover:bg-[#1C1917] hover:text-[#E7E5E4] font-normal"
                    }`}
                  >
                    <Icon name={tab.icon} size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
            <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-paper-dark to-transparent md:hidden" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-paper-dark to-transparent md:hidden" />
          </div>
        </aside>

        {/* Panels */}
        <div className="flex-1 md:max-w-2xl space-y-6 sm:space-y-8 pb-12 min-w-0">
          {activeTab === "profile" && (
            <div
              role="tabpanel"
              id={panelId("profile")}
              aria-labelledby={tabId("profile")}
              tabIndex={0}
              className="space-y-8 focus:outline-none"
            >
              <ProfileSection
                user={user}
                onboarding={onboarding}
                firstName={firstName}
                lastName={lastName}
                roleTitle={roleTitle}
                onFirstName={setFirstName}
                onLastName={setLastName}
                onRoleTitle={setRoleTitle}
                initials={initials}
                avatarUploading={avatarUploading}
                avatarError={avatarError}
                fileInputRef={fileInputRef}
                onAvatarSelected={handleAvatarSelected}
                onAvatarRemove={handleAvatarRemove}
                profileSaving={profileSaving}
                profileSaved={profileSaved}
                profileError={profileError}
                onProfileSave={handleProfileSave}
              />

              {onboarding && (
                <PlanContextSection
                  contextForm={contextForm}
                  setContextForm={setContextForm}
                  saving={contextSaving}
                  saved={contextSaved}
                  error={contextError}
                  onSave={handleContextSave}
                />
              )}

              <DataExportSection
                onDownload={handleDownloadData}
                loading={exportLoading}
                error={exportError}
              />

              <DangerZone
                confirmDelete={confirmDelete}
                setConfirmDelete={setConfirmDelete}
                deleteText={deleteText}
                setDeleteText={setDeleteText}
                deleting={deleting}
                deleteError={deleteError}
                onDelete={handleDeleteAccount}
                triggerRef={deleteTriggerRef}
                inputRef={deleteInputRef}
              />
            </div>
          )}

          {activeTab === "account" && (
            <div
              role="tabpanel"
              id={panelId("account")}
              aria-labelledby={tabId("account")}
              tabIndex={0}
              className="space-y-8 focus:outline-none"
            >
              <AccountSection
                accountForm={accountForm}
                setAccountForm={setAccountForm}
                accountSaving={accountSaving}
                accountSaved={accountSaved}
                accountError={accountError}
                onSave={handleAccountSave}
              />
              <ChangePasswordSection
                email={user?.email}
                signIn={signIn}
                addToast={addToast}
              />
              <ChangeEmailSection
                currentEmail={user?.email}
                addToast={addToast}
              />
              <SessionManagementSection addToast={addToast} />
            </div>
          )}

          {activeTab === "billing" && (
            <div
              role="tabpanel"
              id={panelId("billing")}
              aria-labelledby={tabId("billing")}
              tabIndex={0}
              className="focus:outline-none"
            >
              <BillingSection
                entitlements={entitlements}
                billingStatus={billingStatus}
                billingLoading={billingLoading}
                billingError={billingError}
                onUpgrade={handleUpgrade}
                onManage={handleManageSubscription}
                onStartTrial={handleStartTrial}
              />
            </div>
          )}

          {activeTab === "notifications" && (
            <div
              role="tabpanel"
              id={panelId("notifications")}
              aria-labelledby={tabId("notifications")}
              tabIndex={0}
              className="focus:outline-none"
            >
              <NotificationsSection
                notifications={notifications}
                setNotifications={setNotifications}
                notifSaving={notifSaving}
                notifSaved={notifSaved}
                notifError={notifError}
                onSave={handleNotifSave}
              />
            </div>
          )}

          {activeTab === "sharing" && (
            <div
              role="tabpanel"
              id={panelId("sharing")}
              aria-labelledby={tabId("sharing")}
              tabIndex={0}
              className="focus:outline-none"
            >
              <PublicSharingPanel />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- sections ---------------- */

function ProfileSection({
  user,
  onboarding,
  firstName,
  lastName,
  roleTitle,
  onFirstName,
  onLastName,
  onRoleTitle,
  initials,
  avatarUploading,
  avatarError,
  fileInputRef,
  onAvatarSelected,
  onAvatarRemove,
  profileSaving,
  profileSaved,
  profileError,
  onProfileSave,
}) {
  return (
    <section className="space-y-4">
      <SectionHeader
        title="Who you are"
        description="How your name and avatar appear across Arcora."
      />

      <SettingsCard>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onProfileSave();
          }}
        >
          <div className="p-6 space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-[#2C2825] border border-[#44403C] flex items-center justify-center text-base font-space-grotesk font-medium text-[#E7E5E4] overflow-hidden">
                  {user.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.imageUrl}
                      alt={`${displayName(user) || "User"} avatar`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>
                {avatarUploading && (
                  <div
                    className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center"
                    role="status"
                    aria-live="polite"
                  >
                    <div
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
                      aria-hidden="true"
                    />
                    <span className="sr-only">Uploading avatar…</span>
                  </div>
                )}
              </div>
              <div className="space-y-2 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarUploading}
                    className={`font-space-grotesk text-sm font-medium px-3 py-2 rounded-lg bg-[#2C2825] text-white hover:bg-[#44403C] transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 ${FOCUS_RING}`}
                  >
                    <Icon name="camera" size={14} />
                    Change avatar
                  </button>
                  {user.imageUrl && (
                    <button
                      type="button"
                      onClick={onAvatarRemove}
                      className={`font-space-grotesk text-sm text-[#A8A29E] hover:text-red-400 px-2 py-1.5 rounded transition-colors ${FOCUS_RING}`}
                    >
                      Remove
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={onAvatarSelected}
                  />
                </div>
                <p className="font-space-grotesk text-xs text-[#A8A29E]">
                  JPG, PNG, GIF, or WebP. 1MB max.
                </p>
                {avatarError && (
                  <p
                    className="font-space-grotesk text-xs text-red-400"
                    role="alert"
                  >
                    {avatarError}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="First name">
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => onFirstName(e.target.value)}
                    className={fieldInputClass}
                    placeholder="Jane"
                  />
                </Field>
                <Field label="Last name">
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => onLastName(e.target.value)}
                    className={fieldInputClass}
                    placeholder="Doe"
                  />
                </Field>
              </div>
              <Field
                label="Email address"
                hint="You can change your email in the Account tab."
              >
                <input
                  type="email"
                  value={user.email ?? ""}
                  readOnly
                  className={`${fieldInputClass} bg-[#0F0E0D] text-[#A8A29E] cursor-not-allowed`}
                />
              </Field>
              {onboarding && (
                <Field label="Role / title">
                  <input
                    type="text"
                    value={roleTitle}
                    onChange={(e) => onRoleTitle(e.target.value)}
                    className={fieldInputClass}
                    placeholder="Sr. Product Manager"
                  />
                </Field>
              )}
            </div>
          </div>

          <SaveBar
            saving={profileSaving}
            saved={profileSaved}
            error={profileError}
            onSave={onProfileSave}
          />
        </form>
      </SettingsCard>
    </section>
  );
}

function PlanContextSection({
  contextForm,
  setContextForm,
  saving,
  saved,
  error,
  onSave,
}) {
  function bind(key) {
    return (e) =>
      setContextForm((s) => ({ ...s, [key]: e.target.value }));
  }
  return (
    <section className="space-y-4">
      <SectionHeader
        title="Plan context"
        description="The intel we use when drafting or regenerating your plan. Update anytime — changes take effect the next time you regenerate."
      />

      <SettingsCard>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
        >
          <div className="p-6 space-y-5">
            <Field
              label="Role scope"
              hint="One sentence on what you're actually doing in this role."
            >
              <input
                type="text"
                value={contextForm.scope}
                onChange={bind("scope")}
                maxLength={500}
                className={fieldInputClass}
                placeholder="e.g. Leading product design for the Agent Studio team"
              />
            </Field>

            <Field label="Who do you report to?">
              <input
                type="text"
                value={contextForm.reportsTo}
                onChange={bind("reportsTo")}
                className={fieldInputClass}
                placeholder="e.g. Sarah Jenkins, VP of Product"
              />
            </Field>

            <Field
              label="What does success look like at 90 days?"
              hint="Your personal definition — not just what the company expects."
            >
              <textarea
                rows={3}
                value={contextForm.successDefinition}
                onChange={bind("successDefinition")}
                className={fieldInputClass}
                placeholder="e.g. Strong relationships with key stakeholders, a clear understanding of the roadmap, and one shipped improvement."
              />
            </Field>

            <Field
              label="Existing context"
              hint="Intel from interviews, conversations, or research."
            >
              <textarea
                rows={3}
                value={contextForm.existingContext}
                onChange={bind("existingContext")}
                className={fieldInputClass}
                placeholder="e.g. The team recently went through a reorg. Engineering is migrating to a new architecture…"
              />
            </Field>

            <Field
              label="Known challenges or risks"
              hint="Things you want to watch out for or navigate carefully."
            >
              <textarea
                rows={3}
                value={contextForm.challenges}
                onChange={bind("challenges")}
                className={fieldInputClass}
                placeholder="e.g. My predecessor left on bad terms. The team hasn't had a dedicated PM in 3 months…"
              />
            </Field>

            <Field
              label="Job description"
              hint="Paste the full JD. We'll use it for grounding research and plan drafts."
            >
              <textarea
                rows={5}
                value={contextForm.jobDescription}
                onChange={bind("jobDescription")}
                className={fieldInputClass}
                placeholder="Paste the full job description text here…"
              />
            </Field>
          </div>

          <SaveBar
            saving={saving}
            saved={saved}
            error={error}
            onSave={onSave}
          />
        </form>
      </SettingsCard>
    </section>
  );
}

function AccountSection({
  accountForm,
  setAccountForm,
  accountSaving,
  accountSaved,
  accountError,
  onSave,
}) {
  return (
    <section className="space-y-4">
      <SectionHeader
        title="How you work"
        description="Your timezone and week shape every reminder and plan day."
      />

      <SettingsCard>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
        >
          <div className="p-6 space-y-6">
            <Field
              label="Timezone"
              hint="Used to calculate your plan day and reminders."
            >
              <select
                value={accountForm.timezone}
                onChange={(e) =>
                  setAccountForm((s) => ({ ...s, timezone: e.target.value }))
                }
                className={fieldSelectClass}
              >
                {!COMMON_TIMEZONES.includes(accountForm.timezone) && (
                  <option value={accountForm.timezone}>
                    {accountForm.timezone}
                  </option>
                )}
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Week starts on">
              <select
                value={accountForm.weekStartDay}
                onChange={(e) =>
                  setAccountForm((s) => ({ ...s, weekStartDay: e.target.value }))
                }
                className={fieldSelectClass}
              >
                {WEEK_START_DAYS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <SaveBar
            saving={accountSaving}
            saved={accountSaved}
            error={accountError}
            onSave={onSave}
          />
        </form>
      </SettingsCard>
    </section>
  );
}

function ChangePasswordSection({ email, signIn, addToast }) {
  const [step, setStep] = useState("idle"); // idle | codeSent | submitting
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const reqs = passwordRequirements(newPassword, email);
  const strength = passwordStrength(newPassword, email);
  const allPassed = reqs.every((r) => r.passed);

  async function handleRequestCode() {
    setError("");
    setSending(true);
    try {
      await signIn("password", { email, flow: "reset" });
      setStep("codeSent");
      addToast("Reset code sent to your email", "success");
    } catch {
      setError("Could not send reset code. Try again.");
    } finally {
      setSending(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setError("");
    if (!allPassed) {
      const f = reqs.find((r) => !r.passed);
      setError(f?.label ?? "Password does not meet requirements.");
      return;
    }
    if (newPassword !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setStep("submitting");
    try {
      await signIn("password", {
        email,
        code: code.trim(),
        newPassword,
        flow: "reset-verification",
      });
      addToast("Password changed", "success");
      setStep("idle");
      setCode("");
      setNewPassword("");
      setConfirm("");
    } catch {
      setError("Invalid code or an error occurred. Try again.");
      setStep("codeSent");
    }
  }

  return (
    <section className="space-y-4">
      <SectionHeader
        title="Change password"
        description="We&rsquo;ll email you a verification code, then you can set a new password."
      />
      <SettingsCard>
        {step === "idle" ? (
          <div className="p-6">
            <button
              type="button"
              onClick={handleRequestCode}
              disabled={sending}
              className={`font-space-grotesk text-sm font-medium px-4 py-2.5 rounded-lg bg-[#2C2825] text-white hover:bg-[#44403C] transition-colors disabled:opacity-50 ${FOCUS_RING}`}
            >
              {sending ? "Sending code..." : "Send password reset code"}
            </button>
            {error && (
              <p className="mt-3 font-space-grotesk text-xs text-red-400" role="alert">
                {error}
              </p>
            )}
          </div>
        ) : (
          <form onSubmit={handleChangePassword}>
            <div className="p-6 space-y-4">
              {error && (
                <p className="font-space-grotesk text-xs text-red-400" role="alert">
                  {error}
                </p>
              )}
              <Field label="Verification code" hint="Check your email for an 8-digit code.">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className={`${fieldInputClass} tracking-widest`}
                  placeholder="12345678"
                  maxLength={12}
                />
              </Field>
              <Field label="New password">
                <input
                  type="password"
                  required
                  minLength={PASSWORD_MIN_LENGTH}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={fieldInputClass}
                  placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
                />
                {newPassword.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div
                      className="h-1.5 rounded-full bg-[#2C2825] overflow-hidden"
                      aria-hidden="true"
                    >
                      <div
                        className={`h-full transition-all ${
                          ({ empty: "bg-[#44403C]", weak: "bg-red-400", fair: "bg-amber-400", good: "bg-lime-500", strong: "bg-emerald-500" })[strength.level] ?? "bg-[#44403C]"
                        }`}
                        style={{ width: `${Math.round(strength.score * 100)}%` }}
                      />
                    </div>
                    <p className="font-space-grotesk text-xs text-[#A8A29E]">
                      {strength.passed}/{strength.total} requirements met
                    </p>
                  </div>
                )}
              </Field>
              <Field label="Confirm new password">
                <input
                  type="password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={fieldInputClass}
                  placeholder="Re-enter new password"
                />
                {confirm.length > 0 && confirm !== newPassword && (
                  <p className="mt-1 font-space-grotesk text-xs text-red-400">
                    Passwords do not match.
                  </p>
                )}
              </Field>
            </div>
            <div className="border-t border-[#2C2825] px-6 py-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setStep("idle");
                  setCode("");
                  setNewPassword("");
                  setConfirm("");
                  setError("");
                }}
                className={`font-space-grotesk text-sm text-[#A8A29E] hover:text-[#E7E5E4] px-3 py-2 rounded-lg transition-colors ${FOCUS_RING}`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={step === "submitting"}
                className={`font-space-grotesk text-sm font-medium px-4 py-2.5 rounded-lg bg-[#D97757] text-white hover:bg-[#C26644] transition-colors disabled:opacity-50 ${FOCUS_RING}`}
              >
                {step === "submitting" ? "Updating..." : "Update password"}
              </button>
            </div>
          </form>
        )}
      </SettingsCard>
    </section>
  );
}

function ChangeEmailSection({ currentEmail, addToast }) {
  const initiate = useMutation(api.emailChange.initiate);
  const verify = useMutation(api.emailChange.verify);
  const cancel = useMutation(api.emailChange.cancel);

  const [step, setStep] = useState("idle"); // idle | codeSent | verifying
  const [newEmail, setNewEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSendCode() {
    setError("");
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (trimmed === currentEmail) {
      setError("This is already your current email.");
      return;
    }
    setSending(true);
    try {
      await initiate({ newEmail: trimmed });
      setStep("codeSent");
      addToast("Verification code sent to new email", "success");
    } catch (err) {
      setError(err?.data ?? err?.message ?? "Could not send verification code.");
    } finally {
      setSending(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setError("");
    setStep("verifying");
    try {
      await verify({ code: code.trim() });
      addToast("Email address updated", "success");
      setStep("idle");
      setNewEmail("");
      setCode("");
    } catch (err) {
      setError(err?.data ?? err?.message ?? "Verification failed.");
      setStep("codeSent");
    }
  }

  async function handleCancel() {
    await cancel().catch(() => {});
    setStep("idle");
    setNewEmail("");
    setCode("");
    setError("");
  }

  return (
    <section className="space-y-4">
      <SectionHeader
        title="Change email"
        description="Update the email address associated with your account."
      />
      <SettingsCard>
        {step === "idle" ? (
          <div className="p-6 space-y-4">
            <Field label="New email address">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className={fieldInputClass}
                placeholder="newemail@company.com"
              />
            </Field>
            {error && (
              <p className="font-space-grotesk text-xs text-red-400" role="alert">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={handleSendCode}
              disabled={sending || !newEmail.trim()}
              className={`font-space-grotesk text-sm font-medium px-4 py-2.5 rounded-lg bg-[#2C2825] text-white hover:bg-[#44403C] transition-colors disabled:opacity-50 ${FOCUS_RING}`}
            >
              {sending ? "Sending code..." : "Send verification code"}
            </button>
          </div>
        ) : (
          <form onSubmit={handleVerify}>
            <div className="p-6 space-y-4">
              <p className="font-space-grotesk text-sm text-[#A8A29E]">
                We sent a verification code to{" "}
                <span className="text-[#E7E5E4]">{newEmail.trim().toLowerCase()}</span>.
                Enter it below to confirm the change.
              </p>
              {error && (
                <p className="font-space-grotesk text-xs text-red-400" role="alert">
                  {error}
                </p>
              )}
              <Field label="Verification code" hint="Check your new email for an 8-digit code.">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className={`${fieldInputClass} tracking-widest`}
                  placeholder="12345678"
                  maxLength={12}
                />
              </Field>
            </div>
            <div className="border-t border-[#2C2825] px-6 py-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className={`font-space-grotesk text-sm text-[#A8A29E] hover:text-[#E7E5E4] px-3 py-2 rounded-lg transition-colors ${FOCUS_RING}`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={step === "verifying"}
                className={`font-space-grotesk text-sm font-medium px-4 py-2.5 rounded-lg bg-[#D97757] text-white hover:bg-[#C26644] transition-colors disabled:opacity-50 ${FOCUS_RING}`}
              >
                {step === "verifying" ? "Verifying..." : "Confirm email change"}
              </button>
            </div>
          </form>
        )}
      </SettingsCard>
    </section>
  );
}

function SessionManagementSection({ addToast }) {
  const sessions = useQuery(api.sessions.list);
  const revokeSession = useMutation(api.sessions.revoke);
  const revokeAllOther = useMutation(api.sessions.revokeAllOther);
  const [revoking, setRevoking] = useState(null);
  const [revokingAll, setRevokingAll] = useState(false);

  const otherSessions = (sessions ?? []).filter((s) => !s.isCurrent);

  async function handleRevoke(sessionId) {
    setRevoking(sessionId);
    try {
      await revokeSession({ sessionId });
      addToast("Session revoked", "success");
    } catch (err) {
      addToast(err?.data ?? "Could not revoke session", "error");
    } finally {
      setRevoking(null);
    }
  }

  async function handleRevokeAll() {
    setRevokingAll(true);
    try {
      const result = await revokeAllOther();
      addToast(`${result.revoked} session${result.revoked === 1 ? "" : "s"} revoked`, "success");
    } catch (err) {
      addToast(err?.data ?? "Could not revoke sessions", "error");
    } finally {
      setRevokingAll(false);
    }
  }

  function formatSessionDate(ms) {
    try {
      return new Date(ms).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Unknown";
    }
  }

  return (
    <section className="space-y-4">
      <SectionHeader
        title="Active sessions"
        description="Devices and browsers where you&rsquo;re currently signed in."
      />
      <SettingsCard>
        <div className="p-6 space-y-4">
          {sessions === undefined ? (
            <p className="font-space-grotesk text-sm text-[#A8A29E]">
              Loading sessions...
            </p>
          ) : sessions.length === 0 ? (
            <p className="font-space-grotesk text-sm text-[#A8A29E]">
              No active sessions found.
            </p>
          ) : (
            <>
              <ul className="divide-y divide-[#2C2825]">
                {sessions.map((session) => (
                  <li
                    key={session._id}
                    className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="font-space-grotesk text-sm text-[#E7E5E4] flex items-center gap-2">
                        {session.isCurrent ? "This session" : "Other session"}
                        {session.isCurrent && (
                          <span className="font-space-grotesk text-xs uppercase tracking-wide text-emerald-400 border border-emerald-700/40 rounded px-1.5 py-0.5">
                            current
                          </span>
                        )}
                      </p>
                      <p className="font-space-grotesk text-xs text-[#A8A29E] mt-0.5">
                        Created {formatSessionDate(session._creationTime)}
                      </p>
                    </div>
                    {!session.isCurrent && (
                      <button
                        type="button"
                        onClick={() => handleRevoke(session._id)}
                        disabled={revoking === session._id}
                        className={`shrink-0 font-space-grotesk text-xs font-medium px-3 py-1.5 rounded-lg bg-red-900/20 text-red-400 border border-red-900/50 hover:bg-red-900/40 transition-colors disabled:opacity-50 ${FOCUS_RING}`}
                      >
                        {revoking === session._id ? "Revoking..." : "Revoke"}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              {otherSessions.length > 0 && (
                <div className="pt-3 border-t border-[#2C2825]">
                  <button
                    type="button"
                    onClick={handleRevokeAll}
                    disabled={revokingAll}
                    className={`font-space-grotesk text-sm font-medium px-4 py-2.5 rounded-lg bg-red-900/20 text-red-400 border border-red-900/50 hover:bg-red-900/40 transition-colors disabled:opacity-50 ${FOCUS_RING}`}
                  >
                    {revokingAll
                      ? "Revoking all..."
                      : `Sign out all other sessions (${otherSessions.length})`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </SettingsCard>
    </section>
  );
}

function formatDate(ms) {
  if (!ms) return null;
  try {
    return new Date(ms).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return null;
  }
}

function BillingSection({
  entitlements,
  billingStatus,
  billingLoading,
  billingError,
  onUpgrade,
  onManage,
  onStartTrial,
}) {
  const loading = entitlements === undefined;
  const tier = entitlements?.tier ?? "free";
  const status = entitlements?.status ?? null;
  const trialDaysLeft = entitlements?.trialDaysLeft ?? 0;
  const cancelAtPeriodEnd = entitlements?.cancelAtPeriodEnd ?? false;
  const currentPeriodEnd = entitlements?.currentPeriodEnd ?? null;
  const dailyEnrichCap = entitlements?.dailyEnrichCap ?? 5;
  const usedToday = entitlements?.usedToday ?? 0;
  const localTrialActive = entitlements?.localTrialActive ?? false;
  const localTrialEndsAt = entitlements?.localTrialEndsAt ?? null;
  const localTrialUsed = entitlements?.localTrialUsed ?? false;

  const isLegacy = tier === "pro_legacy";
  const isPro = tier !== "free";
  const isTrialing = status === "trialing";

  return (
    <section className="space-y-4">
      <SectionHeader
        title="Your plan"
        description="Manage your subscription, trial, and daily AI budget."
      />

      {billingStatus === "success" && (
        <div
          role="status"
          className="font-space-grotesk text-sm rounded-lg border border-emerald-700/40 bg-emerald-950/40 text-emerald-200 px-4 py-3"
        >
          Payment successful. Your subscription is being activated — refresh in a
          few seconds if the status doesn&apos;t update immediately.
        </div>
      )}
      {billingStatus === "cancel" && (
        <div
          role="status"
          className="font-space-grotesk text-sm rounded-lg border border-[#2C2825] bg-[#1C1917] text-[#A8A29E] px-4 py-3"
        >
          Checkout canceled. You can come back to this page any time to upgrade.
        </div>
      )}

      <SettingsCard>
        <div className="p-6 space-y-6">
          {loading ? (
            <p className="font-space-grotesk text-sm text-[#A8A29E]">
              Loading your plan…
            </p>
          ) : (
            <>
              <PlanSummary
                tier={tier}
                status={status}
                isLegacy={isLegacy}
                isTrialing={isTrialing}
                trialDaysLeft={trialDaysLeft}
                cancelAtPeriodEnd={cancelAtPeriodEnd}
                currentPeriodEnd={currentPeriodEnd}
                localTrialActive={localTrialActive}
                localTrialEndsAt={localTrialEndsAt}
                localTrialUsed={localTrialUsed}
              />

              <UsageBar
                usedToday={usedToday}
                cap={dailyEnrichCap}
                isPro={isPro}
              />

              {billingError && (
                <p
                  className="font-space-grotesk text-xs text-red-400"
                  role="alert"
                >
                  {billingError}
                </p>
              )}

              <BillingActions
                tier={tier}
                isLegacy={isLegacy}
                isPro={isPro}
                billingLoading={billingLoading}
                onUpgrade={onUpgrade}
                onManage={onManage}
                onStartTrial={onStartTrial}
                localTrialActive={localTrialActive}
                localTrialUsed={localTrialUsed}
                trialDaysLeft={trialDaysLeft}
              />
            </>
          )}
        </div>
      </SettingsCard>
    </section>
  );
}

function PlanSummary({
  tier,
  status,
  isLegacy,
  isTrialing,
  trialDaysLeft,
  cancelAtPeriodEnd,
  currentPeriodEnd,
  localTrialActive,
  localTrialEndsAt,
  localTrialUsed,
}) {
  if (isLegacy) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="font-instrument-serif text-xl text-white">
            Early access
          </span>
          <span className="font-space-grotesk text-xs uppercase tracking-wide text-[#D97757] border border-[#D97757]/40 rounded px-1.5 py-0.5">
            lifetime
          </span>
        </div>
        <p className="font-space-grotesk text-sm text-[#A8A29E]">
          Thanks for being here from the start. You have Pro-level access
          permanently, no subscription needed.
        </p>
      </div>
    );
  }

  if (localTrialActive) {
    const endDate = formatDate(localTrialEndsAt);
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="font-instrument-serif text-xl text-white">
            Pro trial
          </span>
          <span className="font-space-grotesk text-xs uppercase tracking-wide text-[#D97757] border border-[#D97757]/40 rounded px-1.5 py-0.5">
            {trialDaysLeft === 1 ? "1 day left" : `${trialDaysLeft} days left`}
          </span>
        </div>
        <p className="font-space-grotesk text-sm text-[#A8A29E]">
          You&apos;re trialing Pro free until {endDate ?? "the trial ends"}. No
          card on file — add one below to keep Pro after the trial.
        </p>
      </div>
    );
  }

  if (isTrialing) {
    const endDate = formatDate(currentPeriodEnd);
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="font-instrument-serif text-xl text-white">
            Pro trial
          </span>
          <span className="font-space-grotesk text-xs uppercase tracking-wide text-[#D97757] border border-[#D97757]/40 rounded px-1.5 py-0.5">
            {trialDaysLeft === 1 ? "1 day left" : `${trialDaysLeft} days left`}
          </span>
        </div>
        <p className="font-space-grotesk text-sm text-[#A8A29E]">
          Your card will be charged {endDate ? `on ${endDate}` : "at the end of trial"}
          {" "}unless you cancel via Manage subscription.
        </p>
      </div>
    );
  }

  if (status === "active") {
    const endDate = formatDate(currentPeriodEnd);
    if (cancelAtPeriodEnd) {
      return (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-instrument-serif text-xl text-white">
              Pro
            </span>
            <span className="font-space-grotesk text-xs uppercase tracking-wide text-[#A8A29E] border border-[#44403C] rounded px-1.5 py-0.5">
              ending
            </span>
          </div>
          <p className="font-space-grotesk text-sm text-[#A8A29E]">
            Your subscription ends {endDate ? `on ${endDate}` : "at the end of this period"}
            , then switches to Free. Use Manage subscription to reactivate.
          </p>
        </div>
      );
    }
    return (
      <div className="space-y-1.5">
        <span className="font-instrument-serif text-xl text-white">Pro</span>
        <p className="font-space-grotesk text-sm text-[#A8A29E]">
          {endDate ? `Renews on ${endDate}.` : "Active subscription."}
        </p>
      </div>
    );
  }

  if (status === "past_due") {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="font-instrument-serif text-xl text-white">Pro</span>
          <span className="font-space-grotesk text-xs uppercase tracking-wide text-amber-300 border border-amber-700/40 rounded px-1.5 py-0.5">
            payment failed
          </span>
        </div>
        <p className="font-space-grotesk text-sm text-[#A8A29E]">
          Your most recent charge failed. Update your payment method via Manage
          subscription to stay on Pro.
        </p>
      </div>
    );
  }

  // Free
  if (localTrialUsed) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="font-instrument-serif text-xl text-white">Free</span>
          <span className="font-space-grotesk text-xs uppercase tracking-wide text-[#A8A29E] border border-[#44403C] rounded px-1.5 py-0.5">
            trial ended
          </span>
        </div>
        <p className="font-space-grotesk text-sm text-[#A8A29E]">
          Your free trial has ended. Subscribe to keep Pro features and your
          higher daily AI extraction limits.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <span className="font-instrument-serif text-xl text-white">Free</span>
      <p className="font-space-grotesk text-sm text-[#A8A29E]">
        Try Pro free for 7 days — no credit card required. Higher daily AI
        extraction limits and unlimited plan regeneration.
      </p>
    </div>
  );
}

function UsageBar({ usedToday, cap, isPro }) {
  const pct = cap > 0 ? Math.min(100, Math.round((usedToday / cap) * 100)) : 0;
  const atCap = usedToday >= cap;
  return (
    <div className="space-y-2 pt-4 border-t border-[#2C2825]">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-space-grotesk text-xs uppercase tracking-wide text-[#A8A29E]">
          AI extractions today
        </span>
        <span
          className={`font-space-grotesk text-xs ${
            atCap ? "text-amber-300" : "text-[#A8A29E]"
          }`}
        >
          {usedToday} / {cap}
        </span>
      </div>
      <div
        className="h-1.5 rounded-full bg-[#2C2825] overflow-hidden"
        aria-hidden="true"
      >
        <div
          className={`h-full transition-all ${
            atCap ? "bg-amber-400/70" : "bg-[#D97757]"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {atCap && !isPro && (
        <p className="font-space-grotesk text-xs text-amber-300">
          You&apos;ve hit today&apos;s limit. Upgrade for higher caps, or come
          back tomorrow.
        </p>
      )}
    </div>
  );
}

function BillingActions({
  tier,
  isLegacy,
  isPro,
  billingLoading,
  onUpgrade,
  onManage,
  onStartTrial,
  localTrialActive,
  localTrialUsed,
  trialDaysLeft,
}) {
  if (isLegacy) {
    return null; // Nothing to manage
  }

  if (isPro && !localTrialActive) {
    // Paid Pro (or Pro from a Stripe-managed trial) — manage via portal.
    return (
      <div className="pt-2">
        <button
          type="button"
          onClick={onManage}
          disabled={billingLoading !== null}
          className={`font-space-grotesk text-sm font-medium px-4 py-2.5 rounded-lg bg-[#D97757] text-white hover:bg-[#C26644] transition-colors disabled:opacity-50 ${FOCUS_RING}`}
        >
          {billingLoading === "portal" ? "Opening…" : "Manage subscription"}
        </button>
      </div>
    );
  }

  // Either local-trial-active OR free (with or without prior trial use).
  // Both states show the same upgrade buttons; trial users see a "keep Pro"
  // header, post-trial users see a "subscribe" header. Free-fresh users get
  // a Start-trial CTA above the upgrade buttons.
  const showStartTrial = !isPro && !localTrialUsed && !localTrialActive;
  const headerCopy = localTrialActive
    ? trialDaysLeft <= 1
      ? "Your trial ends today. Subscribe to keep Pro:"
      : `Your trial ends in ${trialDaysLeft} days. Subscribe to keep Pro:`
    : localTrialUsed
      ? "Subscribe to Pro:"
      : "Already had your free trial? Subscribe to Pro:";

  return (
    <div className="pt-2 space-y-3">
      {showStartTrial && (
        <div className="rounded-lg border border-[#D97757]/30 bg-[#D97757]/5 p-4 space-y-3">
          <div className="space-y-1">
            <p className="font-space-grotesk text-sm font-medium text-white">
              Try Pro free for 7 days
            </p>
            <p className="font-space-grotesk text-xs text-[#A8A29E]">
              No credit card required. Get 100 daily AI extractions, unlimited
              plan regeneration, and priority processing.
            </p>
          </div>
          <button
            type="button"
            onClick={onStartTrial}
            disabled={billingLoading !== null}
            className={`font-space-grotesk text-sm font-medium px-4 py-2.5 rounded-lg bg-[#D97757] text-white hover:bg-[#C26644] transition-colors disabled:opacity-50 ${FOCUS_RING}`}
          >
            {billingLoading === "trial" ? "Starting…" : "Start 7-day free trial"}
          </button>
        </div>
      )}

      <div className="space-y-2">
        <p className="font-space-grotesk text-xs text-[#A8A29E]">
          {headerCopy}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onUpgrade("monthly")}
            disabled={billingLoading !== null}
            className={`font-space-grotesk text-sm font-medium px-4 py-3 rounded-lg border border-[#44403C] bg-[#1C1917] text-white hover:bg-[#2C2825] transition-colors disabled:opacity-50 ${FOCUS_RING}`}
          >
            {billingLoading === "monthly" ? "Loading…" : "Pro monthly · $29/mo"}
          </button>
          <button
            type="button"
            onClick={() => onUpgrade("annual")}
            disabled={billingLoading !== null}
            className={`font-space-grotesk text-sm font-medium px-4 py-3 rounded-lg bg-[#D97757] text-white hover:bg-[#C26644] transition-colors disabled:opacity-50 ${FOCUS_RING}`}
          >
            {billingLoading === "annual" ? "Loading…" : "Pro annual · $23/mo"}
          </button>
        </div>
        <p className="font-space-grotesk text-[11px] text-[#78716C]">
          Cancel any time from Manage subscription.
        </p>
      </div>
    </div>
  );
}

function NotificationsSection({
  notifications,
  setNotifications,
  notifSaving,
  notifSaved,
  notifError,
  onSave,
}) {
  const emailOff = !notifications.emailNotifications;
  return (
    <section className="space-y-4">
      <SectionHeader
        title="What we send you"
        description="Pick the moments where Arcora should reach out."
      />

      <SettingsCard>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
        >
          <div className="p-6 space-y-4">
            <ToggleRow
              title="Email notifications"
              description="Master switch for everything Arcora sends to your inbox."
              checked={notifications.emailNotifications}
              onChange={(v) =>
                setNotifications((s) => ({ ...s, emailNotifications: v }))
              }
            />
            <Divider />
            <ToggleRow
              title="Daily digest"
              description="A morning summary of today's tasks and scheduled syncs."
              checked={notifications.dailyDigest}
              onChange={(v) => setNotifications((s) => ({ ...s, dailyDigest: v }))}
              disabled={emailOff}
            />
            <Divider />
            <ToggleRow
              title="Stakeholder updates"
              description="Heads-up when team structure or key contacts change."
              checked={notifications.stakeholderUpdates}
              onChange={(v) =>
                setNotifications((s) => ({ ...s, stakeholderUpdates: v }))
              }
              disabled={emailOff}
            />
            <Divider />
            <ToggleRow
              title="Milestone reminders"
              description="Alerts for upcoming 30, 60, and 90 day reviews."
              checked={notifications.milestoneReminders}
              onChange={(v) =>
                setNotifications((s) => ({ ...s, milestoneReminders: v }))
              }
              disabled={emailOff}
            />
          </div>

          <div
            className={`border-t border-[#2C2825] p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 ${
              emailOff ? "opacity-50" : ""
            }`}
          >
            <Field label="Daily reminder time">
              <input
                type="time"
                value={notifications.dailyReminderTime}
                onChange={(e) =>
                  setNotifications((s) => ({
                    ...s,
                    dailyReminderTime: e.target.value,
                  }))
                }
                disabled={emailOff}
                className={fieldInputClass}
              />
            </Field>
            <Field label="Reflection reminder time">
              <input
                type="time"
                value={notifications.reflectionReminderTime}
                onChange={(e) =>
                  setNotifications((s) => ({
                    ...s,
                    reflectionReminderTime: e.target.value,
                  }))
                }
                disabled={emailOff}
                className={fieldInputClass}
              />
            </Field>
          </div>

          <SaveBar
            saving={notifSaving}
            saved={notifSaved}
            error={notifError}
            onSave={onSave}
          />
        </form>
      </SettingsCard>
    </section>
  );
}

function Divider() {
  return <div className="w-full h-px bg-[#2C2825]" aria-hidden="true" />;
}

function DataExportSection({ onDownload, loading, error }) {
  return (
    <section className="space-y-4 mt-12">
      <div className="flex items-center gap-2 text-[#A8A29E]">
        <Icon name="user" size={16} />
        <h2 className="font-space-grotesk text-base font-medium tracking-tight text-white">
          Your data
        </h2>
      </div>
      <div className="border-t border-[#292524] pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="font-space-grotesk text-sm font-medium text-white">
            Download a copy of your data
          </p>
          <p className="font-space-grotesk text-xs text-[#A8A29E] mt-1 max-w-md">
            Exports a JSON file containing your profile, plans, tasks,
            reflections, stakeholders, knowledge base, and settings. UK GDPR
            Article 20.
          </p>
          {error ? (
            <p
              className="font-space-grotesk text-xs text-red-400 mt-2"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onDownload}
          disabled={loading}
          className={`shrink-0 font-space-grotesk text-sm font-medium px-4 py-2.5 rounded-lg bg-[#1C1917] text-[#E7E5E4] border border-[#292524] hover:border-[#44403C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${FOCUS_RING}`}
        >
          {loading ? "Preparing…" : "Download my data"}
        </button>
      </div>
    </section>
  );
}

function DangerZone({
  confirmDelete,
  setConfirmDelete,
  deleteText,
  setDeleteText,
  deleting,
  deleteError,
  onDelete,
  triggerRef,
  inputRef,
}) {
  return (
    <section className="space-y-4 mt-16">
      <div className="flex items-center gap-2 text-red-400">
        <Icon name="alert" size={16} />
        <h2 className="font-space-grotesk text-base font-medium tracking-tight">
          Danger zone
        </h2>
      </div>

      <div className="border-t border-red-900/30 pt-6">
        {!confirmDelete ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-space-grotesk text-sm font-medium text-white">
                Delete account
              </p>
              <p className="font-space-grotesk text-xs text-[#A8A29E] mt-1 max-w-sm">
                Permanently remove your account, 90-day plan, stakeholders, and
                all related data. This cannot be undone.
              </p>
            </div>
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setConfirmDelete(true)}
              className={`shrink-0 font-space-grotesk text-sm font-medium px-4 py-2.5 rounded-lg bg-red-900/20 text-red-400 border border-red-900/50 hover:bg-red-900/40 transition-colors ${FOCUS_RING}`}
            >
              Delete account
            </button>
          </div>
        ) : (
          <div
            className="space-y-4"
            role="alertdialog"
            aria-labelledby="delete-confirm-title"
            aria-describedby="delete-confirm-desc"
          >
            <div>
              <p
                id="delete-confirm-title"
                className="font-space-grotesk text-sm font-medium text-white"
              >
                Are you absolutely sure?
              </p>
              <p
                id="delete-confirm-desc"
                className="font-space-grotesk text-xs text-[#A8A29E] mt-1"
              >
                This will permanently delete your account and every plan day,
                stakeholder, reflection, and note. Type{" "}
                <span className="font-mono text-red-400">delete</span> below to
                confirm.
              </p>
            </div>
            <input
              ref={inputRef}
              type="text"
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder="delete"
              aria-label="Type the word delete to confirm"
              className={`w-full bg-transparent border border-red-900/40 rounded-lg px-3 py-2.5 font-space-grotesk text-sm text-[#E7E5E4] focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors placeholder-[#57534E] ${FOCUS_RING}`}
            />
            {deleteError && (
              <p
                className="font-space-grotesk text-xs text-red-400"
                role="alert"
              >
                {deleteError}
              </p>
            )}
            <div className="flex items-center gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setConfirmDelete(false);
                  setDeleteText("");
                }}
                disabled={deleting}
                className={`font-space-grotesk text-sm text-[#A8A29E] hover:text-[#E7E5E4] px-3 py-2.5 rounded-lg transition-colors ${FOCUS_RING}`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting || deleteText !== "delete"}
                className={`font-space-grotesk text-sm font-medium px-4 py-2.5 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${FOCUS_RING}`}
              >
                {deleting ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
