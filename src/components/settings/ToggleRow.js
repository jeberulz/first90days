"use client";

import { useId } from "react";
import Toggle from "./Toggle";

export default function ToggleRow({
  title,
  description,
  checked,
  onChange,
  disabled = false,
}) {
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const descId = description ? `${baseId}-desc` : undefined;

  return (
    <div
      className={`flex items-start justify-between gap-4 py-2 ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <div className="min-w-0">
        <p
          id={titleId}
          className="font-space-grotesk text-sm font-medium text-white"
        >
          {title}
        </p>
        {description && (
          <p
            id={descId}
            className="font-space-grotesk text-xs text-[#A8A29E] mt-0.5"
          >
            {description}
          </p>
        )}
      </div>
      <div className="mt-1">
        <Toggle
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          ariaLabelledBy={titleId}
          ariaDescribedBy={descId}
        />
      </div>
    </div>
  );
}
