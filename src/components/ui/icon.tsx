import { HugeiconsIcon } from "@hugeicons/react";

type AppIconProps = {
  icon: any;
  className?: string;
  size?: number;
  strokeWidth?: number;
};

export function AppIcon({
  icon,
  className,
  size = 20,
  strokeWidth = 1.8,
}: AppIconProps) {
  return (
    <HugeiconsIcon
      icon={icon}
      className={className}
      size={size}
      strokeWidth={strokeWidth}
      color="currentColor"
    />
  );
}
