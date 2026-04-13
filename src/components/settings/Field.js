"use client";

import { Children, cloneElement, isValidElement, useId } from "react";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97757]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1C1917]";

export const fieldInputClass = `w-full bg-transparent border border-[#2C2825] rounded-lg px-3 py-2.5 font-space-grotesk text-sm text-[#E7E5E4] focus:border-[#D97757] focus:outline-none focus:ring-1 focus:ring-[#D97757] transition-colors placeholder-[#57534E] ${FOCUS_RING}`;

export const fieldSelectClass = `w-full bg-[#0F0E0D] border border-[#2C2825] rounded-lg px-3 py-2.5 font-space-grotesk text-sm text-[#E7E5E4] focus:border-[#D97757] focus:outline-none focus:ring-1 focus:ring-[#D97757] transition-colors ${FOCUS_RING}`;

/**
 * Field wires a <label htmlFor> to its child input by injecting a stable id
 * via React.useId, fixing the silent a11y break where labels weren't
 * programmatically associated with their controls.
 */
export default function Field({ label, hint, error, children }) {
  const generatedId = useId();
  const child = Children.only(children);
  const inputId = (isValidElement(child) && child.props.id) || generatedId;
  const hintId = hint ? `${generatedId}-hint` : undefined;
  const errorId = error ? `${generatedId}-error` : undefined;
  const describedBy =
    [hintId, errorId].filter(Boolean).join(" ") || undefined;

  const wired = isValidElement(child)
    ? cloneElement(child, {
        id: inputId,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
      })
    : child;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={inputId}
        className="font-space-grotesk text-sm font-medium text-white block"
      >
        {label}
      </label>
      {wired}
      {hint && (
        <p id={hintId} className="font-space-grotesk text-xs text-[#A8A29E]">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          className="font-space-grotesk text-xs text-red-400"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
