import { WaitlistForm } from "@/components/ui/WaitlistForm";

export function Hero() {
  return (
    <div className="z-10 text-center max-w-6xl mx-auto px-4 sm:px-6 relative">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#D1CDC7] dark:border-[#2C2825] dark:bg-[#1C1917]/50 backdrop-blur-sm text-[11px] font-medium text-[#44403C] dark:text-[#D6D3D1] mb-6 sm:mb-8 animate-fade-up bg-white/50">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
        </span>
        <span className="font-space-grotesk">Early Access — Launching May 2026</span>
      </div>

      <h1
        className="t-display-xl text-balance mb-6 sm:mb-8 text-[#1C1917] dark:text-white animate-fade-up"
        style={{ animationDelay: "0.1s" }}
      >
        <span className="block md:mb-3 mb-1">
          Your first 90 days,
        </span>
        <span className="block font-space-grotesk font-semibold tracking-tight">
          engineered for impact.
        </span>
      </h1>

      <p
        className="t-body-lg text-[#57534E] dark:text-[#D6D3D1] max-w-2xl mx-auto mb-8 sm:mb-10 font-normal animate-fade-up px-2"
        style={{ animationDelay: "0.2s" }}
      >
        Generate a tailored 30-60-90 day plan in 5 minutes. Get daily actions,
        align with your manager, and ramp faster — no more guessing what success looks like.
      </p>

      <div
        className="animate-fade-up"
        style={{ animationDelay: "0.3s" }}
      >
        <WaitlistForm source="hero" className="mb-4" />
        <p className="text-xs text-[#A8A29E] font-space-grotesk">
          No spam. Unsubscribe anytime.
        </p>
      </div>
    </div>
  );
}
