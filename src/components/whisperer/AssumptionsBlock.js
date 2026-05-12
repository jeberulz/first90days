"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";

/**
 * Quiet, collapsed-by-default assumptions reveal. The model's
 * grounding notes are useful for power users but visually heavy if
 * always-on — gating them behind a single tap reduces panel weight
 * without losing them entirely.
 */
export default function AssumptionsBlock({ assumptions }) {
  const [expanded, setExpanded] = useState(false);

  if (!assumptions || assumptions.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="inline-flex items-center gap-1 text-[11px] text-stone-500 hover:text-[#D97757]"
      >
        <span aria-hidden>↳</span>
        <span>
          {assumptions.length} note{assumptions.length === 1 ? "" : "s"}
        </span>
        <Icon
          icon={
            expanded
              ? "solar:alt-arrow-up-linear"
              : "solar:alt-arrow-down-linear"
          }
          width={10}
          height={10}
        />
      </button>
      {expanded && (
        <ul className="mt-2 space-y-1 text-xs italic text-stone-500">
          {assumptions.map((a, i) => (
            <li key={i} className="leading-relaxed">— {a}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
