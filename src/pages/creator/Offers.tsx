import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ContentTypeBadge } from "../../components/ContentTypeBadge";
import { Search, Filter, DollarSign, Users, X, CheckCircle2, Gift, TrendingUp, MapPin, Calendar, ArrowDownUp, ArrowRight, Check } from "lucide-react";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuthStore } from "../../store/authStore";
import { calculateDealPricing, formatUsdAmount } from "../../lib/dealPricing";

interface Offer {
  id: string;
  title: string;
  customerId: string;
  customerName?: string;
  type: "ugc" | "clip";
  vertical: string;
  geo: string;
  createdAt: any;
  paymentModel: "Фикс" | "CPA" | "Бартер" | "За просмотры";
  budget?: number;
  barterItem?: string;
  paymentDetails?: {
    cpm?: number | null;
    minViews?: number | null;
    maxPayout?: number | null;
    autoApprove?: boolean;
    barterItem?: string | null;
  };
  platforms: string[];
  slots: number;
  slotsTaken: number;
  image?: string;
  description: string;
  requirements: string[];
  status: string;
}

type SortOption = "newest" | "oldest" | "price_desc" | "price_asc";

export function CreatorOffers() {
  const { user } = useAuthStore();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [filterType, setFilterType] = useState<"all" | "ugc" | "clip">("all");
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [verticalFilter, setVerticalFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [geoFilter, setGeoFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  // Applications
  const [appliedOffers, setAppliedOffers] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "offers"), where("status", "==", "active"), where("isPrivate", "==", false));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const offersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Offer[];
      setOffers(offersData);
    });

    return () => unsubscribe();
  }, []);

  const handleApply = async (offerId: string) => {
    if (!user || appliedOffers.includes(offerId)) return;

    try {
      const pricingSnapshot = calculateDealPricing(Number(selectedOffer?.budget || 0));

      // Create application
      await addDoc(collection(db, "applications"), {
        offerId,
        creatorId: user.uid,
        customerId: selectedOffer?.customerId,
        status: "pending",
        message: "Готов к сотрудничеству!",
        createdAt: serverTimestamp(),
        ...pricingSnapshot
      });

      // Create notification for customer
      await addDoc(collection(db, "notifications"), {
        recipientId: selectedOffer?.customerId,
        senderId: user.uid,
        type: "new_application",
        title: "Новый отклик на оффер",
        message: `Креатор откликнулся на ваш оффер "${selectedOffer?.title}"`,
        offerId: offerId,
        read: false,
        createdAt: serverTimestamp()
      });

      setAppliedOffers(prev => [...prev, offerId]);
      setShowSuccessModal(true);
      setSelectedOffer(null);
    } catch (error) {
      console.error("Error applying to offer:", error);
    }
  };

  const filteredAndSortedOffers = useMemo(() => {
    let result = offers.filter(offer => {
      const matchType = filterType === "all" || offer.type === filterType;
      const matchVertical = verticalFilter === "all" || offer.vertical === verticalFilter;
      const matchPayment = paymentFilter === "all" || offer.paymentModel === paymentFilter;
      const matchGeo = geoFilter === "all" || offer.geo === geoFilter;
      const matchSearch = offer.title.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchType && matchVertical && matchPayment && matchGeo && matchSearch;
    });

    result.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date();
      const dateB = b.createdAt?.toDate?.() || new Date();

      if (sortBy === "newest") {
        return dateB.getTime() - dateA.getTime();
      }
      if (sortBy === "oldest") {
        return dateA.getTime() - dateB.getTime();
      }
      if (sortBy === "price_desc") {
        return (b.budget || 0) - (a.budget || 0);
      }
      if (sortBy === "price_asc") {
        return (a.budget || 0) - (b.budget || 0);
      }
      return 0;
    });

    return result;
  }, [offers, filterType, verticalFilter, paymentFilter, geoFilter, searchQuery, sortBy]);

  const getViewsPaymentMeta = (offer: Offer) => {
    const cpm = Number(offer.paymentDetails?.cpm || 0);
    const minViews = Number(offer.paymentDetails?.minViews || 0);
    const maxPayout = Number(offer.paymentDetails?.maxPayout || offer.budget || 0);

    return { cpm, minViews, maxPayout };
  };

  const renderPaymentInfo = (offer: Offer) => {
    if (offer.paymentModel === "Бартер") {
      return (
        <div className="bg-background/80 backdrop-blur-sm rounded-xl p-3 border border-white/5">
          <div className="flex items-center gap-1 text-foreground/50 text-xs mb-1">
            <Gift className="w-3 h-3" /> {offer.paymentModel}
          </div>
          <div className="font-bold text-sm text-purple-400 truncate flex items-center gap-1" title={offer.barterItem}>
            <Gift className="w-4 h-4" /> Мерч / Подписка
          </div>
        </div>
      );
    }
    if (offer.paymentModel === "За просмотры") {
      const { cpm, maxPayout } = getViewsPaymentMeta(offer);
      return (
        <div className="bg-background/80 backdrop-blur-sm rounded-xl p-3 border border-white/5">
          <div className="flex items-center gap-1 text-foreground/50 text-xs mb-1">
            <TrendingUp className="w-3 h-3" /> {offer.paymentModel}
          </div>
          <div className="font-mono font-bold text-lg text-blue-400">
            {cpm > 0 ? `$${formatUsdAmount(cpm)}` : `До $${formatUsdAmount(maxPayout)}`}
          </div>
          {cpm > 0 && (
            <div className="mt-1 text-[11px] text-foreground/60">
              за 1K просмотров
            </div>
          )}
          {maxPayout > 0 && (
            <div className="mt-1 text-[11px] text-foreground/55">
              до ${formatUsdAmount(maxPayout)} за интеграцию
            </div>
          )}
        </div>
      );
    }
    return (
      <div className="bg-background/80 backdrop-blur-sm rounded-xl p-3 border border-white/5">
        <div className="flex items-center gap-1 text-foreground/50 text-xs mb-1">
          <DollarSign className="w-3 h-3" /> {offer.paymentModel}
        </div>
        <div className="font-mono font-bold text-lg text-green-400">${offer.budget || 0}</div>
      </div>
    );
  };

  return (
    <div className="w-full px-6 sm:px-8 lg:px-12 2xl:px-16 py-8 relative">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-green-500/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 border border-green-400/50"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Найти офферы</h1>
          <p className="text-foreground/60">Откройте для себя высокооплачиваемые кампании.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/50" />
            <input 
              type="text" 
              placeholder="Поиск офферов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 bg-card border border-white/10 rounded-lg pl-10 pr-4 focus:outline-none focus:border-primary transition-colors text-sm"
            />
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`h-10 px-4 border rounded-lg flex items-center gap-2 transition-colors text-sm font-medium ${
                showFilters || verticalFilter !== 'all' || paymentFilter !== 'all' || geoFilter !== 'all' || sortBy !== 'newest'
                  ? 'bg-primary/20 border-primary text-white' 
                  : 'bg-card border-white/10 hover:bg-white/5'
              }`}
            >
              <Filter className="w-4 h-4" /> Фильтры и Сортировка
            </button>

            <AnimatePresence>
              {showFilters && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowFilters(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 bg-card border border-white/10 rounded-xl shadow-2xl z-20 p-5"
                  >
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-bold mb-2 text-sm text-foreground/80 flex items-center gap-2"><ArrowDownUp className="w-4 h-4" /> Сортировка</h3>
                        <select 
                          value={sortBy} 
                          onChange={e => setSortBy(e.target.value as SortOption)} 
                          className="w-full bg-background border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-primary"
                        >
                          <option value="newest">Сначала новые</option>
                          <option value="oldest">Сначала старые</option>
                          <option value="price_desc">Сначала дорогие</option>
                          <option value="price_asc">Сначала недорогие</option>
                        </select>
                      </div>

                      <div className="h-px w-full bg-white/10 my-2" />

                      <div>
                        <h3 className="font-bold mb-2 text-sm text-foreground/80 flex items-center gap-2"><MapPin className="w-4 h-4" /> ГЕО</h3>
                        <select 
                          value={geoFilter} 
                          onChange={e => setGeoFilter(e.target.value)} 
                          className="w-full bg-background border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-primary"
                        >
                          <option value="all">Все регионы</option>
                          <option value="Global">Global</option>
                          <option value="СНГ">СНГ</option>
                          <option value="США">США</option>
                          <option value="Европа">Европа</option>
                        </select>
                      </div>

                      <div>
                        <h3 className="font-bold mb-2 text-sm text-foreground/80 flex items-center gap-2"><DollarSign className="w-4 h-4" /> Модель оплаты</h3>
                        <select 
                          value={paymentFilter} 
                          onChange={e => setPaymentFilter(e.target.value)} 
                          className="w-full bg-background border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-primary"
                        >
                          <option value="all">Все модели</option>
                          <option value="Фикс">Фикс</option>
                          <option value="CPA">CPA</option>
                          <option value="Бартер">Бартер</option>
                          <option value="За просмотры">За просмотры</option>
                        </select>
                      </div>

                      <div>
                        <h3 className="font-bold mb-2 text-sm text-foreground/80 flex items-center gap-2"><Filter className="w-4 h-4" /> Вертикаль</h3>
                        <select 
                          value={verticalFilter} 
                          onChange={e => setVerticalFilter(e.target.value)} 
                          className="w-full bg-background border border-white/10 rounded-lg p-2.5 text-sm focus:outline-none focus:border-primary"
                        >
                          <option value="all">Все вертикали</option>
                          <option value="crypto">Crypto</option>
                          <option value="betting">Betting</option>
                          <option value="gambling">Gambling</option>
                          <option value="dating">Dating</option>
                          <option value="nutra">Nutra</option>
                        </select>
                      </div>
                    </div>
                    
                    {(verticalFilter !== 'all' || paymentFilter !== 'all' || geoFilter !== 'all' || sortBy !== 'newest') && (
                      <button 
                        onClick={() => { 
                          setVerticalFilter('all'); 
                          setPaymentFilter('all'); 
                          setGeoFilter('all');
                          setSortBy('newest');
                        }}
                        className="w-full mt-5 text-sm font-medium text-primary hover:text-primary/80 transition-colors bg-primary/10 py-2 rounded-lg"
                      >
                        Сбросить все фильтры
                      </button>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Content Type Filter */}
      <div className="flex gap-2 mb-8 p-1 bg-card border border-white/5 rounded-xl inline-flex">
        {(["all", "ugc", "clip"] as const).map(type => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
              filterType === type 
                ? type === "ugc" ? "bg-ugc-primary text-white" : type === "clip" ? "bg-clip-primary text-white" : "bg-white text-black"
                : "text-foreground/60 hover:text-white"
            }`}
          >
            {type === "all" ? "Все форматы" : type === "ugc" ? "UGC Обзор" : "Баннер / Клип"}
          </button>
        ))}
      </div>

      {/* Offers Grid */}
      {filteredAndSortedOffers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedOffers.map((offer, index) => {
            const isApplied = appliedOffers.includes(offer.id);
            return (
              <motion.div
                layout
                key={offer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedOffer(offer)}
                className={`bg-card rounded-2xl border-t-4 transition-all hover:-translate-y-1 hover:shadow-2xl cursor-pointer overflow-hidden flex flex-col ${
                  offer.type === "ugc" 
                    ? "border-t-ugc-primary border-x border-b border-x-white/5 border-b-white/5 hover:border-x-ugc-primary/20 hover:border-b-ugc-primary/20" 
                    : "border-t-clip-primary border-x border-b border-x-white/5 border-b-white/5 hover:border-x-clip-primary/20 hover:border-b-clip-primary/20"
                }`}
              >
                <div className="h-48 w-full relative">
                  <img src={offer.coverImageUrl || "https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=800&q=80"} alt={offer.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-card/20 to-transparent" />
                  <div className="absolute top-4 left-4">
                    <ContentTypeBadge type={offer.type} />
                  </div>
                  <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
                    <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white uppercase border border-white/10">
                      {offer.vertical}
                    </span>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md text-white flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {offer.geo}
                    </span>
                  </div>
                  {isApplied && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-20">
                      <div className="bg-green-500/90 text-white px-4 py-2 rounded-full font-bold flex items-center gap-2 shadow-lg">
                        <Check className="w-4 h-4" /> Отклик отправлен
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-6 flex-1 flex flex-col relative z-10 -mt-6">
                  <div className="flex items-center gap-2 text-xs text-foreground/50 mb-2">
                    <Calendar className="w-3 h-3" />
                    {offer.createdAt?.toDate ? offer.createdAt.toDate().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : 'Недавно'}
                  </div>
                  <h3 className="text-xl font-bold mb-1 line-clamp-2 drop-shadow-md">{offer.title}</h3>
                  <p className="text-sm text-foreground/80 mb-6 drop-shadow-md">от <span className="text-white font-medium">{offer.customerName || "Заказчик"}</span></p>

                  <div className="grid grid-cols-2 gap-4 mb-6 mt-auto">
                    {renderPaymentInfo(offer)}
                    <div className="bg-background/80 backdrop-blur-sm rounded-xl p-3 border border-white/5">
                      <div className="flex items-center gap-1 text-foreground/50 text-xs mb-1">
                        <Users className="w-3 h-3" /> Мест
                      </div>
                      <div className="font-mono font-bold text-lg">{offer.slotsTaken}/{offer.slots}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(offer.platforms || []).map(platform => (
                      <span key={platform} className="text-xs px-2 py-1 rounded-md bg-white/10 border border-white/10 text-foreground/80">
                        {platform}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-card border border-white/5 rounded-2xl">
          <p className="text-foreground/60 text-lg">По вашему запросу офферов не найдено.</p>
          <button 
            onClick={() => { setVerticalFilter('all'); setPaymentFilter('all'); setGeoFilter('all'); setSortBy('newest'); setSearchQuery(''); setFilterType('all'); }}
            className="mt-4 text-primary hover:underline"
          >
            Сбросить все фильтры
          </button>
        </div>
      )}

      {/* Offer Modal */}
      <AnimatePresence>
        {selectedOffer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOffer(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-card border border-white/10 rounded-3xl shadow-2xl z-50 overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="relative h-64 shrink-0">
                <img src={selectedOffer.coverImageUrl || "https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=800&q=80"} alt={selectedOffer.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                <button 
                  onClick={() => setSelectedOffer(null)}
                  className="absolute top-4 right-4 w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="flex items-center gap-3 mb-3">
                    <ContentTypeBadge type={selectedOffer.type} />
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-white uppercase">
                      {selectedOffer.vertical}
                    </span>
                    <span className="text-xs font-medium px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-white flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {selectedOffer.geo}
                    </span>
                  </div>
                  <h2 className="text-3xl font-display font-bold text-white">{selectedOffer.title}</h2>
                </div>
              </div>

              <div className="p-6 overflow-y-auto">
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/10">
                  <div>
                    <p className="text-sm text-foreground/60 mb-1">Заказчик</p>
                    <p className="font-bold text-lg">{selectedOffer.customerName || "Заказчик"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-foreground/60 mb-1">Модель оплаты</p>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-lg">
                      {selectedOffer.paymentModel === "Бартер" && <Gift className="w-4 h-4 text-purple-400" />}
                      {selectedOffer.paymentModel === "За просмотры" && <TrendingUp className="w-4 h-4 text-blue-400" />}
                      {(selectedOffer.paymentModel === "Фикс" || selectedOffer.paymentModel === "CPA") && <DollarSign className="w-4 h-4 text-green-400" />}
                      <span className="font-bold">{selectedOffer.paymentModel}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Details Box */}
                <div className="mb-8 bg-white/5 border border-white/10 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-foreground/60 uppercase tracking-wider mb-3">Детали вознаграждения</h3>
                  
                  {selectedOffer.paymentModel === "Бартер" && (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                        <Gift className="w-6 h-6 text-purple-400" />
                      </div>
                      <div>
                        <p className="font-bold text-lg text-white">{selectedOffer.barterItem}</p>
                        <p className="text-sm text-foreground/60">Вы получите этот товар/услугу бесплатно за выполнение заказа.</p>
                      </div>
                    </div>
                  )}

                  {selectedOffer.paymentModel === "За просмотры" && (() => {
                    const { cpm, minViews, maxPayout } = getViewsPaymentMeta(selectedOffer);

                    return (
                      <div className="space-y-3">
                        <div className="rounded-xl border border-white/10 bg-background/50 p-4">
                          <div className="text-[10px] uppercase tracking-[0.14em] text-foreground/45">Как считается выплата</div>
                          <p className="mt-2 text-sm leading-relaxed text-white">
                            Вы получаете{" "}
                            <span className="font-medium text-blue-400">
                              {cpm > 0 ? `$${formatUsdAmount(cpm)} за 1K просмотров` : "ставку за 1K просмотров"}
                            </span>
                            {" по фактическим просмотрам, "}
                            {maxPayout > 0 ? (
                              <>но не выше <span className="font-medium text-white">${formatUsdAmount(maxPayout)}</span> за интеграцию.</>
                            ) : (
                              <>без верхнего лимита.</>
                            )}
                          </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="rounded-xl border border-white/10 bg-background/50 p-3">
                            <div className="text-[10px] uppercase tracking-[0.14em] text-foreground/45">За 1K просмотров</div>
                            <div className="mt-2 font-mono text-lg font-semibold text-white">
                              {cpm > 0 ? `$${formatUsdAmount(cpm)}` : "уточняется"}
                            </div>
                          </div>
                          <div className="rounded-xl border border-white/10 bg-background/50 p-3">
                            <div className="text-[10px] uppercase tracking-[0.14em] text-foreground/45">Старт выплаты</div>
                            <div className="font-medium text-white">
                              {minViews > 0 ? `от ${formatUsdAmount(minViews)} просмотров` : "без минимального порога"}
                            </div>
                          </div>
                          <div className="rounded-xl border border-white/10 bg-background/50 p-3">
                            <div className="text-[10px] uppercase tracking-[0.14em] text-foreground/45">Лимит</div>
                            <div className="font-medium text-white">
                              {maxPayout > 0 ? `до $${formatUsdAmount(maxPayout)} за интеграцию` : "без лимита"}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {(selectedOffer.paymentModel === "Фикс" || selectedOffer.paymentModel === "CPA") && (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                        <DollarSign className="w-6 h-6 text-green-400" />
                      </div>
                      <div>
                        <p className="font-mono font-bold text-2xl text-green-400">${selectedOffer.budget || 0}</p>
                        <p className="text-sm text-foreground/60">
                          {selectedOffer.paymentModel === "Фикс" ? "Фиксированная выплата после публикации." : "Оплата за каждое целевое действие (CPA)."}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mb-8">
                  <h3 className="text-lg font-bold mb-3">Описание задачи</h3>
                  <p className="text-foreground/80 leading-relaxed">
                    {selectedOffer.description}
                  </p>
                </div>

                <div className="mb-8">
                  <h3 className="text-lg font-bold mb-3">Требования</h3>
                  <ul className="space-y-3">
                    {(selectedOffer.requirements || []).map((req, i) => (
                      <li key={i} className="flex items-start gap-3 text-foreground/80">
                        <CheckCircle2 className={`w-5 h-5 shrink-0 mt-0.5 ${selectedOffer.type === 'ugc' ? 'text-ugc-primary' : 'text-clip-primary'}`} />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-wrap gap-2 mb-8">
                  <span className="text-sm font-medium text-foreground/60 mr-2 py-1">Платформы:</span>
                  {(selectedOffer.platforms || []).map(platform => (
                    <span key={platform} className="text-sm px-3 py-1 rounded-lg bg-white/5 border border-white/10">
                      {platform}
                    </span>
                  ))}
                </div>

                {/* Для баннерной рекламы - показываем баннер, ссылку и промокод */}
                {selectedOffer.type === 'clip' && (
                  <div className="mb-8 space-y-4">
                    {selectedOffer.coverImageUrl && (
                      <div className="bg-clip-primary/5 border border-clip-primary/20 rounded-xl p-4">
                        <h3 className="text-sm font-bold text-clip-primary mb-3">🖼️ Баннер для размещения</h3>
                        <img
                          src={selectedOffer.coverImageUrl}
                          alt="Баннер"
                          className="w-full max-w-sm mx-auto rounded-lg border border-white/10"
                        />
                        <p className="text-xs text-foreground/50 mt-2 text-center">
                          Разместите этот баннер в своем видео
                        </p>
                      </div>
                    )}

                    {(selectedOffer.tzLink || selectedOffer.promoCode) && (
                      <div className="bg-clip-primary/5 border border-clip-primary/20 rounded-xl p-4">
                        <h3 className="text-sm font-bold text-clip-primary mb-3">🔗 Что разместить</h3>

                        {selectedOffer.tzLink && (
                          <div className="mb-3">
                            <p className="text-xs text-foreground/60 mb-2">Ссылка для описания/комментария:</p>
                            <div className="flex items-center gap-2 bg-background rounded-lg p-3">
                              <LinkIcon className="w-4 h-4 text-clip-primary shrink-0" />
                              <code className="text-xs font-mono flex-1 break-all">
                                {selectedOffer.tzLink}
                              </code>
                            </div>
                          </div>
                        )}

                        {selectedOffer.promoCode && (
                          <div>
                            <p className="text-xs text-foreground/60 mb-2">Промокод для упоминания:</p>
                            <div className="flex items-center gap-2 bg-background rounded-lg p-3">
                              <span className="text-xs font-bold text-green-400">PROMO:</span>
                              <code className="text-xs font-mono">{selectedOffer.promoCode}</code>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <button 
                  onClick={() => handleApply(selectedOffer.id)}
                  disabled={appliedOffers.includes(selectedOffer.id)}
                  className={`w-full h-14 rounded-xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-2 ${
                    appliedOffers.includes(selectedOffer.id)
                      ? "bg-green-500 text-white cursor-not-allowed"
                      : selectedOffer.type === "ugc"
                        ? "bg-ugc-primary text-white hover:bg-ugc-primary/90 hover:shadow-ugc-primary/25"
                        : "bg-clip-primary text-white hover:bg-clip-primary/90 hover:shadow-clip-primary/25"
                  }`}
                >
                  {appliedOffers.includes(selectedOffer.id) ? (
                    <>
                      <Check className="w-5 h-5" /> Отклик отправлен
                    </>
                  ) : (
                    <>
                      Откликнуться на оффер <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSuccessModal(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card border border-white/10 rounded-3xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 p-8 text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Отклик отправлен!</h2>
                <p className="text-white/80">Ваш отклик отправлен заказчику и будет рассмотрен</p>
              </div>
              <div className="p-6">
                <p className="text-center text-foreground/60 mb-6">
                  Заказчик получит уведомление и сможет просмотреть ваш профиль. Вы получите уведомление когда он ответит.
                </p>
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full h-12 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                >
                  Отлично! <CheckCircle2 className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
