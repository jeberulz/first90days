import { formatEntryDate } from "@/lib/changelog";

const TAG_STYLES = {
  new: "bg-[#D97757]/10 text-[#C26242] dark:text-[#D97757]",
  improved:
    "bg-[#1C1917]/5 text-[#57534E] dark:bg-[#E7E5E4]/10 dark:text-[#A8A29E]",
  fixed:
    "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
};

function TagPill({ kind }) {
  const cls =
    TAG_STYLES[kind] ?? TAG_STYLES.improved;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full font-space-grotesk text-[10px] uppercase tracking-wider font-medium ${cls}`}
    >
      {kind}
    </span>
  );
}

export function ChangelogEntry({ entry }) {
  return (
    <article id={entry.id} className="relative pl-8 pb-14 last:pb-2">
      <span
        aria-hidden="true"
        className="absolute -left-[7px] top-2 w-3.5 h-3.5 rounded-full bg-[#D97757] ring-4 ring-[#F5F2E8] dark:ring-[#0F0E0D]"
      />
      <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
        <div className="flex flex-wrap gap-1.5">
          {entry.tags.map((t) => (
            <TagPill key={t} kind={t} />
          ))}
        </div>
        <time
          dateTime={entry.date}
          className="font-space-grotesk text-xs uppercase tracking-wide text-[#A8A29E] whitespace-nowrap"
        >
          {formatEntryDate(entry.date)}
        </time>
      </div>
      <h3 className="font-instrument-serif text-2xl sm:text-3xl text-[#1C1917] dark:text-[#E7E5E4] leading-tight mb-2">
        <a
          href={`#${entry.id}`}
          className="hover:text-[#D97757] transition-colors"
        >
          {entry.title}
        </a>
      </h3>
      <p className="text-base leading-relaxed text-[#57534E] dark:text-[#A8A29E]">
        {entry.summary}
      </p>
      {entry.items?.length > 0 && (
        <ul className="mt-4 space-y-2 font-space-grotesk text-sm text-[#1C1917] dark:text-[#E7E5E4]">
          {entry.items.map((it, i) => (
            <li key={i} className="flex gap-3">
              <span
                aria-hidden="true"
                className="mt-2 h-1 w-1 rounded-full bg-[#D97757] shrink-0"
              />
              <span className="leading-relaxed">{it}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
