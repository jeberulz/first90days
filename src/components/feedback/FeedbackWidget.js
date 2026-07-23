"use client";

import { createContext, useCallback, useContext, useState, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

const COOLDOWN_KEY = "feedback_last_submitted_at";
const COOLDOWN_DAYS = 30;

function isCooledDown() {
  try {
    const stored = localStorage.getItem(COOLDOWN_KEY);
    if (!stored) return true;
    const lastAt = parseInt(stored, 10);
    const diffDays = (Date.now() - lastAt) / (1000 * 60 * 60 * 24);
    return diffDays >= COOLDOWN_DAYS;
  } catch {
    return true;
  }
}

function markSubmitted() {
  try {
    localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
  } catch {}
}

// ── Feedback context ─────────────────────────────────────────────────────────

const FeedbackContext = createContext(null);

export function useFeedback() {
  return useContext(FeedbackContext);
}

// ── Star rating ───────────────────────────────────────────────────────────────

function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Star rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n !== 1 ? "s" : ""}`}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="w-8 h-8 flex items-center justify-center transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D97757] rounded"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill={(hovered || value) >= n ? "#D97757" : "none"}
            stroke={(hovered || value) >= n ? "#D97757" : "#57534E"}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      ))}
    </div>
  );
}

// ── Feedback modal ────────────────────────────────────────────────────────────

function FeedbackModal({ onClose, source = "button" }) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submitFeedback = useMutation(api.feedback.submit);
  const overlayRef = useRef(null);
  const firstFocusRef = useRef(null);

  // Trap focus inside modal
  useEffect(() => {
    firstFocusRef.current?.focus();
    function onKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submitFeedback({
        rating,
        text: text.trim() || undefined,
        source,
      });
      markSubmitted();
      setSubmitted(true);
    } catch {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4"
      role="presentation"
    >
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
        className="relative w-full max-w-sm bg-[#1C1917] border border-[#2C2825] rounded-2xl shadow-2xl p-6 space-y-5"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close feedback"
          className="absolute top-4 right-4 text-[#57534E] hover:text-[#A8A29E] transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {submitted ? (
          <div className="py-4 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-green-900/30 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="font-space-grotesk text-sm font-medium text-[#E7E5E4]">
              Thank you! Your feedback helps shape Arcora.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="font-space-grotesk text-xs text-[#A8A29E] hover:text-[#E7E5E4] transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <h2 id="feedback-title" className="font-instrument-serif text-xl text-[#E7E5E4]">
                Share your thoughts
              </h2>
              <p className="mt-1 font-space-grotesk text-xs text-[#A8A29E]">
                Help us improve Arcora for new hires like you
              </p>
            </div>

            <div className="space-y-2">
              <p className="font-space-grotesk text-xs font-medium text-[#A8A29E]">
                How is Arcora working for you?
              </p>
              <StarRating value={rating} onChange={setRating} />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="feedback-text"
                className="font-space-grotesk text-xs font-medium text-[#A8A29E]"
              >
                Tell us more{" "}
                <span className="font-normal text-[#57534E]">(optional)</span>
              </label>
              <textarea
                id="feedback-text"
                ref={firstFocusRef}
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 500))}
                placeholder="What is working well? What could be better?"
                rows={3}
                className="w-full bg-[#292524] border border-[#2C2825] rounded-lg px-3 py-2.5 font-space-grotesk text-sm text-[#E7E5E4] placeholder-[#57534E] resize-none focus:outline-none focus:border-[#D97757] transition-colors"
              />
              <p className="font-space-grotesk text-[10px] text-[#57534E] text-right">
                {text.length}/500
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-lg bg-[#D97757] hover:bg-[#C26242] disabled:opacity-60 font-space-grotesk text-sm font-medium text-white transition-colors"
            >
              {submitting ? "Sending…" : "Send feedback"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Provider ──────────────────────────────────────────────────────────────────
// Wrap the (app) layout with this so any page can call useFeedback().openModal()

export function FeedbackProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState("button");

  const openModal = useCallback((src = "button") => {
    setSource(src);
    setOpen(true);
  }, []);

  return (
    <FeedbackContext.Provider value={{ openModal }}>
      {children}
      {open && <FeedbackModal onClose={() => setOpen(false)} source={source} />}
    </FeedbackContext.Provider>
  );
}

// ── Floating button ───────────────────────────────────────────────────────────
// Rendered once in the (app) layout chrome; reads openModal from context.

export default function FeedbackWidget() {
  const [cooledDown, setCooledDown] = useState(
    () => typeof window !== "undefined" && isCooledDown()
  );
  const { openModal } = useFeedback() ?? {};

  if (!cooledDown || !openModal) return null;

  return (
    <button
      type="button"
      onClick={() => openModal("button")}
      aria-label="Share feedback"
      className="fixed bottom-24 right-6 z-40 hidden lg:flex items-center gap-1.5 bg-[#1C1917] border border-[#2C2825] rounded-full px-3 py-2 font-space-grotesk text-xs text-[#A8A29E] hover:text-[#E7E5E4] hover:border-[#44403C] transition-colors shadow-sm"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      Feedback
    </button>
  );
}
