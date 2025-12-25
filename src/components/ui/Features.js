import { Crosshair, MessageSquare, BarChart3 } from "lucide-react";

export function Features() {
    return (
        <div className="max-w-6xl mx-auto px-6">
            <div className="mb-16 md:text-center max-w-2xl mx-auto">
                <h2 className="text-2xl md:text-3xl font-medium text-white tracking-tight mb-4">
                    Structure creates freedom.
                </h2>
                <p className="text-sm text-neutral-400 leading-relaxed font-light">
                    Onboarding is often chaotic. First90 brings structure to the chaos,
                    allowing you to focus on building relationships and delivering value,
                    not just checking boxes.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FeatureCard
                    icon={<Crosshair className="w-5 h-5" />}
                    title="Role-Specific Intelligence"
                    description="Our AI analyzes thousands of job descriptions to suggest the most impactful milestones for your specific role and seniority level."
                />
                <FeatureCard
                    icon={<MessageSquare className="w-5 h-5" />}
                    title="Manager Sync"
                    description="Export your plan to PDF or Notion to review with your manager. Align on expectations before you even start your first week."
                />
                <FeatureCard
                    icon={<BarChart3 className="w-5 h-5" />}
                    title="Progress Tracking"
                    description="Visual progress indicators for 30, 60, and 90 day milestones help you communicate your ramp-up velocity to leadership."
                />
            </div>
        </div>
    );
}

function FeatureCard({ icon, title, description }) {
    return (
        <div className="group p-6 rounded-xl bg-neutral-900/20 border border-white/5 hover:border-white/10 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-4 text-white group-hover:bg-white/10 transition">
                {icon}
            </div>
            <h3 className="text-sm font-medium text-white mb-2">{title}</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">{description}</p>
        </div>
    );
}
