import { Megaphone, Play } from "lucide-react";

export function CTA() {
  return (
    <section className="py-32 bg-white dark:bg-[#1a1915] relative overflow-hidden">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <Megaphone
          className="w-10 h-10 text-terracotta mx-auto mb-6"
          strokeWidth={1}
        />
        <h2 className="text-5xl md:text-6xl font-serif mb-8 text-charcoal dark:text-cream-50">
          Keep thinking with First90
        </h2>

        {/* Video Placeholder */}
        <div className="relative rounded-3xl overflow-hidden aspect-video shadow-2xl group cursor-pointer mb-12">
          <div className="absolute inset-0 bg-charcoal/10 group-hover:bg-transparent transition-colors z-10" />
          <div className="w-full h-full bg-cream-200 dark:bg-white/10 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-terracotta/20 to-transparent opacity-50" />
            <div className="absolute inset-0 bg-gradient-to-br from-charcoal/5 to-charcoal/20" />
            <button className="w-16 h-16 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg z-20 group-hover:scale-110 transition-transform">
              <Play className="w-6 h-6 text-charcoal ml-1" />
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <p className="text-lg font-serif mb-2 text-charcoal dark:text-cream-50">
            Your ambition&apos;s collaborator
          </p>
          <p className="text-sm text-charcoal/60 dark:text-cream-200/60 mb-8">
            There&apos;s never been a worse time to be unprepared, or a better
            time to have a plan.
          </p>

          {/* Footer Input CTA */}
          <div className="w-full max-w-xl bg-cream-100 dark:bg-[#252420] p-1.5 rounded-full flex items-center shadow-inner">
            <input
              type="text"
              placeholder="What role are you starting?"
              className="flex-1 bg-transparent px-6 outline-none text-charcoal dark:text-cream-50 text-sm"
            />
            <button className="bg-terracotta px-6 py-3 rounded-full text-sm font-medium hover:bg-terracotta-hover transition-colors text-white">
              Start Plan
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
