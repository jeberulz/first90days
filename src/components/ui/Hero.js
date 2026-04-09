import Link from "next/link";

export function Hero() {
  return (
    <div className="z-10 text-center max-w-6xl mx-auto px-6 relative">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#D1CDC7] dark:border-[#2C2825] dark:bg-[#1C1917]/50 backdrop-blur-sm text-[11px] font-medium text-[#44403C] dark:text-[#D6D3D1] mb-8 animate-fade-up bg-white/50">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
        </span>
        <span className="font-space-grotesk">Support all roles</span>
      </div>

      <h1
        className="text-6xl md:text-8xl leading-[0.9] mb-8 text-[#1C1917] dark:text-white animate-fade-up"
        style={{ animationDelay: "0.1s" }}
      >
        <span className="block md:mb-3 font-instrument-serif mb-1">
          Your first 90 days,
        </span>
        <span className="block font-space-grotesk font-semibold tracking-tight">
          engineered for impact.
        </span>
      </h1>

      <p
        className="text-lg md:text-xl text-[#57534E] dark:text-[#D6D3D1] max-w-2xl mx-auto mb-10 font-space-grotesk leading-relaxed font-normal animate-fade-up"
        style={{ animationDelay: "0.2s" }}
      >
        Finally — anyone can generate a comprehensive, role-specific 30-60-90 day
        plan instantly using AI. Align with your manager and hit the ground
        running.
      </p>

      <div
        className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up"
        style={{ animationDelay: "0.3s" }}
      >
        <Link
          href="/signup"
          className="h-12 px-8 rounded-full bg-[#F5F2E8] dark:bg-[#1C1917] text-[#1C1917] dark:text-white border border-[#A8A29E] dark:border-[#44403C] font-semibold font-space-grotesk dark:hover:bg-[#2C2825] hover:shadow-md transition-all flex items-center gap-2 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Start for free
        </Link>
        <Link
          href="/login"
          className="h-12 px-8 rounded-full bg-transparent text-[#57534E] dark:text-[#D6D3D1] font-semibold font-space-grotesk hover:text-[#1C1917] dark:hover:text-white transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Log in →
        </Link>
      </div>
    </div>
  );
}
