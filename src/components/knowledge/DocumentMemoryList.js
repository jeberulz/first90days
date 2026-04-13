"use client";

import { useQuery } from "convex/react";
import { Icon } from "@iconify/react";
import { api } from "../../../convex/_generated/api";

export default function DocumentMemoryList({ documentId }) {
  const memories = useQuery(api.kb.memoriesForDocument, { documentId });

  if (memories === undefined) {
    return (
      <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-6">
        <p className="text-xs text-[#A8A29E]">Loading memories…</p>
      </div>
    );
  }

  if (memories.length === 0) {
    return null;
  }

  return (
    <div className="bg-[#1C1917] border border-[#2C2825] rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-[#1F1510] rounded-md text-[#D97757]">
          <Icon icon="solar:lightbulb-bolt-linear" width={18} />
        </div>
        <h3 className="text-base font-medium text-white">
          Memories extracted from this doc
        </h3>
      </div>
      <ul className="space-y-3">
        {memories.map((m) => (
          <li
            key={m._id}
            className="flex gap-3 text-sm text-[#E7E5E4]"
          >
            <Icon
              icon="solar:bookmark-circle-linear"
              width={16}
              className="text-[#D97757] shrink-0 mt-0.5"
            />
            <div className="flex-1">
              <p>{m.text}</p>
              <p className="text-[10px] text-[#A8A29E] mt-1">
                {m.type} · {Math.round((m.confidence ?? 0) * 100)}% confidence
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
