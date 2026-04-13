"use client";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97757]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1C1917]";

function CheckIcon() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

export default function SaveBar({
  saving,
  saved,
  error,
  onSave,
  saveLabel = "Save Changes",
}) {
  return (
    <div className="border-t border-[#2C2825] flex items-center justify-between gap-3 px-6 py-4">
      <div className="font-space-grotesk text-xs min-h-[1rem]" aria-live="polite">
        {error && <span className="text-red-400">{error}</span>}
        {saved && !error && (
          <span className="text-green-400 inline-flex items-center gap-1">
            <CheckIcon />
            Saved
          </span>
        )}
      </div>
      <button
        type="submit"
        onClick={onSave}
        disabled={saving}
        className={`bg-[#D97757] hover:bg-[#C26242] text-white px-4 py-2.5 rounded-lg font-space-grotesk text-sm font-medium transition disabled:opacity-60 ${FOCUS_RING}`}
      >
        {saving ? "Saving..." : saveLabel}
      </button>
    </div>
  );
}
