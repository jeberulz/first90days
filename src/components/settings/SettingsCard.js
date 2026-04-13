import { cn } from "@/lib/utils";

export default function SettingsCard({ className, children, ...rest }) {
  return (
    <div
      className={cn(
        "bg-[#1C1917] border border-[#2C2825] rounded-lg",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
