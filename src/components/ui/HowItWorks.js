import { HandMetal } from "lucide-react";

export function HowItWorks() {
  return (
    <section className="py-32 bg-cream-100 dark:bg-[#1a1915] relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-24">
          <HandMetal
            className="w-8 h-8 text-charcoal dark:text-white mx-auto mb-4"
            strokeWidth={1}
          />
          <h2 className="text-4xl md:text-5xl font-serif text-charcoal dark:text-cream-50 mb-4">
            How you can use First90
          </h2>
        </div>

        {/* Vertical Steps */}
        <div className="relative space-y-32">
          {/* Vertical Line */}
          <div className="absolute left-0 md:left-1/2 top-0 bottom-0 w-px bg-charcoal/10 dark:bg-white/10 -translate-x-1/2 hidden md:block" />

          {/* Step 1 */}
          <div className="relative grid md:grid-cols-2 gap-12 items-center">
            <div className="md:text-right md:pr-12">
              <h3 className="text-2xl font-serif mb-3 text-charcoal dark:text-cream-50">
                Input your role
              </h3>
              <p className="text-sm text-charcoal/70 dark:text-cream-200/70">
                Simply paste your job description or job title. We extract key
                competencies and expectations instantly.
              </p>
            </div>
            <div className="md:pl-12 relative">
              <div className="bg-white dark:bg-[#252420] p-6 rounded-2xl shadow-sm border border-black/5 dark:border-white/5 rotate-2 hover:rotate-0 transition-transform duration-500">
                <div className="flex items-center gap-3 mb-2">
                  <span className="bg-terracotta/10 text-terracotta text-xs font-bold px-2 py-1 rounded">
                    Role
                  </span>
                  <span className="font-medium text-sm text-charcoal dark:text-cream-50">
                    Senior Product Manager
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold px-2 py-1 rounded bg-blue-50 text-blue-600">
                    Focus
                  </span>
                  <span className="font-medium text-sm text-charcoal dark:text-cream-50">
                    Mobile Growth
                  </span>
                </div>
              </div>
            </div>
            {/* Dot */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-cream-100 dark:bg-[#1a1915] border-2 border-charcoal dark:border-white rounded-full hidden md:block z-10" />
          </div>

          {/* Step 2 */}
          <div className="relative grid md:grid-cols-2 gap-12 items-center">
            <div className="md:col-start-2 md:pl-12">
              <h3 className="text-2xl font-serif mb-3 text-charcoal dark:text-cream-50">
                Receive daily briefings
              </h3>
              <p className="text-sm text-charcoal/70 dark:text-cream-200/70">
                Every morning, get 3 critical actions. No overwhelm, just steady
                execution towards your 90-day goals.
              </p>
            </div>
            <div className="md:row-start-1 md:pr-12 relative flex justify-end">
              <div className="bg-charcoal dark:bg-white p-6 rounded-2xl shadow-xl w-64 -rotate-2 hover:rotate-0 transition-transform duration-500">
                <div className="text-white dark:text-charcoal text-xs font-bold mb-4 uppercase tracking-wider">
                  Tuesday, 8:00 AM
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-5 h-5 rounded border border-white/30 dark:border-charcoal/30 flex items-center justify-center" />
                  <span className="text-sm text-white/90 dark:text-charcoal/90">
                    Email Strategy Lead
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded border border-white/30 dark:border-charcoal/30 flex items-center justify-center" />
                  <span className="text-sm text-white/90 dark:text-charcoal/90">
                    Review Q2 Metrics
                  </span>
                </div>
              </div>
            </div>
            {/* Dot */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-cream-100 dark:bg-[#1a1915] border-2 border-charcoal dark:border-white rounded-full hidden md:block z-10" />
          </div>

          {/* Step 3 */}
          <div className="relative grid md:grid-cols-2 gap-12 items-center">
            <div className="md:text-right md:pr-12">
              <h3 className="text-2xl font-serif mb-3 text-charcoal dark:text-cream-50">
                Generate reports
              </h3>
              <p className="text-sm text-charcoal/70 dark:text-cream-200/70">
                Impress your manager with automated weekly summary reports
                showing what you&apos;ve learned and achieved.
              </p>
            </div>
            <div className="md:pl-12 relative">
              <div className="bg-white dark:bg-[#252420] p-6 rounded-2xl shadow-sm border border-black/5 dark:border-white/5 rotate-2 hover:rotate-0 transition-transform duration-500">
                <div className="h-16 w-full bg-cream-100 dark:bg-white/5 rounded-lg mb-3 flex items-end px-4 pb-2 gap-2">
                  <div className="w-full bg-terracotta/40 h-1/3 rounded-t" />
                  <div className="w-full bg-terracotta/60 h-2/3 rounded-t" />
                  <div className="w-full bg-terracotta h-full rounded-t" />
                </div>
                <div className="text-xs text-center text-charcoal/50">
                  Impact Trajectory
                </div>
              </div>
            </div>
            {/* Dot */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-cream-100 dark:bg-[#1a1915] border-2 border-charcoal dark:border-white rounded-full hidden md:block z-10" />
          </div>
        </div>
      </div>
    </section>
  );
}
