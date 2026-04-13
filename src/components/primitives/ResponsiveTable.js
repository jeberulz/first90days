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
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-14 rounded-xl border border-warm-borderDark bg-warm-cardDark/60 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="rounded-xl border border-warm-borderDark bg-warm-cardDark/60 px-4 py-8 text-center font-space-grotesk text-sm text-warm-300">
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
      <div className="hidden md:block overflow-x-auto rounded-xl border border-warm-borderDark">
        <table className="w-full">
          <thead>
            <tr className="border-b border-warm-borderDark bg-warm-cardDark/40">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "text-left font-space-grotesk text-xs font-medium uppercase tracking-wider text-warm-300 px-4 py-3",
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
                className="border-b border-warm-borderDark/60 last:border-b-0 hover:bg-warm-surfaceDark/40 transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-4 py-3 font-space-grotesk text-sm text-warm-line align-top",
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
              "rounded-xl border border-warm-borderDark bg-warm-cardDark p-4 space-y-3",
              cardClassName
            )}
          >
            <div className="font-space-grotesk text-sm text-warm-line">
              {primaryColumn.cell(row)}
            </div>
            {mobileSecondaryColumns.length > 0 && (
              <dl className="grid grid-cols-1 gap-2 pt-2 border-t border-warm-borderDark/60">
                {mobileSecondaryColumns.map((col) => (
                  <div
                    key={col.key}
                    className="flex items-start justify-between gap-3"
                  >
                    <dt className="font-space-grotesk text-[11px] font-medium uppercase tracking-wider text-warm-300 shrink-0">
                      {col.header}
                    </dt>
                    <dd className="font-space-grotesk text-sm text-warm-line text-right min-w-0">
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
