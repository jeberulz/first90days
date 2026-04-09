import Link from "next/link";
import { Navbar } from "@/components/ui/Navbar";
import { Hero } from "@/components/ui/Hero";
import { Mockup } from "@/components/ui/Mockup";
import { FeatureIntelligence } from "@/components/ui/FeatureIntelligence";
import { FeatureManagerSync } from "@/components/ui/FeatureManagerSync";
import { FeatureProgress } from "@/components/ui/FeatureProgress";
import { FeatureKnowledge } from "@/components/ui/FeatureKnowledge";
import { HowItWorks } from "@/components/ui/HowItWorks";
import { Footer } from "@/components/ui/Footer";

export default function Home() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <Navbar />

      <main className="overflow-hidden dark:bg-[#0F0E0D] bg-[#F5F2E8] pt-32 pb-20 relative">
        <div className="absolute inset-0 bg-grid-pattern [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
        <Hero />
        <Mockup />
      </main>

      <section className="dark:border-[#2C2825] dark:bg-[#0F0E0D] transition-colors duration-300 border-[#D1CDC7] border-t bg-white">
        <FeatureIntelligence />
        <FeatureManagerSync />
        <FeatureProgress />
      </section>

      <FeatureKnowledge />
      <HowItWorks />

      <section className="py-32 relative overflow-hidden bg-[#F5F2E8] dark:bg-[#0F0E0D] transition-colors duration-300">
        <div className="max-w-xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-3xl md:text-5xl tracking-tight mb-6 font-instrument-serif font-normal text-[#1C1917] dark:text-white">
            Ready to hit the ground running?
          </h2>
          <p className="text-sm text-[#57534E] dark:text-[#D6D3D1] mb-8 font-normal font-space-grotesk">
            Join 10,000+ professionals who mastered their onboarding.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto bg-accent h-12 px-8 rounded-full text-sm font-semibold hover:bg-accent-hover transition-colors shadow-lg shadow-orange-500/20 font-space-grotesk text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0F0E0D] flex items-center justify-center"
            >
              Get Started Free
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto border h-12 px-8 rounded-full text-sm font-semibold transition-colors font-space-grotesk border-[#D1CDC7] dark:border-[#44403C] text-[#1C1917] dark:text-white dark:hover:bg-[#1C1917] hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-accent flex items-center justify-center"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
