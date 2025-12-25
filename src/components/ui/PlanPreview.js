import { Check, BookOpen, Users, Rocket } from "lucide-react";

export function PlanPreview() {
    return (
        <section className="py-24 border-t border-white/5 bg-neutral-900/20">
            <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
                <div>
                    <h2 className="text-2xl font-medium text-white tracking-tight mb-4">
                        Don't start from zero.
                    </h2>
                    <div className="space-y-6">
                        <p className="text-sm text-neutral-400 font-light">
                            Most employees spend their first month figuring out what they
                            should be doing. First90 gives you a cheat sheet for success.
                        </p>

                        <ul className="space-y-3">
                            <ListItem text="Curated reading lists for your industry" />
                            <ListItem text="Key stakeholder identification templates" />
                            <ListItem text="Early win identification strategies" />
                        </ul>

                        <div className="pt-4">
                            <a
                                href="#"
                                className="text-xs text-white border-b border-white pb-0.5 hover:opacity-70 transition"
                            >
                                Read the manifesto
                            </a>
                        </div>
                    </div>
                </div>

                <div className="relative">
                    {/* Decorative Elements */}
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl"></div>

                    <div className="rounded-xl border border-white/10 bg-[#050505] p-6 relative">
                        <div className="flex justify-between items-center mb-6">
                            <div className="text-xs font-medium text-white">
                                Generated Plan
                            </div>
                            <div className="text-[10px] text-neutral-500">Updated 2m ago</div>
                        </div>

                        <div className="space-y-3">
                            <PlanCard
                                icon={<BookOpen className="w-3.5 h-3.5" />}
                                colorClass="text-emerald-500 bg-emerald-500/10"
                                title="Context Gathering"
                                meta="Week 1-2 • High Impact"
                            />
                            <PlanCard
                                icon={<Users className="w-3.5 h-3.5" />}
                                colorClass="text-blue-500 bg-blue-500/10"
                                title="Relationship Building"
                                meta="Week 2-4 • Critical"
                            />
                            <PlanCard
                                icon={<Rocket className="w-3.5 h-3.5" />}
                                colorClass="text-purple-500 bg-purple-500/10"
                                title="First Shipping Goal"
                                meta="Month 2 • Strategic"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

function ListItem({ text }) {
    return (
        <li className="flex items-start gap-3">
            <Check className="w-4 h-4 text-emerald-500 mt-0.5" />
            <span className="text-xs text-neutral-300">{text}</span>
        </li>
    );
}

function PlanCard({ icon, colorClass, title, meta }) {
    return (
        <div className="p-3 bg-neutral-900/50 rounded border border-white/5 flex gap-3 items-center">
            <div className={`w-8 h-8 rounded flex items-center justify-center ${colorClass}`}>
                {icon}
            </div>
            <div>
                <div className="text-xs text-neutral-200">{title}</div>
                <div className="text-[10px] text-neutral-500">{meta}</div>
            </div>
        </div>
    );
}
