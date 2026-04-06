import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, addDoc, serverTimestamp, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useAuthStore } from "../store/authStore";
import { calculateDealPricing, formatUsdAmount } from "../lib/dealPricing";
import { X, CheckCircle2, XCircle, MessageSquare, User, DollarSign, MapPin, Calendar, Briefcase } from "lucide-react";
import { Link } from "wouter";
import { playNotificationSound } from "../utils/sounds";

interface InviteModalProps {
  onOpenChat?: (chatId: string) => void;
}

export function InviteModal({ onOpenChat }: InviteModalProps) {
  const { user } = useAuthStore();
  const [pendingInvite, setPendingInvite] = useState<any>(null);
  const [offerDetails, setOfferDetails] = useState<any>(null);
  const [customerDetails, setCustomerDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Listen for new offer_invite notifications (simple query)
    const q = query(
      collection(db, "notifications"),
      where("recipientId", "==", user.uid)
    );

    let hasPlayedSound = false;

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      // Filter for unread invite notifications
      const unreadInvites = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(n => n.type === "offer_invite" && !n.read);

      if (unreadInvites.length > 0) {
        const invite = unreadInvites[0];
        setPendingInvite(invite);

        // Play sound only once when new invite appears
        if (!hasPlayedSound) {
          playNotificationSound();
          hasPlayedSound = true;
        }

        // Fetch offer details
        if (invite.offerId) {
          try {
            const offerDoc = await getDoc(doc(db, "offers", invite.offerId));
            if (offerDoc.exists()) {
              setOfferDetails({ id: offerDoc.id, ...offerDoc.data() });
            }
          } catch (e) {
            console.error("Error fetching offer:", e);
          }

          // Fetch customer details
          if (invite.senderId) {
            try {
              const customerDoc = await getDoc(doc(db, "users", invite.senderId));
              if (customerDoc.exists()) {
                setCustomerDetails({ id: customerDoc.id, ...customerDoc.data() });
              }
            } catch (e) {
              console.error("Error fetching customer:", e);
            }
          }
        }
      } else {
        hasPlayedSound = false;
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleAccept = async () => {
    if (!pendingInvite || !user) return;

    setLoading(true);
    try {
      // Update application status to accepted
      const applicationsQuery = query(
        collection(db, "applications"),
        where("offerId", "==", pendingInvite.offerId),
        where("creatorId", "==", user.uid),
        where("status", "==", "pending")
      );

      const applicationsSnapshot = await getDocs(applicationsQuery);
      
      // Update application status
      if (!applicationsSnapshot.empty) {
        const appDoc = applicationsSnapshot.docs[0];
        const pricingSnapshot = calculateDealPricing(Number(offerDetails?.budget || 0));
        await updateDoc(doc(db, "applications", appDoc.id), {
          status: "accepted",
          acceptedAt: serverTimestamp(),
          ...pricingSnapshot
        });
      }

      // Create system message in chat for creator
      if (pendingInvite.chatId) {
        await addDoc(collection(db, "chats", pendingInvite.chatId, "messages"), {
          senderId: "system",
          text: `Вы приняли приглашение`,
          type: "invite_accepted_creator",
          offerTitle: offerDetails?.title || 'Оффер',
          offerId: pendingInvite.offerId,
          createdAt: serverTimestamp(),
          isSystem: true
        });
      }

      // Create notification for customer
      await addDoc(collection(db, "notifications"), {
        recipientId: pendingInvite.senderId,
        senderId: user.uid,
        type: "invite_accepted",
        title: "Приглашение принято!",
        message: `${customerDetails?.name || 'Креатор'} принял ваше приглашение`,
        offerId: pendingInvite.offerId,
        chatId: pendingInvite.chatId,
        read: false,
        createdAt: serverTimestamp()
      });

      // Create system message in chat for customer
      if (pendingInvite.chatId) {
        await addDoc(collection(db, "chats", pendingInvite.chatId, "messages"), {
          senderId: "system",
          text: `${customerDetails?.name || 'Креатор'} принял приглашение`,
          type: "invite_accepted_customer",
          creatorName: customerDetails?.name || 'Креатор',
          offerTitle: offerDetails?.title || 'Оффер',
          offerId: pendingInvite.offerId,
          createdAt: serverTimestamp(),
          isSystem: true
        });
      }

      // Mark notification as read
      await updateDoc(doc(db, "notifications", pendingInvite.id), {
        read: true
      });

      // Open chat
      if (pendingInvite.chatId && onOpenChat) {
        onOpenChat(pendingInvite.chatId);
      } else if (pendingInvite.chatId) {
        window.location.href = "/creator/messages";
      }

      setPendingInvite(null);
      setOfferDetails(null);
      setCustomerDetails(null);
    } catch (error) {
      console.error("Error accepting invite:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!pendingInvite || !user) return;

    setLoading(true);
    try {
      // Update application status to rejected
      const applicationsQuery = query(
        collection(db, "applications"),
        where("offerId", "==", pendingInvite.offerId),
        where("creatorId", "==", user.uid),
        where("status", "==", "pending")
      );

      // Mark notification as read
      await updateDoc(doc(db, "notifications", pendingInvite.id), {
        read: true
      });

      setPendingInvite(null);
      setOfferDetails(null);
      setCustomerDetails(null);
    } catch (error) {
      console.error("Error declining invite:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async () => {
    if (pendingInvite) {
      try {
        await updateDoc(doc(db, "notifications", pendingInvite.id), {
          read: true
        });
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    }
    setPendingInvite(null);
    setOfferDetails(null);
    setCustomerDetails(null);
  };

  return (
    <AnimatePresence>
      {pendingInvite && offerDetails && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-card border border-white/10 rounded-3xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-clip-primary/20 to-primary/20 p-6 relative">
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 w-8 h-8 bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-clip-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Новое приглашение!</h2>
                  <p className="text-white/80 text-sm">Вас пригласили принять участие в оффере</p>
                </div>
              </div>

              {customerDetails && (
                <div className="flex items-center gap-3 mt-4 p-3 bg-white/10 rounded-xl">
                  <User className="w-5 h-5 text-white/80" />
                  <div className="flex-1">
                    <p className="text-sm text-white/60">От:</p>
                    <p className="font-bold text-white">{customerDetails.name || "Заказчик"}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">{offerDetails.title}</h3>

                <div className="flex flex-wrap gap-3 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-clip-primary" />
                    <span className="font-mono font-bold text-clip-primary">{offerDetails.budget?.toString().replace('$', '') || 0}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-foreground/60" />
                    <span className="text-foreground/80">{offerDetails.geo}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-foreground/60" />
                    <span className="text-foreground/80">{offerDetails.paymentModel}</span>
                  </div>
                </div>
              </div>

              {offerDetails.description && (
                <div className="mb-6">
                  <h4 className="font-bold mb-2 text-foreground/80">Описание:</h4>
                  <p className="text-foreground/70 bg-white/5 p-4 rounded-xl text-sm leading-relaxed">
                    {offerDetails.description}
                  </p>
                </div>
              )}

              {offerDetails.requirements && offerDetails.requirements.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-bold mb-2 text-foreground/80">Требования:</h4>
                  <ul className="space-y-2">
                    {offerDetails.requirements.map((req: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground/70">
                        <CheckCircle2 className="w-4 h-4 text-clip-primary mt-0.5 shrink-0" />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="bg-clip-primary/5 border border-clip-primary/20 rounded-xl p-4 mb-6">
                <p className="text-sm text-foreground/70">
                  💡 <span className="font-bold">Подсказка:</span> Вы можете ознакомиться с деталями оффера и задать вопросы заказчику в чате перед принятием решения.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
                <p className="text-xs uppercase tracking-[0.16em] text-foreground/45 mb-2">Ваша выплата</p>
                <p className="font-mono font-bold text-2xl text-green-400 mb-1">
                  ${formatUsdAmount(calculateDealPricing(Number(offerDetails?.budget || 0)).creatorPayoutAmount)}
                </p>
                <p className="text-sm text-foreground/60">
                  Комиссии ADROP и платёжный escrow-fee оплачивает бренд сверху. Ваш payout не уменьшается.
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <Link href={`/creator/messages`} className="w-full">
                  <button
                    onClick={handleClose}
                    className="w-full h-12 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" /> Сначала задать вопросы
                  </button>
                </Link>

                <div className="flex gap-3">
                  <button
                    onClick={handleDecline}
                    disabled={loading}
                    className="flex-1 h-12 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" /> Отклонить
                  </button>
                  <button
                    onClick={handleAccept}
                    disabled={loading}
                    className="flex-1 h-12 bg-clip-primary hover:bg-clip-primary/90 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-clip-primary/20 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Принять приглашение
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
