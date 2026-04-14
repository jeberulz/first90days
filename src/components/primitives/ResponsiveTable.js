import { cn } from "@/lib/utils";

const HIDE_BELOW_MAP = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
};

export default function ResponsiveTable({
  columns,
  rows,
  getRowKey,
  emptyLabel = "Nothing to show.",
  loading = false,
  className,
  cardClassName,
  /** When set, borders match /knowledge chrome (#44403C) instead of warm-* */
  variant = "default",
}) {
  const kb = variant === "knowledge";

  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "h-14 rounded-xl border animate-pulse",
              kb
                ? "border-[#44403C]/90 bg-[#1C1917]/60"
                : "border-warm-borderDark bg-warm-cardDark/60"
            )}
          />
        ))}
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <div
        className={cn(
          "rounded-xl border px-4 py-8 text-center font-space-grotesk text-sm",
          kb
            ? "border-[#44403C]/90 bg-[#1C1917]/60 text-[#A8A29E]"
            : "border-warm-borderDark bg-warm-cardDark/60 text-warm-300"
        )}
      >
        {emptyLabel}
      </div>
    );
  }

  const primaryColumn = columns.find((c) => c.primary) || columns[0];
  const mobileSecondaryColumns = columns.filter(
    (c) => c !== primaryColumn && c.mobile !== false
  );

  return (
    <div className={className}>
      {/* Desktop / tablet table */}
      <div
        className={cn(
          "hidden md:block overflow-x-auto rounded-xl border",
          kb ? "border-[#44403C]/90" : "border-warm-borderDark"
        )}
      >
        <table className="w-full">
          <thead>
            <tr
              className={cn(
                "border-b",
                kb
                  ? "border-[#44403C]/55 bg-[#1C1917]/45"
                  : "border-warm-borderDark bg-warm-cardDark/40"
              )}
            >
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "text-left font-space-grotesk text-xs font-medium uppercase tracking-wider px-4 py-3",
                    kb ? "text-[#A8A29E]" : "text-warm-300",
                    col.hideBelow && HIDE_BELOW_MAP[col.hideBelow],
                    col.headerClassName
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={getRowKey(row)}
                className={cn(
                  "border-b last:border-b-0 transition-colors",
                  kb
                    ? "border-[#44403C]/40 hover:bg-[#1C1917]/55"
                    : "border-warm-borderDark/60 hover:bg-warm-surfaceDark/40"
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-4 py-3 font-space-grotesk text-sm align-top",
                      kb ? "text-[#E7E5E4]" : "text-warm-line",
                      col.hideBelow && HIDE_BELOW_MAP[col.hideBelow],
                      col.cellClassName
                    )}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {rows.map((row) => (
          <div
            key={getRowKey(row)}
            className={cn(
              "rounded-xl border p-4 space-y-3",
              kb
                ? "border-[#44403C]/90 bg-[#1C1917]"
                : "border-warm-borderDark bg-warm-cardDark",
              cardClassName
            )}
          >
            <div
              className={cn(
                "font-space-grotesk text-sm",
                kb ? "text-[#E7E5E4]" : "text-warm-line"
              )}
            >
              {primaryColumn.cell(row)}
            </div>
            {mobileSecondaryColumns.length > 0 && (
              <dl
                className={cn(
                  "grid grid-cols-1 gap-2 pt-2 border-t",
                  kb ? "border-[#44403C]/50" : "border-warm-borderDark/60"
                )}
              >
                {mobileSecondaryColumns.map((col) => (
                  <div
                    key={col.key}
                    className="flex items-start justify-between gap-3"
                  >
                    <dt
                      className={cn(
                        "font-space-grotesk text-[11px] font-medium uppercase tracking-wider shrink-0",
                        kb ? "text-[#A8A29E]" : "text-warm-300"
                      )}
                    >
                      {col.header}
                    </dt>
                    <dd
                      className={cn(
                        "font-space-grotesk text-sm text-right min-w-0",
                        kb ? "text-[#E7E5E4]" : "text-warm-line"
                      )}
                    >
                      {col.cell(row)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
