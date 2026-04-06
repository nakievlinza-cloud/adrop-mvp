import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Briefcase, X, Video, Image as ImageIcon } from "lucide-react";
import { Link } from "wouter";
import { getAvatarSrc } from "../lib/avatar";

interface CreatorMenuPopupProps {
  creator: any;
  isOpen: boolean;
  onClose: () => void;
}

export function CreatorMenuPopup({ creator, isOpen, onClose }: CreatorMenuPopupProps) {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="fixed z-50 w-80 bg-card border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        }}
      >
        {/* Header */}
        <div className="relative h-20 bg-gradient-to-r from-ugc-primary/20 to-clip-primary/20">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 w-8 h-8 bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Avatar */}
        <div className="px-4 -mt-10 mb-3">
          <img
            src={getAvatarSrc(creator.avatarUrl || creator.avatar, creator.name, "creator")}
            alt={creator.name}
            className="w-20 h-20 rounded-2xl border-4 border-card object-cover shadow-xl"
          />
        </div>

        {/* Info */}
        <div className="px-4 pb-4 text-center border-b border-white/10">
          <h3 className="font-bold text-lg">{creator.name || "Креатор"}</h3>
          {creator.description && (
            <p className="text-sm text-foreground/60 mt-1 line-clamp-2">{creator.description}</p>
          )}
        </div>

        {/* Stats */}
        {creator.audienceStats && (
          <div className="p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-foreground/60">Аудитория:</span>
              <span className="font-medium">
                {creator.audienceStats.gender?.male || 50}% М / {creator.audienceStats.gender?.female || 50}% Ж
              </span>
            </div>
            {creator.audienceStats.topAge && (
              <div className="flex justify-between text-sm">
                <span className="text-foreground/60">Возраст:</span>
                <span className="font-medium">{creator.audienceStats.topAge}</span>
              </div>
            )}
            {creator.audienceStats.topGeo && (
              <div className="flex justify-between text-sm">
                <span className="text-foreground/60">ГЕО:</span>
                <span className="font-medium">{creator.audienceStats.topGeo}</span>
              </div>
            )}
          </div>
        )}

        {/* Work Formats */}
        <div className="px-4 pb-4 space-y-2">
          <p className="text-xs text-foreground/50 text-center mb-2">Форматы работы</p>

          {/* UGC Video */}
          <div className="bg-ugc-primary/10 border border-ugc-primary/30 rounded-xl p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-ugc-primary/20 flex items-center justify-center shrink-0">
                <Video className="w-5 h-5 text-ugc-primary" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm">UGC Видео</div>
                <div className="text-xs text-foreground/60">Полноценный обзор продукта</div>
              </div>
            </div>
          </div>

          {/* Banner Integration */}
          <div className="bg-clip-primary/10 border border-clip-primary/30 rounded-xl p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-clip-primary/20 flex items-center justify-center shrink-0">
                <ImageIcon className="w-5 h-5 text-clip-primary" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm">Интеграция баннера</div>
                <div className="text-xs text-foreground/60">Ваш контент в моём видео</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 pt-0 space-y-2">
          <Link href={`/customer/messages?creator=${creator.id}`}>
            <button
              onClick={onClose}
              className="w-full h-11 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4" /> Написать
            </button>
          </Link>
          <Link href={`/customer/create-offer?creator=${creator.id}`}>
            <button
              onClick={onClose}
              className="w-full h-11 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
            >
              <Briefcase className="w-4 h-4" /> Поработать
            </button>
          </Link>
        </div>
      </motion.div>
    </>
  );
}
