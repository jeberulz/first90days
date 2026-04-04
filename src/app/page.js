import { Navbar } from "@/components/ui/Navbar";
import { Hero } from "@/components/ui/Hero";
import { Mockup } from "@/components/ui/Mockup";
import { Features } from "@/components/ui/Features";
import { HowItWorks } from "@/components/ui/HowItWorks";
import { CTA } from "@/components/ui/CTA";
import { Footer } from "@/components/ui/Footer";

export default function Home() {
  return (
    <div className="min-h-screen relative">
      <Navbar />

      {/* Hero Section */}
      <main className="overflow-hidden pt-32 pb-20 relative bg-cream-100 dark:bg-[#1a1915]">
        {/* Abstract Background Art */}
        <div className="absolute top-20 right-0 w-[50%] h-full pointer-events-none opacity-10 dark:opacity-5">
          <svg viewBox="0 0 800 800" className="w-full h-full text-charcoal">
            <path
              d="M400,200 Q600,100 700,300 T600,600 T300,700 T100,500 T200,200"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            <circle
              cx="600"
              cy="200"
              r="50"
              fill="currentColor"
              className="text-terracotta"
            />
          </svg>
        </div>

        <Hero />
        <Mockup />
      </main>

      <Features />
      <HowItWorks />
      <CTA />
      <Footer />
    </div>
  );
}
