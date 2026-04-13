import Link from "next/link";
import { Icon } from "@iconify/react";

export function FeatureKnowledge() {
  return (
    <section className="w-full relative overflow-hidden bg-[#F5F2E8] dark:bg-[#0F0E0D] border-t border-[#D1CDC7] dark:border-[#2C2825] transition-colors duration-300 group/section py-16 sm:py-24 lg:py-32">
      <div className="absolute inset-0 bg-grid-pattern pointer-events-none" />
      <div className="absolute top-1/2 right-0 w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3 pointer-events-none" />

      <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 md:px-12 relative z-10">
        <div className="grid lg:grid-cols-12 gap-8 sm:gap-12 lg:gap-24 items-center">
          <div className="lg:col-span-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/20 bg-accent/5 text-[10px] uppercase tracking-wider font-bold text-accent mb-6 sm:mb-8 font-space-grotesk animate-fade-up">
              <Icon icon="solar:book-bookmark-linear" width={12} height={12} />
              Knowledge Acceleration
            </div>
            <h2
              className="t-display-lg tracking-tight mb-5 sm:mb-6 text-[#1C1917] dark:text-white animate-fade-up"
              style={{ animationDelay: "0.1s" }}
            >
              Don&apos;t start{" "}
              <span className="text-[#78716C] dark:text-[#A8A29E]">from zero.</span>
            </h2>
            <p
              className="text-base sm:text-lg text-[#57534E] dark:text-[#D6D3D1] leading-relaxed mb-8 sm:mb-10 font-space-grotesk font-light animate-fade-up"
              style={{ animationDelay: "0.2s" }}
            >
              Most employees spend their first month just finding the files. First90 automatically
              aggregates the critical context, templates, and reading lists you need to sound like an
              expert on day one.
            </p>
            <div className="space-y-6 font-space-grotesk mb-10 animate-fade-up" style={{ animationDelay: "0.3s" }}>
              <div className="flex gap-4 group cursor-pointer">
                <div className="w-10 h-10 rounded-full dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#2C2825] flex items-center justify-center shrink-0 shadow-sm group-hover:border-accent transition-colors bg-white">
                  <Icon icon="solar:book-bookmark-linear" width={18} height={18} className="text-accent" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#1C1917] dark:text-white mb-1 group-hover:text-accent transition-colors">
                    Smart Reading Lists
                  </h4>
                  <p className="text-xs text-[#57534E] dark:text-[#A8A29E] leading-relaxed">
                    Curated industry reports and internal docs based on your role.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 group cursor-pointer">
                <div className="w-10 h-10 rounded-full dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#2C2825] flex items-center justify-center shrink-0 shadow-sm group-hover:border-accent transition-colors bg-white">
                  <Icon icon="solar:calendar-check-linear" width={18} height={18} className="text-accent" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#1C1917] dark:text-white mb-1 group-hover:text-accent transition-colors">
                    Success Templates
                  </h4>
                  <p className="text-xs text-[#57534E] dark:text-[#A8A29E] leading-relaxed">
                    Pre-filled strategic templates used by top performers in your role.
                  </p>
                </div>
              </div>
            </div>
            <Link
              href="#"
              className="inline-flex items-center gap-2 text-sm font-semibold border-b border-[#1C1917] dark:border-white pb-0.5 hover:text-accent hover:border-accent transition-all font-space-grotesk text-[#1C1917] dark:text-white group/link animate-fade-up"
              style={{ animationDelay: "0.4s" }}
            >
              Explore the library
              <Icon
                icon="solar:arrow-right-linear"
                width={14}
                height={14}
                className="group-hover/link:translate-x-1 transition-transform"
              />
            </Link>
          </div>

          <div className="lg:col-span-8 w-full relative z-20 animate-fade-up" style={{ animationDelay: "0.2s" }}>
            <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 to-purple-500/10 rounded-[2rem] blur-2xl opacity-0 group-hover/section:opacity-100 transition-opacity duration-700" />
            <div className="relative dark:bg-[#1C1917] rounded-2xl border border-[#E7E5E4] dark:border-[#2C2825] shadow-2xl overflow-hidden min-h-[520px] flex flex-col transition-all duration-500 group-hover/section:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] bg-white">
              <div className="h-14 border-b border-[#E7E5E4] dark:border-[#2C2825] bg-[#FAF9F6] dark:bg-[#292524] px-6 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#E7E5E4] dark:bg-[#44403C]" />
                    <div className="w-3 h-3 rounded-full bg-[#E7E5E4] dark:bg-[#44403C]" />
                    <div className="w-3 h-3 rounded-full bg-[#E7E5E4] dark:bg-[#44403C]" />
                  </div>
                  <div className="h-6 w-px bg-[#E7E5E4] dark:bg-[#44403C]" />
                  <div className="text-sm font-medium font-space-grotesk text-[#1C1917] dark:text-white flex items-center gap-2">
                    <Icon icon="solar:home-smile-linear" width={14} height={14} className="text-[#A8A29E]" />
                    Toolkit
                    <span className="text-[#A8A29E]">/</span>
                    Product Manager
                  </div>
                </div>
                <div className="relative hidden sm:block">
                  <input
                    type="search"
                    placeholder="Search resources..."
                    className="h-8 pl-8 pr-3 text-xs dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#44403C] rounded-md w-48 font-space-grotesk focus:outline-none focus:border-accent transition-colors text-[#1C1917] dark:text-white placeholder-[#A8A29E] bg-white"
                    aria-label="Search resources"
                  />
                  <Icon
                    icon="solar:magnifer-linear"
                    width={12}
                    height={12}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#A8A29E]"
                  />
                </div>
              </div>

              <div className="flex-1 flex overflow-hidden">
                <div className="w-56 border-r border-[#E7E5E4] dark:border-[#2C2825] bg-[#FAF9F6] dark:bg-[#0F0E0D] hidden md:flex flex-col p-4 gap-1">
                  <div className="px-3 py-2 rounded-lg bg-[#E7E5E4]/50 dark:bg-[#292524] text-xs font-bold text-[#1C1917] dark:text-white font-space-grotesk flex items-center gap-2">
                    <Icon icon="solar:book-2-linear" width={14} height={14} className="text-accent" />
                    Reading List
                  </div>
                  <div className="px-3 py-2 rounded-lg hover:bg-[#E7E5E4]/30 dark:hover:bg-[#292524]/50 text-xs font-medium text-[#57534E] dark:text-[#A8A29E] font-space-grotesk flex items-center gap-2 cursor-pointer transition-colors">
                    <Icon icon="solar:document-linear" width={14} height={14} />
                    Templates
                  </div>
                  <div className="px-3 py-2 rounded-lg hover:bg-[#E7E5E4]/30 dark:hover:bg-[#292524]/50 text-xs font-medium text-[#57534E] dark:text-[#A8A29E] font-space-grotesk flex items-center gap-2 cursor-pointer transition-colors">
                    <Icon icon="solar:users-group-rounded-linear" width={14} height={14} />
                    Contacts
                  </div>
                  <div className="mt-auto">
                    <div className="dark:bg-[#1C1917] p-3 rounded-lg border border-[#E7E5E4] dark:border-[#2C2825] shadow-sm bg-white">
                      <div className="text-[9px] font-bold uppercase text-[#A8A29E] mb-2 font-space-grotesk">
                        Storage Used
                      </div>
                      <div className="h-1.5 w-full bg-[#F5F5F4] dark:bg-[#292524] rounded-full overflow-hidden mb-1">
                        <div className="h-full w-[45%] bg-accent rounded-full" />
                      </div>
                      <div className="text-[9px] text-[#57534E] text-right font-mono">45%</div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 dark:bg-[#1C1917] p-6 md:p-8 overflow-y-auto bg-white">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-[#1C1917] dark:text-white font-instrument-serif text-xl">
                      Required Reading
                    </h3>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="p-1.5 rounded hover:bg-[#F5F5F4] dark:hover:bg-[#292524] text-[#78716C] transition-colors"
                        aria-label="Grid view"
                      >
                        <Icon icon="solar:widget-4-bold" width={14} height={14} />
                      </button>
                      <button
                        type="button"
                        className="p-1.5 rounded hover:bg-[#F5F5F4] dark:hover:bg-[#292524] text-[#1C1917] dark:text-white transition-colors bg-[#F5F5F4] dark:bg-[#292524]"
                        aria-label="List view"
                      >
                        <Icon icon="solar:list-linear" width={14} height={14} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {[
                      {
                        title: "Q3 Product Strategy Deck",
                        meta: "Authored by Sarah Jenkins • Updated 2 days ago",
                        icon: "solar:document-linear",
                        iconColor: "text-accent",
                        badge: "Critical",
                      },
                      {
                        title: "Market Landscape Analysis",
                        meta: "External Report • Added by Team",
                        icon: "solar:box-minimalistic-linear",
                        iconColor: "text-blue-500",
                      },
                      {
                        title: "Stakeholder Mapping Template",
                        meta: "Interactive • Estimated time: 20m",
                        icon: "solar:pen-linear",
                        iconColor: "text-purple-500",
                      },
                    ].map((item) => (
                      <div
                        key={item.title}
                        className="flex items-center gap-4 p-4 rounded-xl border border-[#E7E5E4] dark:border-[#2C2825] hover:border-accent hover:shadow-md transition-all cursor-pointer group/item bg-[#FAF9F6] dark:bg-[#0F0E0D]/30"
                      >
                        <div
                          className={`w-10 h-10 rounded-lg dark:bg-[#292524] border border-[#E7E5E4] dark:border-[#44403C] flex items-center justify-center shrink-0 shadow-sm bg-white ${item.iconColor}`}
                        >
                          <Icon icon={item.icon} width={20} height={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h4 className="text-sm font-bold text-[#1C1917] dark:text-white truncate font-space-grotesk">
                              {item.title}
                            </h4>
                            {item.badge && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-accent/10 text-accent uppercase border border-accent/20">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-[#78716C] dark:text-[#A8A29E] truncate">{item.meta}</p>
                        </div>
                        <div className="w-6 h-6 rounded-full border border-[#E7E5E4] dark:border-[#44403C] flex items-center justify-center group-hover/item:bg-accent group-hover/item:border-accent group-hover/item:text-white transition-colors text-[#E7E5E4] dark:text-[#44403C]">
                          <Icon icon="solar:check-read-linear" width={12} height={12} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="absolute bottom-8 right-8 bg-[#1C1917] dark:bg-white dark:text-[#1C1917] px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 transform translate-y-20 opacity-0 group-hover/section:translate-y-0 group-hover/section:opacity-100 transition-all duration-500 delay-200 z-30 text-white">
                <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center shrink-0">
                  <Icon icon="solar:check-circle-bold" width={14} height={14} className="text-white" />
                </div>
                <div>
                  <div className="text-xs font-bold font-space-grotesk">Resource Added</div>
                  <div className="text-[10px] opacity-70">Added to your personal library</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
