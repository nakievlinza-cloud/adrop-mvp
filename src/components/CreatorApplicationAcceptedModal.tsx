import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, MessageSquare, X } from "lucide-react";
import { collection, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { useLocation } from "wouter";
import { db } from "../firebase";
import { useAuthStore } from "../store/authStore";

const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 740;
    gain.gain.value = 0.05;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.18);
    oscillator.onended = () => {
      ctx.close();
    };
  } catch (error) {
    console.warn("Notification sound blocked:", error);
  }
};

export function CreatorApplicationAcceptedModal() {
  const { user, role } = useAuthStore();
  const [, setLocation] = useLocation();
  const [queue, setQueue] = useState<any[]>([]);
  const [active, setActive] = useState<any | null>(null);

  useEffect(() => {
    if (!user || role !== "creator") return;

    const q = query(
      collection(db, "notifications"),
      where("recipientId", "==", user.uid),
      where("type", "==", "application_accepted"),
      where("read", "==", false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((docSnapshot) => ({
        id: docSnapshot.id,
        ...docSnapshot.data()
      }));

      items.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.()?.getTime?.() || 0;
        const bTime = b.createdAt?.toDate?.()?.getTime?.() || 0;
        return bTime - aTime;
      });

      setQueue(items);
    });

    return () => unsubscribe();
  }, [user, role]);

  useEffect(() => {
    if (!active && queue.length > 0) {
      setActive(queue[0]);
    }
  }, [queue, active]);

  useEffect(() => {
    if (active) {
      playNotificationSound();
    }
  }, [active]);

  const closeModal = async () => {
    if (!active) return;
    try {
      await updateDoc(doc(db, "notifications", active.id), { read: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    } finally {
      setActive(null);
    }
  };

  const openChat = async () => {
    await closeModal();
    setLocation("/creator/messages");
  };

  return (
    <AnimatePresence>
      {active && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            className="relative w-full max-w-md bg-card border border-white/10 rounded-3xl shadow-2xl z-[121] overflow-hidden"
          >
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/15 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-display font-bold">Отклик принят</h3>
                  <p className="text-xs text-foreground/60">Можно переходить в чат</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-foreground/80">
                {active.message || "Ваш отклик принят брендом. Можно приступать к работе."}
              </p>
            </div>

            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={closeModal}
                className="flex-1 h-12 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
              >
                Позже
              </button>
              <button
                onClick={openChat}
                className="flex-1 h-12 rounded-xl bg-ugc-primary text-white font-bold hover:bg-ugc-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" /> Открыть чат
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
