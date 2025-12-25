import { Navbar } from "@/components/ui/Navbar";
import { Hero } from "@/components/ui/Hero";
import { Mockup } from "@/components/ui/Mockup";
import { Features } from "@/components/ui/Features";
import { HowItWorks } from "@/components/ui/HowItWorks";
import { PlanPreview } from "@/components/ui/PlanPreview";
import { Footer } from "@/components/ui/Footer";
import { AuraBackground } from "@/components/ui/AuraBackground";

export default function Home() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <AuraBackground />
      <Navbar />

      <main className="pt-32 pb-20 relative">
        <Hero />
        <Mockup />

        {/* Companies / Trust Section */}
        <div className="mt-20 text-center">
          <p className="text-[10px] uppercase tracking-widest text-neutral-600 font-medium mb-6">Trusted by new hires at</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-40 grayscale mix-blend-screen px-6">
            <span className="text-sm font-semibold tracking-tighter text-white">ACME Corp</span>
            <span className="text-sm font-bold italic text-white">Vortex</span>
            <span className="text-sm font-black tracking-widest text-white">STRATOS</span>
            <span className="text-sm font-medium tracking-tight text-white">Hyperion</span>
            <span className="text-sm font-semibold text-white">Luma</span>
          </div>
        </div>

        <HowItWorks />
      </main>

      <Features />
      <PlanPreview />

      {/* CTA Section */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-neutral-900/50 pointer-events-none"></div>
        <div className="max-w-xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-medium text-white tracking-tight mb-6">Ready to hit the ground running?</h2>
          <p className="text-sm text-neutral-400 mb-8 font-light">Join 10,000+ professionals who mastered their onboarding.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="w-full sm:w-auto bg-white text-black h-10 px-8 rounded-full text-xs font-medium hover:bg-neutral-200 transition-colors">
              Get Started Free
            </button>
            <button className="w-full sm:w-auto border border-white/10 text-white h-10 px-8 rounded-full text-xs font-medium hover:bg-white/5 transition-colors">
              View Sample Plans
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
