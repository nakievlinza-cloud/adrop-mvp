import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { Search, Filter, CheckCircle2, XCircle, MessageSquare, ExternalLink, Clock, PlayCircle, X, ShieldCheck, AlertTriangle, Check, LayoutGrid, List, Star } from "lucide-react";
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc, getDocs, addDoc, serverTimestamp, increment, Timestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuthStore } from "../../store/authStore";
import {
  calculateDealPricing,
  calculateViewsPayout,
  formatUsdAmount,
  getCreatorPayoutAmount,
  getViewsMaxDealPricing,
  getViewsPaymentMeta,
  getViewsReviewDueDate,
  hasFinalizedViewsPricing,
  isViewsPaymentModel,
  resolveDealPricing,
} from "../../lib/dealPricing";
import { getAvatarSrc } from "../../lib/avatar";

interface Application {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar: string;
  offerId: string;
  offerTitle: string;
  status: string;
  message: string;
  rejectReason?: string;
  price: number;
  escrowStatus: string | null;
  paymentModel: string;
  promoCode?: string;
  trackingLink?: string;
  stats?: { clicks: number; registrations: number };
  createdAt: any;
  completedAt?: any;
  reviewId?: string;
  reviewRating?: number;
  payoutStatus?: string;
  holdUntil?: any;
  statsReviewDueAt?: any;
  actualViews?: number;
  paymentDetails?: {
    cpm?: number | null;
    minViews?: number | null;
    maxPayout?: number | null;
  } | null;
  offerType?: string;
  creatorPayoutAmount?: number;
  platformFeeAmount?: number;
  paymentEscrowFeeAmount?: number;
  customerTotalAmount?: number;
  platformFeeRate?: number;
  paymentEscrowFeeRate?: number;
}

const REJECT_REASONS = [
  "Не соответствует тематике",
  "Недостаточный охват аудитории",
  "Слишком высокая цена",
  "Плохое качество контента в портфолио",
  "Другое"
];

const CREATOR_PAYOUT_HOLD_MS = 7 * 24 * 60 * 60 * 1000;

