"use client";

import { useQuery, useMutation } from "convex/react";
import { Icon } from "@iconify/react";
import { api } from "../../../convex/_generated/api";

const TYPE_META = {
  behavioral: { icon: "solar:lightbulb-bolt-linear", className: "bg-violet-900/20 text-violet-400 border-violet-800/50" },
  people: { icon: "solar:users-group-rounded-linear", className: "bg-blue-900/20 text-blue-400 border-blue-800/50" },
  technical: { icon: "solar:code-square-linear", className: "bg-amber-900/20 text-amber-400 border-amber-800/50" },
  goal: { icon: "solar:flag-linear", className: "bg-emerald-900/20 text-emerald-400 border-emerald-800/50" },
  process: { icon: "solar:routing-2-linear", className: "bg-pink-900/20 text-pink-400 border-pink-800/50" },
  cultural: { icon: "solar:buildings-2-linear", className: "bg-fuchsia-900/20 text-fuchsia-400 border-fuchsia-800/50" },
};

function relativeTime(ts) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}

export default function AIMemoryStream() {
  const memories = useQuery(api.kb.memoryStream, { limit: 12 });
  const dismiss = useMutation(api.kb.dismissMemory);

  return (
    <section className="bg-[#1C1917] rounded-xl border border-[#2C2825] shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-6 pb-0 mb-5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#1F1510] rounded-md text-[#D97757]">
            <Icon icon="solar:brain-linear" width={18} />
          </div>
          <div>
            <h2 className="text-base font-medium tracking-tight text-white">
              AI Memory Stream
            </h2>
            <p className="text-[10px] text-[#A8A29E] mt-0.5">
              Insights captured from your daily activity
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 pb-6 space-y-0">
        {memories === undefined && (
          <div className="py-12 text-center text-sm text-[#A8A29E]">Loading…</div>
        )}
        {memories && memories.length === 0 && (
          <div className="py-12 text-center text-sm text-[#A8A29E]">
            No memories yet. Add a doc or write a daily reflection — the brain learns from there.
          </div>
        )}
        {memories &&
          memories.map((m) => {
            const meta = TYPE_META[m.type] || TYPE_META.behavioral;
            return (
              <div
                key={m._id}
                className="group flex gap-3 py-3.5 border-b border-[#2C2825] last:border-0"
              >
                <div className="shrink-0 mt-0.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center border ${meta.className}`}
                  >
                    <Icon icon={meta.icon} width={16} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-white leading-relaxed">{m.text}</p>
                    <span className="text-[10px] text-[#A8A29E] shrink-0 whitespace-nowrap">
                      {relativeTime(m._creationTime)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border ${meta.className}`}
                    >
                      {m.type}
                    </span>
                    {m.sourceTitle && (
                      <span className="text-[10px] text-[#A8A29E] truncate">
                        from {m.sourceTitle}
                      </span>
                    )}
                    {typeof m.confidence === "number" && (
                      <span className="text-[10px] text-[#A8A29E]">
                        · {Math.round(m.confidence * 100)}% confidence
                      </span>
                    )}
                    <button
                      onClick={() => dismiss({ memoryId: m._id })}
                      className="ml-auto text-[10px] text-[#57534E] hover:text-[#D97757] opacity-0 group-hover:opacity-100 transition"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </section>
  );
}
