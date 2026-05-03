import { ChangelogEntry } from "@/components/ui/ChangelogEntry";

export function ChangelogTimeline({ groups }) {
  return (
    <div>
      {groups.map((group) => (
        <section key={group.key} className="mb-14 last:mb-0">
          <h2 className="font-space-grotesk text-xs uppercase tracking-[0.18em] text-[#A8A29E] mb-6">
            {group.label}
          </h2>
          <div className="relative border-l border-[#E7E5E4] dark:border-[#2C2825] pl-0">
            {group.entries.map((entry) => (
              <ChangelogEntry key={entry.id} entry={entry} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
