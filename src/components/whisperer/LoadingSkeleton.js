"use client";

export default function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="flex items-center gap-2 text-[#D97757]/70 text-xs">
        <span className="inline-flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D97757] animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-[#D97757] animate-bounce" style={{ animationDelay: "120ms" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-[#D97757] animate-bounce" style={{ animationDelay: "240ms" }} />
        </span>
        <span>thinking…</span>
      </div>
      <div className="h-3 rounded bg-white/5 w-11/12" />
      <div className="h-3 rounded bg-white/5 w-9/12" />
      <div className="h-3 rounded bg-white/5 w-10/12" />
    </div>
  );
}
