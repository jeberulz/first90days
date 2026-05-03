"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { ResponsiveModal } from "@/components/primitives";
import { CategoryChip } from "@/components/app/TaskCard";
import { cn } from "@/lib/utils";

function ActionButton({ icon, label, onClick, variant = "default", disabled }) {
  const base =
    "flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl font-space-grotesk text-sm transition-colors min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 disabled:cursor-not-allowed";
  const styles =
    variant === "primary"
      ? "bg-accent text-white hover:bg-accent-hover"
      : variant === "danger"
        ? "bg-warm-surfaceDark text-warm-line hover:bg-warm-borderMuted"
        : "bg-warm-surfaceDark text-warm-line hover:bg-warm-borderMuted";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(base, styles)}
    >
      <Icon icon={icon} className="w-4 h-4" aria-hidden />
      {label}
    </button>
  );
}

export default function TaskDetailSheet({
  activity,
  open,
  onClose,
  onComplete,
  onSkip,
  onReschedule,
}) {
  const [showReschedule, setShowReschedule] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [completionNote, setCompletionNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reset draft state whenever the selected task changes (or the sheet
  // closes), so task B never opens with task A's note text or reschedule
  // mode still active.
  useEffect(() => {
    setShowReschedule(false);
    setNewDate("");
    setCompletionNote("");
    setShowNote(false);
    setSubmitting(false);
  }, [activity?._id, open]);

  if (!activity) return null;

  const isDone = activity.status === "completed";
  const isSkipped = activity.status === "skipped";

  async function handleComplete() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onComplete?.(activity, completionNote.trim() || undefined);
      // Only clear and close on success — preserve the note on failure
      // so the user can retry without re-typing.
      setCompletionNote("");
      setShowNote(false);
      onClose?.();
    } catch {
      // Parent already toasted the error; keep the sheet + draft open.
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSkip() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSkip?.(activity);
      onClose?.();
    } catch {
      // Parent toasted; leave sheet open.
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReschedule() {
    if (!newDate || submitting) return;
    setSubmitting(true);
    try {
      await onReschedule?.(activity, newDate);
      setNewDate("");
      setShowReschedule(false);
      onClose?.();
    } catch {
      // Parent toasted; preserve the chosen date so the user can retry.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ResponsiveModal
      open={open}
      onClose={onClose}
      title={activity.title}
      placement="bottom-sheet"
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryChip category={activity.category} size="md" />
          <span className="font-space-grotesk text-xs text-warm-300">
            Week {activity.weekNumber}
          </span>
          {activity.estimatedTime && (
            <>
              <span
                aria-hidden
                className="w-1 h-1 rounded-full bg-warm-borderMuted"
              />
              <span className="font-space-grotesk text-xs text-warm-300">
                {activity.estimatedTime}
              </span>
            </>
          )}
          {activity.priority && (
            <>
              <span
                aria-hidden
                className="w-1 h-1 rounded-full bg-warm-borderMuted"
              />
              <span className="font-space-grotesk text-xs text-warm-300 capitalize">
                {activity.priority} priority
              </span>
            </>
          )}
        </div>

        {activity.description && (
          <p className="font-space-grotesk text-sm leading-relaxed text-warm-line/90">
            {activity.description}
          </p>
        )}

        {showNote && !isDone && (
          <label className="block">
            <span className="t-meta text-warm-300">Completion note</span>
            <textarea
              data-autofocus
              value={completionNote}
              onChange={(e) => setCompletionNote(e.target.value)}
              rows={3}
              placeholder="What did you learn or ship?"
              className="mt-1.5 block w-full rounded-xl bg-warm-surfaceDark border border-warm-borderDark px-3 py-2 font-space-grotesk text-sm text-warm-line placeholder:text-warm-300 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </label>
        )}

        {showReschedule && !isDone && !isSkipped && (
          <div className="space-y-2">
            <label className="block">
              <span className="t-meta text-warm-300">New date</span>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="mt-1.5 block w-full rounded-xl bg-warm-surfaceDark border border-warm-borderDark px-3 py-2.5 font-space-grotesk text-sm text-warm-line focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </label>
            <div className="flex gap-2">
              <ActionButton
                icon="solar:check-read-linear"
                label="Confirm"
                onClick={handleReschedule}
                variant="primary"
                disabled={!newDate || submitting}
              />
              <ActionButton
                icon="solar:close-circle-linear"
                label="Cancel"
                onClick={() => {
                  setShowReschedule(false);
                  setNewDate("");
                }}
                disabled={submitting}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {!isDone && !isSkipped && !showReschedule && (
            <>
              <ActionButton
                icon="solar:check-read-linear"
                label={showNote ? "Save & complete" : "Complete"}
                onClick={handleComplete}
                variant="primary"
                disabled={submitting}
              />
              {!showNote && (
                <ActionButton
                  icon="solar:notes-linear"
                  label="Add note"
                  onClick={() => setShowNote(true)}
                  disabled={submitting}
                />
              )}
              <ActionButton
                icon="solar:calendar-linear"
                label="Reschedule"
                onClick={() => setShowReschedule(true)}
                disabled={submitting}
              />
              <ActionButton
                icon="solar:close-circle-linear"
                label="Skip"
                onClick={handleSkip}
                disabled={submitting}
              />
            </>
          )}
          {isDone && activity.completedAt && (
            <p className="sm:col-span-2 font-space-grotesk text-sm text-warm-300">
              Completed{" "}
              {new Date(activity.completedAt).toLocaleString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
              {activity.completionNotes && (
                <span className="block mt-2 text-warm-line/90 italic">
                  &ldquo;{activity.completionNotes}&rdquo;
                </span>
              )}
            </p>
          )}
          {isSkipped && (
            <p className="sm:col-span-2 font-space-grotesk text-sm text-warm-300">
              Marked as skipped.
              {activity.skipReason && (
                <span className="block mt-1 text-warm-line/90 italic">
                  &ldquo;{activity.skipReason}&rdquo;
                </span>
              )}
            </p>
          )}
        </div>
      </div>
    </ResponsiveModal>
  );
}
