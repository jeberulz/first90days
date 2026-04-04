import { Zap, Users, TrendingUp } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Intelligent Context",
    description:
      "Our AI analyzes thousands of job descriptions to suggest the most impactful milestones for your specific role.",
  },
  {
    icon: Users,
    title: "Manager Sync",
    description:
      "Export your plan to PDF or Notion to review with your manager. Align on expectations before day one.",
  },
  {
    icon: TrendingUp,
    title: "Progress Tracking",
    description:
      "Visual progress indicators for 30, 60, and 90 day milestones help you communicate velocity to leadership.",
  },
];

export function Features() {
  return (
    <section className="py-24 bg-white dark:bg-[#1a1915] border-t border-cream-200 dark:border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group p-8 rounded-3xl bg-cream-100 dark:bg-[#252420] hover:bg-cream-200 dark:hover:bg-white/10 transition-colors duration-300"
            >
              <div className="mb-6 text-terracotta">
                <feature.icon className="w-8 h-8" strokeWidth={1.5} />
              </div>
              <h3 className="text-2xl font-serif mb-3 text-charcoal dark:text-cream-50">
                {feature.title}
              </h3>
              <p className="text-charcoal/70 dark:text-cream-200/70 leading-relaxed text-sm">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
