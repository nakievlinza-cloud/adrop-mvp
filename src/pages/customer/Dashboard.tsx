import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import {
  Activity01Icon,
  Add01Icon,
  Award02Icon,
  Cancel01Icon,
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  CrownIcon,
  DiamondIcon,
  LinkSquare01Icon,
  Message01Icon,
  Pulse01Icon,
  Rocket01Icon,
  SparklesIcon,
  StarAward02Icon,
  UserGroupIcon,
  UserMultiple03Icon,
  ViewIcon,
} from "@hugeicons/core-free-icons";
import { collection, query, where, onSnapshot, getDoc, getDocs, doc, limit, orderBy, updateDoc, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuthStore } from "../../store/authStore";
import { CustomerOnboarding } from "./Onboarding";
import { AppIcon } from "../../components/ui/icon";
import { DealPricingSummary } from "../../components/DealPricingSummary";
import {
  calculateDealPricing,
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

function parseCompactNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return 0;
  }

  const normalized = value.trim().toLowerCase().replace(/\s+/g, "");
  if (!normalized) {
    return 0;
  }

  const multiplier =
    normalized.endsWith("m") ? 1_000_000 :
    normalized.endsWith("k") ? 1_000 :
    normalized.endsWith("b") ? 1_000_000_000 :
    1;

  const numericPart = normalized.replace(/[^0-9.,]/g, "").replace(",", ".");
  const parsed = Number(numericPart);

  return Number.isFinite(parsed) ? parsed * multiplier : 0;
}

function formatCompactNumber(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  }

  return `${Math.round(value)}`;
}

function getCreatorCategoryLabel(creator: any) {
  if (typeof creator.category === "string" && creator.category.trim()) {
    return creator.category.trim().toUpperCase();
  }

  if (Array.isArray(creator.verticals) && typeof creator.verticals[0] === "string") {
    return creator.verticals[0].trim().toUpperCase();
  }

  return "UGC";
}

function getCreatorVerticalLabels(creator: any) {
  if (Array.isArray(creator.verticals)) {
    const normalizedVerticals = creator.verticals
      .filter((vertical: unknown) => typeof vertical === "string")
      .map((vertical: string) => vertical.trim())
      .filter(Boolean);

    if (normalizedVerticals.length > 0) {
      return Array.from(new Set(normalizedVerticals));
    }
  }

  if (typeof creator.vertical === "string" && creator.vertical.trim()) {
    return [creator.vertical.trim()];
  }

  if (typeof creator.category === "string" && creator.category.trim()) {
    return [creator.category.trim()];
  }

  return ["UGC"];
}

function getCreatorSpecializationLabel(creator: any) {
  if (Array.isArray(creator.specializations)) {
    const normalizedSpecializations = creator.specializations
      .filter((item: unknown) => typeof item === "string")
      .map((item: string) => item.trim())
      .filter(Boolean);

    if (normalizedSpecializations.length > 0) {
      return normalizedSpecializations.join(" • ");
    }
  }

  return "UGC creator";
}

