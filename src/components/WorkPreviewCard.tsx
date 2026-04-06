import { ContentTypeBadge } from "./ContentTypeBadge";
import { Play, Heart, Eye } from "lucide-react";

interface WorkPreviewCardProps {
  work: {
    type: "ugc" | "clip";
    thumbnail: string;
    platform: string;
    views: number;
    likes: number;
  };
  size?: "sm" | "md" | "lg";
}

export function WorkPreviewCard({ work, size = "md" }: WorkPreviewCardProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  return (
    <div className="group relative rounded-2xl overflow-hidden bg-card border border-white/5 hover:border-white/10 transition-all cursor-pointer">
      <div className="aspect-[9/16] relative bg-gray-900">
        <img 
          src={work.thumbnail} 
          alt="Work preview" 
          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        
        <div className="absolute top-3 left-3">
          <ContentTypeBadge type={work.type} />
        </div>
        
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
            <Play className="w-6 h-6 text-white ml-1" />
          </div>
        </div>

        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
          <div className="flex items-center gap-3 text-white/80 text-sm">
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              <span>{formatNumber(work.views)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              <span>{formatNumber(work.likes)}</span>
            </div>
          </div>
          <div className="px-2 py-1 rounded bg-white/10 backdrop-blur-md text-xs font-medium text-white uppercase">
            {work.platform}
          </div>
        </div>
      </div>
    </div>
  );
}
