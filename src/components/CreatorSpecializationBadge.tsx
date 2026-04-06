import { cn } from "@/lib/utils";
import { Play, LayoutGrid } from "lucide-react";

interface CreatorSpecializationBadgeProps {
  specialization: ("ugc" | "clip")[];
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function CreatorSpecializationBadge({ 
  specialization, 
  size = "md",
  className 
}: CreatorSpecializationBadgeProps) {
  const hasUGC = specialization.includes("ugc");
  const hasClip = specialization.includes("clip");
  const isBoth = hasUGC && hasClip;

  const sizeClasses = {
    sm: "px-2 py-1 text-xs gap-1",
    md: "px-3 py-1.5 text-sm gap-1.5",
    lg: "px-4 py-2 text-base gap-2"
  };

  const iconSize = size === "sm" ? "w-3 h-3" : size === "md" ? "w-4 h-4" : "w-5 h-5";

  if (isBoth) {
    return (
      <div className={cn("inline-flex items-center rounded-full bg-gradient-to-r from-ugc-primary/10 to-clip-primary/10 border border-white/10", sizeClasses[size], className)}>
        <Play className={cn("text-ugc-primary", iconSize)} />
        <span className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-ugc-primary to-clip-primary">
          UGC & Баннер
        </span>
        <LayoutGrid className={cn("text-clip-primary", iconSize)} />
      </div>
    );
  }

  if (hasUGC) {
    return (
      <div className={cn("inline-flex items-center rounded-full bg-ugc-primary/10 border border-ugc-primary/20", sizeClasses[size], className)}>
        <Play className={cn("text-ugc-primary", iconSize)} />
        <span className="font-medium text-ugc-primary">UGC Креатор</span>
      </div>
    );
  }

  return (
    <div className={cn("inline-flex items-center rounded-full bg-clip-primary/10 border border-clip-primary/20", sizeClasses[size], className)}>
      <LayoutGrid className={cn("text-clip-primary", iconSize)} />
      <span className="font-medium text-clip-primary">Баннер / Клип Креатор</span>
    </div>
  );
}
