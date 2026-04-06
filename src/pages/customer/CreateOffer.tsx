import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Upload, DollarSign, Users, CheckCircle2, Video, Image as ImageIcon, Link as LinkIcon, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuthStore } from "../../store/authStore";
import { CreateOfferTour } from "../../components/CreateOfferTour";
import { uploadImageToImgBB } from "../../lib/imgbb";
import { calculateDealPricing, formatUsdAmount, MINIMUM_OFFER_BUDGET_USD } from "../../lib/dealPricing";

const PLATFORM_OPTIONS = [
  { id: "tiktok", label: "TikTok" },
  { id: "instagram", label: "Instagram Reels" },
  { id: "youtube", label: "YouTube Shorts" }
];

export function CustomerCreateOffer() {
  const { user } = useAuthStore();
  const [, setLocation] = useLocation();
  const [offerType, setOfferType] = useState<"ugc" | "clip">("ugc");
  const [paymentModel, setPaymentModel] = useState<"Фикс" | "Бартер" | "За просмотры">("Фикс");
  const [title, setTitle] = useState("");
  const [vertical, setVertical] = useState("crypto");
  const [geo, setGeo] = useState("Global");
  const [budget, setBudget] = useState("");
  const [slots, setSlots] = useState("5");
  const [platforms, setPlatforms] = useState<string[]>(["tiktok"]);
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [tzLink, setTzLink] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [error, setError] = useState<string>("");
  const [hasPromoCode, setHasPromoCode] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [autoApprove, setAutoApprove] = useState(false);
  const [barterItem, setBarterItem] = useState("");
  const [viewsCpm, setViewsCpm] = useState("");
  const [viewsMin, setViewsMin] = useState("");
  const [viewsMax, setViewsMax] = useState("");

  const togglePlatform = (id: string) => {
    setPlatforms((prev) => (
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    ));
  };

  const normalizedCreatorPayout =
    paymentModel === "Фикс"
      ? Number(budget || 0)
      : paymentModel === "За просмотры"
        ? Number(viewsMax || 0)
        : 0;
  const pricingPreview = normalizedCreatorPayout > 0 ? calculateDealPricing(normalizedCreatorPayout) : null;
  const slotsCount = Math.max(1, Number(slots) || 1);
  const viewsCpmAmount = Number(viewsCpm || 0);
  const viewsMinAmount = Number(viewsMin || 0);
  const viewsMaxAmount = Number(viewsMax || 0);
  const projectedCreatorCampaignBudget = normalizedCreatorPayout > 0
    ? Number((normalizedCreatorPayout * slotsCount).toFixed(2))
    : 0;
  const projectedCampaignSpend = pricingPreview
    ? Number((pricingPreview.customerTotalAmount * slotsCount).toFixed(2))
    : 0;
  const requiresCampaignBudgetMinimum = paymentModel !== "Бартер";
  const isCampaignBudgetBelowMinimum =
    requiresCampaignBudgetMinimum &&
    projectedCreatorCampaignBudget > 0 &&
    projectedCreatorCampaignBudget < MINIMUM_OFFER_BUDGET_USD;
  const budgetGapToMinimum = isCampaignBudgetBelowMinimum
    ? Number((MINIMUM_OFFER_BUDGET_USD - projectedCreatorCampaignBudget).toFixed(2))
    : 0;
  const publishBudgetHint = requiresCampaignBudgetMinimum
    ? isCampaignBudgetBelowMinimum
      ? `Сейчас бюджет креаторам по офферу — $${formatUsdAmount(projectedCreatorCampaignBudget)}. Чтобы опубликовать оффер, добавьте еще $${formatUsdAmount(budgetGapToMinimum)} и доведите кампанию минимум до $${formatUsdAmount(MINIMUM_OFFER_BUDGET_USD)}.`
      : `Минимальный бюджет кампании — $${formatUsdAmount(MINIMUM_OFFER_BUDGET_USD)}. Для первых тестов комфортный старт — от $300.`
    : "";
  const isPublishDisabled =
    isSubmitting ||
    (requiresCampaignBudgetMinimum && normalizedCreatorPayout > 0 && isCampaignBudgetBelowMinimum);
  const creatorPayoutLabel = pricingPreview
    ? `$${formatUsdAmount(pricingPreview.creatorPayoutAmount)}`
    : "$0";
  const creatorPayoutSummaryLabel = paymentModel === "За просмотры"
    ? `до ${creatorPayoutLabel}`
    : creatorPayoutLabel;
  const viewsRateLabel = viewsCpmAmount > 0
    ? `$${formatUsdAmount(viewsCpmAmount)} / 1K`
    : "$0 / 1K";
  const viewsRateSentence = viewsCpmAmount > 0
    ? `$${formatUsdAmount(viewsCpmAmount)} за 1K просмотров`
    : "ставка за 1K просмотров";
  const creatorPrimaryValue = paymentModel === "За просмотры"
    ? `$${formatUsdAmount(viewsCpmAmount || 0)}`
    : creatorPayoutSummaryLabel;
  const creatorPrimaryCaption = paymentModel === "За просмотры"
    ? viewsMaxAmount > 0
      ? `за 1K просмотров, до $${formatUsdAmount(viewsMaxAmount)} за интеграцию`
      : "за 1K просмотров"
    : "за одну интеграцию";
  const creatorFooterSummary = paymentModel === "За просмотры"
    ? `Креатор получает ${viewsRateSentence}${viewsMaxAmount > 0 ? `, до $${formatUsdAmount(viewsMaxAmount)} за интеграцию` : ""}`
    : `1 креатор получает ${creatorPayoutSummaryLabel}`;
  const offerTotalLabel = pricingPreview
    ? `$${formatUsdAmount(projectedCampaignSpend)}`
    : "$0";
  const offerTotalCaption = paymentModel === "Бартер"
    ? "Компенсация товаром или бонусом"
    : slotsCount > 1
      ? `За весь оффер при ${slotsCount} интеграциях`
      : "За весь оффер";

  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setUploadingCover(true);

    try {
      const url = await uploadImageToImgBB(file);
      setCoverImageUrl(url);
      setUploadingCover(false);
    } catch (error: any) {
      console.error("Error uploading cover image:", error);
      setError(error.message || "Ошибка при загрузке обложки");
      setUploadingCover(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent, status: 'active' | 'draft') => {
    e.preventDefault();
    if (!user) return;

    if (
      status === "active" &&
      requiresCampaignBudgetMinimum &&
      projectedCreatorCampaignBudget < MINIMUM_OFFER_BUDGET_USD
    ) {
      setError(
        `Минимальный бюджет кампании — $${formatUsdAmount(MINIMUM_OFFER_BUDGET_USD)}. Сейчас бюджет креаторам по офферу — $${formatUsdAmount(projectedCreatorCampaignBudget)}.`,
      );
      return;
    }

    setIsSubmitting(true);
    try {
      setError("");
      const normalizedBudget =
        paymentModel === "Фикс"
          ? Number(budget)
          : paymentModel === "Бартер"
            ? 0
            : paymentModel === "За просмотры"
              ? Number(viewsMax)
              : 0;

      await addDoc(collection(db, "offers"), {
        customerId: user.uid,
        title,
        type: offerType,
        vertical,
        geo,
        paymentModel,
        budget: normalizedBudget,
        slots: Number(slots),
        slotsTaken: 0,
        description,
        requirements: requirements.split('\n').filter(r => r.trim() !== ''),
        tzLink,
        promoCode: hasPromoCode ? promoCode : null,
        isPrivate,
        status,
        platforms,
        paymentDetails: {
          autoApprove,
          barterItem: paymentModel === "Бартер" ? barterItem : null,
          barterMaxCompensation: null,
          cpm: paymentModel === "За просмотры" ? Number(viewsCpm) : null,
          minViews: paymentModel === "За просмотры" ? Number(viewsMin) : null,
          maxPayout: paymentModel === "За просмотры" ? Number(viewsMax) : null
        },
        pricingSnapshot: pricingPreview,
        projectedCampaignSpend: pricingPreview
          ? Number((pricingPreview.customerTotalAmount * slotsCount).toFixed(2))
          : 0,
        coverImageUrl,
        createdAt: serverTimestamp(),
        views: 0,
        spent: 0
      });
      setLocation("/customer/offers");
    } catch (error) {
      console.error("Error creating offer:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <CreateOfferTour />
      <div className="w-full px-6 sm:px-8 lg:px-12 2xl:px-16 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/customer/dashboard">
          <button className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <div>
          <h1 className="text-3xl font-display font-bold">Создание оффера</h1>
          <p className="text-foreground/60">Заполните детали вашей рекламной кампании.</p>
        </div>
      </div>

      <form className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_440px] 2xl:grid-cols-[minmax(0,1fr)_480px] gap-8 lg:gap-10" onSubmit={(e) => handleSubmit(e, 'active')}>
        <div className="space-y-8">
          <div className="bg-card border border-white/5 rounded-3xl p-6 md:p-8 shadow-2xl space-y-8">
            {error && (
              <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Basic Info */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2 border-b border-white/10 pb-2">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm">1</span>
                Основная информация
              </h2>
              
              <div>
                <label className="block text-sm font-medium mb-2">Название оффера</label>
                <input
                  id="offer-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="Например: Обзор крипто-биржи"
                  className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="offer-verticals">
                <div>
                  <label className="block text-sm font-medium mb-2">Вертикаль</label>
                  <select
                    value={vertical}
                    onChange={(e) => setVertical(e.target.value)}
                    className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-primary transition-colors appearance-none"
                  >
                    <option value="crypto">Crypto</option>
                    <option value="betting">Betting</option>
                    <option value="gambling">Gambling</option>
                    <option value="dating">Dating</option>
                    <option value="nutra">Nutra</option>
                  </select>
                </div>
                <div id="offer-geo">
                  <label className="block text-sm font-medium mb-2">ГЕО</label>
                  <select
                    value={geo}
                    onChange={(e) => setGeo(e.target.value)}
                    className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-primary transition-colors appearance-none"
                  >
                    <option value="Global">Global</option>
                    <option value="СНГ">СНГ</option>
                    <option value="США">США</option>
                    <option value="Европа">Европа</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-4">Формат контента</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setOfferType("ugc")}
                    className={`p-6 rounded-2xl border-2 text-left transition-all relative overflow-hidden group ${
                      offerType === "ugc" 
                        ? "border-ugc-primary bg-ugc-primary/10 shadow-[0_0_20px_rgba(139,92,246,0.15)]" 
                        : "border-white/5 bg-background hover:border-white/20"
                    }`}
                  >
                    <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-10 -mt-10 transition-opacity ${offerType === "ugc" ? "bg-ugc-primary/30 opacity-100" : "opacity-0"}`} />
                    <div className="relative z-10">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${offerType === "ugc" ? "bg-ugc-primary text-white" : "bg-white/10 text-foreground/60"}`}>
                        <Video className="w-6 h-6" />
                      </div>
                      <div className={`font-bold text-lg mb-2 ${offerType === "ugc" ? "text-white" : "text-foreground/80"}`}>UGC-креатив</div>
                      <div className="text-sm text-foreground/60">Креатор снимает уникальное видео с обзором вашего продукта. Вы получаете готовый ролик для рекламы.</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOfferType("clip")}
                    className={`p-6 rounded-2xl border-2 text-left transition-all relative overflow-hidden group ${
                      offerType === "clip" 
                        ? "border-clip-primary bg-clip-primary/10 shadow-[0_0_20px_rgba(236,72,153,0.15)]" 
                        : "border-white/5 bg-background hover:border-white/20"
                    }`}
                  >
                    <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-10 -mt-10 transition-opacity ${offerType === "clip" ? "bg-clip-primary/30 opacity-100" : "opacity-0"}`} />
                    <div className="relative z-10">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${offerType === "clip" ? "bg-clip-primary text-white" : "bg-white/10 text-foreground/60"}`}>
                        <ImageIcon className="w-6 h-6" />
                      </div>
                      <div className={`font-bold text-lg mb-2 ${offerType === "clip" ? "text-white" : "text-foreground/80"}`}>Баннерная реклама</div>
                      <div className="text-sm text-foreground/60">Размещение вашего баннера в контенте креатора с ссылкой для перехода.</div>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-3">Площадки публикации</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORM_OPTIONS.map((platform) => (
                    <button
                      key={platform.id}
                      type="button"
                      onClick={() => togglePlatform(platform.id)}
                      className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                        platforms.includes(platform.id)
                          ? "border-primary bg-primary/10 text-white"
                          : "border-white/10 text-foreground/60 hover:border-white/20"
                      }`}
                    >
                      {platform.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-foreground/50 mt-2">Выберите площадки, где креатор будет публиковать контент.</p>
              </div>

              {/* Conditional Fields for Clip */}
              <AnimatePresence>
                {offerType === "clip" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 24 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 rounded-2xl border border-clip-primary/30 bg-clip-primary/5 space-y-6">
                      <h3 className="font-bold text-clip-primary flex items-center gap-2">
                        <ImageIcon className="w-5 h-5" /> Параметры рекламы
                      </h3>

                      <div>
                        <label className="block text-sm font-medium mb-2">Ссылка для описания / закрепленного комментария <span className="text-red-400">*</span></label>
                        <div className="relative">
                          <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/50" />
                          <input
                            type="url"
                            value={tzLink}
                            onChange={(e) => setTzLink(e.target.value)}
                            placeholder="https://ваша-ссылка.com/..."
                            className="w-full h-12 bg-background border border-white/10 rounded-xl pl-10 pr-4 focus:outline-none focus:border-clip-primary transition-colors"
                          />
                        </div>
                        <p className="text-xs text-foreground/50 mt-2">Эта ссылка будет размещена креатором под видео.</p>
                      </div>

                      <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
                        <div>
                          <label className="block text-sm font-bold mb-1">Использовать промокод</label>
                          <p className="text-xs text-foreground/60">Креатор упомянет промокод в видео</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={hasPromoCode}
                            onChange={(e) => setHasPromoCode(e.target.checked)}
                          />
                          <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-clip-primary"></div>
                        </label>
                      </div>

                      {hasPromoCode && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div>
                            <label className="block text-sm font-medium mb-2">Промокод <span className="text-red-400">*</span></label>
                            <input
                              type="text"
                              value={promoCode}
                              onChange={(e) => setPromoCode(e.target.value)}
                              placeholder="Например: SUMMER2024"
                              className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-clip-primary transition-colors font-mono uppercase"
                            />
                            <p className="text-xs text-foreground/50 mt-2">Этот промокод будет упомянут креатором в видео</p>
                          </div>
                        </motion.div>
                      )}

                      <div>
                        <label className="block text-sm font-medium mb-2">Баннер для размещения</label>
                        <label className="cursor-pointer block">
                          <input
                            type="file"
                            accept="image/*,video/*,.gif,.zip"
                            onChange={handleCoverImageUpload}
                            disabled={uploadingCover}
                            className="hidden"
                          />
                          <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:bg-white/5 hover:border-white/20 transition-all cursor-pointer bg-background/50">
                            {uploadingCover ? (
                              <>
                                <div className="w-8 h-8 mx-auto mb-2 rounded-full border-2 border-clip-primary border-t-transparent animate-spin" />
                                <p className="text-sm font-medium">Загрузка...</p>
                              </>
                            ) : (
                              <>
                                <Upload className="w-8 h-8 mx-auto mb-2 text-foreground/50" />
                                <p className="text-sm font-medium">Прикрепите файл с баннером</p>
                                <p className="text-xs text-foreground/50 mt-1">GIF-анимация, MP4 видео или ZIP-архив</p>
                              </>
                            )}
                          </div>
                        </label>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Details */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2 border-b border-white/10 pb-2">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm">2</span>
                Детали задачи
              </h2>

              <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
                <div>
                  <label className="block text-sm font-bold mb-1">Скрытый оффер (Private / NDA)</label>
                  <p className="text-xs text-foreground/60">Оффер не будет виден в общем каталоге. Вы сможете приглашать креаторов по ссылке или напрямую из базы.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Описание задачи</label>
                <textarea
                  id="offer-description"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  placeholder="Подробно опишите, что нужно сделать креатору..."
                  className="w-full bg-background border border-white/10 rounded-xl p-4 focus:outline-none focus:border-primary transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Требования (по одному на строку)</label>
                <textarea
                  id="offer-requirements"
                  rows={3}
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder="- Возраст аудитории 18-35 лет&#10;- Вертикальный формат 9:16"
                  className="w-full bg-background border border-white/10 rounded-xl p-4 focus:outline-none focus:border-primary transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Обложка оффера (для каталога)</label>
                {coverImageUrl ? (
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-white/10">
                    <img src={coverImageUrl} alt="Cover preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setCoverImageUrl(null)}
                      className="absolute top-3 right-3 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverImageUpload}
                      disabled={uploadingCover}
                      className="hidden"
                    />
                    <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:bg-white/5 hover:border-white/20 transition-all cursor-pointer bg-background/50">
                      {uploadingCover ? (
                        <>
                          <div className="w-8 h-8 mx-auto mb-2 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                          <p className="text-sm font-medium">Загрузка...</p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 mx-auto mb-2 text-foreground/50" />
                          <p className="text-sm font-medium">Нажмите или перетащите изображение</p>
                          <p className="text-xs text-foreground/50 mt-1">PNG, JPG до 32MB • Рекомендуется 16:9</p>
                        </>
                      )}
                    </div>
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Panel */}
        <div className="lg:sticky lg:top-24 h-fit">
          <div className="bg-card border border-white/5 rounded-3xl p-6 md:p-7 shadow-2xl space-y-6">
            <div>
              <h2 className="text-lg font-bold">Расчет оплаты</h2>
              <p className="text-xs text-foreground/50 mt-1">Выберите модель оплаты и задайте условия.</p>
            </div>

            <div className="flex gap-2 p-1 rounded-xl bg-white/5 border border-white/10">
              <button
                type="button"
                onClick={() => setPaymentModel("Бартер")}
                className={`flex-1 h-9 rounded-lg text-xs font-semibold transition-colors ${
                  paymentModel === "Бартер" ? "bg-white/10 text-white" : "text-foreground/60 hover:text-white"
                }`}
              >
                Бартер
              </button>
              <button
                type="button"
                onClick={() => setPaymentModel("Фикс")}
                className={`flex-1 h-9 rounded-lg text-xs font-semibold transition-colors ${
                  paymentModel === "Фикс" ? "bg-white/10 text-white" : "text-foreground/60 hover:text-white"
                }`}
              >
                Фиксированная
              </button>
              <button
                type="button"
                onClick={() => setPaymentModel("За просмотры")}
                className={`flex-1 h-9 rounded-lg text-xs font-semibold transition-colors ${
                  paymentModel === "За просмотры" ? "bg-white/10 text-white" : "text-foreground/60 hover:text-white"
                }`}
              >
                За просмотры
              </button>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-foreground/60 leading-relaxed">
              {paymentModel === "Фикс" && (
                <span>Фиксированная сумма за одну интеграцию. Выплаты в USDT.</span>
              )}
              {paymentModel === "Бартер" && (
                <span>Бартер: вы отправляете продукт/мерч/бонус, креатор публикует контент взамен.</span>
              )}
              {paymentModel === "За просмотры" && (
                <span>Платите креатору за каждые 1000 просмотров и задаёте верхний лимит выплаты за одну интеграцию.</span>
              )}
            </div>

            {paymentModel === "За просмотры" && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.14em] text-foreground/45">Как считается выплата</div>
                    <p className="mt-2 text-sm leading-relaxed text-white">
                      Креатор получает <span className="font-medium text-primary">{viewsRateSentence}</span>
                      {" по фактическим просмотрам, "}
                      {viewsMaxAmount > 0 ? (
                        <>но не выше <span className="font-medium text-white">${formatUsdAmount(viewsMaxAmount)}</span> за интеграцию.</>
                      ) : (
                        <>без верхнего лимита.</>
                      )}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-background/50 px-3 py-3">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-foreground/45">За 1K просмотров</div>
                    <div className="mt-2 font-mono text-lg font-semibold text-white">
                      ${formatUsdAmount(viewsCpmAmount || 0)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-background/50 px-3 py-3">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-foreground/45">Старт выплаты</div>
                    <div className="mt-2 text-sm font-medium text-white">
                      {viewsMinAmount > 0 ? `${formatUsdAmount(viewsMinAmount)}+ просмотров` : "без порога"}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-background/50 px-3 py-3">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-foreground/45">Лимит</div>
                    <div className="mt-2 text-sm font-medium text-white">
                      {viewsMaxAmount > 0 ? `до $${formatUsdAmount(viewsMaxAmount)}` : "без лимита"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div id="offer-budget" className="space-y-4">
              {requiresCampaignBudgetMinimum && (
                <div className={`rounded-2xl border px-4 py-3 ${
                  isCampaignBudgetBelowMinimum
                    ? "border-amber-400/20 bg-amber-400/10"
                    : "border-white/10 bg-white/[0.03]"
                }`}>
                  <div className="text-xs font-semibold text-white">Минимальный бюджет кампании</div>
                  <p className={`mt-1 text-xs leading-relaxed ${
                    isCampaignBudgetBelowMinimum ? "text-amber-100/90" : "text-foreground/60"
                  }`}>
                    {publishBudgetHint}
                  </p>
                </div>
              )}

              {paymentModel === "Фикс" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-2">Вознаграждение ($)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/50" />
                      <input
                        type="number"
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        required
                        placeholder="200"
                        className="w-full h-11 bg-background border border-white/10 rounded-xl pl-9 pr-3 focus:outline-none focus:border-primary transition-colors font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-2">Кол-во интеграций</label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/50" />
                      <input 
                        type="number" 
                        min="1"
                        value={slots}
                        onChange={(e) => setSlots(e.target.value)}
                        required
                        className="w-full h-11 bg-background border border-white/10 rounded-xl pl-9 pr-3 focus:outline-none focus:border-primary transition-colors font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {pricingPreview && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-foreground/45">
                      {paymentModel === "За просмотры" ? "Ставка для креатора" : "1 креатор получает"}
                    </div>
                    <div className="mt-2 font-mono text-3xl font-semibold text-white">{creatorPrimaryValue}</div>
                    <p className="mt-2 text-xs text-foreground/55">{creatorPrimaryCaption}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-foreground/45">Бренд платит итого</div>
                    <div className="mt-2 font-mono text-3xl font-semibold text-white">{offerTotalLabel}</div>
                    <p className="mt-2 text-xs text-foreground/55">{offerTotalCaption}</p>
                  </div>
                </div>
              )}

              {paymentModel === "Бартер" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-2">Что компенсируете</label>
                    <input 
                      type="text" 
                      value={barterItem}
                      onChange={(e) => setBarterItem(e.target.value)}
                      placeholder="Например: подписка / бонус"
                      className="w-full h-11 bg-background border border-white/10 rounded-xl px-3 focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-2">Кол-во интеграций</label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/50" />
                      <input 
                        type="number" 
                        min="1"
                        value={slots}
                        onChange={(e) => setSlots(e.target.value)}
                        required
                        className="w-full h-11 bg-background border border-white/10 rounded-xl pl-9 pr-3 focus:outline-none focus:border-primary transition-colors font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {paymentModel === "За просмотры" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-2">Цена за 1000 просмотров ($)</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/50" />
                        <input 
                          type="number" 
                          value={viewsCpm}
                          onChange={(e) => setViewsCpm(e.target.value)}
                          placeholder="5"
                          className="w-full h-11 bg-background border border-white/10 rounded-xl pl-9 pr-3 focus:outline-none focus:border-primary transition-colors font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-2">Кол-во интеграций</label>
                      <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/50" />
                        <input 
                          type="number" 
                          min="1"
                          value={slots}
                          onChange={(e) => setSlots(e.target.value)}
                          required
                          className="w-full h-11 bg-background border border-white/10 rounded-xl pl-9 pr-3 focus:outline-none focus:border-primary transition-colors font-mono"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-2">Мин. просмотров</label>
                      <input 
                        type="number" 
                        value={viewsMin}
                        onChange={(e) => setViewsMin(e.target.value)}
                        placeholder="500"
                        className="w-full h-11 bg-background border border-white/10 rounded-xl px-3 focus:outline-none focus:border-primary transition-colors font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-2">Потолок за 1 интеграцию ($)</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/50" />
                        <input 
                          type="number" 
                          value={viewsMax}
                          onChange={(e) => setViewsMax(e.target.value)}
                          placeholder="1000"
                          className="w-full h-11 bg-background border border-white/10 rounded-xl pl-9 pr-3 focus:outline-none focus:border-primary transition-colors font-mono"
                        />
                      </div>
                      <p className="mt-2 text-[11px] leading-relaxed text-foreground/50">
                        Максимум, который бренд готов заплатить одному креатору за одну интеграцию, даже если просмотров будет больше.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10">
              <div>
                <label className="block text-xs font-bold mb-1">Автоодобрение откликов</label>
                <p className="text-[11px] text-foreground/60">Креаторы смогут приступить сразу.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={autoApprove}
                  onChange={(e) => setAutoApprove(e.target.checked)}
                />
                <div className="w-10 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="border-t border-white/10 pt-4">
              <div className="flex items-end justify-between">
                <span className="text-sm text-foreground/60">Итого к оплате</span>
                <span className="text-2xl font-bold">{paymentModel === "Бартер" ? "Бартер" : offerTotalLabel}</span>
              </div>
              <div className="text-xs text-foreground/50">{offerTotalCaption}</div>
              {pricingPreview && (
                <div className="text-xs text-foreground/40 mt-1">{creatorFooterSummary}</div>
              )}
            </div>

            <div className="grid gap-3 pt-2">
              <button 
                type="button" 
                onClick={(e) => handleSubmit(e, 'draft')}
                disabled={isSubmitting}
                className="h-12 rounded-xl font-semibold border border-white/10 hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                Сохранить черновик
              </button>
              <button
                id="offer-submit"
                type="submit"
                disabled={isPublishDisabled}
                className="h-12 rounded-xl font-semibold bg-primary text-white hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <CheckCircle2 className="w-5 h-5" /> {isSubmitting ? 'Публикация...' : 'Опубликовать оффер'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
    </>
  );
}
