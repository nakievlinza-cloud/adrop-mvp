import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuthStore } from "../../store/authStore";
import { Briefcase, User, CheckCircle2, XCircle, Clock, DollarSign, MapPin, MessageSquare, Calendar } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { getAvatarSrc } from "../../lib/avatar";

interface Invite {
  id: string;
  offerId: string;
  senderId: string;
  chatId?: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: any;
}

export function CreatorInvites() {
  const { user } = useAuthStore();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [offers, setOffers] = useState<{ [key: string]: any }>({});
  const [customers, setCustomers] = useState<{ [key: string]: any }>({});

  useEffect(() => {
    if (!user) return;

    // Listen for offer_invite notifications
    const q = query(
      collection(db, "notifications"),
      where("recipientId", "==", user.uid),
      where("type", "==", "offer_invite")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const invitesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Invite[];

      setInvites(invitesData.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date();
        const dateB = b.createdAt?.toDate?.() || new Date();
        return dateB.getTime() - dateA.getTime();
      }));

      // Fetch offer details
      const offerIds = [...new Set(invitesData.map(invite => invite.offerId))];
      const offersData: { [key: string]: any } = {};

      await Promise.all(
        offerIds.map(async (offerId) => {
          try {
            const offerDoc = await getDoc(doc(db, "offers", offerId));
            if (offerDoc.exists()) {
              offersData[offerId] = { id: offerDoc.id, ...offerDoc.data() };
            }
          } catch (e) {
            console.error("Error fetching offer:", e);
          }
        })
      );

      setOffers(offersData);

      // Fetch customer (sender) details
      const senderIds = [...new Set(invitesData.map(invite => invite.senderId))];
      const customersData: { [key: string]: any } = {};

      await Promise.all(
        senderIds.map(async (senderId) => {
          try {
            const customerDoc = await getDoc(doc(db, "users", senderId));
            if (customerDoc.exists()) {
              customersData[senderId] = { id: customerDoc.id, ...customerDoc.data() };
            }
          } catch (e) {
            console.error("Error fetching customer:", e);
          }
        })
      );

      setCustomers(customersData);
    });

    return () => unsubscribe();
  }, [user]);

  const handleMarkAsRead = async (inviteId: string) => {
    try {
      await updateDoc(doc(db, "notifications", inviteId), {
        read: true
      });
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const handleDelete = async (inviteId: string) => {
    try {
      await deleteDoc(doc(db, "notifications", inviteId));
    } catch (error) {
      console.error("Error deleting invite:", error);
    }
  };

  return (
    <div className="w-full px-6 sm:px-8 lg:px-12 2xl:px-16 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold mb-2">Приглашения</h1>
        <p className="text-foreground/60">Приглашения от заказчиков на участие в офферах</p>
      </div>

      {invites.length === 0 ? (
        <div className="bg-card border border-white/5 rounded-3xl p-12 text-center">
          <Briefcase className="w-16 h-16 mx-auto mb-4 text-foreground/20" />
          <h3 className="text-xl font-bold mb-2">Нет приглашений</h3>
          <p className="text-foreground/60">
            У вас пока нет приглашений от заказчиков. Когда вас пригласят на оффер, оно появится здесь.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {invites.map((invite) => {
            const offer = offers[invite.offerId];
            const customer = customers[invite.senderId];

            if (!offer || !customer) return null;

            return (
              <motion.div
                key={invite.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-card border rounded-2xl p-6 transition-all hover:shadow-xl ${
                  !invite.read
                    ? "border-primary/50 bg-primary/5 shadow-lg shadow-primary/10"
                    : "border-white/5"
                }`}
              >
                <div className="flex items-start gap-6">
                  {/* Customer Avatar */}
                  <img
                    src={getAvatarSrc(customer.avatar, customer.name, "customer")}
                    alt={customer.name}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-white/10"
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {!invite.read && (
                            <span className="w-2 h-2 rounded-full bg-primary"></span>
                          )}
                          <h3 className="text-xl font-bold">{offer.title}</h3>
                        </div>
                        <p className="text-sm text-foreground/60">
                          От: <span className="font-medium text-foreground/80">{customer.name || "Заказчик"}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {!invite.read && (
                          <button
                            onClick={() => handleMarkAsRead(invite.id)}
                            className="w-8 h-8 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 flex items-center justify-center transition-colors"
                            title="Отметить как прочитанное"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(invite.id)}
                          className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-colors"
                          title="Удалить"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Offer Details */}
                    <div className="flex items-center gap-4 text-sm text-foreground/60 mb-4">
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-green-400" />
                        <span className="font-mono font-bold text-green-400">${offer.budget || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{offer.geo}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{offer.paymentModel}</span>
                      </div>
                    </div>

                    {/* Description */}
                    {offer.description && (
                      <div className="bg-white/5 rounded-xl p-4 mb-4 border border-white/10">
                        <p className="text-sm text-foreground/80">{offer.description.substring(0, 200)}...</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-foreground/40">
                        <Clock className="w-3 h-3" />
                        {invite.createdAt?.toDate
                          ? new Date(invite.createdAt.toDate()).toLocaleString('ru-RU', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'Недавно'}
                      </div>

                      <div className="flex gap-2">
                        <Link href={`/creator/messages`} className="h-10 px-4 rounded-xl border border-white/10 hover:bg-white/5 font-medium transition-colors flex items-center gap-2 text-sm">
                          <MessageSquare className="w-4 h-4" /> Обсудить
                        </Link>
                        <Link href={`/creator/offers`} className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium transition-colors flex items-center gap-2 text-sm shadow-lg shadow-primary/20">
                          <Briefcase className="w-4 h-4" /> Подробнее
                        </Link>
                      </div>
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
