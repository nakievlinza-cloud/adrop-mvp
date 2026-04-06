import { Link, useLocation } from "wouter";
import React, { useState, useEffect } from "react";
import { User, Settings, CreditCard, LogOut, MessageSquare, Bell, Wallet, ArrowUpRight, X, FileText, HelpCircle, HeadphonesIcon, Send, Key, Share2, Briefcase } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCreatorStore } from "../store/creatorStore";
import { useAuthStore } from "../store/authStore";
import { collection, query, where, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { getAvatarSrc } from "../lib/avatar";

function NavbarLogo({ className = "h-6 w-auto" }: { className?: string }) {
  return (
    <svg width="140" height="28" viewBox="0 0 160 30" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M15 2 L2 28 H8 L15 14 L22 28 H28 L15 2 Z" fill="url(#logo-grad)" />
      <path d="M15 18 L11 26 H19 Z" fill="url(#logo-grad)" />
      <path d="M35 2 H48 C56 2 60 7 60 15 C60 23 56 28 48 28 H35 V2 Z M41 7 V23 H47 C52 23 54 20 54 15 C54 10 52 7 47 7 H41 Z" fill="url(#logo-grad)" />
      <path d="M68 2 H81 C87 2 91 5 91 11 C91 15 88 18 84 19 L92 28 H85 L78 20 H74 V28 H68 V2 Z M74 7 V15 H80 C83 15 85 13.5 85 11 C85 8.5 83 7 80 7 H74 Z" fill="url(#logo-grad)" />
      <path d="M108 2 C99 2 95 7 95 15 C95 23 99 28 108 28 C117 28 121 23 121 15 C121 7 117 2 108 2 Z M108 7 C113 7 115 10 115 15 C115 20 113 23 108 23 C103 23 101 20 101 15 C101 10 103 7 108 7 Z" fill="url(#logo-grad)" />
      <path d="M128 2 H141 C147 2 151 5 151 11 C151 17 147 20 141 20 H134 V28 H128 V2 Z M134 7 V15 H140 C143 15 145 13.5 145 11 C145 8.5 143 7 140 7 H134 Z" fill="url(#logo-grad)" />
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="0" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#999999" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Navbar() {
  const [location, setLocation] = useLocation();
  const { user, userData, role, logout } = useAuthStore();

  const isCreator = role === 'creator';
  const isCustomer = role === 'customer';

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [messageBadgeCount, setMessageBadgeCount] = useState(0);
  const [isWideLanding, setIsWideLanding] = useState(false);
  const [landingCompact, setLandingCompact] = useState(false);

  const balance = userData?.balance || 0;
  const { requestPayout } = useCreatorStore();
  const unreadCount = notifications.filter(n => !n.read).length;
  const isPublicLanding = location === "/" && !isCreator && !isCustomer;
  const useCenteredLandingLogo = isPublicLanding && isWideLanding;
  const logoHref = isCreator ? "/creator/offers" : isCustomer ? "/customer/dashboard" : "/";

  // Fetch notifications from Firebase
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "notifications"),
      where("recipientId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotifications(notifsData.slice(0, 5)); // Show only 5 latest
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user || (!isCreator && !isCustomer)) {
      setMessageBadgeCount(0);
      return;
    }

    const chatsQuery = query(
      collection(db, "chats"),
      where(isCreator ? "creatorId" : "customerId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
      const unreadCount = snapshot.docs.reduce((total, chatDoc) => {
        return total + Number(chatDoc.data().unread || 0);
      }, 0);

      const conversationsCount = snapshot.docs.filter((chatDoc) => {
        return Boolean(chatDoc.data().lastMessage);
      }).length;

      setMessageBadgeCount(unreadCount > 0 ? unreadCount : conversationsCount);
    });

    return () => unsubscribe();
  }, [isCreator, isCustomer, user]);

  useEffect(() => {
    if (!isPublicLanding) {
      setIsWideLanding(false);
      return;
    }

    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const updateLandingWidth = () => setIsWideLanding(mediaQuery.matches);

    updateLandingWidth();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updateLandingWidth);
      return () => mediaQuery.removeEventListener("change", updateLandingWidth);
    }

    mediaQuery.addListener(updateLandingWidth);
    return () => mediaQuery.removeListener(updateLandingWidth);
  }, [isPublicLanding]);

  useEffect(() => {
    if (!useCenteredLandingLogo) {
      setLandingCompact(false);
      return;
    }

    const handleScroll = () => {
      setLandingCompact(window.scrollY > 72);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, [useCenteredLandingLogo]);

  const customerBalance = userData?.balance || 0;
  const messageBadgeLabel = messageBadgeCount > 99 ? "99+" : String(messageBadgeCount);

  const publicAuthActions = (
    <>
      <Link href="/auth?mode=login" className="text-xs sm:text-sm font-medium text-foreground hover:text-white transition-colors">
        Войти
      </Link>
      <Link href="/auth?mode=register" className="text-xs sm:text-sm font-medium bg-primary text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap">
        Регистрация
      </Link>
    </>
  );

  const handlePayoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(payoutAmount);
    if (requestPayout(amount, balance)) {
      setIsPayoutModalOpen(false);
      setPayoutAmount("");
      alert(`Заявка на вывод $${amount} создана! Ожидайте обработки.`);
    } else {
      alert("Недостаточно средств или неверная сумма");
    }
  };

  const markAllAsRead = async () => {
    try {
      await Promise.all(
        notifications.filter(n => !n.read).map(n =>
          updateDoc(doc(db, "notifications", n.id), { read: true })
        )
      );
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const openReviewFromNotification = async (notif: any) => {
    try {
      await updateDoc(doc(db, "notifications", notif.id), { read: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
    setIsNotifOpen(false);
    const reviewQuery = notif.reviewId ? `&reviewId=${notif.reviewId}` : "";
    setLocation(`/creator/profile?tab=reviews${reviewQuery}`);
  };

  return (
    <>
      <nav
        className={`sticky top-0 z-40 transition-[background-color,backdrop-filter,box-shadow] duration-500 ${
          useCenteredLandingLogo
            ? landingCompact
              ? "bg-card/70 backdrop-blur-md shadow-[0_12px_40px_rgba(0,0,0,0.28)]"
              : "bg-card/20 backdrop-blur-sm"
            : "bg-card/50 backdrop-blur-md"
        }`}
      >
        <div className="w-full px-4 sm:px-6 lg:px-8">
          {useCenteredLandingLogo ? (
            <div className="grid h-16 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4">
              <motion.div
                layout
                transition={{ type: "spring", stiffness: 280, damping: 28 }}
                className={landingCompact ? "col-start-1 justify-self-start" : "col-start-2 justify-self-center"}
              >
                <Link href={logoHref} className="flex items-center">
                  <motion.div
                    layout
                    transition={{ type: "spring", stiffness: 280, damping: 28 }}
                    animate={{ scale: landingCompact ? 0.92 : 1 }}
                  >
                    <NavbarLogo className="h-5 md:h-6 w-auto" />
                  </motion.div>
                </Link>
              </motion.div>

              <div className="col-start-3 justify-self-end">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  {publicAuthActions}
                </div>
              </div>
            </div>
          ) : (
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              <Link href={logoHref} className="flex items-center">
                <NavbarLogo className="h-6 w-auto" />
              </Link>
              {!isCreator && !isCustomer && (
                <div className="hidden md:flex items-center space-x-6">
                  {/* Removed demo links */}
                </div>
              )}
              {isCreator && (
                <div className="hidden md:flex items-center space-x-4">
                  <Link href="/creator/offers" className={`text-sm font-medium transition-colors ${location === '/creator/offers' ? 'text-white' : 'text-foreground/60 hover:text-white'}`}>
                    Офферы
                  </Link>
                  <Link href="/creator/messages" className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${location === '/creator/messages' ? 'text-white' : 'text-foreground/60 hover:text-white'}`}>
                    <span>Сообщения</span>
                    {messageBadgeCount > 0 && (
                      <span className="inline-flex min-w-[1.15rem] items-center justify-center rounded-full border border-violet-300/20 bg-ugc-primary px-1 text-[10px] font-semibold leading-none text-white shadow-[0_0_18px_rgba(139,92,246,0.32)]">
                        {messageBadgeLabel}
                      </span>
                    )}
                  </Link>
                </div>
              )}
              {isCustomer && (
                <div className="hidden md:flex items-center space-x-4">
                  <Link href="/customer/dashboard" className={`text-sm font-medium transition-colors ${location === '/customer/dashboard' ? 'text-white' : 'text-foreground/60 hover:text-white'}`}>
                    Дашборд
                  </Link>
                  <Link href="/customer/offers" className={`text-sm font-medium transition-colors ${location === '/customer/offers' ? 'text-white' : 'text-foreground/60 hover:text-white'}`}>
                    Мои офферы
                  </Link>
                  <Link href="/customer/creators" className={`text-sm font-medium transition-colors ${location === '/customer/creators' ? 'text-white' : 'text-foreground/60 hover:text-white'}`}>
                    Креаторы
                  </Link>
                  <Link href="/customer/applications" className={`text-sm font-medium transition-colors ${location === '/customer/applications' ? 'text-white' : 'text-foreground/60 hover:text-white'}`}>
                    Отклики
                  </Link>
                  <Link href="/customer/orders" className={`text-sm font-medium transition-colors ${location === '/customer/orders' ? 'text-white' : 'text-foreground/60 hover:text-white'}`}>
                    Заказы
                  </Link>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              {isCreator ? (
                <div className="flex items-center gap-4">
                  {/* Balance Display */}
                  <button
                    onClick={() => setIsPayoutModalOpen(true)}
                    className="hidden sm:flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-xl transition-colors group"
                  >
                    <Wallet className="w-4 h-4 text-foreground/60 group-hover:text-white transition-colors" />
                    <span className="font-mono font-bold text-green-400">${balance.toFixed(2)}</span>
                  </button>

                  <Link href="/creator/messages" className="relative text-foreground/60 hover:text-white transition-colors p-2">
                    <MessageSquare className="w-5 h-5" />
                    {messageBadgeCount > 0 && (
                      <span className="absolute -right-1 -top-1 inline-flex min-w-[1.1rem] items-center justify-center rounded-full border border-violet-300/20 bg-ugc-primary px-1 text-[10px] font-semibold leading-none text-white shadow-[0_0_18px_rgba(139,92,246,0.32)]">
                        {messageBadgeLabel}
                      </span>
                    )}
                  </Link>

                  <div className="relative">
                    <button 
                      onClick={() => setIsNotifOpen(!isNotifOpen)} 
                      className="relative text-foreground/60 hover:text-white transition-colors p-2"
                    >
                      <Bell className="w-5 h-5" />
                      {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full shadow-[0_0_5px_rgba(233,69,96,0.8)]"></span>
                      )}
                    </button>

                    <AnimatePresence>
                      {isNotifOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsNotifOpen(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 mt-2 w-80 bg-card border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
                          >
                            <div className="p-4 border-b border-white/10 flex justify-between items-center">
                              <h3 className="font-bold">Уведомления</h3>
                              {unreadCount > 0 && (
                                <button onClick={markAllAsRead} className="text-xs text-ugc-primary hover:underline">
                                  Прочитать все
                                </button>
                              )}
                            </div>
                            <div className="max-h-80 overflow-y-auto">
                              {notifications.length > 0 ? (
                                notifications.map(notif => (
                                  <div key={notif.id} className={`p-4 border-b border-white/5 hover:bg-white/5 transition-colors ${!notif.read ? 'bg-white/5' : ''}`}>
                                    <div className="flex justify-between items-start mb-1">
                                      <span className={`text-sm font-bold ${!notif.read ? 'text-white' : 'text-foreground/80'}`}>{notif.title}</span>
                                      <span className="text-xs text-foreground/50">
                                        {notif.createdAt?.toDate
                                          ? new Date(notif.createdAt.toDate()).toLocaleString('ru-RU', {
                                              day: 'numeric',
                                              month: 'short',
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            })
                                          : 'Недавно'}
                                      </span>
                                    </div>
                                    <p className="text-xs text-foreground/60">{notif.message}</p>
                                    {notif.type === "review_received" && (
                                      <button
                                        onClick={() => openReviewFromNotification(notif)}
                                        className="mt-3 text-xs text-ugc-primary hover:underline"
                                      >
                                        Открыть отзыв
                                      </button>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <div className="p-4 text-center text-sm text-foreground/60">Нет новых уведомлений</div>
                              )}
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="relative ml-2">
                    <button 
                      onClick={() => setIsProfileOpen(!isProfileOpen)}
                      className="w-10 h-10 rounded-full bg-ugc-primary/20 border border-ugc-primary/50 flex items-center justify-center text-ugc-primary hover:bg-ugc-primary/30 transition-colors overflow-hidden"
                    >
                      <img src={getAvatarSrc(userData?.avatar, userData?.name, "creator")} alt="Avatar" className="w-full h-full object-cover" />
                    </button>

                    <AnimatePresence>
                      {isProfileOpen && (
                        <>
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setIsProfileOpen(false)}
                          />
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 mt-2 w-56 bg-card border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
                          >
                            <div className="p-4 border-b border-white/10">
                              <p className="font-medium text-white">{userData?.name || "Креатор"}</p>
                              <p className="text-sm text-foreground/60 truncate">{user?.email}</p>
                              <div className="mt-2 flex items-center justify-between bg-white/5 rounded-lg p-2">
                                <span className="text-xs text-foreground/60">Баланс:</span>
                                <span className="font-mono font-bold text-green-400">${balance.toFixed(2)}</span>
                              </div>
                            </div>
                            <div className="p-2 max-h-96 overflow-y-auto">
                              <Link href="/creator/profile">
                                <button
                                  onClick={() => setIsProfileOpen(false)}
                                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left"
                                >
                                  <User className="w-4 h-4" /> Мой профиль
                                </button>
                              </Link>
                              <Link href="/creator/my-responses">
                                <button
                                  onClick={() => setIsProfileOpen(false)}
                                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left"
                                >
                                  <Briefcase className="w-4 h-4" /> Отклики и заказы
                                </button>
                              </Link>
                              <Link href="/creator/social-connect">
                                <button
                                  onClick={() => setIsProfileOpen(false)}
                                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left"
                                >
                                  <Share2 className="w-4 h-4" /> Подключить соц-сети
                                </button>
                              </Link>
                              <Link href="/creator/referral">
                                <button
                                  onClick={() => setIsProfileOpen(false)}
                                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left"
                                >
                                  <User className="w-4 h-4" /> Реферальная программа
                                </button>
                              </Link>
                              <Link href="/creator/faq">
                                <button
                                  onClick={() => setIsProfileOpen(false)}
                                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left"
                                >
                                  <HelpCircle className="w-4 h-4" /> Вопросы и ответы
                                </button>
                              </Link>
                              <Link href="/creator/support">
                                <button
                                  onClick={() => setIsProfileOpen(false)}
                                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left"
                                >
                                  <HeadphonesIcon className="w-4 h-4" /> Техническая поддержка
                                </button>
                              </Link>
                              <Link href="/creator/suggestion">
                                <button
                                  onClick={() => setIsProfileOpen(false)}
                                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left"
                                >
                                  <Send className="w-4 h-4" /> Предложение руководству
                                </button>
                              </Link>
                              <Link href="/creator/change-password">
                                <button
                                  onClick={() => setIsProfileOpen(false)}
                                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left"
                                >
                                  <Key className="w-4 h-4" /> Сменить пароль
                                </button>
                              </Link>
                            </div>
                            <div className="p-2 border-t border-white/10">
                              <button
                                onClick={async () => {
                                  setIsProfileOpen(false);
                                  await logout();
                                  setLocation("/");
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors text-left"
                              >
                                <LogOut className="w-4 h-4" /> Выйти
                              </button>
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ) : isCustomer ? (
                <div className="flex items-center gap-4">
                  {/* Balance Display */}
                  <Link href="/customer/profile?tab=finance">
                    <button className="hidden sm:flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-xl transition-colors group">
                      <Wallet className="w-4 h-4 text-foreground/60 group-hover:text-white transition-colors" />
                      <span className="font-mono font-bold text-white">${customerBalance.toFixed(2)}</span>
                    </button>
                  </Link>

                  <Link href="/customer/messages" className="relative text-foreground/60 hover:text-white transition-colors p-2">
                    <MessageSquare className="w-5 h-5" />
                    {messageBadgeCount > 0 && (
                      <span className="absolute -right-1 -top-1 inline-flex min-w-[1.1rem] items-center justify-center rounded-full border border-cyan-300/20 bg-clip-primary px-1 text-[10px] font-semibold leading-none text-white shadow-[0_0_18px_rgba(6,182,212,0.34)]">
                        {messageBadgeLabel}
                      </span>
                    )}
                  </Link>

                  <div className="relative">
                    <button 
                      onClick={() => setIsNotifOpen(!isNotifOpen)} 
                      className="relative text-foreground/60 hover:text-white transition-colors p-2"
                    >
                      <Bell className="w-5 h-5" />
                      {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full shadow-[0_0_5px_rgba(233,69,96,0.8)]"></span>
                      )}
                    </button>

                    <AnimatePresence>
                      {isNotifOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsNotifOpen(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 mt-2 w-80 bg-card border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
                          >
                            <div className="p-4 border-b border-white/10 flex justify-between items-center">
                              <h3 className="font-bold">Уведомления</h3>
                              {unreadCount > 0 && (
                                <button onClick={markAllAsRead} className="text-xs text-clip-primary hover:underline">
                                  Прочитать все
                                </button>
                              )}
                            </div>
                            <div className="max-h-80 overflow-y-auto">
                              {notifications.length > 0 ? (
                                notifications.map(notif => (
                                  <div key={notif.id} className={`p-4 border-b border-white/5 hover:bg-white/5 transition-colors ${!notif.read ? 'bg-white/5' : ''}`}>
                                    <div className="flex justify-between items-start mb-1">
                                      <span className={`text-sm font-bold ${!notif.read ? 'text-white' : 'text-foreground/80'}`}>{notif.title}</span>
                                      <span className="text-xs text-foreground/50">
                                        {notif.createdAt?.toDate
                                          ? new Date(notif.createdAt.toDate()).toLocaleString('ru-RU', {
                                              day: 'numeric',
                                              month: 'short',
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            })
                                          : 'Недавно'}
                                      </span>
                                    </div>
                                    <p className="text-xs text-foreground/60">{notif.message}</p>
                                  </div>
                                ))
                              ) : (
                                <div className="p-4 text-center text-sm text-foreground/60">Нет новых уведомлений</div>
                              )}
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="relative ml-2">
                    <button 
                      onClick={() => setIsProfileOpen(!isProfileOpen)}
                      className="w-10 h-10 rounded-full bg-clip-primary/20 border border-clip-primary/50 flex items-center justify-center text-clip-primary hover:bg-clip-primary/30 transition-colors overflow-hidden"
                    >
                      <img src={getAvatarSrc(userData?.avatar, userData?.name, "customer")} alt="Avatar" className="w-full h-full object-cover" />
                    </button>

                    <AnimatePresence>
                      {isProfileOpen && (
                        <>
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setIsProfileOpen(false)}
                          />
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 mt-2 w-56 bg-card border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
                          >
                            <div className="p-4 border-b border-white/10">
                              <p className="font-medium text-white">{userData?.name || "Заказчик"}</p>
                              <p className="text-sm text-foreground/60 truncate">{user?.email}</p>
                              <div className="mt-2 flex items-center justify-between bg-white/5 rounded-lg p-2">
                                <span className="text-xs text-foreground/60">Баланс:</span>
                                <span className="font-mono font-bold text-white">${customerBalance.toFixed(2)}</span>
                              </div>
                            </div>
                            <div className="p-2 max-h-96 overflow-y-auto">
                              <Link href="/customer/offers">
                                <button
                                  onClick={() => setIsProfileOpen(false)}
                                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left"
                                >
                                  <MessageSquare className="w-4 h-4" /> Мои офферы
                                </button>
                              </Link>
                              <Link href="/customer/referral">
                                <button
                                  onClick={() => setIsProfileOpen(false)}
                                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left"
                                >
                                  <User className="w-4 h-4" /> Реферальная программа
                                </button>
                              </Link>
                              <Link href="/creator/faq">
                                <button
                                  onClick={() => setIsProfileOpen(false)}
                                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left"
                                >
                                  <HelpCircle className="w-4 h-4" /> Вопросы и ответы
                                </button>
                              </Link>
                              <Link href="/creator/support">
                                <button
                                  onClick={() => setIsProfileOpen(false)}
                                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left"
                                >
                                  <HeadphonesIcon className="w-4 h-4" /> Техническая поддержка
                                </button>
                              </Link>
                              <Link href="/creator/suggestion">
                                <button
                                  onClick={() => setIsProfileOpen(false)}
                                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left"
                                >
                                  <Send className="w-4 h-4" /> Предложение руководству
                                </button>
                              </Link>
                              <Link href="/customer/profile">
                                <button
                                  onClick={() => setIsProfileOpen(false)}
                                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left"
                                >
                                  <Settings className="w-4 h-4" /> Настроить профиль
                                </button>
                              </Link>
                              <Link href="/creator/change-password">
                                <button
                                  onClick={() => setIsProfileOpen(false)}
                                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left"
                                >
                                  <Key className="w-4 h-4" /> Сменить пароль
                                </button>
                              </Link>
                            </div>
                            <div className="p-2 border-t border-white/10">
                              <button
                                onClick={async () => {
                                  setIsProfileOpen(false);
                                  await logout();
                                  setLocation("/");
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors text-left"
                              >
                                <LogOut className="w-4 h-4" /> Выйти
                              </button>
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ) : (
                publicAuthActions
              )}
            </div>
          </div>
          )}
        </div>
      </nav>

      {/* Payout Modal */}
      <AnimatePresence>
        {isPayoutModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPayoutModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card border border-white/10 rounded-3xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-background/50">
                <h2 className="text-xl font-display font-bold">Запрос выплаты</h2>
                <button onClick={() => setIsPayoutModalOpen(false)} className="text-foreground/60 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 flex justify-between items-center">
                  <span className="text-foreground/60">Доступно:</span>
                  <span className="font-mono font-bold text-xl text-green-400">${balance.toFixed(2)}</span>
                </div>
                <form onSubmit={handlePayoutSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Сумма выплаты (USDT)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/50">$</span>
                      <input 
                        type="number" 
                        min="10"
                        max={balance}
                        step="0.01"
                        required
                        value={payoutAmount}
                        onChange={(e) => setPayoutAmount(e.target.value)}
                        className="w-full h-12 bg-background border border-white/10 rounded-xl pl-8 pr-4 focus:outline-none focus:border-ugc-primary transition-colors font-mono"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="text-xs text-foreground/50 mb-4">
                    Выплата будет произведена на ваш сохраненный кошелек (USDT TRC20). Обработка занимает до 24 часов.
                  </div>
                  <button 
                    type="submit"
                    disabled={!payoutAmount || parseFloat(payoutAmount) > balance || parseFloat(payoutAmount) <= 0}
                    className="w-full h-12 rounded-xl font-semibold text-white bg-ugc-primary hover:bg-ugc-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    Вывести средства <ArrowUpRight className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
