import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { ChangelogTimeline } from "@/components/ui/ChangelogTimeline";
import { CHANGELOG, groupByMonth } from "@/lib/changelog";

export const metadata = {
  title: "Changelog",
  description:
    "What's new in Arcora — features, improvements, and fixes, released as we ship them.",
  alternates: { canonical: "/changelog" },
};

export default function ChangelogPage() {
  const groups = groupByMonth(CHANGELOG);

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#F5F2E8] dark:bg-[#0F0E0D]">
      <Navbar />
      <main className="pt-32 pb-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <header className="mb-12">
            <p className="font-space-grotesk text-xs uppercase tracking-wide text-[#A8A29E] mb-2">
              Changelog
            </p>
            <h1 className="font-instrument-serif text-4xl sm:text-5xl text-[#1C1917] dark:text-[#E7E5E4] tracking-[-0.5px] leading-tight mb-3">
              What&rsquo;s new in Arcora
            </h1>
            <p className="font-space-grotesk text-sm text-[#57534E] dark:text-[#A8A29E]">
              Features, improvements, and fixes — released as we ship them.
            </p>
          </header>
          <ChangelogTimeline groups={groups} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
