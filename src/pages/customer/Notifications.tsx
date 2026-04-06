import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuthStore } from "../../store/authStore";
import { Bell, BellRing, User, Check, X, Briefcase, MessageSquare, Send, Clock, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  senderId: string;
  offerId?: string;
  chatId?: string;
  read: boolean;
  createdAt: any;
}

export function CustomerNotifications() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");

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
      })) as Notification[];
      setNotifications(notifsData.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date();
        const dateB = b.createdAt?.toDate?.() || new Date();
        return dateB.getTime() - dateA.getTime();
      }));
    });

    return () => unsubscribe();
  }, [user]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, "notifications", notificationId), {
        read: true
      });
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      await Promise.all(
        unreadNotifications.map(n =>
          updateDoc(doc(db, "notifications", n.id), { read: true })
        )
      );
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await deleteDoc(doc(db, "notifications", notificationId));
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "new_application":
        return <User className="w-5 h-5" />;
      case "offer_invite":
        return <Send className="w-5 h-5" />;
      case "new_message":
        return <MessageSquare className="w-5 h-5" />;
      case "application_accepted":
        return <CheckCircle2 className="w-5 h-5" />;
      case "order_update":
        return <Briefcase className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "new_application":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "offer_invite":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "new_message":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "application_accepted":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "order_update":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      default:
        return "bg-white/5 text-foreground/60 border-white/10";
    }
  };

  const filteredNotifications = notifications.filter(n =>
    filter === "all" ? true : !n.read
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="w-full px-6 sm:px-8 lg:px-12 2xl:px-16 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Bell className="w-8 h-8 text-foreground/60" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold">Уведомления</h1>
            <p className="text-foreground/60">Будьте в курсе всех событий</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilter(filter === "all" ? "unread" : "all")}
            className={`h-10 px-4 rounded-lg font-medium transition-colors ${
              filter === "unread"
                ? "bg-primary text-white"
                : "bg-card border border-white/10 hover:bg-white/5"
            }`}
          >
            {filter === "unread" ? "Только непрочитанные" : "Все"}
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="h-10 px-4 rounded-lg font-medium bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors"
            >
              <Check className="w-4 h-4 inline mr-1" /> Прочитать все
            </button>
          )}
        </div>
      </div>

      {filteredNotifications.length === 0 ? (
        <div className="bg-card border border-white/5 rounded-3xl p-12 text-center">
          <BellRing className="w-16 h-16 mx-auto mb-4 text-foreground/20" />
          <h3 className="text-xl font-bold mb-2">
            {filter === "unread" ? "Нет непрочитанных уведомлений" : "Уведомлений пока нет"}
          </h3>
          <p className="text-foreground/60">
            {filter === "unread"
              ? "Все уведомления прочитаны!"
              : "Здесь будут отображаться уведомления о новых откликах, сообщениях и других событиях."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-card border rounded-2xl p-6 transition-all hover:shadow-xl ${
                !notification.read
                  ? "border-primary/50 bg-primary/5 shadow-lg shadow-primary/10"
                  : "border-white/5"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${getNotificationColor(notification.type)}`}>
                  {getNotificationIcon(notification.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <h3 className={`font-bold text-lg mb-1 ${!notification.read ? "text-white" : "text-foreground/80"}`}>
                        {notification.title}
                      </h3>
                      <p className="text-foreground/60 text-sm">
                        {notification.message}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!notification.read && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="w-8 h-8 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 flex items-center justify-center transition-colors"
                          title="Отметить как прочитанное"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notification.id)}
                        className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-colors"
                        title="Удалить"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-foreground/40">
                      <Clock className="w-3 h-3" />
                      {notification.createdAt?.toDate
                        ? new Date(notification.createdAt.toDate()).toLocaleString('ru-RU', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'Недавно'}
                    </div>

                    {notification.offerId && (
                      <Link href={`/customer/applications`}>
                        <button className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">
                          Посмотреть отклики →
                        </button>
                      </Link>
                    )}

                    {notification.chatId && (
                      <Link href={`/customer/messages`}>
                        <button className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">
                          Открыть чат →
                        </button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
