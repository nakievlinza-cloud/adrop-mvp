import { cn } from "@/lib/utils";

interface ContentTypeBadgeProps {
  type: "ugc" | "clip";
  size?: "sm" | "md";
  className?: string;
}

export function ContentTypeBadge({ type, size = "sm", className }: ContentTypeBadgeProps) {
  const isUGC = type === "ugc";
  
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center font-medium rounded-full border",
        isUGC 
          ? "bg-ugc-primary/10 text-ugc-primary border-ugc-primary/20" 
          : "bg-clip-primary/10 text-clip-primary border-clip-primary/20",
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
        className
      )}
    >
      {isUGC ? "UGC" : "Баннер"}
    </span>
  );
}
