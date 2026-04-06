import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import {
  Cancel01Icon,
  CheckmarkCircle02Icon,
  FilterIcon,
  LinkSquare01Icon,
  Location01Icon,
  Message01Icon,
  Search01Icon,
  SentIcon,
  StarIcon,
} from "@hugeicons/core-free-icons";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, getDoc, doc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuthStore } from "../../store/authStore";
import { CreatorMenuPopup } from "../../components/CreatorMenuPopup";
import { getOrCreateChat } from "../../lib/chats";
import { AppIcon } from "../../components/ui/icon";
import { calculateDealPricing } from "../../lib/dealPricing";
import { getAvatarSrc } from "../../lib/avatar";

export function CustomerCreators() {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<any | null>(null);
  const [selectedOfferId, setSelectedOfferId] = useState<string>("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [creators, setCreators] = useState<any[]>([]);
  const [customerOffers, setCustomerOffers] = useState<any[]>([]);
  const [menuCreator, setMenuCreator] = useState<any | null>(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [sentInviteData, setSentInviteData] = useState<any>(null);

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "creator"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const creatorsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        platforms: Array.isArray(doc.data().platforms) ? doc.data().platforms : [],
        pricing: doc.data().pricing || null,
        audienceStats: doc.data().audienceStats || null,
      }));
      setCreators(creatorsData);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "offers"), where("customerId", "==", user.uid), where("status", "==", "active"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const offersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCustomerOffers(offersData);
    });
    return () => unsubscribe();
  }, [user]);

  const openInviteModal = (creator: any) => {
    setSelectedCreator(creator);
    setSelectedOfferId("");
    setInviteModalOpen(true);
  };

  const handleSendInvite = async () => {
    if (!selectedOfferId || !selectedCreator || !user) return;

    try {
      // Get offer details
      const offerDoc = await getDoc(doc(db, "offers", selectedOfferId));
      const offerData = offerDoc.exists() ? offerDoc.data() : null;

      const { id: chatId } = await getOrCreateChat({
        customerId: user.uid,
        creatorId: selectedCreator.id,
        offerId: selectedOfferId,
        lastMessage: "Приглашение в оффер",
      });

      // Send invite message
      await addDoc(collection(db, "chats", chatId, "messages"), {
        senderId: user.uid,
        text: inviteMessage || "Здравствуйте! Приглашаю вас принять участие в моем оффере.",
        createdAt: serverTimestamp()
      });

      const pricingSnapshot = calculateDealPricing(Number(offerData?.budget || 0));

      // Create application record so creator can see it
      await addDoc(collection(db, "applications"), {
        offerId: selectedOfferId,
        creatorId: selectedCreator.id,
        customerId: user.uid,
        status: "pending",
        message: "Приглашение от заказчика",
        createdAt: serverTimestamp(),
        isInvite: true,
        ...pricingSnapshot
      });

      // Create notification for creator
      try {
        await addDoc(collection(db, "notifications"), {
          recipientId: selectedCreator.id,
          senderId: user.uid,
          type: "offer_invite",
          title: "Новое приглашение в оффер",
          message: `Вас пригласили принять участие в оффере "${offerData?.title || 'Оффер'}"`,
          offerId: selectedOfferId,
          chatId: chatId,
          read: false,
          createdAt: serverTimestamp()
        });
      } catch (notifError) {
        console.error("Failed to create notification:", notifError);
        throw notifError;
      }
      setSentInviteData({
        creator: selectedCreator,
        offer: offerData,
        chatId,
      });
      setSuccessModalOpen(true);
      setInviteModalOpen(false);
      setSelectedCreator(null);
      setInviteMessage("");
    } catch (error) {
      console.error("Error sending invite:", error);
      alert("Ошибка при отправке приглашения: " + error.message);
    }
  };

  const filteredCreators = creators.filter(creator => 
    (creator.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (creator.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full px-6 sm:px-8 lg:px-12 2xl:px-16 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">База креаторов</h1>
          <p className="text-foreground/60">Найдите идеального инфлюенсера для вашей кампании.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <AppIcon
            icon={Search01Icon}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50"
            size={16}
          />
          <input 
            type="text" 
            placeholder="Поиск по имени или описанию..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 bg-card border border-white/10 rounded-xl pl-10 pr-4 focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        <button className="h-12 px-6 bg-card border border-white/10 rounded-xl flex items-center gap-2 hover:bg-white/5 transition-colors font-medium">
          <AppIcon icon={FilterIcon} size={18} /> Фильтры
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCreators.map((creator, index) => (
          <motion.div
            key={creator.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-card border border-white/5 rounded-3xl p-6 hover:border-white/10 transition-all hover:shadow-2xl flex flex-col"
          >
            <div className="flex items-start gap-4 mb-4">
              <button
                onClick={() => setMenuCreator(creator)}
                className="relative shrink-0"
              >
                <img src={getAvatarSrc(creator.avatarUrl || creator.avatar, creator.name, "creator")} alt={creator.name} className="w-16 h-16 rounded-2xl object-cover border border-white/10 hover:border-ugc-primary/50 transition-colors cursor-pointer" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-ugc-primary rounded-full flex items-center justify-center">
                  <span className="text-xs text-white">⋮</span>
                </div>
              </button>
              <div>
                <h3 className="font-bold text-lg leading-tight mb-1">{creator.name || "Креатор"}</h3>
                <div className="flex items-center gap-1 text-yellow-400 text-sm font-medium mb-1">
                  <AppIcon icon={StarIcon} size={16} /> {creator.rating || "5.0"} <span className="text-foreground/50 font-normal">({creator.reviews || 0} отзывов)</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-foreground/60">
                  <AppIcon icon={Location01Icon} size={14} /> {creator.geo || "Не указано"}
                </div>
              </div>
            </div>

            <p className="text-sm text-foreground/80 mb-4 line-clamp-2">{creator.description || "Нет описания"}</p>

            <div className="flex flex-wrap gap-2 mb-4">
              {(creator.verticals || []).map((v: string) => (
                <span key={v} className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-foreground/80">
                  {v}
                </span>
              ))}
            </div>

            <div className="bg-background/50 rounded-xl p-3 border border-white/5 mb-6 mt-auto">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-foreground/60">Аудитория</span>
                {creator.audienceStats && (
                  <span className="text-xs text-foreground/60">
                    {creator.audienceStats.gender?.male || 50}% М / {creator.audienceStats.gender?.female || 50}% Ж
                  </span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  {Array.isArray(creator.platforms) && creator.platforms.length > 0 ? (
                    creator.platforms.map((p: any) => (
                      <div key={p.name} className="flex flex-col">
                        <span className="text-[10px] text-foreground/50 uppercase">{p.name}</span>
                        <span className="font-bold text-sm">{p.followers}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-foreground/50">Платформы не указаны</span>
                  )}
                </div>
                {creator.pricing?.ugcVideo ? (
                  <span className="font-mono font-bold text-green-400 text-sm">
                    от ${creator.pricing.ugcVideo.price}
                  </span>
                ) : (
                  <span className="text-xs text-foreground/50">Отклик на офферы</span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Link href={`/customer/messages?creator=${creator.id}`} className="flex-1">
                  <button className="w-full h-10 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-sm">
                    <AppIcon icon={Message01Icon} size={16} /> Сообщения
                  </button>
                </Link>
                <a href={`/creator/profile/${creator.id}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center transition-colors text-foreground/60 hover:text-white">
                  <AppIcon icon={LinkSquare01Icon} size={16} />
                </a>
              </div>
              <button 
                onClick={() => openInviteModal(creator)}
                className="w-full h-10 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <AppIcon icon={SentIcon} size={16} /> Пригласить в оффер
              </button>
            </div>
          </motion.div>
        ))}
        {filteredCreators.length === 0 && (
          <div className="col-span-full text-center py-12 bg-card border border-white/5 rounded-3xl">
            <p className="text-foreground/60">Креаторы не найдены.</p>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      <AnimatePresence>
        {inviteModalOpen && selectedCreator && (
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
                  <img src={getAvatarSrc(selectedCreator.avatarUrl || selectedCreator.avatar, selectedCreator.name, "creator")} alt={selectedCreator.name} className="w-10 h-10 rounded-full border border-white/10" />
                  <div>
                    <p className="font-bold text-sm">{selectedCreator.name || "Креатор"}</p>
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
                    {customerOffers.map(offer => (
                      <option key={offer.id} value={offer.id}>{offer.title}</option>
                    ))}
                  </select>
                  {customerOffers.length === 0 && (
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

      {/* Creator Menu Popup */}
      <AnimatePresence>
        {menuCreator && (
          <CreatorMenuPopup
            creator={menuCreator}
            isOpen={!!menuCreator}
            onClose={() => setMenuCreator(null)}
          />
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
                    window.location.href = sentInviteData?.chatId
                      ? `/customer/messages?chat=${sentInviteData.chatId}`
                      : "/customer/messages";
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
    </div>
  );
}
