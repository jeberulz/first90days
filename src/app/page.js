import { Navbar } from "@/components/ui/Navbar";
import { Hero } from "@/components/ui/Hero";
import { Mockup } from "@/components/ui/Mockup";
import { FeatureIntelligence } from "@/components/ui/FeatureIntelligence";
import { FeatureManagerSync } from "@/components/ui/FeatureManagerSync";
import { FeatureProgress } from "@/components/ui/FeatureProgress";
import { FeatureKnowledge } from "@/components/ui/FeatureKnowledge";
import { HowItWorks } from "@/components/ui/HowItWorks";
import { WaitlistForm } from "@/components/ui/WaitlistForm";
import { Footer } from "@/components/ui/Footer";

export default function Home() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <Navbar />

      <main className="overflow-hidden dark:bg-[#0F0E0D] bg-[#F5F2E8] pt-24 sm:pt-32 pb-12 sm:pb-20 relative">
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

      <section className="py-16 sm:py-24 lg:py-32 relative overflow-hidden bg-[#F5F2E8] dark:bg-[#0F0E0D] transition-colors duration-300">
        <div className="max-w-xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <h2 className="t-display-md tracking-tight mb-4 sm:mb-6 text-[#1C1917] dark:text-white">
            Start your first 90 days with a plan.
          </h2>
          <p className="text-sm sm:text-base text-[#57534E] dark:text-[#D6D3D1] mb-6 sm:mb-8 font-normal font-space-grotesk">
            Join the waitlist and get early access when we launch in May 2026.
          </p>
          <WaitlistForm source="cta" />
        </div>
      </section>

      <Footer />
    </div>
  );
}