export function CustomerOrders() {
  const { user, userData } = useAuthStore();
  const [applications, setApplications] = useState<Application[]>([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState(REJECT_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<Application | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewsMap, setReviewsMap] = useState<Record<string, any>>({});
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [disputeTarget, setDisputeTarget] = useState<Application | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [viewsSettlementModalOpen, setViewsSettlementModalOpen] = useState(false);
  const [viewsSettlementTarget, setViewsSettlementTarget] = useState<Application | null>(null);
  const [actualViewsInput, setActualViewsInput] = useState("");
  const [settlementSubmitting, setSettlementSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "applications"), where("customerId", "==", user.uid));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const appsData = await Promise.all(snapshot.docs.map(async (docSnapshot) => {
        const data = docSnapshot.data();
        
        // Fetch creator details
        let creatorName = "Креатор";
        let creatorAvatar = getAvatarSrc(null, creatorName, "creator");
        try {
          const creatorDoc = await getDoc(doc(db, "users", data.creatorId));
          if (creatorDoc.exists()) {
            creatorName = creatorDoc.data().name || creatorName;
            creatorAvatar = getAvatarSrc(
              creatorDoc.data().avatarUrl || creatorDoc.data().avatar,
              creatorName,
              "creator",
            );
          }
        } catch (e) {
          console.error("Error fetching creator:", e);
        }

        // Fetch offer details
        let offerTitle = "Оффер";
        let price = 0;
        let paymentModel = "Фикс";
        let offerType = "ugc";
        let paymentDetails = null;
        try {
          const offerDoc = await getDoc(doc(db, "offers", data.offerId));
          if (offerDoc.exists()) {
            offerTitle = offerDoc.data().title || offerTitle;
            price = offerDoc.data().budget || 0;
            paymentModel = offerDoc.data().paymentModel || paymentModel;
            offerType = offerDoc.data().type || offerType;
            paymentDetails = offerDoc.data().paymentDetails || null;
          }
        } catch (e) {
          console.error("Error fetching offer:", e);
        }

        return {
          id: docSnapshot.id,
          ...data,
          creatorName,
          creatorAvatar,
          offerTitle,
          price,
          paymentModel,
          paymentDetails,
          offerType,
          escrowStatus: data.escrowStatus || null,
          stats: data.stats || { clicks: 0, registrations: 0 }
        } as Application;
      }));
      setApplications(appsData);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "reviews"), where("customerId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const nextMap: Record<string, any> = {};
      snapshot.docs.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        if (data.applicationId) {
          nextMap[data.applicationId] = { id: docSnapshot.id, ...data };
        }
      });
      setReviewsMap(nextMap);
    });

    return () => unsubscribe();
  }, [user]);

  const filteredApplications = applications.filter(app => {
    const matchStatus = filterStatus === "all" || app.status === filterStatus;
    const matchSearch = app.creatorName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        app.offerTitle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  const getViewsOrderState = (app: Application) => {
    const isViewsOrder = isViewsPaymentModel(app.paymentModel);
    const viewsMeta = getViewsPaymentMeta({ ...app, price: Number(app.price || 0) });
    const maxDealPricing = getViewsMaxDealPricing({ ...app, price: Number(app.price || 0) });
    const finalized = hasFinalizedViewsPricing(app);
    const statsReviewDate = getViewsReviewDueDate(app);
    const collectingStats = isViewsOrder && app.payoutStatus === "collecting_stats";
    const statsCollectionActive = collectingStats && !!statsReviewDate && statsReviewDate > new Date();
    const statsCollectionReady = collectingStats && !!statsReviewDate && statsReviewDate <= new Date();
    const finalDealPricing = finalized
      ? resolveDealPricing(app, Number(app.price || 0))
      : maxDealPricing;

    return {
      isViewsOrder,
      viewsMeta,
      maxDealPricing,
      finalized,
      statsReviewDate,
      collectingStats,
      statsCollectionActive,
      statsCollectionReady,
      finalDealPricing,
    };
  };

  const openViewsSettlementModal = (app: Application) => {
    setViewsSettlementTarget(app);
    setActualViewsInput(app.actualViews ? String(app.actualViews) : "");
    setViewsSettlementModalOpen(true);
  };

  const closeViewsSettlementModal = () => {
    setViewsSettlementModalOpen(false);
    setViewsSettlementTarget(null);
    setActualViewsInput("");
  };

  const handleAccept = async (id: string) => {
    try {
      const app = applications.find(a => a.id === id);
      const isViewsOrder = isViewsPaymentModel(app?.paymentModel);
      const pricingSnapshot = calculateDealPricing(Number(app?.price || 0));

      await updateDoc(doc(db, "applications", id), {
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

      if (app && user) {
        // Check if chat already exists
        const q = query(
          collection(db, "chats"),
          where("customerId", "==", user.uid),
          where("creatorId", "==", app.creatorId),
          where("offerId", "==", app.offerId)
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          // Create new chat
          const chatRef = await addDoc(collection(db, "chats"), {
            customerId: user.uid,
            creatorId: app.creatorId,
            offerId: app.offerId,
            participantIds: [user.uid, app.creatorId],
            unread: 0,
            createdAt: serverTimestamp(),
            lastMessage: "Ваш отклик принят!"
          });

          // Send initial message
          await addDoc(collection(db, "chats", chatRef.id, "messages"), {
            senderId: user.uid,
            text: "Здравствуйте! Ваш отклик принят. Ожидаю ссылку на готовое видео.",
            createdAt: serverTimestamp()
          });
        }
      }
    } catch (error) {
      console.error("Error accepting application:", error);
    }
  };

  const handleApproveReport = async (id: string) => {
    try {
      const app = applications.find(a => a.id === id);
      if (!app) return;

      const isViewsOrder = isViewsPaymentModel(app.paymentModel);
      if (isViewsOrder) {
        const statsReviewDueAt = Timestamp.fromDate(new Date(Date.now() + CREATOR_PAYOUT_HOLD_MS));

        await updateDoc(doc(db, "applications", id), {
          status: "completed",
          completedAt: serverTimestamp(),
          payoutStatus: "collecting_stats",
          statsReviewDueAt,
          holdUntil: null,
          payoutAmount: null,
          actualViews: null,
          creatorPayoutAmount: null,
          platformFeeAmount: null,
          paymentEscrowFeeAmount: null,
          customerTotalAmount: null,
        });

        await addDoc(collection(db, "notifications"), {
          recipientId: app.creatorId,
          senderId: user.uid,
          type: "work_hold",
          title: "Работа принята, идёт сбор статистики",
          message: "Ролик принят. Финальная выплата будет рассчитана через 7 дней по фактическим просмотрам.",
          applicationId: id,
          offerId: app.offerId,
          read: false,
          createdAt: serverTimestamp()
        });

        const q = query(
          collection(db, "chats"),
          where("offerId", "==", app.offerId),
          where("creatorId", "==", app.creatorId)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const chatId = snapshot.docs[0].id;
          await addDoc(collection(db, "chats", chatId, "messages"), {
            senderId: "system",
            text: "✅ Работа принята. Собираем статистику 7 дней, затем бренд зафиксирует финальную сумму по просмотрам.",
            type: "views_results_pending",
            createdAt: serverTimestamp(),
            isSystem: true
          });
          await updateDoc(doc(db, "chats", chatId), {
            lastMessage: "Работа принята. Идёт сбор статистики 7 дней",
            updatedAt: serverTimestamp()
          });
        }

        return;
      }

      const payoutAmount = getCreatorPayoutAmount(app, Number(app.price || 0));
      const holdUntil = Timestamp.fromDate(new Date(Date.now() + CREATOR_PAYOUT_HOLD_MS));

      await updateDoc(doc(db, "applications", id), {
        status: "completed",
        completedAt: serverTimestamp(),
        payoutAmount: payoutAmount,
        payoutStatus: "hold",
        holdUntil
      });

      await addDoc(collection(db, "notifications"), {
        recipientId: app.creatorId,
        senderId: user.uid,
        type: "work_hold",
        title: "Работа принята (холд)",
        message: "Работа принята. Выплата будет доступна через 7 дней, если ролик остаётся опубликованным.",
        applicationId: id,
        offerId: app.offerId,
        read: false,
        createdAt: serverTimestamp()
      });

      const q = query(
        collection(db, "chats"),
        where("offerId", "==", app.offerId),
        where("creatorId", "==", app.creatorId)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const chatId = snapshot.docs[0].id;
        await addDoc(collection(db, "chats", chatId, "messages"), {
          senderId: "system",
          text: "✅ Работа принята. Выплата уйдёт в hold на 7 дней.",
          type: "work_hold",
          createdAt: serverTimestamp(),
          isSystem: true
        });
        await updateDoc(doc(db, "chats", chatId), {
          lastMessage: "Работа принята. Выплата в hold на 7 дней",
          updatedAt: serverTimestamp()
        });
      }

      openReviewModal(app);
    } catch (error) {
      console.error("Error approving report:", error);
    }
  };

  const handleFinalizeViewsPayout = async () => {
    if (!viewsSettlementTarget || !user || settlementSubmitting) return;

    const settlement = calculateViewsPayout(Number(actualViewsInput || 0), {
      ...viewsSettlementTarget,
      price: Number(viewsSettlementTarget.price || 0),
    });

    setSettlementSubmitting(true);
    try {
      await updateDoc(doc(db, "applications", viewsSettlementTarget.id), {
        payoutStatus: "paid",
        paidAt: serverTimestamp(),
        holdUntil: null,
        actualViews: settlement.actualViews,
        resultsCapturedAt: serverTimestamp(),
        payoutAmount: settlement.creatorPayoutAmount,
        creatorPayoutAmount: settlement.creatorPayoutAmount,
        platformFeeAmount: settlement.platformFeeAmount,
        paymentEscrowFeeAmount: settlement.paymentEscrowFeeAmount,
        customerTotalAmount: settlement.customerTotalAmount,
      });

      await updateDoc(doc(db, "users", viewsSettlementTarget.creatorId), {
        balance: increment(settlement.creatorPayoutAmount)
      });

      await addDoc(collection(db, "notifications"), {
        recipientId: viewsSettlementTarget.creatorId,
        senderId: user.uid,
        type: "work_approved",
        title: "Статистика зафиксирована",
        message: `За ${settlement.actualViews.toLocaleString("ru-RU")} просмотров начислено $${formatUsdAmount(settlement.creatorPayoutAmount)}.`,
        applicationId: viewsSettlementTarget.id,
        offerId: viewsSettlementTarget.offerId,
        amount: settlement.creatorPayoutAmount,
        read: false,
        createdAt: serverTimestamp()
      });

      const q = query(
        collection(db, "chats"),
        where("offerId", "==", viewsSettlementTarget.offerId),
        where("creatorId", "==", viewsSettlementTarget.creatorId)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const chatId = snapshot.docs[0].id;
        await addDoc(collection(db, "chats", chatId, "messages"), {
          senderId: "system",
          text: `✅ Статистика зафиксирована: ${settlement.actualViews.toLocaleString("ru-RU")} просмотров. Начислено $${formatUsdAmount(settlement.creatorPayoutAmount)}.`,
          type: "work_approved",
          createdAt: serverTimestamp(),
          isSystem: true
        });
        await updateDoc(doc(db, "chats", chatId), {
          lastMessage: "Статистика зафиксирована. Выплата начислена",
          updatedAt: serverTimestamp()
        });
      }

      closeViewsSettlementModal();
    } catch (error) {
      console.error("Error finalizing views payout:", error);
    } finally {
      setSettlementSubmitting(false);
    }
  };

  const handleReleaseHold = async (app: Application) => {
    if (!user) return;
    try {
      const payoutAmount = getCreatorPayoutAmount(app, Number(app.price || 0));
      const holdDate = app.holdUntil?.toDate ? app.holdUntil.toDate() : null;

      if (!holdDate || holdDate > new Date()) {
        window.alert("Выплату нельзя разблокировать раньше, чем закончится 7-дневный hold.");
        return;
      }

      await updateDoc(doc(db, "applications", app.id), {
        payoutStatus: "paid",
        paidAt: serverTimestamp()
      });

      await updateDoc(doc(db, "users", app.creatorId), {
        balance: increment(payoutAmount)
      });

      await addDoc(collection(db, "notifications"), {
        recipientId: app.creatorId,
        senderId: user.uid,
        type: "work_approved",
        title: "Выплата разблокирована",
        message: `Холд завершён. Начислено $${payoutAmount}.`,
        applicationId: app.id,
        offerId: app.offerId,
        amount: payoutAmount,
        read: false,
        createdAt: serverTimestamp()
      });

      const q = query(
        collection(db, "chats"),
        where("offerId", "==", app.offerId),
        where("creatorId", "==", app.creatorId)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const chatId = snapshot.docs[0].id;
        await addDoc(collection(db, "chats", chatId, "messages"), {
          senderId: "system",
          text: `✅ Холд завершён. Начислено $${payoutAmount}.`,
          type: "work_approved",
          createdAt: serverTimestamp(),
          isSystem: true
        });
        await updateDoc(doc(db, "chats", chatId), {
          lastMessage: "Холд завершён. Начислено на баланс",
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Error releasing hold:", error);
    }
  };

  const handleRejectReport = async (id: string) => {
    try {
      const app = applications.find(a => a.id === id);
      if (!app) return;

      // Return to accepted status
      await updateDoc(doc(db, "applications", id), {
        status: "accepted",
        reportLink: null,
        requirementsMet: null,
        submittedAt: null
      });

      // Notify creator
      await addDoc(collection(db, "notifications"), {
        recipientId: app.creatorId,
        senderId: user.uid,
        type: "work_rejected",
        title: "Требуются доработки",
        message: `Заказчик отклонил работу. Пожалуйста, внесите изменения и отправьте повторно.`,
        applicationId: id,
        offerId: app.offerId,
        read: false,
        createdAt: serverTimestamp()
      });

      // Send system message to chat
      const q = query(
        collection(db, "chats"),
        where("offerId", "==", app.offerId),
        where("creatorId", "==", app.creatorId)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const chatId = snapshot.docs[0].id;
        await addDoc(collection(db, "chats", chatId, "messages"), {
          senderId: "system",
          text: `❌ Работа отклонена. Требуются доработки. Пожалуйста, свяжитесь с заказчиком в чате для уточнения деталей.`,
          type: "work_rejected",
          createdAt: serverTimestamp(),
          isSystem: true
        });
      }
    } catch (error) {
      console.error("Error rejecting report:", error);
    }
  };

  const handleMoveStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "applications", id), {
        status: newStatus
      });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };


  const openDisputeModal = (app: Application) => {
    setDisputeTarget(app);
    setDisputeReason("");
    setDisputeModalOpen(true);
  };

  const handleDispute = async () => {
    if (!disputeTarget || !user) return;
    try {
      await updateDoc(doc(db, "applications", disputeTarget.id), {
        escrowStatus: "disputed",
        disputeReason: disputeReason.trim() || null,
        disputeCreatedAt: serverTimestamp()
      });

      await addDoc(collection(db, "notifications"), {
        recipientId: disputeTarget.creatorId,
        senderId: user.uid,
        type: "dispute_opened",
        title: "Открыта претензия",
        message: "Бренд открыл претензию по заказу. Проверьте детали в чате.",
        applicationId: disputeTarget.id,
        offerId: disputeTarget.offerId,
        read: false,
        createdAt: serverTimestamp()
      });

      setDisputeModalOpen(false);
      setDisputeTarget(null);
      setDisputeReason("");
    } catch (error) {
      console.error("Error creating dispute:", error);
    }
  };

  const openRejectModal = (id: string) => {
    setSelectedAppId(id);
    setRejectReason(REJECT_REASONS[0]);
    setCustomReason("");
    setRejectModalOpen(true);
  };

  const openReviewModal = (app: Application) => {
    setReviewTarget(app);
    setReviewRating(5);
    setReviewText("");
    setReviewModalOpen(true);
  };

  const viewsSettlementPreview = viewsSettlementTarget
    ? calculateViewsPayout(Number(actualViewsInput || 0), {
        ...viewsSettlementTarget,
        price: Number(viewsSettlementTarget.price || 0),
      })
    : null;

  const handleSubmitReview = async () => {
    if (!user || !reviewTarget) return;
    if (reviewSubmitting) return;

    setReviewSubmitting(true);
    try {
      const reviewRef = await addDoc(collection(db, "reviews"), {
        applicationId: reviewTarget.id,
        offerId: reviewTarget.offerId,
        offerTitle: reviewTarget.offerTitle,
        creatorId: reviewTarget.creatorId,
        customerId: user.uid,
        customerName: userData?.name || user.email || "Бренд",
        rating: reviewRating,
        comment: reviewText.trim() || null,
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, "applications", reviewTarget.id), {
        reviewId: reviewRef.id,
        reviewRating: reviewRating,
        reviewedAt: serverTimestamp()
      });

      const creatorRef = doc(db, "users", reviewTarget.creatorId);
      const creatorSnap = await getDoc(creatorRef);
      if (creatorSnap.exists()) {
        const creatorData = creatorSnap.data();
        const prevRating = Number(creatorData.rating || 0);
        const prevCount = Number(creatorData.reviews || 0);
        const newCount = prevCount + 1;
        const newRating = prevCount > 0 ? (prevRating * prevCount + reviewRating) / newCount : reviewRating;

        await updateDoc(creatorRef, {
          rating: Number(newRating.toFixed(2)),
          reviews: newCount
        });
      }

      await addDoc(collection(db, "notifications"), {
        recipientId: reviewTarget.creatorId,
        senderId: user.uid,
        type: "review_received",
        title: "Новый отзыв",
        message: `Бренд оставил отзыв (${reviewRating}★).`,
        offerId: reviewTarget.offerId,
        applicationId: reviewTarget.id,
        reviewId: reviewRef.id,
        rating: reviewRating,
        read: false,
        createdAt: serverTimestamp()
      });

      setReviewModalOpen(false);
      setReviewTarget(null);
    } catch (error) {
      console.error("Error submitting review:", error);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (selectedAppId === null) return;
    
    const finalReason = rejectReason === "Другое" ? customReason : rejectReason;
    
    try {
      await updateDoc(doc(db, "applications", selectedAppId), {
        status: "rejected",
        rejectReason: finalReason
      });
      setRejectModalOpen(false);
      setSelectedAppId(null);
    } catch (error) {
      console.error("Error rejecting application:", error);
    }
  };

  return (
    <div className="w-full px-6 sm:px-8 lg:px-12 2xl:px-16 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Отклики и Заказы</h1>
          <p className="text-foreground/60">Управляйте заявками от креаторов и процессом выполнения.</p>
        </div>
        
        <div className="flex bg-card border border-white/10 rounded-lg p-1">
          <button 
            onClick={() => setViewMode("kanban")}
            className={`p-2 rounded-md transition-colors ${viewMode === "kanban" ? "bg-primary text-white" : "text-foreground/60 hover:text-white"}`}
            title="Канбан доска"
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-md transition-colors ${viewMode === "list" ? "bg-primary text-white" : "text-foreground/60 hover:text-white"}`}
            title="Список"
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/50" />
          <input 
            type="text" 
            placeholder="Поиск по имени или офферу..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 bg-card border border-white/10 rounded-lg pl-10 pr-4 focus:outline-none focus:border-primary transition-colors text-sm"
          />
        </div>
        <div className="flex gap-2 p-1 bg-card border border-white/5 rounded-lg inline-flex overflow-x-auto">
          {(["all", "pending", "accepted", "in_review", "completed", "rejected"] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                filterStatus === status 
                  ? "bg-primary text-white" 
                  : "text-foreground/60 hover:text-white"
              }`}
            >
              {status === "all" ? "Все" :
               status === "pending" ? "Новые отклики" :
               status === "accepted" ? "Принят в работу" :
               status === "in_review" ? "На согласовании" :
               status === "completed" ? "Заказ выполнен" : "Отклонены"}
            </button>
          ))}
        </div>
      </div>

      {viewMode === "kanban" ? (
        <div className="flex gap-6 overflow-x-auto pb-8 snap-x">
          {([
            { id: "pending", title: "Отклики" },
            { id: "accepted", title: "Принят в работу" },
            { id: "in_review", title: "На согласовании" },
            { id: "completed", title: "Заказ выполнен" }
          ] as const).map(column => {
            const columnApps = applications.filter(app => app.status === column.id && (
              app.creatorName.toLowerCase().includes(searchQuery.toLowerCase()) || 
              app.offerTitle.toLowerCase().includes(searchQuery.toLowerCase())
            ));

            if (filterStatus !== "all" && filterStatus !== column.id) return null;

            return (
              <div key={column.id} className="min-w-[340px] w-[340px] flex flex-col snap-start">
                <div className="flex items-center justify-between mb-4 px-2">
                  <h3 className="font-bold text-lg">{column.title}</h3>
                  <span className="bg-white/10 text-white text-xs font-bold px-2.5 py-1 rounded-full">{columnApps.length}</span>
                </div>
                
                <div className="flex flex-col gap-4 bg-white/5 rounded-2xl p-3 min-h-[200px]">
                  <AnimatePresence>
                  {columnApps.map((app, index) => {
                      const holdDate = app.holdUntil?.toDate ? app.holdUntil.toDate() : null;
                      const holdActive = app.payoutStatus === "hold" && holdDate && holdDate > new Date();
                      const holdReady = app.payoutStatus === "hold" && holdDate && holdDate <= new Date();
                      const viewsState = getViewsOrderState(app);
                      const dealPricing = viewsState.isViewsOrder && !viewsState.finalized
                        ? viewsState.maxDealPricing
                        : resolveDealPricing(app, Number(app.price || 0));

                      return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: index * 0.05 }}
                        key={app.id}
                        className="bg-card border border-white/10 rounded-xl p-4 hover:border-white/20 transition-colors shadow-lg flex flex-col gap-4"
                      >
                        <div className="flex items-start gap-3">
                          <img src={app.creatorAvatar} alt={app.creatorName} className="w-10 h-10 rounded-full border border-white/10" />
                          <div className="flex-1 overflow-hidden">
                            <h3 className="font-bold text-sm truncate">{app.creatorName}</h3>
                            <p className="text-xs text-foreground/60 truncate">{app.offerTitle}</p>
                          </div>
                        </div>

                        <div className="text-xs text-foreground/80 italic line-clamp-2">"{app.message}"</div>

                        {app.status === "pending" && (
                          <div className="flex gap-2 w-full mt-auto">
                            <button 
                              onClick={() => handleAccept(app.id)}
                              className="flex-1 h-9 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg font-medium transition-colors flex items-center justify-center gap-1 text-xs"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Принять
                            </button>
                            <button 
                              onClick={() => openRejectModal(app.id)}
                              className="flex-1 h-9 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg font-medium transition-colors flex items-center justify-center gap-1 text-xs"
                            >
                              <XCircle className="w-3 h-3" /> Отклонить
                            </button>
                          </div>
                        )}

                        {(app.status === "accepted" || app.status === "in_review") && (
                          <div className="w-full flex flex-col gap-3 mt-auto">
                            <div className="flex items-center justify-between bg-white/5 rounded-lg p-2 border border-white/10">
                              <div className="flex flex-col">
                                <span className="text-[10px] text-foreground/60">{viewsState.isViewsOrder && !viewsState.finalized ? "Ставка" : "Креатор получает"}</span>
                                <span className="font-mono font-bold text-sm text-green-400">
                                  {viewsState.isViewsOrder && !viewsState.finalized
                                    ? `$${formatUsdAmount(viewsState.viewsMeta.cpm)} / 1K`
                                    : `$${formatUsdAmount(dealPricing.creatorPayoutAmount)}`}
                                </span>
                              </div>
                              <div className="flex flex-col text-right">
                                <span className="text-[10px] text-foreground/60">{viewsState.isViewsOrder && !viewsState.finalized ? "Максимум для бренда" : "Итого для бренда"}</span>
                                <span className="font-mono font-bold text-sm">${formatUsdAmount(dealPricing.customerTotalAmount)}</span>
                              </div>
                              {app.escrowStatus === "held" && (
                                <div className="flex items-center gap-1 text-[10px] font-medium text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded border border-yellow-400/20">
                                  <ShieldCheck className="w-3 h-3" /> В холде
                                </div>
                              )}
                              {app.escrowStatus === "disputed" && (
                                <div className="flex items-center gap-1 text-[10px] font-medium text-red-400 bg-red-400/10 px-2 py-1 rounded border border-red-400/20">
                                  <AlertTriangle className="w-3 h-3" /> Арбитраж
                                </div>
                              )}
                            </div>
                            {viewsState.isViewsOrder && !viewsState.finalized && (
                              <div className="text-[10px] text-foreground/60 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5">
                                Финальная сумма фиксируется через 7 дней по фактическим просмотрам. Лимит: до ${formatUsdAmount(viewsState.viewsMeta.maxPayout)} креатору.
                              </div>
                            )}

                            {/* CPA Tracking Section */}
                            {app.paymentModel === "CPA" && (
                              <div className="bg-primary/5 border border-primary/20 rounded-lg p-2 space-y-2">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-[10px] font-bold text-primary">Трекинг (CPA)</span>
                                  <div className="flex gap-2 text-[10px]">
                                    <span className="text-foreground/60">Клики: <span className="text-white font-mono">{app.stats?.clicks || 0}</span></span>
                                    <span className="text-foreground/60">Реги: <span className="text-green-400 font-mono">{app.stats?.registrations || 0}</span></span>
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <input type="text" placeholder="Промокод" defaultValue={app.promoCode} className="w-1/3 h-7 bg-background border border-white/10 rounded px-1.5 text-[10px] focus:outline-none focus:border-primary" />
                                  <input type="text" placeholder="Ссылка" defaultValue={app.trackingLink} className="w-2/3 h-7 bg-background border border-white/10 rounded px-1.5 text-[10px] focus:outline-none focus:border-primary" />
                                </div>
                              </div>
                            )}
                            
                            <div className="flex gap-2">
                              <select
                                value={app.status}
                                onChange={(e) => handleMoveStatus(app.id, e.target.value)}
                                className="flex-1 h-9 bg-white/5 border border-white/10 rounded-lg px-2 text-xs focus:outline-none focus:border-primary appearance-none"
                              >
                                <option value="accepted">Принят в работу</option>
                                <option value="in_review">На согласовании</option>
                              </select>
                              <Link href="/customer/messages" className="flex-1">
                                <button className="w-full h-9 bg-white/5 hover:bg-white/10 rounded-lg font-medium transition-colors flex items-center justify-center gap-1 text-xs">
                                  <MessageSquare className="w-3 h-3" /> Чат
                                </button>
                              </Link>
                            </div>

                            {app.status === "in_review" && (
                              <>
                                {app.reportLink && (
                                  <div className="mb-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-[10px] font-bold text-primary">Отправлено креатором:</span>
                                      {app.requirementsMet && (
                                        <div className="flex items-center gap-1 text-[10px] font-medium text-green-400">
                                          <CheckCircle2 className="w-3 h-3" /> Требования соблюдены
                                        </div>
                                      )}
                                    </div>
                                    <a
                                      href={app.reportLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                                    >
                                      {app.reportLink} <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </div>
                                )}
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleRejectReport(app.id)}
                                    className="flex-1 h-9 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg font-medium transition-colors flex items-center justify-center gap-1 text-xs"
                                  >
                                    <XCircle className="w-3 h-3" /> Отклонить
                                  </button>
                                  <button
                                    onClick={() => handleApproveReport(app.id)}
                                    className="flex-1 h-9 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-1 text-xs"
                                  >
                                    <Check className="w-3 h-3" /> {viewsState.isViewsOrder ? "Принять и ждать статистику" : "Принять и в hold"}
                                  </button>
                                </div>
                              </>
                            )}

                            {app.escrowStatus !== "disputed" && (
                              <button 
                                onClick={() => openDisputeModal(app)}
                                className="w-full h-6 text-[10px] text-foreground/50 hover:text-red-400 transition-colors flex items-center justify-center gap-1"
                              >
                                <AlertTriangle className="w-3 h-3" /> Позвать модератора
                              </button>
                            )}
                          </div>
                        )}

                        {app.status === "completed" && (
                          <div className="w-full flex flex-col gap-2 mt-auto">
                            {viewsState.collectingStats && (
                              <>
                                <div className="flex items-center justify-between rounded-lg p-2 border bg-blue-500/10 border-blue-500/20">
                                  <div className="flex flex-col">
                                    <span className="text-[10px] text-blue-300/80">Сбор статистики</span>
                                    <span className="font-mono font-bold text-sm text-blue-300">
                                      {viewsState.viewsMeta.cpm > 0 ? `$${formatUsdAmount(viewsState.viewsMeta.cpm)} / 1K` : "CPM"}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 text-[10px] font-medium text-blue-300">
                                    <Clock className="w-3 h-3" /> 7 дней
                                  </div>
                                </div>
                                {viewsState.statsCollectionActive && viewsState.statsReviewDate && (
                                  <div className="text-[10px] text-blue-300/80 bg-blue-500/10 border border-blue-500/20 rounded-lg px-2 py-1">
                                    Проверка результатов после {viewsState.statsReviewDate.toLocaleDateString("ru-RU")}
                                  </div>
                                )}
                                {viewsState.statsCollectionReady && (
                                  <button
                                    onClick={() => openViewsSettlementModal(app)}
                                    className="h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-1 text-xs"
                                  >
                                    <Check className="w-3 h-3" /> Зафиксировать просмотры
                                  </button>
                                )}
                              </>
                            )}
                            {!viewsState.collectingStats && (
                            <div className={`flex items-center justify-between rounded-lg p-2 border ${holdActive ? "bg-yellow-500/10 border-yellow-500/20" : "bg-green-500/10 border-green-500/20"}`}>
                              <div className="flex flex-col">
                                <span className={`text-[10px] ${holdActive ? "text-yellow-400/80" : "text-green-400/80"}`}>
                                  {holdActive ? "В холде" : "Оплачено"}
                                </span>
                                <span className={`font-mono font-bold text-sm ${holdActive ? "text-yellow-400" : "text-green-400"}`}>${formatUsdAmount(Number(app.payoutAmount || dealPricing.creatorPayoutAmount || 0))}</span>
                              </div>
                              <div className={`flex items-center gap-1 text-[10px] font-medium ${holdActive ? "text-yellow-400" : "text-green-400"}`}>
                                <CheckCircle2 className="w-3 h-3" /> {holdActive ? "Холд" : "Выполнено"}
                              </div>
                            </div>
                            )}
                            {holdActive && holdDate && (
                              <div className="text-[10px] text-yellow-400/80 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-2 py-1">
                                Выплата после {holdDate.toLocaleDateString("ru-RU")}
                              </div>
                            )}
                            {holdReady && !viewsState.collectingStats && (
                              <button
                                onClick={() => handleReleaseHold(app)}
                                className="h-8 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-1 text-xs"
                              >
                                <Check className="w-3 h-3" /> Выплатить
                              </button>
                            )}
                            {!viewsState.collectingStats && (reviewsMap[app.id] || app.reviewId) ? (
                              <div className="h-8 bg-white/5 text-foreground/60 rounded-lg font-medium flex items-center justify-center text-xs border border-white/10">
                                Отзыв оставлен
                              </div>
                            ) : !viewsState.collectingStats ? (
                              <button
                                onClick={() => openReviewModal(app)}
                                className="h-8 bg-primary/15 text-primary hover:bg-primary/25 rounded-lg font-medium transition-colors flex items-center justify-center gap-1 text-xs"
                              >
                                <Star className="w-3 h-3" /> Оставить отзыв
                              </button>
                            ) : null}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                  </AnimatePresence>
                  {columnApps.length === 0 && (
                    <div className="text-center py-8 opacity-50">
                      <p className="text-xs">Нет заявок</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-4 pb-8">
          <AnimatePresence>
            {filteredApplications.map((app, index) => {
              const holdDate = app.holdUntil?.toDate ? app.holdUntil.toDate() : null;
              const holdActive = app.payoutStatus === "hold" && holdDate && holdDate > new Date();
              const holdReady = app.payoutStatus === "hold" && holdDate && holdDate <= new Date();
              const viewsState = getViewsOrderState(app);
              const dealPricing = viewsState.isViewsOrder && !viewsState.finalized
                ? viewsState.maxDealPricing
                : resolveDealPricing(app, Number(app.price || 0));

              return (
              <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
                key={app.id}
                className="bg-card border border-white/10 rounded-xl p-4 hover:border-white/20 transition-colors shadow-lg flex flex-col md:flex-row gap-4 items-start md:items-center"
              >
                <div className="flex items-center gap-4 min-w-[250px]">
                  <img src={app.creatorAvatar} alt={app.creatorName} className="w-12 h-12 rounded-full border border-white/10" />
                  <div>
                    <h3 className="font-bold text-sm">{app.creatorName}</h3>
                    <p className="text-xs text-foreground/60">{app.offerTitle}</p>
                  </div>
                </div>

                <div className="flex-1 text-sm text-foreground/80 italic line-clamp-2 md:line-clamp-1">
                  "{app.message}"
                </div>

                  <div className="flex items-center gap-4 min-w-[150px]">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-foreground/60">Статус</span>
                    <span className="font-medium text-sm">
                      {app.status === "pending" ? "Новый отклик" :
                       app.status === "accepted" ? "Принят в работу" :
                       app.status === "in_review" ? "На согласовании" :
                       app.status === "completed" ? "Завершен" : "Отклонен"}
                    </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-foreground/60">{viewsState.isViewsOrder && !viewsState.finalized ? "Ставка" : "Креатор"}</span>
                      <span className="font-mono font-bold text-sm text-green-400">
                        {viewsState.isViewsOrder && !viewsState.finalized
                          ? `$${formatUsdAmount(viewsState.viewsMeta.cpm)} / 1K`
                          : `$${formatUsdAmount(dealPricing.creatorPayoutAmount)}`}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-foreground/60">{viewsState.isViewsOrder && !viewsState.finalized ? "Максимум" : "Итого"}</span>
                      <span className="font-mono font-bold text-sm">${formatUsdAmount(dealPricing.customerTotalAmount)}</span>
                    </div>
                  </div>

                <div className="flex items-center gap-2 w-full md:w-auto mt-4 md:mt-0">
                  {app.status === "pending" && (
                    <>
                      <button 
                        onClick={() => handleAccept(app.id)}
                        className="flex-1 md:flex-none h-9 px-4 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg font-medium transition-colors flex items-center justify-center gap-1 text-xs"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Принять
                      </button>
                      <button 
                        onClick={() => openRejectModal(app.id)}
                        className="flex-1 md:flex-none h-9 px-4 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg font-medium transition-colors flex items-center justify-center gap-1 text-xs"
                      >
                        <XCircle className="w-3 h-3" /> Отклонить
                      </button>
                    </>
                  )}

                  {(app.status === "accepted" || app.status === "in_review") && (
                    <>
                      <select 
                        value={app.status}
                        onChange={(e) => handleMoveStatus(app.id, e.target.value)}
                        className="flex-1 md:flex-none h-9 bg-white/5 border border-white/10 rounded-lg px-2 text-xs focus:outline-none focus:border-primary appearance-none"
                      >
                        <option value="accepted">Принят в работу</option>
                        <option value="in_review">На согласовании</option>
                      </select>
                      <Link href="/customer/messages" className="flex-1 md:flex-none">
                        <button className="w-full h-9 px-4 bg-white/5 hover:bg-white/10 rounded-lg font-medium transition-colors flex items-center justify-center gap-1 text-xs">
                          <MessageSquare className="w-3 h-3" /> Чат
                        </button>
                      </Link>
                      {(app.status === "in_review") && (
                        <div className="flex-1 md:flex-none flex gap-2">
                          {app.reportLink && (
                            <a
                              href={app.reportLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="h-9 px-3 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 rounded-lg font-medium transition-colors flex items-center justify-center gap-1 text-xs"
                              title="Открыть ссылку"
                            >
                              <ExternalLink className="w-3 h-3" /> Ссылка
                            </a>
                          )}
                          <button
                            onClick={() => handleApproveReport(app.id)}
                            className="h-9 px-4 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-1 text-xs"
                          >
                            <Check className="w-3 h-3" /> {viewsState.isViewsOrder ? "Принять и ждать статистику" : "Принять и в hold"}
                          </button>
                          <button
                            onClick={() => handleRejectReport(app.id)}
                            className="h-9 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-1 text-xs"
                          >
                            <XCircle className="w-3 h-3" /> Отклонить
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {app.status === "completed" && (
                    <>
                      {viewsState.collectingStats ? (
                        <div className="flex-1 md:flex-none h-9 px-4 rounded-lg font-medium flex items-center justify-center gap-1 text-xs border bg-blue-500/10 text-blue-300 border-blue-500/20">
                          <Clock className="w-3 h-3" /> {viewsState.statsCollectionReady ? "Ждёт фиксации просмотров" : "Собираем статистику"}
                        </div>
                      ) : (
                        <div className={`flex-1 md:flex-none h-9 px-4 rounded-lg font-medium flex items-center justify-center gap-1 text-xs border ${holdActive ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" : "bg-green-500/10 text-green-400 border-green-500/20"}`}>
                          <CheckCircle2 className="w-3 h-3" /> {holdActive ? "Холд" : "Выполнено"}
                        </div>
                      )}
                      {holdActive && holdDate && !viewsState.collectingStats && (
                        <div className="flex-1 md:flex-none h-9 px-4 bg-yellow-500/10 text-yellow-400 rounded-lg font-medium flex items-center justify-center text-xs border border-yellow-500/20">
                          Выплата после {holdDate.toLocaleDateString("ru-RU")}
                        </div>
                      )}
                      {viewsState.collectingStats && viewsState.statsCollectionActive && viewsState.statsReviewDate && (
                        <div className="flex-1 md:flex-none h-9 px-4 bg-blue-500/10 text-blue-300 rounded-lg font-medium flex items-center justify-center text-xs border border-blue-500/20">
                          Проверка после {viewsState.statsReviewDate.toLocaleDateString("ru-RU")}
                        </div>
                      )}
                      {viewsState.collectingStats && viewsState.statsCollectionReady && (
                        <button
                          onClick={() => openViewsSettlementModal(app)}
                          className="flex-1 md:flex-none h-9 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-1 text-xs"
                        >
                          <Check className="w-3 h-3" /> Зафиксировать просмотры
                        </button>
                      )}
                      {holdReady && !viewsState.collectingStats && (
                        <button
                          onClick={() => handleReleaseHold(app)}
                          className="flex-1 md:flex-none h-9 px-4 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-1 text-xs"
                        >
                          <Check className="w-3 h-3" /> Выплатить
                        </button>
                      )}
                      {!viewsState.collectingStats && (reviewsMap[app.id] || app.reviewId) ? (
                        <div className="flex-1 md:flex-none h-9 px-4 bg-white/5 text-foreground/60 rounded-lg font-medium flex items-center justify-center text-xs border border-white/10">
                          Отзыв оставлен
                        </div>
                      ) : !viewsState.collectingStats ? (
                        <button
                          onClick={() => openReviewModal(app)}
                          className="flex-1 md:flex-none h-9 px-4 bg-primary/15 text-primary hover:bg-primary/25 rounded-lg font-medium transition-colors flex items-center justify-center gap-1 text-xs"
                        >
                          <Star className="w-3 h-3" /> Оставить отзыв
                        </button>
                      ) : null}
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
          </AnimatePresence>
          {filteredApplications.length === 0 && (
            <div className="text-center py-12 bg-card border border-white/5 rounded-2xl">
              <p className="text-foreground/60">Нет заявок по выбранным фильтрам.</p>
            </div>
          )}
        </div>
      )}

      {/* Reject Modal */}
      <AnimatePresence>
        {rejectModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRejectModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card border border-white/10 rounded-3xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-background/50">
                <h2 className="text-xl font-display font-bold">Отклонить заявку</h2>
                <button onClick={() => setRejectModalOpen(false)} className="text-foreground/60 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-foreground/80 mb-4">Пожалуйста, укажите причину отказа. Это поможет креатору понять, что нужно улучшить.</p>
                
                <div className="space-y-2">
                  {REJECT_REASONS.map(reason => (
                    <label key={reason} className="flex items-center gap-3 p-3 rounded-xl border border-white/5 hover:bg-white/5 cursor-pointer transition-colors">
                      <input 
                        type="radio" 
                        name="rejectReason" 
                        value={reason}
                        checked={rejectReason === reason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="text-primary focus:ring-primary bg-background border-white/20"
                      />
                      <span className="text-sm">{reason}</span>
                    </label>
                  ))}
                </div>

                {rejectReason === "Другое" && (
                  <textarea
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Опишите причину отказа..."
                    className="w-full h-24 bg-background border border-white/10 rounded-xl p-3 focus:outline-none focus:border-primary transition-colors text-sm resize-none mt-2"
                  />
                )}

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setRejectModalOpen(false)}
                    className="flex-1 h-12 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-colors"
                  >
                    Отмена
                  </button>
                  <button 
                    onClick={handleReject}
                    disabled={rejectReason === "Другое" && !customReason.trim()}
                    className="flex-1 h-12 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/20"
                  >
                    Отклонить
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Views Settlement Modal */}
      <AnimatePresence>
        {viewsSettlementModalOpen && viewsSettlementTarget && viewsSettlementPreview && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeViewsSettlementModal}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border border-white/10 bg-card shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 bg-background/50 p-6">
                <div>
                  <h2 className="text-xl font-display font-bold">Фиксация просмотров</h2>
                  <p className="mt-1 text-sm text-foreground/60">{viewsSettlementTarget.offerTitle}</p>
                </div>
                <button onClick={closeViewsSettlementModal} className="text-foreground/60 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 p-6">
                {(() => {
                  const meta = getViewsPaymentMeta({
                    ...viewsSettlementTarget,
                    price: Number(viewsSettlementTarget.price || 0),
                  });

                  return (
                    <>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div>
                            <div className="text-[10px] uppercase tracking-[0.14em] text-foreground/45">Ставка</div>
                            <div className="mt-1 font-mono font-bold text-white">${formatUsdAmount(meta.cpm)} / 1K</div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase tracking-[0.14em] text-foreground/45">Старт</div>
                            <div className="mt-1 font-mono font-bold text-white">
                              {meta.minViews > 0 ? `${meta.minViews.toLocaleString("ru-RU")}+` : "С 1-го"}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase tracking-[0.14em] text-foreground/45">Лимит</div>
                            <div className="mt-1 font-mono font-bold text-white">${formatUsdAmount(meta.maxPayout)}</div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium">Фактические просмотры через 7 дней</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={actualViewsInput}
                          onChange={(e) => setActualViewsInput(e.target.value)}
                          placeholder="Например, 12450"
                          className="h-12 w-full rounded-xl border border-white/10 bg-background px-4 font-mono text-sm focus:border-primary focus:outline-none"
                        />
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-background/50 p-4">
                        <div className="mb-3 text-[11px] uppercase tracking-[0.14em] text-foreground/45">Предпросмотр выплаты</div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                            <div className="text-[11px] text-foreground/55">Креатор получает</div>
                            <div className="font-mono font-bold text-green-400">${formatUsdAmount(viewsSettlementPreview.creatorPayoutAmount)}</div>
                          </div>
                          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                            <div className="text-[11px] text-foreground/55">Бренд платит</div>
                            <div className="font-mono font-bold text-white">${formatUsdAmount(viewsSettlementPreview.customerTotalAmount)}</div>
                          </div>
                        </div>
                        <p className="mt-3 text-xs text-foreground/60">
                          {viewsSettlementPreview.thresholdMet
                            ? "Сумма посчитана по фактическим просмотрам и ограничена лимитом, если он достигнут."
                            : `Выплата не стартует, пока ролик не достигнет порога ${meta.minViews.toLocaleString("ru-RU")} просмотров.`}
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="flex gap-3 p-6 pt-0">
                <button
                  onClick={closeViewsSettlementModal}
                  className="flex-1 h-12 rounded-xl bg-white/5 font-medium transition-colors hover:bg-white/10"
                >
                  Отмена
                </button>
                <button
                  onClick={handleFinalizeViewsPayout}
                  disabled={settlementSubmitting || !actualViewsInput.trim()}
                  className="flex-1 h-12 rounded-xl bg-primary font-bold text-white shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {settlementSubmitting ? "Фиксируем..." : "Зафиксировать и начислить"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Review Modal */}
      <AnimatePresence>
        {reviewModalOpen && reviewTarget && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReviewModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card border border-white/10 rounded-3xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-background/50">
                <div>
                  <h2 className="text-xl font-display font-bold">Оценить креатора</h2>
                  <p className="text-xs text-foreground/60">{reviewTarget.creatorName}</p>
                </div>
                <button onClick={() => setReviewModalOpen(false)} className="text-foreground/60 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-foreground/80 mb-3">Поставьте оценку за выполненную работу</p>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: 5 }).map((_, i) => {
                      const value = i + 1;
                      const active = value <= reviewRating;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setReviewRating(value)}
                          className={`w-10 h-10 rounded-full border transition-colors flex items-center justify-center ${
                            active
                              ? "bg-yellow-500/20 border-yellow-400 text-yellow-400"
                              : "bg-white/5 border-white/10 text-yellow-500/30 hover:text-yellow-400"
                          }`}
                        >
                          <Star className={`w-5 h-5 ${active ? "fill-current" : ""}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Комментарий (необязательно)</label>
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Что понравилось в работе креатора?"
                    rows={3}
                    className="w-full bg-background border border-white/10 rounded-xl p-3 focus:outline-none focus:border-primary transition-colors text-sm resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setReviewModalOpen(false)}
                    className="flex-1 h-12 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleSubmitReview}
                    disabled={reviewSubmitting}
                    className="flex-1 h-12 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/20"
                  >
                    {reviewSubmitting ? "Отправка..." : "Отправить отзыв"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Dispute Modal */}
      <AnimatePresence>
        {disputeModalOpen && disputeTarget && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDisputeModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card border border-white/10 rounded-3xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-background/50">
                <div>
                  <h2 className="text-xl font-display font-bold">Открыть претензию</h2>
                  <p className="text-xs text-foreground/60">{disputeTarget.creatorName}</p>
                </div>
                <button onClick={() => setDisputeModalOpen(false)} className="text-foreground/60 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-foreground/80">Опишите суть претензии. Модератор подключится к сделке.</p>
                <textarea
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="Например: ролик не соответствует ТЗ, ссылка недоступна, контент удалён..."
                  rows={4}
                  className="w-full bg-background border border-white/10 rounded-xl p-3 focus:outline-none focus:border-primary transition-colors text-sm resize-none"
                />

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setDisputeModalOpen(false)}
                    className="flex-1 h-12 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleDispute}
                    disabled={!disputeReason.trim()}
                    className="flex-1 h-12 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/20"
                  >
                    Отправить претензию
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
