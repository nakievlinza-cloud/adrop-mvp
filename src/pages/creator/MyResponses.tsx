import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { collection, query, where, onSnapshot, getDoc, getDocs, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuthStore } from "../../store/authStore";
import { Briefcase, TrendingUp, DollarSign, CheckCircle, Clock, ArrowRight, MessageSquare, Upload, Link2, CheckCircle2, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { formatUsdAmount, getCreatorPayoutAmount, getViewsPaymentMeta, getViewsReviewDueDate, hasFinalizedViewsPricing, isViewsPaymentModel } from "../../lib/dealPricing";

interface Application {
  id: string;
  offerId: string;
  customerId: string;
  status: "pending" | "accepted" | "in_review" | "completed" | "rejected";
  createdAt: any;
  completedAt?: any;
  reportLink?: string;
  requirementsMet?: boolean;
  isInvite?: boolean;
  message?: string;
  payoutStatus?: string;
  holdUntil?: any;
  creatorPayoutAmount?: number;
  paymentModel?: string;
  statsReviewDueAt?: any;
  actualViews?: number;
}

interface Offer {
  id: string;
  title: string;
  description: string;
  budget?: number;
  paymentDetails?: {
    cpm?: number | null;
    minViews?: number | null;
    maxPayout?: number | null;
  } | null;
  geo: string;
  paymentModel: string;
  type: "ugc" | "clip";
  platforms: string[];
  coverImageUrl?: string;
}

export function CreatorMyResponses() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"orders" | "stats">("orders");
  const [applications, setApplications] = useState<Application[]>([]);
  const [offers, setOffers] = useState<{ [key: string]: Offer }>({});
  const [customers, setCustomers] = useState<{ [key: string]: any }>({});
  const [submittingOfferId, setSubmittingOfferId] = useState<string | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [reportLink, setReportLink] = useState("");
  const [requirementsMet, setRequirementsMet] = useState(false);
  const [notification, setNotification] = useState<{title: string, message: string, type: 'success' | 'info'} | null>(null);

  const hashReportLink = async (value: string) => {
    try {
      const data = new TextEncoder().encode(value);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      return Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } catch (error) {
      console.warn("Could not hash report link:", error);
      return null;
    }
  };

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "applications"),
      where("creatorId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const appsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Application[];

      const visibleApps = appsData.filter(app => app.status !== "rejected");

      setApplications(visibleApps.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date();
        const dateB = b.createdAt?.toDate?.() || new Date();
        return dateB.getTime() - dateA.getTime();
      }));

      // Fetch offer details
      const offerIds = [...new Set(visibleApps.map(app => app.offerId))];
      const offersData: { [key: string]: Offer } = {};

      Promise.all(
        offerIds.map(async (offerId) => {
          try {
            const offerDoc = await getDoc(doc(db, "offers", offerId));
            if (offerDoc.exists()) {
              offersData[offerId] = { id: offerDoc.id, ...offerDoc.data() } as Offer;
            }
          } catch (e) {
            console.error("Error fetching offer:", e);
          }
        })
      ).then(() => {
        setOffers(offersData);
      });

      // Fetch customer details
      const customerIds = [...new Set(visibleApps.map(app => app.customerId))];
      const customersData: { [key: string]: any } = {};

      Promise.all(
        customerIds.map(async (customerId) => {
          try {
            const customerDoc = await getDoc(doc(db, "users", customerId));
            if (customerDoc.exists()) {
              customersData[customerId] = { id: customerDoc.id, ...customerDoc.data() };
            }
          } catch (e) {
            console.error("Error fetching customer:", e);
          }
        })
      ).then(() => {
        setCustomers(customersData);
      });
    });

    return () => unsubscribe();
  }, [user]);

  const handleSubmitReport = async () => {
    if (!selectedOffer || !selectedAppId || !reportLink.trim() || !requirementsMet) return;

    setSubmittingOfferId(selectedOffer.id);
    try {
      const reportLinkHash = await hashReportLink(reportLink.trim());

      // Update application status to in_review and add report data
      await updateDoc(doc(db, "applications", selectedAppId), {
        status: "in_review",
        reportLink: reportLink,
        reportLinkHash: reportLinkHash,
        requirementsMet: requirementsMet,
        submittedAt: serverTimestamp()
      });

      // Send notification to customer
      const application = applications.find(app => app.id === selectedAppId);
      if (application) {
        await addDoc(collection(db, "notifications"), {
          recipientId: application.customerId,
          senderId: user.uid,
          type: "report_submitted",
          title: "Креатор отправил работу на проверку",
          message: `Креатор отправил ссылку на видео по офферу "${selectedOffer.title}". Проверьте скорее!`,
          offerId: selectedOffer.id,
          applicationId: selectedAppId,
          read: false,
          createdAt: serverTimestamp()
        });
      }

      // Send message to chat
      const chatQuery = query(
        collection(db, "chats"),
        where("offerId", "==", selectedOffer.id),
        where("creatorId", "==", user.uid)
      );
      const chatSnapshot = await getDocs(chatQuery);

      if (!chatSnapshot.empty) {
        const chatId = chatSnapshot.docs[0].id;
        await addDoc(collection(db, "chats", chatId, "messages"), {
          senderId: "system",
          text: `🎬 Работа отправлена на проверку`,
          type: "report_submitted",
          offerTitle: selectedOffer.title,
          reportLink: reportLink,
          createdAt: serverTimestamp(),
          isSystem: true
        });
      }

      // Show success notification to creator
      setNotification({
        title: "Отправлено на проверку!",
        message: `Работа по офферу "${selectedOffer.title}" отправлена на проверку заказчику. Ожидайте ответа.`,
        type: "success"
      });

      setReportLink("");
      setRequirementsMet(false);
      setReportModalOpen(false);
      setSelectedOffer(null);
      setSelectedAppId(null);
    } catch (error) {
      console.error("Error submitting report:", error);
    } finally {
      setSubmittingOfferId(null);
    }
  };

  const resolveStatus = (app: Application) => {
    if (app.status === "completed" && !app.completedAt) {
      return "in_review";
    }
    return app.status;
  };

  const getViewsResponseState = (app: Application, offer?: Offer) => {
    const isViewsOrder = isViewsPaymentModel(offer?.paymentModel || app.paymentModel);
    const viewsMeta = getViewsPaymentMeta({
      ...app,
      paymentDetails: offer?.paymentDetails,
      price: Number(offer?.budget || 0),
    });
    const statsReviewDate = getViewsReviewDueDate(app);
    const collectingStats = isViewsOrder && app.payoutStatus === "collecting_stats";
    const finalized = hasFinalizedViewsPricing({
      ...app,
      paymentModel: offer?.paymentModel || app.paymentModel,
    });
    const settledPayout = finalized
      ? getCreatorPayoutAmount(app, offer?.budget || 0)
      : null;

    return {
      isViewsOrder,
      viewsMeta,
      statsReviewDate,
      collectingStats,
      finalized,
      settledPayout,
    };
  };

  const statsApps = applications.filter(app => {
    const status = resolveStatus(app);
    return status === "accepted" || status === "in_review" || status === "completed";
  });

  const completedApps = statsApps.filter(app => resolveStatus(app) === "completed");
  const inReviewApps = statsApps.filter(app => resolveStatus(app) === "in_review");

  const holdApps = statsApps.filter(app => {
    return app.payoutStatus === "hold";
  });

  const earningReadyApps = completedApps.filter((app) => {
    const offer = offers[app.offerId];
    const viewsState = getViewsResponseState(app, offer);
    if (viewsState.isViewsOrder) {
      return viewsState.finalized || app.payoutStatus === "paid" || app.payoutStatus === "hold";
    }
    return true;
  });

  const stats = {
    totalOrders: statsApps.length,
    completedOrders: completedApps.length,
    inProgressOrders: inReviewApps.length,
    holdAmount: holdApps.reduce((sum, app) => sum + getCreatorPayoutAmount(app, offers[app.offerId]?.budget || 0), 0),
    totalEarnings: earningReadyApps.reduce((sum, app) => {
      const offer = offers[app.offerId];
      return sum + getCreatorPayoutAmount(app, offer?.budget || 0);
    }, 0),
    avgEarningPerOrder: earningReadyApps.length > 0
      ? Math.round(earningReadyApps.reduce((sum, app) => sum + getCreatorPayoutAmount(app, offers[app.offerId]?.budget || 0), 0) / earningReadyApps.length)
      : 0,
  };

  const getStatusBadge = (status: string, completedAt?: any) => {
    const effectiveStatus = status === "completed" && !completedAt ? "in_review" : status;
    switch (effectiveStatus) {
      case "pending":
        return <span className="px-3 py-1 rounded-full bg-white/10 text-foreground/70 text-xs font-medium border border-white/20">Ожидает подтверждения бренда</span>;
      case "accepted":
        return <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium border border-blue-500/30">Принят в работу</span>;
      case "in_review":
        return <span className="px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-400 text-xs font-medium border border-yellow-500/30">На согласовании</span>;
      case "completed":
        return <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-medium border border-green-500/30">Заказ выполнен</span>;
      default:
        return null;
    }
  };

  return (
    <div className="w-full px-6 sm:px-8 lg:px-12 2xl:px-16 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold mb-2">Отклики и заказы</h1>
        <p className="text-foreground/60">Здесь все отклики: ожидание, работа и статистика по выполненным заказам</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 bg-card border border-white/10 rounded-xl p-2 w-fit">
        <button
          onClick={() => setActiveTab("orders")}
          className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
            activeTab === "orders"
              ? "bg-ugc-primary text-white"
              : "text-foreground/60 hover:text-white hover:bg-white/5"
          }`}
        >
          <Briefcase className="w-4 h-4 inline mr-2" />
          Мои заказы
        </button>
        <button
          onClick={() => setActiveTab("stats")}
          className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
            activeTab === "stats"
              ? "bg-ugc-primary text-white"
              : "text-foreground/60 hover:text-white hover:bg-white/5"
          }`}
        >
          <TrendingUp className="w-4 h-4 inline mr-2" />
          Статистика
        </button>
      </div>

      {/* Content */}
      {activeTab === "orders" ? (
        <div className="space-y-6">
          {applications.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16 bg-card border border-white/10 rounded-2xl"
            >
              <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Briefcase className="w-10 h-10 text-foreground/20" />
              </div>
              <h2 className="text-xl font-bold mb-2">Пока нет откликов</h2>
              <p className="text-foreground/60 mb-6 max-w-md mx-auto">
                Вы ещё не откликнулись на офферы. Найдите интересные проекты и начните зарабатывать!
              </p>
              <Link href="/creator/offers">
                <button className="h-12 px-8 bg-ugc-primary hover:bg-ugc-primary/90 text-white rounded-xl font-bold transition-all flex items-center gap-2 mx-auto">
                  Найти офферы <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </motion.div>
          ) : (
            applications.map((application, index) => {
              const offer = offers[application.offerId];
              const customer = customers[application.customerId];
              const effectiveStatus = resolveStatus(application);
              const holdDate = application.holdUntil?.toDate ? application.holdUntil.toDate() : null;
              const holdActive = application.payoutStatus === "hold" && holdDate && holdDate > new Date();
              const viewsState = getViewsResponseState(application, offer);
              const creatorPayoutAmount = viewsState.isViewsOrder && !viewsState.finalized
                ? null
                : getCreatorPayoutAmount(application, offer?.budget || 0);

              if (!offer || !customer) return null;

              return (
                <motion.div
                  key={application.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-card border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all"
                >
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="font-bold text-lg">{offer.title}</h3>
                        {getStatusBadge(application.status, application.completedAt)}
                      </div>
                      <p className="text-sm text-foreground/60 mb-2">
                        <span className="font-medium text-foreground/80">Заказчик:</span> {customer.name || "Заказчик"}
                      </p>
                      <p className="text-sm text-foreground/60 mb-2">
                        <span className="font-medium text-foreground/80">Дата:</span> {
                          application.createdAt?.toDate
                            ? new Date(application.createdAt.toDate()).toLocaleDateString('ru-RU')
                            : 'Недавно'
                        }
                      </p>
                      <div className="flex items-center gap-4 text-sm text-foreground/60">
                        <span>{offer.geo}</span>
                        <span>·</span>
                        <span>{offer.paymentModel}</span>
                      </div>

                      {/* Show report link if submitted */}
                      {application.reportLink && (
                        <div className="mt-4 bg-ugc-primary/5 border border-ugc-primary/20 rounded-xl p-4">
                          <div className="flex items-center gap-2 text-sm text-ugc-primary mb-2">
                            <Link2 className="w-4 h-4" />
                            <span className="font-medium">Отправлено на проверку:</span>
                          </div>
                          <a
                            href={application.reportLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-foreground/80 hover:text-white flex items-center gap-1"
                          >
                            {application.reportLink}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          {application.requirementsMet && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-green-400">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Все требования соблюдены</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-2 mb-1 justify-end">
                        <DollarSign className="w-4 h-4 text-green-400" />
                        <span className="text-2xl font-mono font-bold text-green-400">
                          {viewsState.isViewsOrder && !viewsState.finalized
                            ? `$${formatUsdAmount(viewsState.viewsMeta.cpm)} / 1K`
                            : creatorPayoutAmount}
                        </span>
                      </div>
                      <p className="text-xs text-foreground/60 mb-3">
                        {viewsState.isViewsOrder && !viewsState.finalized
                          ? `до $${formatUsdAmount(viewsState.viewsMeta.maxPayout)} за интеграцию`
                          : "Заработок"}
                      </p>
                      <div className="flex gap-2 justify-end flex-col">
                        {effectiveStatus !== "pending" && (
                          <Link href="/creator/messages">
                            <button className="h-10 px-4 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-colors flex items-center gap-2 text-sm">
                              <MessageSquare className="w-4 h-4" /> Чат
                            </button>
                          </Link>
                        )}
                        {effectiveStatus === "pending" && (
                          <div className="h-10 px-4 bg-white/5 text-foreground/60 rounded-xl font-medium flex items-center justify-center text-sm">
                            Ожидаем решение бренда
                          </div>
                        )}
                        {effectiveStatus === "accepted" && (
                          <button
                            onClick={() => {
                              setSelectedOffer(offer);
                              setSelectedAppId(application.id);
                              setReportModalOpen(true);
                            }}
                            className="h-10 px-4 bg-ugc-primary hover:bg-ugc-primary/90 text-white rounded-xl font-medium transition-colors flex items-center gap-2 text-sm"
                          >
                            <Upload className="w-4 h-4" /> Отправить на проверку
                          </button>
                        )}
                        {(effectiveStatus === "in_review" || effectiveStatus === "completed") && (
                          <button
                            disabled
                            className="h-10 px-4 bg-white/5 text-foreground/50 rounded-xl font-medium flex items-center gap-2 text-sm cursor-not-allowed"
                          >
                            <Clock className="w-4 h-4" /> {
                              effectiveStatus === "in_review"
                                ? "На проверке"
                                : viewsState.collectingStats && viewsState.statsReviewDate
                                  ? viewsState.statsReviewDate > new Date()
                                    ? `Собираем статистику до ${viewsState.statsReviewDate.toLocaleDateString("ru-RU")}`
                                    : "Ждём фиксацию просмотров"
                                  : holdActive && holdDate
                                    ? `В холде до ${holdDate.toLocaleDateString("ru-RU")}`
                                    : "Выполнен"
                            }
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats.totalOrders === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="col-span-full text-center py-16 bg-card border border-white/10 rounded-2xl"
            >
              <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <TrendingUp className="w-10 h-10 text-foreground/20" />
              </div>
              <h2 className="text-xl font-bold mb-2">Статистика появится позже</h2>
              <p className="text-foreground/60 mb-6 max-w-md mx-auto">
                Начните выполнять заказы, и здесь появится ваша статистика заработка
              </p>
              <Link href="/creator/offers">
                <button className="h-12 px-8 bg-ugc-primary hover:bg-ugc-primary/90 text-white rounded-xl font-bold transition-all flex items-center gap-2 mx-auto">
                  Найти офферы <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </motion.div>
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-white/10 rounded-2xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                    <Briefcase className="w-6 h-6 text-blue-400" />
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-foreground/60 text-sm mb-1">Всего заказов</p>
                <p className="text-3xl font-mono font-bold">{stats.totalOrders}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-card border border-white/10 rounded-2xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  </div>
                </div>
                <p className="text-foreground/60 text-sm mb-1">Завершено</p>
                <p className="text-3xl font-mono font-bold">{stats.completedOrders}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-card border border-white/10 rounded-2xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center">
                    <Clock className="w-6 h-6 text-yellow-400" />
                  </div>
                </div>
                <p className="text-foreground/60 text-sm mb-1">На проверке</p>
                <p className="text-3xl font-mono font-bold">{stats.inProgressOrders}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-card border border-white/10 rounded-2xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-yellow-400" />
                  </div>
                </div>
                <p className="text-foreground/60 text-sm mb-1">В холде</p>
                <p className="text-3xl font-mono font-bold text-yellow-400">${stats.holdAmount}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="bg-card border border-white/10 rounded-2xl p-6 md:col-span-2 lg:col-span-2"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-400" />
                  </div>
                </div>
                <p className="text-foreground/60 text-sm mb-1">Общий заработок</p>
                <p className="text-3xl font-mono font-bold text-green-400">${stats.totalEarnings}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-card border border-white/10 rounded-2xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-ugc-primary/10 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-ugc-primary" />
                  </div>
                </div>
                <p className="text-foreground/60 text-sm mb-1">Средний заработок</p>
                <p className="text-3xl font-mono font-bold">${stats.avgEarningPerOrder}</p>
              </motion.div>
            </>
          )}
        </div>
      )}

      {/* Report Modal */}
      <AnimatePresence>
        {reportModalOpen && selectedOffer && (
          <>
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
              onClick={() => setReportModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card border border-white/10 rounded-3xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-6 border-b border-white/10">
                <h3 className="text-lg font-bold">Отправить на проверку</h3>
                <p className="text-sm text-foreground/60">{selectedOffer.title}</p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Ссылка на видео *</label>
                  <input
                    type="url"
                    value={reportLink}
                    onChange={(e) => setReportLink(e.target.value)}
                    placeholder="https://youtube.com/shorts/..."
                    className="w-full h-12 bg-card border border-white/10 rounded-xl px-4 focus:outline-none focus:border-ugc-primary transition-colors font-mono text-sm"
                  />
                  <p className="text-xs text-foreground/50 mt-2">
                    YouTube Shorts, TikTok, Instagram Reels
                  </p>
                </div>

                <div className="flex items-start gap-3 p-4 bg-white/5 border border-white/10 rounded-xl">
                  <input
                    type="checkbox"
                    id="requirements"
                    checked={requirementsMet}
                    onChange={(e) => setRequirementsMet(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-white/20 text-ugc-primary focus:ring-ugc-primary focus:ring-offset-0"
                  />
                  <div className="flex-1">
                    <label htmlFor="requirements" className="text-sm font-medium cursor-pointer">
                      Подтверждаю, что все требования оффера соблюдены
                    </label>
                    <p className="text-xs text-foreground/50 mt-1">
                      Креатив соответствует ТЗ и срокам
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setReportModalOpen(false);
                      setReportLink("");
                      setRequirementsMet(false);
                      setSelectedOffer(null);
                      setSelectedAppId(null);
                    }}
                    className="flex-1 h-12 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleSubmitReport}
                    disabled={!reportLink.trim() || !requirementsMet || submittingOfferId === selectedOffer.id}
                    className="flex-1 h-12 bg-ugc-primary hover:bg-ugc-primary/90 text-white rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-ugc-primary/20 flex items-center justify-center gap-2"
                  >
                    {submittingOfferId === selectedOffer.id ? (
                      <>Отправка...</>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" /> Отправить
                      </>
                    )}
                  </button>
                </div>
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
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
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
  );
}
