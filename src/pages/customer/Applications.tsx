import { useState, useEffect } from "react";
import { query, collection, where, onSnapshot, doc, getDoc, updateDoc, deleteDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuthStore } from "../../store/authStore";
import { User, Check, X, Send, Calendar, Briefcase, MessageSquare, Clock, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { DealPricingSummary } from "../../components/DealPricingSummary";
import { calculateDealPricing, formatUsdAmount, isViewsPaymentModel } from "../../lib/dealPricing";
import { getAvatarSrc } from "../../lib/avatar";

interface Application {
  id: string;
  offerId: string;
  creatorId: string;
  customerId: string;
  status: "pending" | "accepted" | "rejected";
  message: string;
  createdAt: any;
  creatorPayoutAmount?: number;
  platformFeeAmount?: number;
  paymentEscrowFeeAmount?: number;
  customerTotalAmount?: number;
  platformFeeRate?: number;
  paymentEscrowFeeRate?: number;
}

interface Creator {
  id: string;
  name: string;
  avatar: string;
  email?: string;
  bio?: string;
  vertical?: string;
  pricing?: {
    ugcVideo?: { price: number };
  };
}

interface Offer {
  id: string;
  title: string;
  budget: number;
  paymentModel: string;
  paymentDetails?: {
    cpm?: number | null;
    minViews?: number | null;
    maxPayout?: number | null;
  } | null;
}

export function CustomerApplications() {
  const { user } = useAuthStore();
  const [applications, setApplications] = useState<Application[]>([]);
  const [creators, setCreators] = useState<{ [key: string]: Creator }>({});
  const [offers, setOffers] = useState<{ [key: string]: Offer }>({});
  const [filter, setFilter] = useState<"all" | "pending" | "accepted" | "rejected">("all");
  const [loading, setLoading] = useState(true);

  // Play notification sound
  const playNotificationSound = () => {
    const audio = new Audio('/notification.mp3');
    audio.play().catch(() => {});
  };

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "applications"),
      where("customerId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const appsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Application[];

      setApplications(appsData.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date();
        const dateB = b.createdAt?.toDate?.() || new Date();
        return dateB.getTime() - dateA.getTime();
      }));

      // Fetch creators data
      const creatorIds = [...new Set(appsData.map(app => app.creatorId))];
      const creatorsData: { [key: string]: Creator } = {};

      await Promise.all(
        creatorIds.map(async (creatorId) => {
          try {
            const creatorDoc = await getDoc(doc(db, "users", creatorId));
            if (creatorDoc.exists()) {
              creatorsData[creatorId] = {
                id: creatorDoc.id,
                ...creatorDoc.data()
              } as Creator;
            }
          } catch (e) {
            console.error("Error fetching creator:", e);
          }
        })
      );

      setCreators(creatorsData);

      // Fetch offers data
      const offerIds = [...new Set(appsData.map(app => app.offerId))];
      const offersData: { [key: string]: Offer } = {};

      await Promise.all(
        offerIds.map(async (offerId) => {
          try {
            const offerDoc = await getDoc(doc(db, "offers", offerId));
            if (offerDoc.exists()) {
              offersData[offerId] = {
                id: offerDoc.id,
                ...offerDoc.data()
              } as Offer;
            }
          } catch (e) {
            console.error("Error fetching offer:", e);
          }
        })
      );

      setOffers(offersData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAccept = async (application: Application) => {
    if (!user) return;

    try {
      const offer = offers[application.offerId];
      const isViewsOrder = isViewsPaymentModel(offer?.paymentModel);
      const pricingSnapshot = calculateDealPricing(Number(offers[application.offerId]?.budget || 0));

      // Update application status
      await updateDoc(doc(db, "applications", application.id), {
        status: "accepted",
        acceptedAt: serverTimestamp(),
        ...(isViewsOrder ? {
          payoutAmount: null,
          payoutStatus: null,
          holdUntil: null,
          statsReviewDueAt: null,
          actualViews: null,
          creatorPayoutAmount: null,
          platformFeeAmount: null,
          paymentEscrowFeeAmount: null,
          customerTotalAmount: null,
        } : pricingSnapshot)
      });

      // Create notification for creator
      await addDoc(collection(db, "notifications"), {
        recipientId: application.creatorId,
        senderId: user.uid,
        type: "application_accepted",
        title: "Ваш отклик принят!",
        message: `Заказчик принял ваш отклик на оффер "${offers[application.offerId]?.title}"`,
        offerId: application.offerId,
        read: false,
        createdAt: serverTimestamp()
      });

      // Create chat
      const chatRef = await addDoc(collection(db, "chats"), {
        customerId: user.uid,
        creatorId: application.creatorId,
        offerId: application.offerId,
        participantIds: [user.uid, application.creatorId],
        createdAt: serverTimestamp(),
        lastMessage: "Ваш отклик принят! Давайте обсудим детали."
      });

      // Send initial message
      await addDoc(collection(db, "chats", chatRef.id, "messages"), {
        senderId: user.uid,
        text: "Здравствуйте! Ваш отклик принят. Давайте обсудим детали задания.",
        createdAt: serverTimestamp()
      });

      // Notify creator about new chat
      await addDoc(collection(db, "notifications"), {
        recipientId: application.creatorId,
        senderId: user.uid,
        type: "new_message",
        title: "Новое сообщение",
        message: `Заказчик принял ваш отклик и начал чат`,
        chatId: chatRef.id,
        read: false,
        createdAt: serverTimestamp()
      });

      playNotificationSound();
    } catch (error) {
      console.error("Error accepting application:", error);
    }
  };

  const handleReject = async (applicationId: string, creatorId: string) => {
    if (!user) return;

    try {
      await updateDoc(doc(db, "applications", applicationId), {
        status: "rejected"
      });

      // Create notification for creator
      await addDoc(collection(db, "notifications"), {
        recipientId: creatorId,
        senderId: user.uid,
        type: "application_rejected",
        title: "Ваш отклик отклонен",
        message: "К сожалению, заказчик не смог принять ваш отклик в этот раз.",
        read: false,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error rejecting application:", error);
    }
  };

  const handleAcceptAll = async () => {
    if (!user) return;

    const pendingApps = applications.filter(app => app.status === "pending");
    if (pendingApps.length === 0) return;

    try {
      await Promise.all(
        pendingApps.map(async (application) => {
          const offer = offers[application.offerId];
          const isViewsOrder = isViewsPaymentModel(offer?.paymentModel);
          const pricingSnapshot = calculateDealPricing(Number(offers[application.offerId]?.budget || 0));

          // Update application status
          await updateDoc(doc(db, "applications", application.id), {
            status: "accepted",
            acceptedAt: serverTimestamp(),
            ...(isViewsOrder ? {
              payoutAmount: null,
              payoutStatus: null,
              holdUntil: null,
              statsReviewDueAt: null,
              actualViews: null,
              creatorPayoutAmount: null,
              platformFeeAmount: null,
              paymentEscrowFeeAmount: null,
              customerTotalAmount: null,
            } : pricingSnapshot)
          });

          // Create notification for creator
          await addDoc(collection(db, "notifications"), {
            recipientId: application.creatorId,
            senderId: user.uid,
            type: "application_accepted",
            title: "Ваш отклик принят!",
            message: `Заказчик принял ваш отклик на оффер "${offers[application.offerId]?.title}"`,
            offerId: application.offerId,
            read: false,
            createdAt: serverTimestamp()
          });

          // Create chat
          const chatRef = await addDoc(collection(db, "chats"), {
            customerId: user.uid,
            creatorId: application.creatorId,
            offerId: application.offerId,
            participantIds: [user.uid, application.creatorId],
            createdAt: serverTimestamp(),
            lastMessage: "Ваш отклик принят! Давайте обсудим детали."
          });

          // Send initial message
          await addDoc(collection(db, "chats", chatRef.id, "messages"), {
            senderId: user.uid,
            text: "Здравствуйте! Ваш отклик принят. Давайте обсудим детали задания.",
            createdAt: serverTimestamp()
          });
        })
      );

      playNotificationSound();
    } catch (error) {
      console.error("Error accepting all applications:", error);
    }
  };

  const handleRejectAll = async () => {
    if (!user) return;

    const pendingApps = applications.filter(app => app.status === "pending");
    if (pendingApps.length === 0) return;

    try {
      await Promise.all(
        pendingApps.map(async (application) => {
          await updateDoc(doc(db, "applications", application.id), {
            status: "rejected"
          });

          // Create notification for creator
          await addDoc(collection(db, "notifications"), {
            recipientId: application.creatorId,
            senderId: user.uid,
            type: "application_rejected",
            title: "Ваш отклик отклонен",
            message: "К сожалению, заказчик не смог принять ваш отклик в этот раз.",
            read: false,
            createdAt: serverTimestamp()
          });
        })
      );
    } catch (error) {
      console.error("Error rejecting all applications:", error);
    }
  };

  const filteredApplications = applications.filter(app => {
    if (filter === "all") return true;
    return app.status === filter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-medium border border-yellow-500/30">На рассмотрении</span>;
      case "accepted":
        return <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium border border-green-500/30">Принят</span>;
      case "rejected":
        return <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-medium border border-red-500/30">Отклонен</span>;
      default:
        return null;
    }
  };

  return (
    <div className="w-full px-6 sm:px-8 lg:px-12 2xl:px-16 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Отклики на офферы</h1>
          <p className="text-foreground/60">Управляйте откликами креаторов на ваши офферы</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex gap-2 p-1 bg-card border border-white/5 rounded-xl inline-flex">
          {(["all", "pending", "accepted", "rejected"] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === status
                  ? status === "pending" ? "bg-yellow-500 text-white"
                    : status === "accepted" ? "bg-green-500 text-white"
                    : status === "rejected" ? "bg-red-500 text-white"
                    : "bg-primary text-white"
                  : "text-foreground/60 hover:text-white"
              }`}
            >
              {status === "all" ? "Все" :
               status === "pending" ? "На рассмотрении" :
               status === "accepted" ? "Принятые" : "Отклоненные"}
              {status !== "all" && (
                <span className="ml-2 opacity-75">
                  {applications.filter(a => a.status === status).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Bulk Actions for pending */}
        {filter === "pending" || filter === "all" ? (
          <div className="flex gap-2 ml-auto">
            {applications.filter(a => a.status === "pending").length > 0 && (
              <>
                <button
                  onClick={handleAcceptAll}
                  className="h-10 px-4 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-xl font-medium transition-colors flex items-center gap-2 text-sm"
                >
                  <CheckCircle2 className="w-4 h-4" /> Принять все ({applications.filter(a => a.status === "pending").length})
                </button>
                <button
                  onClick={handleRejectAll}
                  className="h-10 px-4 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-xl font-medium transition-colors flex items-center gap-2 text-sm"
                >
                  <X className="w-4 h-4" /> Отклонить все
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="bg-card border border-white/5 rounded-3xl p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-foreground/60">Загрузка откликов...</p>
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="bg-card border border-white/5 rounded-3xl p-12 text-center">
          <User className="w-16 h-16 mx-auto mb-4 text-foreground/20" />
          <h3 className="text-xl font-bold mb-2">Нет откликов</h3>
          <p className="text-foreground/60 mb-6">
            {filter === "all"
              ? "У вас пока нет откликов на ваши офферы. Создайте оффер чтобы привлечь креаторов!"
              : "Нет откликов в этой категории."}
          </p>
          {filter === "all" && (
            <Link href="/customer/create-offer">
              <button className="h-12 px-8 rounded-xl font-bold bg-primary text-white hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mx-auto">
                <Briefcase className="w-5 h-5" /> Создать оффер
              </button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((application) => {
            const creator = creators[application.creatorId];
            const offer = offers[application.offerId];

            if (!creator || !offer) return null;

            return (
              <motion.div
                key={application.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-white/5 rounded-3xl p-6 hover:shadow-xl transition-all"
              >
                <div className="flex items-start gap-6">
                  {/* Creator Avatar */}
                  <img
                    src={getAvatarSrc(creator.avatar, creator.name, "creator")}
                    alt={creator.name}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-white/10"
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <h3 className="text-xl font-bold mb-1">{creator.name}</h3>
                        {creator.bio && (
                          <p className="text-sm text-foreground/60 line-clamp-2 mb-2">{creator.bio}</p>
                        )}
                        {creator.vertical && (
                          <span className="inline-block px-3 py-1 bg-white/5 rounded-lg text-xs font-medium text-foreground/60">
                            {creator.vertical}
                          </span>
                        )}
                      </div>
                      {getStatusBadge(application.status)}
                    </div>

                    {/* Offer Info */}
                    <div className="flex items-center gap-4 text-sm text-foreground/60 mb-4">
                      <div className="flex items-center gap-1">
                        <Briefcase className="w-4 h-4" />
                        <span>Оффер: {offer.title}</span>
                      </div>
                      {offer.budget && (
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-bold text-green-400">${offer.budget}</span>
                        </div>
                      )}
                    </div>

                    {/* Application Message */}
                    {application.message && (
                      <div className="bg-white/5 rounded-xl p-4 mb-4 border border-white/10">
                        <p className="text-sm text-foreground/80">"{application.message}"</p>
                      </div>
                    )}

                    <div className="mb-4">
                      <DealPricingSummary
                        pricing={{ ...application, paymentModel: offer.paymentModel, paymentDetails: offer.paymentDetails }}
                        fallbackPayoutAmount={Number(offer.budget || 0)}
                        title="Экономика сделки"
                        compact
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-foreground/40">
                        <Clock className="w-3 h-3" />
                        {application.createdAt?.toDate
                          ? new Date(application.createdAt.toDate()).toLocaleString('ru-RU', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'Недавно'}
                      </div>

                      {application.status === "pending" && (
                        <div className="flex gap-2">
                          <Link href={`/customer/creators`} className="h-10 px-4 rounded-xl border border-white/10 hover:bg-white/5 font-medium transition-colors flex items-center gap-2 text-sm">
                            <User className="w-4 h-4" /> Профиль
                          </Link>
                          <button
                            onClick={() => handleReject(application.id, application.creatorId)}
                            className="h-10 px-4 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 font-medium transition-colors flex items-center gap-2 text-sm"
                          >
                            <X className="w-4 h-4" /> Отклонить
                          </button>
                          <button
                            onClick={() => handleAccept(application)}
                            className="h-10 px-4 rounded-xl bg-green-500 hover:bg-green-600 text-white font-medium transition-colors flex items-center gap-2 text-sm shadow-lg shadow-green-500/20"
                          >
                            <CheckCircle2 className="w-4 h-4" /> {isViewsPaymentModel(offer.paymentModel)
                              ? "Принять с оплатой по просмотрам"
                              : `Принять за $${formatUsdAmount(
                                  application.customerTotalAmount ||
                                  calculateDealPricing(Number(offer.budget || 0)).customerTotalAmount,
                                )}`}
                          </button>
                        </div>
                      )}

                      {application.status === "accepted" && (
                        <Link href={`/customer/messages`}>
                          <button className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium transition-colors flex items-center gap-2 text-sm shadow-lg shadow-primary/20">
                            <MessageSquare className="w-4 h-4" /> Открыть чат
                          </button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
