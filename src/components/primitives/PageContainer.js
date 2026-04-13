import { cn } from "@/lib/utils";

const SIZE_MAP = {
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
};

export default function PageContainer({
  as: Tag = "div",
  size = "5xl",
  className,
  children,
  ...rest
}) {
  return (
    <Tag
      className={cn(
        "w-full min-w-0 mx-auto px-4 sm:px-6 lg:px-8",
        SIZE_MAP[size] || SIZE_MAP["5xl"],
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
