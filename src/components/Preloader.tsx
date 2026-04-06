import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const PRELOADER_VIDEO_SRC = "https://cdn.shopify.com/videos/c/o/v/699dddbf593d446cbf595c042e3aa151.mp4";
const PRELOADER_HOLD_MS = 3000;
const PRELOADER_EXIT_MS = 420;

export function Preloader({ onComplete }: { onComplete: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);

  useEffect(() => {
    const video = videoRef.current;

    const applyPlaybackRate = () => {
      if (video) {
        video.playbackRate = 2;
      }
    };

    document.body.classList.add("overflow-hidden");
    applyPlaybackRate();
    video?.addEventListener("loadedmetadata", applyPlaybackRate);
    void video?.play().catch(() => {});

    const finishTimer = window.setTimeout(() => {
      setIsFinishing(true);
    }, PRELOADER_HOLD_MS);

    const completeTimer = window.setTimeout(() => {
      onComplete();
    }, PRELOADER_HOLD_MS + PRELOADER_EXIT_MS);

    return () => {
      document.body.classList.remove("overflow-hidden");
      video?.removeEventListener("loadedmetadata", applyPlaybackRate);
      window.clearTimeout(finishTimer);
      window.clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: isFinishing ? 0 : 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: PRELOADER_EXIT_MS / 1000, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black"
      aria-hidden="true"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 44%, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.015) 14%, rgba(0,0,0,0) 34%), radial-gradient(circle at 50% 100%, rgba(0,0,0,0.24) 0%, rgba(0,0,0,0.82) 64%, rgba(0,0,0,0.96) 100%)",
        }}
      />

      <motion.video
        ref={videoRef}
        src={PRELOADER_VIDEO_SRC}
        autoPlay
        muted
        playsInline
        preload="auto"
        animate={{
          opacity: isFinishing ? 0.8 : 1,
          scale: isFinishing ? 0.95 : 1,
        }}
        transition={{ duration: PRELOADER_EXIT_MS / 1000, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-[360px] max-w-[90vw] object-contain max-[768px]:w-[192px] max-[768px]:max-w-[80vw] max-[480px]:w-[205px]"
      />
    </motion.div>
  );
}
