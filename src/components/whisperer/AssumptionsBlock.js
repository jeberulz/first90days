"use client";

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";

const COUNT_KEY = "whisperer_invocation_count";
const COLLAPSE_AFTER = 5;

function readCount() {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(COUNT_KEY);
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(n) ? n : 0;
}

export function bumpWhispererInvocationCount() {
  if (typeof window === "undefined") return;
  const n = readCount();
  window.localStorage.setItem(COUNT_KEY, String(n + 1));
}

export default function AssumptionsBlock({ assumptions }) {
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    setExpanded(readCount() <= COLLAPSE_AFTER);
  }, []);

  if (!assumptions || assumptions.length === 0) return null;

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-stone-500 hover:text-stone-300 transition"
      >
        <Icon
          icon={expanded ? "solar:alt-arrow-down-linear" : "solar:alt-arrow-right-linear"}
          width={12}
          height={12}
        />
        <span>assumptions: {assumptions.length}</span>
      </button>
      {expanded && (
        <ul className="mt-2 space-y-1 text-xs italic text-stone-400">
          {assumptions.map((a, i) => (
            <li key={i} className="leading-relaxed">— {a}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
