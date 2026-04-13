import { cn } from "@/lib/utils";

export default function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  variant = "default",
  align = "left",
  className,
}) {
  const titleClass = variant === "display" ? "t-display-md text-warm-line" : "t-h1 text-warm-line";

  return (
    <header
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6 sm:mb-8",
        align === "center" && "text-center sm:flex-col sm:items-center",
        className
      )}
    >
      <div className="min-w-0 space-y-2">
        {eyebrow && <p className="t-meta text-warm-300">{eyebrow}</p>}
        {title && <h1 className={titleClass}>{title}</h1>}
        {description && (
          <p className="t-body text-warm-300 max-w-2xl">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>
      )}
    </header>
  );
}
