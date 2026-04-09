"use client";

import { useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../../convex/_generated/api";
import { useState, useEffect } from "react";

export default function SettingsPage() {
  const user = useQuery(api.users.viewer);
  const onboarding = useQuery(api.onboarding.get);
  const updateSettings = useMutation(api.users.updateSettings);
  const { signOut } = useAuthActions();

  const [settings, setSettings] = useState({
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    dailyReminderTime: "08:00",
    reflectionReminderTime: "18:00",
    weekStartDay: "Monday",
    emailNotifications: true,
    pushNotifications: false,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user?.settings) {
      setSettings((prev) => ({ ...prev, ...user.settings }));
    }
  }, [user]);

  async function handleSave() {
    await updateSettings({ settings });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="font-instrument-serif text-4xl tracking-[-0.9px] leading-[40px]">
        Settings
      </h1>

      {/* Profile */}
      <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-6 space-y-4">
        <h2 className="font-space-grotesk text-sm font-medium text-[#A8A29E]">
          Profile
        </h2>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#D97757] to-[#C26242] flex items-center justify-center">
            <span className="text-white text-lg font-medium font-space-grotesk">
              {user.name
                ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
                : "?"}
            </span>
          </div>
          <div>
            <p className="font-space-grotesk text-base font-medium text-[#E7E5E4]">
              {user.name || "—"}
            </p>
            <p className="font-space-grotesk text-sm text-[#A8A29E]">
              {user.email || "—"}
            </p>
          </div>
        </div>
        {onboarding && (
          <div className="pt-3 border-t border-[#2C2825] grid grid-cols-2 gap-3">
            <div>
              <p className="font-space-grotesk text-xs text-[#A8A29E]">Role</p>
              <p className="font-space-grotesk text-sm text-[#E7E5E4]">{onboarding.roleTitle}</p>
            </div>
            <div>
              <p className="font-space-grotesk text-xs text-[#A8A29E]">Company</p>
              <p className="font-space-grotesk text-sm text-[#E7E5E4]">{onboarding.companyName}</p>
            </div>
            <div>
              <p className="font-space-grotesk text-xs text-[#A8A29E]">Start Date</p>
              <p className="font-space-grotesk text-sm text-[#E7E5E4]">{onboarding.startDate}</p>
            </div>
            <div>
              <p className="font-space-grotesk text-xs text-[#A8A29E]">Situation</p>
              <p className="font-space-grotesk text-sm text-[#E7E5E4]">{onboarding.starsSituation}</p>
            </div>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-6 space-y-4">
        <h2 className="font-space-grotesk text-sm font-medium text-[#A8A29E]">
          Notifications
        </h2>
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span className="font-space-grotesk text-sm text-[#E7E5E4]">
              Email notifications
            </span>
            <button
              onClick={() =>
                setSettings((s) => ({
                  ...s,
                  emailNotifications: !s.emailNotifications,
                }))
              }
              className={`relative w-11 h-6 rounded-full transition ${
                settings.emailNotifications ? "bg-[#D97757]" : "bg-[#292524]"
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.emailNotifications ? "translate-x-5.5 left-0.5" : "left-0.5"
                }`}
                style={{ transform: settings.emailNotifications ? "translateX(22px)" : "translateX(0)" }}
              />
            </button>
          </label>
          <div>
            <label className="font-space-grotesk text-xs text-[#A8A29E] block mb-1.5">
              Daily reminder time
            </label>
            <input
              type="time"
              value={settings.dailyReminderTime}
              onChange={(e) =>
                setSettings((s) => ({ ...s, dailyReminderTime: e.target.value }))
              }
              className="bg-[#292524] border border-[#44403C] rounded-lg px-3 py-2 font-space-grotesk text-sm text-[#E7E5E4] focus:outline-none focus:ring-1 focus:ring-[#D97757]"
            />
          </div>
          <div>
            <label className="font-space-grotesk text-xs text-[#A8A29E] block mb-1.5">
              Reflection reminder time
            </label>
            <input
              type="time"
              value={settings.reflectionReminderTime}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  reflectionReminderTime: e.target.value,
                }))
              }
              className="bg-[#292524] border border-[#44403C] rounded-lg px-3 py-2 font-space-grotesk text-sm text-[#E7E5E4] focus:outline-none focus:ring-1 focus:ring-[#D97757]"
            />
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          className="bg-[#D97757] hover:bg-[#C26242] text-white rounded-lg px-6 py-2.5 font-space-grotesk text-sm font-medium transition shadow-sm"
        >
          Save settings
        </button>
        {saved && (
          <span className="font-space-grotesk text-sm text-green-400">
            Saved!
          </span>
        )}
      </div>

      {/* Danger zone */}
      <div className="bg-[#1C1917] border border-red-900/30 rounded-xl p-6 space-y-3">
        <h2 className="font-space-grotesk text-sm font-medium text-red-400">
          Account
        </h2>
        <button
          onClick={() => signOut()}
          className="border border-[#44403C] text-[#A8A29E] hover:text-[#E7E5E4] rounded-lg px-4 py-2 font-space-grotesk text-sm transition"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
