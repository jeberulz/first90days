import {
    LayoutDashboard,
    CheckCircle2,
    Users,
    Sparkles,
} from "lucide-react";

export function Mockup() {
    return (
        <div className="max-w-5xl mx-auto mt-20 px-4 relative z-10">
            {/* Glow effect behind mockup */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-indigo-500/10 rounded-full blur-[100px] -z-10"></div>

            <div className="rounded-xl border border-white/10 bg-[#0A0A0A] shadow-2xl overflow-hidden relative">
                {/* Mockup Header */}
                <div className="h-10 border-b border-white/5 bg-white/[0.02] flex items-center px-4 gap-2">
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-neutral-800 border border-white/5"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-neutral-800 border border-white/5"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-neutral-800 border border-white/5"></div>
                    </div>
                    <div className="ml-4 h-5 w-32 bg-neutral-800/50 rounded flex items-center px-2">
                        <span className="text-[9px] text-neutral-500">
                            first90.app/plan/generate
                        </span>
                    </div>
                </div>

                {/* Mockup Body */}
                <div className="grid grid-cols-12 h-[500px]">
                    {/* Sidebar */}
                    <div className="col-span-3 border-r border-white/5 bg-white/[0.01] p-4 hidden md:block">
                        <div className="flex items-center gap-2 mb-6 text-neutral-200">
                            <span className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] text-white font-bold">
                                JD
                            </span>
                            <div className="flex flex-col">
                                <span className="text-[11px] font-medium leading-tight">
                                    Jane Doe
                                </span>
                                <span className="text-[9px] text-neutral-500">
                                    Product Manager
                                </span>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center gap-2 px-2 py-1.5 bg-white/5 rounded text-[11px] text-white font-medium border border-white/5">
                                <LayoutDashboard className="w-3 h-3" />
                                Dashboard
                            </div>
                            <div className="flex items-center gap-2 px-2 py-1.5 rounded text-[11px] text-neutral-500 hover:text-neutral-300 transition cursor-pointer">
                                <CheckCircle2 className="w-3 h-3" />
                                Tasks
                            </div>
                            <div className="flex items-center gap-2 px-2 py-1.5 rounded text-[11px] text-neutral-500 hover:text-neutral-300 transition cursor-pointer">
                                <Users className="w-3 h-3" />
                                Stakeholders
                            </div>
                        </div>

                        <div className="mt-8 text-[10px] font-medium text-neutral-600 uppercase tracking-wider mb-2">
                            Timeline
                        </div>
                        <div className="space-y-4 relative pl-3 border-l border-white/5">
                            <div className="relative">
                                <div className="absolute -left-[16px] top-1 w-2 h-2 rounded-full bg-indigo-500 ring-4 ring-[#0A0A0A]"></div>
                                <div className="text-[11px] text-white mb-0.5">Days 1-30</div>
                                <div className="text-[10px] text-neutral-500">
                                    Learn & Absorb
                                </div>
                            </div>
                            <div className="relative opacity-40">
                                <div className="absolute -left-[16px] top-1 w-2 h-2 rounded-full bg-neutral-800 ring-4 ring-[#0A0A0A]"></div>
                                <div className="text-[11px] text-white mb-0.5">Days 31-60</div>
                                <div className="text-[10px] text-neutral-500">Contribute</div>
                            </div>
                            <div className="relative opacity-40">
                                <div className="absolute -left-[16px] top-1 w-2 h-2 rounded-full bg-neutral-800 ring-4 ring-[#0A0A0A]"></div>
                                <div className="text-[11px] text-white mb-0.5">Days 61-90</div>
                                <div className="text-[10px] text-neutral-500">Lead</div>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="col-span-12 md:col-span-9 p-6 md:p-8 bg-[#0A0A0A]">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-lg font-medium text-white tracking-tight">
                                    Phase 1: The Sponge Phase
                                </h3>
                                <p className="text-xs text-neutral-500 mt-1">
                                    Focus on understanding the product, team culture, and existing
                                    roadmap.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-neutral-500">
                                    45% Complete
                                </span>
                                <div className="w-20 h-1 bg-neutral-800 rounded-full overflow-hidden">
                                    <div className="w-[45%] h-full bg-indigo-500 rounded-full"></div>
                                </div>
                            </div>
                        </div>

                        {/* Task List */}
                        <div className="space-y-3">
                            <TaskItem
                                checked={true}
                                title="Audit current Q3 Product Roadmap"
                                description="Review Jira backlog and strategic docs in Notion."
                                tag="High Priority"
                            />
                            <TaskItem
                                checked={false}
                                title="Schedule 1:1s with Key Stakeholders"
                                description="Suggested: Engineering Lead, Design Lead, Marketing Head."
                            />
                            <TaskItem
                                checked={false}
                                title="Setup Development Environment"
                                description="Request access to GitHub repos and AWS console."
                            />

                            {/* AI Suggestion */}
                            <div className="mt-4 p-3 rounded border border-indigo-500/20 bg-indigo-500/5 flex gap-3">
                                <div className="shrink-0 text-indigo-400 mt-0.5">
                                    <Sparkles className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                    <div className="text-[11px] text-indigo-200 font-medium">
                                        AI Insight
                                    </div>
                                    <p className="text-[10px] text-indigo-200/60 mt-0.5 leading-relaxed">
                                        Based on your role, success in the first 30 days usually
                                        correlates highly with "Customer Support Shadowing". Should I
                                        add this task?
                                    </p>
                                    <div className="flex gap-2 mt-2">
                                        <button className="text-[9px] bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 px-2 py-1 rounded transition">
                                            Add Task
                                        </button>
                                        <button className="text-[9px] hover:text-indigo-300 text-indigo-400/50 px-2 py-1 transition">
                                            Dismiss
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function TaskItem({ checked, title, description, tag }) {
    return (
        <label className="custom-checkbox group flex items-start gap-3 p-3 rounded border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition cursor-pointer select-none">
            <input type="checkbox" defaultChecked={checked} className="hidden peer" />
            <div className="w-4 h-4 rounded border border-neutral-600 flex items-center justify-center shrink-0 mt-0.5 transition-colors">
                <svg
                    className="hidden w-2.5 h-2.5 pointer-events-none"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="3"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                    />
                </svg>
            </div>
            <div className="flex-1">
                <div className="text-xs font-medium text-neutral-300 peer-checked:text-neutral-500 peer-checked:line-through transition-colors">
                    {title}
                </div>
                <div className="text-[10px] text-neutral-600 mt-1">{description}</div>
            </div>
            {tag && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {tag}
                </span>
            )}
        </label>
    );
}
