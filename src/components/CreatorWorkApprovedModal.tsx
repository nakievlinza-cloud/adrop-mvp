import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, X } from "lucide-react";
import { collection, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
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
    oscillator.frequency.value = 880;
    gain.gain.value = 0.06;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.2);
    oscillator.onended = () => {
      ctx.close();
    };
  } catch (error) {
    console.warn("Notification sound blocked:", error);
  }
};

export function CreatorWorkApprovedModal() {
  const { user, role } = useAuthStore();
  const [queue, setQueue] = useState<any[]>([]);
  const [active, setActive] = useState<any | null>(null);

  useEffect(() => {
    if (!user || role !== "creator") return;

    const q = query(
      collection(db, "notifications"),
      where("recipientId", "==", user.uid),
      where("type", "==", "work_approved"),
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

  const payoutAmount = useMemo(() => {
    if (!active?.amount) return null;
    const value = Number(active.amount);
    return Number.isFinite(value) ? value : null;
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
                <div className="w-11 h-11 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-display font-bold">Работа принята</h3>
                  <p className="text-xs text-foreground/60">Начисление на баланс</p>
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
                {active.message || "Ваш оффер принят. Оплата начислена на баланс."}
              </p>
              {payoutAmount !== null && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4">
                  <p className="text-xs text-foreground/60 mb-1">Начислено</p>
                  <p className="text-2xl font-mono font-bold text-green-400">${payoutAmount}</p>
                </div>
              )}
            </div>

            <div className="p-6 pt-0">
              <button
                onClick={closeModal}
                className="w-full h-12 rounded-xl bg-ugc-primary text-white font-bold hover:bg-ugc-primary/90 transition-colors shadow-lg shadow-ugc-primary/30"
              >
                Понятно
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
