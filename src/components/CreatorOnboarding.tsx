import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, Save, ArrowRight } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  initialData?: any;
}

export function CreatorOnboarding({ isOpen, onClose, userId, initialData }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Pricing
  const [ugcPrice, setUgcPrice] = useState(initialData?.pricing?.ugcVideo?.price || 150);
  const [ugcDuration, setUgcDuration] = useState(initialData?.pricing?.ugcVideo?.duration || "15-30 сек");
  const [ugcScriptIncluded, setUgcScriptIncluded] = useState(initialData?.pricing?.ugcVideo?.scriptIncluded ?? true);
  const [bannerPrice, setBannerPrice] = useState(initialData?.pricing?.bannerIntegration?.price || 50);
  const [turnaroundTime, setTurnaroundTime] = useState(initialData?.turnaroundTime || "2-3 дня");
  const [freeRevisions, setFreeRevisions] = useState(initialData?.freeRevisions || 1);

  // Audience stats
  const [genderMale, setGenderMale] = useState(initialData?.audienceStats?.gender?.male || 50);
  const [genderFemale, setGenderFemale] = useState(initialData?.audienceStats?.gender?.female || 50);
  const [topAge, setTopAge] = useState(initialData?.audienceStats?.topAge || "18-24");
  const [topAgePercent, setTopAgePercent] = useState(initialData?.audienceStats?.topAgePercentage || 45);
  const [topGeo, setTopGeo] = useState(initialData?.audienceStats?.topGeo || "США");
  const [topGeoPercent, setTopGeoPercent] = useState(initialData?.audienceStats?.topGeoPercentage || 60);

  const [showSuccess, setShowSuccess] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", userId), {
        pricing: {
          ugcVideo: {
            price: ugcPrice,
            description: "UGC Видео",
            duration: ugcDuration,
            scriptIncluded: ugcScriptIncluded
          },
          bannerIntegration: {
            price: bannerPrice,
            description: "Интеграция баннера"
          }
        },
        turnaroundTime,
        freeRevisions,
        audienceStats: {
          gender: { male: genderMale, female: genderFemale },
          topAge,
          topAgePercentage: topAgePercent,
          topGeo,
          topGeoPercentage: topGeoPercent
        }
      });

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Error saving onboarding:", error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-card border border-white/10 rounded-3xl shadow-2xl z-50 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-display font-bold">Настройка профиля</h2>
            <p className="text-sm text-foreground/60 mt-1">Шаг {step} из 2</p>
          </div>
          <button onClick={onClose} className="text-foreground/60 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 pt-4">
          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-ugc-primary"
              initial={{ width: "50%" }}
              animate={{ width: step === 1 ? "50%" : "100%" }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h3 className="text-xl font-bold mb-4">Цены для информации (опционально)</h3>
                <p className="text-sm text-foreground/60 mb-4">
                  Эти цены будут показываться в вашем профиле для заказчиков. Основная работа будет через офферы.
                </p>

                {/* UGC Video */}
                <div className="bg-background/50 border border-white/10 rounded-2xl p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h4 className="font-bold mb-1">UGC Видео</h4>
                      <p className="text-sm text-foreground/60 mb-4">полноценный обзор. Написание сценария включено.</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-foreground/60">от</span>
                        <div className="relative">
                          <span className="text-2xl font-mono font-bold text-green-400">$</span>
                          <input
                            type="number"
                            value={ugcPrice}
                            onChange={(e) => setUgcPrice(Number(e.target.value))}
                            className="w-20 text-2xl font-mono font-bold text-green-400 bg-transparent border-b border-white/20 focus:border-ugc-primary outline-none text-right"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground/80">Длительность:</span>
                      <input
                        type="text"
                        value={ugcDuration}
                        onChange={(e) => setUgcDuration(e.target.value)}
                        className="w-32 bg-background border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-ugc-primary"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground/80">Сценарий включён:</span>
                      <button
                        onClick={() => setUgcScriptIncluded(!ugcScriptIncluded)}
                        className={`w-12 h-6 rounded-full transition-colors ${ugcScriptIncluded ? 'bg-ugc-primary' : 'bg-white/10'}`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${ugcScriptIncluded ? 'translate-x-6' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Banner Integration */}
                <div className="bg-background/50 border border-white/10 rounded-2xl p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-bold mb-1">Интеграция баннера</h4>
                      <p className="text-sm text-foreground/60">Ваш баннер интегрирован в мой стандартный формат контента.</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-foreground/60">от</span>
                        <div className="relative">
                          <span className="text-2xl font-mono font-bold text-green-400">$</span>
                          <input
                            type="number"
                            value={bannerPrice}
                            onChange={(e) => setBannerPrice(Number(e.target.value))}
                            className="w-20 text-2xl font-mono font-bold text-green-400 bg-transparent border-b border-white/20 focus:border-ugc-primary outline-none text-right"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional settings */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Время выполнения</label>
                    <select
                      value={turnaroundTime}
                      onChange={(e) => setTurnaroundTime(e.target.value)}
                      className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-ugc-primary"
                    >
                      <option value="1-2 дня">1-2 дня</option>
                      <option value="2-3 дня">2-3 дня</option>
                      <option value="3-5 дней">3-5 дней</option>
                      <option value="1 неделя">1 неделя</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Бесплатные правки</label>
                    <select
                      value={freeRevisions}
                      onChange={(e) => setFreeRevisions(Number(e.target.value))}
                      className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-ugc-primary"
                    >
                      <option value={0}>0</option>
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h3 className="text-xl font-bold mb-4">Статистика аудитории</h3>
                <p className="text-sm text-foreground/60">Укажите данные вашей аудитории для заказчиков</p>

                {/* Gender */}
                <div className="bg-background/50 border border-white/10 rounded-2xl p-5">
                  <h4 className="font-bold mb-4">Пол аудитории</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Мужчины</span>
                      <div className="flex items-center gap-3 w-48">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={genderMale}
                          onChange={(e) => {
                            setGenderMale(Number(e.target.value));
                            setGenderFemale(100 - Number(e.target.value));
                          }}
                          className="flex-1"
                        />
                        <span className="text-sm font-mono w-12 text-right">{genderMale}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Женщины</span>
                      <div className="flex items-center gap-3 w-48">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={genderFemale}
                          onChange={(e) => {
                            setGenderFemale(Number(e.target.value));
                            setGenderMale(100 - Number(e.target.value));
                          }}
                          className="flex-1"
                        />
                        <span className="text-sm font-mono w-12 text-right">{genderFemale}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Age */}
                <div className="bg-background/50 border border-white/10 rounded-2xl p-5">
                  <h4 className="font-bold mb-4">Возраст</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-foreground/60 mb-2">Топ возраст</label>
                      <select
                        value={topAge}
                        onChange={(e) => setTopAge(e.target.value)}
                        className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-ugc-primary"
                      >
                        <option value="13-17">13-17</option>
                        <option value="18-24">18-24</option>
                        <option value="25-34">25-34</option>
                        <option value="35-44">35-44</option>
                        <option value="45+">45+</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-foreground/60 mb-2">Процент</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={topAgePercent}
                        onChange={(e) => setTopAgePercent(Number(e.target.value))}
                        className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-ugc-primary"
                      />
                    </div>
                  </div>
                </div>

                {/* Geo */}
                <div className="bg-background/50 border border-white/10 rounded-2xl p-5">
                  <h4 className="font-bold mb-4">География</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-foreground/60 mb-2">Топ ГЕО</label>
                      <select
                        value={topGeo}
                        onChange={(e) => setTopGeo(e.target.value)}
                        className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-ugc-primary"
                      >
                        <option value="США">США</option>
                        <option value="UK">UK</option>
                        <option value="СНГ">СНГ</option>
                        <option value="Европа">Европа</option>
                        <option value="Латинская Америка">Латинская Америка</option>
                        <option value="Азия">Азия</option>
                        <option value="Global">Global</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-foreground/60 mb-2">Процент</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={topGeoPercent}
                        onChange={(e) => setTopGeoPercent(Number(e.target.value))}
                        className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 focus:outline-none focus:border-ugc-primary"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex justify-between items-center">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="text-sm text-foreground/60 hover:text-white"
          >
            {step === 1 ? "Отмена" : "Назад"}
          </button>
          <div className="flex gap-3">
            {step === 1 ? (
              <>
                <button
                  onClick={() => setStep(2)}
                  className="h-12 px-6 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors flex items-center gap-2"
                >
                  Пропустить
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="h-12 px-6 rounded-xl bg-ugc-primary text-white font-semibold hover:bg-ugc-primary/90 transition-colors flex items-center gap-2"
                >
                  Далее <ArrowRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving}
                className="h-12 px-6 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? "Сохранение..." : showSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Сохранено!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Сохранить
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