export function CustomerDashboard() {
  const { user, userData } = useAuthStore();
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [notification, setNotification] = useState<{title: string, message: string, type: 'success' | 'info'} | null>(null);
  const [myOffers, setMyOffers] = useState<any[]>([]);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedCreatorForOffer, setSelectedCreatorForOffer] = useState<any | null>(null);
  const [selectedOfferId, setSelectedOfferId] = useState<string>("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [sentInviteData, setSentInviteData] = useState<any>(null);

  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [recentApplications, setRecentApplications] = useState<any[]>([]);
  const [topCreators, setTopCreators] = useState<any[]>([]);

  const getViewsOrderState = (order: any) => {
    const isViewsOrder = isViewsPaymentModel(order?.paymentModel);
    const viewsMeta = getViewsPaymentMeta({ ...order, price: Number(order?.price || 0) });
    const maxDealPricing = getViewsMaxDealPricing({ ...order, price: Number(order?.price || 0) });
    const finalized = hasFinalizedViewsPricing(order);
    const statsReviewDate = getViewsReviewDueDate(order);
    const collectingStats = isViewsOrder && order?.payoutStatus === "collecting_stats";
    const dealPricing = isViewsOrder && !finalized
      ? maxDealPricing
      : resolveDealPricing(order, Number(order?.price || 0));

    return {
      isViewsOrder,
      viewsMeta,
      maxDealPricing,
      finalized,
      statsReviewDate,
      collectingStats,
      dealPricing,
    };
  };

  const selectedOrderViewsState = selectedOrder ? getViewsOrderState(selectedOrder) : null;

  useEffect(() => {
    if (!user) return;

    // Fetch My Offers
    const offersQ = query(collection(db, "offers"), where("customerId", "==", user.uid), where("status", "==", "active"));
    const unsubscribeOffers = onSnapshot(offersQ, (snapshot) => {
      const offersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMyOffers(offersData);
    });

    // Fetch Applications (Active Orders & Recent Applications)
    const appsQ = query(collection(db, "applications"), where("customerId", "==", user.uid));
    const unsubscribeApps = onSnapshot(appsQ, async (snapshot) => {
      const appsData = await Promise.all(snapshot.docs.map(async (docSnapshot) => {
        const data = docSnapshot.data();
        
        let creatorName = "Креатор";
        let creatorAvatar = getAvatarSrc(null, creatorName, "creator");
        let socialLinks: string[] = [];
        try {
          const creatorDoc = await getDoc(doc(db, "users", data.creatorId));
          if (creatorDoc.exists()) {
            creatorName = creatorDoc.data().name || creatorName;
            creatorAvatar = getAvatarSrc(
              creatorDoc.data().avatar || creatorDoc.data().avatarUrl,
              creatorName,
              "creator",
            );
            const accounts = creatorDoc.data().socialAccounts;
            if (Array.isArray(accounts)) {
              socialLinks = accounts
                .filter((account: any) => account?.verificationStatus === "verified" || account?.verifiedAt)
                .map((account: any) => account?.url)
                .filter((url: string) => typeof url === "string" && url.length > 0);
            }
          }
        } catch (e) {
          console.error("Error fetching creator:", e);
        }

        let offerTitle = "Оффер";
        let price = 0;
        let type = "ugc";
        let paymentModel = "Фикс";
        let paymentDetails = null;
        try {
          const offerDoc = await getDoc(doc(db, "offers", data.offerId));
          if (offerDoc.exists()) {
            offerTitle = offerDoc.data().title || offerTitle;
            price = offerDoc.data().budget || 0;
            type = offerDoc.data().type || type;
            paymentModel = offerDoc.data().paymentModel || paymentModel;
            paymentDetails = offerDoc.data().paymentDetails || null;
          }
        } catch (e) {
          console.error("Error fetching offer:", e);
        }

        let progress = 0;
        let deadline = "В процессе";

        if (data.status === 'accepted') {
          progress = 33;
          deadline = "Заказ принят в работу";
        } else if (data.status === 'in_review') {
          progress = 66;
          deadline = "На проверке";
        } else if (data.status === 'completed') {
          progress = 100;
          const statsReviewDueDate = data.statsReviewDueAt?.toDate?.() || null;
          const collectingStats = paymentModel === "За просмотры" && data.payoutStatus === "collecting_stats";
          if (collectingStats && statsReviewDueDate && statsReviewDueDate > new Date()) {
            deadline = "Собираем статистику";
          } else if (collectingStats) {
            deadline = "Ждёт фиксации просмотров";
          } else {
            deadline = "Заказ выполнен";
          }
        }

        return {
          id: docSnapshot.id,
          ...data,
          creatorName,
          creatorAvatar,
          offerTitle,
          price,
          type,
          paymentModel,
          paymentDetails,
          progress,
          deadline,
          socialLinks,
          time: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString('ru-RU') : 'Недавно'
        };
      }));

      const active = appsData.filter((app: any) => app.status !== 'pending' && app.status !== 'rejected');
      const recent = appsData.filter((app: any) => app.status === 'pending');
      
      setActiveOrders(active);
      setRecentApplications(recent);
    });

    // Fetch Top Creators
    const creatorsQ = query(collection(db, "users"), where("role", "==", "creator"), limit(6));
    const unsubscribeCreators = onSnapshot(creatorsQ, (snapshot) => {
      const creatorsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          rating: data.rating || 0,
          category: getCreatorCategoryLabel(data),
          specializationLabel: getCreatorSpecializationLabel(data),
          verticalLabels: getCreatorVerticalLabels(data),
        };
      });
      setTopCreators(creatorsData);
    });

    return () => {
      unsubscribeOffers();
      unsubscribeApps();
      unsubscribeCreators();
    };
  }, [user]);

  const openInviteModal = (creator: any) => {
    setSelectedCreatorForOffer(creator);
    setSelectedOfferId("");
    setInviteModalOpen(true);
  };

  const handleSendInvite = async () => {
    if (!selectedOfferId || !selectedCreatorForOffer || !user) return;

    try {
      const offerDoc = await getDoc(doc(db, "offers", selectedOfferId));
      const offerData = offerDoc.exists() ? offerDoc.data() : null;

      const chatsRef = collection(db, "chats");
      const q = query(
        chatsRef,
        where("customerId", "==", user.uid),
        where("creatorId", "==", selectedCreatorForOffer.id),
        where("offerId", "==", selectedOfferId)
      );
      const chatSnapshot = await getDocs(q);

      let chatId;
      if (chatSnapshot.empty) {
        const newChatRef = await addDoc(chatsRef, {
          customerId: user.uid,
          creatorId: selectedCreatorForOffer.id,
          offerId: selectedOfferId,
          participantIds: [user.uid, selectedCreatorForOffer.id],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastMessage: "Приглашение в оффер"
        });
        chatId = newChatRef.id;
      } else {
        chatId = chatSnapshot.docs[0].id;
      }

      await addDoc(collection(db, "chats", chatId, "messages"), {
        senderId: user.uid,
        text: inviteMessage || "Здравствуйте! Приглашаю вас принять участие в моем оффере.",
        createdAt: serverTimestamp()
      });

      await addDoc(collection(db, "applications"), {
        offerId: selectedOfferId,
        creatorId: selectedCreatorForOffer.id,
        customerId: user.uid,
        status: "pending",
        message: "Приглашение от заказчика",
        createdAt: serverTimestamp(),
        isInvite: true,
        ...calculateDealPricing(Number(offerData?.budget || 0))
      });

      await addDoc(collection(db, "notifications"), {
        recipientId: selectedCreatorForOffer.id,
        senderId: user.uid,
        type: "offer_invite",
        title: "Новое приглашение в оффер",
        message: `Вас пригласили принять участие в оффере "${offerData?.title || 'Оффер'}"`,
        offerId: selectedOfferId,
        chatId: chatId,
        read: false,
        createdAt: serverTimestamp()
      });

      setSentInviteData({
        creator: selectedCreatorForOffer,
        offer: offerData
      });
      setSuccessModalOpen(true);
      setInviteModalOpen(false);
      setSelectedCreatorForOffer(null);
      setInviteMessage("");
    } catch (error) {
      console.error("Error sending invite:", error);
      alert("Ошибка при отправке приглашения: " + error.message);
    }
  };

  const getOrCreateChatId = async (app: any) => {
    if (!user) return null;
    const chatsRef = collection(db, "chats");
    const q = query(
      chatsRef,
      where("customerId", "==", user.uid),
      where("creatorId", "==", app.creatorId),
      where("offerId", "==", app.offerId)
    );
    const chatSnapshot = await getDocs(q);

    if (chatSnapshot.empty) {
      const newChatRef = await addDoc(chatsRef, {
        customerId: user.uid,
        creatorId: app.creatorId,
        offerId: app.offerId,
        participantIds: [user.uid, app.creatorId],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: "Ваш отклик принят!"
      });
      return newChatRef.id;
    }

    return chatSnapshot.docs[0].id;
  };

  const handleAcceptApplication = async (app: any) => {
    if (!user || !app?.id) return;

    try {
      const isViewsOrder = isViewsPaymentModel(app.paymentModel);
      const pricingSnapshot = calculateDealPricing(Number(app.price || 0));

      await updateDoc(doc(db, "applications", app.id), {
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

      const chatId = await getOrCreateChatId(app);
      if (chatId) {
        await addDoc(collection(db, "chats", chatId, "messages"), {
          senderId: "system",
          text: `✅ Ваш отклик принят. Свяжитесь с брендом в чате.`,
          createdAt: serverTimestamp(),
          isSystem: true,
          offerTitle: app.offerTitle
        });
        await updateDoc(doc(db, "chats", chatId), {
          lastMessage: "Ваш отклик принят!",
          updatedAt: serverTimestamp()
        });
      }

      await addDoc(collection(db, "notifications"), {
        recipientId: app.creatorId,
        senderId: user.uid,
        type: "application_accepted",
        title: "Отклик принят",
        message: `Ваш отклик по офферу "${app.offerTitle}" принят.`,
        offerId: app.offerId,
        applicationId: app.id,
        chatId: chatId || null,
        read: false,
        createdAt: serverTimestamp()
      });

      setNotification({
        title: "Отклик принят",
        message: `Вы приняли отклик от ${app.creatorName}.`,
        type: "success"
      });
      setSelectedApp(null);
    } catch (error) {
      console.error("Error accepting application:", error);
    }
  };

  const handleRejectApplication = async (app: any) => {
    if (!user || !app?.id) return;

    try {
      await updateDoc(doc(db, "applications", app.id), {
        status: "rejected",
        rejectedAt: serverTimestamp()
      });

      await addDoc(collection(db, "notifications"), {
        recipientId: app.creatorId,
        senderId: user.uid,
        type: "application_rejected",
        title: "Отклик отклонен",
        message: `Ваш отклик по офферу "${app.offerTitle}" отклонен.`,
        offerId: app.offerId,
        applicationId: app.id,
        read: false,
        createdAt: serverTimestamp()
      });

      setNotification({
        title: "Отклик отклонен",
        message: `Отклик от ${app.creatorName} был отклонен.`,
        type: "info"
      });
      setSelectedApp(null);
    } catch (error) {
      console.error("Error rejecting application:", error);
    }
  };

  const handleApproveWork = async (applicationId: string) => {
    if (!user) return;

    try {
      const app = activeOrders.find(a => a.id === applicationId);
      if (!app) return;

      const isViewsOrder = isViewsPaymentModel(app.paymentModel);
      if (isViewsOrder) {
        const statsReviewDueAt = Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

        await updateDoc(doc(db, "applications", applicationId), {
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

        const chatId = await getOrCreateChatId(app);
        if (chatId) {
          await addDoc(collection(db, "chats", chatId, "messages"), {
            senderId: "system",
            text: "✅ Работа принята. Собираем статистику 7 дней, затем зафиксируйте итог в разделе заказов.",
            createdAt: serverTimestamp(),
            isSystem: true,
            offerTitle: app.offerTitle
          });
          await updateDoc(doc(db, "chats", chatId), {
            lastMessage: "Работа принята. Идёт сбор статистики 7 дней",
            updatedAt: serverTimestamp()
          });
        }

        await addDoc(collection(db, "notifications"), {
          recipientId: app.creatorId,
          senderId: user.uid,
          type: "work_hold",
          title: "Работа принята, идёт сбор статистики",
          message: "Ролик принят. Финальная выплата будет рассчитана через 7 дней по фактическим просмотрам.",
          applicationId: applicationId,
          offerId: app.offerId,
          read: false,
          createdAt: serverTimestamp()
        });

        return;
      }

      const payoutAmount = getCreatorPayoutAmount(app, Number(app.price || 0));
      const holdUntil = Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

      await updateDoc(doc(db, "applications", applicationId), {
        status: "completed",
        completedAt: serverTimestamp(),
        payoutAmount: payoutAmount,
        payoutStatus: "hold",
        holdUntil
      });

      const chatId = await getOrCreateChatId(app);
      if (chatId) {
        await addDoc(collection(db, "chats", chatId, "messages"), {
          senderId: "system",
          text: "✅ Работа принята. Выплата уйдёт в hold на 7 дней.",
          createdAt: serverTimestamp(),
          isSystem: true,
          offerTitle: app.offerTitle
        });
        await updateDoc(doc(db, "chats", chatId), {
          lastMessage: "Работа принята. Выплата в hold на 7 дней",
          updatedAt: serverTimestamp()
        });
      }

      await addDoc(collection(db, "notifications"), {
        recipientId: app.creatorId,
        senderId: user.uid,
        type: "work_hold",
        title: "Работа принята (холд)",
        message: "Работа принята. Выплата будет доступна через 7 дней, если ролик остаётся опубликованным.",
        applicationId: applicationId,
        offerId: app.offerId,
        chatId: chatId || null,
        read: false,
        createdAt: serverTimestamp()
      });

      setNotification({
        title: "Работа принята!",
        message: "Вы одобрили работу креатора. Выплата ушла в обязательный 7-дневный hold.",
        type: "success"
      });

      setSelectedOrder(null);
    } catch (error) {
      console.error("Error approving work:", error);
    }
  };

  const handleRejectWork = async (applicationId: string) => {
    if (!user) return;

    try {
      const app = activeOrders.find(a => a.id === applicationId);
      if (!app) return;

      await updateDoc(doc(db, "applications", applicationId), {
        status: "accepted",
        reportLink: null,
        requirementsMet: null,
        submittedAt: null
      });

      await addDoc(collection(db, "notifications"), {
        recipientId: app.creatorId,
        senderId: user.uid,
        type: "work_rejected",
        title: "Требуются доработки",
        message: `Заказчик отклонил работу. Пожалуйста, внесите изменения и отправьте повторно.`,
        read: false,
        createdAt: serverTimestamp()
      });

      setNotification({
        title: "Работа отклонена",
        message: "Креатор получит уведомление о необходимости внести доработки.",
        type: "info"
      });

      setSelectedOrder(null);
    } catch (error) {
      console.error("Error rejecting work:", error);
    }
  };

  return (
    <>
      {/* Show onboarding if not completed */}
      {userData && !userData.onboardingCompleted && (
        <CustomerOnboarding />
      )}

      <div className="w-full px-6 sm:px-8 lg:px-12 2xl:px-16 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Главная</h1>
          <p className="text-foreground/60">Управляйте активными заказами и находите новых креаторов.</p>
        </div>
        <Link href="/customer/create-offer">
          <button className="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-lg shadow-primary/25">
            <AppIcon icon={Add01Icon} size={20} /> Создать оффер
          </button>
        </Link>
      </div>

      {/* Active Orders Section */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <AppIcon icon={Pulse01Icon} className="text-primary" size={24} /> Активные заказы
          </h2>
          <Link href="/customer/orders" className="text-sm text-primary hover:underline">
            Все заказы
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeOrders.map((order, index) => {
            const viewsState = getViewsOrderState(order);
            return (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setSelectedOrder(order)}
              className="bg-card border border-white/5 rounded-3xl p-6 hover:border-white/10 transition-all relative overflow-hidden group cursor-pointer"
            >
              <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-10 -mt-10 transition-opacity opacity-20 ${order.type === 'ugc' ? 'bg-ugc-primary' : 'bg-clip-primary'}`} />
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <img src={order.creatorAvatar} alt={order.creatorName} className="w-12 h-12 rounded-full border border-white/10" />
                    <div>
                      <h3 className="font-bold leading-tight">{order.creatorName}</h3>
                      <p className="text-xs text-foreground/60">{order.offerTitle}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    order.type === 'ugc' ? 'bg-ugc-primary/20 text-ugc-primary' : 'bg-clip-primary/20 text-clip-primary'
                  }`}>
                    {order.type}
                  </span>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-foreground/60">Статус выполнения</span>
                    <span className="font-medium">{order.progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${order.status === 'completed' ? 'bg-green-500' : 'bg-primary'}`} 
                      style={{ width: `${order.progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2 text-sm">
                    {order.status === 'completed' && order.payoutStatus !== 'collecting_stats' ? (
                      <span className="text-green-400 flex items-center gap-1"><AppIcon icon={CheckmarkCircle02Icon} size={16} /> Выполнено</span>
                    ) : (
                      <span className="text-yellow-400 flex items-center gap-1"><AppIcon icon={Clock01Icon} size={16} /> {order.deadline}</span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-foreground/45 uppercase tracking-[0.16em]">
                      {viewsState.isViewsOrder && !viewsState.finalized ? "Максимум" : "Итого"}
                    </div>
                    <span className="font-mono font-bold">
                      ${formatUsdAmount(viewsState.dealPricing.customerTotalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )})}
          {activeOrders.length === 0 && (
            <div className="col-span-full bg-card border border-white/5 rounded-3xl p-12 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                <AppIcon icon={Activity01Icon} className="text-foreground/40" size={40} />
              </div>
              <h3 className="text-xl font-bold mb-2">Нет активных заказов</h3>
              <p className="text-foreground/60 mb-6 max-w-md mx-auto">
                Создайте свой первый оффер и начните работать с креаторами!
              </p>
              <Link href="/customer/create-offer">
                <button className="h-12 px-8 rounded-xl font-bold text-white bg-primary hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2 mx-auto">
                  <AppIcon icon={Add01Icon} size={20} />
                  Создать оффер
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Top Creators Section */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <AppIcon icon={CrownIcon} className="text-amber-300" size={24} /> Топ креаторы для вас
            </h2>
            <Link href="/customer/creators" className="text-sm text-primary hover:underline">
              Смотреть всех
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {topCreators.map((creator, index) => (
              <motion.div
                key={creator.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className="bg-card border border-white/5 rounded-3xl p-5 hover:bg-white/5 hover:border-white/10 transition-colors text-center relative overflow-hidden"
              >
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
                <div className="absolute top-4 right-4 inline-flex items-center gap-1 rounded-full border border-amber-400/15 bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200">
                  <AppIcon icon={creator.rating > 0 ? StarAward02Icon : Award02Icon} size={12} />
                  <span>{creator.rating > 0 ? creator.rating : "Новый"}</span>
                </div>

                <img
                  src={getAvatarSrc(creator.avatarUrl || creator.avatar, creator.name, "creator")}
                  alt={creator.name}
                  className="w-20 h-20 rounded-full mx-auto mb-3 border-2 border-white/10 relative z-10"
                />
                <h3 className="font-bold mb-3 text-lg">{creator.name}</h3>
                <div className="flex flex-wrap justify-center gap-2 mb-5">
                  <span className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-foreground/70">
                    <AppIcon icon={SparklesIcon} size={12} className="text-fuchsia-300" />
                    <span>{creator.specializationLabel}</span>
                  </span>
                  {creator.verticalLabels.map((vertical: string) => (
                    <span
                      key={`${creator.id}-${vertical}`}
                      className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-foreground/70"
                    >
                      <AppIcon icon={DiamondIcon} size={12} className="text-sky-300" />
                      <span>{vertical}</span>
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => openInviteModal(creator)}
                  className="w-full py-3 bg-primary/10 text-primary hover:bg-primary/20 rounded-2xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <AppIcon icon={Rocket01Icon} size={16} /> Пригласить в оффер
                </button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Recent Applications */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <AppIcon icon={UserGroupIcon} className="text-blue-400" size={24} /> Недавние отклики
            </h2>
          </div>
          
          <div className="bg-card border border-white/5 rounded-2xl overflow-hidden">
            {recentApplications.map((app) => (
              <div key={app.id} className="p-4 border-b border-white/5 hover:bg-white/5 transition-colors">
                <div className="flex items-start gap-4 mb-3">
                  <img src={app.creatorAvatar} alt={app.creatorName} className="w-10 h-10 rounded-full" />
                  <div className="flex-1">
                    <p className="font-bold text-sm">{app.creatorName}</p>
                    <p className="text-xs text-foreground/60 line-clamp-1">На: {app.offerTitle}</p>
                  </div>
                  <span className="text-[10px] text-foreground/50 whitespace-nowrap">{app.time}</span>
                </div>
                <button 
                  onClick={() => setSelectedApp(app)}
                  className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <AppIcon icon={ViewIcon} size={16} /> Смотреть отклик
                </button>
              </div>
            ))}
            <div className="p-4 text-center">
              <Link href="/customer/orders" className="text-sm text-primary hover:underline">
                Все отклики
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Application Modal */}
      <AnimatePresence>
        {selectedApp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedApp(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[#141414] border border-white/10 rounded-3xl overflow-hidden shadow-2xl z-10"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                <h2 className="text-xl font-display font-bold">Новый отклик</h2>
                <button 
                  onClick={() => setSelectedApp(null)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <AppIcon icon={Cancel01Icon} size={16} />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-4">
                  <img src={selectedApp.creatorAvatar} alt={selectedApp.creatorName} className="w-16 h-16 rounded-full border-2 border-white/10" />
                  <div>
                    <h3 className="text-xl font-bold">{selectedApp.creatorName}</h3>
                    <p className="text-sm text-foreground/60">Отклик на: <span className="text-white">{selectedApp.offerTitle}</span></p>
                  </div>
                </div>

                <div className="bg-background border border-white/5 rounded-2xl p-4">
                  <h4 className="text-xs font-bold text-foreground/50 uppercase tracking-wider mb-2">Сопроводительное письмо</h4>
                  <p className="text-sm text-foreground/80 italic">"{selectedApp.message}"</p>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-foreground/50 uppercase tracking-wider mb-2">Проверенные соцсети креатора</h4>
                  {selectedApp.socialLinks && selectedApp.socialLinks.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedApp.socialLinks.map((link: string) => {
                        const href = link.startsWith("http") ? link : `https://${link}`;
                        return (
                          <a key={link} href={href} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1 text-primary hover:underline bg-primary/10 px-3 py-1.5 rounded-lg">
                            <AppIcon icon={LinkSquare01Icon} size={12} /> {link}
                          </a>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-foreground/60">Проверенные соцсети пока не подключены</p>
                  )}
                </div>

                <DealPricingSummary
                  pricing={selectedApp}
                  fallbackPayoutAmount={Number(selectedApp.price || 0)}
                  title="Экономика сделки"
                  compact
                />

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => handleAcceptApplication(selectedApp)}
                    className="flex-1 h-12 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    <AppIcon icon={CheckmarkCircle02Icon} size={20} /> {isViewsPaymentModel(selectedApp.paymentModel)
                      ? `Принять с оплатой по просмотрам`
                      : `Принять за $${formatUsdAmount(
                          selectedApp.customerTotalAmount ||
                          calculateDealPricing(Number(selectedApp.price || 0)).customerTotalAmount,
                        )}`}
                  </button>
                  <button 
                    onClick={() => handleRejectApplication(selectedApp)}
                    className="flex-1 h-12 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    <AppIcon icon={Cancel01Icon} size={20} /> Отклонить
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Active Order Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[#141414] border border-white/10 rounded-3xl overflow-hidden shadow-2xl z-10"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                <h2 className="text-xl font-display font-bold">Детали заказа</h2>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <AppIcon icon={Cancel01Icon} size={16} />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-4">
                  <img src={selectedOrder.creatorAvatar} alt={selectedOrder.creatorName} className="w-16 h-16 rounded-full border-2 border-white/10" />
                  <div>
                    <h3 className="text-xl font-bold">{selectedOrder.creatorName}</h3>
                    <p className="text-sm text-foreground/60">Оффер: <span className="text-white">{selectedOrder.offerTitle}</span></p>
                  </div>
                  <div className="ml-auto text-right">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-1 ${
                      selectedOrder.type === 'ugc' ? 'bg-ugc-primary/20 text-ugc-primary' : 'bg-clip-primary/20 text-clip-primary'
                    }`}>
                      {selectedOrder.type}
                    </span>
                    <p className="font-mono font-bold text-green-400">
                      {selectedOrderViewsState?.isViewsOrder && !selectedOrderViewsState.finalized
                        ? `$${formatUsdAmount(selectedOrderViewsState.viewsMeta.cpm)} / 1K`
                        : `$${formatUsdAmount(selectedOrder.creatorPayoutAmount || selectedOrder.price || 0)}`}
                    </p>
                    <p className="text-[11px] text-foreground/50">
                      {selectedOrderViewsState?.isViewsOrder && !selectedOrderViewsState.finalized ? "ставка креатору" : "креатору"}
                    </p>
                  </div>
                </div>

                <DealPricingSummary
                  pricing={selectedOrder}
                  fallbackPayoutAmount={Number(selectedOrder.price || 0)}
                  title="Финансы заказа"
                  compact
                />

                <div className="bg-background border border-white/5 rounded-2xl p-5">
                  <h4 className="text-sm font-bold text-foreground/80 mb-4">Статус выполнения</h4>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        selectedOrder.status === 'accepted' || selectedOrder.status === 'in_review' || selectedOrder.status === 'completed'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-white/10 text-foreground/40'
                      }`}>
                        <AppIcon icon={CheckmarkCircle02Icon} size={12} />
                      </div>
                      <span className={
                        selectedOrder.status === 'accepted' || selectedOrder.status === 'in_review' || selectedOrder.status === 'completed'
                          ? 'text-white'
                          : 'text-foreground/50'
                      }>Заказ принят в работу</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        selectedOrder.status === 'in_review' || selectedOrder.status === 'completed'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-white/10 text-foreground/40'
                      }`}>
                        <AppIcon icon={CheckmarkCircle02Icon} size={12} />
                      </div>
                      <span className={
                        selectedOrder.status === 'in_review' || selectedOrder.status === 'completed'
                          ? 'text-white'
                          : 'text-foreground/50'
                      }>На проверке</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        selectedOrder.status === 'completed'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-white/10 text-foreground/40'
                      }`}>
                        <AppIcon icon={CheckmarkCircle02Icon} size={12} />
                      </div>
                      <span className={
                        selectedOrder.status === 'completed'
                          ? 'text-white'
                          : 'text-foreground/50'
                      }>Заказ выполнен</span>
                    </div>
                  </div>
                </div>

                {/* Show submitted work if in_review */}
                {selectedOrder.status === 'in_review' && selectedOrder.reportLink && (
                  <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
                    <h4 className="text-sm font-bold text-primary mb-4">Работа на проверке</h4>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-foreground/50 mb-2">Ссылка на видео:</p>
                        <a
                          href={selectedOrder.reportLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          {selectedOrder.reportLink}
                          <AppIcon icon={LinkSquare01Icon} size={12} />
                        </a>
                      </div>
                      {selectedOrder.requirementsMet && (
                        <div className="flex items-center gap-2 text-xs text-green-400">
                          <AppIcon icon={CheckmarkCircle02Icon} size={12} />
                          <span>Креатор подтверждает, что все требования соблюдены</span>
                        </div>
                      )}
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => handleRejectWork(selectedOrder.id)}
                          className="flex-1 h-10 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                        >
                          <AppIcon icon={CancelCircleIcon} size={16} /> Отклонить
                        </button>
                        <button
                          onClick={() => handleApproveWork(selectedOrder.id)}
                          className="flex-1 h-10 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-sm shadow-lg shadow-green-500/20"
                        >
                          <AppIcon icon={CheckmarkCircle02Icon} size={16} /> {selectedOrderViewsState?.isViewsOrder ? "Принять и ждать статистику" : "Принять и в hold"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                <div className="flex items-center gap-3">
                    <AppIcon icon={Clock01Icon} className="text-foreground/50" size={20} />
                    <div>
                      <p className="text-xs text-foreground/50 uppercase tracking-wider font-bold">Дедлайн</p>
                      <p className="font-medium">{selectedOrder.deadline}</p>
                    </div>
                  </div>
                  {selectedOrder.status === 'completed' && (
                    <div className={`px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-1 ${
                      selectedOrderViewsState?.collectingStats
                        ? "bg-blue-500/20 text-blue-300"
                        : "bg-green-500/20 text-green-400"
                    }`}>
                      <AppIcon icon={CheckmarkCircle02Icon} size={16} /> {selectedOrderViewsState?.collectingStats ? "Собираем статистику" : "Выполнено"}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <Link href="/customer/messages" className="flex-1">
                    <button className="w-full h-12 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-colors flex items-center justify-center gap-2">
                      <AppIcon icon={Message01Icon} size={20} /> Написать
                    </button>
                  </Link>
                  {selectedOrder.status === 'completed' && (
                    selectedOrderViewsState?.collectingStats ? (
                      <Link href="/customer/orders" className="flex-1">
                        <button className="w-full h-12 bg-blue-500 text-white hover:bg-blue-600 rounded-xl font-bold transition-colors shadow-lg shadow-blue-500/20">
                          Зафиксировать просмотры
                        </button>
                      </Link>
                    ) : (
                      <button className="flex-1 h-12 bg-primary text-white hover:bg-primary/90 rounded-xl font-bold transition-colors shadow-lg shadow-primary/25">
                        Скачать видео
                      </button>
                    )
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Invite Modal */}
      <AnimatePresence>
        {inviteModalOpen && selectedCreatorForOffer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setInviteModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card border border-white/10 rounded-3xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-background/50">
                <h2 className="text-xl font-display font-bold">Пригласить креатора</h2>
                <button onClick={() => setInviteModalOpen(false)} className="text-foreground/60 hover:text-white">
                  <AppIcon icon={Cancel01Icon} size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <img src={selectedCreatorForOffer.avatar} alt={selectedCreatorForOffer.name} className="w-10 h-10 rounded-full border border-white/10" />
                  <div>
                    <p className="font-bold text-sm">{selectedCreatorForOffer.name}</p>
                    <p className="text-xs text-foreground/60">Отправка приглашения</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium">Выберите оффер</label>
                  <select
                    value={selectedOfferId}
                    onChange={(e) => setSelectedOfferId(e.target.value)}
                    className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-primary transition-colors appearance-none"
                  >
                    <option value="" disabled>-- Выберите оффер --</option>
                    {myOffers.map(offer => (
                      <option key={offer.id} value={offer.id}>{offer.title}</option>
                    ))}
                  </select>
                  {myOffers.length === 0 && (
                    <p className="text-xs text-red-400 mt-1">У вас нет активных офферов для приглашения.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium">Сообщение креатору (необязательно)</label>
                  <textarea
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    placeholder="Привет! Рассмотри наш оффер..."
                    rows={3}
                    className="w-full bg-background border border-white/10 rounded-xl p-4 focus:outline-none focus:border-primary transition-colors resize-none text-sm"
                  />
                  <p className="text-xs text-foreground/50">Если не заполнено, будет отправлено стандартное сообщение</p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setInviteModalOpen(false)}
                    className="flex-1 h-12 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleSendInvite}
                    disabled={!selectedOfferId}
                    className="flex-1 h-12 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/25"
                  >
                    Отправить
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Success Modal */}
      <AnimatePresence>
        {successModalOpen && sentInviteData && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSuccessModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card border border-white/10 rounded-3xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-6 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                  <AppIcon icon={CheckmarkCircle02Icon} size={32} className="text-green-500" />
                </div>

                <h2 className="text-2xl font-bold mb-2">Приглашение отправлено!</h2>

                <p className="text-foreground/70 mb-6">
                  Креатор <span className="font-bold text-white">{sentInviteData.creator?.name}</span> получит уведомление и сможет рассмотреть ваше предложение
                </p>

                <div className="w-full bg-white/5 rounded-xl p-4 mb-6">
                  <p className="text-sm text-foreground/60 mb-1">Оффер:</p>
                  <p className="font-bold text-white">{sentInviteData.offer?.title}</p>
                </div>

                <button
                  onClick={() => {
                    setSuccessModalOpen(false);
                    window.location.href = "/customer/messages";
                  }}
                  className="w-full h-12 bg-gradient-to-r from-clip-primary to-clip-primary/90 hover:from-clip-primary/90 hover:to-clip-primary text-white rounded-xl font-bold transition-all shadow-lg shadow-clip-primary/30 flex items-center justify-center gap-2 mb-2"
                >
                  <AppIcon icon={Message01Icon} size={18} />
                  Перейти к сообщениям
                </button>

                <button
                  onClick={() => setSuccessModalOpen(false)}
                  className="w-full h-12 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium transition-colors text-foreground/80 hover:text-white"
                >
                  Остаться на странице
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Notification Modal */}
      <AnimatePresence>
        {notification && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setNotification(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-[#141414] border border-white/10 rounded-3xl overflow-hidden shadow-2xl z-10 p-6 text-center"
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${notification.type === 'success' ? 'bg-green-500/10' : 'bg-primary/10'}`}>
                {notification.type === 'success' ? (
                  <AppIcon icon={CheckmarkCircle02Icon} size={32} className="text-green-500" />
                ) : (
                  <AppIcon icon={SparklesIcon} size={32} className="text-primary" />
                )}
              </div>
              <h2 className="text-xl font-display font-bold mb-2">{notification.title}</h2>
              <p className="text-foreground/60 text-sm mb-6">
                {notification.message}
              </p>
              
              <button 
                onClick={() => setNotification(null)}
                className="w-full h-12 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-colors"
              >
                Понятно
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </>
  );
}
